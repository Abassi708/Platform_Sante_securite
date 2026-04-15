// backend/routes/accidentRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const db = require('../models');
const { Op } = require('sequelize');
const planningService = require('../services/planningService');
const { sequelizeLocal } = require('../config/database');

// Récupérer les modèles
const Accident = db.local.Accident;
const Agent = db.global.Agent;
const Planning = db.local.Planning;
const Visite = db.local.Visite;

// ========== FONCTION POUR TROUVER LE PROCHAIN JOUR OUVRÉ (MARDI-VENDREDI) ==========
async function getProchainJourOuvre(date) {
  const dateTemp = new Date(date);
  let joursEssais = 0;
  
  while (!(await planningService.estJourOuvre(dateTemp)) && joursEssais < 21) {
    dateTemp.setDate(dateTemp.getDate() + 1);
    joursEssais++;
  }
  
  return dateTemp;
}

// ========== FONCTION POUR TROUVER LE JOUR OUVRÉ PRÉCÉDENT ==========
async function getJourOuvreAvant(date) {
  const dateTemp = new Date(date);
  let joursEssais = 0;
  
  while (!(await planningService.estJourOuvre(dateTemp)) && joursEssais < 21) {
    dateTemp.setDate(dateTemp.getDate() - 1);
    joursEssais++;
  }
  
  return dateTemp;
}

// ========== FONCTION POUR TROUVER UN CRÉNEAU DISPONIBLE POUR L'AGENT ==========
async function trouverCreneauDisponible(dateVisite, matriculeAgent) {
  const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
  const dateStr = dateVisite.toISOString().split('T')[0];
  
  console.log(`   🔍 Recherche créneau pour le ${dateStr}`);
  
  for (const heure of creneaux) {
    // Vérifier si le créneau est occupé par une autre visite
    const creneauOccupe = await Planning.findOne({
      where: {
        date_visite: dateStr,
        heure_visite: heure,
        statut: 'Programmé'
      }
    });
    
    // Vérifier si l'agent a déjà une visite ce jour-là
    const agentDejaOccupe = await Planning.findOne({
      where: {
        matricule_agent: matriculeAgent,
        date_visite: dateStr,
        statut: 'Programmé'
      }
    });
    
    if (!creneauOccupe && !agentDejaOccupe) {
      console.log(`   ✅ Créneau disponible: ${dateStr} à ${heure}`);
      return { date: dateVisite, heure, trouve: true, message: null };
    } else if (agentDejaOccupe) {
      const typeVisiteExistante = agentDejaOccupe.type_visite;
      console.log(`   ⚠️ Agent a déjà une visite (${typeVisiteExistante}) le ${dateStr}`);
      return { 
        trouve: false, 
        raison: 'agent_deja_occupe',
        message: `⚠️ L'agent a déjà une visite de type "${typeVisiteExistante}" prévue le ${dateStr}. Passage au jour suivant...`
      };
    } else {
      console.log(`   ⚠️ ${dateStr} à ${heure} est déjà occupé par un autre agent`);
    }
  }
  
  console.log(`   ❌ Aucun créneau disponible le ${dateStr}`);
  return { 
    trouve: false, 
    raison: 'pas_de_creneau',
    message: `❌ Aucun créneau disponible le ${dateStr}. Recherche d'un autre jour...`
  };
}

