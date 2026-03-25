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

// ========== FONCTION POUR TROUVER UN CRÉNEAU DISPONIBLE ==========
async function trouverCreneauDisponible(dateVisite) {
  const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
  const dateStr = dateVisite.toISOString().split('T')[0];
  
  console.log(`   🔍 Recherche créneau pour le ${dateStr}`);
  
  for (const heure of creneaux) {
    const existe = await Planning.findOne({
      where: {
        date_visite: dateStr,
        heure_visite: heure,
        statut: 'Programmé'
      }
    });
    
    if (!existe) {
      console.log(`   ✅ Créneau disponible: ${dateStr} à ${heure}`);
      return { date: dateVisite, heure, trouve: true };
    } else {
      console.log(`   ⚠️ ${dateStr} à ${heure} est déjà occupé`);
    }
  }
  
  console.log(`   ❌ Aucun créneau disponible le ${dateStr}`);
  return { trouve: false };
}

// ========== FONCTION POUR TROUVER UNE DATE DE REPRISE VALIDE ==========
async function trouverDateRepriseValide(dateFinArret) {
  // Règle: Reprise = Fin d'arrêt - 3 jours
  const dateRepriseIdeale = new Date(dateFinArret);
  dateRepriseIdeale.setDate(dateFinArret.getDate() - 3);
  
  console.log(`\n📅 Date reprise idéale: ${dateRepriseIdeale.toISOString().split('T')[0]}`);
  console.log(`   Jour: ${dateRepriseIdeale.toLocaleDateString('fr-FR', { weekday: 'long' })}`);
  
  // 1. Chercher un jour ouvré AVANT la date idéale (priorité absolue)
  let dateReprise = await getJourOuvreAvant(dateRepriseIdeale);
  let dateRepriseStr = dateReprise.toISOString().split('T')[0];
  
  console.log(`   📍 Premier jour ouvré avant: ${dateRepriseStr}`);
  
  // 2. Vérifier si on peut avoir un créneau à cette date
  let creneau = await trouverCreneauDisponible(dateReprise);
  
  // 3. Si pas de créneau disponible, chercher un jour après
  if (!creneau.trouve) {
    console.log(`\n   ⚠️ Aucun créneau disponible le ${dateRepriseStr}, recherche après...`);
    
    let joursRecherche = 1;
    let dateTemp = new Date(dateReprise);
    
    while (joursRecherche <= 14) {
      dateTemp.setDate(dateReprise.getDate() + joursRecherche);
      
      if (await planningService.estJourOuvre(dateTemp)) {
        dateRepriseStr = dateTemp.toISOString().split('T')[0];
        console.log(`   🔍 Test date J+${joursRecherche}: ${dateRepriseStr}`);
        
        creneau = await trouverCreneauDisponible(dateTemp);
        if (creneau.trouve) {
          dateReprise = dateTemp;
          break;
        }
      }
      joursRecherche++;
    }
  }
  
  return { date: dateReprise, creneau, trouve: creneau.trouve };
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
      
      const transaction = await sequelizeLocal.transaction();
      
      try {
        const agent = await Agent.findByPk(accident.matricule_agent);
        
        if (!agent) {
          console.log(`❌ Agent #${accident.matricule_agent} non trouvé`);
          await transaction.rollback();
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
        
        // ÉTAPE 3: Trouver une date de reprise valide
        const { date: dateReprise, creneau, trouve: repriseTrouvee } = await trouverDateRepriseValide(dateFinArret);
        
        if (!repriseTrouvee) {
          console.log(`\n❌ Aucune date de reprise disponible dans les 14 jours suivants`);
          await transaction.rollback();
          return res.status(400).json({ 
            success: false, 
            message: 'Aucune date de reprise disponible. Veuillez contacter l\'administrateur.' 
          });
        }
        
        const dateRepriseStr = dateReprise.toISOString().split('T')[0];
        const typeVisite = accident.jour_arret > 30 ? 'Reclassement' : 'Reprise';
        
        console.log(`\n📅 ÉTAPE 2: Date de reprise retenue`);
        console.log(`   Date: ${dateRepriseStr}`);
        console.log(`   Jour: ${dateReprise.toLocaleDateString('fr-FR', { weekday: 'long' })}`);
        console.log(`   Heure: ${creneau.heure}`);
        console.log(`   Type: ${typeVisite}`);
        
        // ÉTAPE 4: Créer la visite dans le planning
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
        }, { transaction });
        
        console.log(`\n✅ VISITE DE ${typeVisite.toUpperCase()} CRÉÉE:`);
        console.log(`   ID Planning: ${planning.id_planning}`);
        console.log(`   Date: ${dateRepriseStr}`);
        console.log(`   Heure: ${creneau.heure}`);
        
        // ÉTAPE 5: Créer l'historique
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
        }, { transaction });
        
        await transaction.commit();
        
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
        await transaction.rollback();
        console.error('❌ Erreur transaction:', error);
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