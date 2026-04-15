// backend/services/planningService.js
// VERSION CORRIGÉE - Structure correcte

const { Op } = require('sequelize');
const db = require('../models');
const joursFeriesService = require('./joursFeriesService');
const moment = require('moment');

console.log('🟢 PLANNING SERVICE CHARGÉ');

class PlanningService {
  constructor() {
    this.creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
    this.joursFeriesService = joursFeriesService;
    this.JOURS_VALIDES = [2, 3, 4, 5]; // Mardi, Mercredi, Jeudi, Vendredi
    this.CAPACITE_HEBDOMADAIRE = 16;
    
    this.Agent = db.global.Agent;
    this.Planning = db.local.Planning;
    this.Visite = db.local.Visite;
  }

  // ========== NORMALISATION (CRUCIALE) ==========
  normaliserCodeAffectation(codeAffectation) {
    if (codeAffectation === 3) {
      return 3;  // Chauffeur
    }
    return 5;    // Contrôleur / Autre
  }

  estChauffeur(codeAffectation) {
    return this.normaliserCodeAffectation(codeAffectation) === 3;
  }

  getLibellePoste(codeAffectation) {
    if (this.estChauffeur(codeAffectation)) {
      return 'Chauffeur';
    }
    return 'Contrôleur';
  }

  // ========== PÉRIODICITÉ ==========
  calculerPeriodicite(agent) {
    if (agent.periodicite_jours && agent.periodicite_jours > 0) {
      return agent.periodicite_jours;
    }
    if (this.estChauffeur(agent.code_affectation)) {
      return 180;
    }
    return 365;
  }

  getPeriodiciteTexte(agent) {
    const jours = this.calculerPeriodicite(agent);
    if (jours === 180) return '6 mois';
    if (jours === 365) return '1 an';
    return `${Math.floor(jours / 30)} mois`;
  }

  // ========== JOURS ET DATES ==========
  getNumeroSemaine(date) {
    return moment.utc(date).isoWeek();
  }

  getLundiSemaine(numeroSemaine, annee) {
    const lundi = moment.utc().year(annee).isoWeek(numeroSemaine).day(1);
    return lundi.format('YYYY-MM-DD');
  }

  _getNomJour(jourSemaine) {
    const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    return jours[jourSemaine];
  }

  async estJourOuvre(date) {
    const m = moment.utc(date);
    const jourSemaine = m.day();
    
    if (!this.JOURS_VALIDES.includes(jourSemaine)) {
      return false;
    }
    
    try {
      const estFerie = await this.joursFeriesService.estJourFerie(m.toDate());
      if (estFerie) return false;
    } catch (error) {
      // Ignorer les erreurs API
    }
    
    return true;
  }

  async getCreneauxOccupesParDate(dateStr) {
  // Récupérer TOUS les créneaux occupés pour une date donnée
  // (quel que soit le type de visite ou la source)
  const visitesExistantes = await this.Planning.findAll({
    where: {
      date_visite: dateStr,
      [Op.or]: [
        { statut: 'Programmé', visite_effectuee: false },
        { creneau_bloque: true },
        { statut: 'Annulé' },
        { visite_effectuee: true }
      ]
    },
    attributes: ['heure_visite']
  });
  
  return new Set(visitesExistantes.map(v => v.heure_visite));
}

  // ========== NOUVELLE FONCTION À AJOUTER ==========
  // Vérifie si un créneau horaire est disponible (non occupé, non bloqué, etc.)
  async estCreneauDisponible(dateVisite, heureVisite, idPlanningExclu = null) {
    const whereClause = {
      date_visite: dateVisite,
      heure_visite: heureVisite
    };
    
    if (idPlanningExclu) {
      whereClause.id_planning = { [Op.ne]: idPlanningExclu };
    }
    
    const planningExistant = await this.Planning.findOne({ where: whereClause });
    
    if (!planningExistant) return true;
    
    // Cas où le créneau est indisponible
    if (planningExistant.visite_effectuee === true) return false;
    if (planningExistant.statut === 'Annulé') return false;
    if (planningExistant.statut === 'Effectué') return false;
    if (planningExistant.creneau_bloque === true) return false;
    if (planningExistant.statut === 'Programmé' && !planningExistant.visite_effectuee) return false;
    
    return true;
  }

