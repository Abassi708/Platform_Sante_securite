// backend/services/convocationService.js
const { Op } = require('sequelize');
const db = require('../models');
const { sendConvocationEmail } = require('../config/emailConfig');
const pdfConvocationService = require('./pdfConvocationService');

class ConvocationService {

  // ========== VÉRIFIER ET ENVOYER LES CONVOCATIONS (UNIQUEMENT PÉRIODIQUE + REPRISE) ==========
  async verifierEtEnvoyerConvocations() {
    console.log('\n📧 ===== VÉRIFICATION CONVOCATIONS =====');
    console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);

    const planningService = require('./planningService');
    const Planning = db.local.Planning;
    const Agent = db.global.Agent;

    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    const dateCible = new Date(aujourdhui);
    dateCible.setDate(aujourdhui.getDate() + 7);
    const dateCibleStr = dateCible.toISOString().split('T')[0];
    
    console.log(`📅 Date cible (J+7): ${dateCibleStr}`);

    // ✅ FILTRER UNIQUEMENT Périodique et Reprise
    let plannings = await Planning.findAll({
      where: {
        date_visite: dateCibleStr,
        convocation_envoyee: false,
        statut: 'Programmé',
        type_visite: { [Op.in]: ['Périodique', 'Reprise'] }  // ← AJOUT : uniquement Périodique et Reprise
      },
      order: [['heure_visite', 'ASC']],
      raw: true
    });

    // Filtrer les jours ouvrés
    const planningsValides = [];
    for (const planning of plannings) {
      const dateVisite = new Date(planning.date_visite);
      if (await planningService.estJourOuvre(dateVisite)) {
        planningsValides.push(planning);
      } else {
        console.log(`⚠️ Date ${planning.date_visite} non ouvrable - Convocation ignorée`);
      }
    }

    if (planningsValides.length === 0) {
      console.log('ℹ️ Aucune convocation valide à envoyer pour J+7');
      return 0;
    }

    console.log(`📋 ${planningsValides.length} convocation(s) à envoyer (Périodique + Reprise)`);
    
    const matricules = [...new Set(planningsValides.map(p => p.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      raw: true
    });

    const agentsMap = new Map();
    agents.forEach(agent => {
      agentsMap.set(agent.matricule_agent, agent);
    });

    const planningsWithAgents = planningsValides.map(p => ({
      ...p,
      planningAgent: agentsMap.get(p.matricule_agent) || null
    }));

    const pdfBuffer = await pdfConvocationService.genererConvocationPDF(planningsWithAgents);
    
    const grhEmail = process.env.GRH_EMAIL;
    
    if (!grhEmail) {
      console.log('⚠️ GRH_EMAIL non défini dans .env');
      return 0;
    }

    const datesVisites = [...new Set(planningsWithAgents.map(p => p.date_visite))];
    const sujet = `Convocations visites médicales - ${datesVisites.join(', ')}`;

    const result = await sendConvocationEmail(grhEmail, sujet, planningsWithAgents, pdfBuffer);
    
    if (result.success) {
      for (const planning of planningsValides) {
        await Planning.update(
          { convocation_envoyee: true },
          { where: { id_planning: planning.id_planning } }
        );
      }
      console.log(`✅ Convocation envoyée à ${grhEmail} avec PDF`);
      console.log(`✅ ${planningsValides.length} planning(s) marqué(s) convocation_envoyee=true`);
      return planningsValides.length;
    } else {
      console.log(`❌ Échec envoi à ${grhEmail}: ${result.error}`);
      return 0;
    }
  }

  // ========== ENVOYER CONVOCATION POUR UN PLANNING SPÉCIFIQUE ==========
  async envoyerConvocationPlanning(planningId) {
    const Planning = db.local.Planning;
    const Agent = db.global.Agent;

    const planning = await Planning.findByPk(planningId, { raw: true });

    if (!planning) {
      throw new Error('Planning non trouvé');
    }

    // ✅ Vérifier que c'est bien Périodique ou Reprise
    if (!['Périodique', 'Reprise'].includes(planning.type_visite)) {
      throw new Error('Seules les visites Périodique et Reprise peuvent être convoquées');
    }

    if (planning.convocation_envoyee) {
      throw new Error('Convocation déjà envoyée');
    }

    if (planning.statut !== 'Programmé') {
      throw new Error('Seules les visites programmées peuvent être convoquées');
    }

    const agent = await Agent.findOne({
      where: { matricule_agent: planning.matricule_agent },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      raw: true
    });

    const planningWithAgent = {
      ...planning,
      planningAgent: agent
    };

    const pdfBuffer = await pdfConvocationService.genererConvocationPDF([planningWithAgent]);

    const grhEmail = process.env.GRH_EMAIL;
    
    if (!grhEmail) {
      throw new Error('Email GRH non configuré');
    }

    const sujet = `Convocation - Visite ${planning.type_visite} du ${new Date(planning.date_visite).toLocaleDateString('fr-FR')}`;

    const result = await sendConvocationEmail(grhEmail, sujet, [planningWithAgent], pdfBuffer);
    
    if (result.success) {
      await Planning.update(
        { convocation_envoyee: true },
        { where: { id_planning: planningId } }
      );
      return { success: true, message: 'Convocation envoyée avec PDF' };
    } else {
      throw new Error(result.error);
    }
  }

