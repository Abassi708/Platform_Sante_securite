// controllers/notificationController.js
const Notification = require('../models/Notification');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// ========== ENVOYER UNE NOTIFICATION DE CHANGEMENT DE MOT DE PASSE ==========
const sendPasswordNotification = async (req, res) => {
  try {
    const { user_id, new_password, reason } = req.body;
    
    console.log('📝 Envoi de notification à l\'utilisateur:', user_id);
    
    // Récupérer les informations de l'utilisateur concerné
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    // Récupérer les informations de l'admin qui envoie
    const admin = await User.findByPk(req.user.id);
    
    // Créer la notification (le hashage se fera automatiquement)
    const notification = await Notification.create({
      user_id: user.Id_utilisateur,
      user_email: user.Login,
      user_role: user.Role,
      user_matricule: user.matricule_agent,
      new_password: new_password, // Sera hashé par le hook beforeCreate
      reason: reason,
      sent_by: admin.Id_utilisateur,
      sent_by_email: admin.Login,
      status: 'sent'
    });
    
    console.log('✅ Notification envoyée avec succès à:', user.Login);
    
    res.json({
      success: true,
      message: 'Notification envoyée avec succès',
      notification: {
        id: notification.id,
        user_id: notification.user_id,
        user_email: notification.user_email,
        created_at: notification.created_at,
        status: notification.status
        // Ne pas renvoyer le mot de passe hashé
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur envoi notification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ========== RÉCUPÉRER LES NOTIFICATIONS D'UN UTILISATEUR ==========
const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Vérifier que l'utilisateur connecté ne voit que ses propres notifications
    if (req.user.id !== parseInt(userId) && req.user.Role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Accès non autorisé à ces notifications' 
      });
    }
    
    // Utiliser la méthode qui exclut le mot de passe
    const notifications = await Notification.getUserNotifications(userId);
    
    res.json({
      success: true,
      notifications: notifications
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération notifications:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ========== RÉCUPÉRER UNE NOTIFICATION SPÉCIFIQUE (AVEC MOT DE PASSE) ==========
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Récupérer la notification avec le mot de passe (uniquement si elle appartient à l'utilisateur)
    const notification = await Notification.getNotificationWithPassword(id, req.user.id);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }
    
    res.json({
      success: true,
      notification: notification
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération notification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ========== MARQUER COMME LUE ==========
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }
    
    // Vérifier que l'utilisateur ne marque que ses propres notifications
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Vous ne pouvez modifier que vos propres notifications' 
      });
    }
    
    notification.status = 'read';
    await notification.save();
    
    res.json({
      success: true,
      message: 'Notification marquée comme lue'
    });
    
  } catch (error) {
    console.error('❌ Erreur mise à jour notification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ========== SUPPRIMER UNE NOTIFICATION ==========
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await Notification.findByPk(id);
    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }
    
    // Vérifier que l'utilisateur ne supprime que ses propres notifications
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Vous ne pouvez supprimer que vos propres notifications' 
      });
    }
    
    await notification.destroy();
    
    res.json({
      success: true,
      message: 'Notification supprimée avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression notification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  sendPasswordNotification,
  getUserNotifications,
  getNotificationById, // Nouvelle fonction
  markAsRead,
  deleteNotification
};