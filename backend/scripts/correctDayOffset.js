// backend/scripts/correctDayOffset.js
require('dotenv').config();
const { sequelizeLocal } = require('../config/database');

async function correctDayOffset() {
  console.log('\n🔧 CORRECTION DU DÉCALAGE DES JOURS (+1 jour)\n');
  
  try {
    // Correction : ajouter 1 jour à toutes les dates
    await sequelizeLocal.query(`
      UPDATE planning 
      SET date_visite = DATE_ADD(date_visite, INTERVAL 1 DAY)
      WHERE statut = 'Programmé'
    `);
    
    console.log('✅ Toutes les dates ont été décalées de +1 jour\n');
    
    // Vérification
    const [verif] = await sequelizeLocal.query(`
      SELECT date_visite, DAYNAME(date_visite) as jour
      FROM planning
      WHERE date_visite >= CURDATE()
      ORDER BY date_visite
      LIMIT 10
    `);
    
    console.log('📅 NOUVELLES DATES:');
    verif.forEach(v => console.log(`   ${v.date_visite} (${v.jour})`));
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

correctDayOffset();