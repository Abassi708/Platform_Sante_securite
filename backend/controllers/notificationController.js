// controllers/notificationController.js
const Notification = require('../models/Notification');
const User = require('../models/User');

// ========== ENVOYER UNE NOTIFICATION ==========
const sendPasswordNotification = async (req, res) => {
  try {
    const { user_id, new_password, reason } = req.body;
    
    console.log('📝 Envoi de notification à l\'utilisateur:', user_id);
    
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    const admin = await User.findByPk(req.user.id);
    
    // Créer la notification (le hook va s'occuper de hasher et sauvegarder en clair)
    const notification = await Notification.create({
      user_id: user.Id_utilisateur,
      user_email: user.Login,
      user_role: user.Role,
      user_matricule: user.matricule_agent,
      new_password: new_password, // Sera hashé par le hook
      reason: reason,
      sent_by: admin.Id_utilisateur,
      sent_by_email: admin.Login,
      status: 'sent'
    });
    
    console.log('✅ Notification créée avec ID:', notification.id);
    
    // Réponse avec le mot de passe en clair pour l'admin
    res.json({
      success: true,
      message: 'Notification envoyée avec succès',
      notification: {
        id: notification.id,
        user_id: notification.user_id,
        user_email: notification.user_email,
        user_role: notification.user_role,
        user_matricule: notification.user_matricule,
        new_password: new_password, // EN CLAIR pour l'admin
        reason: notification.reason,
        sent_by: notification.sent_by,
        sent_by_email: notification.sent_by_email,
        status: notification.status,
        created_at: notification.created_at
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur envoi notification:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ========== RÉCUPÉRER TOUTES LES NOTIFICATIONS ==========
const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Vérification d'autorisation
    if (req.user.id !== parseInt(userId) && req.user.Role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Accès non autorisé' 
      });
    }
    
    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'user_id', 'user_email', 'user_role', 'reason', 
                   'sent_by', 'sent_by_email', 'status', 'created_at']
      // On n'inclut PAS les mots de passe dans la liste
    });
    
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
    
    const notification = await Notification.findByPk(id, {
      attributes: ['id', 'user_id', 'user_email', 'user_role', 'user_matricule',
                   'plain_password', 'reason', 'sent_by', 'sent_by_email',
                   'status', 'created_at']
      // Ici on inclut plain_password pour l'affichage
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }
    
    // Vérifier que l'utilisateur ne voit que ses propres notifications
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Accès non autorisé' 
      });
    }
    
    // Renommer plain_password en new_password pour le frontend
    const notificationWithPassword = {
      id: notification.id,
      user_id: notification.user_id,
      user_email: notification.user_email,
      user_role: notification.user_role,
      user_matricule: notification.user_matricule,
      new_password: notification.plain_password, // ← MOT DE PASSE EN CLAIR !
      reason: notification.reason,
      sent_by: notification.sent_by,
      sent_by_email: notification.sent_by_email,
      status: notification.status,
      created_at: notification.created_at
    };
    
    res.json({
      success: true,
      notification: notificationWithPassword
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
  getNotificationById,
  markAsRead,
  deleteNotification
};