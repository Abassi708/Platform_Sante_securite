// backend/scripts/testProchainJourOuvre.js
const planningService = require('../services/planningService');

async function testProchainJourOuvre() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TEST: getProchainJourOuvre - Recherche prochain jour ouvré');
  console.log('='.repeat(70) + '\n');

  const tests = [
    { date: '2026-04-10', nom: 'Vendredi', attendu: '2026-04-14', jourAttendu: 'Mardi' },
    { date: '2026-04-11', nom: 'Samedi', attendu: '2026-04-14', jourAttendu: 'Mardi' },
    { date: '2026-04-12', nom: 'Dimanche', attendu: '2026-04-14', jourAttendu: 'Mardi' },
    { date: '2026-04-13', nom: 'Lundi', attendu: '2026-04-14', jourAttendu: 'Mardi' },
    { date: '2026-04-14', nom: 'Mardi', attendu: '2026-04-15', jourAttendu: 'Mercredi' },
    { date: '2026-04-15', nom: 'Mercredi', attendu: '2026-04-16', jourAttendu: 'Jeudi' },
    { date: '2026-04-16', nom: 'Jeudi', attendu: '2026-04-17', jourAttendu: 'Vendredi' },
    { date: '2026-04-17', nom: 'Vendredi', attendu: '2026-04-21', jourAttendu: 'Mardi' }, // Saut du weekend
  ];

  let ok = 0;
  let ko = 0;

  for (const test of tests) {
    const dateDepart = new Date(test.date);
    const resultat = await planningService.getProchainJourOuvre(dateDepart);
    
    if (!resultat) {
      console.log(`❌ ${test.date} (${test.nom}) → AUCUN JOUR TROUVÉ !`);
      ko++;
      continue;
    }
    
    const dateResultat = resultat.toISOString().split('T')[0];
    const jourResultat = planningService._getNomJour(resultat.getDay());
    const estValide = (dateResultat === test.attendu);
    
    const status = estValide ? '✅' : '❌';
    console.log(`${status} ${test.date} (${test.nom}) → ${dateResultat} (${jourResultat}) | Attendu: ${test.attendu} (${test.jourAttendu})`);
    
    if (estValide) ok++;
    else ko++;
  }

  console.log('\n' + '='.repeat(70));
  console.log(`📊 RÉSULTAT: ${ok}/${ok+ko} tests passés`);
  console.log('='.repeat(70) + '\n');
  
  process.exit(ko > 0 ? 1 : 0);
}

testProchainJourOuvre();