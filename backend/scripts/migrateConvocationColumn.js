// backend/scripts/migrateConvocationColumn.js
const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

async function migrateConvocationColumn() {
  console.log('🚀 Migration: Ajout de la colonne convocation_envoyee...');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données\n');
    
    const [results] = await sequelize.query(`
      SHOW COLUMNS FROM planning LIKE 'convocation_envoyee'
    `);
    
    if (results.length === 0) {
      console.log('📝 Ajout de la colonne convocation_envoyee...');
      await sequelize.query(`
        ALTER TABLE planning 
        ADD COLUMN convocation_envoyee BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ Colonne ajoutée avec succès');
    } else {
      console.log('ℹ️ La colonne convocation_envoyee existe déjà');
    }
    
    const [motifResults] = await sequelize.query(`
      SHOW COLUMNS FROM planning LIKE 'motif_annulation'
    `);
    
    if (motifResults.length === 0) {
      console.log('📝 Ajout de la colonne motif_annulation...');
      await sequelize.query(`
        ALTER TABLE planning 
        ADD COLUMN motif_annulation VARCHAR(255) NULL
      `);
      console.log('✅ Colonne motif_annulation ajoutée');
    }
    
    console.log('\n🎉 Migration terminée avec succès !');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur migration:', error);
    process.exit(1);
  }
}

migrateConvocationColumn();