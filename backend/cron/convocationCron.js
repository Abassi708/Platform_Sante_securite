// backend/cron/convocationCron.js
const cron = require('node-cron');
const convocationService = require('../services/convocationService');

// Tous les jours à 8h00 - Envoi des convocations pour J+7
cron.schedule('0 8 * * *', async () => {
  console.log('\n' + '='.repeat(60));
  console.log('📧 CRON CONVOCATIONS GRH');
  console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
  console.log('='.repeat(60));
  
  try {
    const nbEnvoyees = await convocationService.verifierEtEnvoyerConvocations();
    
    if (nbEnvoyees > 0) {
      console.log(`\n✅ ${nbEnvoyees} convocation(s) envoyée(s) avec PDF`);
      
      // Afficher le détail des envois
      const stats = await convocationService.getStatsConvocations();
      console.log(`📊 Stats: Total envoyées: ${stats.total_envoyees}`);
    } else {
      console.log(`\n📭 Aucune convocation à envoyer aujourd'hui pour J+7`);
    }
    
  } catch (error) {
    console.error('❌ Erreur cron convocations:', error);
  }
});

// Tous les jours à 14h00 - Rappel des convocations à préparer pour J+7
cron.schedule('0 14 * * *', async () => {
  try {
    const convocations = await convocationService.getConvocationsAPreparer();
    if (convocations.length > 0) {
      console.log(`\n📋 RAPPEL: ${convocations.length} convocation(s) à préparer pour la semaine prochaine`);
      console.log(`   Visites du: ${[...new Set(convocations.map(c => c.date_visite))].join(', ')}`);
    }
  } catch (error) {
    console.error('❌ Erreur cron rappel convocations:', error);
  }
});

console.log('⏰ Cron convocations GRH chargé (8h00 envoi, 14h00 rappel)');