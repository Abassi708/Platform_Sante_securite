// backend/controllers/visiteController.js
const { Op } = require('sequelize');
const Visite = require('../models/Visite');
const Planning = require('../models/Planning');
const Agent = require('../models/Agent');
const User = require('../models/User');
const Notification = require('../models/Notification');

// ========== CRÉER UNE VISITE ==========
const createVisite = async (req, res) => {
  try {
    const visiteData = req.body;
    visiteData.created_by = req.user.id;
    
    const visite = await Visite.create(visiteData);
    
    // Mettre à jour la date de dernière visite de l'agent
    await Agent.update(
      { date_derniere_visite: visiteData.date_visite },
      { where: { matricule_agent: visiteData.matricule_agent } }
    );
    
    // Si liée à un planning, le marquer comme effectué
    if (visiteData.id_planning) {
      await Planning.update(
        { 
          visite_effectuee: true,
          statut: 'Effectué'
        },
        { where: { id_planning: visiteData.id_planning } }
      );
    }
    
    res.status(201).json({
      success: true,
      message: 'Visite enregistrée avec succès',
      visite
    });
    
  } catch (error) {
    console.error('❌ Erreur création visite:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== RÉCUPÉRER TOUTES LES VISITES ==========
const getVisites = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, type, resultat, dateDebut, dateFin, agentId } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { '$Agent.nom$': { [Op.like]: `%${search}%` } },
        { '$Agent.prenom$': { [Op.like]: `%${search}%` } },
        { medecin: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (type && type !== 'all') whereClause.type_visite = type;
    if (resultat && resultat !== 'all') whereClause.resultat = resultat;
    if (agentId && agentId !== 'all') whereClause.matricule_agent = agentId;
    
    if (dateDebut && dateFin) {
      whereClause.date_visite = {
        [Op.between]: [dateDebut, dateFin]
      };
    }
    
    const { count, rows } = await Visite.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Agent,
          attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence']
        },
        {
          model: Planning,
          attributes: ['id_planning', 'date_visite', 'heure_visite']
        }
      ],
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

// ========== RÉCUPÉRER LE PLANNING D'UNE SEMAINE ==========
const getPlanningSemaine = async (req, res) => {
  try {
    const { semaine, annee } = req.params;
    
    const planning = await Planning.findAll({
      where: { semaine, annee },
      include: [
        {
          model: Agent,
          attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation']
        }
      ],
      order: [['date_visite', 'ASC'], ['heure_visite', 'ASC']]
    });
    
    res.json({
      success: true,
      planning,
      total: planning.length
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération planning:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== GÉNÉRER UN NOUVEAU PLANNING ==========
const genererPlanning = async (req, res) => {
  try {
    const { dateDebut } = req.body;
    
    if (!dateDebut) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date de début requise' 
      });
    }
    
    const planning = await genererPlanningAutomatique(dateDebut, req.user.id);
    
    res.json({
      success: true,
      message: `Planning généré avec ${planning.length} visites`,
      planning
    });
    
  } catch (error) {
    console.error('❌ Erreur génération planning:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== FONCTION DE GÉNÉRATION AUTOMATIQUE ==========
async function genererPlanningAutomatique(dateDebut, userId) {
  // Jours fériés tunisiens 2026
  const joursFeries = [
    '2026-01-01', '2026-01-14', '2026-03-20', '2026-04-09',
    '2026-05-01', '2026-07-25', '2026-08-13', '2026-10-15',
    '2026-03-31', '2026-04-01', '2026-06-07', '2026-06-08',
    '2026-06-28', '2026-09-05'
  ];
  
  const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
  const planning = [];
  
  const debut = new Date(dateDebut);
  const annee = debut.getFullYear();
  const semaine = getNumeroSemaine(debut);
  
  // Récupérer tous les agents actifs
  const agents = await Agent.findAll({
    where: { statut: 'actif' },
    order: [['matricule_agent', 'ASC']]
  });
  
  if (agents.length === 0) return [];
  
  // Calculer la priorité pour chaque agent
  const agentsAvecPriorite = agents.map(agent => {
    let priorite = 0;
    
    if (!agent.date_derniere_visite) {
      priorite += 100; // Jamais visité
    } else {
      const joursDepuis = Math.floor(
        (new Date() - new Date(agent.date_derniere_visite)) / (1000 * 60 * 60 * 24)
      );
      priorite += Math.min(joursDepuis, 365);
    }
    
    return { ...agent.toJSON(), priorite };
  });
  
  // Trier par priorité
  agentsAvecPriorite.sort((a, b) => b.priorite - a.priorite);
  
  // Générer pour chaque jour de la semaine (mardi à vendredi)
  for (let i = 1; i <= 4; i++) { // 1 = mardi, 4 = vendredi
    const jour = new Date(debut);
    jour.setDate(debut.getDate() + i);
    const dateStr = jour.toISOString().split('T')[0];
    
    // Vérifier si c'est un jour ouvré
    if (jour.getDay() === 0 || jour.getDay() === 6) continue; // Samedi ou dimanche
    if (joursFeries.includes(dateStr)) continue; // Jour férié
    
    // Pour chaque créneau
    for (const creneau of creneaux) {
      if (agentsAvecPriorite.length === 0) break;
      
      // Prendre l'agent avec la plus haute priorité
      const agent = agentsAvecPriorite.shift();
      
      planning.push({
        matricule_agent: agent.matricule_agent,
        date_visite: dateStr,
        heure_visite: creneau,
        type_visite: 'Périodique',
        statut: 'Programmé',
        priorite: agent.priorite,
        semaine,
        annee,
        created_by: userId
      });
    }
  }
  
  // Sauvegarder en base
  if (planning.length > 0) {
    await Planning.bulkCreate(planning);
  }
  
  return planning;
}

function getNumeroSemaine(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

// ========== STATISTIQUES DES VISITES ==========
const getStatsVisites = async (req, res) => {
  try {
    const total = await Visite.count();
    
    const parType = await Visite.findAll({
      attributes: ['type_visite', [Visite.sequelize.fn('COUNT', '*'), 'count']],
      group: ['type_visite']
    });
    
    const parResultat = await Visite.findAll({
      attributes: ['resultat', [Visite.sequelize.fn('COUNT', '*'), 'count']],
      group: ['resultat']
    });
    
    const planningSemaine = await Planning.count({
      where: {
        semaine: getNumeroSemaine(new Date()),
        annee: new Date().getFullYear()
      }
    });
    
    const parMois = Array(12).fill(0);
    const visitesMois = await Visite.findAll({
      attributes: [
        [Visite.sequelize.fn('MONTH', Visite.sequelize.col('date_visite')), 'mois'],
        [Visite.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: Visite.sequelize.where(
        Visite.sequelize.fn('YEAR', Visite.sequelize.col('date_visite')),
        new Date().getFullYear()
      ),
      group: [Visite.sequelize.fn('MONTH', Visite.sequelize.col('date_visite'))]
    });
    
    visitesMois.forEach(item => {
      const mois = parseInt(item.dataValues.mois) - 1;
      parMois[mois] = parseInt(item.dataValues.count);
    });
    
    res.json({
      success: true,
      stats: {
        total,
        parType,
        parResultat,
        planningSemaine,
        parMois
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur stats visites:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== RÉAFFECTER UNE VISITE ==========
const reaffecterVisite = async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;
    
    const ancienPlanning = await Planning.findByPk(id);
    if (!ancienPlanning) {
      return res.status(404).json({ success: false, message: 'Planning non trouvé' });
    }
    
    // Marquer comme reprogrammé
    ancienPlanning.statut = 'Reporté';
    ancienPlanning.reprogrammee = true;
    ancienPlanning.motif_reprogrammation = motif;
    await ancienPlanning.save();
    
    // Trouver un autre agent
    const autresAgents = await Agent.findAll({
      where: { 
        statut: 'actif',
        matricule_agent: { [Op.ne]: ancienPlanning.matricule_agent }
      }
    });
    
    if (autresAgents.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucun agent disponible pour réaffectation' 
      });
    }
    
    const nouvelAgent = autresAgents[0];
    
    // Créer nouvelle affectation
    const nouveauPlanning = await Planning.create({
      matricule_agent: nouvelAgent.matricule_agent,
      date_visite: ancienPlanning.date_visite,
      heure_visite: ancienPlanning.heure_visite,
      type_visite: ancienPlanning.type_visite,
      statut: 'Programmé',
      visite_originale_id: ancienPlanning.id_planning,
      semaine: ancienPlanning.semaine,
      annee: ancienPlanning.annee,
      created_by: req.user.id
    });
    
    res.json({
      success: true,
      message: 'Visite réaffectée avec succès',
      planning: nouveauPlanning
    });
    
  } catch (error) {
    console.error('❌ Erreur réaffectation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createVisite,
  getVisites,
  getPlanningSemaine,
  genererPlanning,
  getStatsVisites,
  reaffecterVisite
};