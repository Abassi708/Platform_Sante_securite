// backend/scripts/fixPlanningDates.js
require('dotenv').config();
const { sequelizeLocal } = require('../config/database');
const planningService = require('../services/planningService');

async function fixPlanningDates() {
  console.log('\n🔧 CORRECTION DES DATES DE PLANNING\n');
  
  try {
    await sequelizeLocal.authenticate();
    console.log('✅ Connecté à la base de données\n');
    
    // Récupérer tous les plannings programmés
    const [plannings] = await sequelizeLocal.query(`
      SELECT id_planning, date_visite, heure_visite, type_visite, statut
      FROM planning
      WHERE statut = 'Programmé'
    `);
    
    console.log(`📊 ${plannings.length} planning(s) à vérifier\n`);
    
    let corriges = 0;
    let supprimes = 0;
    
    for (const planning of plannings) {
      const dateObj = new Date(planning.date_visite);
      const jourSemaine = dateObj.getDay();
      const estValide = await planningService.estJourOuvre(dateObj);
      
      // Lundi (1), Samedi (6), Dimanche (0) ou jour férié
      if (!estValide) {
        console.log(`⚠️ Planning #${planning.id_planning}: ${planning.date_visite} (${planningService._getNomJour(jourSemaine)}) - INVALIDE`);
        
        // Trouver le prochain jour valide
        const prochainValide = await planningService.getProchainJourOuvre(dateObj);
        
        if (prochainValide) {
          const nouvelleDate = prochainValide.toISOString().split('T')[0];
          console.log(`   → Reprogrammation au ${nouvelleDate}`);
          
          await sequelizeLocal.query(`
            UPDATE planning 
            SET date_visite = ?, 
                reprogrammee = 1,
                motif_reprogrammation = 'Correction automatique: jour non ouvrable'
            WHERE id_planning = ?
          `, { replacements: [nouvelleDate, planning.id_planning] });
          
          corriges++;
        } else {
          console.log(`   → Suppression (aucun jour valide trouvé)`);
          await sequelizeLocal.query(`DELETE FROM planning WHERE id_planning = ?`, {
            replacements: [planning.id_planning]
          });
          supprimes++;
        }
      } else {
        console.log(`✅ Planning #${planning.id_planning}: ${planning.date_visite} - VALIDE`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(50));
    console.log(`✅ Plannings valides conservés: ${plannings.length - corriges - supprimes}`);
    console.log(`🔄 Plannings corrigés: ${corriges}`);
    console.log(`🗑️ Plannings supprimés: ${supprimes}`);
    console.log('='.repeat(50));
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Ajouter la méthode _getNomJour si nécessaire
planningService._getNomJour = function(jourSemaine) {
  const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return jours[jourSemaine];
};

fixPlanningDates();