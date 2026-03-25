// backend/models/NotificationIntelligente.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NotificationIntelligente = sequelize.define('NotificationIntelligente', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    type: {
      type: DataTypes.ENUM('URGENT', 'IMPORTANT', 'INFO', 'RAPPEL', 'SUGGESTION'),
      allowNull: false,
      field: 'type'
    },
    titre: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'titre'
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'message'
    },
    action_suggested: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'action_suggested'
    },
    priorite: {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      field: 'priorite'
    },
    id_utilisateur: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'id_utilisateur'
    },
    email_utilisateur: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'email_utilisateur'
    },
    role_utilisateur: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'role_utilisateur'
    },
    details: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'details'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    lu_le: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'lu_le'
    },
    statut: {
      type: DataTypes.ENUM('non_lu', 'lu', 'archive'),
      defaultValue: 'non_lu',
      field: 'statut'
    },
    source: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'source'
    }
  }, {
    tableName: 'notifications_intelligentes',
    timestamps: false
  });

  return NotificationIntelligente;
};