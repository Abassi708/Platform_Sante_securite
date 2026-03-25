// backend/services/planningService.js
const { Op } = require('sequelize');
const db = require('../models');
const joursFeriesService = require('./joursFeriesService');
const moment = require('moment');

console.log('🟢 PLANNING SERVICE CHARGÉ - moment.js version:', moment.version);

class PlanningService {
  constructor() {
    this.creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
    this.joursFeriesService = joursFeriesService;
    this.JOURS_VISITE = [2, 3, 4, 5];
    this.CAPACITE_HEBDOMADAIRE = 16;
    
    // Récupérer les modèles depuis db
    this.Agent = db.global.Agent;
    this.Planning = db.local.Planning;
    this.Visite = db.local.Visite;
  }

  calculerPeriodicite(agent) {
    if (agent.periodicite_jours && agent.periodicite_jours > 0) {
      return agent.periodicite_jours;
    }
    return agent.code_affectation === 3 ? 180 : 365;
  }

  getNumeroSemaine(date) {
    const semaine = moment(date).isoWeek();
    console.log(`📅 getNumeroSemaine: ${date.toISOString().split('T')[0]} → semaine ${semaine}`);
    return semaine;
  }

  getLundiSemaine(numeroSemaine, annee) {
    console.log(`🔍 getLundiSemaine ENTRÉE: numeroSemaine=${numeroSemaine}, annee=${annee}`);
    const lundi = moment().year(annee).isoWeek(numeroSemaine).startOf('isoWeek');
    const result = lundi.format('YYYY-MM-DD');
    console.log(`🔍 getLundiSemaine SORTIE: ${result}`);
    return result;
  }

  async estJourOuvre(date) {
    const annee = date.getFullYear();
    const mois = date.getMonth();
    const jour = date.getDate();
    const dateLocale = new Date(annee, mois, jour);
    const jourSemaine = dateLocale.getDay();
    
    console.log(`   🔍 estJourOuvre: ${annee}-${mois+1}-${jour} -> jour: ${jourSemaine} (0=dim,1=lun,2=mar,3=mer,4=jeu,5=ven,6=sam)`);
    
    if (jourSemaine < 2 || jourSemaine > 5) {
      console.log(`   ❌ ${annee}-${mois+1}-${jour} n'est pas un jour ouvré`);
      return false;
    }
    
    const estFerie = await this.joursFeriesService.estJourFerie(date);
    if (estFerie) {
      console.log(`   ❌ ${annee}-${mois+1}-${jour} est un jour férié`);
      return false;
    }
    
    console.log(`   ✅ ${annee}-${mois+1}-${jour} est un jour ouvré`);
    return true;
  }

  async getProchainJourOuvre(date) {
    const dateTemp = new Date(date);
    let essais = 0;
    while (!(await this.estJourOuvre(dateTemp)) && essais < 21) {
      dateTemp.setDate(dateTemp.getDate() + 1);
      essais++;
    }
    return dateTemp;
  }

  async getJourOuvreAvant(date) {
    const dateTemp = new Date(date);
    let essais = 0;
    while (!(await this.estJourOuvre(dateTemp)) && essais < 21) {
      dateTemp.setDate(dateTemp.getDate() - 1);
      essais++;
    }
    return dateTemp;
  }

  async aDejaUneVisitePlanifiee(agent, dateReference = null) {
    const dateDebut = dateReference || new Date();
    const dateFin = new Date(dateDebut);
    dateFin.setDate(dateDebut.getDate() + 30);

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

    if (agent.date_fin_inaptitude) {
      const dateFin = new Date(agent.date_fin_inaptitude);
      if (dateFin > aujourdhui) return false;
    }

    if (await this.aDejaUneVisitePlanifiee(agent)) return false;

    if (!agent.date_derniere_visite) return true;

    const joursDepuis = Math.floor((aujourdhui - new Date(agent.date_derniere_visite)) / (1000 * 60 * 60 * 24));
    const periodicite = this.calculerPeriodicite(agent);

    if (joursDepuis >= periodicite) {
      console.log(`   📋 Agent #${agent.matricule_agent}: ${joursDepuis}j depuis dernière visite (périodicité ${periodicite}j)`);
      return true;
    }

    return false;
  }

