// backend/scripts/testAll.js
const { execSync } = require('child_process');
const path = require('path');

console.log('\n' + '='.repeat(70));
console.log('🚀 EXÉCUTION DE TOUS LES TESTS');
console.log('='.repeat(70) + '\n');

const tests = [
  'testLundiSemaine.js',
  'testProchainJourOuvre.js',
  'testCompletPlanning.js'
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  console.log(`\n📋 Exécution de ${test}...`);
  try {
    execSync(`node ${path.join(__dirname, test)}`, { stdio: 'inherit' });
    passed++;
  } catch (error) {
    failed++;
  }
}

console.log('\n' + '='.repeat(70));
console.log(`📊 RÉSUMÉ: ${passed} succès, ${failed} échecs`);
console.log('='.repeat(70) + '\n');

process.exit(failed > 0 ? 1 : 0);