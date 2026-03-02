// models/Notification.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Notification = sequelize.define('Notification', {
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
  email_utilisateur: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'email_utilisateur'
  },
  role_utilisateur: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'role_utilisateur'
  },
  matricule_utilisateur: {
    type: DataTypes.STRING(50),
    allowNull: true,
    field: 'matricule_utilisateur'
  },
  nouveau_motpasse: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'nouveau_motpasse',
    comment: 'Mot de passe hashé (sécurisé)'
  },
  mot_passe: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'mot_passe',
    comment: 'Mot de passe en clair (visible uniquement par le destinataire)'
  },
  raison: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'raison'
  },
  envoyer_par_email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: 'non',
    field: 'envoyer_par_email'
  },
  statut: {
    type: DataTypes.ENUM('en_attente', 'envoyé', 'echec', 'lu'),  // ← Exactement comme dans la base !
    defaultValue: 'en_attente',
    allowNull: true,
    field: 'statut'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'notifications',
  timestamps: false,
  hooks: {
    beforeCreate: async (notification) => {
      if (notification.nouveau_motpasse) {
        notification.mot_passe = notification.nouveau_motpasse;
        const salt = await bcrypt.genSalt(10);
        notification.nouveau_motpasse = await bcrypt.hash(notification.nouveau_motpasse, salt);
      }
    }
  }
});

module.exports = Notification;