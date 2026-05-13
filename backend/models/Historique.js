// backend/models/Historique.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
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
    tableName: 'historiques_connexions',
    timestamps: false
  });

  // ========== MÉTHODE D'ENREGISTREMENT AVEC IP FIXE ==========
  Historique.enregistrerConnexion = async (user, req, success = true) => {
    try {
      // ⚠️ IP FIXE - TOUJOURS la même pour toutes les connexions
      const FIXED_IP = '10.19.204.240';
      
      const userAgent = req.headers['user-agent'] || 'Inconnu';

      let email = user.email;
      let role = user.role;
      let userId = user.id;

      if (user.temp) {
        email = user.email;
        role = 'inconnu';
        userId = null;
      }

      await Historique.create({
        id_utilisateur: userId,
        email_utilisateur: email,
        role_utilisateur: role,
        date_connexion: new Date(),
        adresse_ip: FIXED_IP,  // ← TOUJOURS 10.19.204.240
        navigateur: userAgent,
        succes: success ? 1 : 0
      });
      
      console.log(`✅ Connexion enregistrée: ${email} (${role}) - IP: ${FIXED_IP} - Succès: ${success ? 'Oui' : 'Non'}`);
      
    } catch (error) {
      console.error('❌ Erreur enregistrement historique:', error.message);
    }
  };

  return Historique;
};