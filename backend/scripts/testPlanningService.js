// backend/scripts/testPlanningService.js
const sequelize = require('../config/database');
const Agent = require('../models/Agent');
const Planning = require('../models/Planning');
const planningService = require('../services/planningService');

async function testPlanningService() {
  console.log('\n' + '='.repeat(60));
  console.log('🧪 TEST PLANNING SERVICE - DÉTECTION DES REDONDANCES');
  console.log('='.repeat(60));

  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données\n');

    // ========== TEST 1 : Vérifier les agents actifs ==========
    console.log('📋 TEST 1: Agents actifs et planifiables');
    const agents = await Agent.findAll({
      where: { statut: 'actif' },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_affectation', 'code_agence', 'date_derniere_visite', 'date_fin_inaptitude']
    });
    
    const agentsPlanifiables = agents.filter(agent => {
      if (agent.date_fin_inaptitude && new Date(agent.date_fin_inaptitude) > new Date()) return false;
      return true;
    });
    
    console.log(`   • Total agents actifs: ${agents.length}`);
    console.log(`   • Agents planifiables: ${agentsPlanifiables.length}`);
    console.log(`   • Agents inaptes exclus: ${agents.length - agentsPlanifiables.length}`);
    
    // Afficher les 10 premiers agents planifiables
    console.log('\n   Top 10 agents planifiables:');
    agentsPlanifiables.slice(0, 10).forEach((a, i) => {
      const poste = a.code_affectation === 3 ? '🚌 Chauffeur' : '👤 Autre';
      const derniereVisite = a.date_derniere_visite || 'Jamais';
      console.log(`   ${i+1}. #${a.matricule_agent} - ${a.nom} ${a.prenom} - ${poste} - Agence ${a.code_agence} - Dernière: ${derniereVisite}`);
    });

    // ========== TEST 2 : Vérifier les agents ayant besoin d'une visite ==========
    console.log('\n📋 TEST 2: Agents ayant besoin d\'une visite (périodicité)');
    const besoinVisite = [];
    for (const agent of agentsPlanifiables) {
      const necessaire = await planningService.estVisiteNecessaire(agent);
      if (necessaire) besoinVisite.push(agent);
    }
    
    console.log(`   • Agents nécessitant une visite: ${besoinVisite.length}`);
    console.log(`   • Agents à jour: ${agentsPlanifiables.length - besoinVisite.length}`);
    
    // Afficher les priorités
    console.log('\n   Priorités calculées:');
    const avecPriorite = [];
    for (const agent of besoinVisite) {
      const priorite = await planningService.calculerPriorite(agent);
      avecPriorite.push({ ...agent.toJSON(), priorite });
    }
    avecPriorite.sort((a, b) => b.priorite - a.priorite);
    
    avecPriorite.slice(0, 15).forEach((a, i) => {
      console.log(`   ${i+1}. #${a.matricule_agent} - ${a.nom} ${a.prenom} - Priorité: ${a.priorite}`);
    });

    // ========== TEST 3 : Vérifier les plannings existants ==========
    console.log('\n📋 TEST 3: Vérification des plannings existants');
    const semaineActuelle = planningService.getNumeroSemaine(new Date());
    const anneeActuelle = new Date().getFullYear();
    
    const planningsExistants = await Planning.findAll({
      where: { semaine: semaineActuelle, annee: anneeActuelle },
      attributes: ['matricule_agent', 'date_visite', 'heure_visite', 'statut']
    });
    
    console.log(`   • Planning semaine ${semaineActuelle}/${anneeActuelle}: ${planningsExistants.length} visites`);
    
    // Compter par jour
    const parJour = {};
    planningsExistants.forEach(p => {
      parJour[p.date_visite] = (parJour[p.date_visite] || 0) + 1;
    });
    
    console.log('\n   Répartition par jour:');
    Object.entries(parJour).forEach(([date, count]) => {
      console.log(`      ${date}: ${count} visite(s)`);
    });
    
    // Vérifier les doublons par jour
    const doublonsParJour = {};
    planningsExistants.forEach(p => {
      const key = `${p.matricule_agent}|${p.date_visite}`;
      if (!doublonsParJour[key]) doublonsParJour[key] = [];
      doublonsParJour[key].push(p);
    });
    
    const agentsDoublons = Object.entries(doublonsParJour).filter(([_, v]) => v.length > 1);
    if (agentsDoublons.length > 0) {
      console.log('\n   ⚠️ DOUBLONS DÉTECTÉS:');
      agentsDoublons.forEach(([key, visites]) => {
        const [matricule, date] = key.split('|');
        console.log(`      Agent #${matricule} le ${date}: ${visites.length} visites`);
        visites.forEach(v => console.log(`         - ${v.heure_visite} (${v.statut})`));
      });
    } else {
      console.log('\n   ✅ Aucun doublon détecté dans les plannings existants');
    }

    // ========== TEST 4 : Simuler une génération sans sauvegarde ==========
    console.log('\n📋 TEST 4: Simulation de génération (sans sauvegarde)');
    const lundiProchain = new Date();
    lundiProchain.setDate(lundiProchain.getDate() + (8 - lundiProchain.getDay()));
    lundiProchain.setHours(0, 0, 0, 0);
    
    console.log(`   Lundi cible: ${lundiProchain.toISOString().split('T')[0]}`);
    
    const simulation = await planningService.genererPlanningSemaineSimulation(lundiProchain, 1);
    
    if (simulation && simulation.planning) {
      console.log(`   • Simulation: ${simulation.planning.length} visites générées`);
      
      // Vérifier les doublons dans la simulation
      const simulationParJour = {};
      const simulationDoublons = {};
      
      simulation.planning.forEach(p => {
        const key = `${p.matricule_agent}|${p.date_visite}`;
        if (!simulationDoublons[key]) simulationDoublons[key] = [];
        simulationDoublons[key].push(p);
        
        simulationParJour[p.date_visite] = (simulationParJour[p.date_visite] || 0) + 1;
      });
      
      const agentsDoublonsSimu = Object.entries(simulationDoublons).filter(([_, v]) => v.length > 1);
      if (agentsDoublonsSimu.length > 0) {
        console.log('\n   ⚠️ DOUBLONS DANS LA SIMULATION:');
        agentsDoublonsSimu.forEach(([key, visites]) => {
          const [matricule, date] = key.split('|');
          console.log(`      Agent #${matricule} le ${date}: ${visites.length} visites`);
        });
      } else {
        console.log('\n   ✅ Aucun doublon dans la simulation');
      }
      
      // Afficher la répartition par jour
      console.log('\n   Répartition simulation par jour:');
      Object.entries(simulationParJour).forEach(([date, count]) => {
        console.log(`      ${date}: ${count} visite(s)`);
      });
      
      // Afficher les agents planifiés (sans doublons)
      const agentsPlanifies = [...new Set(simulation.planning.map(p => p.matricule_agent))];
      console.log(`\n   • Agents planifiés (uniques): ${agentsPlanifies.length}`);
      console.log(`   • Taux de couverture: ${((agentsPlanifies.length / besoinVisite.length) * 100).toFixed(1)}%`);
    }

  } catch (error) {
    console.error('❌ Erreur test:', error);
  } finally {
    await sequelize.close();
    console.log('\n🔒 Connexion fermée');
  }
}

