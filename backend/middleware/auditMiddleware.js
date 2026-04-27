// backend/middleware/auditMiddleware.js
const db = require('../models');
const AuditService = require('../services/auditService');

const getModuleNom = (module) => {
  const noms = {
    'UTILISATEUR': 'utilisateur',
    'AGENT': 'agent',
    'ACCIDENT': 'accident',
    'PLANNING': 'planning',
    'VISITE': 'visite',
    'NOTIFICATION': 'notification',
    'CHATBOT': 'chatbot',
    'RAPPORT': 'rapport',
    'PARAMETRES': 'paramètre',
    'OTHER': 'élément'
  };
  return noms[module] || 'élément';
};

const auditMiddleware = async (req, res, next) => {
  // ========== 1. ROUTES À IGNORER ==========
  const routesExclues = [
    '/api/health',
    '/api/audit/logs',
    '/api/audit/stats',
    '/api/auth/admin/login',
    '/api/auth/technicien/login',
    '/api/auth/social/login',
    '/api/auth/agent/login',
    '/api/auth/logout',
    '/api/auth/me',
    '/api/otp/demander',
    '/api/otp/verifier',
    '/api/otp/renvoyer'
  ];
  
  if (routesExclues.includes(req.path)) {
    return next();
  }

  // ========== 2. VÉRIFIER SI UTILISATEUR AUTHENTIFIÉ ==========
  const utilisateur = req.user || null;
  
  // Cas particulier : Route d'inscription (même sans utilisateur, on enregistre)
  const isRegisterRoute = req.path === '/api/auth/register';
  
  // Si ce n'est pas une route d'inscription ET qu'il n'y a pas d'utilisateur, on ignore
  if (!isRegisterRoute && !utilisateur) {
    return next();
  }
  
  // Pour la route d'inscription, on utilise un utilisateur système
  const auditUtilisateur = isRegisterRoute && !utilisateur 
    ? { id: null, email: 'SYSTEME', role: 'system' }
    : utilisateur;

  const debut = Date.now();
  
  // ========== 3. IGNORER LES REQUÊTES GET SUR LES NOTIFICATIONS ==========
  const url = req.originalUrl || req.url;
  
  // Ignorer les consultations de notifications (GET)
  if (url.includes('/notifications') && req.method === 'GET') {
    return next();
  }
  
  // ========== 4. DÉTERMINER LE TYPE D'ACTION ==========
  let typeAction = null;
  
  // 🔧 CORRECTION: Détecter d'abord la reprogrammation
  if (url.includes('/reprogrammer') || url.includes('/reprogrammation')) {
    typeAction = 'REPROGRAMMATION';
  }
  // Détecter les notifications
  else if (url.includes('/notifications') && req.method === 'POST') {
    typeAction = 'ENVOI_NOTIFICATION';
  }
  // Détecter les autres actions
  else {
    switch (req.method) {
      case 'POST': typeAction = 'CREATION'; break;
      case 'PUT':
      case 'PATCH': typeAction = 'MODIFICATION'; break;
      case 'DELETE': typeAction = 'SUPPRESSION'; break;
      default: typeAction = null;
    }
  }
  
  if (!typeAction) {
    return next();
  }
  
  // ========== 5. DÉTERMINER LE MODULE ==========
  let module = null;
  
  if (url.includes('/users') || url.includes('/auth/register') || url.includes('/auth/users')) {
    module = 'UTILISATEUR';
  } else if (url.includes('/accidents')) {
    module = 'ACCIDENT';
  } else if (url.includes('/planning')) {
    module = 'PLANNING';
  } else if (url.includes('/visites')) {
    module = 'VISITE';
  } else if (url.includes('/agents')) {
    module = 'AGENT';
  } else if (url.includes('/notifications')) {
    module = 'NOTIFICATION';
  } else if (url.includes('/chatbot')) {
    module = 'CHATBOT';
  } else {
    return next();
  }
  
  // ========== 6. RÉCUPÉRER L'ID CIBLE ==========
  const idCible = req.params.id || null;
  let identifiantCible = req.body?.email || req.body?.user_id || null;
  let anciennesValeurs = null;
  const nouvellesValeurs = req.body;
  
  // ========== 7. RÉCUPÉRER LES ANCIENNES VALEURS (pour UPDATE/DELETE) ==========
  if ((typeAction === 'MODIFICATION' || typeAction === 'SUPPRESSION') && idCible) {
    try {
      switch (module) {
        case 'UTILISATEUR':
          const User = db.local.User;
          const userData = await User.findByPk(idCible);
          if (userData) {
            anciennesValeurs = {
              email: userData.Login,
              role: userData.Role,
              matricule: userData.matricule_agent
            };
            if (typeAction === 'SUPPRESSION') {
              identifiantCible = userData.Login;
            }
          }
          break;
          
        case 'ACCIDENT':
          const Accident = db.local.Accident;
          const accidentData = await Accident.findByPk(idCible);
          if (accidentData) {
            anciennesValeurs = {
              numero: accidentData.numero_accident,
              date: accidentData.date_accident,
              jours_arret: accidentData.jour_arret,
              statut: accidentData.statut
            };
            if (typeAction === 'SUPPRESSION') {
              identifiantCible = accidentData.numero_accident;
            }
          }
          break;
          
        case 'PLANNING':
          const Planning = db.local.Planning;
          const planningData = await Planning.findByPk(idCible);
          if (planningData) {
            anciennesValeurs = {
              date: planningData.date_visite,
              heure: planningData.heure_visite,
              type: planningData.type_visite,
              statut: planningData.statut
            };
            if (typeAction === 'SUPPRESSION') {
              identifiantCible = `${planningData.matricule_agent} - ${planningData.date_visite}`;
            }
          }
          break;
          
        case 'VISITE':
          const Visite = db.local.Visite;
          const visiteData = await Visite.findByPk(idCible);
          if (visiteData) {
            anciennesValeurs = {
              date: visiteData.date_visite,
              type: visiteData.type_visite,
              resultat: visiteData.resultat
            };
            if (typeAction === 'SUPPRESSION') {
              identifiantCible = `Visite #${visiteData.matricule_visite}`;
            }
          }
          break;
      }
    } catch (erreur) {
      console.error('Erreur récupération anciennes valeurs:', erreur.message);
    }
  }
  
  // ========== 8. INTERCEPTER LA RÉPONSE ==========
  const originalJson = res.json;
  let responseBody = null;
  
  res.json = function(body) {
    responseBody = body;
    return originalJson.call(this, body);
  };
  
  await next();
  
  const duree = Date.now() - debut;
  
  // ========== 9. DÉTERMINER LE STATUT ==========
  const statut = responseBody && responseBody.success === false ? 'ECHEC' : 'SUCCES';
  const messageErreur = statut === 'ECHEC' ? (responseBody?.message || 'Erreur inconnue') : null;
  
  // ========== 10. CONSTRUIRE LA DESCRIPTION ==========
  const nomUtilisateur = auditUtilisateur?.email || 'Système';
  let description = '';
  
  switch (typeAction) {
    case 'CREATION':
      description = `${nomUtilisateur} a créé ${getModuleNom(module)}`;
      if (identifiantCible) description += ` : ${identifiantCible}`;
      break;
    case 'MODIFICATION':
      description = `${nomUtilisateur} a modifié ${getModuleNom(module)}`;
      if (identifiantCible) description += ` : ${identifiantCible}`;
      else if (idCible) description += ` (ID: ${idCible})`;
      break;
    case 'SUPPRESSION':
      description = `${nomUtilisateur} a supprimé ${getModuleNom(module)}`;
      if (identifiantCible) {
        description += ` : ${identifiantCible}`;
      } else if (idCible) {
        description += ` (ID: ${idCible})`;
      }
      break;
    case 'ENVOI_NOTIFICATION':
      description = `${nomUtilisateur} a envoyé une notification`;
      if (identifiantCible) description += ` à l'utilisateur ID: ${identifiantCible}`;
      break;
    case 'REPROGRAMMATION':
      description = `${nomUtilisateur} a reprogrammé ${getModuleNom(module)}`;
      if (identifiantCible) description += ` : ${identifiantCible}`;
      else if (idCible) description += ` (ID: ${idCible})`;
      break;
    default:
      return;
  }
  
  // ========== 11. ENREGISTRER DANS L'AUDIT ==========
  await AuditService.enregistrer({
    utilisateur: auditUtilisateur,
    requete: req,
    typeAction,
    module,
    idCible,
    identifiantCible,
    description,
    anciennesValeurs: anciennesValeurs,
    nouvellesValeurs: (typeAction === 'CREATION' || typeAction === 'MODIFICATION' || typeAction === 'ENVOI_NOTIFICATION' || typeAction === 'REPROGRAMMATION') ? nouvellesValeurs : null,
    statut,
    erreur: messageErreur,
    dureeMs: duree
  });
  
  console.log(`✅ [AUDIT] ${typeAction} - ${module} par ${nomUtilisateur} (${statut})`);
};

module.exports = { auditMiddleware };