// backend/cron/planningCron.js
const cron = require('node-cron');
const planningService = require('../services/planningService');
const Planning = require('../models/Planning');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Planifier pour chaque dimanche à 23h
cron.schedule('0 23 * * 0', async () => {
  console.log('🔄 Génération automatique du planning hebdomadaire...');
  
  try {
    // Récupérer un utilisateur système (admin)
    const systemUser = await User.findOne({ where: { Role: 'admin' } });
    if (!systemUser) {
      console.error('❌ Aucun administrateur trouvé');
      return;
    }
    
    // Date de début de la semaine prochaine (lundi)
    const aujourdhui = new Date();
    const joursJusquaLundi = (aujourdhui.getDay() === 0 ? 1 : 8 - aujourdhui.getDay());
    const debutSemaine = new Date(aujourdhui);
    debutSemaine.setDate(aujourdhui.getDate() + joursJusquaLundi);
    
    // Vérifier si un planning existe déjà pour cette semaine
    const annee = debutSemaine.getFullYear();
    const semaine = planningService.getNumeroSemaine(debutSemaine);
    
    const existant = await Planning.findOne({
      where: { semaine, annee }
    });
    
    if (existant) {
      console.log(`ℹ️ Planning semaine ${semaine}/${annee} déjà existant`);
      return;
    }
    
    // Générer le planning
    const planning = await planningService.genererPlanningSemaine(debutSemaine, systemUser.id_utilisateur);
    
    // Créer une notification pour le GRH
    if (planning.length > 0) {
      await Notification.create({
        id_utilisateur: systemUser.id_utilisateur,
        email_utilisateur: systemUser.Login,
        role_utilisateur: 'admin',
        raison: `Planning de la semaine ${semaine} généré automatiquement avec ${planning.length} visites`,
        envoyer_par_email: 'Système',
        statut: 'envoyé'
      });
      
      console.log(`✅ Planning semaine ${semaine} généré avec ${planning.length} visites`);
    }
    
  } catch (error) {
    console.error('❌ Erreur génération automatique:', error);
  }
});

console.log('⏰ Cron job pour planning hebdomadaire activé');