// backend/controllers/visiteController.js
const { Op } = require('sequelize');
const Visite = require('../models/Visite');
const Planning = require('../models/Planning');
const Agent = require('../models/Agent');
const User = require('../models/User');
const Notification = require('../models/Notification');
const moment = require('moment');
const planningService = require('../services/planningService');
const notificationService = require('../services/notificationIntelligenteService');
const convocationService = require('../services/convocationService');

// ========== FONCTIONS UTILITAIRES ==========
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

// ============================================================
//  AGENTS
// ============================================================
const getAgents = async (req, res) => {
  try {
    const agents = await Agent.findAll({
      attributes: [
        'matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation',
        'statut', 'date_derniere_visite', 'date_fin_inaptitude', 'date_prochaine_inaptitude'
      ],
      order: [['nom', 'ASC']]
    });
    res.json({ success: true, agents });
  } catch (error) {
    console.error('❌ Erreur agents:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ============================================================
//  CRÉER UNE VISITE MANUELLEMENT (FORMULAIRE)
// ============================================================
const createVisite = async (req, res) => {
  try {
    const visiteData = req.body;
    
    console.log('📦 Données reçues pour création visite:', visiteData);
    
    if (!visiteData.matricule_agent) {
      return res.status(400).json({ success: false, message: 'Matricule agent requis' });
    }
    if (!visiteData.date_visite) {
      return res.status(400).json({ success: false, message: 'Date de visite requise' });
    }
    
    visiteData.created_by = req.user.id;
    visiteData.source = 'FORMULAIRE';
    visiteData.type_action = 'SAISIE_MANUELLE';
    
    if (!visiteData.type_visite) visiteData.type_visite = 'Périodique';
    if (!visiteData.resultat) visiteData.resultat = 'Apte';
    if (!visiteData.medecin) visiteData.medecin = 'Dr. Mahmoud Khelifi';
    
    const visite = await Visite.create(visiteData);
    
    await Agent.update(
      { date_derniere_visite: visiteData.date_visite },
      { where: { matricule_agent: visiteData.matricule_agent } }
    );
    
    console.log(`✅ Visite manuelle créée pour agent #${visiteData.matricule_agent} le ${visiteData.date_visite}`);
    
    res.status(201).json({
      success: true,
      message: 'Visite enregistrée avec succès',
      visite
    });
    
  } catch (error) {
    console.error('❌ Erreur création visite manuelle:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  RÉCUPÉRER TOUTES LES VISITES (FORMULAIRE UNIQUEMENT)
// ============================================================
const getVisites = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type, resultat, dateDebut, dateFin, agentId } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = { 
      source: 'FORMULAIRE',
      type_action: 'SAISIE_MANUELLE'
    };
    
    if (search) {
      whereClause[Op.or] = [
        { '$visiteAgent.nom$': { [Op.like]: `%${search}%` } },
        { '$visiteAgent.prenom$': { [Op.like]: `%${search}%` } },
        { medecin: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (type && type !== 'all') whereClause.type_visite = type;
    if (resultat && resultat !== 'all') whereClause.resultat = resultat;
    if (agentId && agentId !== 'all') whereClause.matricule_agent = agentId;
    
    if (dateDebut && dateFin) {
      whereClause.date_visite = { [Op.between]: [dateDebut, dateFin] };
    }
    
    const { count, rows } = await Visite.findAndCountAll({
      where: whereClause,
      include: [{
        model: Agent,
        as: 'visiteAgent',
        attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence']
      }],
      order: [['date_visite', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      success: true,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / limit),
      visites: rows
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération visites:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  RÉCUPÉRER LE PLANNING D'UNE SEMAINE
// ============================================================
const getPlanningSemaine = async (req, res) => {
  try {
    const { semaine, annee } = req.params;

    const planning = await Planning.findAll({
      where: { semaine: parseInt(semaine), annee: parseInt(annee) },
      include: [{
        model: Agent,
        as: 'planningAgent',
        attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation', 'date_derniere_visite']
      }],
      order: [['date_visite', 'ASC'], ['heure_visite', 'ASC']]
    });

    console.log(`✅ ${planning.length} visite(s) trouvée(s) pour semaine ${semaine}/${annee}`);

    const planningEnrichi = planning.map(p => {
      const item = p.toJSON();
      item.actions_autorisees = getActionsAutorisees(item.type_visite, item.statut);
      return item;
    });

    res.json({ success: true, planning: planningEnrichi });
  } catch (error) {
    console.error('❌ Erreur récupération planning:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  GÉNÉRER PLANNING AUTO
// ============================================================
const genererPlanning = async (req, res) => {
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
};

// ============================================================
//  VÉRIFIER SI UN CRÉNEAU EST DISPONIBLE
// ============================================================
const verifierCreneau = async (req, res) => {
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
};

// ============================================================
//  MARQUER UNE VISITE COMME EFFECTUÉE
// ============================================================
const effectuerVisite = async (req, res) => {
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
      details_action: JSON.stringify({ medecin: medecin || 'Dr. Mahmoud Khelifi', resultat: resultat || 'Apte', observation: observation || '' }),
      source: 'PLANNING',
      created_by: req.user.id
    });

    if (planning.type_visite === 'Périodique') {
      await Agent.update({ date_derniere_visite: planning.date_visite }, { where: { matricule_agent: planning.matricule_agent } });
    }

    if (planning.type_visite === 'Reprise' && resultat && resultat.startsWith('Apte')) {
      await Agent.update({ date_fin_inaptitude: null, date_debut_inaptitude: null }, { where: { matricule_agent: planning.matricule_agent } });
    }

    res.json({ success: true, message: 'Visite marquée comme effectuée', planning });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  ANNULATION
// ============================================================
const annulerVisite = async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;

    const planning = await Planning.findByPk(id);
    if (!planning) return res.status(404).json({ success: false, message: 'Planning non trouvé' });

    if (planning.type_visite === 'Périodique') {
      return res.status(400).json({ success: false, message: 'Les visites périodiques ne peuvent pas être annulées. Utilisez la reprogrammation.' });
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
};

// ============================================================
//  REPROGRAMMATION MANUELLE
// ============================================================
const reprogrammerManuel = async (req, res) => {
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
};

// ============================================================
//  REPROGRAMMATION AUTOMATIQUE
// ============================================================
const reprogrammerAuto = async (req, res) => {
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
};

// ============================================================
//  PLANIFICATION MANUELLE RECLASSEMENT
// ============================================================
const planifierReclassement = async (req, res) => {
  try {
    const { matricule_agent, date_visite, heure_visite, motif } = req.body;
    
    if (!matricule_agent) return res.status(400).json({ success: false, message: 'Matricule agent requis' });
    if (!date_visite) return res.status(400).json({ success: false, message: 'Date de visite requise' });

    const agent = await Agent.findByPk(matricule_agent);
    if (!agent) return res.status(404).json({ success: false, message: 'Agent non trouvé' });

    const planning = await planningService.planifierVisiteReclassement(agent, req.user.id, date_visite, heure_visite || '09:00:00', motif);
    
    res.json({ success: true, message: 'Visite de reclassement planifiée', planning });
  } catch (error) {
    console.error('❌ Erreur planification reclassement:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  PLANIFICATION MANUELLE EMBAUCHE
// ============================================================
const planifierEmbauche = async (req, res) => {
  try {
    const { matricule_agent, date_visite, heure_visite, motif } = req.body;

    if (!matricule_agent) return res.status(400).json({ success: false, message: 'Matricule agent requis' });
    if (!date_visite) return res.status(400).json({ success: false, message: 'Date de visite requise' });

    const agent = await Agent.findByPk(matricule_agent);
    if (!agent) return res.status(404).json({ success: false, message: 'Agent non trouvé' });

    const planning = await planningService.planifierVisiteEmbauche(agent, req.user.id, date_visite, heure_visite || '09:00:00', motif);
    
    res.json({ success: true, message: "Visite d'embauche planifiée", planning });
  } catch (error) {
    console.error("❌ Erreur planification embauche:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  RÉCUPÉRER LES VISITES PAR TYPE
// ============================================================
const getReclassements = async (req, res) => {
  try {
    const reclassements = await Planning.findAll({
      where: { type_visite: 'Reclassement', date_visite: { [Op.gte]: new Date() }, statut: 'Programmé' },
      include: [{ model: Agent, as: 'planningAgent', attributes: ['nom', 'prenom', 'code_agence', 'code_affectation'] }],
      order: [['date_visite', 'ASC']]
    });
    res.json({ success: true, planning: reclassements });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getEmbauches = async (req, res) => {
  try {
    const embauches = await Planning.findAll({
      where: { type_visite: 'Embauche', date_visite: { [Op.gte]: new Date() }, statut: 'Programmé' },
      include: [{ model: Agent, as: 'planningAgent', attributes: ['nom', 'prenom', 'code_agence', 'code_affectation'] }],
      order: [['date_visite', 'ASC']]
    });
    res.json({ success: true, planning: embauches });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  CONVOCATIONS
// ============================================================
const getConvocationsAEnvoyer = async (req, res) => {
  try {
    const dans7Jours = new Date();
    dans7Jours.setDate(dans7Jours.getDate() + 7);
    const dateDebut = new Date(dans7Jours); dateDebut.setHours(0, 0, 0, 0);
    const dateFin = new Date(dans7Jours); dateFin.setHours(23, 59, 59, 999);

    const plannings = await Planning.findAll({
      where: { date_visite: { [Op.between]: [dateDebut, dateFin] }, convocation_envoyee: false, statut: 'Programmé' },
      include: [{ model: Agent, as: 'planningAgent', attributes: ['nom', 'prenom', 'matricule_agent', 'code_agence', 'code_affectation'] }],
      order: [['date_visite', 'ASC'], ['heure_visite', 'ASC']]
    });
    res.json({ success: true, convocations: plannings, count: plannings.length });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const envoyerConvocation = async (req, res) => {
  try {
    const { id_planning } = req.body;
    if (!id_planning) return res.status(400).json({ success: false, message: 'ID planning requis' });
    const result = await convocationService.envoyerConvocationPlanning(id_planning);
    res.json(result);
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const envoyerConvocationsGroupees = async (req, res) => {
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
};

const getConvocationsStats = async (req, res) => {
  try {
    const stats = await convocationService.getStatsConvocations();
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  HISTORIQUE
// ============================================================
const getHistoriquePlanning = async (req, res) => {
  try {
    const { matricule } = req.query;
    const whereClause = { 
      source: 'PLANNING',
      type_action: { [Op.in]: ['PROGRAMMATION', 'EFFECTUEE', 'REPROGRAMMEE', 'ANNULEE', 'REAFFECTEE'] }
    };
    if (matricule) whereClause.matricule_agent = matricule;

    const historique = await Visite.findAll({
      where: whereClause,
      include: [{ model: Agent, as: 'visiteAgent', attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence'] }],
      order: [['created_at', 'DESC']],
      limit: 500
    });

    res.json({ success: true, historique });
  } catch (error) {
    console.error('❌ Erreur historique planning:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getHistoriqueFormulaire = async (req, res) => {
  try {
    const { matricule } = req.query;
    const whereClause = { 
      source: 'FORMULAIRE',
      type_action: 'SAISIE_MANUELLE'
    };
    if (matricule) whereClause.matricule_agent = matricule;

    const historique = await Visite.findAll({
      where: whereClause,
      include: [{ model: Agent, as: 'visiteAgent', attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence'] }],
      order: [['date_visite', 'DESC']],
      limit: 500
    });

    res.json({ success: true, historique });
  } catch (error) {
    console.error('❌ Erreur historique formulaire:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStatsSources = async (req, res) => {
  try {
    const stats = await Visite.findAll({
      attributes: ['source', [Visite.sequelize.fn('COUNT', '*'), 'nombre']],
      group: ['source']
    });
    res.json({ success: true, stats: stats.map(s => ({ source: s.source, nombre: parseInt(s.dataValues.nombre) })) });
  } catch (error) {
    console.error('❌ Erreur stats sources:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getStatsActions = async (req, res) => {
  try {
    const stats = await Visite.findAll({
      where: { source: 'PLANNING' },
      attributes: ['type_action', [Visite.sequelize.fn('COUNT', '*'), 'nombre']],
      group: ['type_action']
    });
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Erreur stats actions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================
//  STATISTIQUES VISITES
// ============================================================
const getVisitesStats = async (req, res) => {
  try {
    const total = await Visite.count();
    const parType = await Visite.findAll({ attributes: ['type_visite', [Visite.sequelize.fn('COUNT', '*'), 'count']], group: ['type_visite'] });
    const parResultat = await Visite.findAll({ attributes: ['resultat', [Visite.sequelize.fn('COUNT', '*'), 'count']], group: ['resultat'] });
    
    const aujourdhui = new Date();
    const semaineActuelle = getNumeroSemaine(aujourdhui);
    const anneeActuelle = aujourdhui.getFullYear();
    const planningSemaine = await Planning.count({ where: { semaine: semaineActuelle, annee: anneeActuelle } });

    const parMois = Array(12).fill(0);
    const visitesMois = await Visite.findAll({
      attributes: [[Visite.sequelize.fn('MONTH', Visite.sequelize.col('date_visite')), 'mois'], [Visite.sequelize.fn('COUNT', '*'), 'count']],
      where: Visite.sequelize.where(Visite.sequelize.fn('YEAR', Visite.sequelize.col('date_visite')), anneeActuelle),
      group: [Visite.sequelize.fn('MONTH', Visite.sequelize.col('date_visite'))],
      raw: true
    });
    visitesMois.forEach(item => { const mois = parseInt(item.mois) - 1; parMois[mois] = parseInt(item.count); });

    const aptes = parResultat.find(r => r.resultat === 'Apte')?.dataValues?.count || 0;
    const reserves = parResultat.find(r => r.resultat === 'Apte avec réserves')?.dataValues?.count || 0;
    const inaptes = (parResultat.find(r => r.resultat === 'Inapte temporaire')?.dataValues?.count || 0) + (parResultat.find(r => r.resultat === 'Inapte définitif')?.dataValues?.count || 0);

    res.json({
      success: true,
      stats: { total, aptes, reserves, inaptes, parType: parType.map(p => ({ type: p.type_visite, count: p.dataValues.count })), parResultat: parResultat.map(r => ({ resultat: r.resultat, count: r.dataValues.count })), planningSemaine, parMois }
    });
  } catch (error) {
    console.error('❌ Erreur stats visites:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAgents,
  createVisite,
  getVisites,
  getPlanningSemaine,
  genererPlanning,
  verifierCreneau,
  effectuerVisite,
  annulerVisite,
  reprogrammerManuel,
  reprogrammerAuto,
  planifierReclassement,
  planifierEmbauche,
  getReclassements,
  getEmbauches,
  getConvocationsAEnvoyer,
  envoyerConvocation,
  envoyerConvocationsGroupees,
  getConvocationsStats,
  getHistoriquePlanning,
  getHistoriqueFormulaire,
  getStatsSources,
  getStatsActions,
  getVisitesStats
};