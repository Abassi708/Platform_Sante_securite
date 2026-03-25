const cron = require('node-cron');
const convocationService = require('../services/convocationService');

cron.schedule('0 8 * * *', async () => {
  console.log('\n' + '='.repeat(60));
  console.log('📧 CRON CONVOCATIONS GRH');
  console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
  console.log('='.repeat(60));
  
  try {
    const nbEnvoyees = await convocationService.verifierEtEnvoyerConvocations();
    console.log(`\n✅ ${nbEnvoyees} convocation(s) envoyée(s) avec PDF`);
  } catch (error) {
    console.error('❌ Erreur cron convocations:', error);
  }
});

cron.schedule('0 14 * * *', async () => {
  try {
    const convocations = await convocationService.getConvocationsAPreparer();
    if (convocations.length > 0) {
      console.log(`📋 Rappel: ${convocations.length} convocation(s) à préparer pour J+7`);
    }
  } catch (error) {
    console.error('❌ Erreur cron rappel convocations:', error);
  }
});

console.log('⏰ Cron convocations GRH chargé');