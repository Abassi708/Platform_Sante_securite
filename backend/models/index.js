// backend/models/index.js
const sequelize = require('../config/database');
const Agent = require('./Agent');
const Planning = require('./Planning');
const Visite = require('./Visite');
const User = require('./User');
const Accident = require('./Accident');

// ========== ASSOCIATIONS POUR PLANNING ==========
Planning.belongsTo(Agent, {
  foreignKey: 'matricule_agent',
  targetKey: 'matricule_agent',
  as: 'planningAgent'  // ← Alias unique
});

Agent.hasMany(Planning, {
  foreignKey: 'matricule_agent',
  sourceKey: 'matricule_agent',
  as: 'agentPlannings'  // ← Alias unique
});

// ========== ASSOCIATIONS POUR VISITE ==========
Visite.belongsTo(Agent, {
  foreignKey: 'matricule_agent',
  targetKey: 'matricule_agent',
  as: 'visiteAgent'  // ← Alias unique
});

Agent.hasMany(Visite, {
  foreignKey: 'matricule_agent',
  sourceKey: 'matricule_agent',
  as: 'agentVisites'  // ← Alias unique
});

Visite.belongsTo(Planning, {
  foreignKey: 'id_planning',
  targetKey: 'id_planning',
  as: 'visitePlanning'  // ← Alias unique
});

Planning.hasMany(Visite, {
  foreignKey: 'id_planning',
  sourceKey: 'id_planning',
  as: 'planningVisites'  // ← Alias unique
});

// ========== ASSOCIATIONS POUR ACCIDENT ==========
Accident.belongsTo(Agent, {
  foreignKey: 'matricule_agent',
  targetKey: 'matricule_agent',
  as: 'accidentAgent'  // ← Alias unique
});

Agent.hasMany(Accident, {
  foreignKey: 'matricule_agent',
  sourceKey: 'matricule_agent',
  as: 'agentAccidents'  // ← Alias unique
});

// ========== ASSOCIATIONS POUR USER ==========
User.hasMany(Planning, {
  foreignKey: 'created_by',
  sourceKey: 'id_utilisateur',
  as: 'userPlannings'  // ← Alias unique
});

User.hasMany(Visite, {
  foreignKey: 'created_by',
  sourceKey: 'id_utilisateur',
  as: 'userVisites'  // ← Alias unique
});

module.exports = {
  sequelize,
  Agent,
  Planning,
  Visite,
  User,
  Accident
};