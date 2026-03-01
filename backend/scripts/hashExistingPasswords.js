// script/hashExistingPasswords.js
const sequelize = require('../config/database');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');

async function hashExistingPasswords() {
  try {
    const notifications = await Notification.findAll();
    
    for (const notif of notifications) {
      // Récupérer le mot de passe en clair
      const plainPassword = notif.new_password;
      
      // Le hasher
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(plainPassword, salt);
      
      // Mettre à jour
      await notif.update({ new_password: hashedPassword });
      
      console.log(`✅ Notification ${notif.id} hashée`);
    }
    
    console.log('🎉 Tous les mots de passe ont été hashés');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

hashExistingPasswords();