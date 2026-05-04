// backend/cron/autoPlanningCron.js
const cron = require('node-cron');
const planningService = require('../services/planningService');

// Tous les dimanches à 22h00, générer les 4 prochaines semaines
cron.schedule('0 22 * * 0', async () => {
  console.log('\n' + '='.repeat(60));
  console.log('📅 CRON PLANNING AUTOMATIQUE (4 semaines)');
  console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
  console.log('='.repeat(60));
  
  try {
    const aujourdhui = new Date();
    let totalGenere = 0;
    
    // ✅ Générer les 4 prochaines semaines (J+7 à J+28)
    for (let i = 1; i <= 4; i++) {
      const semaineCible = planningService.getNumeroSemaine(aujourdhui) + i;
      let anneeCible = aujourdhui.getFullYear();
      let semaineTemp = semaineCible;
      
      if (semaineTemp > 52) {
        semaineTemp = 1;
        anneeCible++;
      }
      
      const planningExistant = await planningService.Planning.findOne({
        where: { semaine: semaineTemp, annee: anneeCible }
      });
      
      if (!planningExistant) {
        const lundiCible = planningService.getLundiSemaine(semaineTemp, anneeCible);
        const planning = await planningService.genererPlanningSemaine(new Date(lundiCible), 1);
        totalGenere += planning.length;
        console.log(`   ✅ Semaine ${semaineTemp}/${anneeCible} (J+${i*7}): ${planning.length} visite(s)`);
      } else {
        console.log(`   ⏭️ Semaine ${semaineTemp}/${anneeCible}: déjà existante`);
      }
    }
    
    console.log(`\n✅ Total: ${totalGenere} nouvelle(s) visite(s) générée(s)`);
    
  } catch (error) {
    console.error('❌ Erreur cron planning:', error);
  }
});

console.log('⏰ Cron planning automatique (dimanche 22h00 - 4 semaines) chargé');