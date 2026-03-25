// backend/services/tracabiliteVisiteService.js
const { Op } = require('sequelize');
const Visite = require('../models/Visite');
const Planning = require('../models/Planning');
const Agent = require('../models/Agent');

class TracabiliteVisiteService {
  
  // ========== ENREGISTRER UNE ACTION DU PLANNING ==========
  async enregistrerActionPlanning(data) {
    try {
      const visite = await Visite.create({
        matricule_agent: data.matricule_agent,
        date_visite: data.date_visite || new Date().toISOString().split('T')[0],
        heure_visite: data.heure_visite || new Date().toTimeString().split(' ')[0].substring(0,5),
        type_visite: data.type_visite || 'Périodique',
        medecin: data.medecin || 'Système',
        observation: data.observation || `${data.type_action} - ${data.motif || ''}`,
        resultat: data.resultat || null,
        id_planning: data.id_planning,
        source: 'PLANNING',
        type_action: data.type_action,
        ancien_statut: data.ancien_statut,
        nouveau_statut: data.nouveau_statut,
        motif_action: data.motif,
        details_action: data.details || {},
        created_by: data.utilisateur?.id || null
      });
      
      console.log(`✅ [PLANNING] Action ${data.type_action} pour agent ${data.matricule_agent}`);
      return visite;
      
    } catch (error) {
      console.error('❌ Erreur traçabilité planning:', error);
      return null;
    }
  }

  // ========== ENREGISTRER UNE VISITE MANUELLE ==========
  async enregistrerVisiteManuelle(data, utilisateur) {
    try {
      const visite = await Visite.create({
        matricule_agent: data.matricule_agent,
        date_visite: data.date_visite,
        heure_visite: data.heure_visite,
        type_visite: data.type_visite,
        medecin: data.medecin,
        observation: data.observation,
        resultat: data.resultat,
        id_planning: data.id_planning || null,
        source: 'FORMULAIRE',
        created_by: utilisateur.id
      });
      
      console.log(`✅ [FORMULAIRE] Visite manuelle pour agent ${data.matricule_agent}`);
      return visite;
      
    } catch (error) {
      console.error('❌ Erreur visite manuelle:', error);
      return null;
    }
  }

  // ========== PROGRAMMATION ==========
  async enregistrerProgrammation(planning, utilisateur) {
    return this.enregistrerActionPlanning({
      id_planning: planning.id_planning,
      matricule_agent: planning.matricule_agent,
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite,
      type_visite: planning.type_visite,
      type_action: 'PROGRAMMATION',
      ancien_statut: null,
      nouveau_statut: 'Programmé',
      motif: 'Programmation automatique',
      details: {
        semaine: planning.semaine,
        annee: planning.annee,
        priorite: planning.priorite
      },
      utilisateur
    });
  }

  // ========== VISITE EFFECTUÉE ==========
  async enregistrerVisiteEffectuee(planning, visiteData, utilisateur) {
    return this.enregistrerActionPlanning({
      id_planning: planning.id_planning,
      matricule_agent: planning.matricule_agent,
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite,
      type_visite: planning.type_visite,
      medecin: visiteData.medecin,
      observation: visiteData.observation,
      resultat: visiteData.resultat,
      type_action: 'EFFECTUEE',
      ancien_statut: planning.statut,
      nouveau_statut: 'Effectué',
      motif: 'Visite réalisée',
      details: {
        medecin: visiteData.medecin,
        resultat: visiteData.resultat,
        observation: visiteData.observation
      },
      utilisateur
    });
  }

  // ========== REPROGRAMMATION ==========
  async enregistrerReprogrammation(ancienPlanning, nouveauPlanning, motif, utilisateur) {
    return this.enregistrerActionPlanning({
      id_planning: ancienPlanning.id_planning,
      matricule_agent: ancienPlanning.matricule_agent,
      date_visite: ancienPlanning.date_visite,
      heure_visite: ancienPlanning.heure_visite,
      type_visite: ancienPlanning.type_visite,
      type_action: 'REPROGRAMMEE',
      ancien_statut: ancienPlanning.statut,
      nouveau_statut: 'Reporté',
      motif: motif,
      details: {
        date_originale: ancienPlanning.date_visite,
        heure_originale: ancienPlanning.heure_visite,
        nouvelle_date: nouveauPlanning?.date_visite,
        nouvelle_heure: nouveauPlanning?.heure_visite,
        nouvel_agent: nouveauPlanning?.matricule_agent,
        id_nouveau_planning: nouveauPlanning?.id_planning
      },
      utilisateur
    });
  }

