// backend/scripts/generatePlanning.js
const sequelize = require('../config/database');
const { Planning, Agent } = require('../models');

async function generatePlanning() {
  try {
    console.log('🚀 Génération manuelle du planning...');
    
    await sequelize.authenticate();
    console.log('✅ Connecté à la base de données');

    // Récupérer les agents
    let agents = await Agent.findAll({ where: { statut: 'actif' } });
    
    // Si aucun agent, en créer
    if (agents.length === 0) {
      console.log('📝 Création d\'agents de test...');
      const testAgents = [
        { matricule_agent: 1001, nom: 'Ben Ali', prenom: 'Mohamed', code_agence: 1, code_affectation: 3, statut: 'actif' },
        { matricule_agent: 1002, nom: 'Trabelsi', prenom: 'Fatma', code_agence: 1, code_affectation: 5, statut: 'actif' },
        { matricule_agent: 1003, nom: 'Jaziri', prenom: 'Ahmed', code_agence: 2, code_affectation: 3, statut: 'actif' },
        { matricule_agent: 1004, nom: 'Mansour', prenom: 'Leila', code_agence: 2, code_affectation: 5, statut: 'actif' },
        { matricule_agent: 1005, nom: 'Haddad', prenom: 'Karim', code_agence: 3, code_affectation: 3, statut: 'actif' },
        { matricule_agent: 1006, nom: 'Bouzid', prenom: 'Samira', code_agence: 3, code_affectation: 5, statut: 'actif' }
      ];
      agents = await Agent.bulkCreate(testAgents);
      console.log(`✅ ${agents.length} agents créés`);
    }

    // Calculer la semaine courante
    const aujourdhui = new Date();
    const annee = aujourdhui.getFullYear();
    
    function getNumeroSemaine(date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
      const week1 = new Date(d.getFullYear(), 0, 4);
      return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
    }
    
    const semaine = getNumeroSemaine(aujourdhui);
    
    // Supprimer l'ancien planning de cette semaine
    await Planning.destroy({ where: { semaine, annee } });
    console.log(`🗑️ Ancien planning supprimé`);

    // Générer le nouveau planning
    const planningEntries = [];
    const jours = [1, 2, 3, 4]; // Mardi à Vendredi
    const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
    
    // Date de début (lundi de la semaine courante)
    const debutSemaine = new Date(aujourdhui);
    debutSemaine.setDate(aujourdhui.getDate() - aujourdhui.getDay() + 1);
    
    let agentIndex = 0;
    
    for (const jourOffset of jours) {
      const jourDate = new Date(debutSemaine);
      jourDate.setDate(debutSemaine.getDate() + jourOffset);
      const dateStr = jourDate.toISOString().split('T')[0];
      
      for (const creneau of creneaux) {
        const agent = agents[agentIndex % agents.length];
        
        planningEntries.push({
          matricule_agent: agent.matricule_agent,
          date_visite: dateStr,
          heure_visite: creneau,
          type_visite: 'Périodique',
          statut: 'Programmé',
          visite_effectuee: false,
          reprogrammee: false,
          priorite: 0,
          semaine: semaine,
          annee: annee,
          created_by: 1
        });
        
        agentIndex++;
      }
    }

    // Sauvegarder
    await Planning.bulkCreate(planningEntries);
    console.log(`✅ Planning généré avec ${planningEntries.length} visites !`);
    
    // Afficher un aperçu
    console.log('\n📋 Aperçu du planning :');
    const nouveauPlanning = await Planning.findAll({
      where: { semaine, annee },
      include: [{ model: Agent, as: 'planningAgent' }]
    });
    
    nouveauPlanning.forEach(p => {
      console.log(`${p.date_visite} ${p.heure_visite} - ${p.planningAgent?.nom} ${p.planningAgent?.prenom}`);
    });

    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

generatePlanning();