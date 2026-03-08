// backend/models/Agent.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Agent = sequelize.define('Agent', {
  matricule_agent: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'matricule_agent'
  },
  nom: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'nom'
  },
  prenom: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'prenom'
  },
  code_agence: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'code_agence'
  },
  code_affectation: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'code_affectation'
  }
}, {
  tableName: 'agent',
  timestamps: false
});

module.exports = Agent;