  async estVisiteRepriseNecessaire(agent) {
    if (!agent.date_fin_inaptitude) return false;
    
    const dateFin = new Date(agent.date_fin_inaptitude);
    const aujourdhui = new Date();
    
    const dateReprise = new Date(dateFin);
    dateReprise.setDate(dateFin.getDate() - 3);
    
    console.log(`   🔄 Agent #${agent.matricule_agent}: Fin inaptitude ${agent.date_fin_inaptitude} → Reprise idéale le ${dateReprise.toISOString().split('T')[0]}`);
    
    if (await this.aDejaUneVisitePlanifiee(agent, dateReprise)) return false;
    
    if (dateReprise >= aujourdhui && dateFin > aujourdhui) {
      return true;
    }
    
    return false;
  }

  async getDateRepriseOptimale(agent) {
    if (!agent.date_fin_inaptitude) return null;
    
    const dateFin = new Date(agent.date_fin_inaptitude);
    const dateReprise = new Date(dateFin);
    dateReprise.setDate(dateFin.getDate() - 3);
    
    const dateOuvre = await this.getJourOuvreAvant(dateReprise);
    
    console.log(`   📅 Agent #${agent.matricule_agent}: Reprise optimale le ${dateOuvre.toISOString().split('T')[0]}`);
    
    return dateOuvre;
  }

  async calculerPriorite(agent, typeVisite) {
    if (typeVisite === 'Reprise') return 2000;
    if (!agent.date_derniere_visite) return 1000;

    const aujourdhui = new Date();
    const periodicite = this.calculerPeriodicite(agent);
    const joursDepuis = Math.floor((aujourdhui - new Date(agent.date_derniere_visite)) / (1000 * 60 * 60 * 24));
    const joursDepassement = Math.max(0, joursDepuis - periodicite);

    let priorite = joursDepuis + joursDepassement * 5;
    if (agent.code_affectation === 3) priorite += 30;

    return priorite;
  }

