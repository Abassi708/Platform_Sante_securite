// backend/models/Visite.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Visite = sequelize.define('Visite', {
  matricule_visite: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'matricule_visite'
  },
  date_visite: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'date_visite'
  },
  heure_visite: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'heure_visite'
  },
  type_visite: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'type_visite'
  },
  medecin: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'medecin'
  },
  observation: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'observation'
  },
  resultat: {
    type: DataTypes.ENUM('Apte', 'Apte avec réserves', 'Inapte temporaire', 'Inapte définitif'),
    allowNull: true,
    field: 'resultat'
  },
  id_planning: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'id_planning'
  },
  matricule_agent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'matricule_agent'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by'
  }
}, {
  tableName: 'visite',
  timestamps: false
});

module.exports = Visite;