// backend/routes/visiteRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { Planning, Visite, Agent } = require('../models');
const { Op } = require('sequelize');

// ========== FONCTIONS UTILITAIRES ==========
function getNumeroSemaine(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function getLundiSemaine(numeroSemaine, annee) {
  const simple = new Date(annee, 0, 1 + (numeroSemaine - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
}

// Jours fériés tunisiens 2026
const joursFeries = [
  '2026-01-01', // Jour de l'an
  '2026-01-14', // Fête de la Révolution
  '2026-03-20', // Fête de l'Indépendance
  '2026-04-09', // Fête des Martyrs
  '2026-05-01', // Fête du Travail
  '2026-07-25', // Fête de la République
  '2026-08-13', // Fête de la Femme
  '2026-10-15', // Fête de l'Évacuation
  '2026-03-31', // Aïd el-Fitr
  '2026-04-01', // Aïd el-Fitr
  '2026-06-07', // Aïd el-Adha
  '2026-06-08', // Aïd el-Adha
  '2026-06-28', // Ras el-Am el-Hijri
  '2026-09-05'  // Mouled
];

// ========== ROUTE POUR RÉCUPÉRER TOUS LES AGENTS ==========
router.get('/agents', protect, async (req, res) => {
  try {
    const agents = await Agent.findAll({
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation', 'statut', 'date_derniere_visite'],
      order: [['nom', 'ASC']]
    });
    res.json({ success: true, agents });
  } catch (error) {
    console.error('❌ Erreur agents:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ========== RÉCUPÉRER LE PLANNING D'UNE SEMAINE ==========
router.get('/planning/:semaine/:annee', protect, async (req, res) => {
  try {
    const { semaine, annee } = req.params;
    console.log(`📅 Récupération planning semaine ${semaine}/${annee}`);
    
    const planning = await Planning.findAll({
      where: { 
        semaine: parseInt(semaine), 
        annee: parseInt(annee) 
      },
      include: [{
        model: Agent,
        as: 'planningAgent',
        attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation', 'date_derniere_visite']
      }],
      order: [['date_visite', 'ASC'], ['heure_visite', 'ASC']]
    });
    
    console.log(`✅ ${planning.length} visites trouvées`);
    
    res.json({
      success: true,
      planning: planning || []
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération planning:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== GÉNÉRER UN NOUVEAU PLANNING INTELLIGENT ==========
router.post('/planning/generer', protect, async (req, res) => {
  try {
    const { dateDebut } = req.body;
    console.log('🔄 Génération intelligente du planning pour:', dateDebut);
    
    if (!dateDebut) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date de début requise' 
      });
    }

    // Récupérer tous les agents actifs
    const agents = await Agent.findAll({
      where: { statut: 'actif' }
    });

    if (agents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun agent actif disponible'
      });
    }

    // Calculer la semaine et l'année
    const date = new Date(dateDebut);
    const semaine = getNumeroSemaine(date);
    const annee = date.getFullYear();
    
    // Vérifier si un planning existe déjà pour cette semaine
    const existingPlannings = await Planning.count({
      where: { semaine, annee }
    });
    
    if (existingPlannings > 0) {
      return res.status(400).json({
        success: false,
        message: 'Un planning existe déjà pour cette semaine'
      });
    }
    
    // ========== ALGORITHME INTELLIGENT DE SÉLECTION DES AGENTS ==========
    
    // Étape 1: Calculer la priorité pour chaque agent
    const agentsAvecPriorite = agents.map(agent => {
      let priorite = 0;
      
      // Critère 1: Date de dernière visite (plus c'est ancien, plus la priorité est élevée)
      if (!agent.date_derniere_visite) {
        priorite += 100; // Jamais visité = priorité max
      } else {
        const joursDepuisVisite = Math.floor(
          (new Date() - new Date(agent.date_derniere_visite)) / (1000 * 60 * 60 * 24)
        );
        priorite += Math.min(joursDepuisVisite, 365); // Max 365 jours
      }
      
      // Critère 2: Type d'affectation (terrain, chauffeur = priorité)
      if (agent.code_affectation === 3) priorite += 30; // Terrain
      if (agent.code_affectation === 5) priorite += 20; // Chauffeur
      
      // Critère 3: Inaptitude temporaire
      if (agent.date_fin_inaptitude && new Date(agent.date_fin_inaptitude) > new Date()) {
        priorite += 50;
      }
      
      return {
        ...agent.toJSON(),
        priorite,
        dejaProgramme: false,
        jourProgramme: null
      };
    });
    
    // Trier par priorité (décroissante)
    agentsAvecPriorite.sort((a, b) => b.priorite - a.priorite);
    
    // Étape 2: Créer les créneaux disponibles
    const jours = [1, 2, 3, 4]; // Mardi, Mercredi, Jeudi, Vendredi
    const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
    
    // Structure pour suivre les agents programmés par jour
    const agentsParJour = {
      [jours[0]]: [], // Mardi
      [jours[1]]: [], // Mercredi
      [jours[2]]: [], // Jeudi
      [jours[3]]: []  // Vendredi
    };
    
    const planningEntries = [];
    
    // Étape 3: Distribution intelligente des agents
    for (const jourOffset of jours) {
      const jourDate = new Date(date);
      jourDate.setDate(date.getDate() + jourOffset);
      const dateStr = jourDate.toISOString().split('T')[0];
      
      // Vérifier si c'est un jour ouvré (pas férié)
      if (joursFeries.includes(dateStr)) {
        console.log(`📆 Jour férié: ${dateStr} - pas de visites`);
        continue;
      }
      
      // Filtrer les agents disponibles pour ce jour
      const agentsDisponibles = agentsAvecPriorite.filter(agent => 
        !agent.dejaProgramme && !agentsParJour[jourOffset].includes(agent.matricule_agent)
      );
      
      if (agentsDisponibles.length === 0) {
        console.log(`⚠️ Plus d'agents disponibles pour ${dateStr}`);
        continue;
      }
      
      // Trier par priorité
      agentsDisponibles.sort((a, b) => b.priorite - a.priorite);
      
      // Pour chaque créneau
      for (const creneau of creneaux) {
        if (agentsDisponibles.length === 0) break;
        
        // Prendre l'agent avec la plus haute priorité
        const agentChoisi = agentsDisponibles.shift();
        
        // Marquer comme programmé
        agentChoisi.dejaProgramme = true;
        agentsParJour[jourOffset].push(agentChoisi.matricule_agent);
        
        planningEntries.push({
          matricule_agent: agentChoisi.matricule_agent,
          date_visite: dateStr,
          heure_visite: creneau,
          type_visite: 'Périodique',
          statut: 'Programmé',
          visite_effectuee: false,
          reprogrammee: false,
          priorite: agentChoisi.priorite,
          semaine: semaine,
          annee: annee,
          created_by: req.user.id
        });
        
        console.log(`   ✅ ${dateStr} ${creneau} - Agent ${agentChoisi.matricule_agent} (Agence ${agentChoisi.code_agence}, priorité ${agentChoisi.priorite})`);
      }
    }

    // Sauvegarder en base
    if (planningEntries.length > 0) {
      await Planning.bulkCreate(planningEntries);
    }

    console.log(`✅ Planning intelligent généré avec ${planningEntries.length} visites`);
    
    res.json({
      success: true,
      message: `Planning généré avec ${planningEntries.length} visites selon les priorités`,
      planning: planningEntries
    });
    
  } catch (error) {
    console.error('❌ Erreur génération planning:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== RÉAFFECTATION INTELLIGENTE ==========
router.post('/planning/:id/reaffecter', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;
    
    console.log('🔄 Réaffectation intelligente planning ID:', id, 'Motif:', motif);
    
    const ancienPlanning = await Planning.findByPk(id);
    if (!ancienPlanning) {
      return res.status(404).json({ 
        success: false, 
        message: 'Planning non trouvé' 
      });
    }
    
    // Marquer comme reprogrammé
    ancienPlanning.statut = 'Reporté';
    ancienPlanning.reprogrammee = true;
    ancienPlanning.motif_reprogrammation = motif;
    await ancienPlanning.save();
    
    // Récupérer tous les agents actifs
    const agents = await Agent.findAll({
      where: { statut: 'actif' }
    });
    
    // Calculer priorités pour la réaffectation
    const agentsAvecPriorite = agents.map(agent => {
      let priorite = 0;
      
      if (!agent.date_derniere_visite) {
        priorite += 100;
      } else {
        const joursDepuisVisite = Math.floor(
          (new Date() - new Date(agent.date_derniere_visite)) / (1000 * 60 * 60 * 24)
        );
        priorite += Math.min(joursDepuisVisite, 365);
      }
      
      return {
        ...agent.toJSON(),
        priorite
      };
    });
    
    // Exclure l'agent actuel et ceux déjà programmés ce jour-là
    const planningJour = await Planning.findAll({
      where: {
        date_visite: ancienPlanning.date_visite,
        statut: 'Programmé',
        id_planning: { [Op.ne]: id }
      }
    });
    
    const exclus = planningJour.map(p => p.matricule_agent);
    exclus.push(ancienPlanning.matricule_agent);
    
    const disponibles = agentsAvecPriorite.filter(a => !exclus.includes(a.matricule_agent));
    
    if (disponibles.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucun agent disponible pour réaffectation' 
      });
    }
    
    // Choisir le meilleur agent (priorité la plus haute)
    disponibles.sort((a, b) => b.priorite - a.priorite);
    const nouvelAgent = disponibles[0];
    
    // Créer nouvelle affectation
    const nouveauPlanning = await Planning.create({
      matricule_agent: nouvelAgent.matricule_agent,
      date_visite: ancienPlanning.date_visite,
      heure_visite: ancienPlanning.heure_visite,
      type_visite: ancienPlanning.type_visite,
      statut: 'Programmé',
      visite_effectuee: false,
      reprogrammee: false,
      visite_originale_id: ancienPlanning.id_planning,
      semaine: ancienPlanning.semaine,
      annee: ancienPlanning.annee,
      priorite: nouvelAgent.priorite,
      created_by: req.user.id
    });
    
    console.log(`✅ Réaffectation: Agent ${nouvelAgent.matricule_agent} (priorité ${nouvelAgent.priorite}) remplace ${ancienPlanning.matricule_agent}`);
    
    res.json({
      success: true,
      message: 'Visite réaffectée avec succès',
      planning: nouveauPlanning
    });
    
  } catch (error) {
    console.error('❌ Erreur réaffectation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== RÉCUPÉRER LES VISITES ==========
router.get('/visites', protect, async (req, res) => {
  try {
    const { limit = 1000, search, type, resultat, dateDebut, dateFin, agentId } = req.query;
    console.log('📋 Récupération des visites');
    
    let whereClause = {};
    
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
      whereClause.date_visite = {
        [Op.between]: [dateDebut, dateFin]
      };
    }
    
    const visites = await Visite.findAll({
      where: whereClause,
      include: [{
        model: Agent,
        as: 'visiteAgent',
        attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence']
      }],
      order: [['date_visite', 'DESC'], ['heure_visite', 'DESC']],
      limit: parseInt(limit)
    });
    
    res.json({
      success: true,
      visites: visites || []
    });
    
  } catch (error) {
    console.error('❌ Erreur récupération visites:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== STATISTIQUES DES VISITES ==========
router.get('/visites/stats', protect, async (req, res) => {
  try {
    console.log('📊 Calcul des statistiques...');
    
    const total = await Visite.count();
    
    const parTypeRaw = await Visite.findAll({
      attributes: [
        'type_visite',
        [Visite.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['type_visite'],
      raw: true
    });
    
    const parResultatRaw = await Visite.findAll({
      attributes: [
        'resultat',
        [Visite.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['resultat'],
      raw: true
    });
    
    const aujourdhui = new Date();
    const semaineActuelle = getNumeroSemaine(aujourdhui);
    const anneeActuelle = aujourdhui.getFullYear();
    
    const planningSemaine = await Planning.count({
      where: {
        semaine: semaineActuelle,
        annee: anneeActuelle
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
        anneeActuelle
      ),
      group: [Visite.sequelize.fn('MONTH', Visite.sequelize.col('date_visite'))],
      raw: true
    });
    
    visitesMois.forEach(item => {
      const mois = parseInt(item.mois) - 1;
      parMois[mois] = parseInt(item.count);
    });
    
    const parType = parTypeRaw.map(item => ({
      type_visite: item.type_visite || 'Non spécifié',
      count: parseInt(item.count)
    }));
    
    const parResultat = parResultatRaw.map(item => ({
      resultat: item.resultat || 'Non spécifié',
      count: parseInt(item.count)
    }));
    
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
    console.error('❌ Erreur stats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== CRÉER UNE VISITE ==========
router.post('/visites', protect, async (req, res) => {
  try {
    const visiteData = req.body;
    console.log('📝 Création visite:', visiteData);
    
    if (!visiteData.matricule_agent) {
      return res.status(400).json({ 
        success: false, 
        message: 'Matricule agent requis' 
      });
    }
    
    if (!visiteData.date_visite) {
      return res.status(400).json({ 
        success: false, 
        message: 'Date de visite requise' 
      });
    }
    
    if (!visiteData.medecin) {
      return res.status(400).json({ 
        success: false, 
        message: 'Médecin requis' 
      });
    }
    
    visiteData.created_by = req.user.id;
    
    const visite = await Visite.create(visiteData);
    
    await Agent.update(
      { date_derniere_visite: visiteData.date_visite },
      { where: { matricule_agent: visiteData.matricule_agent } }
    );
    
    if (visiteData.id_planning) {
      await Planning.update(
        { 
          visite_effectuee: true,
          statut: 'Effectué'
        },
        { where: { id_planning: visiteData.id_planning } }
      );
    }
    
    console.log('✅ Visite créée avec ID:', visite.matricule_visite);
    
    res.status(201).json({
      success: true,
      message: 'Visite enregistrée avec succès',
      visite
    });
    
  } catch (error) {
    console.error('❌ Erreur création visite:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== MARQUER UNE VISITE COMME EFFECTUÉE ==========
router.patch('/planning/:id/effectuer', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { medecin, observation, resultat } = req.body;
    
    console.log('✅ Marquage visite comme effectuée ID:', id);
    
    const planning = await Planning.findByPk(id);
    if (!planning) {
      return res.status(404).json({ success: false, message: 'Planning non trouvé' });
    }
    
    planning.visite_effectuee = true;
    planning.statut = 'Effectué';
    await planning.save();
    
    const visiteData = {
      matricule_agent: planning.matricule_agent,
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite,
      type_visite: planning.type_visite,
      medecin: medecin || 'Médecin non spécifié',
      observation: observation || '',
      resultat: resultat || 'Apte',
      id_planning: planning.id_planning,
      created_by: req.user.id
    };
    
    const visite = await Visite.create(visiteData);
    
    await Agent.update(
      { date_derniere_visite: planning.date_visite },
      { where: { matricule_agent: planning.matricule_agent } }
    );
    
    console.log('✅ Visite créée dans l\'historique avec ID:', visite.matricule_visite);
    
    res.json({
      success: true,
      message: 'Visite marquée comme effectuée et enregistrée dans l\'historique',
      planning,
      visite
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== ANNULER UNE VISITE ==========
router.patch('/planning/:id/annuler', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { motif } = req.body;
    
    const planning = await Planning.findByPk(id);
    if (!planning) {
      return res.status(404).json({ success: false, message: 'Planning non trouvé' });
    }
    
    planning.statut = 'Annulé';
    planning.motif_annulation = motif || 'Non spécifié';
    await planning.save();
    
    res.json({
      success: true,
      message: 'Visite annulée avec succès',
      planning
    });
    
  } catch (error) {
    console.error('❌ Erreur annulation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== MODIFIER UNE VISITE ==========
router.put('/visites/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    console.log('📝 Modification visite ID:', id, updateData);
    
    const visite = await Visite.findByPk(id);
    
    if (!visite) {
      return res.status(404).json({ 
        success: false, 
        message: 'Visite non trouvée' 
      });
    }
    
    await visite.update(updateData);
    
    console.log('✅ Visite modifiée ID:', id);
    
    res.json({
      success: true,
      message: 'Visite modifiée avec succès',
      visite
    });
    
  } catch (error) {
    console.error('❌ Erreur modification visite:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== SUPPRIMER UNE VISITE ==========
router.delete('/visites/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Suppression visite ID:', id);
    
    const visite = await Visite.findByPk(id);
    
    if (!visite) {
      return res.status(404).json({ 
        success: false, 
        message: 'Visite non trouvée' 
      });
    }
    
    await visite.destroy();
    
    console.log('✅ Visite supprimée ID:', id);
    
    res.json({
      success: true,
      message: 'Visite supprimée avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression visite:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== SUPPRIMER UN PLANNING ==========
router.delete('/planning/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    console.log('🗑️ Suppression planning ID:', id);
    
    const planning = await Planning.findByPk(id);
    
    if (!planning) {
      return res.status(404).json({ 
        success: false, 
        message: 'Planning non trouvé' 
      });
    }
    
    const visitesLiees = await Visite.count({
      where: { id_planning: id }
    });
    
    if (visitesLiees > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Impossible de supprimer ce planning car des visites y sont liées' 
      });
    }
    
    await planning.destroy();
    
    console.log('✅ Planning supprimé ID:', id);
    
    res.json({
      success: true,
      message: 'Planning supprimé avec succès'
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression planning:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;