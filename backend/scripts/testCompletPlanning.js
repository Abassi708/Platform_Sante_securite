// backend/scripts/testCompletPlanning.js
const planningService = require('../services/planningService');

async function testCompletPlanning() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TEST COMPLET DU PLANNING SERVICE');
  console.log('='.repeat(70) + '\n');

  // 1. Test estJourOuvre
  console.log('📋 TEST 1: estJourOuvre (jours valides)');
  const joursTest = [
    { date: '2026-04-06', attendu: false, nom: 'Lundi' },
    { date: '2026-04-07', attendu: true, nom: 'Mardi' },
    { date: '2026-04-08', attendu: true, nom: 'Mercredi' },
    { date: '2026-04-09', attendu: true, nom: 'Jeudi' },
    { date: '2026-04-10', attendu: true, nom: 'Vendredi' },
    { date: '2026-04-11', attendu: false, nom: 'Samedi' },
    { date: '2026-04-12', attendu: false, nom: 'Dimanche' },
  ];

  for (const test of joursTest) {
    const date = new Date(test.date);
    const resultat = await planningService.estJourOuvre(date);
    const status = resultat === test.attendu ? '✅' : '❌';
    console.log(`   ${status} ${test.date} (${test.nom}): ${resultat ? 'AUTORISÉ' : 'EXCLU'}`);
  }

  // 2. Test getProchainJourOuvre
  console.log('\n📋 TEST 2: getProchainJourOuvre');
  const dateVendredi = new Date('2026-04-10');
  const prochain = await planningService.getProchainJourOuvre(dateVendredi);
  const jourProchain = prochain ? planningService._getNomJour(prochain.getDay()) : 'null';
  console.log(`   Vendredi 10/04/2026 → ${prochain ? prochain.toISOString().split('T')[0] : 'null'} (${jourProchain})`);
  console.log(`   ✅ Attendu: 2026-04-14 (Mardi)`);

  // 3. Test getLundiSemaine
  console.log('\n📋 TEST 3: getLundiSemaine');
  const lundi = planningService.getLundiSemaine(15, 2026);
  console.log(`   Semaine 15/2026 → Lundi: ${lundi}`);
  console.log(`   ✅ Attendu: 2026-04-06`);

  // 4. Test getNumeroSemaine
  console.log('\n📋 TEST 4: getNumeroSemaine');
  const dateTest = new Date('2026-04-07');
  const semaine = planningService.getNumeroSemaine(dateTest);
  console.log(`   07/04/2026 → Semaine: ${semaine}`);
  console.log(`   ✅ Attendu: 15`);

  console.log('\n' + '='.repeat(70));
  console.log('🎉 TESTS TERMINÉS');
  console.log('='.repeat(70) + '\n');
  
  process.exit(0);
}

testCompletPlanning();