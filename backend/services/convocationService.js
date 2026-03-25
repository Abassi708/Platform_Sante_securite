// backend/services/convocationService.js
const { Op } = require('sequelize');
const User = require('../models/User');
const Planning = require('../models/Planning');
const Agent = require('../models/Agent');
const { sendConvocationEmail } = require('../config/emailConfig');
const pdfService = require('./pdfConvocationService');
const { sequelizeLocal } = require('../config/database'); // ← AJOUTER CETTE LIGNE

class ConvocationService {

  // ========== VÉRIFIER ET ENVOYER LES CONVOCATIONS J+7 ==========
  async verifierEtEnvoyerConvocations() {
    console.log('\n📧 ===== VÉRIFICATION CONVOCATIONS GRH =====');
    console.log(`📅 ${new Date().toLocaleString('fr-FR')}`);

    const dans7Jours = new Date();
    dans7Jours.setDate(dans7Jours.getDate() + 7);

    const dateDebut = new Date(dans7Jours);
    dateDebut.setHours(0, 0, 0, 0);
    const dateFin = new Date(dans7Jours);
    dateFin.setHours(23, 59, 59, 999);

    const plannings = await Planning.findAll({
      where: {
        date_visite: { [Op.between]: [dateDebut, dateFin] },
        convocation_envoyee: false,
        statut: 'Programmé'
      },
      order: [['heure_visite', 'ASC']],
      raw: true
    });

    if (plannings.length === 0) {
      console.log('ℹ️ Aucune convocation à envoyer pour J+7');
      return 0;
    }

    console.log(`📋 ${plannings.length} visite(s) à convoquer pour J+7`);

    // Récupérer les agents
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

    const grhEmail = process.env.GRH_EMAIL;
    
    if (!grhEmail) {
      console.log('⚠️ GRH_EMAIL non défini dans .env');
      return 0;
    }

    const sujet = `Convocations visites médicales - Semaine du ${dans7Jours.toLocaleDateString('fr-FR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })}`;

    const result = await sendConvocationEmail(grhEmail, sujet, planningsWithAgents);
    
    if (result.success) {
      for (const planning of plannings) {
        await Planning.update(
          { convocation_envoyee: true },
          { where: { id_planning: planning.id_planning } }
        );
      }
      console.log(`✅ Convocation envoyée à ${grhEmail}`);
      console.log(`✅ ${plannings.length} planning(s) marqué(s) convocation_envoyee=true`);
      return plannings.length;
    } else {
      console.log(`❌ Échec envoi à ${grhEmail}: ${result.error}`);
      return 0;
    }
  }

  // ========== ENVOYER CONVOCATION POUR UN PLANNING SPÉCIFIQUE ==========
  async envoyerConvocationPlanning(planningId) {
    const planning = await Planning.findByPk(planningId, { raw: true });

    if (!planning) {
      throw new Error('Planning non trouvé');
    }

    if (planning.convocation_envoyee) {
      throw new Error('Convocation déjà envoyée');
    }

    if (planning.statut !== 'Programmé') {
      throw new Error('Seules les visites programmées peuvent être convoquées');
    }

    // Récupérer l'agent
    const agent = await Agent.findOne({
      where: { matricule_agent: planning.matricule_agent },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      raw: true
    });

    const planningWithAgent = {
      ...planning,
      planningAgent: agent
    };

    const grhEmail = process.env.GRH_EMAIL;
    
    if (!grhEmail) {
      throw new Error('Email GRH non configuré');
    }

    const sujet = `Convocation - Visite du ${new Date(planning.date_visite).toLocaleDateString('fr-FR')}`;

    const result = await sendConvocationEmail(grhEmail, sujet, [planningWithAgent]);
    
    if (result.success) {
      await Planning.update(
        { convocation_envoyee: true },
        { where: { id_planning: planningId } }
      );
      return { success: true, message: 'Convocation envoyée' };
    } else {
      throw new Error(result.error);
    }
  }

