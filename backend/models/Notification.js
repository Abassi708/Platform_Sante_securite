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
    comment: 'Mot de passe hashé (ne jamais stocker en clair)'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  sent_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'ID de l\'administrateur qui a envoyé la notification'
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
      // Hasher le mot de passe avant de le sauvegarder
      if (notification.new_password) {
        const salt = await bcrypt.genSalt(10);
        notification.new_password = await bcrypt.hash(notification.new_password, salt);
      }
    }
  }
});

// Méthode pour vérifier un mot de passe (si nécessaire)
Notification.prototype.comparePassword = async function(plainPassword) {
  return await bcrypt.compare(plainPassword, this.new_password);
};

// Méthode pour créer une notification avec hashage
Notification.createNotification = async (data) => {
  try {
    // Le hashage sera fait automatiquement par le hook beforeCreate
    const notification = await Notification.create(data);
    console.log('✅ Notification créée pour:', data.user_email);
    return notification;
  } catch (error) {
    console.error('❌ Erreur création notification:', error);
    throw error;
  }
};

// Récupérer les notifications d'un utilisateur (sans exposer le mot de passe en clair)
Notification.getUserNotifications = async (userId) => {
  try {
    const notifications = await Notification.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      attributes: {
        exclude: ['new_password'] // Ne pas renvoyer le mot de passe hashé
      }
    });
    return notifications;
  } catch (error) {
    console.error('❌ Erreur récupération notifications:', error);
    throw error;
  }
};

// Récupérer UNE notification avec le mot de passe (uniquement pour l'affichage dans la modale)
Notification.getNotificationWithPassword = async (id, userId) => {
  try {
    const notification = await Notification.findOne({
      where: { 
        id: id,
        user_id: userId // Sécurité : vérifier que la notification appartient à l'utilisateur
      }
    });
    return notification;
  } catch (error) {
    console.error('❌ Erreur récupération notification:', error);
    throw error;
  }
};

module.exports = Notification;