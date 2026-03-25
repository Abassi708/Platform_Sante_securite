// backend/routes/previsionsRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');
const db = require('../models');
const ConvocationService = require('../services/convocationService');

// Récupérer les modèles
const Agent = db.global.Agent;
const Planning = db.local.Planning;
const Visite = db.local.Visite;

// ========== PRÉVISIONS DES VISITES À VENIR ==========
router.get('/previsions', protect, async (req, res) => {
  try {
    console.log('📊 Génération des prévisions de visites...');
    
    const agents = await Agent.findAll({
      where: { statut: 'actif' },
      attributes: [
        'matricule_agent', 'nom', 'prenom', 'code_affectation', 
        'date_derniere_visite', 'date_fin_inaptitude', 
        'periodicite_jours', 'date_prochaine_visite'
      ]
    });
    
    const previsions = [];
    const aujourdhui = new Date();
    
    for (const agent of agents) {
      // Calculer la périodicité
      let periodicite;
      if (agent.periodicite_jours && agent.periodicite_jours > 0) {
        periodicite = agent.periodicite_jours;
      } else {
        periodicite = agent.code_affectation === 3 ? 180 : 365;
      }
      
      const periodiciteTexte = periodicite === 180 ? '6 mois' : '1 an';
      const estChauffeur = agent.code_affectation === 3;
      
      // Vérifier si l'agent est en inaptitude
      if (agent.date_fin_inaptitude) {
        const dateFin = new Date(agent.date_fin_inaptitude);
        if (dateFin > aujourdhui) {
          continue; // Agent en inaptitude, pas de visite périodique à prévoir
        }
      }
      
      // Calculer les jours depuis la dernière visite
      let joursDepuis = 0;
      if (agent.date_derniere_visite) {
        const dateDerniere = new Date(agent.date_derniere_visite);
        joursDepuis = Math.floor((aujourdhui - dateDerniere) / (1000 * 60 * 60 * 24));
      } else {
        // Jamais visité, considérer comme urgent
        joursDepuis = periodicite;
      }
      
      const joursRestants = periodicite - joursDepuis;
      
      // Alerte si dans les 30 jours
      if (joursRestants <= 30 && joursRestants > 0) {
        const datePrevue = new Date(aujourdhui);
        datePrevue.setDate(aujourdhui.getDate() + joursRestants);
        
        let priorite = 'NORMALE';
        if (joursRestants <= 7) priorite = 'URGENT';
        else if (joursRestants <= 15) priorite = 'ÉLEVÉE';
        
        previsions.push({
          agent: {
            matricule: agent.matricule_agent,
            nom: agent.nom,
            prenom: agent.prenom,
            poste: estChauffeur ? 'Chauffeur' : 'Autre',
            periodicite: periodiciteTexte
          },
          derniere_visite: agent.date_derniere_visite || 'Jamais',
          periodicite_jours: periodicite,
          periodicite_texte: periodiciteTexte,
          jours_restants: joursRestants,
          date_prevue: datePrevue.toISOString().split('T')[0],
          priorite: priorite
        });
      } else if (joursRestants <= 0) {
        // En retard
        const joursRetard = Math.abs(joursRestants);
        let priorite = joursRetard > 30 ? 'CRITIQUE' : 'URGENT';
        
        previsions.push({
          agent: {
            matricule: agent.matricule_agent,
            nom: agent.nom,
            prenom: agent.prenom,
            poste: estChauffeur ? 'Chauffeur' : 'Autre',
            periodicite: periodiciteTexte
          },
          derniere_visite: agent.date_derniere_visite || 'Jamais',
          periodicite_jours: periodicite,
          periodicite_texte: periodiciteTexte,
          jours_retard: joursRetard,
          date_prevue: new Date().toISOString().split('T')[0],
          priorite: priorite,
          en_retard: true
        });
      }
    }
    
    // Trier par priorité et jours restants
    previsions.sort((a, b) => {
      const prioriteOrder = { 'CRITIQUE': 0, 'URGENT': 1, 'ÉLEVÉE': 2, 'NORMALE': 3 };
      const orderA = a.en_retard ? 0 : prioriteOrder[a.priorite] || 4;
      const orderB = b.en_retard ? 0 : prioriteOrder[b.priorite] || 4;
      if (orderA !== orderB) return orderA - orderB;
      return (a.jours_restants || 999) - (b.jours_restants || 999);
    });
    
    // Vérifier les plannings existants
    const planningsExistants = await Planning.findAll({
      where: {
        date_visite: { [Op.gte]: aujourdhui.toISOString().split('T')[0] },
        statut: 'Programmé'
      },
      attributes: ['date_visite', 'matricule_agent']
    });
    
    const agentsPlanifies = new Set(planningsExistants.map(p => p.matricule_agent));
    
    const previsionsNonPlanifiees = previsions.filter(p => 
      !agentsPlanifies.has(p.agent.matricule)
    );
    
    const stats = {
      total_a_planifier: previsionsNonPlanifiees.length,
      chauffeurs: previsionsNonPlanifiees.filter(p => p.agent.poste === 'Chauffeur').length,
      autres: previsionsNonPlanifiees.filter(p => p.agent.poste === 'Autre').length,
      critiques: previsionsNonPlanifiees.filter(p => p.priorite === 'CRITIQUE').length,
      urgents: previsionsNonPlanifiees.filter(p => p.priorite === 'URGENT').length,
      elevees: previsionsNonPlanifiees.filter(p => p.priorite === 'ÉLEVÉE').length,
      normales: previsionsNonPlanifiees.filter(p => p.priorite === 'NORMALE').length
    };
    
    res.json({
      success: true,
      previsions: previsionsNonPlanifiees,
      stats,
      plannings_existants: planningsExistants.length,
      total_agents_actifs: agents.length,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Erreur prévisions:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== CONVOCATIONS À PRÉPARER ==========
router.get('/convocations-a-preparer', protect, async (req, res) => {
  try {
    const convocations = await ConvocationService.getConvocationsAPreparer();
    res.json({
      success: true,
      convocations,
      count: convocations.length
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== ENVOYER CONVOCATIONS ==========
router.post('/envoyer-convocations', protect, async (req, res) => {
  try {
    const nbEnvoyes = await ConvocationService.verifierEtEnvoyerConvocations();
    res.json({
      success: true,
      nb_envoyes: nbEnvoyes,
      message: `${nbEnvoyes} email(s) de convocation envoyés`
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== STATISTIQUES AVANCÉES ==========
router.get('/stats-avancees', protect, async (req, res) => {
  try {
    const anneeActuelle = new Date().getFullYear();
    const moisActuel = new Date().getMonth();
    
    // Visites par mois de l'année en cours
    const visitesParMois = await Planning.findAll({
      where: {
        annee: anneeActuelle,
        visite_effectuee: true
      },
      attributes: [
        [Planning.sequelize.fn('MONTH', Planning.sequelize.col('date_visite')), 'mois'],
        [Planning.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: [Planning.sequelize.fn('MONTH', Planning.sequelize.col('date_visite'))],
      order: [[Planning.sequelize.fn('MONTH', Planning.sequelize.col('date_visite')), 'ASC']],
      raw: true
    });
    
    // Initialiser un tableau avec tous les mois
    const moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const visitesParMoisComplet = Array(12).fill(0);
    visitesParMois.forEach(item => {
      const mois = parseInt(item.mois) - 1;
      visitesParMoisComplet[mois] = parseInt(item.count);
    });
    
    // Total des visites de l'année
    const totalVisites = await Planning.count({
      where: { annee: anneeActuelle }
    });
    
    const visitesRealisees = await Planning.count({
      where: { annee: anneeActuelle, visite_effectuee: true }
    });
    
    const tauxRealisation = totalVisites > 0 
      ? Math.round((visitesRealisees / totalVisites) * 100)
      : 0;
    
    // Visites à venir (programmées non effectuées)
    const aujourdhui = new Date().toISOString().split('T')[0];
    const visitesAVenir = await Planning.count({
      where: {
        date_visite: { [Op.gte]: aujourdhui },
        statut: 'Programmé',
        visite_effectuee: false
      }
    });
    
    // Visites en retard
    const visitesEnRetard = await Planning.count({
      where: {
        date_visite: { [Op.lt]: aujourdhui },
        statut: 'Programmé',
        visite_effectuee: false
      }
    });
    
    // Statistiques par type de visite
    const visitesParType = await Planning.findAll({
      where: { annee: anneeActuelle },
      attributes: [
        'type_visite',
        [Planning.sequelize.fn('COUNT', '*'), 'count']
      ],
      group: ['type_visite'],
      raw: true
    });
    
    // Statistiques par type d'agent
    const agents = await Agent.findAll({
      where: { statut: 'actif' }
    });
    
    const chauffeurs = agents.filter(a => a.code_affectation === 3).length;
    const autres = agents.length - chauffeurs;
    
    // Agents nécessitant une visite dans les 30 jours
    let chauffeursAVenir = 0;
    let autresAVenir = 0;
    
    for (const agent of agents) {
      let periodicite;
      if (agent.periodicite_jours && agent.periodicite_jours > 0) {
        periodicite = agent.periodicite_jours;
      } else {
        periodicite = agent.code_affectation === 3 ? 180 : 365;
      }
      
      let joursDepuis = 0;
      if (agent.date_derniere_visite) {
        const dateDerniere = new Date(agent.date_derniere_visite);
        joursDepuis = Math.floor((new Date() - dateDerniere) / (1000 * 60 * 60 * 24));
      } else {
        joursDepuis = periodicite;
      }
      
      const joursRestants = periodicite - joursDepuis;
      
      if (joursRestants <= 30 && joursRestants > 0) {
        if (agent.code_affectation === 3) {
          chauffeursAVenir++;
        } else {
          autresAVenir++;
        }
      } else if (joursRestants <= 0) {
        if (agent.code_affectation === 3) {
          chauffeursAVenir++;
        } else {
          autresAVenir++;
        }
      }
    }
    
    // Projection pour les prochains mois
    const projectionProchainsMois = [];
    for (let i = 1; i <= 6; i++) {
      const moisProchain = new Date();
      moisProchain.setMonth(moisActuel + i);
      const mois = moisProchain.getMonth();
      const projection = {
        mois: moisLabels[mois],
        annee: moisProchain.getFullYear(),
        estimation: Math.round((visitesParMoisComplet[mois] || 0) * 1.1) // Estimation +10%
      };
      projectionProchainsMois.push(projection);
    }
    
    res.json({
      success: true,
      visites_par_mois: {
        labels: moisLabels,
        data: visitesParMoisComplet
      },
      taux_realisation: {
        total: totalVisites,
        realisees: visitesRealisees,
        pourcentage: tauxRealisation,
        a_venir: visitesAVenir,
        en_retard: visitesEnRetard
      },
      periodicite_stats: {
        chauffeurs: {
          total: chauffeurs,
          a_venir_dans_30j: chauffeursAVenir,
          periodicite: '6 mois',
          pourcentage: chauffeurs > 0 ? Math.round((chauffeursAVenir / chauffeurs) * 100) : 0
        },
        autres: {
          total: autres,
          a_venir_dans_30j: autresAVenir,
          periodicite: '1 an',
          pourcentage: autres > 0 ? Math.round((autresAVenir / autres) * 100) : 0
        }
      },
      visites_par_type: visitesParType,
      projection: projectionProchainsMois,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('❌ Erreur stats avancées:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== STATISTIQUES DES VISITES PAR AGENT ==========
router.get('/stats-agent/:matricule', protect, async (req, res) => {
  try {
    const { matricule } = req.params;
    
    const agent = await Agent.findOne({
      where: { matricule_agent: matricule },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_affectation', 'date_derniere_visite', 'date_fin_inaptitude']
    });
    
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent non trouvé' });
    }
    
    const periodicite = agent.code_affectation === 3 ? 180 : 365;
    const aujourdhui = new Date();
    
    let joursDepuis = 0;
    if (agent.date_derniere_visite) {
      const dateDerniere = new Date(agent.date_derniere_visite);
      joursDepuis = Math.floor((aujourdhui - dateDerniere) / (1000 * 60 * 60 * 24));
    }
    
    const joursRestants = periodicite - joursDepuis;
    
    const historiqueVisites = await Visite.findAll({
      where: { matricule_agent: matricule },
      order: [['date_visite', 'DESC']],
      limit: 10,
      attributes: ['date_visite', 'type_visite', 'resultat', 'medecin']
    });
    
    const prochainesVisites = await Planning.findAll({
      where: {
        matricule_agent: matricule,
        date_visite: { [Op.gte]: aujourdhui.toISOString().split('T')[0] },
        statut: 'Programmé'
      },
      order: [['date_visite', 'ASC']],
      attributes: ['date_visite', 'heure_visite', 'type_visite', 'statut']
    });
    
    res.json({
      success: true,
      agent: {
        matricule: agent.matricule_agent,
        nom: agent.nom,
        prenom: agent.prenom,
        poste: agent.code_affectation === 3 ? 'Chauffeur' : 'Autre',
        periodicite: periodicite === 180 ? '6 mois' : '1 an',
        periodicite_jours: periodicite,
        derniere_visite: agent.date_derniere_visite || 'Jamais',
        jours_depuis: joursDepuis,
        jours_restants: joursRestants,
        statut_visite: joursRestants <= 0 ? 'En retard' : joursRestants <= 30 ? 'À venir' : 'À jour',
        en_inaptitude: agent.date_fin_inaptitude && new Date(agent.date_fin_inaptitude) > aujourdhui
      },
      historique: historiqueVisites,
      prochaines_visites: prochainesVisites,
      recommandation: this._getRecommandation(joursRestants, periodicite, agent.date_derniere_visite)
    });
    
  } catch (error) {
    console.error('❌ Erreur stats agent:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Fonction utilitaire pour la recommandation
function _getRecommandation(joursRestants, periodicite, derniereVisite) {
  if (!derniereVisite) {
    return 'URGENT : L\'agent n\'a jamais passé de visite médicale. Planifier une visite immédiatement.';
  }
  if (joursRestants <= 0) {
    return `CRITIQUE : Visite en retard de ${Math.abs(joursRestants)} jours. Planifier en urgence.`;
  }
  if (joursRestants <= 7) {
    return `URGENT : Visite dans ${joursRestants} jours. Planifier immédiatement.`;
  }
  if (joursRestants <= 30) {
    return `À PLANIFIER : Visite dans ${joursRestants} jours. Planifier dans les prochains jours.`;
  }
  return `À JOUR : Prochaine visite dans ${joursRestants} jours.`;
}

// ========== EXPORT ==========
module.exports = router;