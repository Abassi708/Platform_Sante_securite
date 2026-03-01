// scripts/updateNotifications.js
const sequelize = require('../config/database');
const Notification = require('../models/Notification');

async function updateNotifications() {
  try {
    console.log('🔄 Mise à jour des notifications...');
    
    const notifications = await Notification.findAll();
    
    for (const notif of notifications) {
      // Pour les anciennes notifications, on ne peut pas récupérer le mot de passe en clair
      // On met un message par défaut
      await notif.update({ 
        plain_password: 'Contactez l\'administrateur' 
      });
      
      console.log(`✅ Notification ${notif.id} mise à jour`);
    }
    
    console.log('🎉 Mise à jour terminée !');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

updateNotifications();