// backend/send-pending-convocations.js
require('dotenv').config();
const { Op } = require('sequelize');
const db = require('./models');

// ✅ IMPORT DES SERVICES NÉCESSAIRES
const pdfConvocationService = require('./services/pdfConvocationService');
const { sendConvocationEmail } = require('./config/emailConfig');

const Planning = db.local.Planning;
const Agent = db.global.Agent;

async function sendPending() {
  console.log('📧 Envoi des convocations en retard...\n');
  
  try {
    // Récupérer toutes les convocations non envoyées
    const plannings = await Planning.findAll({
      where: {
        convocation_envoyee: false,
        statut: 'Programmé',
        type_visite: { [Op.in]: ['Périodique', 'Reprise'] },
        date_visite: { [Op.gte]: new Date() } // À partir d'aujourd'hui
      },
      raw: true
    });
    
    console.log(`📋 ${plannings.length} convocation(s) à envoyer\n`);
    
    if (plannings.length === 0) {
      console.log('✅ Aucune convocation en retard');
      process.exit(0);
    }
    
    // Afficher les détails
    for (const p of plannings) {
      console.log(`   - ${p.date_visite} | Agent: ${p.matricule_agent} | Type: ${p.type_visite}`);
    }
    
    // Récupérer les agents
    const matricules = [...new Set(plannings.map(p => p.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      raw: true
    });
    
    const agentsMap = new Map();
    agents.forEach(agent => agentsMap.set(agent.matricule_agent, agent));
    
    const planningsWithAgents = plannings.map(p => ({
      ...p,
      planningAgent: agentsMap.get(p.matricule_agent) || null
    }));
    
    // Grouper par date pour un seul PDF
    const parDate = {};
    for (const p of planningsWithAgents) {
      if (!parDate[p.date_visite]) parDate[p.date_visite] = [];
      parDate[p.date_visite].push(p);
    }
    
    const grhEmail = process.env.GRH_EMAIL;
    console.log(`\n📧 Envoi à: ${grhEmail}\n`);
    
    for (const [date, planningsDate] of Object.entries(parDate)) {
      console.log(`📅 Visites du ${date}: ${planningsDate.length} convocation(s)`);
      
      // Générer le PDF
      const pdfBuffer = await pdfConvocationService.genererConvocationPDF(planningsDate);
      
      // Sujet de l'email
      const sujet = `Convocations visites médicales - ${date}`;
      
      // Envoyer l'email
      const result = await sendConvocationEmail(grhEmail, sujet, planningsDate, pdfBuffer);
      
      if (result.success) {
        // Mettre à jour les statuts
        for (const p of planningsDate) {
          await Planning.update(
            { 
              convocation_envoyee: true, 
              date_convocation: new Date(),
              convocation_envoyee_par: 1,
              convocation_envoyee_nom: 'Système (Rattrapage)'
            },
            { where: { id_planning: p.id_planning } }
          );
          
          // Enregistrer dans le log
          await db.local.ConvocationLog.create({
            id_planning: p.id_planning,
            matricule_agent: p.matricule_agent,
            date_convocation: new Date(),
            date_visite: p.date_visite,
            heure_visite: p.heure_visite,
            type_visite: p.type_visite,
            envoyee_par: 1,
            envoyee_par_nom: 'Système (Rattrapage)',
            destinataire: grhEmail,
            statut: 'envoyee'
          });
        }
        console.log(`   ✅ ${planningsDate.length} convocation(s) envoyée(s) pour le ${date}`);
      } else {
        console.log(`   ❌ Erreur: ${result.error}`);
      }
    }
    
    console.log('\n✅ Traitement terminé');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

sendPending();