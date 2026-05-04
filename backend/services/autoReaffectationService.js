// backend/services/autoReaffectationService.js
// Version CORRIGÉE - Vérification que l'agent n'a PAS déjà une visite planifiée

const { Op } = require('sequelize');
const db = require('../models');
const planningService = require('./planningService');

const Planning = db.local.Planning;
const Agent = db.global.Agent;
const Visite = db.local.Visite;

class AutoReaffectationService {
  
  /**
   * Vérifie si un agent a déjà une visite planifiée à une date donnée
   */
  async agentADejaUneVisiteCeJour(matriculeAgent, dateCible, idExclu = null) {
    const whereClause = {
      matricule_agent: matriculeAgent,
      date_visite: dateCible,
      statut: 'Programmé',
      visite_effectuee: false
    };
    if (idExclu) {
      whereClause.id_planning = { [Op.ne]: idExclu };
    }
    const visiteExistante = await Planning.findOne({ where: whereClause });
    return visiteExistante !== null;
  }

  /**
   * Vérifie si un agent respecte la périodicité pour une date donnée
   */
  async verifierPeriodicite(agent, dateCible) {
    if (!agent.date_derniere_visite) {
      return { ok: true, message: "Jamais visité" };
    }
    
    const periodiciteJours = agent.periodicite_jours || (agent.code_affectation === 3 ? 180 : 365);
    const dateDerniere = new Date(agent.date_derniere_visite);
    const dateCibleObj = new Date(dateCible);
    const dateProchainePermise = new Date(dateDerniere);
    dateProchainePermise.setDate(dateDerniere.getDate() + periodiciteJours);
    
    if (dateCibleObj < dateProchainePermise) {
      const joursRestants = Math.ceil((dateProchainePermise - dateCibleObj) / (1000 * 60 * 60 * 24));
      return { 
        ok: false, 
        message: `Périodicité non respectée (prochaine visite possible dans ${joursRestants} jours)`,
        joursRestants
      };
    }
    
    return { ok: true, message: "Périodicité respectée" };
  }

