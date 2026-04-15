const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const db = require('../models');
const { Op } = require('sequelize');
const moment = require('moment');
const planningService = require('../services/planningService');
const notificationService = require('../services/notificationIntelligenteService');
const convocationService = require('../services/convocationService');

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
router.get('/historique/planning', protect, async (req, res) => {
  try {
    const { matricule } = req.query;
    const whereClause = { 
      source: 'PLANNING',
      type_action: { [Op.in]: ['PROGRAMMATION', 'EFFECTUEE', 'REPROGRAMMEE', 'ANNULEE', 'REAFFECTEE'] }
    };
    if (matricule) whereClause.matricule_agent = matricule;

    const historique = await Visite.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: 500,
      raw: true
    });
    
    const matricules = [...new Set(historique.map(v => v.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence'],
      raw: true
    });
    
    const agentsMap = new Map();
    agents.forEach(agent => agentsMap.set(agent.matricule_agent, agent));
    
    const historiqueEnrichi = historique.map(v => ({
      ...v,
      visiteAgent: agentsMap.get(v.matricule_agent) || null
    }));
    
    res.json({ success: true, historique: historiqueEnrichi });
  } catch (error) {
    console.error('❌ Erreur historique planning:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== HISTORIQUE FORMULAIRE ==========
router.get('/historique/formulaire', protect, async (req, res) => {
  try {
    const { matricule } = req.query;
    const whereClause = { source: 'FORMULAIRE' };
    if (matricule) whereClause.matricule_agent = matricule;

    const historique = await Visite.findAll({
      where: whereClause,
      order: [['created_at', 'DESC']],
      limit: 500,
      raw: true
    });
    
    const matricules = [...new Set(historique.map(v => v.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      raw: true
    });
    
    const agentsMap = new Map();
    agents.forEach(agent => {
      agentsMap.set(agent.matricule_agent, agent);
    });
    
    const historiqueEnrichi = historique.map(v => ({
      ...v,
      visiteAgent: agentsMap.get(v.matricule_agent) || null
    }));
    
    res.json({ success: true, historique: historiqueEnrichi });
  } catch (error) {
    console.error('❌ Erreur historique formulaire:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== STATISTIQUES SOURCES ==========
router.get('/historique/stats-sources', protect, async (req, res) => {
  try {
    const stats = await Visite.findAll({
      attributes: ['source', [Visite.sequelize.fn('COUNT', '*'), 'nombre']],
      group: ['source'],
      raw: true
    });
    res.json({ 
      success: true, 
      stats: stats.map(s => ({ source: s.source, nombre: parseInt(s.nombre) })) 
    });
  } catch (error) {
    console.error('❌ Erreur stats sources:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== AGENTS ==========
router.get('/agents', protect, async (req, res) => {
  try {
    const { sequelizeGlobal } = require('../config/database');
    
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
      const jourSemaine = dateObj.toLocaleDateString('fr-FR', { weekday: 'long' });
      return res.status(400).json({ 
        success: false, 
        message: `La date du ${dateVisite} (${jourSemaine}) n'est pas un jour ouvré.`,
        code: 'JOUR_NON_OUVRE'
      });
    }
    
    const creneauOccupe = await Planning.findOne({
      where: {
        date_visite: dateVisite,
        heure_visite: heureVisite,
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
        message: `❌ Le créneau du ${dateVisite} à ${heureVisite.substring(0,5)} est déjà occupé par ${nomAgent} (${creneauOccupe.type_visite}).`,
        code: 'CRENEAU_OCCUPE'
      });
    }
    
    const creneauBloque = await Planning.findOne({
      where: {
        date_visite: dateVisite,
        heure_visite: heureVisite,
        creneau_bloque: true
      }
    });
    
    if (creneauBloque) {
      return res.status(409).json({ 
        success: false, 
        message: `🔒 Le créneau du ${dateVisite} à ${heureVisite.substring(0,5)} est BLOQUÉ.`,
        code: 'CRENEAU_BLOQUE'
      });
    }
    
    const agentDejaOccupe = await Planning.findOne({
      where: {
        matricule_agent: visiteData.matricule_agent,
        date_visite: dateVisite,
        statut: 'Programmé',
        visite_effectuee: false
      }
    });
    
    if (agentDejaOccupe) {
      return res.status(409).json({ 
        success: false, 
        message: `⚠️ L'agent ${agent.nom} ${agent.prenom} a déjà une visite de type "${agentDejaOccupe.type_visite}" prévue le ${dateVisite}.`,
        code: 'AGENT_DEJA_OCCUPE'
      });
    }
    
    if (agent.date_fin_inaptitude) {
      const dateFinInaptitude = new Date(agent.date_fin_inaptitude);
      const dateVisiteObj = new Date(dateVisite);
      
      if (dateVisiteObj <= dateFinInaptitude) {
        return res.status(409).json({ 
          success: false, 
          message: `⚠️ L'agent ${agent.nom} ${agent.prenom} est en inaptitude jusqu'au ${dateFinInaptitude.toLocaleDateString('fr-FR')}.`,
          code: 'AGENT_EN_INAPTITUDE'
        });
      }
    }
    
    if (visiteData.type_visite === 'Périodique' && agent.date_derniere_visite) {
      const periodicite = planningService.calculerPeriodicite(agent);
      const dateDerniereVisite = new Date(agent.date_derniere_visite);
      const dateProchainePermise = new Date(dateDerniereVisite);
      dateProchainePermise.setDate(dateDerniereVisite.getDate() + periodicite);
      const dateVisiteObj = new Date(dateVisite);
      
      if (dateVisiteObj < dateProchainePermise) {
        const joursRestants = Math.ceil((dateProchainePermise - dateVisiteObj) / (1000 * 60 * 60 * 24));
        return res.status(409).json({ 
          success: false, 
          message: `⚠️ La prochaine visite périodique pour ${agent.nom} ${agent.prenom} ne peut être programmée qu'à partir du ${dateProchainePermise.toLocaleDateString('fr-FR')}.`,
          code: 'PERIODICITE_NON_RESPECTEE'
        });
      }
    }
    
    const planning = await Planning.create({
      matricule_agent: visiteData.matricule_agent,
      date_visite: dateVisite,
      heure_visite: heureVisite,
      type_visite: visiteData.type_visite || 'Périodique',
      statut: 'Programmé',
      priorite: 100,
      semaine: getNumeroSemaine(new Date(dateVisite)),
      annee: new Date(dateVisite).getFullYear(),
      created_by: req.user.id,
      convocation_envoyee: false,
      source_planification: 'manuel'
    });
    
    await Visite.create({
      matricule_agent: visiteData.matricule_agent,
      date_visite: dateVisite,
      heure_visite: heureVisite,
      type_visite: visiteData.type_visite || 'Périodique',
      medecin: visiteData.medecin || 'Dr. Mahmoud Khelifi',
      observation: visiteData.observation || '',
      resultat: visiteData.resultat || 'Apte',
      id_planning: planning.id_planning,
      type_action: 'SAISIE_MANUELLE',
      nouveau_statut: 'Programmé',
      motif_action: `Saisie manuelle via formulaire`,
      details_action: JSON.stringify({ source: 'manuel', ...visiteData }),
      source: 'FORMULAIRE',
      created_by: req.user.id
    });
    
    if (visiteData.type_visite === 'Périodique') {
      await Agent.update(
        { date_derniere_visite: dateVisite },
        { where: { matricule_agent: visiteData.matricule_agent } }
      );
    }
    
    console.log(`✅ Visite manuelle créée pour agent #${visiteData.matricule_agent} le ${dateVisite} à ${heureVisite}`);
    
    res.status(201).json({
      success: true,
      message: `Visite ${visiteData.type_visite || 'Périodique'} programmée avec succès`,
      planning
    });
  } catch (error) {
    console.error('❌ Erreur création visite manuelle:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== MODIFIER UNE VISITE (PUT) ==========
router.put('/visites/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { date_visite, heure_visite, type_visite, medecin, observation, resultat } = req.body;
    
    console.log(`🔍 Modification visite #${id}`);
    
    const visite = await Visite.findByPk(id);
    if (!visite) {
      return res.status(404).json({ success: false, message: 'Visite non trouvée' });
    }
    
    const ancienneDate = visite.date_visite;
    const ancienPlanningId = visite.id_planning;
    
    await visite.update({
      date_visite,
      heure_visite,
      type_visite,
      medecin,
      observation,
      resultat
    });
    
    console.log(`✅ Visite #${id} mise à jour: ${ancienneDate} → ${date_visite}`);
    
    if (ancienPlanningId) {
      const planning = await Planning.findByPk(ancienPlanningId);
      if (planning) {
        await planning.update({
          date_visite: date_visite,
          heure_visite: heure_visite,
          type_visite: type_visite
        });
        console.log(`✅ Planning #${ancienPlanningId} mis à jour`);
      }
    }
    
    res.json({ success: true, message: 'Visite modifiée avec succès' });
  } catch (error) {
    console.error('❌ Erreur modification visite:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== RÉCUPÉRER LES VISITES POUR PAGE GESTION ==========
router.get('/visites', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type, resultat, dateDebut, dateFin, agentId } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = { 
      source: 'FORMULAIRE',
      type_action: 'SAISIE_MANUELLE'
    };
    
    if (type && type !== 'all') whereClause.type_visite = type;
    if (resultat && resultat !== 'all') whereClause.resultat = resultat;
    if (agentId && agentId !== 'all') whereClause.matricule_agent = agentId;
    
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
    
    const matricules = [...new Set(rows.map(v => v.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence'],
      raw: true
    });
    
    const agentsMap = new Map();
    agents.forEach(agent => agentsMap.set(agent.matricule_agent, agent));
    
    const visitesEnrichies = rows.map(v => ({
      ...v,
      visiteAgent: agentsMap.get(v.matricule_agent) || null
    }));
    
    res.json({
      success: true,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      visites: visitesEnrichies
    });
  } catch (error) {
    console.error('❌ Erreur récupération visites:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== RÉCUPÉRER LE PLANNING D'UNE SEMAINE AVEC HISTORIQUE ==========
router.get('/planning/:semaine/:annee', protect, async (req, res) => {
  try {
    let { semaine, annee } = req.params;
    
    // ✅ CORRECTION : Convertir et valider les paramètres
    semaine = parseInt(semaine);
    annee = parseInt(annee);
    
    // ✅ Vérifier si les valeurs sont valides
    if (isNaN(semaine) || isNaN(annee)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Paramètres de semaine et année invalides' 
      });
    }
    
    // ✅ Vérifier que la semaine est entre 1 et 53
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

    // Récupérer les agents
    const matricules = [...new Set(planning.map(p => p.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation', 'date_derniere_visite', 'periodicite_jours'],
      raw: true
    });
    const agentsMap = new Map();
    agents.forEach(agent => agentsMap.set(agent.matricule_agent, agent));

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
        a_des_actions: historiqueEnrichi.length > 0
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
    
  // backend/routes/visiteRoutes.js
// À ajouter dans la partie effectuer visite (section REPRISE)

// ========== REPRISE - INAPTE TEMPORAIRE (VERSION CORRIGÉE) ==========
else if (planning.type_visite === 'Reprise') {
  if (resultat && resultat === 'Apte') {
    await agent.update({ 
      date_debut_inaptitude: null, 
      date_fin_inaptitude: null,
      date_prochaine_inaptitude: null
    });
    detailsAction = {
      type: 'reprise_apte',
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite?.substring(0,5),
      medecin: medecin || 'Dr. Mahmoud Khelifi',
      observation: observation || '',
      resultat: 'Apte'
    };
    console.log(`✅ Agent ${agent.nom} ${agent.prenom} : Reprise avec APTE`);
  } 
  else if (resultat === 'Inapte temporaire') {
    const dureeSupplementaire = duree_inaptitude || 15;
    const ancienneDateFin = agent.date_fin_inaptitude ? new Date(agent.date_fin_inaptitude) : new Date();
    const nouvelleDateFin = new Date(ancienneDateFin);
    nouvelleDateFin.setDate(ancienneDateFin.getDate() + dureeSupplementaire);
    const nouvelleDateFinStr = nouvelleDateFin.toISOString().split('T')[0];
    
    const nouvelleDateReprise = new Date(nouvelleDateFin);
    nouvelleDateReprise.setDate(nouvelleDateFin.getDate() - 3);
    
    // ✅ CORRECTION 1 : Vérifier les jours ouvrés
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
    
    // ✅ CORRECTION 2 : Vérifier si l'agent a déjà une visite CE JOUR
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
    
    // ✅ CORRECTION 3 : Chercher un créneau disponible
    const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
    let heureTrouvee = null;
    
    for (const heure of creneaux) {
      const creneauOccupe = await Planning.findOne({
        where: {
          date_visite: dateRepriseFinaleStr,
          heure_visite: heure,
          statut: 'Programmé',
          visite_effectuee: false
        }
      });
      
      const creneauBloque = await Planning.findOne({
        where: {
          date_visite: dateRepriseFinaleStr,
          heure_visite: heure,
          creneau_bloque: true
        }
      });
      
      const creneauAnnule = await Planning.findOne({
        where: {
          date_visite: dateRepriseFinaleStr,
          heure_visite: heure,
          statut: 'Annulé'
        }
      });
      
      if (!creneauOccupe && !creneauBloque && !creneauAnnule) {
        heureTrouvee = heure;
        break;
      }
    }
    
    if (!heureTrouvee) {
      heureTrouvee = '09:00:00';
      console.log(`   ⚠️ Aucun créneau trouvé, utilisation de 09:00:00 par défaut`);
    }
    
    await agent.update({
      date_fin_inaptitude: nouvelleDateFinStr,
      date_prochaine_inaptitude: dateRepriseFinaleStr
    });
    
    // ✅ CORRECTION 4 : Vérifier si l'agent a une visite périodique programmée AVANT la nouvelle reprise
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
      // Reprogrammer la visite périodique après la reprise
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
      visite_originale_id: planning.id_planning
    });
    
    detailsAction = {
      type: 'reprise_inapte_temp_prolongation',
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite?.substring(0,5),
      medecin: medecin || 'Dr. Mahmoud Khelifi',
      observation: observation || '',
      resultat: 'Inapte temporaire',
      duree_supplementaire: dureeSupplementaire,
      ancienne_date_fin_inaptitude: ancienneDateFin.toISOString().split('T')[0],
      nouvelle_date_fin_inaptitude: nouvelleDateFinStr,
      date_prochaine_reprise: dateRepriseFinaleStr,
      heure_prochaine_reprise: heureTrouvee.substring(0,5),
      id_prochaine_reprise: nouvelleReprisePlanning.id_planning
    };
    
    console.log(`⚠️ Agent ${agent.nom} ${agent.prenom} : Reprise avec INAPTE TEMPORAIRE - Prolongation jusqu'au ${nouvelleDateFinStr}`);
    console.log(`📅 Nouvelle visite de reprise prévue le ${dateRepriseFinaleStr} à ${heureTrouvee.substring(0,5)}`);
  }
}
    // ========== RECLASSEMENT ==========
    else if (planning.type_visite === 'Reclassement') {
      const dateVisite = planning.date_visite;
      const [year, month, day] = dateVisite.split('-');
      const dateDebut = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      
      if (resultat === 'Inapte définitif') {
        await agent.update({
          statut: 'inactif',
          date_debut_reclassement: dateVisite,
          date_fin_reclassement: null,
          date_prochaine_reclassement: null
        });
        detailsAction = {
          type: 'reclassement_inapte_definitif',
          date_visite: dateVisite,
          heure_visite: planning.heure_visite?.substring(0,5),
          medecin: medecin || 'Dr. Mahmoud Khelifi',
          observation: observation || '',
          resultat: 'Inapte définitif'
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
        let dateControleStr = dateControle.toISOString().split('T')[0];
        
        console.log(`\n📅 Planification visite de contrôle:`);
        console.log(`   Date contrôle idéale: ${dateControleStr}`);
        
        // ✅ 1. Ajuster au jour ouvré (chercher avant si possible)
        let dateControleValide = new Date(dateControle);
        let joursRecherche = 0;
        const maxJours = 10;
        
        // Chercher un jour ouvré AVANT la date idéale
        while (!(await planningService.estJourOuvre(dateControleValide)) && joursRecherche < maxJours) {
          dateControleValide.setDate(dateControle.getDate() - (joursRecherche + 1));
          joursRecherche++;
        }
        
        // Si pas trouvé avant, chercher APRÈS
        if (!(await planningService.estJourOuvre(dateControleValide))) {
          dateControleValide = new Date(dateControle);
          joursRecherche = 0;
          while (!(await planningService.estJourOuvre(dateControleValide)) && joursRecherche < maxJours) {
            dateControleValide.setDate(dateControle.getDate() + joursRecherche + 1);
            joursRecherche++;
          }
        }
        
        const dateControleValideStr = dateControleValide.toISOString().split('T')[0];
        console.log(`   Date contrôle retenue: ${dateControleValideStr}`);
        
        // ✅ 2. Vérifier si l'agent a déjà une visite ce jour-là
        const agentDejaOccupe = await Planning.findOne({
          where: {
            matricule_agent: agent.matricule_agent,
            date_visite: dateControleValideStr,
            statut: 'Programmé',
            visite_effectuee: false
          }
        });
        
        if (agentDejaOccupe) {
          console.log(`   ⚠️ Agent déjà occupé le ${dateControleValideStr}, recherche autre jour...`);
          // Chercher un autre jour
          for (let i = 1; i <= 7; i++) {
            const dateTest = new Date(dateControleValide);
            dateTest.setDate(dateControleValide.getDate() + i);
            if (await planningService.estJourOuvre(dateTest)) {
              const dateTestStr = dateTest.toISOString().split('T')[0];
              const occupe = await Planning.findOne({
                where: { matricule_agent: agent.matricule_agent, date_visite: dateTestStr, statut: 'Programmé' }
              });
              if (!occupe) {
                dateControleValide = dateTest;
                dateControleValideStr = dateTestStr;
                console.log(`   ✅ Nouvelle date trouvée: ${dateControleValideStr}`);
                break;
              }
            }
          }
        }
        
        // ✅ 3. Chercher un créneau disponible
        const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
        let heureControle = null;
        
        for (const heure of creneaux) {
          const creneauOccupe = await Planning.findOne({
            where: {
              date_visite: dateControleValideStr,
              heure_visite: heure,
              statut: 'Programmé'
            }
          });
          
          const creneauBloque = await Planning.findOne({
            where: {
              date_visite: dateControleValideStr,
              heure_visite: heure,
              creneau_bloque: true
            }
          });
          
          if (!creneauOccupe && !creneauBloque) {
            heureControle = heure;
            console.log(`   ✅ Créneau trouvé: ${dateControleValideStr} à ${heureControle}`);
            break;
          }
        }
        
        // Si pas de créneau, essayer le jour suivant
        if (!heureControle) {
          console.log(`   ⚠️ Aucun créneau le ${dateControleValideStr}, recherche jour suivant...`);
          for (let i = 1; i <= 7; i++) {
            const dateSuivante = new Date(dateControleValide);
            dateSuivante.setDate(dateControleValide.getDate() + i);
            if (!(await planningService.estJourOuvre(dateSuivante))) continue;
            
            const dateSuivanteStr = dateSuivante.toISOString().split('T')[0];
            for (const heure of creneaux) {
              const occupe = await Planning.findOne({
                where: { date_visite: dateSuivanteStr, heure_visite: heure, statut: 'Programmé' }
              });
              const bloque = await Planning.findOne({
                where: { date_visite: dateSuivanteStr, heure_visite: heure, creneau_bloque: true }
              });
              if (!occupe && !bloque) {
                dateControleValide = dateSuivante;
                dateControleValideStr = dateSuivanteStr;
                heureControle = heure;
                console.log(`   ✅ Créneau trouvé au J+${i}: ${dateControleValideStr} à ${heureControle}`);
                break;
              }
            }
            if (heureControle) break;
          }
        }
        
        if (!heureControle) {
          heureControle = '09:00:00';
          console.log(`   ⚠️ Aucun créneau trouvé, utilisation de 09:00:00 par défaut`);
        }
        
        // ✅ 4. Mettre à jour l'agent
        await agent.update({
          statut: 'maladie',
          date_debut_reclassement: dateVisite,
          date_fin_reclassement: dateFinStr,
          date_prochaine_reclassement: dateControleValideStr
        });
        
        // ✅ 5. Créer la visite de contrôle
        const controlePlanning = await Planning.create({
          matricule_agent: agent.matricule_agent,
          date_visite: dateControleValideStr,
          heure_visite: heureControle,
          type_visite: 'Reclassement',
          statut: 'Programmé',
          priorite: 150,
          semaine: planningService.getNumeroSemaine(dateControleValide),
          annee: dateControleValide.getFullYear(),
          created_by: req.user.id,
          convocation_envoyee: false,
          motif_reprogrammation: `Visite de contrôle automatique - Fin inaptitude le ${dateFinStr}`,
          source_planification: 'auto',
          visite_originale_id: planning.id_planning
        });
        
        console.log(`✅ Visite de contrôle automatique créée: ID ${controlePlanning.id_planning} le ${dateControleValideStr} à ${heureControle.substring(0,5)}`);
        
        // ✅ 6. Historique de la visite de contrôle
        await Visite.create({
          matricule_agent: agent.matricule_agent,
          date_visite: dateControleValideStr,
          heure_visite: heureControle,
          type_visite: 'Reclassement',
          medecin: 'Système',
          observation: `Visite de contrôle automatique suite à inaptitude temporaire (fin le ${dateFinStr})`,
          id_planning: controlePlanning.id_planning,
          type_action: 'PROGRAMMATION',
          nouveau_statut: 'Programmé',
          motif_action: `Programmation automatique - Visite de contrôle post-inaptitude`,
          details_action: JSON.stringify({
            type: 'programmation_visite_controle',
            visite_originale_id: planning.id_planning,
            date_visite_originale: dateVisite,
            date_debut_inaptitude: dateVisite,
            date_fin_inaptitude: dateFinStr,
            duree_inaptitude: duree,
            date_visite_controle: dateControleValideStr,
            heure_visite_controle: heureControle,
            id_visite_controle: controlePlanning.id_planning,
            message: `Inapte temporaire jusqu'au ${dateFinStr}. Visite de contrôle programmée le ${dateControleValideStr} à ${heureControle.substring(0,5)}`
          }),
          source: 'PLANNING',
          created_by: req.user.id
        });
        
        detailsAction = {
          type: 'reclassement_inapte_temp_avec_controle',
          date_visite: dateVisite,
          heure_visite: planning.heure_visite?.substring(0,5),
          medecin: medecin || 'Dr. Mahmoud Khelifi',
          observation: observation || '',
          resultat: 'Inapte temporaire',
          duree_inaptitude: duree,
          date_fin_inaptitude: dateFinStr,
          date_visite_controle: dateControleValideStr,
          heure_visite_controle: heureControle.substring(0,5),
          id_visite_controle: controlePlanning.id_planning,
          message: `Inapte temporaire pour ${duree} jours jusqu'au ${dateFinStr}. Visite de contrôle programmée le ${dateControleValideStr} à ${heureControle.substring(0,5)}`
        };
        
        console.log(`⚠️ Agent ${agent.nom} ${agent.prenom} : INAPTE TEMPORAIRE jusqu'au ${dateFinStr}`);
        console.log(`📅 Visite de contrôle prévue le ${dateControleValideStr} à ${heureControle.substring(0,5)}`);
      } 
      else if (resultat === 'Apte') {
        await agent.update({
          date_debut_reclassement: null,
          date_fin_reclassement: null,
          date_prochaine_reclassement: null
        });
        detailsAction = {
          type: 'reclassement_apte',
          date_visite: dateVisite,
          heure_visite: planning.heure_visite?.substring(0,5),
          medecin: medecin || 'Dr. Mahmoud Khelifi',
          observation: observation || '',
          resultat: 'Apte'
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

    // ========== ENREGISTRER L'HISTORIQUE ==========
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
      ancien_statut: ancienStatut,
      nouveau_statut: 'Effectué',
      motif_action: `Visite effectuée — Résultat: ${resultat || 'Apte'}`,
      details_action: JSON.stringify(detailsAction),
      source: planning.source_planification === 'manuel' ? 'FORMULAIRE' : 'PLANNING',
      created_by: req.user.id
    });

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
      created_by: req.user.id
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
      source_planification: sourceReprog === 'auto' ? 'auto' : 'manuel'
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
      created_by: req.user.id
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
    
    // ✅ GÉRER L'ERREUR DE CONTRAINTE UNIQUE
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
// ========== REPROGRAMMATION AUTOMATIQUE (VERSION CORRIGÉE) ==========
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
    
    // Récupérer l'agent pour vérifier ses disponibilités
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
      
      // ✅ 1. Vérifier si le jour est ouvré
      if (!(await planningService.estJourOuvre(dateTest))) continue;
      
      const dateStr = dateTest.toISOString().split('T')[0];
      
      // ✅ 2. Vérifier si l'agent a déjà une visite CE JOUR
      const agentDejaOccupe = await Planning.findOne({
        where: {
          matricule_agent: planning.matricule_agent,
          date_visite: dateStr,
          statut: 'Programmé',
          visite_effectuee: false,
          id_planning: { [Op.ne]: id }
        }
      });
      
      if (agentDejaOccupe) {
        console.log(`   ⚠️ Agent déjà occupé le ${dateStr}, recherche autre jour...`);
        continue;
      }
      
      // ✅ 3. Chercher un créneau disponible
      for (const heure of creneaux) {
        // Vérifier si le créneau est occupé par une autre visite
        const existe = await Planning.findOne({ 
          where: { 
            date_visite: dateStr, 
            heure_visite: heure, 
            statut: 'Programmé',
            id_planning: { [Op.ne]: id }
          } 
        });
        
        // Vérifier si le créneau est bloqué
        const bloque = await Planning.findOne({ 
          where: { 
            date_visite: dateStr, 
            heure_visite: heure, 
            creneau_bloque: true,
            id_planning: { [Op.ne]: id }
          } 
        });
        
        // Vérifier si le créneau a une visite effectuée
        const effectue = await Planning.findOne({ 
          where: { 
            date_visite: dateStr, 
            heure_visite: heure, 
            visite_effectuee: true,
            id_planning: { [Op.ne]: id }
          } 
        });
        
        // Vérifier si le créneau a une visite annulée
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
          console.log(`   ✅ Créneau trouvé: ${dateStr} à ${heure}`);
          break;
        }
      }
      if (nouvelleDate) break;
    }
    
    if (!nouvelleDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucun créneau disponible dans les 30 jours (vérifié: jour ouvré, agent dispo, créneau libre)' 
      });
    }
    
    const nouvelleDateStr = nouvelleDate.toISOString().split('T')[0];
    
    // Marquer l'ancien planning comme reporté
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
      source_planification: 'auto'
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
        creneau_original_bloque: true,
        verifications: {
          jour_ouvre: true,
          agent_disponible: true,
          creneau_libre: true
        }
      }),
      source: planning.source_planification === 'manuel' ? 'FORMULAIRE' : 'PLANNING',
      created_by: req.user.id
    });
    
    console.log(`✅ Reprogrammation auto: Agent ${agent?.nom} ${agent?.prenom} du ${planning.date_visite} vers ${nouvelleDateStr} à ${nouvelleHeure.substring(0,5)}`);
    
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
      source_planification: 'manuel'
    });
    
    await Visite.create({
      matricule_agent, date_visite, heure_visite: heureFinale,
      type_visite: 'Reclassement', id_planning: planning.id_planning,
      type_action: 'SAISIE_MANUELLE', nouveau_statut: 'Programmé',
      motif_action: `Planification manuelle - Reclassement${motif ? ' - ' + motif : ''}`,
      details_action: JSON.stringify({ source: 'manuel', motif }), 
      source: 'FORMULAIRE', created_by: req.user.id
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
      source_planification: 'manuel'
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
      created_by: req.user.id
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

// ========== CONVOCATIONS ==========
router.get('/planning/convocations-a-envoyer', protect, async (req, res) => {
  try {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const debutSemaineProchaine = new Date(aujourdhui);
    debutSemaineProchaine.setDate(aujourdhui.getDate() + 7);
    debutSemaineProchaine.setHours(0, 0, 0, 0);
    const finSemaineProchaine = new Date(debutSemaineProchaine);
    finSemaineProchaine.setDate(debutSemaineProchaine.getDate() + 6);
    finSemaineProchaine.setHours(23, 59, 59, 999);
    
    const plannings = await Planning.findAll({
      where: {
        date_visite: { [Op.between]: [debutSemaineProchaine.toISOString().split('T')[0], finSemaineProchaine.toISOString().split('T')[0]] },
        convocation_envoyee: false, statut: 'Programmé'
      },
      order: [['date_visite', 'ASC'], ['heure_visite', 'ASC']], raw: true
    });
    
    if (plannings.length === 0) return res.json({ success: true, convocations: [], count: 0 });
    
    const matricules = [...new Set(plannings.map(p => p.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'], raw: true
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

router.post('/planning/envoyer-convocation', protect, async (req, res) => {
  try {
    const { id_planning } = req.body;
    if (!id_planning) return res.status(400).json({ success: false, message: 'ID planning requis' });
    const result = await convocationService.envoyerConvocationPlanning(id_planning);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/planning/envoyer-convocations-groupees', protect, async (req, res) => {
  try {
    const { ids_planning } = req.body;
    if (!ids_planning || !Array.isArray(ids_planning) || ids_planning.length === 0) {
      return res.status(400).json({ success: false, message: "Liste d'IDs planning requise" });
    }
    const result = await convocationService.envoyerConvocationsGroupees(ids_planning);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/planning/convocations-stats', protect, async (req, res) => {
  try {
    const stats = await convocationService.getStatsConvocations();
    res.json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== STATISTIQUES VISITES ==========
router.get('/visites/stats', protect, async (req, res) => {
  try {
    const { source } = req.query;
    let whereClause = {};
    if (source === 'FORMULAIRE') {
      whereClause = { source: 'FORMULAIRE', type_action: 'SAISIE_MANUELLE' };
    }
    
    const total = await Visite.count({ where: whereClause });
    
    const parType = await Visite.findAll({
      where: whereClause,
      attributes: ['type_visite', [Visite.sequelize.fn('COUNT', '*'), 'count']],
      group: ['type_visite'], raw: true
    });
    
    const parResultat = await Visite.findAll({
      where: whereClause,
      attributes: ['resultat', [Visite.sequelize.fn('COUNT', '*'), 'count']],
      group: ['resultat'], raw: true
    });
    
    const aujourdhui = new Date();
    const semaineActuelle = getNumeroSemaine(aujourdhui);
    const anneeActuelle = aujourdhui.getFullYear();
    const planningSemaine = await Planning.count({ where: { semaine: semaineActuelle, annee: anneeActuelle } });
    
    const annee = aujourdhui.getFullYear();
    const visitesMois = await Visite.findAll({
      where: whereClause,
      attributes: [[Visite.sequelize.fn('MONTH', Visite.sequelize.col('date_visite')), 'mois'], [Visite.sequelize.fn('COUNT', '*'), 'count']],
      where: { ...whereClause, [Op.and]: [Visite.sequelize.where(Visite.sequelize.fn('YEAR', Visite.sequelize.col('date_visite')), annee)] },
      group: [Visite.sequelize.fn('MONTH', Visite.sequelize.col('date_visite'))], raw: true
    });
    
    const parMois = Array(12).fill(0);
    visitesMois.forEach(item => { const mois = parseInt(item.mois) - 1; parMois[mois] = parseInt(item.count); });
    
    const aptes = parResultat.find(r => r.resultat === 'Apte')?.count || 0;
    const reserves = parResultat.find(r => r.resultat === 'Apte avec réserves')?.count || 0;
    const inaptes = (parResultat.find(r => r.resultat === 'Inapte temporaire')?.count || 0) + (parResultat.find(r => r.resultat === 'Inapte définitif')?.count || 0);
    
    res.json({
      success: true,
      stats: { total, aptes, reserves, inaptes, parType: parType.map(p => ({ type: p.type_visite, count: p.count })), parResultat: parResultat.map(r => ({ resultat: r.resultat, count: r.count })), planningSemaine, parMois }
    });
  } catch (error) {
    console.error('❌ Erreur stats visites:', error);
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
    const { limit = 100 } = req.query;
    
    const agent = await Agent.findOne({
      where: { matricule_agent: matricule },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation', 
                   'date_derniere_visite', 'date_fin_inaptitude', 'statut']
    });
    
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent non trouvé' });
    }
    
    const visites = await Visite.findAll({
      where: { 
        matricule_agent: matricule,
        type_action: { [Op.in]: ['EFFECTUEE', 'PROGRAMMATION', 'REPROGRAMMEE', 'ANNULEE', 'SAISIE_MANUELLE'] }
      },
      order: [['date_visite', 'DESC']],
      limit: parseInt(limit),
      raw: true
    });
    
    const historiqueEnrichi = visites.map(v => {
      let details = null;
      if (v.details_action) {
        try {
          details = typeof v.details_action === 'string' ? JSON.parse(v.details_action) : v.details_action;
        } catch(e) { details = null; }
      }
      
      let actionLibelle = '';
      let actionCouleur = '';
      
      switch(v.type_action) {
        case 'EFFECTUEE':
          if (details?.resultat === 'Apte') {
            actionLibelle = '✅ Visite effectuée - APTE';
            actionCouleur = 'success';
          } else if (details?.resultat === 'Inapte temporaire') {
            actionLibelle = '⚠️ Visite effectuée - INAPTE TEMPORAIRE';
            actionCouleur = 'warning';
          } else if (details?.resultat === 'Inapte définitif') {
            actionLibelle = '❌ Visite effectuée - INAPTE DÉFINITIF';
            actionCouleur = 'danger';
          } else {
            actionLibelle = '✅ Visite effectuée';
            actionCouleur = 'success';
          }
          break;
        case 'PROGRAMMATION':
          actionLibelle = '📅 Programmation automatique';
          actionCouleur = 'info';
          break;
        case 'REPROGRAMMEE':
          actionLibelle = '🔄 Visite reprogrammée';
          actionCouleur = 'warning';
          break;
        case 'ANNULEE':
          actionLibelle = '❌ Visite annulée';
          actionCouleur = 'danger';
          break;
        case 'SAISIE_MANUELLE':
          actionLibelle = '✏️ Saisie manuelle';
          actionCouleur = 'purple';
          break;
        default:
          actionLibelle = v.type_action || 'Action';
          actionCouleur = 'default';
      }
      
      return {
        id: v.matricule_visite,
        type_action: v.type_action,
        action_libelle: actionLibelle,
        action_couleur: actionCouleur,
        date_visite: v.date_visite,
        heure_visite: v.heure_visite?.substring(0,5),
        type_visite: v.type_visite,
        medecin: v.medecin,
        resultat: v.resultat,
        observation: v.observation,
        motif_action: v.motif_action,
        date_creation: v.created_at,
        details: details,
        source: v.source
      };
    });
    
    const stats = {
      total: visites.filter(v => v.type_action === 'EFFECTUEE').length,
      periodiques: visites.filter(v => v.type_visite === 'Périodique' && v.type_action === 'EFFECTUEE').length,
      reprises: visites.filter(v => v.type_visite === 'Reprise' && v.type_action === 'EFFECTUEE').length,
      reclassements: visites.filter(v => v.type_visite === 'Reclassement' && v.type_action === 'EFFECTUEE').length,
      embauches: visites.filter(v => v.type_visite === 'Embauche' && v.type_action === 'EFFECTUEE').length,
      aptes: visites.filter(v => v.resultat === 'Apte' && v.type_action === 'EFFECTUEE').length,
      inaptesTemp: visites.filter(v => v.resultat === 'Inapte temporaire' && v.type_action === 'EFFECTUEE').length,
      inaptesDef: visites.filter(v => v.resultat === 'Inapte définitif' && v.type_action === 'EFFECTUEE').length
    };
    
    res.json({
      success: true,
      agent: {
        matricule: agent.matricule_agent,
        nom: agent.nom,
        prenom: agent.prenom,
        code_agence: agent.code_agence,
        statut: agent.statut,
        date_derniere_visite: agent.date_derniere_visite,
        date_fin_inaptitude: agent.date_fin_inaptitude
      },
      stats: stats,
      historique: historiqueEnrichi
    });
  } catch (error) {
    console.error('❌ Erreur historique agent:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;