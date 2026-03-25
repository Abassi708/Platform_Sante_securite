// backend/testConnection.js
const { sequelizeGlobal, sequelizeLocal } = require('./config/database');
require('dotenv').config();

async function testConnectionsComplete() {
  console.log('\n🔌 TEST DE CONNEXION AUX BASES DE DONNÉES DISTANTES');
  console.log('='.repeat(70));
  console.log(`📡 Serveur: ${process.env.DB_GLOBAL_HOST}:${process.env.DB_GLOBAL_PORT}`);
  console.log('='.repeat(70));
  
  try {
    // Tester la base GLOBALE
    console.log('\n📁 Base GLOBALE (agent, agence, affectation):');
    console.log(`   📍 ${process.env.DB_GLOBAL_HOST}:${process.env.DB_GLOBAL_PORT}/${process.env.DB_GLOBAL_NAME}`);
    await sequelizeGlobal.authenticate();
    console.log('   ✅ Connexion réussie');
    
    // Compter les agents
    const [agents] = await sequelizeGlobal.query('SELECT COUNT(*) as total FROM agent');
    console.log(`   📊 Nombre d\'agents: ${agents[0].total}`);
    
    // Afficher les premiers agents
    const [agentsList] = await sequelizeGlobal.query('SELECT matricule_agent, nom, prenom FROM agent LIMIT 5');
    if (agentsList.length > 0) {
      console.log('   📋 Premiers agents:');
      agentsList.forEach(a => {
        console.log(`      - #${a.matricule_agent}: ${a.nom} ${a.prenom}`);
      });
    } else {
      console.log('   ⚠️ Aucun agent trouvé');
    }
    
    // Tester la base LOCALE
    console.log('\n📁 Base LOCALE (accident, planning, visite):');
    console.log(`   📍 ${process.env.DB_LOCAL_HOST}:${process.env.DB_LOCAL_PORT}/${process.env.DB_LOCAL_NAME}`);
    await sequelizeLocal.authenticate();
    console.log('   ✅ Connexion réussie');
    
    // Compter les plannings
    const [plannings] = await sequelizeLocal.query('SELECT COUNT(*) as total FROM planning');
    console.log(`   📊 Nombre de plannings: ${plannings[0].total}`);
    
    // Compter les visites
    const [visites] = await sequelizeLocal.query('SELECT COUNT(*) as total FROM visite');
    console.log(`   📊 Nombre de visites: ${visites[0].total}`);
    
    // Compter les utilisateurs
    const [users] = await sequelizeLocal.query('SELECT COUNT(*) as total FROM utilisateur');
    console.log(`   📊 Nombre d\'utilisateurs: ${users[0].total}`);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ TOUTES LES CONNEXIONS SONT OPÉRATIONNELLES');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('\n❌ Erreur de connexion:', error.message);
    console.log('\n💡 Solutions possibles:');
    console.log('   1. Vérifiez que le serveur est accessible: ping ' + process.env.DB_GLOBAL_HOST);
    console.log('   2. Vérifiez le port: telnet ' + process.env.DB_GLOBAL_HOST + ' ' + process.env.DB_GLOBAL_PORT);
    console.log('   3. Vérifiez les identifiants dans le fichier .env');
    console.log('   4. Assurez-vous que MySQL accepte les connexions distantes');
    process.exit(1);
  }
  
  process.exit(0);
}

testConnectionsComplete();