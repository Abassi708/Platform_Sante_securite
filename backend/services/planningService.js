// backend/services/planningService.js
const { Op } = require('sequelize');
const Agent = require('../models/Agent');
const Planning = require('../models/Planning');
const Visite = require('../models/Visite');
const User = require('../models/User');

class PlanningService {
  constructor() {
    // Jours fériés tunisiens 2026
    this.joursFeries = [
      '2026-01-01', // Jour de l'an
      '2026-01-14', // Fête de la Révolution
      '2026-03-20', // Fête de l'Indépendance
      '2026-04-09', // Fête des Martyrs
      '2026-05-01', // Fête du Travail
      '2026-07-25', // Fête de la République
      '2026-08-13', // Fête de la Femme
      '2026-10-15', // Fête de l'Évacuation
      '2026-03-31', // Aïd el-Fitr (variable)
      '2026-04-01', // Aïd el-Fitr
      '2026-06-07', // Aïd el-Adha
      '2026-06-08', // Aïd el-Adha
      '2026-06-28', // Ras el-Am el-Hijri
      '2026-09-05', // Mouled
    ];
    
    // Créneaux horaires (4 par jour)
    this.creneaux = [
      '08:00:00',
      '08:30:00',
      '09:00:00',
      '09:30:00'
    ];
  }

  // ========== VÉRIFIER SI UN JOUR EST OUVERT ==========
  estJourOuvre(date) {
    const jour = date.getDay(); // 0 = Dimanche, 1 = Lundi, ... 6 = Samedi
    const dateStr = date.toISOString().split('T')[0];
    
    // Pas de visites le dimanche, samedi et jours fériés
    if (jour === 0 || jour === 6) return false;
    if (this.joursFeries.includes(dateStr)) return false;
    
    return true;
  }

  // ========== CALCULER LA PRIORITÉ D'UN AGENT ==========
  calculerPriorite(agent) {
    let priorite = 0;
    
    // Priorité basée sur la date de dernière visite
    if (!agent.date_derniere_visite) {
      priorite += 100; // Jamais visité = priorité max
    } else {
      const joursDepuisVisite = Math.floor(
        (new Date() - new Date(agent.date_derniere_visite)) / (1000 * 60 * 60 * 24)
      );
      
      // Plus la dernière visite est ancienne, plus la priorité est élevée
      priorite += Math.min(joursDepuisVisite, 365); // Max 365 jours
    }
    
    // Priorité basée sur le type d'affectation
    if (agent.code_affectation === 3) priorite += 30; // Terrain = priorité
    if (agent.code_affectation === 5) priorite += 20; // Chauffeur
    
    // Priorité basée sur l'inaptitude
    if (agent.date_fin_inaptitude && new Date(agent.date_fin_inaptitude) > new Date()) {
      priorite += 50; // Agent en inaptitude temporaire
    }
    
    return priorite;
  }

  // ========== DISTRIBUER LES AGENTS PAR AGENCE ==========
  distribuerParAgence(agents) {
    const agences = {};
    
    agents.forEach(agent => {
      if (!agences[agent.code_agence]) {
        agences[agent.code_agence] = [];
      }
      agences[agent.code_agence].push(agent);
    });
    
    return agences;
  }

  // ========== GÉNÉRER LE PLANNING POUR UNE SEMAINE ==========
  async genererPlanningSemaine(dateDebut, userId) {
    try {
      console.log(`📅 Génération planning pour semaine du ${dateDebut.toISOString().split('T')[0]}`);
      
      const planning = [];
      const annee = dateDebut.getFullYear();
      const semaine = this.getNumeroSemaine(dateDebut);
      
      // Récupérer tous les agents actifs
      const agents = await Agent.findAll({
        where: { statut: 'actif' },
        order: [['matricule_agent', 'ASC']]
      });
      
      console.log(`👥 ${agents.length} agents actifs trouvés`);
      
      // Calculer la priorité pour chaque agent
      const agentsAvecPriorite = agents.map(agent => ({
        ...agent.toJSON(),
        priorite: this.calculerPriorite(agent)
      }));
      
      // Trier par priorité (décroissante)
      agentsAvecPriorite.sort((a, b) => b.priorite - a.priorite);
      
      // Distribuer par agence
      const parAgence = this.distribuerParAgence(agentsAvecPriorite);
      console.log('📊 Répartition par agence:', Object.keys(parAgence).map(k => 
        `Agence ${k}: ${parAgence[k].length} agents`
      ));
      
      // Générer les jours de la semaine (mardi à vendredi)
      for (let i = 0; i < 7; i++) {
        const jour = new Date(dateDebut);
        jour.setDate(dateDebut.getDate() + i);
        
        if (this.estJourOuvre(jour)) {
          const jourStr = jour.toISOString().split('T')[0];
          console.log(`📆 Jour ouvré: ${jourStr}`);
          
          // Pour chaque créneau (4 par jour)
          for (const creneau of this.creneaux) {
            // Choisir un agent en respectant l'équilibre des agences
            const agentChoisi = this.choisirAgent(agentsAvecPriorite, planning, jourStr);
            
            if (agentChoisi) {
              planning.push({
                matricule_agent: agentChoisi.matricule_agent,
                date_visite: jourStr,
                heure_visite: creneau,
                type_visite: 'Périodique',
                statut: 'Programmé',
                priorite: agentChoisi.priorite,
                semaine,
                annee,
                created_by: userId
              });
              
              console.log(`   ✅ ${creneau} - Agent ${agentChoisi.matricule_agent} (Agence ${agentChoisi.code_agence}, priorité ${agentChoisi.priorite})`);
            } else {
              console.log(`   ⚠️ Aucun agent disponible pour ${creneau}`);
            }
          }
        }
      }
      
      console.log(`✅ Planning généré: ${planning.length} visites programmées`);
      
      // Sauvegarder le planning en base
      if (planning.length > 0) {
        await Planning.bulkCreate(planning);
        console.log('💾 Planning sauvegardé en base');
      }
      
      return planning;
      
    } catch (error) {
      console.error('❌ Erreur génération planning:', error);
      throw error;
    }
  }

