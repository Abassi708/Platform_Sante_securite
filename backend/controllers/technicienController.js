// backend/controllers/technicienController.js
const { Agent, Agence, Affectation, Visite, Planning } = require('../models');
const { Op } = require('sequelize');

// ========== TA1 : CONSULTATION DES AGENTS ==========
exports.getAgents = async (req, res) => {
  try {
    console.log('📋 Récupération des agents...');
    console.log('Utilisateur:', req.user);
    
    const { 
      page = 1, 
      limit = 20, 
      search, 
      statut,
      code_agence,
      code_affectation,
      en_inaptitude 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Construction des filtres
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { nom: { [Op.like]: `%${search}%` } },
        { prenom: { [Op.like]: `%${search}%` } },
        { matricule_agent: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (statut) where.statut = statut;
    if (code_agence) where.code_agence = parseInt(code_agence);
    if (code_affectation) where.code_affectation = parseInt(code_affectation);
    
    // Filtre inaptitude
    if (en_inaptitude === 'true') {
      where.date_fin_inaptitude = { [Op.gte]: new Date() };
    } else if (en_inaptitude === 'false') {
      where[Op.or] = [
        { date_fin_inaptitude: null },
        { date_fin_inaptitude: { [Op.lt]: new Date() } }
      ];
    }
    
    console.log('Filtres:', where);
    
    const { count, rows: agents } = await Agent.findAndCountAll({
  where,
  limit: parseInt(limit),
  offset: parseInt(offset),
  order: [['nom', 'ASC'], ['prenom', 'ASC']],
  raw: true
});
    
    console.log(`✅ ${agents.length} agents trouvés sur ${count} total`);
    
    // Récupérer les agences séparément
    const agencesCodes = [...new Set(agents.map(a => a.code_agence).filter(c => c))];
    const affectationsCodes = [...new Set(agents.map(a => a.code_affectation).filter(c => c))];
    
    const [agences, affectations] = await Promise.all([
      agencesCodes.length > 0 ? Agence.findAll({ where: { code_agence: { [Op.in]: agencesCodes } }, raw: true }) : [],
      affectationsCodes.length > 0 ? Affectation.findAll({ where: { code_affectation: { [Op.in]: affectationsCodes } }, raw: true }) : []
    ]);
    
    const agencesMap = new Map();
    agences.forEach(agence => {
      agencesMap.set(agence.code_agence, agence);
    });
    
    const affectationsMap = new Map();
    affectations.forEach(affectation => {
      affectationsMap.set(affectation.code_affectation, affectation);
    });
    
    // Calcul des informations supplémentaires pour chaque agent
    const agentsWithDetails = agents.map(agent => {
      const estChauffeur = agent.code_affectation === 3;
      const periodiciteJours = estChauffeur ? 180 : 365;
      
      // Vérifier si l'agent est en inaptitude
      let estEnInaptitude = false;
      let joursRestants = 0;
      if (agent.date_fin_inaptitude) {
        const today = new Date();
        const finDate = new Date(agent.date_fin_inaptitude);
        if (finDate > today) {
          estEnInaptitude = true;
          const diffTime = finDate - today;
          joursRestants = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }
      
      return {
        ...agent,
        agentAgence: agencesMap.get(agent.code_agence) || null,
        agentAffectation: affectationsMap.get(agent.code_affectation) || null,
        estChauffeur,
        estEnInaptitude,
        joursRestantsInaptitude: joursRestants,
        periodiciteTexte: periodiciteJours === 180 ? '6 mois' : '1 an',
        age: agent.date_naissance ? Math.floor((new Date() - new Date(agent.date_naissance)) / (365.25 * 24 * 60 * 60 * 1000)) : null
      };
    });
    
    res.json({
      success: true,
      data: {
        agents: agentsWithDetails,
        pagination: {
          total: count,
          page: parseInt(page),
          pages: Math.ceil(count / limit),
          limit: parseInt(limit)
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur getAgents:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des agents', 
      error: error.message 
    });
  }
};

// ========== DÉTAILS D'UN AGENT ==========
exports.getAgentDetails = async (req, res) => {
  try {
    const { matricule } = req.params;
    
    const agent = await Agent.findOne({
      where: { matricule_agent: matricule },
      raw: true
    });
    
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent non trouvé' });
    }
    
    // Récupérer l'agence et l'affectation
    const [agence, affectation] = await Promise.all([
      agent.code_agence ? Agence.findByPk(agent.code_agence, { raw: true }) : null,
      agent.code_affectation ? Affectation.findByPk(agent.code_affectation, { raw: true }) : null
    ]);
    
    // Récupérer les visites récentes
    const visitesRecentes = await Visite.findAll({
      where: { matricule_agent: matricule },
      limit: 5,
      order: [['date_visite', 'DESC']],
      raw: true
    });
    
    // Récupérer les plannings à venir
    const planningsAVenir = await Planning.findAll({
      where: {
        matricule_agent: matricule,
        date_visite: { [Op.gte]: new Date().toISOString().split('T')[0] }
      },
      limit: 3,
      order: [['date_visite', 'ASC']],
      raw: true
    });
    
    // Statistiques des visites
    const totalVisites = await Visite.count({ where: { matricule_agent: matricule } });
    
    res.json({
      success: true,
      data: {
        agent: {
          ...agent,
          agentAgence: agence,
          agentAffectation: affectation,
          estChauffeur: agent.code_affectation === 3,
          periodiciteTexte: agent.code_affectation === 3 ? '6 mois' : '1 an'
        },
        statistiques: {
          totalVisites
        },
        visitesRecentes,
        planningsAVenir
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur getAgentDetails:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des détails', error: error.message });
  }
};

// ========== TA3 : CONSULTATION DES AFFECTATIONS ==========
exports.getAffectations = async (req, res) => {
  try {
    console.log('📋 Récupération des affectations...');
    
    const affectations = await Affectation.findAll({
      order: [['libelle_affectation', 'ASC']],
      raw: true
    });
    
    console.log(`✅ ${affectations.length} affectations trouvées`);
    
    // Récupérer les agents par affectation
    const affectationCodes = affectations.map(a => a.code_affectation);
    const agents = await Agent.findAll({
      where: { code_affectation: { [Op.in]: affectationCodes } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'statut', 'code_agence', 'code_affectation'],
      raw: true
    });
    
    // Grouper les agents par affectation
    const agentsParAffectation = new Map();
    agents.forEach(agent => {
      if (!agentsParAffectation.has(agent.code_affectation)) {
        agentsParAffectation.set(agent.code_affectation, []);
      }
      agentsParAffectation.get(agent.code_affectation).push(agent);
    });
    
    // Calcul des statistiques par affectation
    const affectationsWithStats = affectations.map(affectation => {
      const agentsAffectation = agentsParAffectation.get(affectation.code_affectation) || [];
      const periodicite = affectation.code_affectation === 3 ? 180 : 365;
      
      return {
        code_affectation: affectation.code_affectation,
        libelle_affectation: affectation.libelle_affectation,
        description: affectation.description,
        periodicite: periodicite,
        periodiciteTexte: periodicite === 180 ? '6 mois' : '1 an',
        stats: {
          total: agentsAffectation.length,
          actifs: agentsAffectation.filter(a => a.statut === 'actif').length,
          inactifs: agentsAffectation.filter(a => a.statut === 'inactif').length,
          conges: agentsAffectation.filter(a => a.statut === 'conge').length,
          maladies: agentsAffectation.filter(a => a.statut === 'maladie').length
        },
        agents: agentsAffectation.map(agent => ({
          matricule: agent.matricule_agent,
          nom: agent.nom,
          prenom: agent.prenom,
          statut: agent.statut,
          code_agence: agent.code_agence
        }))
      };
    });
    
    res.json({
      success: true,
      data: affectationsWithStats
    });
    
  } catch (error) {
    console.error('❌ Erreur getAffectations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des affectations', 
      error: error.message 
    });
  }
};

// ========== CONSULTATION DES AGENCES ==========
exports.getAgences = async (req, res) => {
  try {
    console.log('📋 Récupération des agences...');
    
    const agences = await Agence.findAll({
      order: [['nom_agence', 'ASC']],
      raw: true
    });
    
    console.log(`✅ ${agences.length} agences trouvées`);
    
    // Récupérer les agents par agence
    const agenceCodes = agences.map(a => a.code_agence);
    const agents = await Agent.findAll({
      where: { code_agence: { [Op.in]: agenceCodes } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'statut', 'code_agence', 'code_affectation'],
      raw: true
    });
    
    // Récupérer les affectations
    const affectationCodes = [...new Set(agents.map(a => a.code_affectation).filter(c => c))];
    const affectations = affectationCodes.length > 0 ? await Affectation.findAll({
      where: { code_affectation: { [Op.in]: affectationCodes } },
      attributes: ['code_affectation', 'libelle_affectation'],
      raw: true
    }) : [];
    
    const affectationsMap = new Map();
    affectations.forEach(aff => {
      affectationsMap.set(aff.code_affectation, aff);
    });
    
    // Grouper les agents par agence
    const agentsParAgence = new Map();
    agents.forEach(agent => {
      if (!agentsParAgence.has(agent.code_agence)) {
        agentsParAgence.set(agent.code_agence, []);
      }
      agentsParAgence.get(agent.code_agence).push(agent);
    });
    
    // Calcul des statistiques par agence
    const agencesWithStats = agences.map(agence => {
      const agentsAgence = agentsParAgence.get(agence.code_agence) || [];
      
      // Compter par affectation
      const affectationCount = {};
      agentsAgence.forEach(agent => {
        const libelle = affectationsMap.get(agent.code_affectation)?.libelle_affectation || 'Non défini';
        affectationCount[libelle] = (affectationCount[libelle] || 0) + 1;
      });
      
      return {
        code_agence: agence.code_agence,
        nom_agence: agence.nom_agence,
        ville: agence.ville,
        adresse: agence.adresse,
        telephone: agence.telephone,
        stats: {
          total: agentsAgence.length,
          actifs: agentsAgence.filter(a => a.statut === 'actif').length,
          inactifs: agentsAgence.filter(a => a.statut === 'inactif').length,
          conges: agentsAgence.filter(a => a.statut === 'conge').length,
          maladies: agentsAgence.filter(a => a.statut === 'maladie').length,
          parAffectation: affectationCount
        },
        agents: agentsAgence.map(agent => ({
          matricule: agent.matricule_agent,
          nom: agent.nom,
          prenom: agent.prenom,
          statut: agent.statut,
          affectation: affectationsMap.get(agent.code_affectation)?.libelle_affectation || 'Non défini'
        }))
      };
    });
    
    res.json({
      success: true,
      data: agencesWithStats
    });
    
  } catch (error) {
    console.error('❌ Erreur getAgences:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des agences', 
      error: error.message 
    });
  }
};

// ========== STATISTIQUES DASHBOARD ==========
exports.getDashboardStats = async (req, res) => {
  try {
    console.log('📋 Récupération des statistiques...');
    
    const totalAgents = await Agent.count();
    const agentsActifs = await Agent.count({ where: { statut: 'actif' } });
    
    const agentsEnInaptitude = await Agent.count({
      where: {
        date_fin_inaptitude: { [Op.gte]: new Date() }
      }
    });
    
    const chauffeurs = await Agent.count({ where: { code_affectation: 3 } });
    const controleurs = await Agent.count({ where: { code_affectation: 5 } });
    
    const visitesMois = await Visite.count({
      where: {
        date_visite: {
          [Op.gte]: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          [Op.lte]: new Date()
        }
      }
    });
    
    const prochainesVisites = await Planning.count({
      where: {
        date_visite: { [Op.gte]: new Date() },
        statut: 'Programmé'
      }
    });
    
    res.json({
      success: true,
      data: {
        agents: {
          total: totalAgents,
          actifs: agentsActifs,
          enInaptitude: agentsEnInaptitude,
          tauxActivite: totalAgents > 0 ? Math.round((agentsActifs / totalAgents) * 100) : 0
        },
        affectations: {
          chauffeurs,
          controleurs,
          autres: totalAgents - chauffeurs - controleurs
        },
        visites: {
          ceMois: visitesMois,
          aVenir: prochainesVisites
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur getDashboardStats:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la récupération des statistiques', 
      error: error.message 
    });
  }
};

// ========== EXPORT AGENTS ==========
exports.exportAgents = async (req, res) => {
  try {
    const { code_agence, code_affectation } = req.query;
    
    const where = {};
    if (code_agence) where.code_agence = parseInt(code_agence);
    if (code_affectation) where.code_affectation = parseInt(code_affectation);
    
    const agents = await Agent.findAll({
      where,
      order: [['nom', 'ASC']],
      raw: true
    });
    
    // Récupérer les agences et affectations
    const agencesCodes = [...new Set(agents.map(a => a.code_agence).filter(c => c))];
    const affectationsCodes = [...new Set(agents.map(a => a.code_affectation).filter(c => c))];
    
    const [agences, affectations] = await Promise.all([
      agencesCodes.length > 0 ? Agence.findAll({ where: { code_agence: { [Op.in]: agencesCodes } }, raw: true }) : [],
      affectationsCodes.length > 0 ? Affectation.findAll({ where: { code_affectation: { [Op.in]: affectationsCodes } }, raw: true }) : []
    ]);
    
    const agencesMap = new Map();
    agences.forEach(agence => {
      agencesMap.set(agence.code_agence, agence);
    });
    
    const affectationsMap = new Map();
    affectations.forEach(affectation => {
      affectationsMap.set(affectation.code_affectation, affectation);
    });
    
    const exportData = agents.map(agent => ({
      Matricule: agent.matricule_agent,
      Nom: agent.nom,
      Prénom: agent.prenom,
      'Date naissance': agent.date_naissance,
      Agence: agencesMap.get(agent.code_agence)?.nom_agence || 'Non défini',
      Ville: agencesMap.get(agent.code_agence)?.ville || 'Non défini',
      Affectation: affectationsMap.get(agent.code_affectation)?.libelle_affectation || 'Non défini',
      Statut: agent.statut,
      'En inaptitude': agent.date_fin_inaptitude && new Date(agent.date_fin_inaptitude) > new Date() ? 'Oui' : 'Non',
      'Fin inaptitude': agent.date_fin_inaptitude || '',
      'Dernière visite': agent.date_derniere_visite || '',
      'Prochaine visite': agent.date_prochaine_visite || ''
    }));
    
    res.json({
      success: true,
      data: exportData
    });
    
  } catch (error) {
    console.error('❌ Erreur exportAgents:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'export', 
      error: error.message 
    });
  }
};