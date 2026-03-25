// backend/scripts/createIndexes.js
const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

async function createIndexes() {
  try {
    console.log('🚀 Création des index pour optimiser les performances...');
    
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données\n');

    // Index pour Agent
    console.log('📊 Création des index pour la table agent...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_derniere_visite ON agent(date_derniere_visite);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_statut ON agent(statut);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_inaptitude ON agent(date_fin_inaptitude);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_agence_poste ON agent(code_agence, code_affectation);
    `);
    console.log('✅ Index agent créés');

    // Index pour Planning
    console.log('\n📊 Création des index pour la table planning...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_planning_semaine_annee ON planning(semaine, annee);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_planning_date_visite ON planning(date_visite);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_planning_statut ON planning(statut);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_planning_agent_date ON planning(matricule_agent, date_visite);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_planning_effectuee ON planning(visite_effectuee);
    `);
    console.log('✅ Index planning créés');

    // Index pour Visite
    console.log('\n📊 Création des index pour la table visite...');
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_visite_date ON visite(date_visite);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_visite_agent ON visite(matricule_agent);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_visite_source ON visite(source);
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_visite_type_action ON visite(type_action);
    `);
    console.log('✅ Index visite créés');

    console.log('\n🎉 Tous les index ont été créés avec succès !');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

createIndexes();