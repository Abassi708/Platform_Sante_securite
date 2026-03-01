const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Historique = sequelize.define('Historique', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'id'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'user_id'
  },
  user_email: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'user_email'
  },
  user_role: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'user_role'
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'timestamp',
    defaultValue: DataTypes.NOW
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address'
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent'
  },
  success: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'success'
  }
}, {
  tableName: 'historique_connexions',
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
      user_id: userId,
      user_email: email,
      user_role: role,
      timestamp: new Date(),
      ip_address: ip,
      user_agent: userAgent,
      success: success
    });
    
    console.log(`✅ Connexion enregistrée: ${email} (${role}) - ${success ? 'Succès' : 'Échec'}`);
  } catch (error) {
    console.error('❌ Erreur enregistrement historique:', error);
  }
};

module.exports = Historique;