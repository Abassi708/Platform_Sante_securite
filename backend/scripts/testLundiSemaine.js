// backend/scripts/testLundiSemaine.js
const planningService = require('../services/planningService');

async function testLundiSemaine() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TEST: getLundiSemaine - Calcul du lundi de la semaine');
  console.log('='.repeat(70) + '\n');

  const tests = [
    { semaine: 15, annee: 2026, attendu: '2026-04-06' },
    { semaine: 16, annee: 2026, attendu: '2026-04-13' },
    { semaine: 17, annee: 2026, attendu: '2026-04-20' },
    { semaine: 18, annee: 2026, attendu: '2026-04-27' },
    { semaine: 1, annee: 2026, attendu: '2025-12-29' }, // Semaine 1 2026 commence le 29/12/2025
  ];

  let ok = 0;
  let ko = 0;

  for (const test of tests) {
    const resultat = planningService.getLundiSemaine(test.semaine, test.annee);
    const estValide = (resultat === test.attendu);
    const status = estValide ? '✅' : '❌';
    
    console.log(`${status} Semaine ${test.semaine}/${test.annee} → ${resultat} | Attendu: ${test.attendu}`);
    
    if (estValide) ok++;
    else ko++;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`📊 RÉSULTAT: ${ok}/${ok+ko} tests passés`);
  console.log('='.repeat(70) + '\n');
  
  process.exit(0);
}

testLundiSemaine();