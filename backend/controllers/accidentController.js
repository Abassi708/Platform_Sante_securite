// backend/controllers/accidentController.js
const Accident = require('../models/Accident');
const Agent = require('../models/Agent');
const { Op } = require('sequelize');

// ========== CRÉER UN ACCIDENT ==========
const createAccident = async (req, res) => {
  try {
    const accidentData = req.body;
    
    // Ajouter l'utilisateur qui crée
    accidentData.created_by = req.user.id;
    
    // Générer un numéro d'accident automatique
    const lastAccident = await Accident.findOne({
      order: [['id_accident', 'DESC']]
    });
    
    const year = new Date().getFullYear();
    const nextNum = lastAccident ? lastAccident.id_accident + 1 : 1;
    accidentData.numero_accident = `ACC-${year}-${nextNum.toString().padStart(4, '0')}`;
    
    const accident = await Accident.create(accidentData);
    
    res.status(201).json({
      success: true,
      message: 'Accident créé avec succès',
      accident: accident
    });
    
  } catch (error) {
    console.error('❌ Erreur création accident:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la création de l\'accident' 
    });
  }
};

// ========== RÉCUPÉRER TOUS LES ACCIDENTS ==========
const getAccidents = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', statut, gravite, dateDebut, dateFin } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    
    // Filtres
    if (search) {
      whereClause[Op.or] = [
        { numero_accident: { [Op.like]: `%${search}%` } },
        { lieu_accident: { [Op.like]: `%${search}%` } },
        { '$Agent.nom$': { [Op.like]: `%${search}%` } },
        { '$Agent.prenom$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (statut && statut !== 'all') {
      whereClause.statut = statut;
    }
    
    if (gravite && gravite !== 'all') {
      whereClause.gravite = gravite;
    }
    
    if (dateDebut && dateFin) {
      whereClause.date_accident = {
        [Op.between]: [dateDebut, dateFin]
      };
    }
    
    const { count, rows } = await Accident.findAndCountAll({
      where: whereClause,
      include: [{
        model: Agent,
        attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation']
      }],
      order: [['date_accident', 'DESC'], ['heure_accident', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      accidents: rows
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération accidents:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des accidents' 
    });
  }
};

// ========== RÉCUPÉRER UN ACCIDENT PAR ID ==========
const getAccidentById = async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id, {
      include: [{
        model: Agent,
        attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation']
      }]
    });
    
    if (!accident) {
      return res.status(404).json({ 
        success: false, 
        message: 'Accident non trouvé' 
      });
    }
    
    res.json({
      success: true,
      accident: accident
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération accident:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
};

// ========== METTRE À JOUR UN ACCIDENT ==========
const updateAccident = async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id);
    
    if (!accident) {
      return res.status(404).json({ 
        success: false, 
        message: 'Accident non trouvé' 
      });
    }
    
    // Ajouter l'utilisateur qui modifie
    req.body.updated_by = req.user.id;
    
    await accident.update(req.body);
    
    res.json({
      success: true,
      message: 'Accident mis à jour avec succès',
      accident: accident
    });
    
  } catch (error) {
    console.error('❌ Erreur mise à jour accident:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la mise à jour' 
    });
  }
};

// ========== SUPPRIMER UN ACCIDENT ==========
const deleteAccident = async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id);
    
    if (!accident) {
      return res.status(404).json({ 
        success: false, 
        message: 'Accident non trouvé' 
      });
    }
    
    await accident.destroy();
    
    res.json({
      success: true,
      message: 'Accident supprimé avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression accident:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la suppression' 
    });
  }
};

// ========== CHANGER LE STATUT D'UN ACCIDENT ==========
const changerStatut = async (req, res) => {
  try {
    const { statut } = req.body;
    const accident = await Accident.findByPk(req.params.id);
    
    if (!accident) {
      return res.status(404).json({ 
        success: false, 
        message: 'Accident non trouvé' 
      });
    }
    
    accident.statut = statut;
    if (statut === 'declare') {
      accident.date_declaration_cnam = new Date().toLocaleString('fr-FR');
    }
    accident.updated_by = req.user.id;
    
    await accident.save();
    
    res.json({
      success: true,
      message: `Statut changé à ${statut}`,
      accident: accident
    });
    
  } catch (error) {
    console.error('❌ Erreur changement statut:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du changement de statut' 
    });
  }
};

// ========== STATISTIQUES DES ACCIDENTS ==========
const getStats = async (req, res) => {
  try {
    const total = await Accident.count();
    const declares = await Accident.count({ where: { statut: 'declare' } });
    const brouillons = await Accident.count({ where: { statut: 'brouillon' } });
    
    const parGravite = await Accident.findAll({
      attributes: ['gravite', [Accident.sequelize.fn('COUNT', 'gravite'), 'count']],
      group: ['gravite']
    });
    
    // Formater les résultats par gravité
    const graviteStats = {
      faible: 0,
      moyenne: 0,
      elevee: 0,
      critique: 0
    };
    
    parGravite.forEach(item => {
      const gravite = item.gravite?.toLowerCase() || '';
      const count = parseInt(item.dataValues.count);
      if (gravite === 'faible') graviteStats.faible = count;
      else if (gravite === 'moyenne') graviteStats.moyenne = count;
      else if (gravite === 'élevée') graviteStats.elevee = count;
      else if (gravite === 'critique') graviteStats.critique = count;
    });
    
    const currentYear = new Date().getFullYear();
    const parMois = await Accident.findAll({
      attributes: [
        [Accident.sequelize.fn('MONTH', Accident.sequelize.col('date_accident')), 'mois'],
        [Accident.sequelize.fn('COUNT', 'id_accident'), 'count']
      ],
      where: Accident.sequelize.where(
        Accident.sequelize.fn('YEAR', Accident.sequelize.col('date_accident')),
        currentYear
      ),
      group: [Accident.sequelize.fn('MONTH', Accident.sequelize.col('date_accident'))],
      order: [[Accident.sequelize.fn('MONTH', Accident.sequelize.col('date_accident')), 'ASC']]
    });
    
    // Créer un tableau de 12 mois
    const moisStats = Array(12).fill(0);
    parMois.forEach(item => {
      const mois = parseInt(item.dataValues.mois) - 1;
      const count = parseInt(item.dataValues.count);
      moisStats[mois] = count;
    });
    
    res.json({
      success: true,
      stats: {
        total,
        declares,
        brouillons,
        parGravite: graviteStats,
        parMois: moisStats
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur stats accidents:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du calcul des statistiques' 
    });
  }
};

// ========== RÉCUPÉRER TOUS LES AGENTS ==========
const getAgents = async (req, res) => {
  try {
    const agents = await Agent.findAll({
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      order: [['nom', 'ASC']]
    });
    
    res.json({
      success: true,
      agents: agents
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération agents:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des agents' 
    });
  }
};

module.exports = {
  createAccident,
  getAccidents,
  getAccidentById,
  updateAccident,
  deleteAccident,
  changerStatut,
  getStats,
  getAgents
};