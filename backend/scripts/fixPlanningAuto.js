// backend/scripts/fixPlanningAuto.js
require('dotenv').config();
const sequelize = require('../config/database');
const Agent = require('../models/Agent');
const Planning = require('../models/Planning');
const planningService = require('../services/planningService');

async function fixPlanningAuto() {
  console.log('\n🔧 CORRECTION PLANIFICATION AUTOMATIQUE\n');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté\n');
    
    // 1. Mettre à jour les périodicités
    console.log('📝 Mise à jour des périodicités...');
    const agents = await Agent.findAll({ where: { statut: 'actif' } });
    
    for (const agent of agents) {
      const periodicite = agent.code_affectation === 3 ? 180 : 365;
      await agent.update({ periodicite_jours: periodicite });
    }
    console.log(`   ✅ ${agents.length} agents mis à jour`);
    
    // 2. Vérifier les agents qui ont besoin de visite
    console.log('\n🔍 Détection des agents en retard...');
    const besoins = [];
    
    for (const agent of agents) {
      const besoin = await planningService.estVisiteNecessaire(agent);
      if (besoin) {
        besoins.push(agent);
        console.log(`   ⚠️ #${agent.matricule_agent} - ${agent.nom} ${agent.prenom} - ${agent.code_affectation === 3 ? 'Chauffeur (6 mois)' : 'Autre (1 an)'}`);
      }
    }
    
    console.log(`\n📊 ${besoins.length}/${agents.length} agents nécessitent une visite`);
    
    // 3. Supprimer les plannings obsolètes
    if (besoins.length > 0) {
      console.log('\n🗑️ Suppression des plannings obsolètes...');
      const deleted = await Planning.destroy({ where: {} });
      console.log(`   ✅ ${deleted} anciens plannings supprimés`);
      
      // 4. Générer le planning
      console.log('\n📅 Génération automatique du planning...');
      const lundiProchain = new Date();
      lundiProchain.setDate(lundiProchain.getDate() + (8 - lundiProchain.getDay()));
      lundiProchain.setHours(0, 0, 0, 0);
      
      const planning = await planningService.genererPlanningSemaine(lundiProchain, 1);
      
      if (planning && planning.length > 0) {
        console.log(`\n✅ PLANNING GÉNÉRÉ AVEC ${planning.length} VISITES !\n`);
        console.log('📋 Détail:');
        for (const v of planning) {
          const agent = agents.find(a => a.matricule_agent === v.matricule_agent);
          console.log(`   ${v.date_visite} ${v.heure_visite} - ${agent?.nom} ${agent?.prenom} (${agent?.code_affectation === 3 ? 'Chauffeur' : 'Autre'})`);
        }
      } else {
        console.log('\n⚠️ Aucune visite générée (contraintes trop strictes)');
      }
    } else {
      console.log('\n✅ Tous les agents sont à jour, aucun planning nécessaire');
    }
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await sequelize.close();
  }
}

fixPlanningAuto();