  /**
   * Trouve le meilleur remplaçant pour un créneau libéré
   * Vérifie STRICTEMENT que l'agent n'a PAS déjà de visite ce jour
   */
  async trouverMeilleurRemplacant(dateCible, heureCible, matriculeAgentExclu) {
    console.log(`\n🔍 RECHERCHE DU MEILLEUR REMPLAÇANT`);
    console.log(`   Créneau: ${dateCible} à ${heureCible.substring(0,5)}`);
    console.log(`   Agent exclu: ${matriculeAgentExclu}`);
    
    const dateCibleObj = new Date(dateCible);
    
    // 1. Récupérer TOUS les agents actifs SAUF l'agent indisponible
    const tousAgents = await Agent.findAll({
      where: { 
        statut: 'actif',
        matricule_agent: { [Op.ne]: matriculeAgentExclu }
      },
      raw: true
    });
    
    if (tousAgents.length === 0) {
      console.log(`   ❌ Aucun autre agent actif trouvé`);
      return null;
    }
    
    console.log(`   📊 ${tousAgents.length} agents actifs au total`);
    
    // 2. Récupérer les agents DÉJÀ PROGRAMMÉS ce jour (dans le planning existant)
    const planningsDuJour = await Planning.findAll({
      where: {
        date_visite: dateCible,
        statut: 'Programmé',
        visite_effectuee: false,
        matricule_agent: { [Op.ne]: 0 }  // Exclure les placeholders
      },
      attributes: ['matricule_agent'],
      raw: true
    });
    
    const matriculesDejaProgrammes = new Set(planningsDuJour.map(p => p.matricule_agent));
    console.log(`   📋 ${matriculesDejaProgrammes.size} agents déjà programmés ce jour (à exclure absolument)`);
    
    // 3. Filtrer les agents disponibles = NON PROGRAMMÉS ce jour
    let agentsDisponibles = tousAgents.filter(agent => 
      !matriculesDejaProgrammes.has(agent.matricule_agent)
    );
    
    console.log(`   ✅ ${agentsDisponibles.length} agents disponibles (non programmés ce jour)`);
    
    if (agentsDisponibles.length === 0) {
      console.log(`   ❌ Aucun agent disponible ce jour - tous sont déjà programmés`);
      return null;
    }
    
    // 4. Calculer la priorité pour chaque agent (en vérifiant la périodicité)
    const agentsAvecPriorite = [];
    
    for (const agent of agentsDisponibles) {
      // 🔴 VÉRIFICATION SUPPLÉMENTAIRE : L'agent n'a PAS de visite ce jour
      const aDejaVisite = await this.agentADejaUneVisiteCeJour(agent.matricule_agent, dateCible);
      if (aDejaVisite) {
        console.log(`   ⚠️ ${agent.nom} ${agent.prenom}: a une visite ce jour (exclu)`);
        continue;
      }
      
      // 🔴 VÉRIFICATION DE LA PÉRIODICITÉ
      const periodiciteOk = await this.verifierPeriodicite(agent, dateCible);
      if (!periodiciteOk.ok) {
        console.log(`   ⚠️ ${agent.nom} ${agent.prenom}: ${periodiciteOk.message} (exclu)`);
        continue;
      }
      
      let priorite = 0;
      let raisons = [];
      let periodiciteJours = agent.periodicite_jours || (agent.code_affectation === 3 ? 180 : 365);
      
      // ========== CRITÈRE 1: Jamais visité (PRIORITÉ ABSOLUE) ==========
      if (!agent.date_derniere_visite) {
        priorite += 10000;
        raisons.push('🔴 URGENT: Jamais visité');
        console.log(`   📊 ${agent.nom} ${agent.prenom}: Jamais visité → +10000`);
      }
      // ========== CRITÈRE 2: En retard par rapport à la périodicité ==========
      else if (agent.date_derniere_visite) {
        const dateDerniere = new Date(agent.date_derniere_visite);
        const joursDepuis = Math.floor((dateCibleObj - dateDerniere) / (1000 * 60 * 60 * 24));
        const retard = Math.max(0, joursDepuis - periodiciteJours);
        
        if (retard > 0) {
          const pointsRetard = Math.min(retard * 100, 5000);
          priorite += pointsRetard;
          raisons.push(`⚠️ En retard de ${retard} jours (+${pointsRetard})`);
          console.log(`   📊 ${agent.nom} ${agent.prenom}: Retard ${retard} jours → +${pointsRetard}`);
        }
        
        // ========== CRITÈRE 3: Échéance proche (dans les 30 jours) ==========
        const dateProchainePermise = new Date(dateDerniere);
        dateProchainePermise.setDate(dateDerniere.getDate() + periodiciteJours);
        const joursRestants = Math.max(0, Math.ceil((dateProchainePermise - dateCibleObj) / (1000 * 60 * 60 * 24)));
        
        if (joursRestants <= 30 && joursRestants > 0) {
          const pointsEcheance = (30 - joursRestants) * 10;
          priorite += pointsEcheance;
          raisons.push(`📅 Échéance dans ${joursRestants} jours (+${pointsEcheance})`);
          console.log(`   📊 ${agent.nom} ${agent.prenom}: Échéance ${joursRestants} jours → +${pointsEcheance}`);
        }
      }
      
      // ========== CRITÈRE 4: Chauffeur (périodicité plus courte) ==========
      if (agent.code_affectation === 3) {
        priorite += 500;
        raisons.push('🚌 Chauffeur (périodicité 6 mois) +500');
        console.log(`   📊 ${agent.nom} ${agent.prenom}: Chauffeur → +500`);
      }
      
      // ========== CRITÈRE 5: Date dernière visite la plus ancienne ==========
      if (agent.date_derniere_visite) {
        const dateDerniere = new Date(agent.date_derniere_visite);
        const anciennete = Math.floor((dateCibleObj - dateDerniere) / (1000 * 60 * 60 * 24));
        priorite += Math.min(anciennete, 1000);
        if (anciennete > 0) {
          console.log(`   📊 ${agent.nom} ${agent.prenom}: Dernière visite il y a ${anciennete} jours → +${Math.min(anciennete, 1000)}`);
        }
      }
      
      if (priorite > 0) {
        agentsAvecPriorite.push({
          matricule: agent.matricule_agent,
          nom: agent.nom,
          prenom: agent.prenom,
          code_affectation: agent.code_affectation,
          code_agence: agent.code_agence,
          derniere_visite: agent.date_derniere_visite || 'Jamais',
          periodicite_jours: periodiciteJours,
          periodicite_texte: periodiciteJours === 180 ? '6 mois' : '1 an',
          priorite: priorite,
          raisons: raisons
        });
      }
    }
    
    // 5. Trier par priorité décroissante
    agentsAvecPriorite.sort((a, b) => b.priorite - a.priorite);
    
    if (agentsAvecPriorite.length === 0) {
      console.log(`   ❌ Aucun agent éligible avec priorité > 0`);
      return null;
    }
    
    const meilleurRemplacant = agentsAvecPriorite[0];
    console.log(`\n   🏆 MEILLEUR REMPLAÇANT TROUVÉ:`);
    console.log(`      ${meilleurRemplacant.nom} ${meilleurRemplacant.prenom}`);
    console.log(`      Priorité totale: ${meilleurRemplacant.priorite}`);
    console.log(`      Raisons: ${meilleurRemplacant.raisons.join(', ')}`);
    
    return meilleurRemplacant;
  }
  
