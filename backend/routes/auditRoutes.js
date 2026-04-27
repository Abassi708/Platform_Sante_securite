// backend/routes/auditRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const db = require('../models');
const { Op } = require('sequelize');

const ActivityLog = db.local.ActivityLog;

// ========== RÉCUPÉRER TOUS LES LOGS (admin uniquement) ==========
router.get('/logs', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    const { 
      page = 1, 
      limit = 50, 
      module, 
      typeAction, 
      utilisateur, 
      dateDebut, 
      dateFin,
      recherche 
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = {};

    if (module && module !== 'all') whereClause.module = module;
    if (typeAction && typeAction !== 'all') whereClause.type_action = typeAction;
    if (utilisateur && utilisateur !== 'all') whereClause.email_utilisateur = utilisateur;
    if (recherche) {
      whereClause[Op.or] = [
        { description: { [Op.like]: `%${recherche}%` } },
        { email_utilisateur: { [Op.like]: `%${recherche}%` } },
        { identifiant_cible: { [Op.like]: `%${recherche}%` } }
      ];
    }
    if (dateDebut && dateFin) {
      whereClause.date_creation = {
        [Op.between]: [new Date(dateDebut), new Date(dateFin + 'T23:59:59')]
      };
    }

    const { count, rows } = await ActivityLog.findAndCountAll({
      where: whereClause,
      order: [['date_creation', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit)
    });
  } catch (erreur) {
    console.error('Erreur récupération logs:', erreur);
    res.status(500).json({ success: false, message: erreur.message });
  }
});

// ========== STATISTIQUES D'AUDIT ==========
router.get('/stats', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    const total = await ActivityLog.count();
    
    const parModule = await ActivityLog.findAll({
      attributes: ['module', [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']],
      group: ['module']
    });
    
    const parTypeAction = await ActivityLog.findAll({
      attributes: ['type_action', [db.Sequelize.fn('COUNT', db.Sequelize.col('id')), 'count']],
      group: ['type_action']
    });
    
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const aujourdhuiCount = await ActivityLog.count({
      where: { date_creation: { [Op.gte]: aujourdhui } }
    });
    
    const semaineDerniere = new Date();
    semaineDerniere.setDate(semaineDerniere.getDate() - 7);
    const semaineCount = await ActivityLog.count({
      where: { date_creation: { [Op.gte]: semaineDerniere } }
    });

    res.json({
      success: true,
      stats: {
        total,
        aujourdhui: aujourdhuiCount,
        semaine: semaineCount,
        parModule,
        parTypeAction
      }
    });
  } catch (erreur) {
    console.error('Erreur stats:', erreur);
    res.status(500).json({ success: false, message: erreur.message });
  }
});

// ========== SUPPRIMER UN LOG SPÉCIFIQUE ==========
router.delete('/logs/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    const { id } = req.params;
    
    // Vérifier si l'ID est valide
    const logId = parseInt(id);
    if (isNaN(logId)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }
    
    // Vérifier si le log existe
    const log = await ActivityLog.findByPk(logId);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Log non trouvé' });
    }

    // Supprimer le log
    await log.destroy();

    console.log(`✅ Log audit ${id} supprimé par ${req.user.email}`);
    
    res.json({ success: true, message: 'Log supprimé avec succès' });
  } catch (erreur) {
    console.error('❌ Erreur suppression log:', erreur);
    res.status(500).json({ success: false, message: erreur.message });
  }
});

// ========== SUPPRIMER PLUSIEURS LOGS ==========
router.delete('/logs/bulk', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'Aucun ID fourni' });
    }

    const validIds = ids.filter(id => !isNaN(parseInt(id))).map(id => parseInt(id));
    
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: 'IDs invalides' });
    }

    const deletedCount = await ActivityLog.destroy({
      where: { id: { [Op.in]: validIds } }
    });

    console.log(`✅ ${deletedCount} log(s) audit supprimés par ${req.user.email}`);
    
    res.json({ success: true, message: `${deletedCount} log(s) supprimé(s) avec succès` });
  } catch (erreur) {
    console.error('❌ Erreur suppression groupée:', erreur);
    res.status(500).json({ success: false, message: erreur.message });
  }
});

// ========== SUPPRIMER LES LOGS ANCIENS ==========
router.delete('/logs/clear-old', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès non autorisé' });
    }

    const { days = 30 } = req.query;
    const daysInt = parseInt(days);
    
    if (isNaN(daysInt) || daysInt < 1) {
      return res.status(400).json({ success: false, message: 'Nombre de jours invalide' });
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInt);

    const deletedCount = await ActivityLog.destroy({
      where: { date_creation: { [Op.lt]: cutoffDate } }
    });

    console.log(`✅ ${deletedCount} log(s) audit anciens (${daysInt} jours) supprimés par ${req.user.email}`);
    
    res.json({ success: true, message: `${deletedCount} log(s) plus vieux que ${daysInt} jours supprimé(s)` });
  } catch (erreur) {
    console.error('❌ Erreur suppression logs anciens:', erreur);
    res.status(500).json({ success: false, message: erreur.message });
  }
});

module.exports = router;