  // ========== ENVOYER CONVOCATIONS GROUPÉES ==========
  async envoyerConvocationsGroupees(planningIds) {
    const Planning = db.local.Planning;
    const Agent = db.global.Agent;

    const plannings = await Planning.findAll({
      where: {
        id_planning: { [Op.in]: planningIds },
        convocation_envoyee: false,
        statut: 'Programmé',
        type_visite: { [Op.in]: ['Périodique', 'Reprise'] }  // ← FILTRE AJOUTÉ
      },
      raw: true
    });

    if (plannings.length === 0) {
      throw new Error('Aucune convocation à envoyer (uniquement Périodique et Reprise)');
    }

    const matricules = [...new Set(plannings.map(p => p.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      raw: true
    });

    const agentsMap = new Map();
    agents.forEach(agent => {
      agentsMap.set(agent.matricule_agent, agent);
    });

    const planningsWithAgents = plannings.map(p => ({
      ...p,
      planningAgent: agentsMap.get(p.matricule_agent) || null
    }));

    const pdfBuffer = await pdfConvocationService.genererConvocationPDF(planningsWithAgents);

    const grhEmail = process.env.GRH_EMAIL;
    
    if (!grhEmail) {
      throw new Error('Email GRH non configuré');
    }

    const dates = plannings.map(p => new Date(p.date_visite).toLocaleDateString('fr-FR'));
    const datesUniques = [...new Set(dates)];
    
    const sujet = `Convocations - ${datesUniques.join(', ')}`;

    const result = await sendConvocationEmail(grhEmail, sujet, planningsWithAgents, pdfBuffer);
    
    if (result.success) {
      for (const planning of plannings) {
        await Planning.update(
          { convocation_envoyee: true },
          { where: { id_planning: planning.id_planning } }
        );
      }
      return { success: true, count: plannings.length, message: `${plannings.length} convocations envoyées avec PDF` };
    } else {
      throw new Error(result.error);
    }
  }

  // ========== RÉCUPÉRER LES STATISTIQUES DES CONVOCATIONS ==========
  async getStatsConvocations() {
    try {
      const { sequelizeLocal } = require('../config/database');
      
      console.log('\n📊 Calcul des statistiques des convocations...');
      
      const [results] = await sequelizeLocal.query(`
        SELECT 
          COUNT(*) as total_visites,
          SUM(CASE WHEN convocation_envoyee = 1 THEN 1 ELSE 0 END) as total_envoyees,
          SUM(CASE WHEN convocation_envoyee = 0 AND statut = 'Programmé' AND type_visite IN ('Périodique', 'Reprise') AND date_visite >= CURDATE() THEN 1 ELSE 0 END) as total_a_envoyer,
          SUM(CASE WHEN convocation_envoyee = 0 AND statut = 'Programmé' AND type_visite IN ('Périodique', 'Reprise')
            AND date_visite BETWEEN DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND DATE_ADD(CURDATE(), INTERVAL 14 DAY)
            THEN 1 ELSE 0 END) as a_envoyer_semaine_prochaine,
          SUM(CASE WHEN statut = 'Programmé' AND type_visite IN ('Périodique', 'Reprise') AND date_visite >= CURDATE() THEN 1 ELSE 0 END) as total_programmees
        FROM planning
        WHERE statut IN ('Programmé', 'Effectué')
      `);
      
      const stats = results[0];
      
      const totalEnvoyees = parseInt(stats.total_envoyees) || 0;
      const totalProgrammees = parseInt(stats.total_programmees) || 0;
      const totalAEnvoyer = parseInt(stats.total_a_envoyer) || 0;
      const aEnvoyerSemaineProchaine = parseInt(stats.a_envoyer_semaine_prochaine) || 0;
      
      const tauxEnvoi = totalProgrammees > 0 
        ? Math.round((totalEnvoyees / totalProgrammees) * 100) 
        : 0;
      
      console.log(`✅ Stats: envoyées=${totalEnvoyees}, à envoyer=${totalAEnvoyer}, semaine prochaine=${aEnvoyerSemaineProchaine}`);
      
      return {
        total_envoyees: totalEnvoyees,
        total_a_envoyer: totalAEnvoyer,
        a_envoyer_j7: aEnvoyerSemaineProchaine,
        taux_envoi: tauxEnvoi,
        total_visites_programmees: totalProgrammees
      };
      
    } catch (error) {
      console.error('❌ Erreur getStatsConvocations:', error);
      return {
        total_envoyees: 0,
        total_a_envoyer: 0,
        a_envoyer_j7: 0,
        taux_envoi: 0,
        total_visites_programmees: 0,
        error: error.message
      };
    }
  }
}

module.exports = new ConvocationService();