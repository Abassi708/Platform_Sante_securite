// backend/cron/verificationReprisesCron.js
const cron = require('node-cron');
const { exec } = require('child_process');

// Exécuter tous les dimanches à 2h du matin
cron.schedule('0 2 * * 0', () => {
  console.log('🔍 Vérification des reprises manquantes...');
  exec('node scripts/recalculerReprisesAccident.js', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }
    console.log(stdout);
  });
});