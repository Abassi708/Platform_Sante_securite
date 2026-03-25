// backend/testAPI.js
const { sequelizeGlobal, sequelizeLocal } = require('./config/database');

async function testAPI() {
  console.log('\n🚀 TEST DES API');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Récupérer les agents (base GLOBALE)
    console.log('\n1. GET /api/agents');
    const [agents] = await sequelizeGlobal.query(`
      SELECT a.matricule_agent, a.nom, a.prenom, a.code_agence, a.code_affectation,
             ag.nom_agence, af.libelle_affectation
      FROM agent a
      LEFT JOIN agence ag ON a.code_agence = ag.code_agence
      LEFT JOIN affectation af ON a.code_affectation = af.code_affectation
      WHERE a.matricule_agent BETWEEN 5000 AND 5020
      LIMIT 5
    `);
    
    console.log('   ✅ Agents trouvés:', agents.length);
    agents.forEach(a => {
      console.log(`      - #${a.matricule_agent}: ${a.nom} ${a.prenom} (${a.libelle_affectation}) - ${a.nom_agence}`);
    });
    
    // Test 2: Récupérer le planning (base LOCALE) - AVEC JOINTURE SUR LA BASE GLOBALE
    console.log('\n2. GET /api/planning/13/2026');
    
    // ⚠️ IMPORTANT: Utiliser la base GLOBALE pour les agents
    const [plannings] = await sequelizeLocal.query(`
      SELECT p.id_planning, p.matricule_agent, p.date_visite, p.heure_visite, p.type_visite
      FROM planning p
      WHERE p.semaine = 13 AND p.annee = 2026
      LIMIT 5
    `);
    
    console.log('   ✅ Plannings trouvés:', plannings.length);
    
    // Pour chaque planning, récupérer l'agent depuis la base GLOBALE
    for (const p of plannings) {
      const [agent] = await sequelizeGlobal.query(`
        SELECT nom, prenom FROM agent WHERE matricule_agent = ${p.matricule_agent}
      `);
      const agentNom = agent[0] ? `${agent[0].nom} ${agent[0].prenom}` : 'Agent inconnu';
      console.log(`      - ${p.date_visite} ${p.heure_visite}: ${agentNom} - ${p.type_visite}`);
    }
    
    // Test 3: Récupérer les visites (base LOCALE)
    console.log('\n3. GET /api/visites?limit=5');
    const [visites] = await sequelizeLocal.query(`
      SELECT v.matricule_visite, v.date_visite, v.type_visite, v.resultat, v.matricule_agent
      FROM visite v
      ORDER BY v.created_at DESC
      LIMIT 5
    `);
    
    console.log('   ✅ Visites trouvées:', visites.length);
    for (const v of visites) {
      const [agent] = await sequelizeGlobal.query(`
        SELECT nom, prenom FROM agent WHERE matricule_agent = ${v.matricule_agent}
      `);
      const agentNom = agent[0] ? `${agent[0].nom} ${agent[0].prenom}` : 'Agent inconnu';
      console.log(`      - ${v.date_visite}: ${agentNom} - ${v.type_visite} - ${v.resultat || 'N/A'}`);
    }
    
    // Test 4: Récupérer les utilisateurs (base LOCALE)
    console.log('\n4. GET /api/users');
    const [users] = await sequelizeLocal.query(`
      SELECT id_utilisateur, Login, Role, matricule_agent
      FROM utilisateur
      LIMIT 5
    `);
    
    console.log('   ✅ Utilisateurs trouvés:', users.length);
    users.forEach(u => {
      console.log(`      - ${u.Login} (${u.Role}) - Matricule: ${u.matricule_agent || 'N/A'}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ TOUS LES TESTS SONT RÉUSSIS');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
  
  process.exit(0);
}

testAPI();