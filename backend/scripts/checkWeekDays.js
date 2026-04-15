// backend/scripts/checkWeekDays.js
require('dotenv').config();
const { sequelizeLocal } = require('../config/database');
const planningService = require('../services/planningService');

async function checkWeekDays() {
  console.log('\n📅 VÉRIFICATION DES JOURS DE PLANNING\n');
  
  const [plannings] = await sequelizeLocal.query(`
    SELECT id_planning, date_visite, type_visite, statut
    FROM planning
    WHERE statut = 'Programmé' AND date_visite >= CURDATE()
    ORDER BY date_visite
  `);
  
  console.log(`📊 ${plannings.length} planning(s) à venir\n`);
  
  let erreurs = 0;
  
  for (const p of plannings) {
    const date = new Date(p.date_visite);
    const jour = date.getDay();
    const jourNom = planningService._getNomJour(jour);
    const estValide = await planningService.estJourOuvre(date);
    
    const status = estValide ? '✅' : '❌';
    console.log(`${status} ${p.date_visite} (${jourNom}) - ${p.type_visite}`);
    if (!estValide) erreurs++;
  }
  
  console.log(`\n${erreurs === 0 ? '✅' : '❌'} ${erreurs} erreur(s) détectée(s)`);
  process.exit(0);
}

planningService._getNomJour = function(jourSemaine) {
  const jours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return jours[jourSemaine];
};

checkWeekDays();