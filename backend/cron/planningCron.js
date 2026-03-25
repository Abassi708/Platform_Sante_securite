// backend/cron/planningCron.js
const cron = require('node-cron');
const planningService = require('../services/planningService');
const joursFeriesService = require('../services/joursFeriesService');
const db = require('../models');

// Précharger les jours fériés au démarrage
joursFeriesService.prechargerAnnees();

cron.schedule('0 23 * * 0', async () => {
  console.log('\n🔄 ===== GÉNÉRATION AUTOMATIQUE DU PLANNING =====');
  console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);

  try {
    // ✅ CORRECTION : Utiliser db.local.User
    const systemUser = await db.local.User.findOne({ where: { Role: 'admin' } });
    if (!systemUser) {
      console.error('❌ Aucun administrateur trouvé');
      return;
    }

    const aujourdhui = new Date();

    const jourActuel = aujourdhui.getDay();
    const joursJusquaLundi = jourActuel === 0 ? 1 : 8 - jourActuel;
    const lundiProchain = new Date(aujourdhui);
    lundiProchain.setDate(aujourdhui.getDate() + joursJusquaLundi);
    lundiProchain.setHours(0, 0, 0, 0);

    const annee = lundiProchain.getFullYear();
    const semaine = planningService.getNumeroSemaine(lundiProchain);

    console.log(`📆 Génération pour semaine ${semaine}/${annee} (lundi: ${lundiProchain.toISOString().split('T')[0]})`);

    const Planning = db.local.Planning;
    const existant = await Planning.findOne({ where: { semaine, annee } });
    if (existant) {
      console.log(`ℹ️ Planning semaine ${semaine}/${annee} déjà existant`);
      return;
    }

    const planning = await planningService.genererPlanningSemaine(lundiProchain, systemUser.id_utilisateur);

    console.log(`✅ Planning semaine ${semaine}/${annee} : ${planning.length} visite(s) générée(s)`);

  } catch (error) {
    console.error('❌ Erreur génération automatique:', error);
  }
});

cron.schedule('0 0 1 1 *', async () => {
  console.log('📅 Préchargement des jours fériés pour la nouvelle année...');
  await joursFeriesService.prechargerAnnees();
});

console.log('⏰ Cron planning activé (génération automatique chaque dimanche à 23h)');