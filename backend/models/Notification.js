// models/Notification.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  user_email: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  user_role: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  user_matricule: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  new_password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Mot de passe hashé (sécurisé)'
  },
  plain_password: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Mot de passe en clair (visible uniquement par le destinataire)'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sent_by: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  sent_by_email: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'read'),
    defaultValue: 'sent'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'notifications',
  timestamps: false,
  hooks: {
    beforeCreate: async (notification) => {
      // Sauvegarder le mot de passe en clair
      if (notification.new_password) {
        notification.plain_password = notification.new_password;
        
        // Hasher pour la version sécurisée
        const salt = await bcrypt.genSalt(10);
        notification.new_password = await bcrypt.hash(notification.new_password, salt);
      }
    }
  }
});

module.exports = Notification;