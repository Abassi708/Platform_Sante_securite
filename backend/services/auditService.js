// backend/services/auditService.js
const db = require('../models');
const ActivityLog = db.local.ActivityLog;

class AuditService {
  
  /**
   * Enregistre une action dans le journal d'audit
   */
  static async enregistrer({
    utilisateur = null,
    requete = null,
    typeAction,
    module,
    idCible = null,
    identifiantCible = null,
    description,
    anciennesValeurs = null,
    nouvellesValeurs = null,
    statut = 'SUCCES',
    erreur = null,
    dureeMs = null
  }) {
    return ActivityLog.enregistrer({
      idUtilisateur: utilisateur?.id,
      emailUtilisateur: utilisateur?.email,
      roleUtilisateur: utilisateur?.role,
      typeAction,
      module,
      idCible,
      identifiantCible,
      description,
      anciennesValeurs,
      nouvellesValeurs,
      requete,
      statut,
      messageErreur: erreur,
      dureeMs
    });
  }

  /**
   * Enregistre une création
   */
  static async creation({ utilisateur, requete, module, idCible, identifiantCible, description, nouvellesValeurs }) {
    return this.enregistrer({
      utilisateur, requete,
      typeAction: 'CREATION',
      module, idCible, identifiantCible,
      description, nouvellesValeurs
    });
  }

  /**
   * Enregistre une modification
   */
  static async modification({ utilisateur, requete, module, idCible, identifiantCible, description, anciennesValeurs, nouvellesValeurs }) {
    return this.enregistrer({
      utilisateur, requete,
      typeAction: 'MODIFICATION',
      module, idCible, identifiantCible,
      description, anciennesValeurs, nouvellesValeurs
    });
  }

  /**
   * Enregistre une suppression
   */
  static async suppression({ utilisateur, requete, module, idCible, identifiantCible, description, anciennesValeurs }) {
    return this.enregistrer({
      utilisateur, requete,
      typeAction: 'SUPPRESSION',
      module, idCible, identifiantCible,
      description, anciennesValeurs
    });
  }

  /**
   * Enregistre une connexion
   */
  static async connexion({ utilisateur, requete, statut = 'SUCCES', erreur = null }) {
    return this.enregistrer({
      utilisateur, requete,
      typeAction: 'CONNEXION',
      module: 'UTILISATEUR',
      identifiantCible: utilisateur?.email,
      description: `Connexion de l'utilisateur ${utilisateur?.email || 'inconnu'}`,
      statut,
      erreur
    });
  }

  /**
   * Enregistre une déconnexion
   */
  static async deconnexion({ utilisateur, requete }) {
    return this.enregistrer({
      utilisateur, requete,
      typeAction: 'DECONNEXION',
      module: 'UTILISATEUR',
      identifiantCible: utilisateur?.email,
      description: `Déconnexion de l'utilisateur ${utilisateur?.email}`
    });
  }

  /**
   * Enregistre une réinitialisation de mot de passe
   */
  static async reinitialisationMdp({ utilisateur, requete, utilisateurCible, nouvelleValeurs }) {
    return this.enregistrer({
      utilisateur, requete,
      typeAction: 'REINITIALISATION_MDP',
      module: 'UTILISATEUR',
      idCible: utilisateurCible?.id,
      identifiantCible: utilisateurCible?.email,
      description: `Réinitialisation du mot de passe pour ${utilisateurCible?.email} par ${utilisateur?.email}`,
      nouvellesValeurs
    });
  }
}

module.exports = AuditService;