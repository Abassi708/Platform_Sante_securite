// backend/scripts/initPlanningAuto.js
require('dotenv').config();
const sequelize = require('../config/database');
const planningService = require('../services/planningService');
const User = require('../models/User');

async function initPlanningAuto() {
  console.log('\n🚀 INITIALISATION AUTOMATIQUE DU PLANNING');
  console.log('='.repeat(60));
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à MySQL\n');
    
    const admin = await User.findOne({ where: { Role: 'admin' } });
    if (!admin) {
      console.error('❌ Aucun administrateur trouvé');
      process.exit(1);
    }
    
    console.log(`👤 Utilisateur: ${admin.Login} (ID: ${admin.id_utilisateur})`);
    
    const total = await planningService.verifierEtGenererSemainesManquantes(admin.id_utilisateur);
    
    console.log('\n' + '='.repeat(60));
    console.log(`✅ INITIALISATION TERMINÉE - ${total} visites générées`);
    console.log('='.repeat(60));
    
    const Planning = require('../models/Planning');
    const plannings = await Planning.findAll({
      attributes: ['semaine', 'annee', [Planning.sequelize.fn('COUNT', '*'), 'nb']],
      group: ['semaine', 'annee'],
      order: [['annee', 'DESC'], ['semaine', 'DESC']]
    });
    
    console.log('\n📋 PLANNINGS EXISTANTS:');
    plannings.forEach(p => {
      console.log(`   Semaine ${p.semaine}/${p.annee}: ${p.dataValues.nb} visites`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

initPlanningAuto();