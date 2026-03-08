// backend/routes/accidentRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Accident = require('../models/Accident');
const Agent = require('../models/Agent');
const { Op } = require('sequelize');

// ========== RÉCUPÉRER TOUS LES AGENTS ==========
router.get('/agents', protect, async (req, res) => {
  try {
    const agents = await Agent.findAll({
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      order: [['nom', 'ASC']]
    });
    res.json({ success: true, agents });
  } catch (error) {
    console.error('❌ Erreur agents:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ========== CRÉER UN ACCIDENT ==========
router.post('/accidents', protect, async (req, res) => {
  try {
    console.log('📦 Données reçues:', req.body);
    
    const accidentData = req.body;
    accidentData.created_by = req.user.id;
    
    // Générer numéro accident
    const lastAccident = await Accident.findOne({ order: [['id_accident', 'DESC']] });
    const year = new Date().getFullYear();
    const nextNum = lastAccident ? lastAccident.id_accident + 1 : 1;
    accidentData.numero_accident = `ACC-${year}-${nextNum.toString().padStart(4, '0')}`;
    
    const accident = await Accident.create(accidentData);
    
    res.status(201).json({ success: true, message: 'Accident créé', accident });
  } catch (error) {
    console.error('❌ Erreur création accident:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== RÉCUPÉRER TOUS LES ACCIDENTS ==========
router.get('/accidents', protect, async (req, res) => {
  try {
    const accidents = await Accident.findAll({
      include: [{
        model: Agent,
        attributes: ['nom', 'prenom']
      }],
      order: [['date_accident', 'DESC']]
    });
    res.json({ success: true, accidents });
  } catch (error) {
    console.error('❌ Erreur accidents:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ========== STATISTIQUES ==========
router.get('/accidents/stats', protect, async (req, res) => {
  try {
    const total = await Accident.count();
    const declares = await Accident.count({ where: { statut: 'declare' } });
    const brouillons = await Accident.count({ where: { statut: 'brouillon' } });
    
    const parGravite = {
      faible: await Accident.count({ where: { gravite: 'Faible' } }),
      moyenne: await Accident.count({ where: { gravite: 'Moyenne' } }),
      elevee: await Accident.count({ where: { gravite: 'Élevée' } }),
      critique: await Accident.count({ where: { gravite: 'Critique' } })
    };
    
    const parMois = Array(12).fill(0);
    const accidentsParMois = await Accident.findAll({
      attributes: [
        [Accident.sequelize.fn('MONTH', Accident.sequelize.col('date_accident')), 'mois'],
        [Accident.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: Accident.sequelize.where(
        Accident.sequelize.fn('YEAR', Accident.sequelize.col('date_accident')),
        new Date().getFullYear()
      ),
      group: [Accident.sequelize.fn('MONTH', Accident.sequelize.col('date_accident'))]
    });
    
    accidentsParMois.forEach(item => {
      const mois = parseInt(item.dataValues.mois) - 1;
      parMois[mois] = parseInt(item.dataValues.count);
    });
    
    res.json({
      success: true,
      stats: { total, declares, brouillons, parGravite, parMois }
    });
  } catch (error) {
    console.error('❌ Erreur stats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ========== METTRE À JOUR STATUT ==========
router.patch('/accidents/:id/statut', protect, async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id);
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    }
    
    accident.statut = req.body.statut;
    if (req.body.statut === 'declare') {
      accident.date_declaration_cnam = new Date().toLocaleString('fr-FR');
    }
    accident.updated_by = req.user.id;
    await accident.save();
    
    res.json({ success: true, message: 'Statut mis à jour', accident });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// ========== RÉCUPÉRER UN ACCIDENT PAR ID ==========
router.get('/accidents/:id', protect, async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id, {
      include: [{
        model: Agent,
        attributes: ['nom', 'prenom']
      }]
    });
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    }
    res.json({ success: true, accident });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ========== METTRE À JOUR UN ACCIDENT ==========
router.put('/accidents/:id', protect, async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id);
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    }

    // Vérifier si l'accident est déjà déclaré
    if (accident.statut === 'declare') {
      return res.status(403).json({ 
        success: false, 
        message: 'Impossible de modifier un accident déjà déclaré à la CNAM' 
      });
    }

    // Mettre à jour avec les données reçues
    await accident.update({
      ...req.body,
      updated_by: req.user.id
    });

    // Récupérer l'accident mis à jour avec les relations
    const updatedAccident = await Accident.findByPk(req.params.id, {
      include: [{
        model: Agent,
        attributes: ['nom', 'prenom']
      }]
    });

    res.json({ 
      success: true, 
      message: 'Accident modifié avec succès', 
      accident: updatedAccident 
    });
    
  } catch (error) {
    console.error('❌ Erreur modification:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de la modification' 
    });
  }
});

// ========== SUPPRIMER UN ACCIDENT ==========
router.delete('/accidents/:id', protect, async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id);
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    }

    // Vérifier si l'accident est déjà déclaré
    if (accident.statut === 'declare') {
      return res.status(403).json({ 
        success: false, 
        message: 'Impossible de supprimer un accident déjà déclaré à la CNAM' 
      });
    }

    await accident.destroy();
    
    res.json({ 
      success: true, 
      message: 'Accident supprimé avec succès' 
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de la suppression' 
    });
  }
});
module.exports = router;