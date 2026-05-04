// backend/services/tracabiliteVisiteService.js
const { Op } = require('sequelize');
const db = require('../models');  // ← IMPORTANT: utiliser db au lieu de require direct

class TracabiliteVisiteService {
  
  // ========== ENREGISTRER UNE ACTION DU PLANNING ==========
  async enregistrerActionPlanning(data) {
    try {
      // ✅ Utiliser db.local.Visite
      const visite = await db.local.Visite.create({
        matricule_agent: data.matricule_agent,
        date_visite: data.date_visite || new Date().toISOString().split('T')[0],
        heure_visite: data.heure_visite || new Date().toTimeString().split(' ')[0].substring(0,5),
        type_visite: data.type_visite || 'Périodique',
        medecin: data.medecin || 'Système',
        observation: data.observation || `${data.type_action} - ${data.motif || ''}`,
        resultat: data.resultat || null,
        id_planning: data.id_planning,
        source: data.source || 'PLANNING',
        type_action: data.type_action,
        ancien_statut: data.ancien_statut,
        nouveau_statut: data.nouveau_statut,
        motif_action: data.motif,
        details_action: data.details ? JSON.stringify(data.details) : {},
        created_by: userId,
        source_originale: data.source_originale || null
      });
      
      console.log(`✅ [TRACABILITE] ${data.type_action} - Agent: ${data.matricule_agent}`);
      return visite;
      
    } catch (error) {
      console.error('❌ Erreur traçabilité:', error.message);
      return null;
    }
  }

  // ========== ENREGISTRER UNE VISITE MANUELLE ==========
  async enregistrerVisiteManuelle(data, utilisateur) {
    try {
      const visite = await db.local.Visite.create({
        matricule_agent: data.matricule_agent,
        date_visite: data.date_visite,
        heure_visite: data.heure_visite,
        type_visite: data.type_visite,
        medecin: data.medecin,
        observation: data.observation,
        resultat: data.resultat,
        id_planning: data.id_planning || null,
        source: 'FORMULAIRE',
        type_action: 'SAISIE_MANUELLE',
        nouveau_statut: 'Programmé',
        motif_action: data.motif || 'Saisie manuelle',
        created_by: utilisateur.id,
        source_originale: 'manuel'
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
        priorite: planning.priorite,
        source: planning.source_planification
      },
      source: 'PLANNING',
      source_originale: planning.source_planification,
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
      source: planning.source_planification === 'manuel' ? 'FORMULAIRE' : 'PLANNING',
      source_originale: planning.source_originale || planning.source_planification,
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
        ancienne_date: ancienPlanning.date_visite,
        ancienne_heure: ancienPlanning.heure_visite,
        nouvelle_date: nouveauPlanning?.date_visite,
        nouvelle_heure: nouveauPlanning?.heure_visite,
        nouveau_planning_id: nouveauPlanning?.id_planning
      },
      source: ancienPlanning.source_planification === 'manuel' ? 'FORMULAIRE' : 'PLANNING',
      source_originale: ancienPlanning.source_originale || ancienPlanning.source_planification,
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
        motif: motif,
        date_annulation: new Date().toISOString()
      },
      source: planning.source_planification === 'manuel' ? 'FORMULAIRE' : 'PLANNING',
      source_originale: planning.source_originale || planning.source_planification,
      utilisateur
    });
  }

  // ========== RÉAFFECTATION ==========
  async enregistrerReaffectation(ancienPlanning, nouvelAgent, motif, utilisateur) {
    return this.enregistrerActionPlanning({
      id_planning: ancienPlanning.id_planning,
      matricule_agent: nouvelAgent.matricule,
      date_visite: ancienPlanning.date_visite,
      heure_visite: ancienPlanning.heure_visite,
      type_visite: ancienPlanning.type_visite,
      type_action: 'REAFFECTEE',
      ancien_statut: ancienPlanning.statut,
      nouveau_statut: 'Programmé',
      motif: `Réaffectation - ${nouvelAgent.nom} ${nouvelAgent.prenom}`,
      details: {
        ancien_agent: ancienPlanning.matricule_agent,
        nouvel_agent: nouvelAgent.matricule,
        date_creneau: ancienPlanning.date_visite,
        heure_creneau: ancienPlanning.heure_visite
      },
      source: 'PLANNING',
      source_originale: 'auto',
      utilisateur
    });
  }

  // ========== LIBÉRATION DE CRÉNEAU ==========
  async enregistrerLiberationCreneau(planning, agent, motif, utilisateur) {
    return this.enregistrerActionPlanning({
      id_planning: null,
      matricule_agent: planning.matricule_agent,
      date_visite: planning.date_visite,
      heure_visite: planning.heure_visite,
      type_visite: planning.type_visite,
      type_action: 'ANNULEE',
      ancien_statut: planning.statut,
      nouveau_statut: 'Libéré',
      motif: `Créneau libéré - ${agent.nom} ${agent.prenom} indisponible: ${motif}`,
      details: {
        type: 'liberation_creneau',
        agent_original: `${agent.nom} ${agent.prenom}`,
        motif: motif
      },
      source: 'PLANNING',
      source_originale: planning.source_originale || planning.source_planification,
      utilisateur
    });
  }
}

module.exports = new TracabiliteVisiteService();