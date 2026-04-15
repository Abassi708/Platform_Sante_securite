// backend/routes/notificationIntelligenteRoutes.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { protect } = require('../middleware/authMiddleware');
const db = require('../models');

const NotificationIntelligente = db.local.NotificationIntelligente;

// ========== RÉCUPÉRER MES NOTIFICATIONS ==========
router.get('/mes-notifications', protect, async (req, res) => {
  try {
    const { statut = 'non_lu', limite = 50 } = req.query;

    const where = { id_utilisateur: req.user.id };
    if (statut !== 'toutes') {
      where.statut = statut;
    }

    const notifications = await NotificationIntelligente.findAll({
      where,
      order: [['priorite', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limite)
    });

    const stats = {
      total: await NotificationIntelligente.count({ where: { id_utilisateur: req.user.id } }),
      nonLues: await NotificationIntelligente.count({ where: { id_utilisateur: req.user.id, statut: 'non_lu' } })
    };

    res.json({ success: true, notifications, stats, timestamp: new Date() });
  } catch (error) {
    console.error('❌ Erreur récupération notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== MARQUER UNE NOTIFICATION COMME LUE ==========
router.put('/:id/lire', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ CORRECTION : Utiliser 'id' comme clé primaire (pas id_notification)
    const notification = await NotificationIntelligente.findOne({
      where: { id: id, id_utilisateur: req.user.id }
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }
    
    notification.statut = 'lu';
    notification.lu_le = new Date();
    await notification.save();
    
    res.json({ success: true, message: 'Notification marquée comme lue', notification });
  } catch (error) {
    console.error('❌ Erreur marquage notification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== MARQUER TOUT COMME LU ==========
router.put('/tout-lire', protect, async (req, res) => {
  try {
    await NotificationIntelligente.update(
      { statut: 'lu', lu_le: new Date() },
      { where: { id_utilisateur: req.user.id, statut: 'non_lu' } }
    );
    
    res.json({ success: true, message: 'Toutes les notifications marquées comme lues' });
  } catch (error) {
    console.error('❌ Erreur marquage toutes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== ARCHIVER UNE NOTIFICATION ==========
router.put('/:id/archiver', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const notification = await NotificationIntelligente.findOne({
      where: { id: id, id_utilisateur: req.user.id }
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }
    
    notification.statut = 'archive';
    await notification.save();
    
    res.json({ success: true, message: 'Notification archivée', notification });
  } catch (error) {
    console.error('❌ Erreur archivage:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== SUPPRIMER UNE NOTIFICATION ==========
router.delete('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deleted = await NotificationIntelligente.destroy({
      where: { id: id, id_utilisateur: req.user.id }
    });
    
    if (deleted) {
      res.json({ success: true, message: 'Notification supprimée' });
    } else {
      res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== MES STATISTIQUES ==========
router.get('/mes-stats', protect, async (req, res) => {
  try {
    const total = await NotificationIntelligente.count({ where: { id_utilisateur: req.user.id } });
    const nonLues = await NotificationIntelligente.count({ where: { id_utilisateur: req.user.id, statut: 'non_lu' } });
    
    res.json({ success: true, stats: { total, nonLues } });
  } catch (error) {
    console.error('❌ Erreur stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;