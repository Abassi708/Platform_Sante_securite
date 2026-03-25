// backend/scripts/generatePlanning.js
const path = require('path');
// Utiliser des chemins relatifs corrects
const sequelize = require('../config/database');
const planningService = require('../services/planningService');
const User = require('../models/User');

async function generatePlanning() {
  try {
    console.log('🚀 Génération manuelle du planning...');
    
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données');

    const admin = await User.findOne({ where: { Role: 'admin' } });
    if (!admin) {
      console.error('❌ Aucun administrateur trouvé');
      process.exit(1);
    }

    const aujourdhui = new Date();
    const joursJusquaLundi = (aujourdhui.getDay() === 0 ? 1 : 8 - aujourdhui.getDay());
    const debutSemaine = new Date(aujourdhui);
    debutSemaine.setDate(aujourdhui.getDate() + joursJusquaLundi);
    
    console.log(`📆 Génération pour semaine du ${debutSemaine.toISOString().split('T')[0]}`);
    
    const planning = await planningService.genererPlanningSemaine(
      debutSemaine,
      admin.id_utilisateur
    );
    
    console.log(`\n✅ Planning généré avec ${planning.length} visites !`);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

generatePlanning();