// ========== FONCTION POUR TROUVER UNE DATE DE REPRISE VALIDE ==========
async function trouverDateRepriseValide(dateFinArret, matriculeAgent, agentNom) {
  const dateRepriseIdeale = new Date(dateFinArret);
  dateRepriseIdeale.setDate(dateFinArret.getDate() - 3);
  
  const dateIdealeStr = dateRepriseIdeale.toISOString().split('T')[0];
  const jourIdeale = dateRepriseIdeale.toLocaleDateString('fr-FR', { weekday: 'long' });
  
  console.log(`\n📅 Date reprise idéale: ${dateIdealeStr} (${jourIdeale})`);
  
  // 1. Chercher un jour ouvré AVANT la date idéale
  let dateReprise = await getJourOuvreAvant(dateRepriseIdeale);
  let dateRepriseStr = dateReprise.toISOString().split('T')[0];
  let dernierMessage = "";
  
  console.log(`   📍 Premier jour ouvré avant: ${dateRepriseStr}`);
  
  // 2. Vérifier si disponible
  let resultat = await trouverCreneauDisponible(dateReprise, matriculeAgent);
  
  if (resultat.message) {
    dernierMessage = resultat.message;
    console.log(`   ${resultat.message}`);
  }
  
  // 3. Si pas disponible, chercher un jour après
  if (!resultat.trouve) {
    console.log(`\n   🔍 Recherche d'un autre jour disponible...`);
    
    let joursRecherche = 1;
    let dateTemp = new Date(dateReprise);
    let tentatives = [];
    
    while (joursRecherche <= 14) {
      dateTemp.setDate(dateReprise.getDate() + joursRecherche);
      
      if (await planningService.estJourOuvre(dateTemp)) {
        const dateTestStr = dateTemp.toISOString().split('T')[0];
        const jourTest = dateTemp.toLocaleDateString('fr-FR', { weekday: 'long' });
        
        console.log(`   🔍 Test J+${joursRecherche}: ${dateTestStr} (${jourTest})`);
        
        resultat = await trouverCreneauDisponible(dateTemp, matriculeAgent);
        
        if (resultat.message) {
          tentatives.push(`${dateTestStr} (${jourTest}): ${resultat.message}`);
        }
        
        if (resultat.trouve) {
          dateReprise = dateTemp;
          dateRepriseStr = dateTestStr;
          dernierMessage = `✅ Date de reprise trouvée le ${dateTestStr} (${jourTest}) après ${joursRecherche} jour(s) de recherche.`;
          break;
        }
      }
      joursRecherche++;
    }
    
    if (!resultat.trouve && tentatives.length > 0) {
      dernierMessage = `❌ Impossible de planifier la visite de reprise pour ${agentNom}. Raisons: ${tentatives.join('; ')}`;
    }
  } else {
    dernierMessage = `✅ Date de reprise idéale disponible le ${dateRepriseStr} (${dateReprise.toLocaleDateString('fr-FR', { weekday: 'long' })}).`;
  }
  
  return { date: dateReprise, creneau: resultat, trouve: resultat.trouve, message: dernierMessage };
}

