// backend/scripts/cleanAndRegenerate.js
require('dotenv').config();
const { sequelizeLocal } = require('../config/database');
const planningService = require('../services/planningService');

async function cleanAndRegenerate() {
  console.log('\n🗑️ NETTOYAGE COMPLET ET RÉGÉNÉRATION\n');
  
  try {
    // 1. Supprimer toutes les visites liées
    console.log('📝 Suppression des visites...');
    await sequelizeLocal.query('DELETE FROM visite');
    
    // 2. Supprimer tous les plannings
    console.log('📝 Suppression des plannings...');
    await sequelizeLocal.query('DELETE FROM planning');
    
    // 3. Récupérer un admin
    const [admin] = await sequelizeLocal.query(
      'SELECT id_utilisateur FROM utilisateur WHERE Role = ? LIMIT 1',
      { replacements: ['admin'] }
    );
    
    // 4. Générer un nouveau planning propre
    const aujourdhui = new Date();
    const semaine = planningService.getNumeroSemaine(aujourdhui);
    const annee = aujourdhui.getFullYear();
    const lundi = planningService.getLundiSemaine(semaine, annee);
    
    console.log(`\n📅 Génération planning semaine ${semaine}/${annee}`);
    console.log(`   Lundi référence: ${lundi}`);
    
    const planning = await planningService.genererPlanningSemaine(new Date(lundi), admin[0].id_utilisateur);
    
    console.log(`\n✅ ${planning.length} visites générées`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

cleanAndRegenerate();