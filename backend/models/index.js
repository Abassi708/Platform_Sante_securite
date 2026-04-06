// backend/models/index.js
const fs = require('fs');
const path = require('path');
const { sequelizeGlobal, sequelizeLocal } = require('../config/database');

const db = {
  global: {},
  local: {},
  sequelizeGlobal,
  sequelizeLocal,
  Sequelize: require('sequelize')
};

// ========== CHARGER LES MODÈLES DE LA BASE GLOBALE ==========
const globalModels = ['Agent', 'Agence', 'Affectation'];

globalModels.forEach(modelName => {
  try {
    const modelPath = path.join(__dirname, `${modelName}.js`);
    if (fs.existsSync(modelPath)) {
      const modelFn = require(modelPath);
      const model = modelFn(sequelizeGlobal);
      db.global[modelName] = model;
      console.log(`✅ Modèle GLOBAL chargé: ${modelName}`);
    }
  } catch (error) {
    console.error(`❌ Erreur chargement modèle GLOBAL ${modelName}:`, error.message);
  }
});

// ========== CHARGER LES MODÈLES DE LA BASE LOCALE ==========
// ✅ AJOUTER 'ChatHistory' DANS LA LISTE
const localModels = ['Accident', 'Planning', 'Visite', 'User', 'Historique', 'Notification', 'NotificationIntelligente', 'CodeOTP', 'ChatHistory'];

localModels.forEach(modelName => {
  try {
    const modelPath = path.join(__dirname, `${modelName}.js`);
    if (fs.existsSync(modelPath)) {
      const modelFn = require(modelPath);
      const model = modelFn(sequelizeLocal);
      db.local[modelName] = model;
      console.log(`✅ Modèle LOCAL chargé: ${modelName}`);
    } else {
      console.log(`⚠️ Modèle LOCAL non trouvé: ${modelName}.js`);
    }
  } catch (error) {
    console.error(`❌ Erreur chargement modèle LOCAL ${modelName}:`, error.message);
  }
});

// ========== APPLIQUER LES ASSOCIATIONS (SANS CROSS-DATABASE JOIN) ==========
// Les associations cross-database ne sont pas supportées directement par Sequelize
// Nous devons donc les gérer manuellement dans les requêtes

Object.keys(db.global).forEach(modelName => {
  if (db.global[modelName].associate) {
    db.global[modelName].associate(db);
    console.log(`🔗 Associations GLOBAL appliquées: ${modelName}`);
  }
});

Object.keys(db.local).forEach(modelName => {
  if (db.local[modelName].associate) {
    // Pour les associations locales, on les garde
    db.local[modelName].associate(db);
    console.log(`🔗 Associations LOCAL appliquées: ${modelName}`);
  }
});

// ========== EXPORTER LES MODÈLES ==========
module.exports = {
  ...db.global,
  ...db.local,
  global: db.global,
  local: db.local,
  sequelizeGlobal,
  sequelizeLocal,
  Sequelize: require('sequelize')
};