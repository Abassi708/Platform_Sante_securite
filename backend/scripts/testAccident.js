// scripts/testAccident.js
const sequelize = require('../config/database');
const Accident = require('../models/Accident');
const Agent = require('../models/Agent');
const Planning = require('../models/Planning');
const planningService = require('../services/planningService');

async function testAccident() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté\n');
    
    // 1. Récupérer l'agent
    const agent = await Agent.findByPk(1001);
    console.log('👤 Agent:', agent.nom, agent.prenom);
    
    // 2. Simuler un accident
    const dateAccident = new Date('2026-03-12');
    const jourArret = 45;
    const dateFinArret = new Date(dateAccident);
    dateFinArret.setDate(dateFinArret.getDate() + jourArret);
    
    console.log(`\n📋 Simulation accident:`);
    console.log(`   Date accident: ${dateAccident.toISOString().split('T')[0]}`);
    console.log(`   Jours arrêt: ${jourArret}`);
    console.log(`   Fin arrêt: ${dateFinArret.toISOString().split('T')[0]}`);
    
    // 3. Mettre à jour l'agent
    await agent.update({
      date_debut_inaptitude: dateAccident.toISOString().split('T')[0],
      date_fin_inaptitude: dateFinArret.toISOString().split('T')[0]
    });
    console.log(`\n✅ Agent mis à jour`);
    
    // 4. Créer la visite de reprise
    const dateVisite = new Date(dateFinArret);
    dateVisite.setDate(dateVisite.getDate() + 3);
    const dateVisiteStr = dateVisite.toISOString().split('T')[0];
    const typeVisite = jourArret > 30 ? 'Reclassement' : 'Reprise';
    
    const planning = await Planning.create({
      matricule_agent: agent.matricule_agent,
      date_visite: dateVisiteStr,
      heure_visite: '09:00:00',
      type_visite: typeVisite,
      statut: 'Programmé',
      priorite: 150,
      semaine: planningService.getNumeroSemaine(dateVisite),
      annee: dateVisite.getFullYear(),
      created_by: 13,
      motif_reprogrammation: `Test: Visite ${typeVisite} post-accident`
    });
    
    console.log(`\n✅ Visite créée: ${dateVisiteStr} (${typeVisite})`);
    
    // 5. Vérifier
    const agentFinal = await Agent.findByPk(1001);
    console.log(`\n📊 RÉSULTAT FINAL:`);
    console.log(`   date_debut_inaptitude: ${agentFinal.date_debut_inaptitude}`);
    console.log(`   date_fin_inaptitude: ${agentFinal.date_fin_inaptitude}`);
    
    const planningFinal = await Planning.findOne({
      where: { matricule_agent: 1001, type_visite: typeVisite },
      order: [['id_planning', 'DESC']]
    });
    console.log(`   Visite: ${planningFinal?.date_visite} - ${planningFinal?.type_visite}`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

testAccident();