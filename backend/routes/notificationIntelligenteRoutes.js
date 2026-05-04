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

// ========== CRÉER UNE NOTIFICATION MANUELLEMENT ==========

// ========== CRÉER UNE NOTIFICATION MANUELLEMENT ==========
router.post('/creer', protect, async (req, res) => {
  try {
    const { type, titre, message, action_suggested, priorite, source, details } = req.body;
    
    // Récupérer l'email de l'utilisateur depuis req.user
    const userEmail = req.user.Login || req.user.email;
    const userRole = req.user.role || 'user';
    
    if (!userEmail) {
      return res.status(400).json({ success: false, message: 'Email utilisateur non trouvé' });
    }
    
    const notification = await NotificationIntelligente.create({
      type: type || 'INFO',
      titre: titre,
      message: message,
      action_suggested: action_suggested || null,
      priorite: priorite || 3,
      id_utilisateur: req.user.id,
      email_utilisateur: userEmail,
      role_utilisateur: userRole,
      details: details || null,
      source: source || 'manuel',
      statut: 'non_lu',
      created_at: new Date()
    });
    
    res.json({ success: true, notification });
  } catch (error) {
    console.error('❌ Erreur création notification:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== TEST MANUEL - FORCER L'ENVOI DES NOTIFICATIONS ==========
router.post('/test/forcer-notifications', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'social') {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }
    
    console.log('🧪 TEST MANUEL - Forçage des notifications...');
    
    const notificationService = require('../services/notificationIntelligenteService');
    const nbEnvoyees = await notificationService.envoyerNotifications();
    
    console.log(`✅ ${nbEnvoyees} notifications créées`);
    
    res.json({ 
      success: true, 
      message: `Test exécuté - ${nbEnvoyees} notifications créées`,
      nb_notifications: nbEnvoyees
    });
  } catch (error) {
    console.error('❌ Erreur test:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;