  // ========== NOUVELLE FONCTION À AJOUTER ==========
  // Vérifie si l'agent n'a pas déjà une visite ce jour-là
  async estAgentDisponibleCeJour(matriculeAgent, dateVisite, idPlanningExclu = null) {
    const whereClause = {
      matricule_agent: matriculeAgent,
      date_visite: dateVisite,
      statut: 'Programmé',
      visite_effectuee: false
    };
    
    if (idPlanningExclu) {
      whereClause.id_planning = { [Op.ne]: idPlanningExclu };
    }
    
    const planningExistant = await this.Planning.findOne({ where: whereClause });
    return !planningExistant;
  }

  // ========== NOUVELLE FONCTION À AJOUTER ==========
  // Vérification complète (jour ouvré + créneau dispo + agent dispo)
  async estPlanningPossible(dateVisite, heureVisite, matriculeAgent, idPlanningExclu = null) {
    const dateObj = new Date(dateVisite);
    
    // 1. Vérifier que c'est un jour ouvré
    if (!(await this.estJourOuvre(dateObj))) {
      return { possible: false, raison: 'JOUR_NON_OUVRE', message: 'Ce jour n\'est pas ouvrable (mardi à vendredi, hors jours fériés)' };
    }
    
    // 2. Vérifier que l'agent n'a pas déjà une visite ce jour
    if (!(await this.estAgentDisponibleCeJour(matriculeAgent, dateVisite, idPlanningExclu))) {
      return { possible: false, raison: 'AGENT_DEJA_OCCUPE', message: 'L\'agent a déjà une visite programmée ce jour' };
    }
    
    // 3. Vérifier que le créneau est disponible
    if (!(await this.estCreneauDisponible(dateVisite, heureVisite, idPlanningExclu))) {
      return { possible: false, raison: 'CRENEAU_OCCUPE', message: 'Ce créneau horaire est déjà occupé' };
    }
    
    return { possible: true, raison: null, message: 'Planning possible' };
  }

  async getProchainJourOuvre(date) {
    const dateTemp = moment.utc(date);
    let essais = 0;
    const maxEssais = 30;
    
    dateTemp.add(1, 'days');
    
    while (!(await this.estJourOuvre(dateTemp.toDate())) && essais < maxEssais) {
      dateTemp.add(1, 'days');
      essais++;
    }
    
    if (essais >= maxEssais) return null;
    return dateTemp.toDate();
  }

  async getJourOuvreAvant(date) {
    const dateTemp = moment.utc(date);
    let essais = 0;
    const maxEssais = 21;
    
    dateTemp.subtract(1, 'days');
    
    while (!(await this.estJourOuvre(dateTemp.toDate())) && essais < maxEssais) {
      dateTemp.subtract(1, 'days');
      essais++;
    }
    
    if (essais >= maxEssais) return null;
    return dateTemp.toDate();
  }

  // ========== VÉRIFICATIONS VISITES ==========
  async aDejaUneVisitePlanifiee(agent, dateReference = null, joursFenetre = 60) {
    const dateDebut = dateReference || new Date();
    const dateFin = new Date(dateDebut);
    dateFin.setDate(dateDebut.getDate() + joursFenetre);

    const existe = await this.Planning.findOne({
      where: {
        matricule_agent: agent.matricule_agent,
        date_visite: { [Op.gte]: dateDebut, [Op.lte]: dateFin },
        statut: 'Programmé',
        type_visite: ['Périodique', 'Reprise']
      }
    });

    return existe !== null;
  }

  async estVisitePeriodiqueNecessaire(agent) {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);

    if (agent.date_fin_inaptitude) {
      const dateFin = new Date(agent.date_fin_inaptitude);
      if (dateFin > aujourdhui) return false;
    }

    const visiteExistante = await this.Planning.findOne({
      where: {
        matricule_agent: agent.matricule_agent,
        type_visite: 'Périodique',
        visite_effectuee: false,
        statut: { [Op.not]: 'Annulé' }
      }
    });
    
