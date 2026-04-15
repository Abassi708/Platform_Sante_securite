// backend/scripts/createUser.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelizeLocal } = require('../config/database'); // Base locale pour les utilisateurs

async function createUser() {
  try {
    await sequelizeLocal.authenticate();
    console.log('✅ Connecté à la base LOCALE\n');

    const salt = await bcrypt.genSalt(10);
    
    const users = [
      { email: 'admin@srtb.tn', password: 'admin123', role: 'admin', matricule: null },
      { email: 'social@srtb.tn', password: 'social123', role: 'social', matricule: null },
      { email: 'technicien@srtb.tn', password: 'technicien123', role: 'technicien', matricule: null }
    ];
    
    let created = 0;
    let skipped = 0;

    for (const user of users) {
      const [existing] = await sequelizeLocal.query(
        'SELECT * FROM utilisateur WHERE Login = ?',
        { replacements: [user.email] }
      );
      
      if (existing.length > 0) {
        console.log(`⚠️ L'utilisateur ${user.email} existe déjà`);
        skipped++;
        continue;
      }
      
      const hashedPassword = await bcrypt.hash(user.password, salt);
      
      await sequelizeLocal.query(
        `INSERT INTO utilisateur (Login, Mot_de_passe, Role, matricule_agent, nombre_connexions, date_creation) 
         VALUES (?, ?, ?, ?, 0, NOW())`,
        { replacements: [user.email, hashedPassword, user.role, user.matricule] }
      );
      
      console.log(`✅ Utilisateur créé: ${user.email} (${user.role}) - Mot de passe: ${user.password}`);
      created++;
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(50));
    console.log(`✅ Créés: ${created}`);
    console.log(`⚠️ Existants: ${skipped}`);
    console.log('='.repeat(50));
    console.log('\n🎉 Création terminée !');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

createUser();