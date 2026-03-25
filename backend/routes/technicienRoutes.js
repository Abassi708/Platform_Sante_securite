// backend/routes/technicienRoutes.js
const express = require('express');
const router = express.Router();
const technicienController = require('../controllers/technicienController');
const { protect } = require('../middleware/authMiddleware');

// Middleware d'authentification pour toutes les routes
router.use(protect);

// TA1 : Gestion des agents
router.get('/agents', technicienController.getAgents);
router.get('/agents/:matricule', technicienController.getAgentDetails);
router.get('/agents/export/excel', technicienController.exportAgents);

// TA3 : Gestion des affectations et agences
router.get('/affectations', technicienController.getAffectations);
router.get('/agences', technicienController.getAgences);

// Statistiques dashboard
router.get('/stats/dashboard', technicienController.getDashboardStats);

module.exports = router;