// models/Historique.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Historique = sequelize.define('Historique', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id'
  },
  id_utilisateur: {
    type: DataTypes.INTEGER,
    allowNull: true,  
    defaultValue: null,
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
  date_connexion: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'date_connexion',
    defaultValue: DataTypes.NOW
  },
  adresse_ip: {
    type: DataTypes.STRING(45),
    allowNull: false,
    field: 'adresse_ip'
  },
  navigateur: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'navigateur'
  },
  succes: {
    type: DataTypes.TINYINT(1),
    allowNull: true,
    defaultValue: 1,
    field: 'succes'
  }
}, {
  tableName: 'historiques_connexions',  // ← AVEC 's' !!!
  timestamps: false
});

// Méthode pour enregistrer une connexion
Historique.enregistrerConnexion = async (user, req, success = true) => {
  try {
    // Récupérer l'IP
    const ip = req.headers['x-forwarded-for'] || 
               req.socket.remoteAddress || 
               '127.0.0.1';
    
    // Récupérer le User Agent
    const userAgent = req.headers['user-agent'] || 'Inconnu';
    
    // Déterminer l'email et le rôle
    let email = user.email;
    let role = user.role;
    let userId = user.id;
    
    // Si c'est une tentative échouée (user = objet temporaire)
    if (user.temp) {
      email = user.email;
      role = 'inconnu';
      userId = 0;
    }
    
    await Historique.create({
      id_utilisateur: userId,
      email_utilisateur: email,
      role_utilisateur: role,
      date_connexion: new Date(),
      adresse_ip: ip,
      navigateur: userAgent,
      succes: success ? 1 : 0
    });
    
    console.log(`✅ Connexion enregistrée: ${email} (${role}) - ${success ? 'Succès' : 'Échec'}`);
  } catch (error) {
    console.error('❌ Erreur enregistrement historique:', error);
  }
};

module.exports = Historique;