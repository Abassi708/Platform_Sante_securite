// backend/cron/notificationIntelligenteCron.js
const cron = require('node-cron');
const notificationIntelligenteService = require('../services/notificationIntelligenteService');

// Exécution tous les jours à 8h00, 12h00 et 16h00
cron.schedule('0 8,12,16 * * *', async () => {
  console.log('\n' + '='.repeat(70));
  console.log(`🕐 [CRON] Exécution du système d'alertes intelligentes - ${new Date().toLocaleString()}`);
  console.log('='.repeat(70));
  
  try {
    const nbEnvoyees = await notificationIntelligenteService.envoyerNotifications();
    console.log(`✅ [CRON] ${nbEnvoyees} notifications envoyées`);
  } catch (error) {
    console.error('❌ [CRON] Erreur:', error);
  }
});

console.log('✅ Cron notification intelligente planifié (tous les jours à 8h, 12h, 16h)');