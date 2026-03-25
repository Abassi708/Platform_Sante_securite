// backend/scripts/migrateNewSystem.js
require('dotenv').config();
const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

async function migrateNewSystem() {
  console.log('\n🚀 MIGRATION VERS LE NOUVEAU SYSTÈME');
  console.log('='.repeat(60));
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données\n');

    // 1. Ajouter source_reprogrammation
    console.log('📝 Ajout de source_reprogrammation...');
    try {
      await sequelize.query(`
        ALTER TABLE planning 
        ADD COLUMN source_reprogrammation ENUM('auto', 'manuel') NULL AFTER reprogrammee
      `);
      console.log('✅ source_reprogrammation ajoutée');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('ℹ️ source_reprogrammation existe déjà');
      } else throw e;
    }

    // 2. Ajouter motif_annulation
    console.log('📝 Ajout de motif_annulation...');
    try {
      await sequelize.query(`
        ALTER TABLE planning 
        ADD COLUMN motif_annulation VARCHAR(255) NULL AFTER convocation_envoyee
      `);
      console.log('✅ motif_annulation ajoutée');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('ℹ️ motif_annulation existe déjà');
      } else throw e;
    }

    // 3. Ajouter nouvelle_date_visite et nouvelle_heure_visite
    console.log('📝 Ajout de nouvelle_date_visite...');
    try {
      await sequelize.query(`
        ALTER TABLE planning 
        ADD COLUMN nouvelle_date_visite DATE NULL AFTER creneau_bloque,
        ADD COLUMN nouvelle_heure_visite TIME NULL AFTER nouvelle_date_visite
      `);
      console.log('✅ nouvelle_date_visite et nouvelle_heure_visite ajoutées');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('ℹ️ colonnes existent déjà');
      } else throw e;
    }

    // 4. Modifier l'ENUM type_visite
    console.log('📝 Modification de type_visite ENUM...');
    try {
      await sequelize.query(`
        ALTER TABLE planning 
        MODIFY COLUMN type_visite ENUM('Périodique', 'Reprise', 'Reclassement') NOT NULL DEFAULT 'Périodique'
      `);
      console.log('✅ type_visite modifié');
    } catch (e) {
      console.log('⚠️ Erreur modification ENUM:', e.message);
    }

    // 5. Ajouter convocation_envoyee si nécessaire
    console.log('📝 Vérification convocation_envoyee...');
    try {
      await sequelize.query(`
        ALTER TABLE planning 
        ADD COLUMN convocation_envoyee BOOLEAN DEFAULT FALSE
      `);
      console.log('✅ convocation_envoyee ajoutée');
    } catch (e) {
      if (e.message.includes('Duplicate column')) {
        console.log('ℹ️ convocation_envoyee existe déjà');
      } else throw e;
    }

    console.log('\n✅ MIGRATION TERMINÉE !');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur migration:', error);
    process.exit(1);
  }
}

migrateNewSystem();