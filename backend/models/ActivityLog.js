// backend/models/ActivityLog.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ActivityLog = sequelize.define('ActivityLog', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      comment: 'Identifiant unique'
    },
    id_utilisateur: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'id_utilisateur',
      comment: 'ID de l\'utilisateur qui a fait l\'action'
    },
    email_utilisateur: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'email_utilisateur',
      comment: 'Email de l\'utilisateur'
    },
    role_utilisateur: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'role_utilisateur',
      comment: 'Rôle de l\'utilisateur (admin, technicien, social, agent)'
    },
    type_action: {
      type: DataTypes.ENUM('CREATION', 'LECTURE', 'MODIFICATION', 'SUPPRESSION', 'CONNEXION', 'DECONNEXION', 'REINITIALISATION_MDP', 'CHANGEMENT_STATUT', 'REPROGRAMMATION', 'ANNULATION'),
      allowNull: false,
      field: 'type_action',
      comment: 'Type d\'action effectuée'
    },
    module: {
      type: DataTypes.ENUM('UTILISATEUR', 'AGENT', 'ACCIDENT', 'PLANNING', 'VISITE', 'NOTIFICATION', 'CHATBOT', 'RAPPORT', 'PARAMETRES'),
      allowNull: false,
      field: 'module',
      comment: 'Module concerné par l\'action'
    },
    id_cible: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'id_cible',
      comment: 'Identifiant de l\'élément ciblé'
    },
    identifiant_cible: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'identifiant_cible',
      comment: 'Nom/email/matricule de l\'élément ciblé'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'description',
      comment: 'Description détaillée de l\'action'
    },
    anciennes_valeurs: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'anciennes_valeurs',
      comment: 'Anciennes valeurs (avant modification/suppression)'
    },
    nouvelles_valeurs: {
      type: DataTypes.TEXT('long'),
      allowNull: true,
      field: 'nouvelles_valeurs',
      comment: 'Nouvelles valeurs (après création/modification)'
    },
    adresse_ip: {
      type: DataTypes.STRING(45),
      allowNull: false,
      field: 'adresse_ip',
      comment: 'Adresse IP de l\'utilisateur'
    },
    navigateur: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'navigateur',
      comment: 'Informations sur le navigateur'
    },
    methode_http: {
      type: DataTypes.STRING(10),
      allowNull: true,
      field: 'methode_http',
      comment: 'Méthode HTTP (GET, POST, PUT, DELETE)'
    },
    url: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'url',
      comment: 'URL de la requête'
    },
    statut: {
      type: DataTypes.ENUM('SUCCES', 'ECHEC', 'PARTIEL'),
      defaultValue: 'SUCCES',
      field: 'statut',
      comment: 'Statut de l\'action'
    },
    message_erreur: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'message_erreur',
      comment: 'Message d\'erreur en cas d\'échec'
    },
    duree_ms: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'duree_ms',
      comment: 'Durée d\'exécution en millisecondes'
    },
    date_creation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'date_creation',
      comment: 'Date et heure de l\'action'
    }
  }, {
    tableName: 'journal_audit',
    timestamps: false,
  });

  // Méthode pour enregistrer une action
  ActivityLog.enregistrer = async ({
    idUtilisateur = null,
    emailUtilisateur = null,
    roleUtilisateur = null,
    typeAction,
    module,
    idCible = null,
    identifiantCible = null,
    description,
    anciennesValeurs = null,
    nouvellesValeurs = null,
    requete = null,
    statut = 'SUCCES',
    messageErreur = null,
    dureeMs = null
  }) => {
    try {
      let adresseIp = '0.0.0.0';
      let navigateur = 'Inconnu';
      let methodeHttp = null;
      let url = null;

      if (requete) {
        adresseIp = requete.headers['x-forwarded-for'] || 
                    requete.socket.remoteAddress || 
                    '0.0.0.0';
        navigateur = requete.headers['user-agent'] || 'Inconnu';
        methodeHttp = requete.method;
        url = requete.originalUrl || requete.url;
      }

      const log = await ActivityLog.create({
        id_utilisateur: idUtilisateur,
        email_utilisateur: emailUtilisateur,
        role_utilisateur: roleUtilisateur,
        type_action: typeAction,
        module: module,
        id_cible: idCible,
        identifiant_cible: identifiantCible,
        description: description,
        anciennes_valeurs: anciennesValeurs ? JSON.stringify(anciennesValeurs) : null,
        nouvelles_valeurs: nouvellesValeurs ? JSON.stringify(nouvellesValeurs) : null,
        adresse_ip: adresseIp,
        navigateur: navigateur,
        methode_http: methodeHttp,
        url: url,
        statut: statut,
        message_erreur: messageErreur,
        duree_ms: dureeMs,
        date_creation: new Date()
      });

      console.log(`📝 [AUDIT] ${emailUtilisateur || 'SYSTEME'} - ${typeAction} - ${module} - ${description.substring(0, 50)}`);
      return log;
    } catch (erreur) {
      console.error('❌ Erreur enregistrement audit:', erreur.message);
      return null;
    }
  };

  return ActivityLog;
};