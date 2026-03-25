// backend/cron/notificationIntelligenteCron.js
// ============================================================
//  CRON NOTIFICATIONS INTELLIGENTES — SRTB Bizerte
//
//  Déclenchements :
//    • 7h, 12h, 18h  : détection globale de toutes les situations
//    • 9h (Lun-Ven)  : vérification ciblée des convocations
//    • Toutes les 2 min (dev only) : test rapide
// ============================================================

const cron = require('node-cron');
const notificationService = require('../services/notificationIntelligenteService');

// ============================================================
//  CRON PRINCIPAL : 7h, 12h, 18h
//  Détecte et crée toutes les notifications intelligentes :
//    - Visites périodiques bientôt dues / en retard
//    - Visites de reprise urgentes
//    - Reclassements / Embauches approchants (manuels)
//    - Convocations à envoyer
//    - Problèmes planning
// ============================================================
cron.schedule('0 7,12,18 * * *', async () => {
  console.log('\n⏰ ===== CRON NOTIFICATIONS INTELLIGENTES =====');
  console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);

  try {
    const nb = await notificationService.envoyerNotifications();
    console.log(`✅ ${nb} notification(s) créée(s)`);
  } catch (error) {
    console.error('❌ Erreur cron notifications intelligentes:', error);
  }
});

// ============================================================
//  CRON CONVOCATIONS & VISITES MANUELLES : 9h, Lundi–Vendredi
//  Rappel ciblé pour :
//    - Convocations non envoyées (J+7)
//    - Visites Reclassement / Embauche approchantes (J-2)
// ============================================================
cron.schedule('0 9 * * 1-5', async () => {
  console.log('\n📧 [CRON] Vérification convocations + visites manuelles approchantes...');

  try {
    const nb = await notificationService.verifierConvocationsAVenir();
    console.log(`✅ ${nb} notification(s) convocation créée(s)`);
  } catch (error) {
    console.error('❌ Erreur cron convocations:', error);
  }
});

// ============================================================
//  CRON TEST DEV : toutes les 2 minutes
//  Désactivé en production.
// ============================================================
if (process.env.NODE_ENV !== 'production') {
  cron.schedule('*/2 * * * *', async () => {
    console.log('\n🧪 [DEV] Détection des situations...');
    try {
      const situations = await notificationService.detecterToutesSituations();
      console.log(`📊 ${situations.length} situation(s) détectée(s)`);

      if (situations.length > 0) {
        // Grouper par type pour un affichage lisible
        const parType = {};
        situations.forEach(s => {
          const type = s.type || 'INCONNU';
          parType[type] = (parType[type] || 0) + 1;
        });

        Object.entries(parType).forEach(([type, count]) => {
          console.log(`   - [${type}] : ${count}`);
        });

        // Afficher les 5 premières
        situations.slice(0, 5).forEach(s => {
          const emoji =
            s.niveau === 'CRITIQUE' ? '🚨' :
            s.niveau === 'URGENT'   ? '⚠️' :
            s.niveau === 'IMPORTANT'? '📌' : 'ℹ️';
          console.log(`   ${emoji} ${s.titre}`);
        });
      }
    } catch (error) {
      console.error('❌ Erreur test dev:', error);
    }
  });
}

console.log('⏰ Cron notifications intelligentes chargé (7h/12h/18h + 9h Lun-Ven)');