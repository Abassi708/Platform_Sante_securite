// backend/services/convocationService.js
const { Op } = require('sequelize');
const db = require('../models');
const { sendConvocationEmail } = require('../config/emailConfig');
const pdfConvocationService = require('./pdfConvocationService');

const Planning = db.local.Planning;
const Agent = db.global.Agent;
const ConvocationLog = db.local.ConvocationLog;

class ConvocationService {

  async envoyerConvocationPlanning(planningId, userId, userEmail, userNom) {
    const planning = await Planning.findByPk(planningId, { raw: true });

    if (!planning) throw new Error('Planning non trouvé');

    if (!['Périodique', 'Reprise'].includes(planning.type_visite)) {
      throw new Error('Seules les visites Périodique et Reprise peuvent être convoquées');
    }

    if (planning.convocation_envoyee) {
      throw new Error('Convocation déjà envoyée');
    }

    const agent = await Agent.findOne({
      where: { matricule_agent: planning.matricule_agent },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      raw: true
    });

    const planningWithAgent = { ...planning, planningAgent: agent };
    const pdfBuffer = await pdfConvocationService.genererConvocationPDF([planningWithAgent]);
    const grhEmail = process.env.GRH_EMAIL;

    const sujet = `Convocation - Visite ${planning.type_visite} du ${new Date(planning.date_visite).toLocaleDateString('fr-FR')}`;
    const result = await sendConvocationEmail(grhEmail, sujet, [planningWithAgent], pdfBuffer);

    if (result.success) {
      // ✅ METTRE À JOUR LE PLANNING
      await Planning.update(
        { 
          convocation_envoyee: true,
          date_convocation: new Date(),
          convocation_envoyee_par: userId
        },
        { where: { id_planning: planningId } }
      );
      
      // ✅ ENREGISTRER DANS L'HISTORIQUE
      await ConvocationLog.create({
        id_planning: planningId,
        matricule_agent: planning.matricule_agent,
        date_convocation: new Date(),
        date_visite: planning.date_visite,
        heure_visite: planning.heure_visite,
        type_visite: planning.type_visite,
        envoyee_par: userId,
        envoyee_par_nom: userNom,
        destinataire: grhEmail,
        statut: 'envoyee'
      });
      
      return { success: true, message: 'Convocation envoyée avec PDF' };
    } else {
      throw new Error(result.error);
    }
  }

