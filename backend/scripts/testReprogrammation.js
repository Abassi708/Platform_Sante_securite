// backend/scripts/testReprogrammation.js
const planningService = require('../services/planningService');

async function testReprogrammation() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST REPROGRAMMATION AUTO - JOURS OUVRÉS');
  console.log('='.repeat(60) + '\n');

  const datesTest = [
    { date: '2026-04-10', nom: 'Vendredi', attendu: '2026-04-14' },
    { date: '2026-04-11', nom: 'Samedi', attendu: '2026-04-14' },
    { date: '2026-04-12', nom: 'Dimanche', attendu: '2026-04-14' },
    { date: '2026-04-13', nom: 'Lundi', attendu: '2026-04-14' },
    { date: '2026-04-14', nom: 'Mardi', attendu: '2026-04-14' },
  ];

  let ok = 0;
  let ko = 0;

  for (const test of datesTest) {
    const dateDepart = new Date(test.date);
    const prochainJour = await planningService.getProchainJourOuvre(dateDepart);
    const resultat = prochainJour.toISOString().split('T')[0];
    
    const estValide = (resultat === test.attendu);
    const status = estValide ? '✅' : '❌';
    
    console.log(`${status} ${test.date} (${test.nom}) → ${resultat} (${planningService._getNomJour(prochainJour.getDay())})`);
    
    if (estValide) ok++;
    else ko++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`📊 RÉSULTAT: ${ok}/${ok+ko} tests passés`);
  console.log('='.repeat(60) + '\n');
  
  process.exit(ko > 0 ? 1 : 0);
}

testReprogrammation();