// backend/config/database.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

// ========== CONNEXION À LA BASE GLOBALE (agent, agence, affectation) ==========
const sequelizeGlobal = new Sequelize(
  process.env.DB_GLOBAL_NAME,
  process.env.DB_GLOBAL_USER,
  process.env.DB_GLOBAL_PASSWORD,
  {
    host: process.env.DB_GLOBAL_HOST,
    port: process.env.DB_GLOBAL_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    // Ajout pour connexion distante
    dialectOptions: {
      connectTimeout: 60000
    }
  }
);

// ========== CONNEXION À LA BASE LOCALE (accident, planning, visite, etc.) ==========
const sequelizeLocal = new Sequelize(
  process.env.DB_LOCAL_NAME,
  process.env.DB_LOCAL_USER,
  process.env.DB_LOCAL_PASSWORD,
  {
    host: process.env.DB_LOCAL_HOST,
    port: process.env.DB_LOCAL_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    // Ajout pour connexion distante
    dialectOptions: {
      connectTimeout: 60000
    }
  }
);

// Tester les connexions
const testConnections = async () => {
  try {
    await sequelizeGlobal.authenticate();
    console.log('✅ Connecté à la base GLOBALE:', process.env.DB_GLOBAL_NAME);
    console.log('   📍 Host:', process.env.DB_GLOBAL_HOST + ':' + process.env.DB_GLOBAL_PORT);
  } catch (error) {
    console.error('❌ Erreur connexion base GLOBALE:', error.message);
    console.error('   Vérifiez que le serveur MySQL est accessible depuis cette machine');
  }

  try {
    await sequelizeLocal.authenticate();
    console.log('✅ Connecté à la base LOCALE:', process.env.DB_LOCAL_NAME);
    console.log('   📍 Host:', process.env.DB_LOCAL_HOST + ':' + process.env.DB_LOCAL_PORT);
  } catch (error) {
    console.error('❌ Erreur connexion base LOCALE:', error.message);
    console.error('   Vérifiez que le serveur MySQL est accessible depuis cette machine');
  }
};

module.exports = {
  sequelizeGlobal,
  sequelizeLocal,
  testConnections
};