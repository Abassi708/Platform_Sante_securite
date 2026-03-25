// backend/controllers/notificationIntelligenteController.js
const notificationService = require('../services/notificationIntelligenteService');
const NotificationIntelligente = require('../models/NotificationIntelligente');

// ========== RÉCUPÉRER MES NOTIFICATIONS ==========
const getMesNotifications = async (req, res) => {
  try {
    const { statut, limit } = req.query;
    const notifications = await notificationService.getNotificationsUtilisateur(
      req.user.id,
      statut,
      limit ? parseInt(limit) : 50
    );
    
    const nonLues = notifications.filter(n => n.statut === 'non_lu').length;
    
    res.json({
      success: true,
      total: notifications.length,
      nonLues,
      notifications
    });
  } catch (error) {
    console.error('❌ Erreur récupération notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== MARQUER COMME LUE ==========
const marquerLue = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.marquerCommeLue(id, req.user.id);
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('❌ Erreur marquage notification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== MARQUER TOUTES COMME LUES ==========
const marquerToutesLues = async (req, res) => {
  try {
    await notificationService.marquerToutesLues(req.user.id);
    res.json({ success: true, message: 'Toutes les notifications marquées comme lues' });
  } catch (error) {
    console.error('❌ Erreur marquage toutes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== ARCHIVER ==========
const archiver = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await notificationService.archiver(id, req.user.id);
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('❌ Erreur archivage:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== SUPPRIMER ==========
const supprimer = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await notificationService.supprimer(id, req.user.id);
    
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }
    
    res.json({ success: true, message: 'Notification supprimée' });
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== STATISTIQUES NOTIFICATIONS ==========
const getStats = async (req, res) => {
  try {
    const total = await NotificationIntelligente.count({ where: { id_utilisateur: req.user.id } });
    const nonLues = await NotificationIntelligente.count({ 
      where: { id_utilisateur: req.user.id, statut: 'non_lu' } 
    });
    const parType = await NotificationIntelligente.findAll({
      where: { id_utilisateur: req.user.id },
      attributes: [
        'type',
        [NotificationIntelligente.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['type']
    });
    
    res.json({
      success: true,
      stats: {
        total,
        nonLues,
        parType
      }
    });
  } catch (error) {
    console.error('❌ Erreur stats notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getMesNotifications,
  marquerLue,
  marquerToutesLues,
  archiver,
  supprimer,
  getStats
};