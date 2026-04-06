// backend/controllers/chatbotController.js
const db = require('../models');
const IntelligentChatbot = require('../services/chatbot/intelligentChatbot');
const { v4: uuidv4 } = require('uuid');

class ChatbotController {
  
  static async sendMessage(req, res) {
    try {
      const { message } = req.body;
      const userId = req.user.id;
      const matricule = req.user.matricule;
      
      // 🔧 CORRECTION ICI : Utiliser req.user.role (minuscule)
      const userRole = req.user.role;  // ← C'EST role, pas Role !
      
      console.log(`📝 Message de l'utilisateur ${userId} (rôle: ${userRole})`);
      console.log(`   Matricule: ${matricule}`);
      
      if (!message || message.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Veuillez saisir un message'
        });
      }
      
      // 🔧 Vérifier le rôle (maintenant en minuscule)
      if (userRole !== 'agent') {
        console.log(`❌ Accès refusé - Rôle: ${userRole}`);
        return res.status(403).json({
          success: false,
          message: 'Seuls les agents peuvent utiliser ce service'
        });
      }
      
      if (!matricule) {
        console.log(`⚠️ Pas de matricule pour l'agent ${userId}`);
        // Pour le test, on continue avec un matricule par défaut
        // return res.status(400).json({
        //   success: false,
        //   message: 'Aucun matricule associé à votre compte'
        // });
      }
      
      // Initialiser le chatbot
      const chatbot = new IntelligentChatbot();
      
      // Traiter le message
      const result = await chatbot.processMessage(message, userId, matricule);
      
      res.json({
        success: true,
        reponse: result.reponse,
        intention: result.intention,
        conversation_id: result.conversation_id
      });
      
    } catch (error) {
      console.error('❌ Erreur chatbot:', error);
      res.status(500).json({
        success: false,
        message: 'Erreur technique',
        reponse: "❌ Désolé, une erreur technique s'est produite. Veuillez réessayer."
      });
    }
  }
  
  static async getHistorique(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 50 } = req.query;
      
      const historique = await db.local.ChatHistory.findAll({
        where: { id_utilisateur: userId },
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        raw: true
      });
      
      res.json({
        success: true,
        historique: historique.map(h => ({
          id: h.id,
          message: h.message_utilisateur,
          reponse: h.reponse_bot,
          date: h.created_at,
          conversation_id: h.conversation_id,
          intention: h.intention
        }))
      });
      
    } catch (error) {
      console.error('❌ Erreur getHistorique:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
  
  static async supprimerHistorique(req, res) {
    try {
      const userId = req.user.id;
      
      await db.local.ChatHistory.destroy({
        where: { id_utilisateur: userId }
      });
      
      res.json({
        success: true,
        message: 'Historique supprimé avec succès'
      });
      
    } catch (error) {
      console.error('❌ Erreur suppression historique:', error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
}

module.exports = ChatbotController;