    if (visiteExistante) {
      console.log(`⏭️ Agent ${agent.matricule_agent} a déjà une visite périodique (ID: ${visiteExistante.id_planning}, date: ${visiteExistante.date_visite})`);
      return false;
    }

    if (!agent.date_derniere_visite) return true;

    const joursDepuis = Math.floor((aujourdhui - new Date(agent.date_derniere_visite)) / (1000 * 60 * 60 * 24));
    const periodicite = this.calculerPeriodicite(agent);

    return joursDepuis >= periodicite;
  }

  async estVisiteRepriseNecessaire(agent) {
    if (!agent.date_fin_inaptitude) return false;
    
    const dateFin = new Date(agent.date_fin_inaptitude);
    const aujourdhui = new Date();
    
    if (dateFin <= aujourdhui) return false;
    
    const dateRepriseIdeal = new Date(dateFin);
    dateRepriseIdeal.setDate(dateFin.getDate() - 3);
    
    if (await this.aDejaUneVisitePlanifiee(agent, dateRepriseIdeal)) return false;
    
    return true;
  }

  async getDateRepriseOptimale(agent) {
    if (!agent.date_fin_inaptitude) return null;
    
    const dateFin = new Date(agent.date_fin_inaptitude);
    const dateReprise = new Date(dateFin);
    dateReprise.setDate(dateFin.getDate() - 3);
    
    return await this.getJourOuvreAvant(dateReprise);
  }

  // ========== CALCUL PRIORITÉ ==========
  async calculerPriorite(agent, typeVisite) {
    if (typeVisite === 'Reprise') return 2000;
    if (!agent.date_derniere_visite) return 1000;

    const aujourdhui = new Date();
    const periodicite = this.calculerPeriodicite(agent);
    const joursDepuis = Math.floor((aujourdhui - new Date(agent.date_derniere_visite)) / (1000 * 60 * 60 * 24));
    const joursDepassement = Math.max(0, joursDepuis - periodicite);

    let priorite = joursDepuis + joursDepassement * 5;
    if (this.estChauffeur(agent.code_affectation)) priorite += 30;

    return priorite;
  }

// ========== GÉNÉRATION PLANNING ==========

