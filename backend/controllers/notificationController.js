// controllers/notificationController.js
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendResetEmail } = require('../config/emailConfig');

// ========== ENVOYER UNE NOTIFICATION + EMAIL ==========
const sendPasswordNotification = async (req, res) => {
  try {
    const { user_id, new_password, reason } = req.body;
    
    console.log('📝 Envoi de notification à l\'utilisateur:', user_id);
    
    // Vérifier que user_id est valide
    if (!user_id) {
      return res.status(400).json({ message: 'ID utilisateur manquant' });
    }
    
    const user = await User.findByPk(user_id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    const admin = await User.findByPk(req.user.id);
    
    // Sauvegarder le mot de passe en clair pour l'email
    const plainPassword = new_password;
    
    // 1. CRÉER LA NOTIFICATION
    const notification = await Notification.create({
      id_utilisateur: user.id_utilisateur,
      email_utilisateur: user.Login,  // ← C'est ici que ça plantait
      role_utilisateur: user.Role,
      matricule_utilisateur: user.matricule_agent,
      nouveau_motpasse: new_password,
      mot_passe: plainPassword,
      raison: reason,
      envoyer_par_email: admin ? admin.Login : 'admin@hse.tn',
      statut: 'envoyé'
    });
    
    console.log('✅ Notification créée avec ID:', notification.id);
    
    // 2. RÉPONDRE IMMÉDIATEMENT au frontend
    res.json({
      success: true,
      message: 'Notification créée avec succès (email en cours d\'envoi)',
      emailSent: true,
      notification: {
        id: notification.id,
        user_id: notification.id_utilisateur,
        user_email: notification.email_utilisateur,
        user_role: notification.role_utilisateur,
        user_matricule: notification.matricule_utilisateur,
        new_password: plainPassword,
        reason: notification.raison,
        sent_by_email: notification.envoyer_par_email,
        status: notification.statut,
        created_at: notification.created_at
      }
    });
    
    // 3. ENVOYER L'EMAIL EN ARRIÈRE-PLAN
    console.log('📧 Envoi de l\'email en arrière-plan à:', user.Login);
    
    setImmediate(async () => {
      try {
        const emailResult = await sendResetEmail(
          user.Login,
          user.Role,
          plainPassword,
          reason
        );
        
        if (emailResult.success) {
          console.log('✅ Email envoyé avec succès (arrière-plan)');
        } else {
          console.log('⚠️ Échec envoi email (arrière-plan):', emailResult.error);
          await notification.update({ statut: 'echec' });
        }
      } catch (emailError) {
        console.error('❌ Erreur email en arrière-plan:', emailError);
        await notification.update({ statut: 'echec' });
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur envoi notification:', error);
    console.error('❌ Stack trace:', error.stack);
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
      where: { id_utilisateur: userId },
      order: [['created_at', 'DESC']],
      attributes: ['id', 'email_utilisateur', 'role_utilisateur', 'raison', 
                   'envoyer_par_email', 'statut', 'created_at']
    });
    
    const formattedNotifications = notifications.map(n => ({
      id: n.id,
      user_id: n.id_utilisateur,
      user_email: n.email_utilisateur,
      user_role: n.role_utilisateur,
      reason: n.raison,
      sent_by_email: n.envoyer_par_email,
      status: n.statut,
      created_at: n.created_at
    }));
    
    res.json({
      success: true,
      notifications: formattedNotifications
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
      attributes: ['id', 'id_utilisateur', 'email_utilisateur', 'role_utilisateur', 
                   'matricule_utilisateur', 'mot_passe', 'raison', 'envoyer_par_email',
                   'statut', 'created_at']
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification non trouvée' });
    }
    
    if (notification.id_utilisateur !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Accès non autorisé' 
      });
    }
    
    const notificationWithPassword = {
      id: notification.id,
      user_id: notification.id_utilisateur,
      user_email: notification.email_utilisateur,
      user_role: notification.role_utilisateur,
      user_matricule: notification.matricule_utilisateur,
      new_password: notification.mot_passe,
      reason: notification.raison,
      sent_by_email: notification.envoyer_par_email,
      status: notification.statut,
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
    
    if (notification.id_utilisateur !== req.user.id) {
      return res.status(403).json({ 
        success: false,
        message: 'Vous ne pouvez modifier que vos propres notifications' 
      });
    }
    
    notification.statut = 'lu';
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
    
    if (notification.id_utilisateur !== req.user.id) {
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