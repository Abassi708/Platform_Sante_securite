// backend/routes/planningRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const planningService = require('../services/planningService');
const Planning = require('../models/Planning');

// ========== GÉNÉRER TOUTES LES SEMAINES MANQUANTES ==========
router.post('/planning/generer-toutes', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'social') {
      return res.status(403).json({
        success: false,
        message: 'Accès non autorisé'
      });
    }
    
    const total = await planningService.verifierEtGenererSemainesManquantes(req.user.id);
    
    res.json({
      success: true,
      message: `${total} visite(s) générée(s)`,
      total
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// ========== VÉRIFIER L'ÉTAT DU PLANNING ==========
router.get('/planning/etat', protect, async (req, res) => {
  try {
    const aujourdhui = new Date();
    const semaineActuelle = planningService.getNumeroSemaine(aujourdhui);
    const annee = aujourdhui.getFullYear();
    
    const planningActuel = await Planning.findOne({
      where: { semaine: semaineActuelle, annee }
    });
    
    const planningProchain = await Planning.findOne({
      where: { semaine: semaineActuelle + 1, annee }
    });
    
    res.json({
      success: true,
      semaine_actuelle: {
        numero: semaineActuelle,
        annee,
        existe: !!planningActuel,
        nb_visites: planningActuel ? await Planning.count({ where: { semaine: semaineActuelle, annee } }) : 0
      },
      semaine_prochaine: {
        numero: semaineActuelle + 1,
        annee,
        existe: !!planningProchain,
        nb_visites: planningProchain ? await Planning.count({ where: { semaine: semaineActuelle + 1, annee } }) : 0
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;