  async envoyerConvocationsGroupees(planningIds, userId, userEmail, userNom) {
    const plannings = await Planning.findAll({
      where: {
        id_planning: { [Op.in]: planningIds },
        convocation_envoyee: false,
        statut: 'Programmé',
        type_visite: { [Op.in]: ['Périodique', 'Reprise'] }
      },
      raw: true
    });

    if (plannings.length === 0) throw new Error('Aucune convocation à envoyer');

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

    const pdfBuffer = await pdfConvocationService.genererConvocationPDF(planningsWithAgents);
    const grhEmail = process.env.GRH_EMAIL;
    const dates = plannings.map(p => new Date(p.date_visite).toLocaleDateString('fr-FR'));
    const sujet = `Convocations - ${[...new Set(dates)].join(', ')}`;

    const result = await sendConvocationEmail(grhEmail, sujet, planningsWithAgents, pdfBuffer);

    if (result.success) {
      // ✅ METTRE À JOUR LES PLANNINGS ET ENREGISTRER L'HISTORIQUE
      for (const planning of plannings) {
        await Planning.update(
          { 
            convocation_envoyee: true,
            date_convocation: new Date(),
            convocation_envoyee_par: userId
          },
          { where: { id_planning: planning.id_planning } }
        );
        
        await ConvocationLog.create({
          id_planning: planning.id_planning,
          matricule_agent: planning.matricule_agent,
          date_convocation: new Date(),
          date_visite: planning.date_visite,
          heure_visite: planning.heure_visite,
          type_visite: planning.type_visite,
          envoyee_par: userId,
          envoyee_par_nom: userNom,
          destinataire: grhEmail,
          statut: 'envoyee'
        });
      }
      return { success: true, count: plannings.length };
    } else {
      throw new Error(result.error);
    }
  }

async getConvocationsDuJour() {
  try {
    const dateJ7 = new Date();
    dateJ7.setDate(dateJ7.getDate() + 7);
    const dateJ7Str = dateJ7.toISOString().split('T')[0];
    
    const plannings = await Planning.findAll({
      where: {
        date_visite: dateJ7Str,
        convocation_envoyee: true,
        statut: 'Programmé',
        type_visite: { [Op.in]: ['Périodique', 'Reprise'] }
      },
      attributes: ['id_planning', 'matricule_agent', 'date_visite', 'type_visite'],
      raw: true
    });
    
    return {
      date_envoi: new Date().toISOString().split('T')[0],
      date_visite: dateJ7Str,
      nombre: plannings.length,
      convocations: plannings
    };
  } catch (error) {
    console.error('❌ Erreur getConvocationsDuJour:', error);
    return { nombre: 0, convocations: [] };
  }
}

// Modifier la méthode verifierEtEnvoyerConvocations existante
async verifierEtEnvoyerConvocations() {
  try {
    const dateJ7 = new Date();
    dateJ7.setDate(dateJ7.getDate() + 7);
    const dateJ7Str = dateJ7.toISOString().split('T')[0];
    
    // ✅ Récupérer UNIQUEMENT les visites à J+7
    const plannings = await Planning.findAll({
      where: {
        date_visite: dateJ7Str,
        convocation_envoyee: false,
        statut: 'Programmé',
        type_visite: { [Op.in]: ['Périodique', 'Reprise'] }
      },
      raw: true
    });
    
    if (plannings.length === 0) {
      console.log(`📭 Aucune convocation à envoyer pour le ${dateJ7Str}`);
      return 0;
    }
    
    console.log(`📋 ${plannings.length} convocation(s) à envoyer pour le ${dateJ7Str}`);
    
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
    
    // Générer un seul PDF pour toutes les convocations
    const pdfBuffer = await pdfConvocationService.genererConvocationPDF(planningsWithAgents);
    const grhEmail = process.env.GRH_EMAIL;
    
    // Grouper par date pour le sujet
    const dates = [...new Set(plannings.map(p => p.date_visite))];
    const sujet = `Convocations visites médicales - ${dates.join(', ')}`;
    
    const result = await sendConvocationEmail(grhEmail, sujet, planningsWithAgents, pdfBuffer);
    
    if (result.success) {
      // Mettre à jour les plannings et enregistrer l'historique
      for (const planning of plannings) {
        await Planning.update(
          { 
            convocation_envoyee: true,
            date_convocation: new Date()
          },
          { where: { id_planning: planning.id_planning } }
        );
        
        await ConvocationLog.create({
          id_planning: planning.id_planning,
          matricule_agent: planning.matricule_agent,
          date_convocation: new Date(),
          date_visite: planning.date_visite,
          heure_visite: planning.heure_visite,
          type_visite: planning.type_visite,
          envoyee_par: 1, // Système
          envoyee_par_nom: 'Système (Auto)',
          destinataire: grhEmail,
          statut: 'envoyee'
        });
      }
      
      return plannings.length;
    } else {
      throw new Error(result.error);
    }
    
  } catch (error) {
    console.error('❌ Erreur verifierEtEnvoyerConvocations:', error);
    return 0;
  }
}


  async getHistoriqueConvocations(limit = 50) {
    try {
      const historique = await ConvocationLog.findAll({
        order: [['date_convocation', 'DESC']],
        limit: parseInt(limit),
        include: [{
          model: Agent,
          as: 'agent',
          attributes: ['nom', 'prenom']
        }],
        raw: true,
        nest: true
      });
      
      return historique;
      
    } catch (error) {
      console.error('❌ Erreur historique:', error);
      return [];
    }
  }
}

module.exports = new ConvocationService();