  async genererPlanningSemaine(dateDebut, userId) {
    try {
      console.log('\n' + '='.repeat(70));
      console.log('📅 GÉNÉRATION PLANNING AUTOMATIQUE (Périodique + Reprise)');
      console.log('='.repeat(70));

      const dateDebutStr = dateDebut.toISOString().split('T')[0];
      console.log(`🔍 dateDebut reçu = ${dateDebutStr}`);
      
      const semaine = moment(dateDebutStr).isoWeek();
      console.log(`🔍 moment(${dateDebutStr}).isoWeek() = ${semaine}`);
      
      const annee = dateDebut.getFullYear();

      console.log(`📆 Semaine cible: ${semaine}/${annee}`);
      console.log(`📆 Lundi: ${dateDebutStr}`);

      const existant = await this.Planning.findOne({ where: { semaine, annee } });
      if (existant) {
        console.log(`⚠️ Planning semaine ${semaine}/${annee} déjà existant — abandon`);
        return [];
      }

      const tousAgents = await this.Agent.findAll({ where: { statut: 'actif' } });
      console.log(`\n👥 Agents actifs: ${tousAgents.length}`);

      const agentsNecessaires = [];

      for (const agent of tousAgents) {
        const besoinReprise = await this.estVisiteRepriseNecessaire(agent);
        const besoinPeriodique = !besoinReprise && (await this.estVisitePeriodiqueNecessaire(agent));

        if (besoinReprise || besoinPeriodique) {
          const typeVisite = besoinReprise ? 'Reprise' : 'Périodique';
          const priorite = await this.calculerPriorite(agent, typeVisite);
          const dateOptimal = besoinReprise ? await this.getDateRepriseOptimale(agent) : null;

          agentsNecessaires.push({
            ...agent.toJSON(),
            priorite,
            type_visite_calcule: typeVisite,
            date_optimal: dateOptimal
          });
        }
      }

      agentsNecessaires.sort((a, b) => b.priorite - a.priorite);

      console.log(`\n📊 Agents nécessitant une visite: ${agentsNecessaires.length}`);
      console.log(`   Capacité hebdomadaire: ${this.CAPACITE_HEBDOMADAIRE} visites max`);

      console.log('\n🏆 AGENTS PRIORITAIRES:');
      agentsNecessaires.slice(0, 20).forEach((a, i) => {
        const type = a.type_visite_calcule === 'Reprise'
          ? '🔄 REPRISE'
          : !a.date_derniere_visite
          ? '🔴 1ÈRE VISITE'
          : '📋 Périodique';
        const dateInfo = a.date_optimal ? ` → Reprise ≈ ${a.date_optimal.toISOString().split('T')[0]}` : '';
        console.log(
          `   ${i + 1}. #${a.matricule_agent} - ${a.nom} ${a.prenom}` +
          ` (Agence ${a.code_agence}) - ${type}${dateInfo} - Priorité: ${a.priorite}`
        );
      });

      if (agentsNecessaires.length === 0) {
        console.log("ℹ️ Aucun agent n'a besoin de visite cette semaine");
        return [];
      }

      const joursSemaine = [];
      for (let i = 1; i <= 4; i++) {
        const jourDate = new Date(dateDebut);
        jourDate.setDate(dateDebut.getDate() + i);
        if (await this.estJourOuvre(jourDate)) {
          joursSemaine.push(jourDate);
        }
      }

      const planning = [];
      const agentsDejaPlanifies = new Set();

      for (const jourDate of joursSemaine) {
        const dateStr = jourDate.toISOString().split('T')[0];
        const jourNom = jourDate.toLocaleDateString('fr-FR', { weekday: 'long' });
        console.log(`\n📆 ${dateStr} (${jourNom}):`);

        const agentsJour = [];
        const agencesJour = [];
        const postesJour = [];
        let nbCreneauxJour = 0;

        for (const creneau of this.creneaux) {
          let agentChoisi = null;

          for (let i = 0; i < agentsNecessaires.length; i++) {
            const agent = agentsNecessaires[i];

            if (agentsDejaPlanifies.has(agent.matricule_agent)) continue;
            if (agentsJour.includes(agent.matricule_agent)) continue;
            if (agencesJour.includes(agent.code_agence)) continue;
            if (postesJour.includes(agent.code_affectation)) continue;

            if (agent.type_visite_calcule === 'Reprise' && agent.date_optimal) {
              const dateOptStr = agent.date_optimal.toISOString().split('T')[0];
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

            agentsDejaPlanifies.add(agentChoisi.matricule_agent);
            agentsJour.push(agentChoisi.matricule_agent);
            agencesJour.push(agentChoisi.code_agence);
            postesJour.push(agentChoisi.code_affectation);
            nbCreneauxJour++;

            const typeLabel = agentChoisi.type_visite_calcule === 'Reprise' ? '🔄 REPRISE' : '📋 Périodique';
            console.log(`   ✅ ${creneau} - #${agentChoisi.matricule_agent} ${agentChoisi.nom} ${agentChoisi.prenom} (Agence ${agentChoisi.code_agence}) - ${typeLabel}`);
          } else {
            console.log(`   ⚠️  ${creneau} - Aucun agent disponible`);
          }
        }

        console.log(`   📊 Bilan: ${nbCreneauxJour}/${this.creneaux.length} créneaux remplis`);
      }

      console.log('\n' + '='.repeat(70));
      console.log('📊 RÉCAPITULATIF');
      console.log('='.repeat(70));
      console.log(`   • Agents nécessitant une visite : ${agentsNecessaires.length}`);
      console.log(`   • Agents planifiés              : ${agentsDejaPlanifies.size}`);
      console.log(`   • Visites générées              : ${planning.length}`);

      const periodik = planning.filter(p => p.type_visite === 'Périodique').length;
      const reprises = planning.filter(p => p.type_visite === 'Reprise').length;
      console.log(`     - Périodiques : ${periodik}`);
      console.log(`     - Reprises    : ${reprises}`);

      const nonPlanifies = agentsNecessaires.filter(a => !agentsDejaPlanifies.has(a.matricule_agent));
      if (nonPlanifies.length > 0) {
        console.log(`\n⚠️  ${nonPlanifies.length} agent(s) non planifiés (capacité insuffisante):`);
        nonPlanifies.forEach(a => {
          console.log(`   • #${a.matricule_agent} - ${a.nom} ${a.prenom} (Agence ${a.code_agence}) - ${a.type_visite_calcule}`);
        });
      }

      if (planning.length > 0) {
        await this.Planning.bulkCreate(planning);
        console.log('💾 Planning sauvegardé en base');
      }

      return planning;
    } catch (error) {
      console.error('❌ Erreur génération planning:', error);
      throw error;
    }
  }

  async planifierVisiteManuelle(matricule_agent, dateVisite, heureVisite, typeVisite, motif, userId) {
    const dateObj = new Date(dateVisite);

    if (!(await this.estJourOuvre(dateObj))) {
      throw new Error("La date choisie n'est pas un jour ouvré (Mardi à Vendredi, hors jours fériés)");
    }

    if (!['Reclassement', 'Embauche'].includes(typeVisite)) {
      throw new Error(`Type de visite "${typeVisite}" invalide pour une planification manuelle. Utilisez Reclassement ou Embauche.`);
    }

    const planning = await this.Planning.create({
      matricule_agent,
      date_visite: dateVisite,
      heure_visite: heureVisite || '09:00:00',
      type_visite: typeVisite,
      statut: 'Programmé',
      priorite: 200,
      semaine: moment(dateObj).isoWeek(),
      annee: dateObj.getFullYear(),
      created_by: userId,
      convocation_envoyee: false,
      motif_reprogrammation: motif || `Visite de ${typeVisite} programmée manuellement`,
      source_planification: 'manuel'
    });

    return planning;
  }

  async planifierVisiteReclassement(agent, userId, dateVisite, heureVisite, motif) {
    try {
      console.log(`📝 Planification reclassement pour agent #${agent.matricule_agent} le ${dateVisite} à ${heureVisite}`);
      
      const dateObj = new Date(dateVisite);
      const heure = heureVisite || '09:00:00';
      
      const estOuvre = await this.estJourOuvre(dateObj);
      if (!estOuvre) {
        throw new Error('La date choisie n\'est pas un jour ouvré (Mardi à Vendredi, hors jours fériés)');
      }
      
      const existeDeja = await this.Planning.findOne({
        where: {
          date_visite: dateVisite,
          heure_visite: heure,
          statut: 'Programmé'
        }
      });
      
      if (existeDeja) {
        console.log(`⚠️ Créneau déjà occupé par planning #${existeDeja.id_planning}`);
        throw new Error(`Le créneau du ${dateVisite} à ${heure.substring(0,5)} est déjà occupé`);
      }
      
      const planning = await this.Planning.create({
        matricule_agent: agent.matricule_agent,
        date_visite: dateVisite,
        heure_visite: heure,
        type_visite: 'Reclassement',
        statut: 'Programmé',
        priorite: 200,
        semaine: this.getNumeroSemaine(dateObj),
        annee: dateObj.getFullYear(),
        created_by: userId,
        convocation_envoyee: false,
        motif_reprogrammation: motif || 'Visite de reclassement programmée manuellement',
        source_planification: 'manuel'
      });
      
      console.log(`✅ Planning reclassement créé avec ID: ${planning.id_planning}`);
      return planning;
      
    } catch (error) {
      console.error('❌ Erreur dans planifierVisiteReclassement:', error);
      throw error;
    }
  }

  async planifierVisiteEmbauche(agent, userId, dateVisite, heureVisite, motif) {
    return this.planifierVisiteManuelle(agent.matricule_agent, dateVisite, heureVisite || '09:00:00', 'Embauche', motif, userId);
  }

  async verifierEtGenererSemainesManquantes(userId) {
    console.log('\n🔍 VÉRIFICATION DES SEMAINES MANQUANTES');
    
    const aujourdhui = new Date();
    const semaineActuelle = this.getNumeroSemaine(aujourdhui);
    const annee = aujourdhui.getFullYear();
    let totalGenere = 0;
    
    console.log(`🔍 DEBUG: aujourdhui = ${aujourdhui.toISOString().split('T')[0]}`);
    console.log(`🔍 DEBUG: semaineActuelle = ${semaineActuelle}`);
    console.log(`🔍 DEBUG: getLundiSemaine(${semaineActuelle}, ${annee}) = ${this.getLundiSemaine(semaineActuelle, annee)}`);
    console.log(`🔍 DEBUG: getLundiSemaine(${semaineActuelle + 1}, ${annee}) = ${this.getLundiSemaine(semaineActuelle + 1, annee)}`);
    
    const planningActuel = await this.Planning.findOne({ where: { semaine: semaineActuelle, annee } });
    if (!planningActuel) {
      console.log(`⚠️  Planning semaine ${semaineActuelle}/${annee} manquant — Génération...`);
      const lundiActuel = this.getLundiSemaine(semaineActuelle, annee);
      console.log(`🔍 lundiActuel = ${lundiActuel}`);
      const planning = await this.genererPlanningSemaine(new Date(lundiActuel), userId);
      totalGenere += planning.length;
    } else {
      console.log(`✅ Planning semaine ${semaineActuelle}/${annee} existe déjà`);
    }
    
    const semaineSuivante = semaineActuelle + 1;
    if (semaineSuivante <= 52) {
      const planningProchain = await this.Planning.findOne({ where: { semaine: semaineSuivante, annee } });
      if (!planningProchain) {
        console.log(`⚠️  Planning semaine ${semaineSuivante}/${annee} manquant — Génération...`);
        const lundiProchain = this.getLundiSemaine(semaineSuivante, annee);
        console.log(`🔍 lundiProchain = ${lundiProchain}`);
        const planning = await this.genererPlanningSemaine(new Date(lundiProchain), userId);
        totalGenere += planning.length;
      } else {
        console.log(`✅ Planning semaine ${semaineSuivante}/${annee} existe déjà`);
      }
    }
    
    return totalGenere;
  }
}

module.exports = new PlanningService();