// ========== FONCTION POUR GÉRER LES VISITES PÉRIODIQUES APRÈS ACCIDENT ==========
async function gererVisitesPeriodiquesApresAccident(agent, dateAccident, dateRepriseStr, userId) {
  console.log(`\n📋 Vérification des visites périodiques après accident...`);
  
  // Vérifier si l'agent a une visite périodique planifiée APRÈS la date de l'accident
  const visitePeriodiqueApresAccident = await Planning.findOne({
    where: {
      matricule_agent: agent.matricule_agent,
      type_visite: 'Périodique',
      statut: 'Programmé',
      date_visite: { [Op.gt]: dateAccident }
    }
  });
  
  if (!visitePeriodiqueApresAccident) {
    console.log(`   ✅ Aucune visite périodique à reprogrammer`);
    return null;
  }
  
  const ancienneDate = visitePeriodiqueApresAccident.date_visite;
  const ancienneHeure = visitePeriodiqueApresAccident.heure_visite;
  const motifAnnulation = `Annulé automatiquement suite à accident du ${dateAccident} - Visite de reprise programmée le ${dateRepriseStr}`;
  
  console.log(`   ⚠️ Visite périodique trouvée le ${ancienneDate} (APRÈS accident du ${dateAccident})`);
  
  // 1. Annuler l'ancienne visite périodique avec motif
  await visitePeriodiqueApresAccident.update({
    statut: 'Annulé',
    motif_annulation: motifAnnulation
  });
  
  console.log(`   ✅ Ancienne visite périodique annulée - Motif: ${motifAnnulation}`);
  
  // 2. Calculer la nouvelle date (après la visite de reprise + 14 jours)
  const dateRepriseObj = new Date(dateRepriseStr);
  const nouvelleDatePeriodique = new Date(dateRepriseObj);
  nouvelleDatePeriodique.setDate(dateRepriseObj.getDate() + 14);
  
  // Ajuster au jour ouvré
  let datePeriodiqueValide = nouvelleDatePeriodique;
  let joursRecherche = 0;
  while (!(await planningService.estJourOuvre(datePeriodiqueValide)) && joursRecherche < 14) {
    datePeriodiqueValide.setDate(nouvelleDatePeriodique.getDate() + joursRecherche + 1);
    joursRecherche++;
  }
  
  const nouvelleDateStr = datePeriodiqueValide.toISOString().split('T')[0];
  
  // 3. Chercher un créneau disponible
  const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
  let nouveauCreneau = null;
  
  for (const heure of creneaux) {
    const existe = await Planning.findOne({
      where: {
        date_visite: nouvelleDateStr,
        heure_visite: heure,
        statut: 'Programmé'
      }
    });
    if (!existe) {
      nouveauCreneau = heure;
      break;
    }
  }
  
  if (nouveauCreneau) {
    // 4. Créer la nouvelle visite périodique avec mention de reprogrammation
    const nouveauPlanning = await Planning.create({
      matricule_agent: agent.matricule_agent,
      date_visite: nouvelleDateStr,
      heure_visite: nouveauCreneau,
      type_visite: 'Périodique',
      statut: 'Programmé',
      priorite: visitePeriodiqueApresAccident.priorite,
      semaine: planningService.getNumeroSemaine(datePeriodiqueValide),
      annee: datePeriodiqueValide.getFullYear(),
      created_by: userId,
      convocation_envoyee: false,
      motif_reprogrammation: `Reprogrammée automatiquement suite à accident du ${dateAccident} (ancienne date: ${ancienneDate}) - Nouvelle date après reprise du ${dateRepriseStr}`,
      source_planification: 'auto',
      reprogrammee: true
    });
    
    console.log(`   ✅ Nouvelle visite périodique reprogrammée le ${nouvelleDateStr} à ${nouveauCreneau.substring(0,5)}`);
    
    // Créer l'historique
    await Visite.create({
      matricule_agent: agent.matricule_agent,
      date_visite: nouvelleDateStr,
      heure_visite: nouveauCreneau,
      type_visite: 'Périodique',
      medecin: 'Système',
      observation: `Reprogrammation automatique suite à accident du ${dateAccident}`,
      id_planning: nouveauPlanning.id_planning,
      type_action: 'REPROGRAMMEE',
      ancien_statut: 'Programmé',
      nouveau_statut: 'Programmé',
      motif_action: `Reprogrammation automatique - Accident le ${dateAccident}`,
      details_action: JSON.stringify({
        ancienne_date: ancienneDate,
        ancienne_heure: ancienneHeure,
        nouvelle_date: nouvelleDateStr,
        nouvelle_heure: nouveauCreneau,
        raison: 'accident'
      }),
      source: 'PLANNING',
      created_by: userId
    });
    
    return nouveauPlanning;
  } else {
    console.log(`   ⚠️ Aucun créneau disponible pour reprogrammer la visite périodique`);
    return null;
  }
}

