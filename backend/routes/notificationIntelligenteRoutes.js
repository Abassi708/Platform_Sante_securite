// backend/routes/notificationIntelligenteRoutes.js
const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { protect } = require('../middleware/authMiddleware');
const db = require('../models'); // ← AJOUTER CETTE LIGNE
const notificationService = require('../services/notificationIntelligenteService');

// Récupérer le modèle
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

    res.json({
      success: true,
      notifications,
      stats,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('❌ Erreur récupération notifications:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// ========== MARQUER UNE NOTIFICATION COMME LUE ==========
router.put('/:id/lire', protect, async (req, res) => {
  try {
    const result = await notificationService.marquerCommeLue(req.params.id, req.user.id);

    if (result) {
      res.json({ success: true, message: 'Notification marquée comme lue', notification: result });
    } else {
      res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== MARQUER TOUT COMME LU ==========
router.put('/tout-lire', protect, async (req, res) => {
  try {
    await notificationService.marquerToutesLues(req.user.id);
    res.json({ success: true, message: 'Toutes les notifications marquées comme lues' });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== ARCHIVER UNE NOTIFICATION ==========
router.put('/:id/archiver', protect, async (req, res) => {
  try {
    const result = await notificationService.archiver(req.params.id, req.user.id);
    if (result) {
      res.json({ success: true, message: 'Notification archivée', notification: result });
    } else {
      res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== SUPPRIMER UNE NOTIFICATION ==========
router.delete('/:id', protect, async (req, res) => {
  try {
    const deleted = await notificationService.supprimer(req.params.id, req.user.id);
    if (deleted) {
      res.json({ success: true, message: 'Notification supprimée' });
    } else {
      res.status(404).json({ success: false, message: 'Notification non trouvée' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== DÉCLENCHER MANUELLEMENT LA DÉTECTION (ADMIN) ==========
router.post('/detecter', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.Role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs' });
    }

    const nb = await notificationService.envoyerNotifications();

    res.json({
      success: true,
      message: `${nb} notifications générées`,
      count: nb
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== MES STATISTIQUES ==========
router.get('/mes-stats', protect, async (req, res) => {
  try {
    const stats = await notificationService.getStats(req.user.id);
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== STATISTIQUES GLOBALES (ADMIN) ==========
router.get('/stats-globales', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.Role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs' });
    }

    const stats = await notificationService.getStats(); // sans userId = toutes

    // Évolution sur les 7 derniers jours
    const septJours = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const dateSuivante = new Date(date);
      dateSuivante.setDate(dateSuivante.getDate() + 1);

      const count = await NotificationIntelligente.count({
        where: {
          created_at: { [Op.between]: [date, dateSuivante] }
        }
      });

      septJours.push({
        date: date.toLocaleDateString('fr-FR'),
        count
      });
    }

    res.json({
      success: true,
      stats,
      evolution: septJours
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;