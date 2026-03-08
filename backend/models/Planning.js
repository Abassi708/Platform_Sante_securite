// backend/models/Planning.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Planning = sequelize.define('Planning', {
  id_planning: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_planning'
  },
  matricule_agent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'matricule_agent',
    references: {
      model: 'agent',
      key: 'matricule_agent'
    }
  },
  date_visite: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'date_visite'
  },
  heure_visite: {
    type: DataTypes.TIME,
    allowNull: false,
    field: 'heure_visite'
  },
  type_visite: {
    type: DataTypes.ENUM('Périodique', 'Reprise', 'Reclassement'),
    defaultValue: 'Périodique',
    field: 'type_visite'
  },
  statut: {
    type: DataTypes.ENUM('Programmé', 'Effectué', 'Annulé', 'Reporté'),
    defaultValue: 'Programmé',
    field: 'statut'
  },
  visite_effectuee: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'visite_effectuee'
  },
  reprogrammee: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'reprogrammee'
  },
  motif_reprogrammation: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'motif_reprogrammation'
  },
  visite_originale_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'visite_originale_id'
  },
  date_reprogrammee: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'date_reprogrammee'
  },
  priorite: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'priorite'
  },
  semaine: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'semaine'
  },
  annee: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'annee'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'planning',
  timestamps: false
});

module.exports = Planning;