// scripts/hashExistingPasswords.js
const sequelize = require('../config/database');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');

async function hashExistingPasswords() {
  console.log('🚀 Début du hashage des mots de passe...\n');
  
  try {
    // Vérifier la connexion à la base de données
    await sequelize.authenticate();
    console.log('✅ Connexion à la base de données établie\n');
    
    // Récupérer toutes les notifications
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
        // Récupérer le mot de passe en clair (maintenant dans 'mot_passe')
        const plainPassword = notif.mot_passe;
        
        // Vérifier si 'nouveau_motpasse' est déjà un hash (optionnel)
        if (notif.nouveau_motpasse && 
            notif.nouveau_motpasse.length === 60 && 
            notif.nouveau_motpasse.startsWith('$2a$')) {
          console.log(`⏭️ Notification ${notif.id} déjà hashée, ignorée`);
          continue;
        }
        
        // Hasher le mot de passe
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(plainPassword, salt);
        
        // Mettre à jour avec les nouveaux noms de champs
        await notif.update({ 
          nouveau_motpasse: hashedPassword,  // ← Nouveau nom
          mot_passe: plainPassword            // ← Garder le clair
        });
        
        console.log(`✅ Notification ${notif.id} (${notif.email_utilisateur}) hashée avec succès`);
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
    console.log(`📊 Total : ${notifications.length} notification(s)`);
    console.log('='.repeat(50));
    
    if (errorCount === 0) {
      console.log('🎉 Tous les mots de passe ont été hashés avec succès !');
    } else {
      console.log('⚠️ Certaines notifications ont échoué, vérifiez les erreurs ci-dessus');
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

// Exécuter le script
hashExistingPasswords();