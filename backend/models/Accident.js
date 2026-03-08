// models/Accident.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Agent = require('./Agent');

const Accident = sequelize.define('Accident', {
  id_accident: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id_accident'
  },
  numero_accident: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'numero_accident'
  },
  matricule_agent: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'matricule_agent',
    references: {
      model: 'agent',
      key: 'matricule_agent'
    }
  },
  date_accident: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'date_accident'
  },
  heure_accident: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'heure_accident'
  },
  lieu_accident: {
    type: DataTypes.STRING(150),
    allowNull: true,
    field: 'lieu_accident'
  },
  condition_accident: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'condition_accident'
  },
  endroit_blessures: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'endroit_blessures'
  },
  nature_blessures: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'nature_blessures'
  },
  facteurs_materiels: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'facteurs_materiels'
  },
  mode_survenue: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'mode_survenue'
  },
  temoin1: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'temoin1'
  },
  temoin2: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'temoin2'
  },
  pv_existe: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    field: 'pv_existe'
  },
  numero_pv: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'numero_pv'
  },
  date_pv: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'date_pv'
  },
  tiers_responsable: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    field: 'tiers_responsable'
  },
  nom_tiers: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'nom_tiers'
  },
  jour_arret: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'jour_arret'
  },
  statut: {
    type: DataTypes.ENUM('brouillon', 'declare'),
    defaultValue: 'brouillon',
    field: 'statut'
  },
  date_declaration_cnam: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: 'brouillon',
    field: 'date_declaration_cnam'
  },
  gravite: {
    type: DataTypes.ENUM('Faible', 'Moyenne', 'Élevée', 'Critique'),
    defaultValue: 'Faible',
    field: 'gravite'
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'created_by',
    references: {
      model: 'utilisateur',
      key: 'Id_utilisateur'
    }
  },
  updated_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'updated_by',
    references: {
      model: 'utilisateur',
      key: 'Id_utilisateur'
    }
  }
}, {
  tableName: 'accident',
  timestamps: false
});

// Associations
Accident.associate = (models) => {
  Accident.belongsTo(models.Agent, {
    foreignKey: 'matricule_agent',
    targetKey: 'matricule_agent'
  });
};

Accident.belongsTo(Agent, {
  foreignKey: 'matricule_agent',
  targetKey: 'matricule_agent'
});

module.exports = Accident;