// backend/scripts/migrateProchaineVisite.js
require('dotenv').config();
const { sequelizeGlobal } = require('../config/database'); // ← Utiliser sequelizeGlobal

async function migrateProchaineVisite() {
  console.log('🚀 Migration: Ajout de la colonne date_prochaine_visite dans la table agent (base GLOBALE)...');
  
  try {
    await sequelizeGlobal.authenticate();
    console.log('✅ Connecté à la base GLOBALE\n');
    
    // Vérifier si la colonne existe déjà
    const [results] = await sequelizeGlobal.query(`
      SHOW COLUMNS FROM agent LIKE 'date_prochaine_visite'
    `);
    
    if (results.length === 0) {
      console.log('📝 Ajout de la colonne date_prochaine_visite...');
      await sequelizeGlobal.query(`
        ALTER TABLE agent 
        ADD COLUMN date_prochaine_visite DATE NULL AFTER date_fin_inaptitude
      `);
      console.log('✅ Colonne ajoutée avec succès');
    } else {
      console.log('ℹ️ La colonne date_prochaine_visite existe déjà');
    }
    
    console.log('\n🎉 Migration terminée !');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur migration:', error);
    process.exit(1);
  }
}

migrateProchaineVisite();