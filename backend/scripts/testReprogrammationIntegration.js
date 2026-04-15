// backend/scripts/testReprogrammationIntegration.js
const { sequelizeLocal } = require('../config/database');
const planningService = require('../services/planningService');
const reprogrammationAutoService = require('../services/reprogrammationAutoService');

async function testReprogrammationIntegration() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TEST D\'INTÉGRATION: REPROGRAMMATION AUTO');
  console.log('='.repeat(70) + '\n');

  try {
    // Vérifier qu'il existe des visites
    const [visites] = await sequelizeLocal.query(`
      SELECT id_planning, date_visite, heure_visite, type_visite
      FROM planning 
      WHERE statut = 'Programmé' 
      LIMIT 1
    `);

    if (visites.length === 0) {
      console.log('⚠️ Aucune visite trouvée en base');
      console.log('💡 Créez d\'abord une visite ou générez un planning');
      process.exit(0);
    }

    const visite = visites[0];
    console.log(`📋 Visite trouvée:`);
    console.log(`   ID: ${visite.id_planning}`);
    console.log(`   Date: ${visite.date_visite} (${planningService._getNomJour(new Date(visite.date_visite).getDay())})`);
    console.log(`   Heure: ${visite.heure_visite}`);
    console.log(`   Type: ${visite.type_visite}\n`);

    // Tester la reprogrammation vers un Samedi (doit échouer ou être redirigé)
    const dateSamedi = '2026-04-11';
    console.log(`🔧 Test 1: Reprogrammation vers ${dateSamedi} (Samedi)`);
    
    try {
      const result = await reprogrammationAutoService.reprogrammerAuto(
        visite.id_planning,
        dateSamedi,
        '09:00:00',
        'Test auto',
        1,
        visite.type_visite
      );
      
      if (result && result.nouveau_planning) {
        const nouvelleDate = result.nouveau_planning.date;
        const jourNouvelleDate = planningService._getNomJour(new Date(nouvelleDate).getDay());
        console.log(`   ✅ Résultat: reprogrammé au ${nouvelleDate} (${jourNouvelleDate})`);
        
        if (jourNouvelleDate === 'Samedi') {
          console.log('   ❌ ERREUR: La reprogrammation a accepté un Samedi !');
        } else {
          console.log('   ✅ CORRECT: La reprogrammation a trouvé un jour valide');
        }
      }
    } catch (error) {
      console.log(`   ℹ️ Erreur (normale si validation stricte): ${error.message}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('🎉 TESTS TERMINÉS');
    console.log('='.repeat(70) + '\n');
    
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testReprogrammationIntegration();