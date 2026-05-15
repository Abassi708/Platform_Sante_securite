const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const db = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const planningService = require('../services/planningService');
const notificationService = require('../services/notificationIntelligenteService');
const convocationService = require('../services/convocationService');
const { sequelizeLocal, sequelizeGlobal } = require('../config/database');
const pdfConvocationService = require('../services/pdfConvocationService');
const autoReaffectationService = require('../services/autoReaffectationService');
const tracabiliteService = require('../services/tracabiliteVisiteService');  


const parseDetails = (item) => {
  if (!item) return item;
  const newItem = { ...item };
  
  if (newItem.details_action) {
    try {
      // Si c'est une chaîne, on la parse
      if (typeof newItem.details_action === 'string') {
        // Supprimer les guillemets extérieurs si présents
        let cleanStr = newItem.details_action;
        if (cleanStr.startsWith('"') && cleanStr.endsWith('"')) {
          cleanStr = cleanStr.slice(1, -1);
        }
        // Remplacer les guillemets échappés
        cleanStr = cleanStr.replace(/\\"/g, '"');
        newItem.details = JSON.parse(cleanStr);
      } else {
        newItem.details = newItem.details_action;
      }
    } catch(e) {
      console.error('Erreur parsing details:', e.message);
      newItem.details = { raw: newItem.details_action };
    }
  } else {
    newItem.details = {};
  }
  
  return newItem;
};

// ========== FONCTION POUR TROUVER LE MEILLEUR REMPLAÇANT ==========
async function trouverMeilleurRemplacant(date, heure, matriculeExclu) {
  const tousAgents = await Agent.findAll({
    where: {
      statut: 'actif',
      matricule_agent: { [Op.ne]: parseInt(matriculeExclu) }
    },
    raw: true
  });

  const agentsEligibles = [];
  const dateCible = new Date(date);

  for (const agent of tousAgents) {
    const aDejaVisite = await Planning.findOne({
      where: {
        matricule_agent: agent.matricule_agent,
        date_visite: date,
        statut: 'Programmé',
        visite_effectuee: false
      }
    });
    if (aDejaVisite) continue;

    let periodicite = agent.periodicite_jours || (agent.code_affectation === 3 ? 180 : 365);
    let eligible = true;

    if (agent.date_derniere_visite) {
      const dateDerniere = new Date(agent.date_derniere_visite);
      const dateProchainePermise = new Date(dateDerniere);
      dateProchainePermise.setDate(dateDerniere.getDate() + periodicite);
      if (dateCible < dateProchainePermise) eligible = false;
    }
    
    if (agent.date_fin_inaptitude) {
      const dateFin = new Date(agent.date_fin_inaptitude);
      if (dateCible <= dateFin) eligible = false;
    }

    if (!eligible) continue;

    let priorite = 0;
    if (!agent.date_derniere_visite) priorite += 10000;
    if (agent.code_affectation === 3) priorite += 500;

    agentsEligibles.push({ ...agent, priorite });
  }

  agentsEligibles.sort((a, b) => b.priorite - a.priorite);
  return agentsEligibles.length > 0 ? agentsEligibles[0] : null;
}

// ========== FONCTION DE VÉRIFICATION COMPLÈTE DES CRÉNEAUX ==========
async function verifierDisponibiliteCreneauComplete(date, heure, matriculeAgent = null, idExclu = null) {
  const planning = await Planning.findOne({
    where: {
      date_visite: date,
      heure_visite: heure,
      id_planning: { [Op.ne]: idExclu || 0 }
    }
  });

  if (!planning) {
    return { disponible: true, message: '✅ Créneau disponible', raison: null };
  }

  if (planning.creneau_bloque === true) {
    return { 
      disponible: false, 
      message: `🔒 Créneau BLOQUÉ`,
      raison: 'BLOQUE'
    };
  }

  if (planning.visite_effectuee === true) {
    return { 
      disponible: false, 
      message: `✅ Visite déjà EFFECTUÉE`,
      raison: 'EFFECTUE'
    };
  }

  if (planning.statut === 'Annulé') {
    return { 
      disponible: false, 
      message: `❌ Visite ANNULÉE`,
      raison: 'ANNULE'
    };
  }

  if (planning.statut === 'Reporté') {
    return { 
      disponible: false, 
      message: `⚠️ Visite REPORTÉE`,
      raison: 'REPORTE'
    };
  }

  if (matriculeAgent) {
    const agentOccupe = await Planning.findOne({
      where: {
        matricule_agent: matriculeAgent,
        date_visite: date,
        statut: 'Programmé',
        visite_effectuee: false,
        id_planning: { [Op.ne]: idExclu || 0 }
      }
    });

    if (agentOccupe) {
      return { 
        disponible: false, 
        message: `⚠️ Agent déjà occupé ce jour`,
        raison: 'AGENT_OCCUPE'
      };
    }
  }

  if (planning.statut === 'Programmé' && planning.visite_effectuee === false) {
    return { 
      disponible: false, 
      message: `📅 Créneau déjà PROGRAMMÉ`,
      raison: 'OCCUPE'
    };
  }

  return { disponible: true, message: '✅ Créneau disponible', raison: null };
}

// Récupérer les modèles
const Planning = db.local.Planning;
const Visite = db.local.Visite;
const Agent = db.global.Agent;
const User = db.local.User;


// ========== UTILITAIRES ==========
function getNumeroSemaine(date) {
  return moment(date).isoWeek();
}

function normaliserCodeAffectation(codeAffectation) {
  if (codeAffectation === 3) return 3;
  return 1;
}

const TYPES_ANNULABLES = ['Reprise', 'Reclassement', 'Embauche'];

function getActionsAutorisees(typeVisite, statut) {
  if (statut !== 'Programmé') return [];
  const base = ['effectuer', 'reprogrammer'];
  if (TYPES_ANNULABLES.includes(typeVisite)) {
    base.push('annuler');
  }
  return base;
}

// ========== FONCTIONS HELPER (DÉFINIES AVANT LEUR UTILISATION) ==========
// ========== FONCTION: Trouver un remplaçant (VERSION ULTRA-SIMPLE QUI FONCTIONNE) ==========
async function trouverRemplacantPrioritaire(dateVisite, heureVisite, matriculeExclu, typeVisite) {
  try {
    console.log('\n🔍 RECHERCHE D\'UN REMPLAÇANT');
    console.log(`   Date: ${dateVisite}, Heure: ${heureVisite.substring(0,5)}`);
    console.log(`   Agent exclu: ${matriculeExclu}`);
    
    // 1. Récupérer TOUS les agents actifs SAUF l'agent indisponible
    const [agents] = await sequelizeGlobal.query(`
      SELECT matricule_agent, nom, prenom, code_affectation, code_agence,
             date_derniere_visite, periodicite_jours
      FROM agent 
      WHERE statut = 'actif' 
      AND matricule_agent != ?
      ORDER BY date_derniere_visite ASC NULLS FIRST
    `, { replacements: [matriculeExclu] });
    
    if (!agents || agents.length === 0) {
      console.log('❌ Aucun autre agent actif trouvé');
      return null;
    }
    
    console.log(`📊 ${agents.length} autres agents actifs`);
    
    // 2. Récupérer les agents déjà programmés ce jour
    const planningsDuJour = await Planning.findAll({
      where: {
        date_visite: dateVisite,
        statut: 'Programmé',
        visite_effectuee: false
      },
      attributes: ['matricule_agent']
    });
    const matriculesProgrammes = new Set(planningsDuJour.map(p => p.matricule_agent));
    
    console.log(`   ${matriculesProgrammes.size} agents déjà programmés ce jour`);
    
    // 3. Parcourir les agents et prendre le premier disponible
    let remplacantTrouve = null;
    
    for (const agent of agents) {
      // Vérifier si l'agent n'est PAS déjà programmé ce jour
      if (!matriculesProgrammes.has(agent.matricule_agent)) {
        remplacantTrouve = agent;
        console.log(`\n✅ Remplaçant trouvé: ${agent.nom} ${agent.prenom} (Matricule: ${agent.matricule_agent})`);
        console.log(`   Agence: ${agent.code_agence}`);
        console.log(`   Poste: ${agent.code_affectation === 3 ? 'Chauffeur' : 'Contrôleur'}`);
        console.log(`   Dernière visite: ${agent.date_derniere_visite || 'Jamais'}`);
        break;
      } else {
        console.log(`   ❌ ${agent.nom} ${agent.prenom}: déjà programmé ce jour`);
      }
    }
    
    if (!remplacantTrouve) {
      console.log('\n❌ Aucun remplaçant trouvé - tous les agents sont déjà programmés ce jour');
    }
    
    return remplacantTrouve;
    
  } catch (error) {
    console.error('❌ Erreur recherche remplaçant:', error);
    return null;
  }
}

// FONCTION: Trouver le prochain créneau disponible
async function trouverProchainCreneauDisponible(dateDepart, matriculeAgent, typeVisite) {
  const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
  const dateDebut = new Date(dateDepart);
  dateDebut.setDate(dateDebut.getDate() + 1);
  
  console.log(`\n🔍 Recherche prochain créneau pour agent ${matriculeAgent} à partir du ${dateDebut.toISOString().split('T')[0]}`);
  
  for (let i = 0; i <= 30; i++) {
    const dateTest = new Date(dateDebut);
    dateTest.setDate(dateDebut.getDate() + i);
    
    const estOuvre = await planningService.estJourOuvre(dateTest);
    if (!estOuvre) continue;
    
    const dateStr = dateTest.toISOString().split('T')[0];
    
    const agentDejaOccupe = await Planning.findOne({
      where: {
        matricule_agent: matriculeAgent,
        date_visite: dateStr,
        statut: 'Programmé',
        visite_effectuee: false
      }
    });
    
    if (agentDejaOccupe) continue;
    
    for (const heure of creneaux) {
      const creneauOccupe = await Planning.findOne({
        where: {
          date_visite: dateStr,
          heure_visite: heure,
          statut: 'Programmé',
          visite_effectuee: false
        }
      });
      
      if (!creneauOccupe) {
        console.log(`   ✅ Créneau trouvé: ${dateStr} à ${heure.substring(0,5)}`);
        return { date: dateStr, heure: heure };
      }
    }
  }
  
  console.log(`   ❌ Aucun créneau trouvé dans les 30 jours`);
  return null;
}
// ========== ROUTE DEBUG: Vérifier les remplaçants potentiels ==========
router.get('/debug/remplacants/:date/:heure/:matricule', protect, async (req, res) => {
  try {
    const { date, heure, matricule } = req.params;
    
    console.log('\n🔍 DEBUG - Recherche remplaçants potentiels');
    console.log(`   Date: ${date}, Heure: ${heure}, Agent exclu: ${matricule}`);
    
    // Récupérer l'agent original
    const agentOriginal = await Agent.findOne({
      where: { matricule_agent: matricule },
      attributes: ['matricule_agent', 'code_agence', 'code_affectation', 'nom', 'prenom']
    });
    
    if (!agentOriginal) {
      return res.json({ success: false, message: 'Agent original non trouvé' });
    }
    
    // Récupérer tous les agents actifs sauf l'exclu
    const [agents] = await sequelizeGlobal.query(`
      SELECT matricule_agent, nom, prenom, code_affectation, code_agence,
             date_derniere_visite, periodicite_jours
      FROM agent 
      WHERE statut = 'actif' 
      AND matricule_agent != ?
    `, { replacements: [matricule] });
    
    // Récupérer les plannings du jour
    const planningsDuJour = await Planning.findAll({
      where: {
        date_visite: date,
        statut: 'Programmé',
        visite_effectuee: false
      },
      attributes: ['matricule_agent']
    });
    const matriculesProgrammes = new Set(planningsDuJour.map(p => p.matricule_agent));
    
    const resultats = agents.map(agent => {
      const memeAgence = agent.code_agence === agentOriginal.code_agence;
      const memeAffectation = agent.code_affectation === agentOriginal.code_affectation;
      const dejaProgramme = matriculesProgrammes.has(agent.matricule_agent);
      
      return {
        agent: `${agent.nom} ${agent.prenom}`,
        matricule: agent.matricule_agent,
        agence: agent.code_agence,
        affectation: agent.code_affectation === 3 ? 'Chauffeur' : 'Contrôleur',
        derniere_visite: agent.date_derniere_visite || 'Jamais',
        meme_agence: memeAgence,
        meme_affectation: memeAffectation,
        deja_programme: dejaProgramme,
        eligible: memeAgence && memeAffectation && !dejaProgramme
      };
    });
    
    res.json({
      success: true,
      agent_original: {
        nom: `${agentOriginal.nom} ${agentOriginal.prenom}`,
        matricule: agentOriginal.matricule_agent,
        agence: agentOriginal.code_agence,
        affectation: agentOriginal.code_affectation === 3 ? 'Chauffeur' : 'Contrôleur'
      },
      agents: resultats,
      stats: {
        total: resultats.length,
        eligibles: resultats.filter(r => r.eligible).length,
        meme_agence: resultats.filter(r => r.meme_agence).length,
        meme_affectation: resultats.filter(r => r.meme_affectation).length,
        deja_programmes: resultats.filter(r => r.deja_programme).length
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== VÉRIFIER SI UNE VISITE A DES ACTIONS ==========
router.get('/visites/:id/has-actions', protect, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔍🔍🔍 Route has-actions - ID reçu:', id);
    
    const visite = await Visite.findByPk(id);
    if (!visite) {
      console.log('❌ Visite non trouvée');
      return res.json({ success: true, hasActions: false });
    }
    
    console.log('✅ Visite trouvée - id_planning:', visite.id_planning, 'type_action:', visite.type_action);
    
    const actions = await Visite.findOne({
      where: {
        [Op.or]: [
          { id_planning: visite.id_planning },
          { visite_originale_id: visite.id_planning }
        ],
        type_action: { [Op.in]: ['EFFECTUEE', 'REPROGRAMMEE', 'ANNULEE'] }
      }
    });
    
    console.log('🔍 Actions trouvées:', actions ? 'OUI' : 'NON');
    res.json({ success: true, hasActions: actions !== null });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== HISTORIQUE PLANNING ========== 

// backend/routes/visiteRoutes.js

router.get('/historique/planning', protect, async (req, res) => {
  try {
    const { matricule } = req.query;
    const { sequelizeLocal, sequelizeGlobal } = require('../config/database');
    
    // ✅ UNIQUEMENT les actions des visites AUTO (source_originale = 'auto')
    let sql = `
      SELECT * FROM visite 
      WHERE source_originale = 'auto'
      ORDER BY created_at DESC 
      LIMIT 500
    `;
    
    if (matricule) {
      sql = `
        SELECT * FROM visite 
        WHERE source_originale = 'auto' 
        AND matricule_agent = ${parseInt(matricule)} 
        ORDER BY created_at DESC 
        LIMIT 500
      `;
    }
    
    const [historique] = await sequelizeLocal.query(sql);
    
    // Parser details_action
    const result = historique.map(item => {
      let details = {};
      try {
        if (item.details_action) {
          let str = item.details_action;
          if (str.startsWith('"') && str.endsWith('"')) str = str.slice(1, -1);
          str = str.replace(/\\"/g, '"');
          details = JSON.parse(str);
        }
      } catch(e) { details = {}; }
      return { ...item, details };
    });
    
    // Récupérer les agents
    const matricules = [...new Set(result.map(v => v.matricule_agent))];
    if (matricules.length) {
      const [agents] = await sequelizeGlobal.query(`SELECT matricule_agent, nom, prenom, code_agence FROM agent WHERE matricule_agent IN (${matricules.join(',')})`);
      const agentsMap = new Map(agents.map(a => [a.matricule_agent, a]));
      const finalResult = result.map(v => ({ ...v, visiteAgent: agentsMap.get(v.matricule_agent) }));
      res.json({ success: true, historique: finalResult });
    } else {
      res.json({ success: true, historique: result });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== HISTORIQUE FORMULAIRE ==========
// backend/routes/visiteRoutes.js

router.get('/historique/formulaire', protect, async (req, res) => {
  try {
    const { matricule } = req.query;
    const { sequelizeLocal, sequelizeGlobal } = require('../config/database');
    
    // ✅ UNIQUEMENT les actions des visites MANUELLES (source_originale = 'manuel')
    let sql = `
      SELECT * FROM visite 
      WHERE source_originale = 'manuel'
      ORDER BY created_at DESC 
      LIMIT 500
    `;
    
    if (matricule) {
      sql = `
        SELECT * FROM visite 
        WHERE source_originale = 'manuel' 
        AND matricule_agent = ${parseInt(matricule)} 
        ORDER BY created_at DESC 
        LIMIT 500
      `;
    }
    
    const [historique] = await sequelizeLocal.query(sql);
    
    // Parser details_action
    const result = historique.map(item => {
      let details = {};
      try {
        if (item.details_action) {
          let str = item.details_action;
          if (str.startsWith('"') && str.endsWith('"')) str = str.slice(1, -1);
          str = str.replace(/\\"/g, '"');
          details = JSON.parse(str);
        }
      } catch(e) { details = {}; }
      return { ...item, details };
    });
    
    // Récupérer les agents
    const matricules = [...new Set(result.map(v => v.matricule_agent))];
    if (matricules.length) {
      const [agents] = await sequelizeGlobal.query(`SELECT matricule_agent, nom, prenom, code_agence FROM agent WHERE matricule_agent IN (${matricules.join(',')})`);
      const agentsMap = new Map(agents.map(a => [a.matricule_agent, a]));
      const finalResult = result.map(v => ({ ...v, visiteAgent: agentsMap.get(v.matricule_agent) }));
      res.json({ success: true, historique: finalResult });
    } else {
      res.json({ success: true, historique: result });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== AGENTS ==========
router.get('/agents', protect, async (req, res) => {
  try {
    const [agents] = await sequelizeGlobal.query(`
      SELECT 
        matricule_agent, nom, prenom, code_agence, code_affectation,
        statut, date_derniere_visite, date_fin_inaptitude, date_prochaine_inaptitude,
        date_naissance, direction, periodicite_jours, date_debut_inaptitude, created_at,
        date_debut_reclassement,
        date_fin_reclassement,
        date_prochaine_reclassement
      FROM agent ORDER BY nom ASC
    `);
    
    const agentsNormalises = agents.map(agent => ({
      ...agent,
      code_affectation: normaliserCodeAffectation(agent.code_affectation)
    }));
    
    res.json({ success: true, agents: agentsNormalises });
  } catch (error) {
    console.error('❌ Erreur agents:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ========== CRÉER UNE VISITE MANUELLEMENT (FORMULAIRE) ==========

router.post('/visites', protect, async (req, res) => {
  try {
    const visiteData = req.body;
    
    console.log('📦 Données reçues pour création visite:', visiteData);
    
    if (!visiteData.matricule_agent) {
      return res.status(400).json({ success: false, message: 'Matricule agent requis' });
    }
    if (!visiteData.date_visite) {
      return res.status(400).json({ success: false, message: 'Date de visite requise' });
    }
    
    const agent = await Agent.findOne({ where: { matricule_agent: visiteData.matricule_agent } });
    if (!agent) {
      return res.status(404).json({ success: false, message: `Agent non trouvé avec le matricule ${visiteData.matricule_agent}` });
    }
    
    const dateVisite = visiteData.date_visite;
    const heureVisite = visiteData.heure_visite || '09:00:00';
    const dateObj = new Date(dateVisite);
    const estOuvre = await planningService.estJourOuvre(dateObj);
    
    if (!estOuvre) {
      return res.status(400).json({ 
        success: false, 
        message: `La date du ${dateVisite} n'est pas un jour ouvré.`,
        code: 'JOUR_NON_OUVRE'
      });
    }
    
    // Vérifications des conflits...
    const creneauOccupe = await Planning.findOne({
      where: { date_visite: dateVisite, heure_visite: heureVisite, statut: 'Programmé' }
    });
    
    if (creneauOccupe) {
      return res.status(409).json({ 
        success: false, 
        message: `❌ Le créneau du ${dateVisite} à ${heureVisite.substring(0,5)} est déjà occupé.`,
        code: 'CRENEAU_OCCUPE'
      });
    }
    
    const agentDejaOccupe = await Planning.findOne({
      where: { matricule_agent: visiteData.matricule_agent, date_visite: dateVisite, statut: 'Programmé' }
    });
    
    if (agentDejaOccupe) {
      return res.status(409).json({ 
        success: false, 
        message: `⚠️ L'agent ${agent.nom} ${agent.prenom} a déjà une visite le ${dateVisite}.`,
        code: 'AGENT_DEJA_OCCUPE'
      });
    }
    
    const typeVisite = visiteData.type_visite || 'Périodique';
    
    // ✅ CRÉATION DU PLANNING
    const planning = await Planning.create({
      matricule_agent: visiteData.matricule_agent,
      date_visite: dateVisite,
      heure_visite: heureVisite,
      type_visite: typeVisite,
      statut: 'Programmé',
      priorite: typeVisite === 'Périodique' ? 100 : 200,
      semaine: getNumeroSemaine(new Date(dateVisite)),
      annee: new Date(dateVisite).getFullYear(),
      created_by: req.user.id,
      convocation_envoyee: false,
      source_planification: 'manuel',
      source_originale: 'manuel'
    });

    // ✅ CRÉATION DE L'HISTORIQUE - CORRECT
    await Visite.create({
      matricule_agent: visiteData.matricule_agent,
      date_visite: dateVisite,
      heure_visite: heureVisite,
      type_visite: typeVisite,
      medecin: visiteData.medecin || 'Dr. Mahmoud Khelifi',
      observation: visiteData.observation || '',
      resultat: null,
      id_planning: planning.id_planning,
      type_action: 'PROGRAMMATION',
      ancien_statut: null,
      nouveau_statut: 'Programmé',
      motif_action: `Saisie manuelle - ${typeVisite}`,
      details_action: JSON.stringify({ 
        source: 'manuel', 
        type_visite: typeVisite, 
        motif: visiteData.motif || null 
      }),
      source: 'FORMULAIRE',
      created_by: req.user.id,
      source_originale: 'manuel'
    });
    
    if (typeVisite === 'Périodique') {
      await Agent.update(
        { date_derniere_visite: dateVisite },
        { where: { matricule_agent: visiteData.matricule_agent } }
      );
    }
    
    console.log(`✅ Visite MANUELLE créée pour agent #${visiteData.matricule_agent}`);
    
    res.status(201).json({
      success: true,
      message: `Visite ${typeVisite} programmée avec succès`,
      planning
    });
  } catch (error) {
    console.error('❌ Erreur création visite manuelle:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});



// ========== MODIFIER UNE VISITE MANUELLE EXISTANTE ==========
router.put('/visites/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { date_visite, heure_visite, type_visite, medecin, observation } = req.body;

    // 1. Trouver la visite existante (on ne la modifie PAS)
    const visiteOriginale = await Visite.findByPk(id);
    if (!visiteOriginale) {
      return res.status(404).json({ success: false, message: 'Visite non trouvée' });
    }

    if (visiteOriginale.source !== 'FORMULAIRE' && visiteOriginale.source_originale !== 'manuel') {
      return res.status(403).json({ 
        success: false, 
        message: 'Seules les visites saisies manuellement peuvent être modifiées' 
      });
    }

    // Sauvegarder les anciennes valeurs
    const ancienneDate = visiteOriginale.date_visite;
    const ancienneHeure = visiteOriginale.heure_visite;
    const ancienType = visiteOriginale.type_visite;
    const ancienMedecin = visiteOriginale.medecin;
    const ancienneObservation = visiteOriginale.observation;
    
    const nouvelleDate = date_visite || visiteOriginale.date_visite;
    const nouvelleHeure = heure_visite || visiteOriginale.heure_visite;
    const nouveauType = type_visite || visiteOriginale.type_visite;
    const nouveauMedecin = medecin || visiteOriginale.medecin;
    const nouvelleObservation = observation || visiteOriginale.observation;

    // ✅ 2. CRÉER UNE NOUVELLE LIGNE D'HISTORIQUE (type_action: 'MODIFICATION')
    // Ceci garde la trace de l'ancienne version
    await Visite.create({
      matricule_agent: visiteOriginale.matricule_agent,
      date_visite: nouvelleDate,
      heure_visite: nouvelleHeure,
      type_visite: nouveauType,
      medecin: nouveauMedecin,
      observation: nouvelleObservation,
      id_planning: visiteOriginale.id_planning,
      type_action: 'MODIFICATION',  // ← Trace de modification
      ancien_statut: null,
      nouveau_statut: 'Programmé',
      motif_action: `Modification - Ancienne: ${ancienneDate} ${ancienneHeure?.substring(0,5)} (${ancienType}) → Nouvelle: ${nouvelleDate} ${nouvelleHeure?.substring(0,5)} (${nouveauType})`,
      details_action: JSON.stringify({
        ancienne_date: ancienneDate,
        ancienne_heure: ancienneHeure,
        ancien_type: ancienType,
        ancien_medecin: ancienMedecin,
        ancienne_observation: ancienneObservation,
        nouvelle_date: nouvelleDate,
        nouvelle_heure: nouvelleHeure,
        nouveau_type: nouveauType,
        nouveau_medecin: nouveauMedecin,
        nouvelle_observation: nouvelleObservation,
        date_modification: new Date().toISOString()
      }),
      source: 'FORMULAIRE',
      created_by: req.user.id,
      source_originale: 'manuel'
    });

    // ✅ 3. METTRE À JOUR la visite originale avec les nouvelles valeurs
    await visiteOriginale.update({
      date_visite: nouvelleDate,
      heure_visite: nouvelleHeure,
      type_visite: nouveauType,
      medecin: nouveauMedecin,
      observation: nouvelleObservation
    });

    // 4. Mettre à jour le planning associé
    if (visiteOriginale.id_planning) {
      const planning = await Planning.findByPk(visiteOriginale.id_planning);
      if (planning) {
        const nouvelleSemaine = planningService.getNumeroSemaine(new Date(nouvelleDate));
        const nouvelleAnnee = new Date(nouvelleDate).getFullYear();
        
        await planning.update({
          date_visite: nouvelleDate,
          heure_visite: nouvelleHeure,
          type_visite: nouveauType,
          semaine: nouvelleSemaine,
          annee: nouvelleAnnee
        });
      }
    }

    console.log(`✅ Visite #${id} modifiée - Historique conservé`);

    res.json({ 
      success: true, 
      message: 'Visite modifiée avec succès',
      visite: visiteOriginale
    });
    
  } catch (error) {
    console.error('❌ Erreur modification visite:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// ========== RÉCUPÉRER TOUTES LES VISITES MANUELLES ==========
router.get('/visites', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type, resultat, dateDebut, dateFin, agentId, onlyManual = 'true' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    
    if (onlyManual === 'true') {
      whereClause.source_originale = 'manuel';
    }
    
    if (type && type !== 'all') whereClause.type_visite = type;
    if (resultat && resultat !== 'all') whereClause.resultat = resultat;
    if (agentId && agentId !== 'all' && agentId !== '') {
      whereClause.matricule_agent = agentId;
    }
    if (dateDebut && dateFin) {
      whereClause.date_visite = { [Op.between]: [dateDebut, dateFin] };
    }
    
        const { count, rows } = await Visite.findAndCountAll({
      where: whereClause,
      order: [['date_visite', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      raw: true
    });
    
    // ✅ Pour chaque visite, récupérer la dernière action associée
    const visitesAvecAction = await Promise.all(rows.map(async (visite) => {
      // Chercher si une action EFFECTUEE existe pour ce planning
      if (visite.id_planning) {
        const actionEffectuee = await Visite.findOne({
          where: {
            id_planning: visite.id_planning,
            type_action: 'EFFECTUEE'
          },
          attributes: ['type_action', 'resultat', 'medecin', 'observation', 'created_at'],
          order: [['created_at', 'DESC']],
          raw: true
        });
        
        if (actionEffectuee) {
          return {
            ...visite,
            type_action: actionEffectuee.type_action,
            resultat: actionEffectuee.resultat,
            medecin: actionEffectuee.medecin,
            observation: actionEffectuee.observation,
            date_action: actionEffectuee.created_at
          };
        }
      }
      return visite;
    }));

    
    // ✅ Récupérer le nombre de modifications pour chaque visite
    const matriculesVisites = rows.map(v => v.matricule_visite);
    const modificationsCount = await Visite.findAll({
      where: {
        type_action: 'MODIFICATION',
        visite_originale_id: { [Op.in]: matriculesVisites }
      },
      attributes: ['visite_originale_id', [Visite.sequelize.fn('COUNT', '*'), 'count']],
      group: ['visite_originale_id'],
      raw: true
    });
    
    const modifMap = new Map();
    modificationsCount.forEach(m => {
      modifMap.set(m.visite_originale_id, parseInt(m.count));
    });
    
    // Enrichir les visites avec le compteur
    const visitesEnrichies = rows.map(v => ({
      ...v,
      modifications_count: modifMap.get(v.matricule_visite) || 0
    }));
    
    // Récupérer les agents
    const matricules = [...new Set(visitesEnrichies.map(v => v.matricule_agent))];
    let agentsMap = new Map();
    
    if (matricules.length > 0) {
      const agents = await Agent.findAll({
        where: { matricule_agent: { [Op.in]: matricules } },
        attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence'],
        raw: true
      });
      agents.forEach(agent => agentsMap.set(agent.matricule_agent, agent));
    }
    
    const resultatsFinaux = visitesEnrichies.map(v => ({
      ...v,
      visiteAgent: agentsMap.get(v.matricule_agent) || null
    }));
    
    res.json({
      success: true,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      visites: resultatsFinaux
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération visites:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== GÉNÉRATION PDF ==========
router.get('/planning/:id/pdf', protect, async (req, res) => {
  console.log('📄 Route PDF appelée, id:', req.params.id);
  try {
    const { id } = req.params;
    
    const planning = await Planning.findByPk(id, { raw: true });
    if (!planning) {
      return res.status(404).json({ success: false, message: 'Planning non trouvé' });
    }
    
    const agent = await Agent.findOne({
      where: { matricule_agent: planning.matricule_agent },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      raw: true
    });
    
    const planningWithAgent = { ...planning, planningAgent: agent };
    const pdfBuffer = await pdfConvocationService.genererConvocationPDF([planningWithAgent]);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=convocation_${planning.id_planning}.pdf`);
    res.send(pdfBuffer);
    
  } catch (error) {
    console.error('❌ Erreur génération PDF:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// ========== RÉCUPÉRER LE PLANNING D'UNE SEMAINE AVEC HISTORIQUE ==========
router.get('/planning/:semaine/:annee', protect, async (req, res) => {
  try {
    let { semaine, annee } = req.params;
    
    semaine = parseInt(semaine);
    annee = parseInt(annee);
    
    if (isNaN(semaine) || isNaN(annee)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Paramètres de semaine et année invalides' 
      });
    }
    
    if (semaine < 1 || semaine > 53) {
      return res.status(400).json({ 
        success: false, 
        message: 'La semaine doit être comprise entre 1 et 53' 
      });
    }
    
    const planning = await Planning.findAll({
      where: { semaine: semaine, annee: annee },
      order: [['date_visite', 'ASC'], ['heure_visite', 'ASC']],
      raw: true
    });

    if (planning.length === 0) {
      return res.json({ success: true, planning: [] });
    }

    const matricules = [...new Set(planning.map(p => p.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation', 'date_derniere_visite', 'periodicite_jours'],
      raw: true
    });
    const agentsMap = new Map();
    agents.forEach(agent => agentsMap.set(agent.matricule_agent, agent));

    // Fonction pour formater la date
    const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    };

    const planningEnrichi = await Promise.all(planning.map(async (p) => {
      const historique = await Visite.findAll({
        where: { 
          [Op.or]: [
            { id_planning: p.id_planning },
            { visite_originale_id: p.id_planning }
          ]
        },
        order: [['created_at', 'DESC']],
        raw: true
      });
      
      // ✅ AJOUT : Récupérer les infos de suppression de visite périodique
      let infoSuppression = null;
      
      if (p.type_visite === 'Reprise' || p.type_visite === 'Reclassement') {
        // Chercher dans l'historique si une visite périodique a été supprimée pour cet agent
        const suppressionPeriodique = await Visite.findOne({
          where: {
            matricule_agent: p.matricule_agent,
            type_visite: 'Périodique',
            type_action: 'ANNULEE',
            motif_action: { [Op.like]: '%accident%' }
          },
          order: [['created_at', 'DESC']],
          raw: true
        });
        
        if (suppressionPeriodique && suppressionPeriodique.details_action) {
          try {
            const details = typeof suppressionPeriodique.details_action === 'string' 
              ? JSON.parse(suppressionPeriodique.details_action) 
              : suppressionPeriodique.details_action;
            
            if (details.raison === 'accident') {
              infoSuppression = {
                date_annulee: details.date_annulee || suppressionPeriodique.date_visite,
                heure_annulee: details.heure_annulee || suppressionPeriodique.heure_visite,
                date_accident: details.date_accident,
                message: `⚠️ Une visite périodique prévue le ${formatDate(details.date_annulee || suppressionPeriodique.date_visite)} à ${(details.heure_annulee || suppressionPeriodique.heure_visite)?.substring(0,5)} a été annulée suite à l'accident du ${formatDate(details.date_accident)}.`
              };
            }
          } catch(e) {
            console.error('Erreur parsing details_action:', e);
          }
        }
      }
      
      const historiqueEnrichi = historique.map(h => {
        let details = null;
        if (h.details_action) {
          try {
            details = typeof h.details_action === 'string' ? JSON.parse(h.details_action) : h.details_action;
          } catch(e) { details = null; }
        }
        
        return {
          id: h.matricule_visite,
          type_action: h.type_action,
          date_action: h.created_at,
          date_visite: h.date_visite,
          heure_visite: h.heure_visite,
          type_visite: h.type_visite,
          medecin: h.medecin,
          resultat: h.resultat,
          observation: h.observation,
          motif_action: h.motif_action,
          ancien_statut: h.ancien_statut,
          nouveau_statut: h.nouveau_statut,
          source: h.source,
          details: details
        };
      });
      
      const visiteEffectuee = historique.find(h => h.type_action === 'EFFECTUEE');
      let action_details = null;
      
      if (visiteEffectuee && visiteEffectuee.details_action) {
        try {
          action_details = typeof visiteEffectuee.details_action === 'string' 
            ? JSON.parse(visiteEffectuee.details_action) 
            : visiteEffectuee.details_action;
        } catch(e) { action_details = null; }
      }
      
      return {
        ...p,
        planningAgent: agentsMap.get(p.matricule_agent) || null,
        historique: historiqueEnrichi,
        action_details: action_details,
        a_des_actions: historiqueEnrichi.length > 0,
        info_suppression: infoSuppression  // ← AJOUT
      };
    }));

    res.json({ success: true, planning: planningEnrichi });
  } catch (error) {
    console.error('❌ Erreur récupération planning:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== RÉCUPÉRER LES DÉTAILS D'UNE VISITE SPÉCIFIQUE ==========
router.get('/planning/:id/details', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const planning = await Planning.findByPk(id, { raw: true });
    if (!planning) {
      return res.status(404).json({ success: false, message: 'Visite non trouvée' });
    }
    
    const agent = await Agent.findOne({
      where: { matricule_agent: planning.matricule_agent },
      attributes: ['nom', 'prenom', 'code_agence', 'code_affectation'],
      raw: true
    });
    
    const historique = await Visite.findAll({
      where: { 
        [Op.or]: [
          { id_planning: id },
          { visite_originale_id: id }
        ]
      },
      order: [['created_at', 'DESC']],
      raw: true
    });
    
    const historiqueEnrichi = historique.map(h => {
      let details = null;
      if (h.details_action) {
        try {
          details = typeof h.details_action === 'string' ? JSON.parse(h.details_action) : h.details_action;
        } catch(e) { details = null; }
      }
      
      return {
        id: h.matricule_visite,
        type_action: h.type_action,
        date_action: h.created_at,
        date_visite: h.date_visite,
        heure_visite: h.heure_visite,
        type_visite: h.type_visite,
        medecin: h.medecin,
        resultat: h.resultat,
        observation: h.observation,
        motif_action: h.motif_action,
        ancien_statut: h.ancien_statut,
        nouveau_statut: h.nouveau_statut,
        source: h.source,
        details: details
      };
    });
    
    const visiteEffectuee = historique.find(h => h.type_action === 'EFFECTUEE');
    let action_details = null;
    
    if (visiteEffectuee && visiteEffectuee.details_action) {
      try {
        action_details = typeof visiteEffectuee.details_action === 'string' 
          ? JSON.parse(visiteEffectuee.details_action) 
          : visiteEffectuee.details_action;
      } catch(e) { action_details = null; }
    }
    
    res.json({
      success: true,
      visite: {
        ...planning,
        agent,
        historique: historiqueEnrichi,
        action_details: action_details,
        a_des_actions: historiqueEnrichi.length > 0
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération détails visite:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== GÉNÉRER PLANNING AUTO ==========
router.post('/planning/generer', protect, async (req, res) => {
  try {
    const { dateDebut } = req.body;
    if (!dateDebut) {
      return res.status(400).json({ success: false, message: 'Date de début requise' });
    }
    const planning = await planningService.genererPlanningSemaine(new Date(dateDebut), req.user.id);
    res.json({
      success: true,
      message: `Planning automatique généré avec ${planning.length} visite(s)`,
      planning
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== VÉRIFIER CRÉNEAU ==========
router.get('/planning/verifier-disponibilite-creneau', protect, async (req, res) => {
  try {
    const { date, heure, id_planning_exclu } = req.query;
    
    if (!date || !heure) {
      return res.status(400).json({ success: false, message: 'Date et heure requises' });
    }

    const whereClause = {
      date_visite: date,
      heure_visite: heure
    };

    if (id_planning_exclu) {
      whereClause.id_planning = { [Op.ne]: id_planning_exclu };
    }

    const planningExistant = await Planning.findOne({ where: whereClause });
    
    let disponible = true;
    let message = 'Créneau disponible';
    
    if (planningExistant) {
      if (planningExistant.visite_effectuee === true) {
        disponible = false;
        message = `❌ Une visite a déjà été EFFECTUÉE sur ce créneau (${planningExistant.type_visite})`;
      } else if (planningExistant.statut === 'Annulé') {
        disponible = false;
        message = `❌ Une visite a été ANNULÉE sur ce créneau (${planningExistant.type_visite})`;
      } else if (planningExistant.statut === 'Reporté') {
        disponible = false;
        message = `⚠️ Une visite a été REPORTÉE sur ce créneau (${planningExistant.type_visite})`;
      } else if (planningExistant.creneau_bloque === true) {
        disponible = false;
        message = `🔒 Ce créneau est BLOQUÉ (ancienne visite reprogrammée)`;
      } else if (planningExistant.statut === 'Programmé') {
        disponible = false;
        message = `📅 Ce créneau est déjà PROGRAMMÉ (${planningExistant.type_visite})`;
      }
    }
    
    res.json({ 
      success: true, 
      disponible: disponible,
      message: message
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== VÉRIFIER SI UN AGENT A DÉJÀ UNE VISITE CE JOUR ==========
router.get('/planning/verifier-visite-existante', protect, async (req, res) => {
  try {
    const { matricule, date, exclure } = req.query;
    
    if (!matricule || !date) {
      return res.status(400).json({ success: false, message: 'Matricule et date requis' });
    }
    
    const whereClause = {
      matricule_agent: matricule,
      date_visite: date,
      statut: 'Programmé'
    };
    
    if (exclure) {
      whereClause.id_planning = { [Op.ne]: exclure };
    }
    
    const visiteExistante = await Planning.findOne({ where: whereClause });
    
    res.json({ 
      success: true, 
      existe: visiteExistante !== null,
      message: visiteExistante ? `Cet agent a déjà une visite le ${date}` : null
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== MARQUER UNE VISITE COMME EFFECTUÉE ==========
router.patch('/planning/:id/effectuer', protect, async (req, res) => {
  console.log('🔴 Backend reçu - duree_inaptitude:', req.body.duree_inaptitude);
  console.log('🔴 Body complet:', req.body);

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  try {
    const { id } = req.params;
    const { medecin, observation, resultat, duree_inaptitude } = req.body;

    const planning = await Planning.findByPk(id);
    if (!planning) return res.status(404).json({ success: false, message: 'Planning non trouvé' });

    if (planning.statut === 'Effectué') {
      return res.status(400).json({ success: false, message: 'Visite déjà marquée comme effectuée' });
    }
    if (planning.statut === 'Annulé') {
      return res.status(400).json({ success: false, message: 'Impossible d\'effectuer une visite annulée' });
    }

    const agent = await Agent.findOne({ where: { matricule_agent: planning.matricule_agent } });
    if (!agent) return res.status(404).json({ success: false, message: 'Agent non trouvé' });

    const ancienStatut = planning.statut;
    planning.visite_effectuee = true;
    planning.statut = 'Effectué';
    await planning.save();

    let detailsAction = {};

    // ========== PÉRIODIQUE ==========
    if (planning.type_visite === 'Périodique') {
      const periodicite = planningService.calculerPeriodicite(agent);
      const [year, month, day] = planning.date_visite.split('-');
      const dateVisite = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      const dateProchaine = new Date(dateVisite);
      dateProchaine.setUTCDate(dateVisite.getUTCDate() + periodicite);
      const nouvelleDateProchaine = dateProchaine.toISOString().split('T')[0];
      
      await agent.update({
        date_derniere_visite: planning.date_visite,
        date_prochaine_visite: nouvelleDateProchaine
      });
      
      detailsAction = {
        type: 'periodique_effectuee',
        date_visite: planning.date_visite,
        heure_visite: planning.heure_visite?.substring(0,5),
        medecin: medecin || 'Dr. Mahmoud Khelifi',
        observation: observation || '',
        resultat: resultat,
        periodicite_jours: periodicite,
        periodicite_texte: periodicite === 180 ? '6 mois' : '1 an',
        prochaine_visite: nouvelleDateProchaine
      };
      
      console.log(`📅 Prochaine visite pour ${agent.nom} ${agent.prenom}: ${nouvelleDateProchaine}`);
    }
    
    // ========== REPRISE ==========
    else if (planning.type_visite === 'Reprise') {
      if (resultat && resultat === 'Apte') {
        const periodicite = planningService.calculerPeriodicite(agent);
        const [year, month, day] = planning.date_visite.split('-');
        const dateVisite = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
        const dateProchaine = new Date(dateVisite);
        dateProchaine.setUTCDate(dateVisite.getUTCDate() + periodicite);
        const nouvelleDateProchaine = dateProchaine.toISOString().split('T')[0];
        
        await agent.update({ 
          date_debut_inaptitude: null, 
          date_fin_inaptitude: null,
          date_prochaine_inaptitude: null,
          date_derniere_visite: planning.date_visite,
          date_prochaine_visite: nouvelleDateProchaine
        });
        
        detailsAction = {
          type: 'reprise_apte',
          date_visite: planning.date_visite,
          heure_visite: planning.heure_visite?.substring(0,5),
          medecin: medecin || 'Dr. Mahmoud Khelifi',
          observation: observation || '',
          resultat: 'Apte',
          periodicite_jours: periodicite,
          periodicite_texte: periodicite === 180 ? '6 mois' : '1 an',
          prochaine_visite: nouvelleDateProchaine,
          message: `L'agent a été déclaré APTE lors de la visite de reprise. Cette visite compte comme visite périodique. Prochaine visite: ${nouvelleDateProchaine}`
        };
        
        console.log(`✅ Agent ${agent.nom} ${agent.prenom} : Reprise avec APTE - Dernière visite mise à jour au ${planning.date_visite}`);
      }
      else if (resultat === 'Inapte temporaire') {
        const dureeSupplementaire = duree_inaptitude || 15;
        const ancienneDateFin = agent.date_fin_inaptitude ? new Date(agent.date_fin_inaptitude) : new Date();
        const ancienneDateFinStr = ancienneDateFin.toISOString().split('T')[0];
        const nouvelleDateFin = new Date(ancienneDateFin);
        nouvelleDateFin.setDate(ancienneDateFin.getDate() + dureeSupplementaire);
        const nouvelleDateFinStr = nouvelleDateFin.toISOString().split('T')[0];
        
        const nouvelleDateReprise = new Date(nouvelleDateFin);
        nouvelleDateReprise.setDate(nouvelleDateFin.getDate() - 3);
        
        let dateRepriseValide = nouvelleDateReprise;
        let joursRecherche = 0;
        while (!(await planningService.estJourOuvre(dateRepriseValide)) && joursRecherche < 10) {
          dateRepriseValide.setDate(nouvelleDateReprise.getDate() - (joursRecherche + 1));
          joursRecherche++;
        }
        
        if (!(await planningService.estJourOuvre(dateRepriseValide))) {
          dateRepriseValide = nouvelleDateReprise;
          joursRecherche = 0;
          while (!(await planningService.estJourOuvre(dateRepriseValide)) && joursRecherche < 10) {
            dateRepriseValide.setDate(nouvelleDateReprise.getDate() + joursRecherche + 1);
            joursRecherche++;
          }
        }
        
        const dateRepriseValideStr = dateRepriseValide.toISOString().split('T')[0];
        
        const agentDejaOccupe = await Planning.findOne({
          where: {
            matricule_agent: agent.matricule_agent,
            date_visite: dateRepriseValideStr,
            statut: 'Programmé',
            visite_effectuee: false
          }
        });
        
        let dateRepriseFinale = dateRepriseValide;
        let dateRepriseFinaleStr = dateRepriseValideStr;
        
        if (agentDejaOccupe) {
          console.log(`   ⚠️ Agent déjà occupé le ${dateRepriseValideStr}, recherche autre jour...`);
          for (let i = 1; i <= 7; i++) {
            const dateTest = new Date(dateRepriseValide);
            dateTest.setDate(dateRepriseValide.getDate() + i);
            if (await planningService.estJourOuvre(dateTest)) {
              const dateTestStr = dateTest.toISOString().split('T')[0];
              const occupe = await Planning.findOne({
                where: {
                  matricule_agent: agent.matricule_agent,
                  date_visite: dateTestStr,
                  statut: 'Programmé',
                  visite_effectuee: false
                }
              });
              if (!occupe) {
                dateRepriseFinale = dateTest;
                dateRepriseFinaleStr = dateTestStr;
                console.log(`   ✅ Nouvelle date trouvée: ${dateRepriseFinaleStr}`);
                break;
              }
            }
          }
        }
        
        // Recherche d'un créneau disponible (avec vérification complète)
const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
let heureTrouvee = null;

for (const heure of creneaux) {
  // ✅ Vérifier si le créneau existe
  const planningExistant = await Planning.findOne({
    where: {
      date_visite: dateRepriseFinaleStr,
      heure_visite: heure
    }
  });
  
  let disponible = true;
  let raison = '';
  
  if (planningExistant) {
    // VISITE DÉJÀ EFFECTUÉE
    if (planningExistant.visite_effectuee === true) {
      disponible = false;
      raison = 'Une visite a déjà été EFFECTUÉE sur ce créneau';
    }
    // CRÉNEAU BLOQUÉ (ancienne reprogrammation)
    else if (planningExistant.creneau_bloque === true) {
      disponible = false;
      raison = 'Ce créneau est BLOQUÉ (ancienne reprogrammation)';
    }
    // VISITE ANNULÉE
    else if (planningExistant.statut === 'Annulé') {
      disponible = false;
      raison = 'Une visite a été ANNULÉE sur ce créneau';
    }
    // VISITE REPORTÉE
    else if (planningExistant.statut === 'Reporté') {
      disponible = false;
      raison = 'Une visite a été REPORTÉE sur ce créneau';
    }
    // CRÉNEAU OCCUPÉ PAR UN AUTRE AGENT
    else if (planningExistant.statut === 'Programmé' && 
             planningExistant.matricule_agent !== agent.matricule_agent &&
             planningExistant.visite_effectuee === false) {
      const autreAgent = await Agent.findByPk(planningExistant.matricule_agent);
      raison = `Créneau occupé par ${autreAgent?.nom} ${autreAgent?.prenom} (${planningExistant.type_visite})`;
      disponible = false;
    }
    // C'est la visite qu'on est en train de modifier (on peut la remplacer)
    else if (planningExistant.id_planning === planning.id_planning) {
      disponible = true;
      raison = 'C\'est la visite actuelle (sera remplacée)';
    }
  }
  
  if (disponible) {
    heureTrouvee = heure;
    console.log(`   ✅ Créneau trouvé: ${dateRepriseFinaleStr} à ${heure.substring(0,5)}`);
    break;
  } else {
    console.log(`   ❌ ${dateRepriseFinaleStr} ${heure.substring(0,5)}: ${raison}`);
  }
}

if (!heureTrouvee) {
  console.log(`   ⚠️ Aucun créneau disponible le ${dateRepriseFinaleStr}, recherche autre jour...`);
  // Ici, logique pour chercher un autre jour
}
        
        await agent.update({
          date_fin_inaptitude: nouvelleDateFinStr,
          date_prochaine_inaptitude: dateRepriseFinaleStr
        });

        // ✅ 1. METTRE À JOUR la visite actuelle
        const visiteActuelle = await Visite.findOne({
          where: { id_planning: planning.id_planning }
        });
        
        if (visiteActuelle) {
          await visiteActuelle.update({
            medecin: medecin || 'Dr. Mahmoud Khelifi',
            observation: observation || '',
            resultat: 'Inapte temporaire',
            type_action: 'EFFECTUEE',
            ancien_statut: ancienStatut,
            nouveau_statut: 'Effectué',
            motif_action: `Visite de reprise effectuée - Inapte temporaire - Prolongation de ${dureeSupplementaire} jours`,
            details_action: JSON.stringify({
              type: 'reprise_inapte_temp_prolongation',
              duree_supplementaire: dureeSupplementaire,
              ancienne_date_fin_inaptitude: ancienneDateFinStr,
              nouvelle_date_fin_inaptitude: nouvelleDateFinStr
            })
          });
        } else {
          await Visite.create({
            matricule_agent: agent.matricule_agent,
            date_visite: planning.date_visite,
            heure_visite: planning.heure_visite,
            type_visite: 'Reprise',
            medecin: medecin || 'Dr. Mahmoud Khelifi',
            observation: observation || '',
            resultat: 'Inapte temporaire',
            id_planning: planning.id_planning,
            type_action: 'EFFECTUEE',
            ancien_statut: ancienStatut,
            nouveau_statut: 'Effectué',
            motif_action: `Visite de reprise effectuée - Inapte temporaire - Prolongation de ${dureeSupplementaire} jours`,
            details_action: JSON.stringify({
              type: 'reprise_inapte_temp_prolongation',
              duree_supplementaire: dureeSupplementaire,
              ancienne_date_fin_inaptitude: ancienneDateFinStr,
              nouvelle_date_fin_inaptitude: nouvelleDateFinStr
            }),
            source: 'PLANNING',
            created_by: req.user.id,
            source_originale: 'auto'
          });
        }

        // ✅ 2. Gérer la visite périodique existante
        const visitePeriodiqueExistante = await Planning.findOne({
          where: {
            matricule_agent: agent.matricule_agent,
            type_visite: 'Périodique',
            statut: 'Programmé',
            visite_effectuee: false,
            date_visite: { [Op.lt]: dateRepriseFinaleStr }
          }
        });
        
        if (visitePeriodiqueExistante) {
          console.log(`   ⚠️ Visite périodique existante le ${visitePeriodiqueExistante.date_visite} avant la reprise - à reprogrammer`);
          const nouvelleDatePeriodique = new Date(dateRepriseFinale);
          nouvelleDatePeriodique.setDate(dateRepriseFinale.getDate() + 14);
          
          let datePeriodiqueValide = nouvelleDatePeriodique;
          let joursRecherchePer = 0;
          while (!(await planningService.estJourOuvre(datePeriodiqueValide)) && joursRecherchePer < 14) {
            datePeriodiqueValide.setDate(nouvelleDatePeriodique.getDate() + joursRecherchePer + 1);
            joursRecherchePer++;
          }
          
          const datePeriodiqueStr = datePeriodiqueValide.toISOString().split('T')[0];
          let heurePeriodique = null;
          
          for (const heure of creneaux) {
            const occupe = await Planning.findOne({
              where: { date_visite: datePeriodiqueStr, heure_visite: heure, statut: 'Programmé' }
            });
            if (!occupe) {
              heurePeriodique = heure;
              break;
            }
          }
          
          if (heurePeriodique) {
            await visitePeriodiqueExistante.update({
              statut: 'Reporté',
              reprogrammee: true,
              motif_reprogrammation: `Reprogrammée suite à prolongation d'inaptitude - Nouvelle reprise le ${dateRepriseFinaleStr}`
            });
            
            await Planning.create({
              matricule_agent: agent.matricule_agent,
              date_visite: datePeriodiqueStr,
              heure_visite: heurePeriodique,
              type_visite: 'Périodique',
              statut: 'Programmé',
              priorite: 100,
              semaine: planningService.getNumeroSemaine(datePeriodiqueValide),
              annee: datePeriodiqueValide.getFullYear(),
              created_by: req.user.id,
              convocation_envoyee: false,
              source_planification: 'auto',
              visite_originale_id: visitePeriodiqueExistante.id_planning
            });
            
            console.log(`   ✅ Visite périodique reprogrammée au ${datePeriodiqueStr}`);
          }
        }

        // ✅ 3. CRÉER la nouvelle visite de reprise
        console.log(`🔍 Création nouvelle visite: ${dateRepriseFinaleStr} à ${heureTrouvee}`);
        
        const verifFinale = await Planning.findOne({
  where: {
    date_visite: dateRepriseFinaleStr,
    heure_visite: heureTrouvee,
    visite_effectuee: true  // ← Vérifier spécifiquement les visites effectuées
  }
});

if (verifFinale) {
  console.log(`❌ CRÉNEAU INDISPONIBLE: Une visite EFFECTUÉE existe déjà à ${dateRepriseFinaleStr} ${heureTrouvee}`);
  return res.status(409).json({ 
    success: false, 
    message: 'Le créneau choisi a déjà une visite effectuée. Veuillez réessayer.' 
  });
}

        const nouvelleReprisePlanning = await Planning.create({
          matricule_agent: agent.matricule_agent,
          date_visite: dateRepriseFinaleStr,
          heure_visite: heureTrouvee,
          type_visite: 'Reprise',
          statut: 'Programmé',
          priorite: 150,
          semaine: planningService.getNumeroSemaine(dateRepriseFinale),
          annee: dateRepriseFinale.getFullYear(),
          created_by: req.user.id,
          convocation_envoyee: false,
          motif_reprogrammation: `Nouvelle visite de reprise suite à prolongation d'inaptitude (${dureeSupplementaire} jours)`,
          source_planification: 'auto',
          source_originale: 'auto',
          visite_originale_id: planning.id_planning
        });
        
        // ✅ 4. CRÉER l'HISTORIQUE pour la NOUVELLE visite
        await Visite.create({
          matricule_agent: agent.matricule_agent,
          date_visite: dateRepriseFinaleStr,
          heure_visite: heureTrouvee,
          type_visite: 'Reprise',
          medecin: 'Dr. Mahmoud Khelifi',
          observation: `Nouvelle visite de reprise programmée suite à prolongation d'inaptitude de ${dureeSupplementaire} jours`,
          id_planning: nouvelleReprisePlanning.id_planning,
          type_action: 'PROGRAMMATION',
          ancien_statut: null,
          nouveau_statut: 'Programmé',
          motif_action: `Programmation automatique - Nouvelle reprise après prolongation d'inaptitude`,
          details_action: JSON.stringify({
            type: 'programmation_nouvelle_reprise',
            duree_supplementaire: dureeSupplementaire,
            ancienne_date_fin_inaptitude: ancienneDateFinStr,
            nouvelle_date_fin_inaptitude: nouvelleDateFinStr,
            date_nouvelle_reprise: dateRepriseFinaleStr,
            heure_nouvelle_reprise: heureTrouvee,
            visite_originale_id: planning.id_planning
          }),
          source: 'PLANNING',
          created_by: req.user.id,
          source_originale: 'auto'
        });
        
        detailsAction = {
          type: 'reprise_inapte_temp_prolongation',
          date_visite: planning.date_visite,
          heure_visite: planning.heure_visite?.substring(0,5),
          medecin: medecin || 'Dr. Mahmoud Khelifi',
          observation: observation || '',
          resultat: 'Inapte temporaire',
          duree_supplementaire: dureeSupplementaire,
          ancienne_date_fin_inaptitude: ancienneDateFinStr,
          nouvelle_date_fin_inaptitude: nouvelleDateFinStr,
          date_prochaine_reprise: dateRepriseFinaleStr,
          heure_prochaine_reprise: heureTrouvee.substring(0,5),
          id_prochaine_reprise: nouvelleReprisePlanning.id_planning
        };
        
        console.log(`⚠️ Agent ${agent.nom} ${agent.prenom} : Reprise avec INAPTE TEMPORAIRE - Prolongation jusqu'au ${nouvelleDateFinStr}`);
        console.log(`📅 Nouvelle visite de reprise prévue le ${dateRepriseFinaleStr} à ${heureTrouvee.substring(0,5)}`);
        console.log(`✅ NOUVELLE VISITE DE REPRISE CRÉÉE: ID ${nouvelleReprisePlanning.id_planning}`);
      }
    }
    
// ========== RECLASSEMENT ==========
else if (planning.type_visite === 'Reclassement') {
  const dateVisite = planning.date_visite;
  const [year, month, day] = dateVisite.split('-');
  const dateDebut = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
  
  if (resultat === 'Inapte définitif') {
    const periodicite = planningService.calculerPeriodicite(agent);
    const dateProchaine = new Date(dateDebut);
    dateProchaine.setUTCDate(dateDebut.getUTCDate() + periodicite);
    const dateProchaineStr = dateProchaine.toISOString().split('T')[0];
    
    await agent.update({
      statut: 'inactif',
      date_debut_reclassement: dateVisite,
      date_fin_reclassement: null,
      date_prochaine_reclassement: null,
      date_derniere_visite: dateVisite,
      date_prochaine_visite: dateProchaineStr,
      date_debut_inaptitude: null,
      date_fin_inaptitude: null
    });
    
    detailsAction = {
      type: 'reclassement_inapte_definitif',
      date_visite: dateVisite,
      heure_visite: planning.heure_visite?.substring(0,5),
      medecin: medecin || 'Dr. Mahmoud Khelifi',
      observation: observation || '',
      resultat: 'Inapte définitif',
      periodicite_jours: periodicite,
      periodicite_texte: periodicite === 180 ? '6 mois' : '1 an',
      date_derniere_visite_mise_a_jour: dateVisite,
      date_prochaine_visite_theorique: dateProchaineStr,
      message: `⚠️ L'agent a été déclaré INAPTE DÉFINITIF lors de la visite de reclassement du ${formatDate(dateVisite)}.`
    };
    
    console.log(`❌ Agent ${agent.nom} ${agent.prenom} : INAPTE DÉFINITIF`);
  } 
else if (resultat === 'Inapte temporaire') {
  const duree = duree_inaptitude || 30;
  const dateFin = new Date(dateDebut);
  dateFin.setUTCDate(dateDebut.getUTCDate() + duree);
  const dateFinStr = dateFin.toISOString().split('T')[0];
  
  const dateControle = new Date(dateFin);
  dateControle.setUTCDate(dateFin.getUTCDate() - 3);
  let dateControleValide = new Date(dateControle);
  let joursRecherche = 0;
  const maxJours = 10;
  
  while (!(await planningService.estJourOuvre(dateControleValide)) && joursRecherche < maxJours) {
    dateControleValide.setDate(dateControle.getDate() - (joursRecherche + 1));
    joursRecherche++;
  }
  
  if (!(await planningService.estJourOuvre(dateControleValide))) {
    dateControleValide = new Date(dateControle);
    joursRecherche = 0;
    while (!(await planningService.estJourOuvre(dateControleValide)) && joursRecherche < maxJours) {
      dateControleValide.setDate(dateControle.getDate() + joursRecherche + 1);
      joursRecherche++;
    }
  }
  
  const dateControleStr = dateControleValide.toISOString().split('T')[0];
  
  const agentDejaOccupe = await Planning.findOne({
    where: {
      matricule_agent: agent.matricule_agent,
      date_visite: dateControleStr,
      statut: 'Programmé',
      visite_effectuee: false
    }
  });
  
  let dateControleFinale = dateControleValide;
  let dateControleFinaleStr = dateControleStr;
  
  if (agentDejaOccupe) {
    for (let i = 1; i <= 7; i++) {
      const dateTest = new Date(dateControleValide);
      dateTest.setDate(dateControleValide.getDate() + i);
      if (await planningService.estJourOuvre(dateTest)) {
        const dateTestStr = dateTest.toISOString().split('T')[0];
        const occupe = await Planning.findOne({
          where: { matricule_agent: agent.matricule_agent, date_visite: dateTestStr, statut: 'Programmé' }
        });
        if (!occupe) {
          dateControleFinale = dateTest;
          dateControleFinaleStr = dateTestStr;
          break;
        }
      }
    }
  }
  
  const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
  let heureControle = null;
  
  for (const heure of creneaux) {
    const creneauOccupe = await Planning.findOne({
      where: { date_visite: dateControleFinaleStr, heure_visite: heure, statut: 'Programmé' }
    });
    const creneauBloque = await Planning.findOne({
      where: { date_visite: dateControleFinaleStr, heure_visite: heure, creneau_bloque: true }
    });
    
    if (!creneauOccupe && !creneauBloque) {
      heureControle = heure;
      break;
    }
  }
  
  if (!heureControle) {
    heureControle = '09:00:00';
  }
  
  await agent.update({
    statut: 'maladie',
    date_debut_reclassement: dateVisite,
    date_fin_reclassement: dateFinStr,
    date_prochaine_reclassement: dateControleFinaleStr
  });
  
  // ============================================================
  // ✅ 1. CRÉER LA VISITE DE CONTRÔLE DANS LE PLANNING
  // ============================================================
  const controlePlanning = await Planning.create({
    matricule_agent: agent.matricule_agent,
    date_visite: dateControleFinaleStr,
    heure_visite: heureControle,
    type_visite: 'Reclassement',
    statut: 'Programmé',
    priorite: 150,
    semaine: planningService.getNumeroSemaine(dateControleFinale),
    annee: dateControleFinale.getFullYear(),
    created_by: req.user.id,
    convocation_envoyee: false,
    motif_reprogrammation: `Visite de contrôle automatique - Fin inaptitude le ${dateFinStr}`,
    source_planification: 'auto',
    source_originale: 'auto',
    visite_originale_id: planning.id_planning
  });
  
  // ============================================================
  // ✅ 2. CRÉER L'HISTORIQUE DE LA VISITE DE CONTRÔLE (CECI LA FAIT APPARAÎTRE)
  // ============================================================
  await Visite.create({
    matricule_agent: agent.matricule_agent,
    date_visite: dateControleFinaleStr,
    heure_visite: heureControle,
    type_visite: 'Reclassement',
    medecin: 'Dr. Mahmoud Khelifi',
    observation: `Visite de contrôle programmée suite à inaptitude temporaire (fin le ${dateFinStr})`,
    id_planning: controlePlanning.id_planning,
    type_action: 'PROGRAMMATION',
    ancien_statut: null,
    nouveau_statut: 'Programmé',
    motif_action: `Programmation automatique - Visite de contrôle post-inaptitude (${duree} jours)`,
    details_action: JSON.stringify({
      type: 'programmation_visite_controle',
      duree_inaptitude: duree,
      date_fin_inaptitude: dateFinStr,
      date_visite_controle: dateControleFinaleStr,
      heure_visite_controle: heureControle,
      visite_originale_id: planning.id_planning
    }),
    source: 'PLANNING',
    created_by: req.user.id,
    source_originale: 'manuel'  
  });
  
  console.log(`✅ Visite de contrôle créée et historisée: ${dateControleFinaleStr} à ${heureControle.substring(0,5)}`);
  console.log(`✅ ID Planning: ${controlePlanning.id_planning}`);
  
  detailsAction = {
    type: 'reclassement_inapte_temp_avec_controle',
    date_visite: dateVisite,
    heure_visite: planning.heure_visite?.substring(0,5),
    medecin: medecin || 'Dr. Mahmoud Khelifi',
    observation: observation || '',
    resultat: 'Inapte temporaire',
    duree_inaptitude: duree,
    date_fin_inaptitude: dateFinStr,
    date_visite_controle: dateControleFinaleStr,
    heure_visite_controle: heureControle.substring(0,5),
    id_visite_controle: controlePlanning.id_planning,
    message: `⚠️ Inapte temporaire pour ${duree} jours. Visite de contrôle le ${formatDate(dateControleFinaleStr)}.`
  };
}
  else if (resultat === 'Apte') {
    await agent.update({
      date_debut_reclassement: null,
      date_fin_reclassement: null,
      date_prochaine_reclassement: null,
      statut: 'actif'
    });
    
    detailsAction = {
      type: 'reclassement_apte',
      date_visite: dateVisite,
      heure_visite: planning.heure_visite?.substring(0,5),
      medecin: medecin || 'Dr. Mahmoud Khelifi',
      observation: observation || '',
      resultat: 'Apte',
      message: `✅ L'agent a été déclaré APTE lors de la visite de reclassement.`
    };
    
    console.log(`✅ Agent ${agent.nom} ${agent.prenom} : RECLASSEMENT - APTE`);
  }
}

// ========== EMBAUCHE ==========
else if (planning.type_visite === 'Embauche') {
  if (resultat === 'Apte') {
    const periodicite = planningService.calculerPeriodicite(agent);
    const dateVisite = planning.date_visite;
    const [year, month, day] = dateVisite.split('-');
    const dateDebut = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    const dateProchaine = new Date(dateDebut);
    dateProchaine.setUTCDate(dateDebut.getUTCDate() + periodicite);
    const dateProchaineStr = dateProchaine.toISOString().split('T')[0];
    
    await agent.update({
      statut: 'actif',
      date_derniere_visite: dateVisite,
      date_prochaine_visite: dateProchaineStr,
      date_embauche: dateVisite
    });
    
    detailsAction = {
      type: 'embauche_apte',
      date_visite: dateVisite,
      heure_visite: planning.heure_visite?.substring(0,5),
      medecin: medecin || 'Dr. Mahmoud Khelifi',
      observation: observation || '',
      resultat: 'Apte',
      periodicite_jours: periodicite,
      periodicite_texte: periodicite === 180 ? '6 mois' : '1 an',
      prochaine_visite: dateProchaineStr
    };
    console.log(`✅ Agent ${agent.nom} ${agent.prenom} : EMBAUCHE - APTE`);
  } else if (resultat === 'Inapte définitif') {
    await agent.update({ statut: 'inactif' });
    detailsAction = {
      type: 'embauche_inapte_definitif',
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite?.substring(0,5),
      medecin: medecin || 'Dr. Mahmoud Khelifi',
      observation: observation || '',
      resultat: 'Inapte définitif'
    };
    console.log(`❌ Agent ${agent.nom} ${agent.prenom} : EMBAUCHE - INAPTE DÉFINITIF`);
  } else if (resultat === 'Inapte temporaire') {
    detailsAction = {
      type: 'embauche_inapte_temporaire',
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite?.substring(0,5),
      medecin: medecin || 'Dr. Mahmoud Khelifi',
      observation: observation || '',
      resultat: 'Inapte temporaire'
    };
    console.log(`⚠️ Agent ${agent.nom} ${agent.prenom} : EMBAUCHE - INAPTE TEMPORAIRE`);
  }
}

// ========== MISE À JOUR UNIQUE DE LA VISITE EXISTANTE ==========
// Pour TOUS les types de visite (Périodique, Reprise, Reclassement, Embauche)
let visiteExistante = await Visite.findOne({
  where: { id_planning: planning.id_planning }
});

if (visiteExistante) {
  // ✅ METTRE À JOUR la ligne existante
  await visiteExistante.update({
    medecin: medecin || 'Dr. Mahmoud Khelifi',
    observation: observation || '',
    resultat: resultat,
    type_action: 'EFFECTUEE',
    ancien_statut: ancienStatut,
    nouveau_statut: 'Effectué',
    motif_action: `Visite effectuée — Résultat: ${resultat || 'Apte'}`,
    details_action: JSON.stringify(detailsAction)
  });
  console.log(`✅ Visite mise à jour (id: ${visiteExistante.matricule_visite})`);
} else {
  // Cas rare : créer la ligne
  await Visite.create({
    matricule_agent: planning.matricule_agent,
    date_visite: planning.date_visite,
    heure_visite: planning.heure_visite,
    type_visite: planning.type_visite,
    medecin: medecin || 'Dr. Mahmoud Khelifi',
    observation: observation || '',
    resultat: resultat,
    id_planning: planning.id_planning,
    type_action: 'EFFECTUEE',
    ancien_statut: planning.statut,
    nouveau_statut: 'Effectué',
    motif_action: `Visite effectuée — Résultat: ${resultat || 'Apte'}`,
    details_action: JSON.stringify(detailsAction),
    source: planning.source_planification === 'manuel' ? 'FORMULAIRE' : 'PLANNING',
    source_originale: planning.source_originale || planning.source_planification,
    created_by: req.user.id
  });
}

res.json({ success: true, message: 'Visite marquée comme effectuée', planning });
} catch (error) {
    console.error('❌ Erreur effectuer visite:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
  

// ========== ANNULATION ==========
router.patch('/planning/:id/annuler', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    const planning = await Planning.findByPk(id);
    if (!planning) return res.status(404).json({ success: false, message: 'Planning non trouvé' });

    if (planning.type_visite !== 'Reprise') {
      return res.status(400).json({ 
        success: false, 
        message: 'Seules les visites de reprise peuvent être annulées.' 
      });
    }

    if (planning.statut === 'Annulé') return res.status(400).json({ success: false, message: 'Visite déjà annulée' });
    if (planning.statut === 'Effectué') return res.status(400).json({ success: false, message: 'Impossible d\'annuler une visite déjà effectuée' });

    const ancienStatut = planning.statut;
    planning.statut = 'Annulé';
    planning.motif_annulation = motif || 'Non spécifié';
    await planning.save();

    await Visite.create({
      matricule_agent: planning.matricule_agent,
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite,
      type_visite: planning.type_visite,
      id_planning: planning.id_planning,
      type_action: 'ANNULEE',
      ancien_statut: ancienStatut,
      nouveau_statut: 'Annulé',
      motif_action: motif || 'Annulation non spécifiée',
      details_action: JSON.stringify({ date_annulation: new Date().toISOString(), motif }),
      source: planning.source_planification === 'manuel' ? 'FORMULAIRE' : 'PLANNING',
      created_by: req.user.id,
      source_originale: planning.source_originale || planning.source_planification
    });

    res.json({ success: true, message: 'Visite de reprise annulée avec succès', planning });
  } catch (error) {
    console.error('❌ Erreur annulation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== REPROGRAMMATION MANUELLE ==========
router.post('/planning/:id/reprogrammer', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { nouvelle_date, nouvelle_heure, motif, source } = req.body;

    if (!nouvelle_date || !nouvelle_heure) {
      return res.status(400).json({ success: false, message: 'Nouvelle date et heure requises' });
    }
    if (!motif || motif.trim() === '') {
      return res.status(400).json({ success: false, message: 'Motif de reprogrammation requis' });
    }

    const planning = await Planning.findByPk(id);
    if (!planning) return res.status(404).json({ success: false, message: 'Planning non trouvé' });

    const agent = await Agent.findOne({ 
      where: { matricule_agent: planning.matricule_agent },
      attributes: ['nom', 'prenom', 'matricule_agent']
    });

    if (planning.statut === 'Effectué') {
      return res.status(400).json({ success: false, message: '❌ Impossible de reprogrammer une visite déjà effectuée' });
    }
    if (planning.statut === 'Annulé') {
      return res.status(400).json({ success: false, message: '❌ Impossible de reprogrammer une visite annulée' });
    }

    const nouvelleDateObj = new Date(nouvelle_date);
    if (!(await planningService.estJourOuvre(nouvelleDateObj))) {
      return res.status(400).json({ 
        success: false, 
        message: `📅 La date du ${nouvelle_date} n'est pas un jour ouvré (Mardi à Vendredi, hors jours fériés).` 
      });
    }

    // ✅ VÉRIFIER SI LE CRÉNEAU EST OCCUPÉ
    const creneauOccupe = await Planning.findOne({
      where: { date_visite: nouvelle_date, heure_visite: nouvelle_heure, statut: 'Programmé', id_planning: { [Op.ne]: id } }
    });
    
    if (creneauOccupe) {
      const agentOccupant = await Agent.findOne({ 
        where: { matricule_agent: creneauOccupe.matricule_agent },
        attributes: ['nom', 'prenom']
      });
      return res.status(409).json({ 
        success: false, 
        message: `❌ Le créneau du ${nouvelle_date} à ${nouvelle_heure.substring(0,5)} est déjà occupé par ${agentOccupant?.nom} ${agentOccupant?.prenom} (${creneauOccupe.type_visite}). Veuillez choisir un autre créneau.`,
        code: 'CRENEAU_OCCUPE'
      });
    }

    // ✅ VÉRIFIER SI LE CRÉNEAU EST BLOQUÉ
    const creneauBloque = await Planning.findOne({
      where: { date_visite: nouvelle_date, heure_visite: nouvelle_heure, creneau_bloque: true, id_planning: { [Op.ne]: id } }
    });

    if (creneauBloque) {
      return res.status(409).json({ 
        success: false, 
        message: `🔒 Le créneau du ${nouvelle_date} à ${nouvelle_heure.substring(0,5)} est BLOQUÉ (ancienne visite reprogrammée). Veuillez choisir un autre créneau.`,
        code: 'CRENEAU_BLOQUE'
      });
    }

    // ✅ VÉRIFIER SI L'AGENT A DÉJÀ UNE VISITE CE JOUR-LÀ
    const agentDejaOccupe = await Planning.findOne({
      where: {
        matricule_agent: planning.matricule_agent,
        date_visite: nouvelle_date,
        statut: 'Programmé',
        visite_effectuee: false,
        id_planning: { [Op.ne]: id }
      }
    });

    if (agentDejaOccupe) {
      return res.status(409).json({ 
        success: false, 
        message: `⚠️ L'agent ${agent?.nom} ${agent?.prenom} a déjà une visite de type "${agentDejaOccupe.type_visite}" prévue le ${nouvelle_date}. Un agent ne peut pas avoir deux visites le même jour.`,
        code: 'AGENT_DEJA_OCCUPE'
      });
    }

    // ✅ VÉRIFIER SI L'AGENT EST EN PÉRIODE D'INAPTITUDE
    if (agent?.date_fin_inaptitude) {
      const dateFinInaptitude = new Date(agent.date_fin_inaptitude);
      const nouvelleDateObjCheck = new Date(nouvelle_date);
      if (nouvelleDateObjCheck <= dateFinInaptitude) {
        return res.status(409).json({ 
          success: false, 
          message: `⚠️ L'agent ${agent.nom} ${agent.prenom} est en inaptitude jusqu'au ${dateFinInaptitude.toLocaleDateString('fr-FR')}. La visite ne peut pas être reprogrammée pendant cette période.`,
          code: 'AGENT_EN_INAPTITUDE'
        });
      }
    }

    const sourceReprog = source === 'auto' ? 'auto' : 'manuel';
    const ancienStatut = planning.statut;
    const ancienneDate = planning.date_visite;
    const ancienneHeure = planning.heure_visite;

    // Ancien planning : marquer comme reprogrammé et bloqué
    planning.statut = 'Reporté';
    planning.reprogrammee = true;
    planning.source_reprogrammation = sourceReprog;
    planning.motif_reprogrammation = motif;
    planning.date_reprogrammation = new Date();
    planning.creneau_bloque = true;
    planning.nouvelle_date_visite = nouvelle_date;
    planning.nouvelle_heure_visite = nouvelle_heure;
    await planning.save();

    const semaine = planningService.getNumeroSemaine(nouvelleDateObj);
    const annee = nouvelleDateObj.getFullYear();

    // NOUVEAU planning
    const nouveauPlanning = await Planning.create({
      matricule_agent: planning.matricule_agent,
      date_visite: nouvelle_date,
      heure_visite: nouvelle_heure,
      type_visite: planning.type_visite,
      statut: 'Programmé',
      priorite: (planning.priorite || 0) + 20,
      visite_originale_id: planning.id_planning,
      reprogrammee: true,
      semaine, annee,
      created_by: req.user.id,
      convocation_envoyee: false,
      source_planification: sourceReprog === 'auto' ? 'auto' : 'manuel',
      source_originale: planning.source_originale || planning.source_planification
    });

    // Historique
    await Visite.create({
      matricule_agent: planning.matricule_agent,
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite,
      type_visite: planning.type_visite,
      id_planning: planning.id_planning,
      type_action: 'REPROGRAMMEE',
      ancien_statut: ancienStatut,
      nouveau_statut: 'Reporté',
      motif_action: `${motif} (${sourceReprog === 'auto' ? 'automatique' : 'manuel'})`,
      details_action: JSON.stringify({
        source: sourceReprog,
        raison: motif,
        ancienne_date: ancienneDate,
        ancienne_heure: ancienneHeure,
        nouvelle_date: nouvelle_date,
        nouvelle_heure: nouvelle_heure,
        nouveau_planning_id: nouveauPlanning.id_planning
      }),
      source: planning.source_planification === 'manuel' ? 'FORMULAIRE' : 'PLANNING',
      created_by: req.user.id,
      source_originale: planning.source_originale || planning.source_planification
    });

    res.json({
      success: true,
      message: `✅ Visite reprogrammée avec succès du ${ancienneDate} vers le ${nouvelle_date} à ${nouvelle_heure.substring(0,5)}`,
      data: {
        ancien_planning: { id: planning.id_planning, date: ancienneDate, heure: ancienneHeure },
        nouveau_planning: { id: nouveauPlanning.id_planning, date: nouvelle_date, heure: nouvelle_heure }
      }
    });
  } catch (error) {
    console.error('❌ Erreur reprogrammation:', error);
    
    if (error.name === 'SequelizeUniqueConstraintError' || error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        success: false, 
        message: `❌ Impossible de reprogrammer la visite : L'agent a déjà une visite programmée à cette date. Veuillez choisir une autre date.`,
        code: 'DUPLICATE_ENTRY'
      });
    }
    
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== REPROGRAMMATION AUTOMATIQUE ==========
router.post('/planning/:id/reprogrammer-auto', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const planning = await Planning.findByPk(id);
    if (!planning) return res.status(404).json({ success: false, message: 'Planning non trouvé' });
    
    if (planning.statut === 'Effectué') {
      return res.status(400).json({ success: false, message: 'Impossible de reprogrammer une visite déjà effectuée' });
    }
    if (planning.statut === 'Annulé') {
      return res.status(400).json({ success: false, message: 'Impossible de reprogrammer une visite annulée' });
    }
    
    const agent = await Agent.findOne({ 
      where: { matricule_agent: planning.matricule_agent },
      attributes: ['matricule_agent', 'nom', 'prenom']
    });
    
    const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
    const dateDebut = new Date(planning.date_visite);
    dateDebut.setDate(dateDebut.getDate() + 1);
    
    let nouvelleDate = null;
    let nouvelleHeure = null;
    
    for (let i = 0; i <= 30; i++) {
      const dateTest = new Date(dateDebut);
      dateTest.setDate(dateDebut.getDate() + i);
      
      if (!(await planningService.estJourOuvre(dateTest))) continue;
      
      const dateStr = dateTest.toISOString().split('T')[0];
      
      const agentDejaOccupe = await Planning.findOne({
        where: {
          matricule_agent: planning.matricule_agent,
          date_visite: dateStr,
          statut: 'Programmé',
          visite_effectuee: false,
          id_planning: { [Op.ne]: id }
        }
      });
      
      if (agentDejaOccupe) continue;
      
      for (const heure of creneaux) {
        const existe = await Planning.findOne({ 
          where: { 
            date_visite: dateStr, 
            heure_visite: heure, 
            statut: 'Programmé',
            id_planning: { [Op.ne]: id }
          } 
        });
        
        const bloque = await Planning.findOne({ 
          where: { 
            date_visite: dateStr, 
            heure_visite: heure, 
            creneau_bloque: true,
            id_planning: { [Op.ne]: id }
          } 
        });
        
        const effectue = await Planning.findOne({ 
          where: { 
            date_visite: dateStr, 
            heure_visite: heure, 
            visite_effectuee: true,
            id_planning: { [Op.ne]: id }
          } 
        });
        
        const annule = await Planning.findOne({ 
          where: { 
            date_visite: dateStr, 
            heure_visite: heure, 
            statut: 'Annulé',
            id_planning: { [Op.ne]: id }
          } 
        });
        
        if (!existe && !bloque && !effectue && !annule) {
          nouvelleDate = dateTest;
          nouvelleHeure = heure;
          break;
        }
      }
      if (nouvelleDate) break;
    }
    
    if (!nouvelleDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucun créneau disponible dans les 30 jours' 
      });
    }
    
    const nouvelleDateStr = nouvelleDate.toISOString().split('T')[0];
    
    planning.statut = 'Reporté';
    planning.reprogrammee = true;
    planning.source_reprogrammation = 'auto';
    planning.motif_reprogrammation = `Reprogrammation automatique vers le ${nouvelleDateStr} à ${nouvelleHeure.substring(0,5)}`;
    planning.date_reprogrammation = new Date();
    planning.creneau_bloque = true;
    planning.nouvelle_date_visite = nouvelleDateStr;
    planning.nouvelle_heure_visite = nouvelleHeure;
    await planning.save();
    
    const semaine = planningService.getNumeroSemaine(nouvelleDate);
    const annee = nouvelleDate.getFullYear();
    
    const nouveauPlanning = await Planning.create({
      matricule_agent: planning.matricule_agent,
      date_visite: nouvelleDateStr,
      heure_visite: nouvelleHeure,
      type_visite: planning.type_visite,
      statut: 'Programmé',
      priorite: (planning.priorite || 0) + 20,
      visite_originale_id: planning.id_planning,
      reprogrammee: true,
      semaine, annee,
      created_by: req.user.id,
      convocation_envoyee: false,
      source_planification: 'auto',
      source_originale: planning.source_originale || planning.source_planification
    });
    
    await Visite.create({
      matricule_agent: planning.matricule_agent,
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite,
      type_visite: planning.type_visite,
      id_planning: planning.id_planning,
      type_action: 'REPROGRAMMEE',
      ancien_statut: planning.statut,
      nouveau_statut: 'Reporté',
      motif_action: `Reprogrammation automatique vers ${nouvelleDateStr} à ${nouvelleHeure.substring(0,5)}`,
      details_action: JSON.stringify({ 
        source: 'auto', 
        ancienne_date: planning.date_visite, 
        nouvelle_date: nouvelleDateStr, 
        nouvelle_heure: nouvelleHeure,
        nouveau_planning_id: nouveauPlanning.id_planning, 
        creneau_original_bloque: true
      }),
      source: planning.source_planification === 'manuel' ? 'FORMULAIRE' : 'PLANNING',
      created_by: req.user.id,
      source_originale: planning.source_originale || planning.source_planification
    });
    
    res.json({
      success: true,
      message: `Visite reprogrammée automatiquement du ${planning.date_visite} vers le ${nouvelleDateStr} à ${nouvelleHeure.substring(0,5)}`,
      data: { 
        nouvelle_date: nouvelleDateStr, 
        nouvelle_heure: nouvelleHeure,
        agent: agent ? `${agent.nom} ${agent.prenom}` : null
      }
    });
  } catch (error) {
    console.error('❌ Erreur reprogrammation auto:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fonction de vérification complète des créneaux
async function verifierDisponibiliteCreneauComplete(date, heure, matriculeAgent, idExclu = null) {
  // 1. Vérifier si l'agent a déjà une visite CE JOUR (quel que soit le statut)
  const agentVisiteCeJour = await Planning.findOne({
    where: {
      matricule_agent: matriculeAgent,
      date_visite: date,
      id_planning: { [Op.ne]: idExclu || 0 }
    }
  });
  
  if (agentVisiteCeJour) {
    let raison = '';
    if (agentVisiteCeJour.visite_effectuee) raison = 'effectuée';
    else if (agentVisiteCeJour.statut === 'Annulé') raison = 'annulée';
    else if (agentVisiteCeJour.statut === 'Reporté') raison = 'reportée';
    else if (agentVisiteCeJour.reprogrammee) raison = 'reprogrammée';
    else raison = 'programmée';
    
    return {
      disponible: false,
      message: `❌ L'agent a déjà une visite ${raison} le ${new Date(date).toLocaleDateString('fr-FR')}`,
      raison: 'AGENT_DEJA_OCCUPE'
    };
  }
  
  // 2. Vérifier si le créneau est occupé par un autre agent
  const creneauOccupe = await Planning.findOne({
    where: {
      date_visite: date,
      heure_visite: heure,
      id_planning: { [Op.ne]: idExclu || 0 }
    }
  });
  
  if (creneauOccupe) {
    if (creneauOccupe.visite_effectuee) {
      return {
        disponible: false,
        message: `❌ Une visite a déjà été EFFECTUÉE sur ce créneau (${creneauOccupe.type_visite})`,
        raison: 'CRENEAU_EFFECTUE'
      };
    }
    if (creneauOccupe.statut === 'Annulé') {
      return {
        disponible: false,
        message: `❌ Une visite a été ANNULÉE sur ce créneau (${creneauOccupe.type_visite})`,
        raison: 'CRENEAU_ANNULE'
      };
    }
    if (creneauOccupe.statut === 'Reporté') {
      return {
        disponible: false,
        message: `⚠️ Une visite a été REPORTÉE sur ce créneau (${creneauOccupe.type_visite})`,
        raison: 'CRENEAU_REPORTE'
      };
    }
    if (creneauOccupe.creneau_bloque) {
      return {
        disponible: false,
        message: `🔒 Ce créneau est BLOQUÉ (ancienne visite reprogrammée)`,
        raison: 'CRENEAU_BLOQUE'
      };
    }
    if (creneauOccupe.reprogrammee) {
      return {
        disponible: false,
        message: `🔄 Ce créneau a été REPROGRAMMÉ`,
        raison: 'CRENEAU_REPROGRAMME'
      };
    }
    return {
      disponible: false,
      message: `📅 Ce créneau est déjà PROGRAMMÉ par un autre agent (${creneauOccupe.type_visite})`,
      raison: 'CRENEAU_OCCUPE'
    };
  }
  
  // 3. Vérifier si c'est un jour ouvré
  const dateObj = new Date(date);
  const estOuvre = await planningService.estJourOuvre(dateObj);
  if (!estOuvre) {
    return {
      disponible: false,
      message: `📅 Le ${new Date(date).toLocaleDateString('fr-FR')} n'est pas un jour ouvré`,
      raison: 'JOUR_NON_OUVRE'
    };
  }
  
  return {
    disponible: true,
    message: '✅ Créneau disponible',
    raison: null
  };
}
// ========== REPROGRAMMATION POUR INDISPONIBILITÉ (VERSION CORRIGÉE AVEC VÉRIFICATION COMPLÈTE) ==========
router.post('/planning/:id/reprogrammer-indisponible', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { nouvelle_date, nouvelle_heure, motif, mode = 'manuel' } = req.body;

    console.log('\n' + '='.repeat(70));
    console.log('🔄 INDISPONIBILITÉ - VÉRIFICATIONS + RÉAFFECTATION');
    console.log('='.repeat(70));

    const planningOriginal = await Planning.findByPk(id);
    if (!planningOriginal) {
      return res.status(404).json({ success: false, message: 'Planning non trouvé' });
    }

    const ancienneDate = planningOriginal.date_visite;
    const ancienneHeure = planningOriginal.heure_visite;
    const ancienMatricule = planningOriginal.matricule_agent;
    const typeVisite = planningOriginal.type_visite;
    const sourceOriginale = planningOriginal.source_originale || 'auto';

    const agentIndisponible = await Agent.findOne({
      where: { matricule_agent: ancienMatricule },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_affectation']
    });

    console.log(`👤 Agent indisponible: ${agentIndisponible?.nom} ${agentIndisponible?.prenom}`);
    console.log(`📅 Créneau original: ${ancienneDate} à ${ancienneHeure.substring(0,5)}`);

    // ========== VÉRIFICATION MODE MANUEL ==========
    if (mode === 'manuel' && nouvelle_date && nouvelle_heure) {
      const [creneauOccupe] = await sequelizeLocal.query(`
        SELECT p.*, a.nom, a.prenom 
        FROM planning p
        LEFT JOIN ${process.env.DB_GLOBAL_NAME}.agent a ON a.matricule_agent = p.matricule_agent
        WHERE p.date_visite = :date 
          AND p.heure_visite = :heure 
          AND p.id_planning != :idExclu
        LIMIT 1
      `, {
        replacements: { date: nouvelle_date, heure: nouvelle_heure, idExclu: id }
      });

      if (creneauOccupe && creneauOccupe.length > 0) {
        const c = creneauOccupe[0];
        if (c.visite_effectuee) {
          return res.status(409).json({ success: false, message: `❌ Une visite a déjà été EFFECTUÉE sur ce créneau` });
        }
        if (c.creneau_bloque) {
          return res.status(409).json({ success: false, message: `🔒 Ce créneau est BLOQUÉ` });
        }
        if (c.matricule_agent !== parseInt(ancienMatricule)) {
          return res.status(409).json({ success: false, message: `❌ Créneau déjà occupé par ${c.nom} ${c.prenom}` });
        }
      }

      const dateObj = new Date(nouvelle_date);
      if (!(await planningService.estJourOuvre(dateObj))) {
        return res.status(400).json({ success: false, message: 'Date non ouvrable' });
      }
    }

    // ========== CRÉER LA NOUVELLE VISITE POUR L'AGENT INDISPONIBLE ==========
    let nouvelleVisiteIndisponible = null;

    if (mode === 'manuel' && nouvelle_date && nouvelle_heure) {
      const dateObj = new Date(nouvelle_date);
      const semaine = planningService.getNumeroSemaine(dateObj);
      const annee = dateObj.getFullYear();
      
      nouvelleVisiteIndisponible = await Planning.create({
        matricule_agent: ancienMatricule,
        date_visite: nouvelle_date,
        heure_visite: nouvelle_heure,
        type_visite: typeVisite,
        statut: 'Programmé',
        priorite: 100,
        semaine, annee,
        created_by: req.user.id,
        convocation_envoyee: false,
        source_planification: 'manuel',
        source_originale: sourceOriginale,
        motif_reprogrammation: `Reprogrammé suite à indisponibilité - ${motif}`,
        visite_originale_id: planningOriginal.id_planning
      });
      
    } else if (mode === 'auto') {
      const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
      const maxJours = 14;
      const dateDepart = new Date(ancienneDate);
      dateDepart.setDate(dateDepart.getDate() + 1);
      const dateFin = new Date(dateDepart);
      dateFin.setDate(dateDepart.getDate() + maxJours);
      
      console.log(`🔍 Recherche créneau du ${dateDepart.toISOString().split('T')[0]} au ${dateFin.toISOString().split('T')[0]}`);
      
      const [tousPlannings] = await sequelizeLocal.query(`
        SELECT date_visite, heure_visite, matricule_agent, statut, visite_effectuee, creneau_bloque
        FROM planning 
        WHERE date_visite BETWEEN :dateDebut AND :dateFin
      `, {
        replacements: { 
          dateDebut: dateDepart.toISOString().split('T')[0],
          dateFin: dateFin.toISOString().split('T')[0]
        }
      });
      
      const planningMap = new Map();
      for (const p of tousPlannings) {
        const key = `${p.date_visite}|${p.heure_visite}`;
        planningMap.set(key, p);
      }
      
      const [visitesAgent] = await sequelizeLocal.query(`
        SELECT date_visite FROM planning 
        WHERE matricule_agent = :matricule 
          AND date_visite BETWEEN :dateDebut AND :dateFin
          AND statut = 'Programmé'
          AND visite_effectuee = 0
      `, {
        replacements: { 
          matricule: ancienMatricule,
          dateDebut: dateDepart.toISOString().split('T')[0],
          dateFin: dateFin.toISOString().split('T')[0]
        }
      });
      
      const datesAgentOccupees = new Set(visitesAgent.map(v => v.date_visite));
      
      let prochainCreneau = null;
      for (let i = 0; i <= maxJours; i++) {
        const dateTest = new Date(dateDepart);
        dateTest.setDate(dateDepart.getDate() + i);
        const dateStr = dateTest.toISOString().split('T')[0];
        
        if (!(await planningService.estJourOuvre(dateTest))) continue;
        if (datesAgentOccupees.has(dateStr)) continue;
        
        for (const heure of creneaux) {
          const key = `${dateStr}|${heure}`;
          const existing = planningMap.get(key);
          
          let libre = true;
          if (existing) {
            if (existing.visite_effectuee === true) libre = false;
            else if (existing.creneau_bloque === true) libre = false;
            else if (existing.statut === 'Annulé') libre = false;
            else if (existing.statut === 'Reporté') libre = false;
            else if (existing.statut === 'Effectué') libre = false;
            else if (existing.statut === 'Programmé' && existing.matricule_agent !== 0 && existing.matricule_agent !== parseInt(ancienMatricule)) libre = false;
          }
          
          if (libre) {
            prochainCreneau = { date: dateStr, heure: heure };
            console.log(`   ✅ Créneau trouvé: ${dateStr} à ${heure.substring(0,5)}`);
            break;
          }
        }
        if (prochainCreneau) break;
      }
      
      if (!prochainCreneau) {
        return res.status(409).json({ success: false, message: '❌ Aucun créneau disponible dans les 14 jours' });
      }
      
      const semaine = planningService.getNumeroSemaine(new Date(prochainCreneau.date));
      const annee = new Date(prochainCreneau.date).getFullYear();
      
      nouvelleVisiteIndisponible = await Planning.create({
        matricule_agent: ancienMatricule,
        date_visite: prochainCreneau.date,
        heure_visite: prochainCreneau.heure,
        type_visite: typeVisite,
        statut: 'Programmé',
        priorite: 100,
        semaine, annee,
        created_by: req.user.id,
        convocation_envoyee: false,
        source_planification: 'auto',
        source_originale: sourceOriginale,
        motif_reprogrammation: `Reprogrammation auto - ${motif}`,
        visite_originale_id: planningOriginal.id_planning
      });
    }

    // ========== TRACABILITÉ ==========
    await Visite.create({
      matricule_agent: ancienMatricule,
      date_visite: ancienneDate,
      heure_visite: ancienneHeure,
      type_visite: typeVisite,
      id_planning: planningOriginal.id_planning,
      type_action: 'ANNULEE',
      ancien_statut: planningOriginal.statut,
      nouveau_statut: 'Annulé',
      motif_action: `Annulation suite à indisponibilité - ${motif}`,
      details_action: JSON.stringify({ type: 'annulation_indisponibilite', agent: agentIndisponible?.nom }),
      source: 'PLANNING',
      created_by: req.user.id,
      source_originale: sourceOriginale
    });

    if (nouvelleVisiteIndisponible) {
      await Visite.create({
        matricule_agent: ancienMatricule,
        date_visite: nouvelleVisiteIndisponible.date_visite,
        heure_visite: nouvelleVisiteIndisponible.heure_visite,
        type_visite: typeVisite,
        id_planning: nouvelleVisiteIndisponible.id_planning,
        type_action: 'PROGRAMMATION',
        ancien_statut: null,
        nouveau_statut: 'Programmé',
        motif_action: `Nouvelle programmation suite indisponibilité - ${motif}`,
        details_action: JSON.stringify({ type: 'reprogrammation', nouvelle_date: nouvelleVisiteIndisponible.date_visite }),
        source: 'PLANNING',
        created_by: req.user.id,
        source_originale: sourceOriginale
      });
    }

    const ancienneDateSave = planningOriginal.date_visite;
    const ancienneHeureSave = planningOriginal.heure_visite;
    const ancienMatriculeSave = planningOriginal.matricule_agent;

    await db.local.Visite.destroy({ where: { id_planning: planningOriginal.id_planning } });
    await planningOriginal.destroy();

    // ========== RECHERCHE D'UN REMPLAÇANT AVEC VÉRIFICATION COMPLÈTE ==========
    let reaffectation = null;
    let nouveauPlanningRemplacement = null;

    if (typeVisite === 'Périodique') {
      console.log(`\n🔍 Recherche d'un remplaçant...`);

      const [creneauLibre] = await sequelizeLocal.query(`
        SELECT 1 FROM planning 
        WHERE date_visite = :date 
          AND heure_visite = :heure 
          AND (visite_effectuee = 1 OR creneau_bloque = 1 OR statut IN ('Annulé', 'Reporté'))
        LIMIT 1
      `, {
        replacements: { date: ancienneDateSave, heure: ancienneHeureSave }
      });

      if (!creneauLibre || creneauLibre.length === 0) {
        console.log(`✅ Créneau libre, recherche de remplaçant...`);
        
        // ⚡ VÉRIFICATION COMPLÈTE : L'agent ne doit avoir AUCUNE visite programmée (ni aujourd'hui, ni dans le futur)
        const [remplacants] = await sequelizeGlobal.query(`
          SELECT 
            a.matricule_agent as matricule,
            a.nom,
            a.prenom,
            a.code_affectation,
            a.code_agence,
            a.date_derniere_visite,
            a.periodicite_jours,
            (
              CASE WHEN a.date_derniere_visite IS NULL THEN 10000 ELSE 0 END +
              CASE WHEN a.code_affectation = 3 THEN 500 ELSE 0 END +
              GREATEST(0, DATEDIFF(CURDATE(), COALESCE(a.date_derniere_visite, '2000-01-01')) - 
                COALESCE(a.periodicite_jours, CASE WHEN a.code_affectation = 3 THEN 180 ELSE 365 END)) * 10
            ) as priorite
          FROM ${process.env.DB_GLOBAL_NAME}.agent a
          WHERE a.statut = 'actif'
            AND a.matricule_agent != :matriculeExclu
            
            -- ⚡ VÉRIFICATION CRITIQUE : L'agent n'a AUCUNE visite programmée dans le futur
            AND NOT EXISTS (
              SELECT 1 FROM ${process.env.DB_LOCAL_NAME}.planning p 
              WHERE p.matricule_agent = a.matricule_agent 
                AND p.date_visite >= CURDATE()
                AND p.statut = 'Programmé'
                AND p.visite_effectuee = 0
            )
            
            -- ⚡ Vérification supplémentaire : l'agent n'a PAS de visite CE JOUR précisément
            AND NOT EXISTS (
              SELECT 1 FROM ${process.env.DB_LOCAL_NAME}.planning p 
              WHERE p.matricule_agent = a.matricule_agent 
                AND p.date_visite = :dateCible
                AND p.statut = 'Programmé'
                AND p.visite_effectuee = 0
            )
            
            -- Vérification : l'agent n'est PAS en inaptitude
            AND (a.date_fin_inaptitude IS NULL OR a.date_fin_inaptitude < :dateCible)
            
          ORDER BY priorite DESC
          LIMIT 5
        `, {
          replacements: { 
            matriculeExclu: ancienMatriculeSave,
            dateCible: ancienneDateSave
          }
        });
        
        if (remplacants && remplacants.length > 0) {
          const meilleurRemplacant = remplacants[0];
          console.log(`   🏆 MEILLEUR REMPLAÇANT: ${meilleurRemplacant.nom} ${meilleurRemplacant.prenom}`);
          console.log(`   📊 Priorité: ${meilleurRemplacant.priorite}`);
          console.log(`   🚌 Poste: ${meilleurRemplacant.code_affectation === 3 ? 'Chauffeur' : 'Contrôleur'}`);
          console.log(`   📅 Dernière visite: ${meilleurRemplacant.date_derniere_visite || 'Jamais'}`);
          
          const semaine = planningService.getNumeroSemaine(new Date(ancienneDateSave));
          const annee = new Date(ancienneDateSave).getFullYear();
          
          nouveauPlanningRemplacement = await Planning.create({
            matricule_agent: meilleurRemplacant.matricule,
            date_visite: ancienneDateSave,
            heure_visite: ancienneHeureSave,
            type_visite: typeVisite,
            statut: 'Programmé',
            priorite: meilleurRemplacant.priorite || 100,
            semaine, annee,
            created_by: req.user.id,
            convocation_envoyee: false,
            source_planification: 'auto',
            source_originale: 'auto',
            motif_reprogrammation: `Réaffectation auto - Créneau libéré`
          });
          
          reaffectation = {
            agent: { 
              nom: meilleurRemplacant.nom, 
              prenom: meilleurRemplacant.prenom, 
              matricule: meilleurRemplacant.matricule,
              poste: meilleurRemplacant.code_affectation === 3 ? 'Chauffeur' : 'Contrôleur'
            }
          };
          
          await Visite.create({
            matricule_agent: meilleurRemplacant.matricule,
            date_visite: ancienneDateSave,
            heure_visite: ancienneHeureSave,
            type_visite: typeVisite,
            id_planning: nouveauPlanningRemplacement.id_planning,
            type_action: 'REAFFECTEE',
            ancien_statut: null,
            nouveau_statut: 'Programmé',
            motif_action: `Réaffectation auto - ${meilleurRemplacant.nom} ${meilleurRemplacant.prenom} remplace ${agentIndisponible?.nom} ${agentIndisponible?.prenom}`,
            details_action: JSON.stringify({
              agent_original: agentIndisponible?.nom,
              nouvel_agent: meilleurRemplacant.nom,
              date: ancienneDateSave,
              verification: "AUCUNE_VISITE_DANS_LE_FUTUR"
            }),
            source: 'PLANNING',
            created_by: req.user.id,
            source_originale: 'auto'
          });
          
          console.log(`✅ Réaffectation effectuée à ${meilleurRemplacant.nom} ${meilleurRemplacant.prenom}`);
        } else {
          console.log(`⚠️ Aucun remplaçant disponible (tous les agents ont déjà une visite programmée)`);
        }
      } else {
        console.log(`⚠️ Créneau non libre, réaffectation impossible`);
      }
    }

    let message = '';
    if (reaffectation) {
      message = `✅ Agent reprogrammé + Créneau réaffecté à ${reaffectation.agent.nom} ${reaffectation.agent.prenom}`;
    } else {
      message = `✅ Agent reprogrammé + Créneau libéré`;
    }

    res.json({
      success: true,
      message: message,
      data: {
        agent_reprogramme: nouvelleVisiteIndisponible ? {
          nouvelle_date: nouvelleVisiteIndisponible.date_visite,
          nouvelle_heure: nouvelleVisiteIndisponible.heure_visite.substring(0,5)
        } : null,
        reaffectation: reaffectation
      }
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== RÉAFFECTATION AUTOMATIQUE D'UN CRÉNEAU LIBÉRÉ ==========
router.post('/planning/reaffecter-automatique', protect, async (req, res) => {
  try {
    const { date_visite, heure_visite, type_visite, motif } = req.body;

    // ✅ 1. Vérification COMPLÈTE du créneau
    const creneauCible = await Planning.findOne({
      where: {
        date_visite: date_visite,
        heure_visite: heure_visite
      }
    });

    if (creneauCible) {
      // 🔴 VISITE DÉJÀ EFFECTUÉE
      if (creneauCible.visite_effectuee === true) {
        return res.status(409).json({ 
          success: false, 
          message: `❌ Créneau ${date_visite} ${heure_visite.substring(0,5)} a une visite EFFECTUÉE`
        });
      }
      // 🔴 CRÉNEAU BLOQUÉ
      if (creneauCible.creneau_bloque === true) {
        return res.status(409).json({ 
          success: false, 
          message: `❌ Créneau ${date_visite} ${heure_visite.substring(0,5)} est BLOQUÉ`
        });
      }
      // 🔴 VISITE ANNULÉE
      if (creneauCible.statut === 'Annulé') {
        return res.status(409).json({ 
          success: false, 
          message: `❌ Créneau ${date_visite} ${heure_visite.substring(0,5)} a une visite ANNULÉE`
        });
      }
      // 🔴 VISITE REPORTÉE
      if (creneauCible.statut === 'Reporté') {
        return res.status(409).json({ 
          success: false, 
          message: `❌ Créneau ${date_visite} ${heure_visite.substring(0,5)} a une visite REPORTÉE`
        });
      }
      // 🔴 OCCUPÉ PAR UN AUTRE AGENT
      if (creneauCible.statut === 'Programmé' && creneauCible.matricule_agent !== 0) {
        return res.status(409).json({ 
          success: false, 
          message: `❌ Créneau ${date_visite} ${heure_visite.substring(0,5)} est déjà PROGRAMMÉ`
        });
      }
    }

    // Récupérer tous les agents actifs
    const [agents] = await sequelizeGlobal.query(`
      SELECT 
        matricule_agent, nom, prenom, code_affectation, code_agence,
        date_derniere_visite, periodicite_jours, statut, date_fin_inaptitude
      FROM agent 
      WHERE statut = 'actif'
    `);

    const agentsEligibles = [];
    const dateCible = date_visite;
    const dateCibleObj = new Date(dateCible);
    const semaineCible = planningService.getNumeroSemaine(dateCibleObj);
    const anneeCible = dateCibleObj.getFullYear();

    for (const agent of agents) {
      // ✅ RÈGLE 1: L'agent ne doit pas avoir de visite CE JOUR
      const visiteCeJour = await Planning.findOne({
        where: {
          matricule_agent: agent.matricule_agent,
          date_visite: dateCible,
          statut: 'Programmé',
          visite_effectuee: false
        }
      });
      if (visiteCeJour) continue;
      
      // ✅ RÈGLE 2: L'agent ne doit pas avoir de visite dans la MÊME SEMAINE
      const visiteDansSemaine = await Planning.findOne({
        where: {
          matricule_agent: agent.matricule_agent,
          semaine: semaineCible,
          annee: anneeCible,
          statut: 'Programmé',
          visite_effectuee: false
        }
      });
      if (visiteDansSemaine) continue;

      // ✅ RÈGLE 3: L'agent ne doit pas être en INAPTITUDE
      if (agent.date_fin_inaptitude) {
        const dateFin = new Date(agent.date_fin_inaptitude);
        if (dateCibleObj <= dateFin) continue;
      }
      
      // ✅ RÈGLE 4: Vérifier la périodicité
      let periodicite = 365;
      let eligible = true;
      let joursDepuis = 0;
      let dateProchainePermise = null;
      
      if (agent.date_derniere_visite) {
        periodicite = agent.periodicite_jours || (agent.code_affectation === 3 ? 180 : 365);
        const dateDerniere = new Date(agent.date_derniere_visite);
        dateProchainePermise = new Date(dateDerniere);
        dateProchainePermise.setDate(dateDerniere.getDate() + periodicite);
        
        if (dateCibleObj < dateProchainePermise) {
          continue; // Agent non éligible
        }
        
        joursDepuis = Math.floor((dateCibleObj - dateDerniere) / (1000 * 60 * 60 * 24));
      }
      
      // Calcul de la priorité
      let priorite = 0;
      let raisons = [];
      
      if (!agent.date_derniere_visite) {
        priorite += 10000;
        raisons.push('Jamais visité');
      } else if (joursDepuis > periodicite) {
        const retard = joursDepuis - periodicite;
        priorite += Math.min(retard * 100, 5000);
        raisons.push(`En retard de ${retard} jours`);
      }
      
      if (agent.code_affectation === 3) {
        priorite += 500;
        raisons.push('Chauffeur');
      }
      
      agentsEligibles.push({
        matricule: agent.matricule_agent,
        nom: agent.nom,
        prenom: agent.prenom,
        poste: agent.code_affectation === 3 ? 'Chauffeur' : 'Contrôleur',
        agence: agent.code_agence,
        derniere_visite: agent.date_derniere_visite || 'Jamais',
        periodicite_texte: periodicite === 180 ? '6 mois' : '1 an',
        priorite: priorite,
        raisons: raisons
      });
    }

    agentsEligibles.sort((a, b) => b.priorite - a.priorite);

    res.json({
      success: true,
      agents: agentsEligibles,
      count: agentsEligibles.length
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== CONFIRMER RÉAFFECTATION AUTOMATIQUE ==========
router.post('/planning/confirmer-reaffectation-auto', protect, async (req, res) => {
  try {
    const { date_visite, heure_visite, matricule_agent, type_visite, motif } = req.body;

    // ✅ 1. Vérification COMPLÈTE du créneau
    const creneauCible = await Planning.findOne({
      where: {
        date_visite: date_visite,
        heure_visite: heure_visite
      }
    });

    if (creneauCible) {
      if (creneauCible.visite_effectuee === true) {
        return res.status(409).json({ success: false, message: `❌ Visite EFFECTUÉE sur ce créneau` });
      }
      if (creneauCible.creneau_bloque === true) {
        return res.status(409).json({ success: false, message: `❌ Créneau BLOQUÉ` });
      }
      if (creneauCible.statut === 'Annulé') {
        return res.status(409).json({ success: false, message: `❌ Visite ANNULÉE sur ce créneau` });
      }
      if (creneauCible.statut === 'Reporté') {
        return res.status(409).json({ success: false, message: `❌ Visite REPORTÉE sur ce créneau` });
      }
      if (creneauCible.statut === 'Programmé' && creneauCible.matricule_agent !== 0) {
        return res.status(409).json({ success: false, message: `❌ Créneau déjà PROGRAMMÉ` });
      }
    }

    // ✅ 2. Vérification COMPLÈTE de l'agent
    const agent = await Agent.findOne({
      where: { matricule_agent: matricule_agent },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_affectation', 
                   'date_derniere_visite', 'periodicite_jours', 'date_fin_inaptitude', 'statut']
    });

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent non trouvé' });
    }

    if (agent.statut !== 'actif') {
      return res.status(409).json({ success: false, message: `Agent ${agent.nom} ${agent.prenom} n'est pas actif` });
    }

    const dateObj = new Date(date_visite);
    const semaineCible = planningService.getNumeroSemaine(dateObj);
    const anneeCible = dateObj.getFullYear();

    // Vérifier visite CE JOUR
    const visiteCeJour = await Planning.findOne({
      where: {
        matricule_agent: matricule_agent,
        date_visite: date_visite,
        statut: 'Programmé',
        visite_effectuee: false
      }
    });
    if (visiteCeJour) {
      return res.status(409).json({ success: false, message: `Agent a déjà une visite le ${date_visite}` });
    }

    // Vérifier visite dans la MÊME SEMAINE
    const visiteDansSemaine = await Planning.findOne({
      where: {
        matricule_agent: matricule_agent,
        semaine: semaineCible,
        annee: anneeCible,
        statut: 'Programmé',
        visite_effectuee: false
      }
    });
    if (visiteDansSemaine) {
      return res.status(409).json({ success: false, message: `Agent a déjà une visite dans la semaine ${semaineCible}` });
    }

    // Vérifier inaptitude
    if (agent.date_fin_inaptitude) {
      const dateFin = new Date(agent.date_fin_inaptitude);
      if (dateObj <= dateFin) {
        return res.status(409).json({ success: false, message: `Agent en inaptitude jusqu'au ${dateFin.toLocaleDateString('fr-FR')}` });
      }
    }

    // Vérifier périodicité
    const periodicite = agent.periodicite_jours || (agent.code_affectation === 3 ? 180 : 365);
    if (agent.date_derniere_visite) {
      const dateDerniere = new Date(agent.date_derniere_visite);
      const dateProchainePermise = new Date(dateDerniere);
      dateProchainePermise.setDate(dateDerniere.getDate() + periodicite);
      if (dateObj < dateProchainePermise) {
        return res.status(409).json({ success: false, message: `Périodicité non respectée` });
      }
    }

    // Supprimer l'ancien placeholder
    await Planning.destroy({
      where: {
        date_visite: date_visite,
        heure_visite: heure_visite,
        matricule_agent: 0
      }
    });

    // Créer le nouveau planning
    const semaine = planningService.getNumeroSemaine(dateObj);
    const annee = dateObj.getFullYear();

    const nouveauPlanning = await Planning.create({
      matricule_agent: matricule_agent,
      date_visite: date_visite,
      heure_visite: heure_visite,
      type_visite: type_visite || 'Périodique',
      statut: 'Programmé',
      priorite: 150,
      semaine, annee,
      created_by: req.user.id,
      convocation_envoyee: false,
      source_planification: 'auto',
      source_originale: 'auto',
      motif_reprogrammation: `Réaffectation auto - ${motif || 'Aucun motif'}`
    });

    // Traçabilité
    await Visite.create({
      matricule_agent: matricule_agent,
      date_visite: date_visite,
      heure_visite: heure_visite,
      type_visite: type_visite || 'Périodique',
      id_planning: nouveauPlanning.id_planning,
      type_action: 'REAFFECTEE',
      ancien_statut: null,
      nouveau_statut: 'Programmé',
      motif_action: `Réaffectation automatique`,
      details_action: JSON.stringify({
        type: 'reaffectation_auto',
        agent: agent.nom + ' ' + agent.prenom,
        date: date_visite,
        verifications: 'toutes_passées'
      }),
      source: 'PLANNING',
      created_by: req.user.id,
      source_originale: 'auto'
    });

    res.json({
      success: true,
      message: `✅ Visite réaffectée à ${agent.nom} ${agent.prenom}`,
      planning: nouveauPlanning
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// backend/routes/visiteRoutes.js

router.post('/planning/confirmer-reaffectation', protect, async (req, res) => {
  try {
    const { date_visite, heure_visite, matricule_agent, type_visite, motif } = req.body;

    console.log('\n🔍 VÉRIFICATION RÉAFFECTATION');
    console.log(`   Date cible: ${date_visite} ${heure_visite}`);
    console.log(`   Agent cible: ${matricule_agent}`);

    // ============================================================
    // VÉRIFICATION 1 : LE CRÉNEAU CIBLE
    // ============================================================
    
    const creneauCible = await Planning.findOne({
      where: {
        date_visite: date_visite,
        heure_visite: heure_visite
      }
    });

    if (creneauCible) {
      // 🔴 CAS 1 : Visite déjà EFFECTUÉE (c'est votre cas ligne 929)
      if (creneauCible.visite_effectuee === true) {
        const agentEffectue = await Agent.findByPk(creneauCible.matricule_agent);
        return res.status(409).json({ 
          success: false, 
          code: 'CRENEAU_EFFECTUE',
          message: `❌ RÉAFFECTATION IMPOSSIBLE : Le créneau du ${date_visite} à ${heure_visite.substring(0,5)} a une visite EFFECTUÉE par l'agent ${agentEffectue?.nom} ${agentEffectue?.prenom} le ${date_visite}.`
        });
      }
      
      // 🔴 CAS 2 : Créneau BLOQUÉ
      if (creneauCible.creneau_bloque === true) {
        return res.status(409).json({ 
          success: false, 
          code: 'CRENEAU_BLOQUE',
          message: `❌ RÉAFFECTATION IMPOSSIBLE : Le créneau du ${date_visite} à ${heure_visite.substring(0,5)} est BLOQUÉ.`
        });
      }
      
      // 🔴 CAS 3 : Visite ANNULÉE
      if (creneauCible.statut === 'Annulé') {
        return res.status(409).json({ 
          success: false, 
          code: 'CRENEAU_ANNULE',
          message: `❌ RÉAFFECTATION IMPOSSIBLE : Une visite a été ANNULÉE sur ce créneau.`
        });
      }
      
      // 🔴 CAS 4 : Visite REPORTÉE
      if (creneauCible.statut === 'Reporté') {
        return res.status(409).json({ 
          success: false, 
          code: 'CRENEAU_REPORTE',
          message: `❌ RÉAFFECTATION IMPOSSIBLE : Une visite a été REPORTÉE sur ce créneau.`
        });
      }
      
      // 🔴 CAS 5 : Créneau occupé par un AUTRE agent
      if (creneauCible.matricule_agent !== 0 && 
          creneauCible.matricule_agent !== parseInt(matricule_agent)) {
        const autreAgent = await Agent.findByPk(creneauCible.matricule_agent);
        return res.status(409).json({ 
          success: false, 
          code: 'CRENEAU_OCCUPE',
          message: `❌ RÉAFFECTATION IMPOSSIBLE : Le créneau est déjà occupé par ${autreAgent?.nom} ${autreAgent?.prenom} (${creneauCible.type_visite}).`
        });
      }
    }

    // ============================================================
    // VÉRIFICATION 2 : L'AGENT CIBLE
    // ============================================================
    
    const agent = await Agent.findOne({
      where: { matricule_agent: matricule_agent }
    });

    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent non trouvé' });
    }

    // 🔴 Vérifier si l'agent a une visite CE JOUR (c'est votre cas ligne 911)
    const visiteCeJour = await Planning.findOne({
      where: {
        matricule_agent: matricule_agent,
        date_visite: date_visite,
        statut: 'Programmé',
        visite_effectuee: false
      }
    });

    if (visiteCeJour) {
      return res.status(409).json({ 
        success: false, 
        code: 'AGENT_OCCUPE_CE_JOUR',
        message: `❌ RÉAFFECTATION IMPOSSIBLE : L'agent ${agent.nom} ${agent.prenom} a déjà une visite (${visiteCeJour.type_visite}) le ${date_visite} à ${visiteCeJour.heure_visite.substring(0,5)}.`
      });
    }

    // 🔴 Vérifier si l'agent a une visite dans la MÊME SEMAINE
    const dateObj = new Date(date_visite);
    const semaineCible = planningService.getNumeroSemaine(dateObj);
    const anneeCible = dateObj.getFullYear();
    
    const visiteDansSemaine = await Planning.findAll({
      where: {
        matricule_agent: matricule_agent,
        semaine: semaineCible,
        annee: anneeCible,
        statut: 'Programmé',
        visite_effectuee: false
      }
    });

    if (visiteDansSemaine.length > 0) {
      const dates = visiteDansSemaine.map(v => `${v.date_visite} à ${v.heure_visite.substring(0,5)}`).join(', ');
      return res.status(409).json({ 
        success: false, 
        code: 'AGENT_OCCUPE_SEMAINE',
        message: `❌ RÉAFFECTATION IMPOSSIBLE : L'agent ${agent.nom} ${agent.prenom} a déjà ${visiteDansSemaine.length} visite(s) dans la SEMAINE ${semaineCible} : ${dates}.`
      });
    }

    // 🔴 Vérifier si l'agent est en INAPTITUDE
    if (agent.date_fin_inaptitude) {
      const dateFin = new Date(agent.date_fin_inaptitude);
      const dateTest = new Date(date_visite);
      if (dateTest <= dateFin) {
        return res.status(409).json({ 
          success: false, 
          code: 'AGENT_INAPTITUDE',
          message: `❌ RÉAFFECTATION IMPOSSIBLE : L'agent ${agent.nom} ${agent.prenom} est en inaptitude jusqu'au ${dateFin.toLocaleDateString('fr-FR')}.`
        });
      }
    }

    // 🔴 Vérifier la PÉRIODICITÉ
    const periodicite = agent.periodicite_jours || (agent.code_affectation === 3 ? 180 : 365);
    if (agent.date_derniere_visite) {
      const dateDerniere = new Date(agent.date_derniere_visite);
      const dateProchainePermise = new Date(dateDerniere);
      dateProchainePermise.setDate(dateDerniere.getDate() + periodicite);
      const dateCible = new Date(date_visite);
      
      if (dateCible < dateProchainePermise) {
        return res.status(409).json({ 
          success: false, 
          code: 'PERIODICITE_NON_RESPECTEE',
          message: `❌ RÉAFFECTATION IMPOSSIBLE : Périodicité non respectée pour ${agent.nom} ${agent.prenom}. Prochaine visite possible à partir du ${dateProchainePermise.toLocaleDateString('fr-FR')}.`
        });
      }
    }

    // ============================================================
    // SI ON ARRIVE ICI, TOUT EST OK
    // ============================================================
    
    console.log(`✅ Toutes les vérifications sont passées !`);

    // Supprimer l'ancien placeholder si existe
    await Planning.destroy({
      where: {
        date_visite: date_visite,
        heure_visite: heure_visite,
        matricule_agent: 0
      }
    });

    // Créer le nouveau planning
    const semaine = planningService.getNumeroSemaine(dateObj);
    const annee = dateObj.getFullYear();

    const nouveauPlanning = await Planning.create({
      matricule_agent: matricule_agent,
      date_visite: date_visite,
      heure_visite: heure_visite,
      type_visite: type_visite || 'Périodique',
      statut: 'Programmé',
      priorite: 100,
      semaine, annee,
      created_by: req.user.id,
      convocation_envoyee: false,
      source_planification: 'manuel',
      source_originale: 'auto',
      motif_reprogrammation: motif || `Réaffectation - ${agent.nom} ${agent.prenom}`
    });

    // Historique
    await Visite.create({
      matricule_agent: matricule_agent,
      date_visite: date_visite,
      heure_visite: heure_visite,
      type_visite: type_visite || 'Périodique',
      id_planning: nouveauPlanning.id_planning,
      type_action: 'REAFFECTEE',
      ancien_statut: null,
      nouveau_statut: 'Programmé',
      motif_action: `Réaffectation - ${agent.nom} ${agent.prenom}`,
      details_action: JSON.stringify({
        type: 'reaffectation',
        agent: `${agent.nom} ${agent.prenom}`,
        date: date_visite,
        heure: heure_visite,
        toutes_verifications_passees: true
      }),
      source: 'PLANNING',
      created_by: req.user.id,
      source_originale: 'auto'
    });

    const planningWithAgent = { ...nouveauPlanning.toJSON(), planningAgent: agent };

    res.json({
      success: true,
      message: `✅ Visite réaffectée à ${agent.nom} ${agent.prenom} le ${date_visite} à ${heure_visite.substring(0,5)}`,
      planning: planningWithAgent
    });

  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== PLANIFICATION MANUELLE RECLASSEMENT ==========
router.post('/planifier-reclassement', protect, async (req, res) => {
  try {
    const { matricule_agent, date_visite, heure_visite, motif } = req.body;
    
    if (!matricule_agent) return res.status(400).json({ success: false, message: 'Matricule agent requis' });
    if (!date_visite) return res.status(400).json({ success: false, message: 'Date de visite requise' });

    const agent = await Agent.findByPk(matricule_agent);
    if (!agent) return res.status(404).json({ success: false, message: 'Agent non trouvé' });

    const heureFinale = heure_visite || '09:00:00';
    const dateObj = new Date(date_visite);

    if (!(await planningService.estJourOuvre(dateObj))) {
      return res.status(400).json({ 
        success: false, 
        message: `La date du ${date_visite} n'est pas un jour ouvré.` 
      });
    }

    const creneauOccupe = await Planning.findOne({
      where: { date_visite: date_visite, heure_visite: heureFinale, statut: 'Programmé' }
    });

    if (creneauOccupe) {
      return res.status(409).json({ success: false, message: `❌ Le créneau du ${date_visite} à ${heureFinale.substring(0,5)} est déjà occupé.` });
    }

    const creneauBloque = await Planning.findOne({
      where: { date_visite: date_visite, heure_visite: heureFinale, creneau_bloque: true }
    });

    if (creneauBloque) {
      return res.status(409).json({ success: false, message: `🔒 Le créneau du ${date_visite} à ${heureFinale.substring(0,5)} est BLOQUÉ.` });
    }

    const agentDejaOccupe = await Planning.findOne({
      where: {
        matricule_agent: matricule_agent,
        date_visite: date_visite,
        statut: 'Programmé',
        visite_effectuee: false
      }
    });

    if (agentDejaOccupe) {
      return res.status(409).json({ 
        success: false, 
        message: `⚠️ L'agent ${agent.nom} ${agent.prenom} a déjà une visite le ${date_visite}.` 
      });
    }

    const planning = await Planning.create({
      matricule_agent, date_visite, heure_visite: heureFinale,
      type_visite: 'Reclassement', statut: 'Programmé', priorite: 200,
      semaine: planningService.getNumeroSemaine(new Date(date_visite)),
      annee: new Date(date_visite).getFullYear(), created_by: req.user.id,
      convocation_envoyee: false, motif_reprogrammation: motif || 'Visite de reclassement programmée manuellement',
      source_planification: 'manuel',source_originale: 'manuel'
    });
    
    
    await Visite.create({
      matricule_agent, date_visite, heure_visite: heureFinale,
      type_visite: 'Reclassement', id_planning: planning.id_planning,
      type_action: 'SAISIE_MANUELLE', nouveau_statut: 'Programmé',
      motif_action: `Planification manuelle - Reclassement${motif ? ' - ' + motif : ''}`,
      details_action: JSON.stringify({ source: 'manuel', motif }), 
      source: 'FORMULAIRE', created_by: req.user.id,source_originale: planning.source_originale || planning.source_planification
    });
    
    res.json({ success: true, message: 'Visite de reclassement planifiée', planning });
  } catch (error) {
    console.error('❌ Erreur planification reclassement:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== PLANIFICATION MANUELLE EMBAUCHE ==========
router.post('/planifier-embauche', protect, async (req, res) => {
  try {
    const { matricule_agent, date_visite, heure_visite, motif } = req.body;
    
    if (!matricule_agent) return res.status(400).json({ success: false, message: 'Matricule agent requis' });
    if (!date_visite) return res.status(400).json({ success: false, message: 'Date de visite requise' });

    const agent = await Agent.findByPk(matricule_agent);
    if (!agent) return res.status(404).json({ success: false, message: 'Agent non trouvé' });

    const heureFinale = heure_visite || '09:00:00';
    const dateObj = new Date(date_visite);

    if (!(await planningService.estJourOuvre(dateObj))) {
      return res.status(400).json({ 
        success: false, 
        message: `La date du ${date_visite} n'est pas un jour ouvré (Mardi à Vendredi, hors jours fériés).` 
      });
    }

    const creneauOccupe = await Planning.findOne({
      where: { 
        date_visite: date_visite, 
        heure_visite: heureFinale, 
        statut: 'Programmé' 
      }
    });

    if (creneauOccupe) {
      const agentExistant = await Agent.findOne({ 
        where: { matricule_agent: creneauOccupe.matricule_agent },
        attributes: ['nom', 'prenom']
      });
      const nomAgent = agentExistant ? `${agentExistant.nom} ${agentExistant.prenom}` : `Agent #${creneauOccupe.matricule_agent}`;
      
      return res.status(409).json({ 
        success: false, 
        message: `❌ Le créneau du ${date_visite} à ${heureFinale.substring(0,5)} est déjà occupé par ${nomAgent} (${creneauOccupe.type_visite}).` 
      });
    }

    const creneauBloque = await Planning.findOne({
      where: { 
        date_visite: date_visite, 
        heure_visite: heureFinale, 
        creneau_bloque: true 
      }
    });

    if (creneauBloque) {
      return res.status(409).json({ 
        success: false, 
        message: `🔒 Le créneau du ${date_visite} à ${heureFinale.substring(0,5)} est BLOQUÉ.` 
      });
    }

    const agentDejaOccupe = await Planning.findOne({
      where: {
        matricule_agent: matricule_agent,
        date_visite: date_visite,
        statut: 'Programmé',
        visite_effectuee: false
      }
    });

    if (agentDejaOccupe) {
      return res.status(409).json({ 
        success: false, 
        message: `⚠️ L'agent ${agent.nom} ${agent.prenom} a déjà une visite de type "${agentDejaOccupe.type_visite}" prévue le ${date_visite}.` 
      });
    }

    const planning = await Planning.create({
      matricule_agent, 
      date_visite, 
      heure_visite: heureFinale,
      type_visite: 'Embauche', 
      statut: 'Programmé', 
      priorite: 200,
      semaine: planningService.getNumeroSemaine(new Date(date_visite)),
      annee: new Date(date_visite).getFullYear(), 
      created_by: req.user.id,
      convocation_envoyee: false, 
      motif_reprogrammation: motif || "Visite d'embauche programmée manuellement",
      source_planification: 'manuel',
      source_originale: 'manuel'
    });
    
    
    await Visite.create({
      matricule_agent, 
      date_visite, 
      heure_visite: heureFinale,
      type_visite: 'Embauche', 
      id_planning: planning.id_planning,
      type_action: 'SAISIE_MANUELLE', 
      nouveau_statut: 'Programmé',
      motif_action: `Planification manuelle - Embauche${motif ? ' - ' + motif : ''}`,
      details_action: JSON.stringify({ 
        source: 'manuel', 
        motif,
        verification: {
          jour_ouvre: true,
          creneau_libre: true,
          agent_disponible: true
        }
      }), 
      source: 'FORMULAIRE', 
      created_by: req.user.id,
      source_originale: planning.source_originale || planning.source_planification
    });
    
    res.json({ 
      success: true, 
      message: `Visite d'embauche planifiée pour ${agent.nom} ${agent.prenom} le ${date_visite} à ${heureFinale.substring(0,5)}`, 
      planning 
    });
  } catch (error) {
    console.error("❌ Erreur planification embauche:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/planning/toutes-convocations', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50, statut = 'all', type = 'all', dateDebut, dateFin } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let whereClause = {};
    
    if (statut === 'envoyee') {
      whereClause.convocation_envoyee = true;
    } else if (statut === 'non_envoyee') {
      whereClause.convocation_envoyee = false;
    }
    
    if (type !== 'all') {
      whereClause.type_visite = type;
    }
    
    if (dateDebut && dateFin) {
      whereClause.date_visite = { [Op.between]: [dateDebut, dateFin] };
    }
    
    const { count, rows } = await Planning.findAndCountAll({
      where: whereClause,
      include: [{
        model: Agent,
        as: 'planningAgent',
        attributes: ['nom', 'prenom', 'matricule_agent', 'code_agence', 'code_affectation']
      }],
      order: [['date_visite', 'DESC'], ['heure_visite', 'ASC']],
      limit: parseInt(limit),
      offset: offset
    });
    
    res.json({
      success: true,
      convocations: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit))
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== CONVOCATIONS ==========
router.get('/planning/convocations-a-envoyer', protect, async (req, res) => {
  try {
    const plannings = await Planning.findAll({
      where: {
        convocation_envoyee: false, 
        statut: 'Programmé'
      },
      order: [['date_visite', 'ASC'], ['heure_visite', 'ASC']], 
      raw: true
    });
    
    if (plannings.length === 0) return res.json({ success: true, convocations: [], count: 0 });
    
    const matricules = [...new Set(plannings.map(p => p.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'], 
      raw: true
    });
    
    const agentsMap = new Map();
    agents.forEach(agent => agentsMap.set(agent.matricule_agent, { ...agent, code_affectation: normaliserCodeAffectation(agent.code_affectation) }));
    
    const planningsEnrichis = plannings.map(p => ({ ...p, planningAgent: agentsMap.get(p.matricule_agent) || null }));
    res.json({ success: true, convocations: planningsEnrichis, count: planningsEnrichis.length });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route pour envoyer une convocation
router.post('/planning/envoyer-convocation', protect, async (req, res) => {
  try {
    const { id_planning } = req.body;
    if (!id_planning) return res.status(400).json({ success: false, message: 'ID planning requis' });
    
    const userNom = `${req.user.Login || req.user.email}`;
    const result = await convocationService.envoyerConvocationPlanning(
      id_planning, 
      req.user.id, 
      req.user.email,
      userNom
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

//Route pour envoyer des convocations groupées
router.post('/planning/envoyer-convocations-groupees', protect, async (req, res) => {
  try {
    const { ids_planning } = req.body;
    if (!ids_planning || !Array.isArray(ids_planning) || ids_planning.length === 0) {
      return res.status(400).json({ success: false, message: "Liste d'IDs planning requise" });
    }
    
    const userNom = `${req.user.Login || req.user.email}`;
    const result = await convocationService.envoyerConvocationsGroupees(
      ids_planning, 
      req.user.id, 
      req.user.email,
      userNom
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// ========== STATISTIQUES CONVOCATIONS ==========
router.get('/planning/convocations-stats', protect, async (req, res) => {
  try {
    console.log('📊 Calcul des stats convocations...');
    
    const [totalEnvoyees] = await sequelizeLocal.query(`
      SELECT COUNT(*) as total FROM convocations_log
    `);
    
    const [totalAEnvoyer] = await sequelizeLocal.query(`
      SELECT COUNT(*) as total FROM planning 
      WHERE convocation_envoyee = 0 
        AND statut = 'Programmé'
        AND type_visite IN ('Périodique', 'Reprise')
        AND date_visite >= CURDATE()
    `);
    
    const [aEnvoyerJ7] = await sequelizeLocal.query(`
      SELECT COUNT(*) as total FROM planning 
      WHERE convocation_envoyee = 0 
        AND statut = 'Programmé' 
        AND type_visite IN ('Périodique', 'Reprise')
        AND date_visite = DATE_ADD(CURDATE(), INTERVAL 7 DAY)
    `);
    
    const [envoyeesSemaine] = await sequelizeLocal.query(`
      SELECT COUNT(*) as total FROM convocations_log
      WHERE date_convocation >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    `);
    
    const stats = {
        total_envoyees: totalEnvoyees[0]?.total || 0,
      total_a_envoyer: totalAEnvoyer[0]?.total || 0,
      a_envoyer_j7: aEnvoyerJ7[0]?.total || 0,
        total_envoyees_semaine: envoyeesSemaine[0]?.total || 0
    };
    
    console.log('📊 Stats:', stats);
    res.json({ success: true, stats });
    
  } catch (error) {
    console.error('❌ Erreur stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== HISTORIQUE CONVOCATIONS ==========

router.get('/convocations/historique', protect, async (req, res) => {
  try {
    console.log('📊 Récupération historique convocations...');
    console.log('🔍 Query params reçus:', req.query);
    
    const { limit = 50, date_convocation, date_visite, type_visite, matricule_agent } = req.query;
    
    let sql = `
      SELECT 
        cl.id_log,
        cl.id_planning,
        cl.matricule_agent,
        cl.date_convocation,
        DATE_FORMAT(cl.date_visite, '%Y-%m-%d') as date_visite,
        cl.heure_visite,
        cl.type_visite,
        cl.envoyee_par,
        cl.envoyee_par_nom,
        cl.destinataire,
        a.nom as agent_nom,
        a.prenom as agent_prenom,
        a.code_agence
      FROM convocations_log cl
      LEFT JOIN ${process.env.DB_GLOBAL_NAME}.agent a ON a.matricule_agent = cl.matricule_agent
      WHERE 1=1
    `;
    
    let replacements = [];
    
    // ✅ Filtre par date de convocation (comparaison sur DATE uniquement)
    if (date_convocation && date_convocation !== '') {
      sql += ` AND DATE(cl.date_convocation) = ?`;
      replacements.push(date_convocation);
      console.log('📅 Filtre date convocation:', date_convocation);
    }
    
    // ✅ Filtre par date de visite
    if (date_visite && date_visite !== '') {
      sql += ` AND cl.date_visite = ?`;
      replacements.push(date_visite);
      console.log('📅 Filtre date visite:', date_visite);
    }
    
    // ✅ Filtre par type de visite
    if (type_visite && type_visite !== 'all') {
      sql += ` AND cl.type_visite = ?`;
      replacements.push(type_visite);
      console.log('📋 Filtre type visite:', type_visite);
    }
    
    // ✅ Filtre par matricule agent
    if (matricule_agent && matricule_agent !== 'all' && matricule_agent !== '') {
      sql += ` AND cl.matricule_agent = ?`;
      replacements.push(parseInt(matricule_agent));
      console.log('👤 Filtre agent:', matricule_agent);
    }
    
    sql += ` ORDER BY cl.date_convocation DESC LIMIT ${parseInt(limit)}`;
    
    console.log('📝 SQL:', sql);
    console.log('📦 Replacements:', replacements);
    
    const [historique] = await sequelizeLocal.query(sql, { replacements });
    
    console.log(`📊 ${historique.length} convocations trouvées`);
    
    res.json({ 
      success: true, 
      historique: historique,
      total: historique.length 
    });
    
  } catch (error) {
    console.error('❌ Erreur historique:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== STATISTIQUES VISITES ==========
router.get('/visites/stats', protect, async (req, res) => {
  try {
    // ✅ Compter TOUTES les visites (pas seulement celles avec résultat)
    const total = await Visite.count();
    
    // ✅ Compter les visites effectuées avec résultat APTE
    const aptes = await Visite.count({ 
      where: { 
        type_action: 'EFFECTUEE',
        resultat: 'Apte' 
      } 
    });
    
    // ✅ Compter les visites effectuées avec résultat INAPTE TEMPORAIRE
    const inaptesTemp = await Visite.count({ 
      where: { 
        type_action: 'EFFECTUEE',
        resultat: 'Inapte temporaire' 
      } 
    });
    
    // ✅ Compter les visites effectuées avec résultat INAPTE DÉFINITIF
    const inaptesDef = await Visite.count({ 
      where: { 
        type_action: 'EFFECTUEE',
        resultat: 'Inapte définitif' 
      } 
    });
    
    const inaptes = inaptesTemp + inaptesDef;
    
    // ✅ Stats par type de visite
    const parType = await Visite.findAll({
      attributes: [
        'type_visite',
        [Visite.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['type_visite'],
      raw: true
    });
    
    // ✅ Stats par résultat
    const parResultat = await Visite.findAll({
      where: { type_action: 'EFFECTUEE' },
      attributes: [
        'resultat',
        [Visite.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['resultat'],
      raw: true
    });
    
    console.log(`📊 Stats: total=${total}, aptes=${aptes}, inaptes=${inaptes}`);
    
    res.json({
      success: true,
      stats: {
        total,
        aptes,
        inaptes,
        parType: parType.map(p => ({ type: p.type_visite, count: p.count })),
        parResultat: parResultat.map(r => ({ resultat: r.resultat, count: r.count }))
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/visites/stats-globales', protect, async (req, res) => {
  try {
    const total = await Visite.count();
    const planningTotal = await Planning.count();
    const formTotal = await Visite.count({ where: { source: 'FORMULAIRE' } });
    const planningActions = await Visite.count({ where: { source: 'PLANNING' } });
    
    res.json({ success: true, stats: { total_visites: total, planning_total: planningTotal, formulaire_total: formTotal, planning_actions: planningActions } });
  } catch (error) {
    console.error('❌ Erreur stats globales:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/planning/debug/affectations', protect, async (req, res) => {
  try {
    const agents = await Agent.findAll({ attributes: ['matricule_agent', 'nom', 'prenom', 'code_affectation'], raw: true });
    const stats = {
      total: agents.length,
      chauffeurs_code_3: agents.filter(a => a.code_affectation === 3).length,
      controleurs_code_5: agents.filter(a => a.code_affectation === 5).length,
      nuls: agents.filter(a => a.code_affectation === null).length
    };
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});


// ========== HISTORIQUE COMPLET PAR AGENT ==========

router.get('/historique/agent/:matricule', protect, async (req, res) => {
  try {
    const { matricule } = req.params;
    const { sequelizeLocal, sequelizeGlobal } = require('../config/database');
    
    // Récupérer l'agent
    const [agentInfo] = await sequelizeGlobal.query(`
      SELECT matricule_agent, nom, prenom, code_agence, code_affectation
      FROM agent
      WHERE matricule_agent = ${parseInt(matricule)}
    `);
    
    // ✅ Historique complet de l'agent (les deux sources)
    let sql = `SELECT v.* FROM visite v WHERE v.matricule_agent = ${parseInt(matricule)}`;
    sql += ` ORDER BY v.created_at DESC LIMIT 500`;
    
    const [historique] = await sequelizeLocal.query(sql);
    
    // Parser les détails
    const result = historique.map(item => {
      let details = {};
      try {
        if (item.details_action) {
          let str = item.details_action;
          if (str.startsWith('"') && str.endsWith('"')) str = str.slice(1, -1);
          str = str.replace(/\\"/g, '"');
          details = JSON.parse(str);
        }
      } catch(e) { details = {}; }
      return { ...item, details };
    });
    
    // Statistiques
    const stats = {
      total: result.length,
      auto: result.filter(a => a.source_originale === 'auto').length,
      manuel: result.filter(a => a.source_originale === 'manuel').length,
      effectuees: result.filter(a => a.type_action === 'EFFECTUEE').length,
      reprogrammations: result.filter(a => a.type_action === 'REPROGRAMMEE').length,
      annulations: result.filter(a => a.type_action === 'ANNULEE').length,
      reaffectations: result.filter(a => a.type_action === 'REAFFECTEE').length
    };
    
    res.json({ 
      success: true, 
      agent: agentInfo[0] || null,
      historique: result,
      stats: stats,
      total: result.length
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== RÉCUPÉRER LES VISITES PASSÉES SANS ACTION ==========

router.get('/visites-passees-sans-action', protect, async (req, res) => {
  try {
    const { sequelizeLocal } = require('../config/database');
    
    const [visites] = await sequelizeLocal.query(`
      SELECT 
        p.id_planning,
        p.matricule_agent,
        p.date_visite,
        p.type_visite,
        p.statut,
        p.visite_effectuee,
        DATEDIFF(CURDATE(), p.date_visite) as jours_retard
      FROM planning p
      WHERE p.date_visite < CURDATE()
        AND p.visite_effectuee = 0
        AND p.statut = 'Programmé'
        AND p.type_visite IN ('Périodique', 'Reprise')
      ORDER BY p.date_visite DESC
    `);
    
    // S'il n'y a pas de visites, retourner un tableau vide
    if (!visites || visites.length === 0) {
      return res.json({ success: true, visites: [], count: 0 });
    }
    
    // Récupérer les agents
    const matricules = visites.map(v => v.matricule_agent).join(',');
    const { sequelizeGlobal } = require('../config/database');
    const [agents] = await sequelizeGlobal.query(`
      SELECT matricule_agent, nom, prenom
      FROM agent
      WHERE matricule_agent IN (${matricules})
    `);
    
    const agentsMap = new Map();
    agents.forEach(a => agentsMap.set(a.matricule_agent, a));
    
    const visitesEnrichies = visites.map(v => ({
      ...v,
      agent: agentsMap.get(v.matricule_agent) || { nom: 'Inconnu', prenom: '' }
    }));
    
    res.json({ success: true, visites: visitesEnrichies, count: visites.length });
  } catch (error) {
    console.error('❌ Erreur récupération visites passées:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// ========== HISTORIQUE COMPLET (PROGRAMMATIONS + ACTIONS) ==========
router.get('/historique-complet', protect, async (req, res) => {
  try {
    const { source } = req.query; // 'PLANNING' ou 'FORMULAIRE'
    const { sequelizeLocal, sequelizeGlobal } = require('../config/database');
    
    console.log(`🔍 Récupération historique complet pour source: ${source}`);
    
    // 1. Récupérer les visites programmées (planning) à venir
    const [plannings] = await sequelizeLocal.query(`
      SELECT 
        p.id_planning as id,
        p.matricule_agent,
        p.date_visite,
        p.heure_visite,
        p.type_visite,
        p.statut,
        p.visite_effectuee,
        p.convocation_envoyee,
        p.created_at,
        'PROGRAMMATION' as type_action,
        'PLANNING' as source,
        NULL as resultat,
        p.motif_reprogrammation as motif_action,
        p.statut as nouveau_statut,
        NULL as ancien_statut,
        p.reprogrammee,
        p.creneau_bloque,
        p.source_planification
      FROM planning p
      WHERE p.date_visite >= CURDATE()
        AND p.statut = 'Programmé'
      ORDER BY p.date_visite ASC
    `);
    
    // 2. Récupérer les actions passées (visite)
    const [actions] = await sequelizeLocal.query(`
      SELECT 
        v.matricule_visite as id,
        v.matricule_agent,
        v.date_visite,
        v.heure_visite,
        v.type_visite,
        v.medecin,
        v.observation,
        v.resultat,
        v.type_action,
        v.source,
        v.motif_action,
        v.ancien_statut,
        v.nouveau_statut,
        v.created_at,
        v.details_action as details
      FROM visite v
      WHERE v.type_action IN ('EFFECTUEE', 'REPROGRAMMEE', 'ANNULEE', 'REAFFECTEE', 'SAISIE_MANUELLE')
      ORDER BY v.created_at DESC
    `);
    
    // 3. Combiner selon la source demandée
    let toutesActions = [];
    
    if (source === 'PLANNING') {
      // Pour PLANNING : toutes les programmations + actions qui viennent du planning
      toutesActions = [
        ...plannings.map(p => ({ ...p, sourceOrigin: 'programmation' })),
        ...actions.filter(a => a.source === 'PLANNING').map(a => ({ ...a, sourceOrigin: 'action' }))
      ];
    } else {
      // Pour FORMULAIRE : toutes les programmations + actions qui viennent du formulaire
      toutesActions = [
        ...plannings.map(p => ({ ...p, sourceOrigin: 'programmation' })),
        ...actions.filter(a => a.source === 'FORMULAIRE').map(a => ({ ...a, sourceOrigin: 'action' }))
      ];
    }
    
    // 4. Trier (programmations futures en premier, puis actions passées par date)
    toutesActions.sort((a, b) => {
      if (a.sourceOrigin === 'programmation' && b.sourceOrigin !== 'programmation') return -1;
      if (a.sourceOrigin !== 'programmation' && b.sourceOrigin === 'programmation') return 1;
      return new Date(b.date_visite) - new Date(a.date_visite);
    });
    
    // 5. Récupérer les noms des agents
    const matricules = [...new Set(toutesActions.map(a => a.matricule_agent))];
    if (matricules.length) {
      const [agents] = await sequelizeGlobal.query(`
        SELECT matricule_agent, nom, prenom, code_agence, code_affectation
        FROM agent
        WHERE matricule_agent IN (${matricules.join(',')})
      `);
      
      const agentsMap = new Map();
      agents.forEach(a => agentsMap.set(a.matricule_agent, a));
      
      toutesActions = toutesActions.map(item => ({
        ...item,
        visiteAgent: agentsMap.get(item.matricule_agent) || null
      }));
    } else {
      toutesActions = toutesActions.map(item => ({
        ...item,
        visiteAgent: null
      }));
    }
    
    console.log(`📊 Total actions pour ${source}: ${toutesActions.length} (${plannings.length} programmations, ${toutesActions.length - plannings.length} actions)`);
    
    res.json({ success: true, historique: toutesActions, count: toutesActions.length });
    
  } catch (error) {
    console.error('❌ Erreur historique complet:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== FIN - EXPORT ==========
module.exports = router;