// Ajouter la méthode de simulation
planningService.genererPlanningSemaineSimulation = async function(dateDebut, userId) {
  try {
    console.log('\n🔧 SIMULATION MODE - Pas de sauvegarde');
    
    const semaine = this.getNumeroSemaine(dateDebut);
    const annee = dateDebut.getFullYear();
    
    const agents = await Agent.findAll({
      where: {
        statut: 'actif',
        [Op.or]: [
          { date_fin_inaptitude: null },
          { date_fin_inaptitude: { [Op.lt]: new Date() } }
        ]
      }
    });
    
    const agentsNecessaires = [];
    for (const agent of agents) {
      if (await this.estVisiteNecessaire(agent)) {
        const priorite = await this.calculerPriorite(agent);
        agentsNecessaires.push({ ...agent.toJSON(), priorite });
      }
    }
    
    agentsNecessaires.sort((a, b) => b.priorite - a.priorite);
    
    const planning = [];
    const agentsPlanifiesSemaine = new Set();
    
    for (const jourOffset of [1, 2, 3, 4]) {
      const jourDate = new Date(dateDebut);
      jourDate.setDate(dateDebut.getDate() + jourOffset);
      const dateStr = jourDate.toISOString().split('T')[0];
      
      if (!(await this.estJourOuvre(jourDate))) continue;
      
      const agentsJour = [];
      const agencesJour = [];
      const postesJour = [];
      
      for (const creneau of this.creneaux) {
        let agentChoisi = null;
        let agentIndex = -1;
        
        for (let i = 0; i < agentsNecessaires.length; i++) {
          const agent = agentsNecessaires[i];
          
          if (agentsPlanifiesSemaine.has(agent.matricule_agent)) continue;
          if (agentsJour.includes(agent.matricule_agent)) continue;
          if (agencesJour.includes(agent.code_agence)) continue;
          if (postesJour.includes(agent.code_affectation)) continue;
          
          agentChoisi = agent;
          agentIndex = i;
          break;
        }
        
        if (agentChoisi) {
          planning.push({
            matricule_agent: agentChoisi.matricule_agent,
            date_visite: dateStr,
            heure_visite: creneau,
            type_visite: 'Périodique',
            statut: 'Programmé',
            priorite: agentChoisi.priorite,
            semaine,
            annee,
            created_by: userId
          });
          
          agentsPlanifiesSemaine.add(agentChoisi.matricule_agent);
          agentsJour.push(agentChoisi.matricule_agent);
          agencesJour.push(agentChoisi.code_agence);
          postesJour.push(agentChoisi.code_affectation);
          agentsNecessaires.splice(agentIndex, 1);
        }
      }
    }
    
    return { planning, agentsRestants: agentsNecessaires.length };
    
  } catch (error) {
    console.error('❌ Erreur simulation:', error);
    throw error;
  }
};

// Exécuter le test
testPlanningService();