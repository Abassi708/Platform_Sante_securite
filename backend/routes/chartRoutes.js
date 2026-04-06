// backend/routes/chartRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const ChartService = require('../services/chartService');
const db = require('../models');

router.get('/accidents', protect, async (req, res) => {
  try {
    const matricule = req.user.matricule_agent;
    
    // Récupérer les accidents par mois
    const accidents = await db.local.Accident.findAll({
      where: { matricule_agent: matricule },
      attributes: ['date_accident']
    });
    
    const accidentsParMois = Array(12).fill(0);
    accidents.forEach(acc => {
      const mois = new Date(acc.date_accident).getMonth();
      accidentsParMois[mois]++;
    });
    
    const result = await ChartService.genererGraphiqueAccidents(accidentsParMois, matricule);
    res.download(result.filepath, result.filename);
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/comparaison', protect, async (req, res) => {
  try {
    const matricule = req.user.matricule_agent;
    
    const agent = await db.global.Agent.findOne({
      where: { matricule_agent: matricule }
    });
    
    // Récupérer les accidents du même poste
    const accidentsPoste = await db.local.Accident.findAll({
      include: [{
        model: db.global.Agent,
        as: 'accidentAgent',
        where: { code_affectation: agent.code_affectation }
      }]
    });
    
    const nbAgents = await db.global.Agent.count({
      where: { code_affectation: agent.code_affectation }
    });
    
    const moyennePoste = accidentsPoste.length / nbAgents;
    
    const agentData = { accidents: await db.local.Accident.count({ where: { matricule_agent: matricule } }) };
    
    const result = await ChartService.genererGraphiqueComparaison(agentData, moyennePoste, matricule);
    res.download(result.filepath, result.filename);
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;