  // ========== CHOISIR UN AGENT POUR UN CRÉNEAU ==========
  choisirAgent(agents, planningExistant, dateVisite) {
    // Exclure les agents déjà programmés ce jour-là
    const agentsProgrammesJour = planningExistant
      .filter(p => p.date_visite === dateVisite)
      .map(p => p.matricule_agent);
    
    const agentsDisponibles = agents.filter(a => 
      !agentsProgrammesJour.includes(a.matricule_agent)
    );
    
    if (agentsDisponibles.length === 0) return null;
    
    // Distribuer par agence pour assurer l'équilibre
    const parAgence = {};
    agentsDisponibles.forEach(a => {
      if (!parAgence[a.code_agence]) parAgence[a.code_agence] = [];
      parAgence[a.code_agence].push(a);
    });
    
    // Choisir l'agence avec le moins d'agents programmés cette semaine
    const comptageAgence = {};
    planningExistant.forEach(p => {
      const agent = agents.find(a => a.matricule_agent === p.matricule_agent);
      if (agent) {
        comptageAgence[agent.code_agence] = (comptageAgence[agent.code_agence] || 0) + 1;
      }
    });
    
    // Trouver l'agence avec le moins de représentants
    let agenceChoisie = null;
    let minComptage = Infinity;
    
    Object.keys(parAgence).forEach(agence => {
      const comptage = comptageAgence[agence] || 0;
      if (comptage < minComptage) {
        minComptage = comptage;
        agenceChoisie = agence;
      }
    });
    
    if (!agenceChoisie) return agentsDisponibles[0];
    
    // Choisir l'agent avec la plus haute priorité dans cette agence
    const candidats = parAgence[agenceChoisie];
    candidats.sort((a, b) => b.priorite - a.priorite);
    
    return candidats[0];
  }

  // ========== RÉAFFECTATION AUTOMATIQUE ==========
  async reaffecterAgent(idPlanning, motif, userId) {
    try {
      const ancienPlanning = await Planning.findByPk(idPlanning, {
        include: [{ model: Agent }]
      });
      
      if (!ancienPlanning) {
        throw new Error('Planning non trouvé');
      }
      
      // Marquer comme reprogrammé
      ancienPlanning.statut = 'Reporté';
      ancienPlanning.reprogrammee = true;
      ancienPlanning.motif_reprogrammation = motif;
      await ancienPlanning.save();
      
      // Récupérer les agents disponibles
      const agents = await Agent.findAll({
        where: { statut: 'actif' }
      });
      
      // Calculer priorités
      const agentsAvecPriorite = agents.map(a => ({
        ...a.toJSON(),
        priorite: this.calculerPriorite(a)
      }));
      
      // Exclure l'agent actuel et ceux déjà programmés ce jour-là
      const planningJour = await Planning.findAll({
        where: {
          date_visite: ancienPlanning.date_visite,
          statut: 'Programmé'
        }
      });
      
      const exclus = planningJour.map(p => p.matricule_agent);
      exclus.push(ancienPlanning.matricule_agent);
      
      const disponibles = agentsAvecPriorite.filter(a => !exclus.includes(a.matricule_agent));
      
      if (disponibles.length === 0) {
        console.log('⚠️ Aucun agent disponible pour réaffectation');
        return null;
      }
      
      // Choisir le meilleur agent
      disponibles.sort((a, b) => b.priorite - a.priorite);
      const nouvelAgent = disponibles[0];
      
      // Créer nouvelle affectation
      const nouveauPlanning = await Planning.create({
        matricule_agent: nouvelAgent.matricule_agent,
        date_visite: ancienPlanning.date_visite,
        heure_visite: ancienPlanning.heure_visite,
        type_visite: ancienPlanning.type_visite,
        statut: 'Programmé',
        priorite: nouvelAgent.priorite,
        visite_originale_id: ancienPlanning.id_planning,
        semaine: ancienPlanning.semaine,
        annee: ancienPlanning.annee,
        created_by: userId
      });
      
      console.log(`✅ Réaffectation: Agent ${nouvelAgent.matricule_agent} remplace ${ancienPlanning.matricule_agent}`);
      
      return nouveauPlanning;
      
    } catch (error) {
      console.error('❌ Erreur réaffectation:', error);
      throw error;
    }
  }

  // ========== UTILITAIRES ==========
  getNumeroSemaine(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  getLundiSemaine(numeroSemaine, annee) {
    const simple = new Date(annee, 0, 1 + (numeroSemaine - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
  }
}

module.exports = new PlanningService();