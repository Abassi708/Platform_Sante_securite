// backend/testPlanning.js
require('dotenv').config();
const sequelize = require('./config/database');
const planningService = require('./services/planningService');

async function testPlanning() {
  console.log('\n🧪 TEST PLANNING SERVICE\n');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à MySQL\n');
    
    // Test 1: Calcul de la semaine actuelle
    const aujourdhui = new Date();
    console.log(`📅 Aujourd'hui: ${aujourdhui.toISOString().split('T')[0]}`);
    console.log(`   Semaine ISO calculée: ${planningService.getNumeroSemaine(aujourdhui)}`);
    console.log(`   Lundi de cette semaine: ${planningService.getLundiSemaine(planningService.getNumeroSemaine(aujourdhui), aujourdhui.getFullYear())}`);
    
    // Test 2: Lister les agents prioritaires
    const Agent = require('./models/Agent');
    const agents = await Agent.findAll({ where: { statut: 'actif' } });
    
    console.log('\n👥 AGENTS AVEC BESOIN DE VISITE:');
    for (const agent of agents) {
      const besoin = await planningService.estVisitePeriodiqueNecessaire(agent, 13, 2026);
      if (besoin) {
        const periodicite = planningService.calculerPeriodicite(agent);
        const joursDepuis = agent.date_derniere_visite 
          ? Math.floor((aujourdhui - new Date(agent.date_derniere_visite)) / (1000 * 60 * 60 * 24))
          : 'Jamais';
        console.log(`   ✅ #${agent.matricule_agent} - ${agent.nom} ${agent.prenom} - ${agent.code_affectation === 3 ? 'Chauffeur' : 'Autre'} - Dernière: ${joursDepuis} jours`);
      }
    }
    
    // Test 3: Générer un planning pour la semaine 13
    console.log('\n🚀 GÉNÉRATION PLANNING SEMAINE 13...');
    const lundiSemaine13 = planningService.getLundiSemaine(13, 2026);
    console.log(`   Lundi cible: ${lundiSemaine13}`);
    
    const planning = await planningService.genererPlanningSemaine(new Date(lundiSemaine13), 1);
    console.log(`\n✅ ${planning.length} visites générées`);
    
    if (planning.length > 0) {
      console.log('\n📋 DÉTAIL:');
      planning.forEach(p => {
        console.log(`   ${p.date_visite} ${p.heure_visite} - Agent #${p.matricule_agent} - ${p.type_visite}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await sequelize.close();
  }
}

testPlanning();