  // ========== ANNULATION ==========
  async enregistrerAnnulation(planning, motif, utilisateur) {
    return this.enregistrerActionPlanning({
      id_planning: planning.id_planning,
      matricule_agent: planning.matricule_agent,
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite,
      type_visite: planning.type_visite,
      type_action: 'ANNULEE',
      ancien_statut: planning.statut,
      nouveau_statut: 'Annulé',
      motif: motif,
      details: {
        date_annulation: new Date().toISOString().split('T')[0],
        heure_annulation: new Date().toTimeString().split(' ')[0].substring(0,5)
      },
      utilisateur
    });
  }

  // ========== RÉAFFECTATION ==========
  async enregistrerReaffectation(ancienPlanning, nouvelAgent, nouveauPlanning, motif, utilisateur) {
    return this.enregistrerActionPlanning({
      id_planning: ancienPlanning.id_planning,
      matricule_agent: ancienPlanning.matricule_agent,
      date_visite: ancienPlanning.date_visite,
      heure_visite: ancienPlanning.heure_visite,
      type_visite: ancienPlanning.type_visite,
      type_action: 'REAFFECTEE',
      ancien_statut: ancienPlanning.statut,
      nouveau_statut: 'Reporté',
      motif: motif,
      details: {
        ancien_agent: ancienPlanning.matricule_agent,
        nouvel_agent: nouvelAgent.matricule_agent,
        nouvelle_affectation_id: nouveauPlanning?.id_planning,
        date_originale: ancienPlanning.date_visite,
        heure_originale: ancienPlanning.heure_visite
      },
      utilisateur
    });
  }

  // ========== CONSULTER HISTORIQUE PLANNING ==========
  async getHistoriquePlanning(matricule_agent = null) {
  const where = { source: 'PLANNING' };
  if (matricule_agent) where.matricule_agent = matricule_agent;
  
  const historique = await Visite.findAll({
    where,
    order: [['created_at', 'DESC']],
    include: [{
      model: Agent,
      as: 'visiteAgent',
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence']
    }]
  });
  
  // Transformer les données pour le frontend
  return historique.map(item => ({
    id: item.matricule_visite,
    type_action: item.type_action,
    date_visite: item.date_visite,
    heure_visite: item.heure_visite,
    created_at: item.created_at,
    matricule_agent: item.matricule_agent,
    ancien_statut: item.ancien_statut,
    nouveau_statut: item.nouveau_statut,
    motif_action: item.motif_action,
    resultat: item.resultat,
    medecin: item.medecin,
    visiteAgent: item.visiteAgent
  }));
}

async getHistoriqueFormulaire(matricule_agent = null) {
  const where = { source: 'FORMULAIRE' };
  if (matricule_agent) where.matricule_agent = matricule_agent;
  
  const historique = await Visite.findAll({
    where,
    order: [['date_visite', 'DESC']],
    include: [{
      model: Agent,
      as: 'visiteAgent',
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence']
    }]
  });
  
  return historique.map(item => ({
    matricule_visite: item.matricule_visite,
    date_visite: item.date_visite,
    heure_visite: item.heure_visite,
    type_visite: item.type_visite,
    medecin: item.medecin,
    observation: item.observation,
    resultat: item.resultat,
    created_at: item.created_at,
    matricule_agent: item.matricule_agent,
    visiteAgent: item.visiteAgent
  }));
}
  // ========== STATISTIQUES DES SOURCES ==========
  async getStatsSources() {
  const stats = await Visite.findAll({
    attributes: [
      'source',
      [Visite.sequelize.fn('COUNT', '*'), 'nombre']
    ],
    group: ['source']
  });
  
  // Retourner un format compatible avec le frontend
  return stats.map(s => ({
    source: s.source,
    nombre: parseInt(s.dataValues.nombre)
  }));
}

  // ========== STATISTIQUES DES ACTIONS PLANNING ==========
  async getStatsActionsPlanning() {
    const stats = await Visite.findAll({
      where: { source: 'PLANNING' },
      attributes: [
        'type_action',
        [Visite.sequelize.fn('COUNT', '*'), 'nombre']
      ],
      group: ['type_action']
    });
    
    return stats;
  }
}

module.exports = new TracabiliteVisiteService();