  /**
   * Réaffecter un créneau à un nouvel agent
   * Vérifie une dernière fois que l'agent n'a PAS de conflit
   */
  async reaffecterCreneau(ancienPlanning, nouvelAgent, motif, userId) {
    const transaction = await Planning.sequelize.transaction();
    
    try {
      console.log(`\n📋 RÉAFFECTATION DU CRÉNEAU`);
      console.log(`   Date: ${ancienPlanning.date_visite}`);
      console.log(`   Heure: ${ancienPlanning.heure_visite.substring(0,5)}`);
      console.log(`   Nouvel agent: ${nouvelAgent.nom} ${nouvelAgent.prenom} (#${nouvelAgent.matricule})`);
      
      // 🔴 DERNIÈRE VÉRIFICATION : L'agent n'a PAS de visite ce jour
      const aDejaVisite = await this.agentADejaUneVisiteCeJour(
        nouvelAgent.matricule, 
        ancienPlanning.date_visite
      );
      
      if (aDejaVisite) {
        throw new Error(`L'agent ${nouvelAgent.nom} ${nouvelAgent.prenom} a déjà une visite planifiée ce jour !`);
      }
      
      // 🔴 VÉRIFICATION DE LA PÉRIODICITÉ
      const agentComplet = await Agent.findOne({
        where: { matricule_agent: nouvelAgent.matricule },
        raw: true
      });
      
      const periodiciteOk = await this.verifierPeriodicite(agentComplet, ancienPlanning.date_visite);
      if (!periodiciteOk.ok) {
        throw new Error(`Périodicité non respectée pour ${nouvelAgent.nom} ${nouvelAgent.prenom}: ${periodiciteOk.message}`);
      }
      
      // 1. Créer le nouveau planning pour le remplaçant
      const semaine = planningService.getNumeroSemaine(new Date(ancienPlanning.date_visite));
      const annee = new Date(ancienPlanning.date_visite).getFullYear();
      
      const nouveauPlanning = await Planning.create({
        matricule_agent: nouvelAgent.matricule,
        date_visite: ancienPlanning.date_visite,
        heure_visite: ancienPlanning.heure_visite,
        type_visite: ancienPlanning.type_visite,
        statut: 'Programmé',
        priorite: nouvelAgent.priorite,
        semaine: semaine,
        annee: annee,
        created_by: userId,
        convocation_envoyee: false,
        source_planification: 'auto',
        source_originale: 'auto',
        motif_reprogrammation: `Réaffectation automatique - Remplaçant prioritaire`,
        visite_originale_id: ancienPlanning.id_planning
      }, { transaction });
      
      // 2. Traçabilité dans l'historique
      await Visite.create({
        matricule_agent: nouvelAgent.matricule,
        date_visite: ancienPlanning.date_visite,
        heure_visite: ancienPlanning.heure_visite,
        type_visite: ancienPlanning.type_visite,
        id_planning: nouveauPlanning.id_planning,
        type_action: 'REAFFECTEE',
        ancien_statut: null,
        nouveau_statut: 'Programmé',
        motif_action: `Réaffectation automatique suite à indisponibilité`,
        details_action: JSON.stringify({
          agent_original: ancienPlanning.matricule_agent,
          nouvel_agent: nouvelAgent.matricule,
          nouvel_agent_nom: `${nouvelAgent.nom} ${nouvelAgent.prenom}`,
          priorite: nouvelAgent.priorite,
          raisons: nouvelAgent.raisons,
          date_reaffectation: new Date().toISOString(),
          motif_indisponibilite: ancienPlanning.motif_reprogrammation
        }),
        source: 'PLANNING',
        source_originale: 'auto',
        created_by: userId
      }, { transaction });
      
      await transaction.commit();
      
      console.log(`   ✅ Créneau réaffecté avec succès à ${nouvelAgent.nom} ${nouvelAgent.prenom}`);
      
      return {
        success: true,
        nouveau_planning: nouveauPlanning,
        nouvel_agent: nouvelAgent
      };
      
    } catch (error) {
      await transaction.rollback();
      console.error(`   ❌ Erreur réaffectation: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Créer un placeholder "vide" pour un créneau libéré
   */
  async creerCreneauLibre(planningOriginal, userId) {
    try {
      const semaine = planningService.getNumeroSemaine(new Date(planningOriginal.date_visite));
      const annee = new Date(planningOriginal.date_visite).getFullYear();
      
      const planningLibre = await Planning.create({
        matricule_agent: 0,  // 0 signifie "créneau libre"
        date_visite: planningOriginal.date_visite,
        heure_visite: planningOriginal.heure_visite,
        type_visite: planningOriginal.type_visite,
        statut: 'Programmé',
        priorite: 0,
        semaine: semaine,
        annee: annee,
        created_by: userId,
        convocation_envoyee: false,
        source_planification: 'system',
        source_originale: 'system',
        motif_reprogrammation: `Créneau libéré suite à indisponibilité - En attente d'affectation manuelle`,
        visite_originale_id: planningOriginal.id_planning
      });
      
      console.log(`   ✅ Créneau marqué comme "libre" pour affectation manuelle`);
      
      return planningLibre;
    } catch (error) {
      console.error(`   ❌ Erreur création créneau libre: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new AutoReaffectationService();