async genererPlanningSemaine(dateDebut, userId) {
  try {
    const semaine = this.getNumeroSemaine(dateDebut);
    const annee = dateDebut.getFullYear();

    // Vérifier si un planning périodique auto existe déjà
    const planningPeriodiqueExistant = await this.Planning.findOne({ 
      where: { 
        semaine, 
        annee, 
        type_visite: 'Périodique',
        source_planification: 'auto',
        reprogrammee: false
      } 
    });
    
    if (planningPeriodiqueExistant) {
      console.log(`ℹ️ Planning périodique semaine ${semaine}/${annee} existe déjà`);
      return [];
    }

    // Générer les jours de la semaine
    const joursSemaine = [];
    for (let i = 1; i <= 4; i++) {
      const jourDate = new Date(dateDebut);
      jourDate.setDate(dateDebut.getDate() + i);
      if (await this.estJourOuvre(jourDate)) {
        joursSemaine.push(jourDate);
      }
    }

    if (joursSemaine.length === 0) {
      console.log('⚠️ Aucun jour ouvré dans la semaine');
      return [];
    }

    // ✅ Pour chaque jour, récupérer les créneaux déjà occupés (par TOUTES les visites)
    const creneauxOccupesParJour = new Map();
    for (const jourDate of joursSemaine) {
      const dateStr = moment.utc(jourDate).format('YYYY-MM-DD');
      const creneauxOccupes = await this.getCreneauxOccupesParDate(dateStr);
      creneauxOccupesParJour.set(dateStr, creneauxOccupes);
    }

    // Récupérer les agents ayant besoin d'une visite
    const tousAgents = await this.Agent.findAll({ where: { statut: 'actif' } });
    const besoinsReprise = [];
    const besoinsPeriodique = [];

    for (const agent of tousAgents) {
      // Vérifier si l'agent a déjà une visite planifiée (quel que soit le type)
      const dejaPlanifie = await this.Planning.findOne({
        where: {
          matricule_agent: agent.matricule_agent,
          statut: 'Programmé',
          visite_effectuee: false,
          date_visite: { [Op.gte]: new Date() }
        }
      });
      
      if (dejaPlanifie) {
        console.log(`⏭️ Agent ${agent.matricule_agent} déjà planifié le ${dejaPlanifie.date_visite} - ignoré`);
        continue;
      }
      
      const besoinReprise = await this.estVisiteRepriseNecessaire(agent);
      const besoinPeriodique = !besoinReprise && (await this.estVisitePeriodiqueNecessaire(agent));

      if (besoinReprise) {
        besoinsReprise.push({
          ...agent.toJSON(),
          code_affectation: this.normaliserCodeAffectation(agent.code_affectation),
          priorite: await this.calculerPriorite(agent, 'Reprise'),
          type_visite_calcule: 'Reprise',
          date_optimal: await this.getDateRepriseOptimale(agent)
        });
      } else if (besoinPeriodique) {
        besoinsPeriodique.push({
          ...agent.toJSON(),
          code_affectation: this.normaliserCodeAffectation(agent.code_affectation),
          priorite: await this.calculerPriorite(agent, 'Périodique'),
          type_visite_calcule: 'Périodique'
        });
      }
    }

    // Trier par priorité
    besoinsReprise.sort((a, b) => b.priorite - a.priorite);
    besoinsPeriodique.sort((a, b) => b.priorite - a.priorite);
    
    const tousBesoins = [...besoinsReprise, ...besoinsPeriodique];

    if (tousBesoins.length === 0) {
      console.log('ℹ️ Aucun agent nécessitant une visite');
      return [];
    }

    // Planifier les visites
    const planning = [];
    const agentsPlanifies = new Set();
    const agencesPlanifiees = new Set();
    const postesPlanifies = new Set();

    for (const jourDate of joursSemaine) {
      const dateStr = moment.utc(jourDate).format('YYYY-MM-DD');
      const agentsJour = [];
      const agencesJour = [];
      const postesJour = [];
      
      // ✅ Récupérer les créneaux déjà occupés pour ce jour
      const creneauxOccupes = creneauxOccupesParJour.get(dateStr) || new Set();

      for (const creneau of this.creneaux) {
        // ✅ Ignorer les créneaux déjà occupés (par n'importe quelle visite)
        if (creneauxOccupes.has(creneau)) {
          console.log(`⏭️ Créneau ${dateStr} ${creneau} déjà occupé - ignoré`);
          continue;
        }
        
        let agentChoisi = null;

        for (let i = 0; i < tousBesoins.length; i++) {
          const agent = tousBesoins[i];

          if (agentsPlanifies.has(agent.matricule_agent)) continue;
          if (agentsJour.includes(agent.matricule_agent)) continue;
          if (agencesJour.includes(agent.code_agence)) continue;
          if (postesJour.includes(agent.code_affectation)) continue;

          // Vérifier si l'agent a déjà une visite le même jour (programmation manuelle)
          const visiteLeMemeJour = await this.Planning.findOne({
            where: {
              matricule_agent: agent.matricule_agent,
              date_visite: dateStr,
              statut: 'Programmé',
              visite_effectuee: false
            }
          });
          
          if (visiteLeMemeJour) {
            console.log(`⏭️ Agent ${agent.matricule_agent} a déjà une visite le ${dateStr} - ignoré pour ce jour`);
            continue;
          }

          if (agent.type_visite_calcule === 'Reprise' && agent.date_optimal) {
            const dateOptStr = moment.utc(agent.date_optimal).format('YYYY-MM-DD');
            if (dateOptStr !== dateStr) continue;
          }

          agentChoisi = agent;
          break;
        }

        if (agentChoisi) {
          planning.push({
            matricule_agent: agentChoisi.matricule_agent,
            date_visite: dateStr,
            heure_visite: creneau,
            type_visite: agentChoisi.type_visite_calcule,
            statut: 'Programmé',
            priorite: agentChoisi.priorite,
            semaine: semaine,
            annee: annee,
            created_by: userId,
            convocation_envoyee: false,
            source_planification: 'auto'
          });

          agentsPlanifies.add(agentChoisi.matricule_agent);
          agentsJour.push(agentChoisi.matricule_agent);
          agencesJour.push(agentChoisi.code_agence);
          postesJour.push(agentChoisi.code_affectation);
        }
      }
    }

    if (planning.length > 0) {
      await this.Planning.bulkCreate(planning);
      console.log(`✅ ${planning.length} visite(s) générée(s) pour semaine ${semaine}/${annee}`);
    }

    return planning;
  } catch (error) {
    console.error('❌ Erreur génération planning:', error);
    throw error;
  }
}

  // ========== PLANIFICATION MANUELLE ==========
  async planifierVisiteManuelle(matricule_agent, dateVisite, heureVisite, typeVisite, motif, userId) {
    const dateObj = new Date(dateVisite);

    if (!(await this.estJourOuvre(dateObj))) {
      throw new Error("La date choisie n'est pas un jour ouvré (Mardi à Vendredi, hors jours fériés)");
    }

    if (!['Reclassement', 'Embauche'].includes(typeVisite)) {
      throw new Error(`Type de visite "${typeVisite}" invalide. Utilisez Reclassement ou Embauche.`);
    }

    const planning = await this.Planning.create({
      matricule_agent,
      date_visite: dateVisite,
      heure_visite: heureVisite || '09:00:00',
      type_visite: typeVisite,
      statut: 'Programmé',
      priorite: 200,
      semaine: this.getNumeroSemaine(dateObj),
      annee: dateObj.getFullYear(),
      created_by: userId,
      convocation_envoyee: false,
      motif_reprogrammation: motif || `Visite de ${typeVisite} manuelle`,
      source_planification: 'manuel'
    });

    return planning;
  }

  async planifierVisiteReclassement(agent, userId, dateVisite, heureVisite, motif) {
    return this.planifierVisiteManuelle(agent.matricule_agent, dateVisite, heureVisite || '09:00:00', 'Reclassement', motif, userId);
  }

  async planifierVisiteEmbauche(agent, userId, dateVisite, heureVisite, motif) {
    return this.planifierVisiteManuelle(agent.matricule_agent, dateVisite, heureVisite || '09:00:00', 'Embauche', motif, userId);
  }

  // ========== VÉRIFICATION SEMAINES MANQUANTES ==========
  async verifierEtGenererSemainesManquantes(userId) {
    const aujourdhui = new Date();
    const semaineActuelle = this.getNumeroSemaine(aujourdhui);
    const annee = aujourdhui.getFullYear();
    let totalGenere = 0;
    
    const planningActuel = await this.Planning.findOne({ where: { semaine: semaineActuelle, annee } });
    if (!planningActuel) {
      const lundiActuel = this.getLundiSemaine(semaineActuelle, annee);
      const planning = await this.genererPlanningSemaine(new Date(lundiActuel), userId);
      totalGenere += planning.length;
    }
    
    return totalGenere;
  }

  async getPlanningAvecAgents(semaine, annee) {
    const planning = await this.Planning.findAll({
      where: { semaine: parseInt(semaine), annee: parseInt(annee) },
      order: [['date_visite', 'ASC'], ['heure_visite', 'ASC']],
      raw: true
    });

    const planningAvecDetails = await Promise.all(planning.map(async (p) => {
      if (p.visite_effectuee) {
        const visiteDetails = await this.Visite.findOne({
          where: { id_planning: p.id_planning, type_action: 'EFFECTUEE' },
          attributes: ['details_action', 'observation', 'resultat'],
          raw: true
        });
        if (visiteDetails) {
          return {
            ...p,
            details_action: visiteDetails.details_action,
            observation: visiteDetails.observation,
            resultat: visiteDetails.resultat
          };
        }
      }
      return p;
    }));

    return planningAvecDetails;
  }
}

module.exports = new PlanningService();