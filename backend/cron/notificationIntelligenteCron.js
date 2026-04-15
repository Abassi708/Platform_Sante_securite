// backend/cron/notificationIntelligenteCron.js
const cron = require('node-cron');
const notificationService = require('../services/notificationIntelligenteService');

// CRON PRINCIPAL : 7h, 12h, 18h
cron.schedule('0 7,12,18 * * *', async () => {
  console.log('\n⏰ ===== CRON NOTIFICATIONS INTELLIGENTES =====');
  console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);

  try {
    const nb = await notificationService.envoyerNotifications();
    console.log(`✅ ${nb} notification(s) créée(s)`);
  } catch (error) {
    console.error('❌ Erreur cron notifications intelligentes:', error);
  }
});

// CRON CONVOCATIONS : 9h, Lundi–Vendredi
cron.schedule('0 9 * * 1-5', async () => {
  console.log('\n📧 [CRON] Vérification convocations...');

  try {
    const situations = await notificationService.detecterConvocationsAVenir();
    if (situations.length > 0) {
      const users = await notificationService.getUsersCibles(['social']);
      for (const situation of situations) {
        for (const user of users) {
          await notificationService.creerNotification({
            id_utilisateur: user.id,
            type: 'IMPORTANT',
            titre: situation.titre,
            message: situation.message,
            action_suggested: situation.action_suggested,
            priorite: situation.priorite,
            source: situation.type,
            email_utilisateur: user.email,
            role_utilisateur: user.role,
            details: situation.details
          });
        }
      }
      console.log(`✅ ${situations.length} notification(s) convocation créée(s)`);
    }
  } catch (error) {
    console.error('❌ Erreur cron convocations:', error);
  }
});

console.log('⏰ Cron notifications intelligentes chargé (7h/12h/18h + 9h Lun-Ven)');