// ========== RÉCUPÉRER TOUS LES AGENTS ==========
router.get('/agents', protect, async (req, res) => {
  try {
    const agents = await Agent.findAll({
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      order: [['nom', 'ASC']]
    });
    res.json({ success: true, agents });
  } catch (error) {
    console.error('❌ Erreur agents:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ========== CRÉER UN ACCIDENT ==========
router.post('/accidents', protect, async (req, res) => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚑 CRÉATION D\'ACCIDENT DE TRAVAIL');
    console.log('='.repeat(70));
    console.log('📦 Données reçues:', req.body);
    
    const accidentData = { ...req.body };
    
    // Nettoyer les dates vides
    if (accidentData.date_pv === '') accidentData.date_pv = null;
    if (accidentData.date_accident === '') accidentData.date_accident = null;
    
    accidentData.created_by = req.user.id;
    
    // Générer numéro accident
    const lastAccident = await Accident.findOne({ order: [['id_accident', 'DESC']] });
    const year = new Date().getFullYear();
    const nextNum = lastAccident ? lastAccident.id_accident + 1 : 1;
    accidentData.numero_accident = `ACC-${year}-${nextNum.toString().padStart(4, '0')}`;
    
    const accident = await Accident.create(accidentData);
    
    console.log(`\n✅ Accident créé: ${accident.numero_accident}`);
    console.log(`   jour_arret = ${accident.jour_arret}`);
    console.log(`   matricule_agent = ${accident.matricule_agent}`);
    
    // ========== TRAITEMENT DE L'ARRÊT AVEC REPRISE ==========
    if (accident.jour_arret > 0) {
      console.log('\n' + '='.repeat(70));
      console.log('🔄 PLANIFICATION VISITE DE REPRISE');
      console.log('='.repeat(70));
      
      try {
        const agent = await Agent.findByPk(accident.matricule_agent);
        
        if (!agent) {
          console.log(`❌ Agent #${accident.matricule_agent} non trouvé`);
          return res.status(404).json({ 
            success: false, 
            message: 'Agent non trouvé' 
          });
        }
        
        console.log(`👤 Agent: ${agent.nom} ${agent.prenom} (Matricule: ${agent.matricule_agent})`);
        
        // ÉTAPE 1: Calcul de la date de fin d'arrêt
        const dateAccident = new Date(accident.date_accident);
        const dateFinArret = new Date(dateAccident);
        dateFinArret.setDate(dateAccident.getDate() + accident.jour_arret);
        const dateFinStr = dateFinArret.toISOString().split('T')[0];
        
        console.log(`\n📅 ÉTAPE 1: Calcul fin d'inaptitude`);
        console.log(`   Date accident: ${accident.date_accident}`);
        console.log(`   + ${accident.jour_arret} jours`);
        console.log(`   = Fin inaptitude: ${dateFinStr}`);
        
        // ÉTAPE 2: Mettre à jour l'agent
        await agent.update({
          date_debut_inaptitude: accident.date_accident,
          date_fin_inaptitude: dateFinStr
        });
        
        console.log(`   ✅ Agent mis à jour (inaptitude du ${accident.date_accident} au ${dateFinStr})`);
        
        // Appel de la fonction pour la reprise
        const { date: dateReprise, creneau, trouve: repriseTrouvee, message: repriseMessage } = await trouverDateRepriseValide(dateFinArret, accident.matricule_agent, `${agent.nom} ${agent.prenom}`);
        
        console.log(`\n📋 ${repriseMessage}`);
        
        if (!repriseTrouvee) {
          console.log(`\n❌ ${repriseMessage}`);
          return res.status(400).json({ 
            success: false, 
            message: repriseMessage 
          });
        }
        
        const dateRepriseStr = dateReprise.toISOString().split('T')[0];
        const typeVisite = accident.jour_arret > 30 ? 'Reclassement' : 'Reprise';
        
        console.log(`\n📅 ÉTAPE 2: Date de reprise retenue`);
        console.log(`   Date: ${dateRepriseStr}`);
        console.log(`   Jour: ${dateReprise.toLocaleDateString('fr-FR', { weekday: 'long' })}`);
        console.log(`   Heure: ${creneau.heure}`);
        console.log(`   Type: ${typeVisite}`);
        
        // Appeler la fonction APRÈS avoir dateRepriseStr
        await gererVisitesPeriodiquesApresAccident(agent, accident.date_accident, dateRepriseStr, req.user.id);
        
        // Créer la visite dans le planning
        const planning = await Planning.create({
          matricule_agent: agent.matricule_agent,
          date_visite: dateRepriseStr,
          heure_visite: creneau.heure,
          type_visite: typeVisite,
          statut: 'Programmé',
          priorite: 150,
          semaine: planningService.getNumeroSemaine(dateReprise),
          annee: dateReprise.getFullYear(),
          created_by: req.user.id,
          convocation_envoyee: false,
          motif_reprogrammation: `Visite ${typeVisite} post-accident (${accident.numero_accident})`,
          source_planification: 'auto'
        });
        
        // Mettre à jour date_prochaine_inaptitude
        await agent.update({
          date_prochaine_inaptitude: dateRepriseStr
        });
        
        console.log(`\n✅ VISITE DE ${typeVisite.toUpperCase()} CRÉÉE:`);
        console.log(`   ID Planning: ${planning.id_planning}`);
        console.log(`   Date: ${dateRepriseStr}`);
        console.log(`   Heure: ${creneau.heure}`);
        
        // Créer l'historique
        await Visite.create({
          matricule_agent: agent.matricule_agent,
          date_visite: dateRepriseStr,
          heure_visite: creneau.heure,
          type_visite: typeVisite,
          medecin: 'Système',
          observation: `Programmation automatique pour ${typeVisite} post-accident (${accident.numero_accident})`,
          id_planning: planning.id_planning,
          type_action: 'PROGRAMMATION',
          ancien_statut: null,
          nouveau_statut: 'Programmé',
          motif_action: `Programmation automatique - ${typeVisite} post-accident`,
          details_action: JSON.stringify({
            accident_id: accident.id_accident,
            numero_accident: accident.numero_accident,
            date_accident: accident.date_accident,
            date_fin_arret: dateFinStr,
            date_reprise_retenue: dateRepriseStr,
            heure_reprise: creneau.heure,
            jours_arret: accident.jour_arret,
            type_visite: typeVisite
          }),
          source: 'PLANNING',
          created_by: req.user.id
        });
        
        console.log('\n' + '='.repeat(70));
        console.log('✅ VISITE DE REPRISE PROGRAMMÉE AVEC SUCCÈS !');
        console.log('='.repeat(70));
        
        res.status(201).json({ 
          success: true, 
          message: `Accident créé - Visite de ${typeVisite} programmée pour le ${dateRepriseStr} à ${creneau.heure.substring(0,5)}`, 
          accident,
          visite_planifiee: {
            id: planning.id_planning,
            date: dateRepriseStr,
            heure: creneau.heure,
            type: typeVisite
          }
        });
        
      } catch (error) {
        console.error('❌ Erreur traitement:', error);
        throw error;
      }
    } else {
      console.log('\nℹ️ Aucun arrêt de travail - Pas de visite de reprise à planifier');
      res.status(201).json({ 
        success: true, 
        message: 'Accident créé (sans arrêt de travail)', 
        accident 
      });
    }
    
  } catch (error) {
    console.error('❌ Erreur création accident:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== RÉCUPÉRER TOUS LES ACCIDENTS ==========
router.get('/accidents', protect, async (req, res) => {
  try {
    const accidents = await Accident.findAll({
      order: [['date_accident', 'DESC']],
      raw: true
    });
    
    const matricules = [...new Set(accidents.map(a => a.matricule_agent))];
    const agents = await Agent.findAll({
      where: { matricule_agent: { [Op.in]: matricules } },
      attributes: ['matricule_agent', 'nom', 'prenom'],
      raw: true
    });
    
    const agentsMap = new Map();
    agents.forEach(agent => {
      agentsMap.set(agent.matricule_agent, agent);
    });
    
    const accidentsEnrichis = accidents.map(a => ({
      ...a,
      accidentAgent: agentsMap.get(a.matricule_agent) || null
    }));
    
    res.json({ success: true, accidents: accidentsEnrichis });
  } catch (error) {
    console.error('❌ Erreur accidents:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ========== STATISTIQUES ==========
router.get('/accidents/stats', protect, async (req, res) => {
  try {
    const total = await Accident.count();
    const declares = await Accident.count({ where: { statut: 'declare' } });
    const brouillons = await Accident.count({ where: { statut: 'brouillon' } });
    
    const parGravite = {
      faible: await Accident.count({ where: { gravite: 'Faible' } }),
      moyenne: await Accident.count({ where: { gravite: 'Moyenne' } }),
      elevee: await Accident.count({ where: { gravite: 'Élevée' } }),
      critique: await Accident.count({ where: { gravite: 'Critique' } })
    };
    
    const parMois = Array(12).fill(0);
    const accidentsParMois = await Accident.findAll({
      attributes: [
        [Accident.sequelize.fn('MONTH', Accident.sequelize.col('date_accident')), 'mois'],
        [Accident.sequelize.fn('COUNT', '*'), 'count']
      ],
      where: Accident.sequelize.where(
        Accident.sequelize.fn('YEAR', Accident.sequelize.col('date_accident')),
        new Date().getFullYear()
      ),
      group: [Accident.sequelize.fn('MONTH', Accident.sequelize.col('date_accident'))],
      raw: true
    });
    
    accidentsParMois.forEach(item => {
      const mois = parseInt(item.mois) - 1;
      parMois[mois] = parseInt(item.count);
    });
    
    res.json({
      success: true,
      stats: { total, declares, brouillons, parGravite, parMois }
    });
  } catch (error) {
    console.error('❌ Erreur stats:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ========== RÉCUPÉRER UN ACCIDENT PAR ID ==========
router.get('/accidents/:id', protect, async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id, { raw: true });
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    }
    
    const agent = await Agent.findOne({
      where: { matricule_agent: accident.matricule_agent },
      attributes: ['matricule_agent', 'nom', 'prenom'],
      raw: true
    });
    
    res.json({ 
      success: true, 
      accident: {
        ...accident,
        accidentAgent: agent || null
      }
    });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ========== METTRE À JOUR UN ACCIDENT ==========
router.put('/accidents/:id', protect, async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id);
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    }

    if (accident.statut === 'declare') {
      return res.status(403).json({ 
        success: false, 
        message: 'Impossible de modifier un accident déjà déclaré à la CNAM' 
      });
    }

    const accidentData = { ...req.body };
    if (accidentData.date_pv === '') accidentData.date_pv = null;
    if (accidentData.date_accident === '') accidentData.date_accident = null;
    
    accidentData.updated_by = req.user.id;

    await accident.update(accidentData);

    const updatedAccident = await Accident.findByPk(req.params.id, { raw: true });
    
    const agent = await Agent.findOne({
      where: { matricule_agent: updatedAccident.matricule_agent },
      attributes: ['matricule_agent', 'nom', 'prenom'],
      raw: true
    });

    res.json({ 
      success: true, 
      message: 'Accident modifié avec succès', 
      accident: {
        ...updatedAccident,
        accidentAgent: agent || null
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur modification:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de la modification' 
    });
  }
});

// ========== SUPPRIMER UN ACCIDENT ==========
router.delete('/accidents/:id', protect, async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id);
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    }

    if (accident.statut === 'declare') {
      return res.status(403).json({ 
        success: false, 
        message: 'Impossible de supprimer un accident déjà déclaré à la CNAM' 
      });
    }

    await accident.destroy();
    
    res.json({ 
      success: true, 
      message: 'Accident supprimé avec succès' 
    });
    
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Erreur lors de la suppression' 
    });
  }
});

// ========== CHANGER LE STATUT D'UN ACCIDENT ==========
router.patch('/accidents/:id/statut', protect, async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id);
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    }
    
    accident.statut = req.body.statut;
    if (req.body.statut === 'declare') {
      accident.date_declaration_cnam = new Date().toLocaleString('fr-FR');
    }
    accident.updated_by = req.user.id;
    await accident.save();
    
    res.json({ success: true, message: 'Statut mis à jour', accident });
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;