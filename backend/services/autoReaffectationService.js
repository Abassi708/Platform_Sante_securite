// backend/services/autoReaffectationService.js
const { Op } = require('sequelize');
const Planning = require('../models/Planning');
const Agent = require('../models/Agent');
const planningService = require('./planningService');
const reprogrammationAutoService = require('./reprogrammationAutoService');
const tracabiliteService = require('./tracabiliteVisiteService');

class AutoReaffectationService {
  
  async verifierEtReaffecter() {
    console.log('\n🔄 AUTO-RÉAFFECTATION - Vérification des indisponibilités...');
    
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const dans2Jours = new Date(aujourdhui);
    dans2Jours.setDate(aujourdhui.getDate() + 2);
    
    const planningsAVenir = await Planning.findAll({
      where: {
        date_visite: { [Op.between]: [aujourdhui, dans2Jours] },
        statut: 'Programmé',
        visite_effectuee: false,
        creneau_bloque: false
      },
      include: [{
        model: Agent,
        as: 'planningAgent',
        attributes: ['matricule_agent', 'nom', 'prenom', 'statut', 'date_fin_inaptitude']
      }]
    });
    
    let nbReaffecte = 0;
    
    for (const planning of planningsAVenir) {
      const agent = planning.planningAgent;
      const estIndisponible = await this.estAgentIndisponible(agent, planning.date_visite);
      
      if (estIndisponible) {
        console.log(`⚠️ Agent #${planning.matricule_agent} indisponible le ${planning.date_visite}`);
        const remplacant = await this.trouverRemplacant(planning);
        
        if (remplacant) {
          await this.reaffecterAutomatique(planning, remplacant, "Absence détectée automatiquement");
          nbReaffecte++;
          console.log(`✅ Auto-réaffectation: #${planning.matricule_agent} → #${remplacant.matricule_agent}`);
        } else {
          console.log(`⚠️ Aucun remplaçant trouvé pour #${planning.matricule_agent}`);
          await this.reporterVisite(planning);
        }
      }
    }
    
    console.log(`📊 ${nbReaffecte} visite(s) réaffectée(s) automatiquement`);
    return nbReaffecte;
  }
  
  async estAgentIndisponible(agent, dateVisite) {
    if (!agent) return true;
    if (agent.statut !== 'actif') return true;
    if (agent.date_fin_inaptitude) {
      const dateFin = new Date(agent.date_fin_inaptitude);
      if (dateFin >= new Date(dateVisite)) return true;
    }
    return false;
  }
  
  async trouverRemplacant(planning) {
    const agentsDisponibles = await Agent.findAll({
      where: {
        statut: 'actif',
        matricule_agent: { [Op.ne]: planning.matricule_agent },
        [Op.or]: [
          { date_fin_inaptitude: null },
          { date_fin_inaptitude: { [Op.lt]: new Date() } }
        ]
      }
    });
    
    const planifiesCeJour = await Planning.findAll({
      where: {
        date_visite: planning.date_visite,
        statut: 'Programmé',
        creneau_bloque: false
      },
      attributes: ['matricule_agent']
    });
    
    const exclus = planifiesCeJour.map(p => p.matricule_agent);
    const disponibles = agentsDisponibles.filter(a => !exclus.includes(a.matricule_agent));
    if (disponibles.length === 0) return null;
    
    const avecPriorite = [];
    for (const agent of disponibles) {
      avecPriorite.push({ ...agent.toJSON(), priorite: await planningService.calculerPriorite(agent) });
    }
    avecPriorite.sort((a, b) => b.priorite - a.priorite);
    
    return avecPriorite[0];
  }
  
  async reaffecterAutomatique(ancienPlanning, nouvelAgent, motif) {
    ancienPlanning.statut = 'Reporté';
    ancienPlanning.reprogrammee = true;
    ancienPlanning.source_reprogrammation = 'auto';
    ancienPlanning.motif_reprogrammation = motif;
    ancienPlanning.date_reprogrammation = new Date();
    ancienPlanning.creneau_bloque = false;
    await ancienPlanning.save();
    
    const nouveauPlanning = await Planning.create({
      matricule_agent: nouvelAgent.matricule_agent,
      date_visite: ancienPlanning.date_visite,
      heure_visite: ancienPlanning.heure_visite,
      type_visite: ancienPlanning.type_visite,
      statut: 'Programmé',
      priorite: nouvelAgent.priorite || 0,
      visite_originale_id: ancienPlanning.id_planning,
      semaine: ancienPlanning.semaine,
      annee: ancienPlanning.annee,
      convocation_envoyee: false,
      created_by: 1
    });
    
    await tracabiliteService.enregistrerReaffectation(
      ancienPlanning, nouvelAgent, nouveauPlanning, motif + " (auto)", { id: 1, role: 'system' }
    );
    
    return nouveauPlanning;
  }
  
  async reporterVisite(planning) {
    const nouvelleDate = new Date(planning.date_visite);
    nouvelleDate.setDate(nouvelleDate.getDate() + 7);
    
    let joursEssais = 0;
    while (!(await planningService.estJourOuvre(nouvelleDate)) && joursEssais < 21) {
      nouvelleDate.setDate(nouvelleDate.getDate() + 1);
      joursEssais++;
    }
    
    if (planning.type_visite === 'Périodique') {
      await reprogrammationAutoService.reprogrammerAutoPeriodique(
        planning.id_planning,
        nouvelleDate.toISOString().split('T')[0],
        planning.heure_visite,
        "Auto-report: aucun remplaçant", 1
      );
    } else {
      await reprogrammationAutoService.reprogrammerAutoReprise(
        planning.id_planning,
        nouvelleDate.toISOString().split('T')[0],
        planning.heure_visite,
        "Auto-report: aucun remplaçant", 1
      );
    }
    
    console.log(`📅 Visite auto-reportée au ${nouvelleDate.toISOString().split('T')[0]}`);
  }
  
  async verifierEtReprogrammerRetards() {
    console.log('\n⏰ AUTO-REPROGRAMMATION - Vérification des retards...');
    
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    const visitesEnRetard = await Planning.findAll({
      where: {
        date_visite: { [Op.lt]: aujourdhui },
        visite_effectuee: false,
        statut: { [Op.in]: ['Programmé', 'Reporté'] },
        creneau_bloque: false
      }
    });
    
    let nbReprogramme = 0;
    
    for (const visite of visitesEnRetard) {
      const joursRetard = Math.floor((aujourdhui - new Date(visite.date_visite)) / (1000 * 60 * 60 * 24));
      if (joursRetard >= 3) {
        console.log(`⚠️ Visite #${visite.id_planning} en retard de ${joursRetard} jours`);
        
        if (visite.type_visite === 'Périodique') {
          await reprogrammationAutoService.reprogrammerRetardPeriodique(visite, 1);
        } else if (visite.type_visite === 'Reprise') {
          await reprogrammationAutoService.reprogrammerRetardReprise(visite, 1);
        }
        
        nbReprogramme++;
        console.log(`   ✅ Reprogrammée automatiquement`);
      }
    }
    
    console.log(`📊 ${nbReprogramme} visite(s) reprogrammée(s) automatiquement pour retard`);
    return nbReprogramme;
  }
}

module.exports = new AutoReaffectationService();