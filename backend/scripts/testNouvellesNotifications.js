// ========== DIAGNOSTIC COMPLET DES NOTIFICATIONS ==========
router.get('/diagnostic', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.Role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Accès réservé aux administrateurs' });
    }
    
    const db = require('../models');
    const NotificationIntelligente = db.local.NotificationIntelligente;
    
    // 1. Vérifier la table
    const tableExists = await NotificationIntelligente.sequelize.getQueryInterface().showAllTables();
    const tableFound = tableExists.includes('notifications_intelligentes');
    
    // 2. Compter les notifications
    const total = await NotificationIntelligente.count();
    const nonLues = await NotificationIntelligente.count({ where: { statut: 'non_lu' } });
    
    // 3. Détecter les situations
    const situations = await notificationService.detecterToutesSituations();
    
    // 4. Créer une notification de test
    const testNotif = await notificationService.creerNotification({
      type: 'INFO',
      titre: '🧪 Diagnostic - Test notification',
      message: `Cette notification a été créée le ${new Date().toLocaleString('fr-FR')}`,
      priorite: 3,
      id_utilisateur: req.user.id,
      email_utilisateur: req.user.email,
      role_utilisateur: req.user.role,
      source: 'diagnostic'
    });
    
    res.json({
      success: true,
      diagnostic: {
        table_notifications: {
          existe: tableFound,
          total_notifications: total,
          non_lues: nonLues
        },
        situations_detectees: {
          nombre: situations.length,
          liste: situations.slice(0, 10)
        },
        notification_test: testNotif ? {
          id: testNotif.id,
          titre: testNotif.titre,
          message: testNotif.message
        } : null
      }
    });
  } catch (error) {
    console.error('❌ Erreur diagnostic:', error);
    res.status(500).json({ success: false, message: error.message, stack: error.stack });
  }
});