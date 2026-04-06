// backend/routes/visiteRoutes.js
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

const TYPES_ANNULABLES = ['Reprise', 'Reclassement', 'Embauche'];

function getActionsAutorisees(typeVisite, statut) {
  if (statut !== 'Programmé') return [];
  const base = ['effectuer', 'reprogrammer'];
  if (TYPES_ANNULABLES.includes(typeVisite)) {
    base.push('annuler');
  }
  return base;
}

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
    agents.forEach(agent => {
      agentsMap.set(agent.matricule_agent, agent);
    });
    
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
      order: [['date_visite', 'DESC'], ['created_at', 'DESC']],
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
      attributes: [
        'source',
        [Visite.sequelize.fn('COUNT', '*'), 'nombre']
      ],
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

// ========== AGENTS - CORRIGÉ AVEC TOUS LES CHAMPS ==========
router.get('/agents', protect, async (req, res) => {
  try {
    const { sequelizeGlobal } = require('../config/database');
    
    const [agents] = await sequelizeGlobal.query(`
      SELECT 
        matricule_agent, 
        nom, 
        prenom, 
        code_agence, 
        code_affectation,
        statut, 
        date_derniere_visite, 
        date_fin_inaptitude, 
        date_prochaine_inaptitude,
        date_naissance,
        direction,
        periodicite_jours,
        date_debut_inaptitude,
        created_at
      FROM agent
      ORDER BY nom ASC
    `);
    
    res.json({ success: true, agents });
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
    
    const agent = await Agent.findOne({
      where: { matricule_agent: visiteData.matricule_agent }
    });
    
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent non trouvé' });
    }
    
    const existeDeja = await Planning.findOne({
      where: {
        date_visite: visiteData.date_visite,
        heure_visite: visiteData.heure_visite || '09:00:00',
        statut: 'Programmé'
      }
    });

    if (existeDeja) {
      return res.status(409).json({ 
        success: false, 
        message: `Le créneau du ${visiteData.date_visite} à ${(visiteData.heure_visite || '09:00:00').substring(0,5)} est déjà occupé.` 
      });
    }
    
    const planning = await Planning.create({
      matricule_agent: visiteData.matricule_agent,
      date_visite: visiteData.date_visite,
      heure_visite: visiteData.heure_visite || '09:00:00',
      type_visite: visiteData.type_visite || 'Périodique',
      statut: 'Programmé',
      priorite: 100,
      semaine: getNumeroSemaine(new Date(visiteData.date_visite)),
      annee: new Date(visiteData.date_visite).getFullYear(),
      created_by: req.user.id,
      convocation_envoyee: false,
      source_planification: 'manuel'
    });
    
    const visite = await Visite.create({
      matricule_agent: visiteData.matricule_agent,
      date_visite: visiteData.date_visite,
      heure_visite: visiteData.heure_visite || '09:00:00',
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
    
    await Agent.update(
      { date_derniere_visite: visiteData.date_visite },
      { where: { matricule_agent: visiteData.matricule_agent } }
    );
    
    console.log(`✅ Visite manuelle créée pour agent #${visiteData.matricule_agent} le ${visiteData.date_visite}`);
    
    res.status(201).json({
      success: true,
      message: 'Visite enregistrée avec succès',
      visite,
      planning
    });
    
  } catch (error) {
    console.error('❌ Erreur création visite manuelle:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== RÉCUPÉRER TOUTES LES VISITES (FORMULAIRE UNIQUEMENT) ==========
router.get('/visites', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type, resultat, dateDebut, dateFin, agentId } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = { source: 'FORMULAIRE' };
    
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
    agents.forEach(agent => {
      agentsMap.set(agent.matricule_agent, agent);
    });
    
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

// ========== RÉCUPÉRER LE PLANNING D'UNE SEMAINE ==========
router.get('/planning/:semaine/:annee', protect, async (req, res) => {
  try {
    const { semaine, annee } = req.params;
    
    console.log(`\n🔍 RECHERCHE PLANNING - Semaine ${semaine}/${annee}`);
    
    const planning = await Planning.findAll({
      where: { semaine: parseInt(semaine), annee: parseInt(annee) },
      order: [['date_visite', 'ASC'], ['heure_visite', 'ASC']],
      raw: true
    });
    
    console.log(`📊 ${planning.length} visite(s) trouvée(s) dans la table planning pour S${semaine}/${annee}`);
    
    if (planning.length > 0) {
      planning.forEach(p => {
        console.log(`   - ID:${p.id_planning} | Agent:${p.matricule_agent} | Date:${p.date_visite} | Type:${p.type_visite}`);
      });
    }
    
    const matricules = [...new Set(planning.map(p => p.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation', 'date_derniere_visite'],
      raw: true
    });
    
    const agentsMap = new Map();
    agents.forEach(agent => {
      agentsMap.set(agent.matricule_agent, agent);
    });
    
    const planningEnrichi = planning.map(p => ({
      ...p,
      planningAgent: agentsMap.get(p.matricule_agent) || null,
      actions_autorisees: getActionsAutorisees(p.type_visite, p.statut)
    }));
    
    const visiteAgent5015 = planningEnrichi.find(p => p.matricule_agent === 5015);
    if (visiteAgent5015) {
      console.log(`\n✅ Agent 5015 trouvé dans le planning S${semaine}/${annee}:`);
      console.log(`   Date: ${visiteAgent5015.date_visite}`);
      console.log(`   Heure: ${visiteAgent5015.heure_visite}`);
      console.log(`   Type: ${visiteAgent5015.type_visite}`);
    } else {
      console.log(`\n⚠️ Agent 5015 NON trouvé dans le planning S${semaine}/${annee}`);
      
      const visites5015 = await Planning.findAll({
        where: { matricule_agent: 5015 },
        order: [['date_visite', 'DESC']],
        raw: true
      });
      
      if (visites5015.length > 0) {
        console.log(`   Dernières visites de l'agent 5015:`);
        visites5015.slice(0, 3).forEach(v => {
          console.log(`      - ${v.date_visite} (S${v.semaine}/${v.annee}) - ${v.type_visite}`);
        });
      }
    }
    
    res.json({ success: true, planning: planningEnrichi });
  } catch (error) {
    console.error('❌ Erreur récupération planning:', error);
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
      message: `Planning automatique généré avec ${planning.length} visite(s) (Périodique + Reprise)`,
      planning
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== VÉRIFIER SI UN CRÉNEAU EST DISPONIBLE ==========
router.get('/planning/verifier-creneau', protect, async (req, res) => {
  try {
    const { date, heure } = req.query;
    
    if (!date || !heure) {
      return res.status(400).json({ success: false, message: 'Date et heure requises' });
    }
    
    const planningExistant = await Planning.findOne({
      where: { date_visite: date, heure_visite: heure, statut: 'Programmé' }
    });
    
    res.json({ success: true, occupe: planningExistant !== null, planning: planningExistant });
  } catch (error) {
    console.error('❌ Erreur vérification créneau:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== MARQUER UNE VISITE COMME EFFECTUÉE ==========
router.patch('/planning/:id/effectuer', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { medecin, observation, resultat } = req.body;

    const planning = await Planning.findByPk(id);
    if (!planning) return res.status(404).json({ success: false, message: 'Planning non trouvé' });

    if (planning.statut === 'Effectué') {
      return res.status(400).json({ success: false, message: 'Visite déjà marquée comme effectuée' });
    }
    if (planning.statut === 'Annulé') {
      return res.status(400).json({ success: false, message: 'Impossible d\'effectuer une visite annulée' });
    }

    const ancienStatut = planning.statut;

    planning.visite_effectuee = true;
    planning.statut = 'Effectué';
    await planning.save();

    await Visite.create({
      matricule_agent: planning.matricule_agent,
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite,
      type_visite: planning.type_visite,
      medecin: medecin || 'Dr. Mahmoud Khelifi',
      observation: observation || '',
      resultat: resultat || 'Apte',
      id_planning: planning.id_planning,
      type_action: 'EFFECTUEE',
      ancien_statut: ancienStatut,
      nouveau_statut: 'Effectué',
      motif_action: `Visite effectuée — Résultat: ${resultat || 'Apte'}`,
      details_action: JSON.stringify({ medecin, resultat, observation }),
      source: 'PLANNING',
      created_by: req.user.id
    });

    if (planning.type_visite === 'Périodique') {
      await Agent.update(
        { date_derniere_visite: planning.date_visite },
        { where: { matricule_agent: planning.matricule_agent } }
      );
    }

    if (planning.type_visite === 'Reprise' && resultat && resultat.startsWith('Apte')) {
      await Agent.update(
        { date_fin_inaptitude: null, date_debut_inaptitude: null },
        { where: { matricule_agent: planning.matricule_agent } }
      );
    }

    res.json({ success: true, message: 'Visite marquée comme effectuée', planning });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== ANNULATION (uniquement Reprise, Reclassement, Embauche) ==========
router.patch('/planning/:id/annuler', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    const planning = await Planning.findByPk(id);
    if (!planning) return res.status(404).json({ success: false, message: 'Planning non trouvé' });

    if (planning.type_visite === 'Périodique') {
      return res.status(400).json({ success: false, message: 'Les visites périodiques ne peuvent pas être annulées.' });
    }

    if (!TYPES_ANNULABLES.includes(planning.type_visite)) {
      return res.status(400).json({ success: false, message: `Le type de visite "${planning.type_visite}" ne peut pas être annulé` });
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
      source: 'PLANNING',
      created_by: req.user.id
    });

    res.json({ success: true, message: 'Visite annulée avec succès', planning });
  } catch (error) {
    console.error('❌ Erreur:', error);
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

    if (planning.statut === 'Effectué') {
      return res.status(400).json({ success: false, message: 'Impossible de reprogrammer une visite déjà effectuée' });
    }
    if (planning.statut === 'Annulé') {
      return res.status(400).json({ success: false, message: 'Impossible de reprogrammer une visite annulée' });
    }

    const nouvelleDateObj = new Date(nouvelle_date);
    if (!(await planningService.estJourOuvre(nouvelleDateObj))) {
      return res.status(400).json({ success: false, message: 'La nouvelle date n\'est pas un jour ouvré' });
    }

    const creneauOccupe = await Planning.findOne({
      where: { date_visite: nouvelle_date, heure_visite: nouvelle_heure, statut: 'Programmé' }
    });
    if (creneauOccupe) {
      return res.status(409).json({ success: false, message: `Le créneau du ${nouvelle_date} à ${nouvelle_heure.substring(0,5)} est déjà occupé.` });
    }

    const sourceReprog = source === 'auto' ? 'auto' : 'manuel';
    const ancienStatut = planning.statut;

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

    const nouveauPlanning = await Planning.create({
      matricule_agent: planning.matricule_agent,
      date_visite: nouvelle_date,
      heure_visite: nouvelle_heure,
      type_visite: planning.type_visite,
      statut: 'Programmé',
      priorite: (planning.priorite || 0) + 20,
      visite_originale_id: planning.id_planning,
      semaine, annee,
      created_by: req.user.id,
      convocation_envoyee: false,
      source_planification: sourceReprog === 'auto' ? 'auto' : 'manuel'
    });

    await Visite.create({
      matricule_agent: planning.matricule_agent,
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite,
      type_visite: planning.type_visite,
      id_planning: planning.id_planning,
      type_action: 'REPROGRAMMEE',
      ancien_statut: ancienStatut,
      nouveau_statut: 'Reporté',
      motif_action: `${motif} (${sourceReprog})`,
      details_action: JSON.stringify({ source: sourceReprog, ancienne_date: planning.date_visite, nouvelle_date, nouveau_planning_id: nouveauPlanning.id_planning, motif }),
      source: 'PLANNING',
      created_by: req.user.id
    });

    res.json({
      success: true,
      message: `Visite reprogrammée avec succès (mode ${sourceReprog === 'auto' ? 'automatique' : 'manuel'})`,
      data: {
        ancien_planning: { id: planning.id_planning, date: planning.date_visite, heure: planning.heure_visite },
        nouveau_planning: { id: nouveauPlanning.id_planning, date: nouvelle_date, heure: nouvelle_heure }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur reprogrammation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== REPROGRAMMATION AUTOMATIQUE ==========
router.post('/planning/:id/reprogrammer-auto', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log(`🔄 Reprogrammation auto du planning #${id}`);
    
    const planning = await Planning.findByPk(id);
    if (!planning) return res.status(404).json({ success: false, message: 'Planning non trouvé' });
    
    if (planning.statut === 'Effectué') {
      return res.status(400).json({ success: false, message: 'Impossible de reprogrammer une visite déjà effectuée' });
    }
    if (planning.statut === 'Annulé') {
      return res.status(400).json({ success: false, message: 'Impossible de reprogrammer une visite annulée' });
    }
    
    const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
    const dateDebut = new Date(planning.date_visite);
    dateDebut.setDate(dateDebut.getDate() + 1);
    
    console.log(`🔍 Date originale: ${planning.date_visite}, recherche à partir de: ${dateDebut.toISOString().split('T')[0]}`);
    
    let nouvelleDate = null;
    let nouvelleHeure = null;
    
    for (let i = 0; i <= 30; i++) {
      const dateTest = new Date(dateDebut);
      dateTest.setDate(dateDebut.getDate() + i);
      
      if (!(await planningService.estJourOuvre(dateTest))) continue;
      
      const dateStr = dateTest.toISOString().split('T')[0];
      
      for (const heure of creneaux) {
        const existe = await Planning.findOne({
          where: { date_visite: dateStr, heure_visite: heure, statut: 'Programmé' }
        });
        
        if (!existe) {
          nouvelleDate = dateTest;
          nouvelleHeure = heure;
          console.log(`✅ Créneau trouvé: ${dateStr} à ${heure}`);
          break;
        }
      }
      if (nouvelleDate) break;
    }
    
    if (!nouvelleDate) {
      return res.status(400).json({ success: false, message: 'Aucun créneau disponible dans les 30 jours' });
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
      motif_action: `Reprogrammation automatique vers ${nouvelleDateStr}`,
      details_action: JSON.stringify({ source: 'auto', ancienne_date: planning.date_visite, nouvelle_date: nouvelleDateStr, nouveau_planning_id: nouveauPlanning.id_planning }),
      source: 'PLANNING',
      created_by: req.user.id
    });
    
    res.json({
      success: true,
      message: `Visite reprogrammée automatiquement du ${planning.date_visite} vers le ${nouvelleDateStr} à ${nouvelleHeure.substring(0,5)}`,
      data: { nouvelle_date: nouvelleDateStr, nouvelle_heure: nouvelleHeure }
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

    const existeDeja = await Planning.findOne({
      where: {
        date_visite: date_visite,
        heure_visite: heure_visite || '09:00:00',
        statut: 'Programmé'
      }
    });

    if (existeDeja) {
      return res.status(409).json({ 
        success: false, 
        message: `Le créneau du ${date_visite} à ${(heure_visite || '09:00:00').substring(0,5)} est déjà occupé.` 
      });
    }

    const planning = await Planning.create({
      matricule_agent: matricule_agent,
      date_visite: date_visite,
      heure_visite: heure_visite || '09:00:00',
      type_visite: 'Reclassement',
      statut: 'Programmé',
      priorite: 200,
      semaine: planningService.getNumeroSemaine(new Date(date_visite)),
      annee: new Date(date_visite).getFullYear(),
      created_by: req.user.id,
      convocation_envoyee: false,
      motif_reprogrammation: motif || 'Visite de reclassement programmée manuellement',
      source_planification: 'manuel'
    });
    
    await Visite.create({
      matricule_agent: matricule_agent,
      date_visite: date_visite,
      heure_visite: heure_visite || '09:00:00',
      type_visite: 'Reclassement',
      id_planning: planning.id_planning,
      type_action: 'SAISIE_MANUELLE',
      nouveau_statut: 'Programmé',
      motif_action: `Planification manuelle - Reclassement${motif ? ' - ' + motif : ''}`,
      details_action: JSON.stringify({ source: 'manuel', motif }),
      source: 'FORMULAIRE',
      created_by: req.user.id
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

    const planning = await Planning.create({
      matricule_agent: matricule_agent,
      date_visite: date_visite,
      heure_visite: heure_visite || '09:00:00',
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
      matricule_agent: matricule_agent,
      date_visite: date_visite,
      heure_visite: heure_visite || '09:00:00',
      type_visite: 'Embauche',
      id_planning: planning.id_planning,
      type_action: 'SAISIE_MANUELLE',
      nouveau_statut: 'Programmé',
      motif_action: `Planification manuelle - Embauche${motif ? ' - ' + motif : ''}`,
      details_action: JSON.stringify({ source: 'manuel', motif }),
      source: 'FORMULAIRE',
      created_by: req.user.id
    });
    
    res.json({ success: true, message: "Visite d'embauche planifiée", planning });
  } catch (error) {
    console.error("❌ Erreur planification embauche:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== RÉCUPÉRER LES VISITES PAR TYPE ==========
router.get('/planning/reclassements', protect, async (req, res) => {
  try {
    const plannings = await Planning.findAll({
      where: { type_visite: 'Reclassement', date_visite: { [Op.gte]: new Date() }, statut: 'Programmé' },
      order: [['date_visite', 'ASC']],
      raw: true
    });
    
    const matricules = [...new Set(plannings.map(p => p.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      raw: true
    });
    
    const agentsMap = new Map();
    agents.forEach(agent => {
      agentsMap.set(agent.matricule_agent, agent);
    });
    
    const planningEnrichi = plannings.map(p => ({
      ...p,
      planningAgent: agentsMap.get(p.matricule_agent) || null
    }));
    
    res.json({ success: true, planning: planningEnrichi });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/planning/embauches', protect, async (req, res) => {
  try {
    const plannings = await Planning.findAll({
      where: { type_visite: 'Embauche', date_visite: { [Op.gte]: new Date() }, statut: 'Programmé' },
      order: [['date_visite', 'ASC']],
      raw: true
    });
    
    const matricules = [...new Set(plannings.map(p => p.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      raw: true
    });
    
    const agentsMap = new Map();
    agents.forEach(agent => {
      agentsMap.set(agent.matricule_agent, agent);
    });
    
    const planningEnrichi = plannings.map(p => ({
      ...p,
      planningAgent: agentsMap.get(p.matricule_agent) || null
    }));
    
    res.json({ success: true, planning: planningEnrichi });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== CONVOCATIONS ==========
router.get('/planning/convocations-a-envoyer', protect, async (req, res) => {
  try {
    const dans7Jours = new Date();
    dans7Jours.setDate(dans7Jours.getDate() + 7);
    const dateDebut = new Date(dans7Jours);
    dateDebut.setHours(0, 0, 0, 0);
    const dateFin = new Date(dans7Jours);
    dateFin.setHours(23, 59, 59, 999);

    const plannings = await Planning.findAll({
      where: {
        date_visite: { [Op.between]: [dateDebut, dateFin] },
        convocation_envoyee: false,
        statut: 'Programmé'
      },
      order: [['date_visite', 'ASC'], ['heure_visite', 'ASC']],
      raw: true
    });
    
    const matricules = [...new Set(plannings.map(p => p.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      raw: true
    });
    
    const agentsMap = new Map();
    agents.forEach(agent => {
      agentsMap.set(agent.matricule_agent, agent);
    });
    
    const planningsEnrichis = plannings.map(p => ({
      ...p,
      planningAgent: agentsMap.get(p.matricule_agent) || null
    }));
    
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
    console.error('❌ Erreur:', error);
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
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/planning/convocations-stats', protect, async (req, res) => {
  try {
    const stats = await convocationService.getStatsConvocations();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/planning/debug/stats', protect, async (req, res) => {
  try {
    console.log('\n🔍 DEBUG STATISTIQUES PLANNING');
    console.log('='.repeat(60));
    
    const totalEnvoyees = await Planning.count({
      where: { convocation_envoyee: true }
    });
    console.log(`📊 Total convocations envoyées: ${totalEnvoyees}`);
    
    const totalProgrammees = await Planning.count({
      where: { statut: 'Programmé', date_visite: { [Op.gte]: new Date() } }
    });
    console.log(`📊 Total visites programmées futures: ${totalProgrammees}`);
    
    const totalNonEnvoyees = await Planning.count({
      where: {
        convocation_envoyee: false,
        statut: 'Programmé',
        date_visite: { [Op.gte]: new Date() }
      }
    });
    console.log(`📊 Total convocations à envoyer: ${totalNonEnvoyees}`);
    
    const dans7Jours = new Date();
    dans7Jours.setDate(dans7Jours.getDate() + 7);
    const dateDebut = new Date(dans7Jours);
    dateDebut.setHours(0, 0, 0, 0);
    const dateFin = new Date(dans7Jours);
    dateFin.setHours(23, 59, 59, 999);
    
    const aEnvoyerJ7 = await Planning.count({
      where: {
        date_visite: { [Op.between]: [dateDebut, dateFin] },
        convocation_envoyee: false,
        statut: 'Programmé'
      }
    });
    console.log(`📊 Convocations J+7: ${aEnvoyerJ7}`);
    
    console.log('='.repeat(60));
    
    res.json({
      success: true,
      stats: {
        total_envoyees: totalEnvoyees,
        total_programmees: totalProgrammees,
        total_a_envoyer: totalNonEnvoyees,
        a_envoyer_j7: aEnvoyerJ7
      }
    });
  } catch (error) {
    console.error('❌ Erreur debug stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== DEBUG STATISTIQUES CONVOCATIONS ==========
router.get('/planning/convocations-stats/debug', protect, async (req, res) => {
  try {
    console.log('\n🔍 DEBUG STATS CONVOCATIONS (SQL Direct)');
    console.log('='.repeat(60));
    
    const { sequelizeLocal } = require('../config/database');
    
    const [results] = await sequelizeLocal.query(`
      SELECT 
        COUNT(*) as total_visites,
        SUM(CASE WHEN convocation_envoyee = 1 THEN 1 ELSE 0 END) as total_envoyees,
        SUM(CASE WHEN convocation_envoyee = 0 AND statut = 'Programmé' AND date_visite >= CURDATE() THEN 1 ELSE 0 END) as total_a_envoyer,
        SUM(CASE WHEN convocation_envoyee = 0 AND statut = 'Programmé' 
          AND date_visite BETWEEN DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND DATE_ADD(CURDATE(), INTERVAL 8 DAY) 
          THEN 1 ELSE 0 END) as a_envoyer_j7,
        SUM(CASE WHEN statut = 'Programmé' AND date_visite >= CURDATE() THEN 1 ELSE 0 END) as total_programmees
      FROM planning
      WHERE statut IN ('Programmé', 'Effectué')
    `);
    
    const stats = results[0];
    
    console.log('📊 Résultats SQL direct:');
    console.log(`   Total visites: ${stats.total_visites}`);
    console.log(`   Total envoyées: ${stats.total_envoyees}`);
    console.log(`   Total à envoyer: ${stats.total_a_envoyer}`);
    console.log(`   À envoyer J+7: ${stats.a_envoyer_j7}`);
    console.log(`   Total programmées: ${stats.total_programmees}`);
    
    const tauxEnvoi = stats.total_programmees > 0 
      ? Math.round((stats.total_envoyees / stats.total_programmees) * 100) 
      : 0;
    
    console.log(`   Taux d'envoi: ${tauxEnvoi}%`);
    console.log('='.repeat(60));
    
    res.json({
      success: true,
      stats: {
        total_visites: parseInt(stats.total_visites),
        total_envoyees: parseInt(stats.total_envoyees),
        total_a_envoyer: parseInt(stats.total_a_envoyer),
        a_envoyer_j7: parseInt(stats.a_envoyer_j7),
        total_programmees: parseInt(stats.total_programmees),
        taux_envoi: tauxEnvoi
      },
      date_actuelle: new Date().toISOString().split('T')[0],
      date_j7: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    
  } catch (error) {
    console.error('❌ Erreur debug stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/planning/test-date', protect, async (req, res) => {
  const maintenant = new Date();
  const dans7Jours = new Date();
  dans7Jours.setDate(maintenant.getDate() + 7);
  
  const planningsJ7 = await Planning.findAll({
    where: {
      date_visite: {
        [Op.gte]: dans7Jours.toISOString().split('T')[0],
        [Op.lt]: new Date(dans7Jours.setDate(dans7Jours.getDate() + 1)).toISOString().split('T')[0]
      }
    },
    attributes: ['id_planning', 'date_visite', 'statut', 'convocation_envoyee'],
    raw: true
  });
  
  res.json({
    maintenant: maintenant.toISOString(),
    dans7Jours: dans7Jours.toISOString(),
    planningsJ7: planningsJ7,
    total: planningsJ7.length
  });
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
      group: ['type_visite'],
      raw: true
    });
    
    const parResultat = await Visite.findAll({
      where: whereClause,
      attributes: ['resultat', [Visite.sequelize.fn('COUNT', '*'), 'count']],
      group: ['resultat'],
      raw: true
    });
    
    const aujourdhui = new Date();
    const semaineActuelle = getNumeroSemaine(aujourdhui);
    const anneeActuelle = aujourdhui.getFullYear();
    
    const planningSemaine = await Planning.count({
      where: { semaine: semaineActuelle, annee: anneeActuelle }
    });
    
    const annee = aujourdhui.getFullYear();
    const visitesMois = await Visite.findAll({
      where: whereClause,
      attributes: [
        [Visite.sequelize.fn('MONTH', Visite.sequelize.col('date_visite')), 'mois'],
        [Visite.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: {
        ...whereClause,
        [Op.and]: [
          Visite.sequelize.where(Visite.sequelize.fn('YEAR', Visite.sequelize.col('date_visite')), annee)
        ]
      },
      group: [Visite.sequelize.fn('MONTH', Visite.sequelize.col('date_visite'))],
      raw: true
    });
    
    const parMois = Array(12).fill(0);
    visitesMois.forEach(item => {
      const mois = parseInt(item.mois) - 1;
      parMois[mois] = parseInt(item.count);
    });
    
    const aptes = parResultat.find(r => r.resultat === 'Apte')?.count || 0;
    const reserves = parResultat.find(r => r.resultat === 'Apte avec réserves')?.count || 0;
    const inaptes = (parResultat.find(r => r.resultat === 'Inapte temporaire')?.count || 0) + 
                    (parResultat.find(r => r.resultat === 'Inapte définitif')?.count || 0);
    
    res.json({
      success: true,
      stats: {
        total,
        aptes,
        reserves,
        inaptes,
        parType: parType.map(p => ({ type: p.type_visite, count: p.count })),
        parResultat: parResultat.map(r => ({ resultat: r.resultat, count: r.count })),
        planningSemaine,
        parMois
      }
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
    
    res.json({
      success: true,
      stats: {
        total_visites: total,
        planning_total: planningTotal,
        formulaire_total: formTotal,
        planning_actions: planningActions
      }
    });
  } catch (error) {
    console.error('❌ Erreur stats globales:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;