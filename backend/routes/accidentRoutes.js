// backend/routes/accidentRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const db = require('../models');
const { Op } = require('sequelize');
const planningService = require('../services/planningService');
const { sequelizeGlobal, sequelizeLocal } = require('../config/database');

const cnamDeclarationService = require('../services/cnamDeclarationService');
const { Packer } = require('docx');

// Récupérer les modèles
const Accident = db.local.Accident;
const Agent = db.global.Agent;
const Planning = db.local.Planning;
const Visite = db.local.Visite;

// ========== FONCTION POUR TROUVER UN CRÉNEAU DISPONIBLE POUR LA REPRISE ==========

async function trouverCreneauDisponiblePourReprise(dateCible, matriculeAgent, idExclu = null) {
  const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
  let dateTest = new Date(dateCible);
  let joursRecherche = 0;
  const maxJours = 30;
  
  while (joursRecherche <= maxJours) {
    const dateStr = dateTest.toISOString().split('T')[0];
    const estOuvre = await planningService.estJourOuvre(dateTest);
    
    if (estOuvre) {
      console.log(`   🔍 Vérification date: ${dateStr}`);
      
      // Vérifier si l'agent a déjà une visite CE JOUR
      const agentDejaOccupe = await Planning.findOne({
        where: {
          matricule_agent: matriculeAgent,
          date_visite: dateStr,
          statut: 'Programmé',
          visite_effectuee: false,
          id_planning: { [Op.ne]: idExclu || 0 }
        }
      });
      
      if (agentDejaOccupe) {
        console.log(`   ⚠️ Agent déjà occupé le ${dateStr}`);
        dateTest = new Date(dateCible);
        dateTest.setDate(dateCible.getDate() + joursRecherche + 1);
        joursRecherche++;
        continue;
      }
      
      for (const heure of creneaux) {
        // ✅ Vérification COMPLÈTE du créneau
        const creneauExist = await Planning.findOne({
          where: {
            date_visite: dateStr,
            heure_visite: heure,
            id_planning: { [Op.ne]: idExclu || 0 }
          }
        });
        
        let estDisponible = true;
        let raison = '';
        
        if (creneauExist) {
          if (creneauExist.visite_effectuee === true) {
            estDisponible = false;
            raison = 'EFFECTUÉE';
          } else if (creneauExist.creneau_bloque === true) {
            estDisponible = false;
            raison = 'BLOQUÉ';
          } else if (creneauExist.statut === 'Annulé') {
            estDisponible = false;
            raison = 'ANNULÉE';
          } else if (creneauExist.statut === 'Reporté') {
            estDisponible = false;
            raison = 'REPORTÉE';
          } else if (creneauExist.statut === 'Effectué') {
            estDisponible = false;
            raison = 'EFFECTUÉ';
          } else if (creneauExist.statut === 'Programmé' && creneauExist.matricule_agent !== 0 && creneauExist.matricule_agent !== matriculeAgent) {
            estDisponible = false;
            raison = 'OCCUPÉ';
          }
        }
        
        if (estDisponible) {
          console.log(`   ✅ Créneau disponible: ${dateStr} à ${heure.substring(0,5)}`);
          return { date: dateTest, heure, trouve: true };
        } else {
          console.log(`   ❌ ${dateStr} ${heure.substring(0,5)} → ${raison}`);
        }
      }
    }
    
    dateTest = new Date(dateCible);
    dateTest.setDate(dateCible.getDate() + joursRecherche + 1);
    joursRecherche++;
  }
  
  return { trouve: false, message: 'Aucun créneau disponible dans les 30 jours' };
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

// ========== RECHERCHE D'AGENTS PAR SAISIE (AUTOCOMPLETE) ==========
router.get('/agents/recherche', protect, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json({ success: true, agents: [] });
    }
    
    const [agents] = await sequelizeGlobal.query(`
      SELECT 
        matricule_agent, 
        nom, 
        prenom, 
        code_agence, 
        code_affectation,
        date_derniere_visite,
        statut
      FROM agent 
      WHERE statut = 'actif'
      AND (
        CAST(matricule_agent AS CHAR) LIKE :search
        OR LOWER(nom) LIKE :searchLower
        OR LOWER(prenom) LIKE :searchLower
        OR CONCAT(LOWER(nom), ' ', LOWER(prenom)) LIKE :searchLower
        OR CONCAT(LOWER(prenom), ' ', LOWER(nom)) LIKE :searchLower
      )
      ORDER BY 
        CASE WHEN CAST(matricule_agent AS CHAR) = :q THEN 1 ELSE 0 END DESC,
        nom ASC
      LIMIT 15
    `, {
      replacements: { 
        search: `%${q}%`,
        searchLower: `%${q.toLowerCase()}%`,
        q: q
      }
    });
    
    res.json({ success: true, agents });
  } catch (error) {
    console.error('❌ Erreur recherche agents:', error);
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

// ========== CRÉER UN ACCIDENT ==========
router.post('/accidents', protect, async (req, res) => {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🚑 CRÉATION D\'ACCIDENT DE TRAVAIL');
    console.log('='.repeat(70));
    
    const accidentData = { ...req.body };
    
    if (accidentData.date_pv === '') accidentData.date_pv = null;
    if (accidentData.date_accident === '') accidentData.date_accident = null;
    
    accidentData.created_by = req.user.id;
    
    const lastAccident = await Accident.findOne({ order: [['id_accident', 'DESC']] });
    const year = new Date().getFullYear();
    const nextNum = lastAccident ? lastAccident.id_accident + 1 : 1;
    accidentData.numero_accident = `ACC-${year}-${nextNum.toString().padStart(4, '0')}`;
    
    const accident = await Accident.create(accidentData);
    
    console.log(`\n✅ Accident créé: ${accident.numero_accident}`);
    console.log(`   jour_arret = ${accident.jour_arret}`);
    console.log(`   matricule_agent = ${accident.matricule_agent}`);
    
    if (accident.jour_arret > 0) {
      console.log('\n' + '='.repeat(70));
      console.log('🔄 PLANIFICATION VISITE DE REPRISE');
      console.log('='.repeat(70));
      
      try {
        const agent = await Agent.findByPk(accident.matricule_agent);
        
        if (!agent) {
          return res.status(404).json({ success: false, message: 'Agent non trouvé' });
        }
        
        console.log(`👤 Agent: ${agent.nom} ${agent.prenom} (Matricule: ${agent.matricule_agent})`);
        
        const dateAccident = new Date(accident.date_accident);
        const dateFinArret = new Date(dateAccident);
        dateFinArret.setDate(dateAccident.getDate() + accident.jour_arret);
        const dateFinStr = dateFinArret.toISOString().split('T')[0];
        
        console.log(`\n📅 ÉTAPE 1: Calcul fin d'inaptitude`);
        console.log(`   Date accident: ${accident.date_accident}`);
        console.log(`   + ${accident.jour_arret} jours`);
        console.log(`   = Fin inaptitude: ${dateFinStr}`);
        
        await agent.update({
          date_debut_inaptitude: accident.date_accident,
          date_fin_inaptitude: dateFinStr
        });
        console.log(`   ✅ Agent mis à jour`);
        
        const dateRepriseIdeale = new Date(dateFinArret);
        dateRepriseIdeale.setDate(dateFinArret.getDate() - 3);
        console.log(`\n📅 Date reprise idéale: ${dateRepriseIdeale.toISOString().split('T')[0]}`);
        
        const resultat = await trouverCreneauDisponiblePourReprise(dateRepriseIdeale, agent.matricule_agent);
        
        if (!resultat.trouve) {
          return res.status(400).json({ success: false, message: resultat.message || 'Aucun créneau disponible' });
        }
        
        const dateRepriseStr = resultat.date.toISOString().split('T')[0];
        const typeVisite = accident.jour_arret > 30 ? 'Reclassement' : 'Reprise';
        
        console.log(`\n📅 Date de reprise retenue: ${dateRepriseStr} à ${resultat.heure.substring(0,5)}`);
        
        // ========== RECHERCHE DE LA VISITE PÉRIODIQUE À SUPPRIMER ==========
const visitePeriodiqueApresAccident = await Planning.findOne({
  where: {
    matricule_agent: agent.matricule_agent,
    type_visite: 'Périodique',
    statut: 'Programmé',
    visite_effectuee: false,
    date_visite: { [Op.gt]: accident.date_accident }
  }
});

let visitePeriodiqueSupprimee = null;

if (visitePeriodiqueApresAccident) {
  const ancienneDatePer = visitePeriodiqueApresAccident.date_visite;
  const ancienneHeurePer = visitePeriodiqueApresAccident.heure_visite;
  
  console.log(`\n📋 Suppression de la visite périodique programmée`);
  console.log(`   Date initiale: ${ancienneDatePer} à ${ancienneHeurePer.substring(0,5)}`);
  
  // ✅ ÉTAPE 1: Supprimer les références dans la table `visite`
  await Visite.destroy({
    where: {
      id_planning: visitePeriodiqueApresAccident.id_planning
    }
  });
  
  // ✅ ÉTAPE 2: Créer un historique (sans lien vers l'ancien planning)
  await Visite.create({
    matricule_agent: agent.matricule_agent,
    date_visite: ancienneDatePer,
    heure_visite: ancienneHeurePer,
    type_visite: 'Périodique',
    id_planning: null,
    type_action: 'ANNULEE',
    ancien_statut: 'Programmé',
    nouveau_statut: 'Annulé',
    motif_action: `Annulation suite à accident du ${accident.date_accident}`,
    details_action: JSON.stringify({ 
      raison: 'accident',
      date_accident: accident.date_accident,
      numero_accident: accident.numero_accident,
      jours_arret: accident.jour_arret,
      date_visite_reprise: dateRepriseStr,
      heure_visite_reprise: resultat.heure,
      message: `La visite périodique du ${ancienneDatePer} à ${ancienneHeurePer.substring(0,5)} a été supprimée car l'agent a eu un accident de travail le ${accident.date_accident}. Une visite de reprise est programmée le ${dateRepriseStr} à ${resultat.heure.substring(0,5)}. Le créneau est totalement libéré.`
    }),
    source: 'PLANNING',
    created_by: req.user.id,
    source_originale: 'auto'
  });
  
  // ✅ ÉTAPE 3: Supprimer le planning (plus de contrainte FK)
  await visitePeriodiqueApresAccident.destroy();
  
  visitePeriodiqueSupprimee = { 
    id: visitePeriodiqueApresAccident.id_planning, 
    date: ancienneDatePer, 
    heure: ancienneHeurePer 
  };
  
  console.log(`   ✅ Visite périodique SUPPRIMÉE - Créneau totalement libéré`);
}
        
        // ========== CRÉATION DE LA VISITE DE REPRISE ==========
        const planning = await Planning.create({
          matricule_agent: agent.matricule_agent,
          date_visite: dateRepriseStr,
          heure_visite: resultat.heure,
          type_visite: typeVisite,
          statut: 'Programmé',
          priorite: 150,
          semaine: planningService.getNumeroSemaine(resultat.date),
          annee: resultat.date.getFullYear(),
          created_by: req.user.id,
          convocation_envoyee: false,
          motif_reprogrammation: `Visite ${typeVisite} post-accident (${accident.numero_accident})`,
          source_planification: 'auto'
        });
        
        // Historique de la création
        await Visite.create({
          matricule_agent: agent.matricule_agent,
          date_visite: dateRepriseStr,
          heure_visite: resultat.heure,
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
            heure_reprise: resultat.heure,
            jours_arret: accident.jour_arret,
            type_visite: typeVisite,
            visite_periodique_supprimee: visitePeriodiqueSupprimee ? {
              id: visitePeriodiqueSupprimee.id,
              date: visitePeriodiqueSupprimee.date,
              heure: visitePeriodiqueSupprimee.heure,
              motif: `Supprimée suite à accident du ${accident.date_accident}`,
              message: `La visite périodique prévue le ${visitePeriodiqueSupprimee.date} à ${visitePeriodiqueSupprimee.heure.substring(0,5)} a été supprimée car l'agent a eu un accident de travail.`
            } : null,
            message: `Visite de ${typeVisite} programmée suite à l'accident du ${accident.date_accident}.${visitePeriodiqueSupprimee ? ` La visite périodique du ${visitePeriodiqueSupprimee.date} a été supprimée et le créneau libéré.` : ''}`
          }),
          source: 'PLANNING',
          created_by: req.user.id,
          source_originale: 'auto'
        });
        
        console.log('\n✅ VISITE DE REPRISE PROGRAMMÉE AVEC SUCCÈS !');
        
        res.status(201).json({ 
          success: true, 
          message: `Accident créé - Visite de ${typeVisite} programmée pour le ${dateRepriseStr} à ${resultat.heure.substring(0,5)}${visitePeriodiqueSupprimee ? ' - Visite périodique supprimée et créneau libéré' : ''}`, 
          accident,
          visite_planifiee: { id: planning.id_planning, date: dateRepriseStr, heure: resultat.heure, type: typeVisite },
          visite_periodique_supprimee: visitePeriodiqueSupprimee
        });
        
      } catch (error) {
        console.error('❌ Erreur traitement:', error);
        throw error;
      }
    } else {
      console.log('\nℹ️ Aucun arrêt de travail - Pas de visite de reprise à planifier');
      res.status(201).json({ success: true, message: 'Accident créé (sans arrêt de travail)', accident });
    }
    
  } catch (error) {
    console.error('❌ Erreur création accident:', error);
    res.status(500).json({ success: false, message: error.message });
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

    const ancienJoursArret = accident.jour_arret;
    const ancienneDateAccident = accident.date_accident;
    
    const accidentData = { ...req.body };
    if (accidentData.date_pv === '') accidentData.date_pv = null;
    if (accidentData.date_accident === '') accidentData.date_accident = null;
    
    accidentData.updated_by = req.user.id;

    await accident.update(accidentData);
    
    // ========== SI MODIFICATION DES DATES DE L'ACCIDENT ==========
    if ((accident.jour_arret !== ancienJoursArret) || (accident.date_accident !== ancienneDateAccident)) {
      console.log(`\n📅 Modification accident détectée`);
      console.log(`   Anciens jours: ${ancienJoursArret} → Nouveaux jours: ${accident.jour_arret}`);
      console.log(`   Ancienne date: ${ancienneDateAccident} → Nouvelle: ${accident.date_accident}`);
      
      if (accident.jour_arret > 0) {
        const agent = await Agent.findByPk(accident.matricule_agent);
        
        if (agent) {
          try {
            // ========== 1. CALCULER LA NOUVELLE DATE FIN INAPTITUDE ==========
            const dateAccident = new Date(accident.date_accident);
            const nouvelleDateFin = new Date(dateAccident);
            nouvelleDateFin.setDate(dateAccident.getDate() + accident.jour_arret);
            const nouvelleDateFinStr = nouvelleDateFin.toISOString().split('T')[0];
            
            console.log(`\n📅 Nouvelle fin d'inaptitude: ${nouvelleDateFinStr}`);
            
            // Mettre à jour l'agent
            await agent.update({
              date_debut_inaptitude: accident.date_accident,
              date_fin_inaptitude: nouvelleDateFinStr
            });
            
            // ========== 2. ANNULER LA VISITE PÉRIODIQUE SI ELLE EXISTE ==========
            const visitePeriodique = await Planning.findOne({
              where: {
                matricule_agent: agent.matricule_agent,
                type_visite: 'Périodique',
                statut: 'Programmé',
                visite_effectuee: false
              }
            });
            
            if (visitePeriodique) {
              console.log(`\n📋 Annulation de la visite périodique: ${visitePeriodique.date_visite}`);
              
              await Visite.create({
                matricule_agent: agent.matricule_agent,
                date_visite: visitePeriodique.date_visite,
                heure_visite: visitePeriodique.heure_visite,
                type_visite: 'Périodique',
                id_planning: visitePeriodique.id_planning,
                type_action: 'ANNULEE',
                ancien_statut: visitePeriodique.statut,
                nouveau_statut: 'Annulé',
                motif_action: `Annulation suite à modification accident - Agent en inaptitude jusqu'au ${nouvelleDateFinStr}`,
                details_action: JSON.stringify({
                  raison: 'modification_accident',
                  nouvelle_date_fin_inaptitude: nouvelleDateFinStr,
                  date_accident: accident.date_accident,
                  jours_arret: accident.jour_arret
                }),
                source: 'PLANNING',
                created_by: req.user.id,
                source_originale: visitePeriodique.source_originale
              });
              
              await visitePeriodique.destroy();
              console.log(`   ✅ Visite périodique annulée et supprimée`);
            }
            
            // ========== 3. RECHERCHER OU METTRE À JOUR LA VISITE DE REPRISE ==========
            const dateRepriseIdeale = new Date(nouvelleDateFin);
            dateRepriseIdeale.setDate(nouvelleDateFin.getDate() - 3);
            
            console.log(`\n📅 Date reprise idéale: ${dateRepriseIdeale.toISOString().split('T')[0]}`);
            
            // Chercher une visite de reprise existante
            let visiteRepriseExistante = await Planning.findOne({
              where: {
                matricule_agent: agent.matricule_agent,
                type_visite: ['Reprise', 'Reclassement'],
                statut: 'Programmé',
                visite_effectuee: false
              }
            });
            
            const typeVisite = accident.jour_arret > 30 ? 'Reclassement' : 'Reprise';
            
            // Chercher un créneau disponible pour la reprise
            const resultat = await trouverCreneauDisponiblePourReprise(
              dateRepriseIdeale, 
              agent.matricule_agent,
              visiteRepriseExistante ? visiteRepriseExistante.id_planning : null
            );
            
            if (!resultat.trouve) {
              console.log(`   ⚠️ Aucun créneau disponible pour la reprise`);
            } else {
              const nouvelleDateRepriseStr = resultat.date.toISOString().split('T')[0];
              const nouvelleHeureReprise = resultat.heure;
              
              if (visiteRepriseExistante) {
                // ========== METTRE À JOUR LA REPRISE EXISTANTE ==========
                const ancienneDateReprise = visiteRepriseExistante.date_visite;
                const ancienneHeureReprise = visiteRepriseExistante.heure_visite;
                
                console.log(`\n📋 Mise à jour de la visite de reprise existante`);
                console.log(`   Ancienne: ${ancienneDateReprise} à ${ancienneHeureReprise.substring(0,5)}`);
                console.log(`   Nouvelle: ${nouvelleDateRepriseStr} à ${nouvelleHeureReprise.substring(0,5)}`);
                
                await visiteRepriseExistante.update({
                  date_visite: nouvelleDateRepriseStr,
                  heure_visite: nouvelleHeureReprise,
                  type_visite: typeVisite,
                  priorite: 150,
                  motif_reprogrammation: `Date recalculée suite à modification accident - ${accident.jour_arret} jours d'arrêt`,
                  semaine: planningService.getNumeroSemaine(resultat.date),
                  annee: resultat.date.getFullYear()
                });
                
                await Visite.create({
                  matricule_agent: agent.matricule_agent,
                  date_visite: nouvelleDateRepriseStr,
                  heure_visite: nouvelleHeureReprise,
                  type_visite: typeVisite,
                  id_planning: visiteRepriseExistante.id_planning,
                  type_action: 'REPROGRAMMEE',
                  ancien_statut: 'Programmé',
                  nouveau_statut: 'Programmé',
                  motif_action: `Reprogrammation suite à modification accident - ${accident.jour_arret} jours d'arrêt`,
                  details_action: JSON.stringify({ 
                    raison: 'modification_accident',
                    anciens_jours_arret: ancienJoursArret,
                    nouveaux_jours_arret: accident.jour_arret,
                    nouvelle_date_fin_inaptitude: nouvelleDateFinStr,
                    ancienne_date_reprise: ancienneDateReprise,
                    ancienne_heure_reprise: ancienneHeureReprise,
                    nouvelle_date_reprise: nouvelleDateRepriseStr,
                    nouvelle_heure_reprise: nouvelleHeureReprise,
                    visite_periodique_annulee: true
                  }),
                  source: 'PLANNING',
                  created_by: req.user.id,
                  source_originale: 'auto'
                });
                
                console.log(`   ✅ Visite de reprise mise à jour`);
                
              } else {
                // ========== CRÉER UNE NOUVELLE VISITE DE REPRISE ==========
                console.log(`\n📋 Création d'une nouvelle visite de reprise`);
                console.log(`   Date: ${nouvelleDateRepriseStr} à ${nouvelleHeureReprise.substring(0,5)}`);
                
                const nouveauPlanning = await Planning.create({
                  matricule_agent: agent.matricule_agent,
                  date_visite: nouvelleDateRepriseStr,
                  heure_visite: nouvelleHeureReprise,
                  type_visite: typeVisite,
                  statut: 'Programmé',
                  priorite: 150,
                  semaine: planningService.getNumeroSemaine(resultat.date),
                  annee: resultat.date.getFullYear(),
                  created_by: req.user.id,
                  convocation_envoyee: false,
                  motif_reprogrammation: `Visite ${typeVisite} post-modification accident (${accident.numero_accident})`,
                  source_planification: 'auto',
                  source_originale: 'auto'
                });
                
                await Visite.create({
                  matricule_agent: agent.matricule_agent,
                  date_visite: nouvelleDateRepriseStr,
                  heure_visite: nouvelleHeureReprise,
                  type_visite: typeVisite,
                  medecin: 'Système',
                  observation: `Programmation automatique suite à modification accident`,
                  id_planning: nouveauPlanning.id_planning,
                  type_action: 'PROGRAMMATION',
                  ancien_statut: null,
                  nouveau_statut: 'Programmé',
                  motif_action: `Programmation ${typeVisite} post-modification accident`,
                  details_action: JSON.stringify({
                    accident_id: accident.id_accident,
                    date_accident: accident.date_accident,
                    jours_arret: accident.jour_arret,
                    date_reprise: nouvelleDateRepriseStr,
                    visite_periodique_annulee: visitePeriodique ? true : false
                  }),
                  source: 'PLANNING',
                  created_by: req.user.id,
                  source_originale: 'auto'
                });
                
                console.log(`   ✅ Nouvelle visite de ${typeVisite} créée`);
              }
            }
          } catch (error) {
            console.error('❌ Erreur mise à jour des visites:', error);
          }
        }
      }
    }

    const updatedAccident = await Accident.findByPk(req.params.id, { raw: true });
    
    const agent = await Agent.findOne({
      where: { matricule_agent: updatedAccident.matricule_agent },
      attributes: ['matricule_agent', 'nom', 'prenom'],
      raw: true
    });

    res.json({ 
      success: true, 
      message: 'Accident modifié avec succès' + (accident.jour_arret !== ancienJoursArret ? ' - Visites recalculées' : ''), 
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

// ========== RÉCUPÉRER LES DONNÉES POUR DÉCLARATION CNAM ==========
router.get('/accidents/:id/cnam-data', protect, async (req, res) => {
  try {
    console.log('🔍 Récupération données CNAM pour accident:', req.params.id);
    
    const accident = await Accident.findByPk(req.params.id, { raw: true });
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    }
    
    console.log('✅ Accident trouvé:', accident.id_accident);
    
    const agent = await Agent.findOne({
      where: { matricule_agent: accident.matricule_agent },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation', 'date_naissance', 'direction']
    });
    
    console.log('✅ Agent trouvé:', agent?.nom, agent?.prenom);
    
    res.json({ 
      success: true, 
      accident: {
        id_accident: accident.id_accident,
        numero_accident: accident.numero_accident,
        date_accident: accident.date_accident,
        lieu_accident: accident.lieu_accident,
        nature_blessures: accident.nature_blessures,
        jour_arret: accident.jour_arret,
        heure_accident: accident.heure_accident,
        condition_accident: accident.condition_accident,
        endroit_blessures: accident.endroit_blessures,
        temoin1: accident.temoin1,
        temoin2: accident.temoin2
      }, 
      agent 
    });
  } catch (error) {
    console.error('❌ Erreur cnam-data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== CONFIRMER LA DÉCLARATION CNAM ==========
router.post('/accidents/:id/declarer-cnam', protect, async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id);
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    }
    
    const declarationData = req.body;
    
    await accident.update({
      statut: 'declare',
      date_declaration_cnam: new Date().toLocaleString('fr-FR'),
      updated_by: req.user.id
    });
    
    console.log(`✅ Accident ${accident.numero_accident} déclaré à la CNAM`);
    
    res.json({ success: true, message: 'Accident déclaré à la CNAM avec succès', accident });
  } catch (error) {
    console.error('❌ Erreur déclaration CNAM:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


router.post('/accidents/:id/declaration-cnam', protect, async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id);
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    }

    const agent = await Agent.findOne({
      where: { matricule_agent: accident.matricule_agent },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      raw: true
    });

    const responsableInfo = req.body.responsable || {
      nom: req.user?.nom || '_________________________',
      prenom: req.user?.prenom || '_________________________'
    };

    // Générer le document
    const doc = cnamDeclarationService.genererDeclarationCNAM(accident, agent, responsableInfo);
    const buffer = await Packer.toBuffer(doc);
    
    // ✅ MARQUER L'ACCIDENT COMME DÉCLARÉ
    await accident.update({
      statut: 'declare',
      date_declaration_cnam: new Date().toLocaleString('fr-FR'),
      updated_by: req.user.id
    });
    
    console.log(`✅ Accident ${accident.numero_accident} déclaré à la CNAM - Document généré`);
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=declaration_accident_${accident.numero_accident || accident.id_accident}_${new Date().toISOString().split('T')[0]}.docx`);
    res.send(buffer);
    
  } catch (error) {
    console.error('❌ Erreur génération déclaration:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;