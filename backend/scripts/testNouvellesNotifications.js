// backend/scripts/testNouvellesNotifications.js
require('dotenv').config();
const sequelize = require('../config/database');

async function testNouvellesNotifications() {
  console.log('\n🚀 TEST DES NOUVELLES NOTIFICATIONS INTELLIGENTES (TABLE DÉDIÉE)\n');
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données\n');
    
    // Charger les modèles
    require('../models');
    console.log('✅ Modèles chargés\n');
    
    const notificationIntelligente = require('../services/notificationIntelligenteService');
    
    console.log('🔍 ÉTAPE 1: Détection et envoi...\n');
    
    // ✅ Utilise la bonne fonction
    const situations = await notificationIntelligente.detecterToutesSituations();
    console.log(`📊 ${situations.length} situations détectées`);
    
    const nbEnvoyees = await notificationIntelligente.envoyerNotifications();
    
    console.log(`\n✅ ${nbEnvoyees} notifications envoyées dans la table notifications_intelligentes`);
    
    // Vérifier en base
    const NotificationIntelligente = require('../models/NotificationIntelligente');
    const total = await NotificationIntelligente.count();
    const nonLues = await NotificationIntelligente.count({ where: { statut: 'non_lu' } });
    
    console.log(`\n📊 STATISTIQUES DE LA TABLE :`);
    console.log(`   • Total notifications : ${total}`);
    console.log(`   • Non lues : ${nonLues}`);
    console.log(`   • Lues : ${total - nonLues}`);
    
    // Afficher les 5 dernières
    const dernieres = await NotificationIntelligente.findAll({
      order: [['created_at', 'DESC']],
      limit: 5
    });
    
    if (dernieres.length > 0) {
      console.log(`\n📋 DERNIÈRES NOTIFICATIONS :`);
      dernieres.forEach((n, i) => {
        console.log(`   ${i+1}. [${n.type}] ${n.titre} → ${n.role_utilisateur} ${n.email_utilisateur}`);
      });
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    process.exit(1);
  }
}

testNouvellesNotifications();