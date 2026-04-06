// backend/routes/chatbotRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const ChatbotController = require('../controllers/chatbotController');

// Routes protégées (nécessitent authentification)
router.post('/message', protect, ChatbotController.sendMessage);
router.get('/historique', protect, ChatbotController.getHistorique);
router.delete('/historique', protect, ChatbotController.supprimerHistorique);

module.exports = router;