  // ========== ENVOYER CONVOCATIONS GROUPÉES ==========
  async envoyerConvocationsGroupees(planningIds) {
    const plannings = await Planning.findAll({
      where: {
        id_planning: { [Op.in]: planningIds },
        convocation_envoyee: false,
        statut: 'Programmé'
      },
      raw: true
    });

    if (plannings.length === 0) {
      throw new Error('Aucune convocation à envoyer');
    }

    // Récupérer les agents
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

    const grhEmail = process.env.GRH_EMAIL;
    
    if (!grhEmail) {
      throw new Error('Email GRH non configuré');
    }

    const dates = plannings.map(p => new Date(p.date_visite).toLocaleDateString('fr-FR'));
    const datesUniques = [...new Set(dates)];
    
    const sujet = `Convocations - ${datesUniques.join(', ')}`;

    const result = await sendConvocationEmail(grhEmail, sujet, planningsWithAgents);
    
    if (result.success) {
      for (const planning of plannings) {
        await Planning.update(
          { convocation_envoyee: true },
          { where: { id_planning: planning.id_planning } }
        );
      }
      return { success: true, count: plannings.length, message: `${plannings.length} convocations envoyées` };
    } else {
      throw new Error(result.error);
    }
  }

  // ========== RÉCUPÉRER LES CONVOCATIONS À PRÉPARER (J+7) ==========
  async getConvocationsAPreparer() {
    const dans7Jours = new Date();
    dans7Jours.setDate(dans7Jours.getDate() + 7);

    const dateDebut = new Date(dans7Jours);
    dateDebut.setHours(0, 0, 0, 0);
    const dateFin = new Date(dans7Jours);
    dateFin.setHours(23, 59, 59, 999);

    const plannings = await Planning.findAll({
      where: {
        date_visite: { [Op.between]: [dateDebut, dateFin] },
        convocation_envoyee: false,
        statut: 'Programmé'
      },
      order: [['date_visite', 'ASC'], ['heure_visite', 'ASC']],
      raw: true
    });

    // Récupérer les agents
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

    return plannings.map(p => ({
      ...p,
      planningAgent: agentsMap.get(p.matricule_agent) || null
    }));
  }

  // ========== RÉCUPÉRER LES STATISTIQUES DES CONVOCATIONS ==========
  async getStatsConvocations() {
    try {
      console.log('\n📊 Calcul des statistiques des convocations...');
      
      // Utiliser sequelizeLocal pour les requêtes SQL directes
      const [results] = await sequelizeLocal.query(`
        SELECT 
          COUNT(*) as total_visites,
          SUM(CASE WHEN convocation_envoyee = 1 THEN 1 ELSE 0 END) as total_envoyees,
          SUM(CASE WHEN convocation_envoyee = 0 AND statut = 'Programmé' AND date_visite >= CURDATE() THEN 1 ELSE 0 END) as total_a_envoyer,
          SUM(CASE WHEN convocation_envoyee = 0 AND statut = 'Programmé' 
            AND date_visite BETWEEN DATE_ADD(CURDATE(), INTERVAL 7 DAY) AND DATE_ADD(CURDATE(), INTERVAL 8 DAY) 
            THEN 1 ELSE 0 END) as a_envoyer_j7,
          SUM(CASE WHEN statut = 'Programmé' AND date_visite >= CURDATE() THEN 1 ELSE 0 END) as total_programmees
        FROM planning
        WHERE statut IN ('Programmé', 'Effectué')
      `);
      
      const stats = results[0];
      
      const totalEnvoyees = parseInt(stats.total_envoyees) || 0;
      const totalProgrammees = parseInt(stats.total_programmees) || 0;
      const totalAEnvoyer = parseInt(stats.total_a_envoyer) || 0;
      const aEnvoyerJ7 = parseInt(stats.a_envoyer_j7) || 0;
      
      const tauxEnvoi = totalProgrammees > 0 
        ? Math.round((totalEnvoyees / totalProgrammees) * 100) 
        : 0;
      
      console.log(`✅ Stats calculées:`);
      console.log(`   Total visites: ${stats.total_visites}`);
      console.log(`   Total envoyées: ${totalEnvoyees}`);
      console.log(`   Total à envoyer: ${totalAEnvoyer}`);
      console.log(`   À envoyer J+7: ${aEnvoyerJ7}`);
      console.log(`   Taux d'envoi: ${tauxEnvoi}%`);
      
      return {
        total_envoyees: totalEnvoyees,
        total_a_envoyer: totalAEnvoyer,
        a_envoyer_j7: aEnvoyerJ7,
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