// backend/models/ChatHistory.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ChatHistory = sequelize.define('ChatHistory', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    id_utilisateur: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'id_utilisateur'
    },
    matricule_agent: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'matricule_agent'
    },
    message_utilisateur: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'message_utilisateur'
    },
    reponse_bot: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'reponse_bot'
    },
    intention: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'intention'
    },
    entites_extraites: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'entites_extraites'
    },
    conversation_id: {
      type: DataTypes.STRING(36),
      allowNull: true,
      field: 'conversation_id'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'chat_history',
    timestamps: false
  });

  return ChatHistory;
};