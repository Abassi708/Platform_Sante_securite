// backend/cron/autoPlanningCron.js
const cron = require('node-cron');
const planningService = require('../services/planningService');
const autoReaffectationService = require('../services/autoReaffectationService');
const notificationService = require('../services/notificationIntelligenteService');
const db = require('../models');

(async () => {
  console.log('\n🚀 VÉRIFICATION INITIALE DU PLANNING');
  console.log('='.repeat(50));
  
  try {
    const aujourdhui = new Date();
    const semaineActuelle = planningService.getNumeroSemaine(aujourdhui);
    const annee = aujourdhui.getFullYear();
    
    // ✅ CORRECTION : Utiliser db.local.User
    const systemUser = await db.local.User.findOne({ where: { Role: 'admin' } });
    if (!systemUser) {
      console.error('❌ Aucun administrateur trouvé');
      return;
    }
    
    const total = await planningService.verifierEtGenererSemainesManquantes(systemUser.id_utilisateur);
    if (total > 0) console.log(`✅ ${total} visite(s) générée(s) au démarrage`);
    else console.log('✅ Planning déjà à jour');
    
  } catch (error) {
    console.error('❌ Erreur vérification initiale:', error);
  }
})();

cron.schedule('0 6 * * *', async () => {
  console.log('\n' + '='.repeat(60));
  console.log('🔄 CRON QUOTIDIEN - VÉRIFICATION PLANNING');
  console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
  console.log('='.repeat(60));
  
  try {
    // ✅ CORRECTION : Utiliser db.local.User
    const systemUser = await db.local.User.findOne({ where: { Role: 'admin' } });
    if (!systemUser) {
      console.error('❌ Aucun administrateur trouvé');
      return;
    }
    
    console.log('\n📍 ÉTAPE 1: Auto-réaffectation (indisponibilités)');
    const reaffectees = await autoReaffectationService.verifierEtReaffecter();
    
    console.log('\n📍 ÉTAPE 2: Auto-report des retards');
    const reprogrammees = await autoReaffectationService.verifierEtReprogrammerRetards();
    
    console.log('\n📍 ÉTAPE 3: Vérification des semaines manquantes');
    const total = await planningService.verifierEtGenererSemainesManquantes(systemUser.id_utilisateur);
    
    console.log('\n📍 ÉTAPE 4: Notifications intelligentes');
    const nbNotifs = await notificationService.envoyerNotifications();
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(60));
    console.log(`   • Réaffectations: ${reaffectees}`);
    console.log(`   • Reports auto: ${reprogrammees}`);
    console.log(`   • Nouvelles visites: ${total}`);
    console.log(`   • Notifications: ${nbNotifs}`);
    console.log('='.repeat(60));
    console.log('✅ CRON QUOTIDIEN TERMINÉ\n');
    
  } catch (error) {
    console.error('❌ Erreur cron quotidien:', error);
  }
});

cron.schedule('0 22 * * 0', async () => {
  console.log('\n📅 CRON HEBDOMADAIRE - Génération planning semaine suivante');
  console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);
  
  try {
    // ✅ CORRECTION : Utiliser db.local.User
    const systemUser = await db.local.User.findOne({ where: { Role: 'admin' } });
    if (!systemUser) {
      console.error('❌ Aucun administrateur trouvé');
      return;
    }
    
    const aujourdhui = new Date();
    const semaineProchaine = planningService.getNumeroSemaine(aujourdhui) + 1;
    const annee = aujourdhui.getFullYear();
    
    const lundiProchain = planningService.getLundiSemaine(semaineProchaine, annee);
    console.log(`📅 Lundi semaine ${semaineProchaine}/${annee}: ${lundiProchain}`);
    
    const Planning = db.local.Planning;
    const existant = await Planning.findOne({ where: { semaine: semaineProchaine, annee } });
    
    if (!existant) {
      const planning = await planningService.genererPlanningSemaine(new Date(lundiProchain), systemUser.id_utilisateur);
      console.log(`✅ ${planning.length} visite(s) générée(s) pour la semaine du ${lundiProchain}`);
    } else {
      console.log(`ℹ️ Planning semaine ${semaineProchaine}/${annee} déjà existant`);
    }
    
  } catch (error) {
    console.error('❌ Erreur cron hebdomadaire:', error);
  }
});

console.log('⏰ CRON AUTO-PLANNING CHARGÉ (quotidien 6h + hebdomadaire dimanche 22h)');