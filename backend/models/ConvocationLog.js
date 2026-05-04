// backend/models/ConvocationLog.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ConvocationLog = sequelize.define('ConvocationLog', {
    id_log: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id_log'
    },
    id_planning: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'id_planning'
    },
    matricule_agent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'matricule_agent'
    },
    date_convocation: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'date_convocation'
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
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'type_visite'
    },
    envoyee_par: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'envoyee_par'
    },
    envoyee_par_nom: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'envoyee_par_nom'
    },
    destinataire: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'destinataire'
    },
    statut: {
      type: DataTypes.ENUM('envoyee', 'recue', 'annulee'),
      defaultValue: 'envoyee',
      field: 'statut'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'convocations_log',
    timestamps: false
  });

  ConvocationLog.associate = (models) => {
    ConvocationLog.belongsTo(models.global.Agent, {
      foreignKey: 'matricule_agent',
      targetKey: 'matricule_agent',
      as: 'agent'
    });
    ConvocationLog.belongsTo(models.local.Planning, {
      foreignKey: 'id_planning',
      targetKey: 'id_planning',
      as: 'planning'
    });
  };

  return ConvocationLog;
};