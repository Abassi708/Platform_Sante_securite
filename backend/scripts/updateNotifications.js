// scripts/updateNotifications.js
const sequelize = require('../config/database');
const Notification = require('../models/Notification');

async function updateNotifications() {
  try {
    console.log('🔄 Mise à jour des notifications...');
    
    const notifications = await Notification.findAll();
    console.log(`📊 ${notifications.length} notification(s) trouvée(s)\n`);
    
    if (notifications.length === 0) {
      console.log('ℹ️ Aucune notification à traiter');
      process.exit(0);
    }
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const notif of notifications) {
      try {
        // Déterminer le mot de passe en clair basé sur l'email
        let plainPassword = 'Contactez l\'administrateur';
        
        // Vous pouvez ajouter des cas spécifiques ici si vous connaissez les mots de passe
        if (notif.email_utilisateur === 'mohamed@gmail.com') {
          plainPassword = 'mohamed00';
        } else if (notif.email_utilisateur === 'social@strb.tn') {
          plainPassword = 'socialsocial';
        } else if (notif.email_utilisateur === 'kawthrr121@gmail.com') {
          plainPassword = 'kawther123';
        } else if (notif.email_utilisateur === 'agent@srtb.tn') {
          plainPassword = 'agent123';
        }
        
        // Mettre à jour avec les nouveaux noms de champs
        await notif.update({ 
          mot_passe: plainPassword,  // ← Nouveau nom pour le mot de passe en clair
          statut: 'envoyé'            // ← Optionnel : mettre à jour le statut aussi
        });
        
        console.log(`✅ Notification ${notif.id} (${notif.email_utilisateur}) mise à jour`);
        successCount++;
        
      } catch (err) {
        console.error(`❌ Erreur pour la notification ${notif.id}:`, err.message);
        errorCount++;
      }
    }
    
    // Résumé
    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSUMÉ DU TRAITEMENT');
    console.log('='.repeat(50));
    console.log(`✅ Succès : ${successCount} notification(s)`);
    console.log(`❌ Erreurs : ${errorCount} notification(s)`);
    console.log('='.repeat(50));
    
    console.log('🎉 Mise à jour terminée !');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

updateNotifications();