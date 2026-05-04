// backend/routes/creneauxRoutes.js
// Version CORRIGÉE - Prend en compte EFFECTUÉ et ANNULÉ

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');
const db = require('../models');
const planningService = require('../services/planningService');
const moment = require('moment');

const Planning = db.local.Planning;
const Agent = db.global.Agent;


// ========== RÉCUPÉRER LES JOURS OUVRÉS AVEC CRÉNEAUX DISPONIBLES ==========
router.get('/jours-disponibles', protect, async (req, res) => {
  try {
    const { mois, annee, matricule_agent } = req.query;
    
    console.log('🔍 /jours-disponibles appelé avec:', { mois, annee, matricule_agent });
    
    if (!matricule_agent) {
      return res.json({ success: true, jours: [] });
    }
    
    const agent = await Agent.findByPk(matricule_agent);
    if (!agent) {
      return res.json({ success: true, jours: [] });
    }
    
    const dateDebut = moment.utc(`${annee}-${String(mois).padStart(2, '0')}-01`, 'YYYY-MM-DD');
    const dateFin = dateDebut.clone().endOf('month');
    
    console.log(`📅 Période: ${dateDebut.format('DD/MM/YYYY')} -> ${dateFin.format('DD/MM/YYYY')}`);
    
    // ✅ Récupérer TOUTES les visites de l'agent (quel que soit le statut)
    const visitesAgent = await Planning.findAll({
      where: {
        matricule_agent: matricule_agent,
        date_visite: { [Op.between]: [dateDebut.format('YYYY-MM-DD'), dateFin.format('YYYY-MM-DD')] }
      },
      attributes: ['date_visite', 'statut', 'visite_effectuee', 'type_visite']
    });
    
    // ✅ Créer un Set des dates où l'agent a une visite (quel que soit le statut)
    const datesAgentOccupees = new Set();
    for (const visite of visitesAgent) {
      // Un agent est considéré OCCUPÉ un jour donné si :
      // - Il a une visite programmée non effectuée
      // - Il a une visite effectuée
      // - Il a une visite annulée
      // - Il a une visite reportée
      // Donc on prend TOUTES les dates sans exception
      datesAgentOccupees.add(visite.date_visite);
    }
    
    console.log(`📋 Dates où l'agent est occupé: ${Array.from(datesAgentOccupees).join(', ') || 'aucune'}`);
    
    // ✅ Récupérer TOUS les créneaux occupés pour la période (par d'autres agents)
    const toutesVisites = await Planning.findAll({
      where: {
        date_visite: { [Op.between]: [dateDebut.format('YYYY-MM-DD'), dateFin.format('YYYY-MM-DD')] }
      },
      attributes: ['date_visite', 'heure_visite', 'matricule_agent', 'type_visite', 'statut', 'visite_effectuee', 'creneau_bloque']
    });
    
    // ✅ Créer un Set des créneaux NON disponibles (par d'autres agents)
    const creneauxNonDisponibles = new Set();
    for (const visite of toutesVisites) {
      // Ignorer les visites de l'agent lui-même (déjà gérées par datesAgentOccupees)
      if (visite.matricule_agent == matricule_agent) continue;
      
      // Un créneau est NON disponible si:
      const estNonDisponible = 
        (visite.statut === 'Programmé' && !visite.visite_effectuee) ||
        visite.visite_effectuee === true ||
        visite.statut === 'Annulé' ||
        visite.creneau_bloque === true;
      
      if (estNonDisponible) {
        creneauxNonDisponibles.add(`${visite.date_visite}|${visite.heure_visite}`);
      }
    }
    
    const jours = [];
    const currentDate = dateDebut.clone();
    const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
    
    while (currentDate.isSameOrBefore(dateFin)) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const jourSemaine = currentDate.day();
      const estOuvre = await planningService.estJourOuvre(currentDate.toDate());
      
      // ✅ Un jour n'est pas disponible si l'agent a déjà une visite CE JOUR (quel que soit le statut)
      const agentOccupeCeJour = datesAgentOccupees.has(dateStr);
      
      // Uniquement les jours ouvrés ET où l'agent n'est pas déjà occupé
      if (estOuvre && !agentOccupeCeJour) {
        let creneauxDisponibles = 0;
        
        for (const heure of creneaux) {
          const key = `${dateStr}|${heure}`;
          // Un créneau est disponible s'il n'est pas dans le Set des non disponibles
          if (!creneauxNonDisponibles.has(key)) {
            creneauxDisponibles++;
          }
        }
        
        if (creneauxDisponibles > 0) {
          jours.push({
            date: dateStr,
            jourSemaine: jourSemaine,
            estOuvre: true,
            creneauxDisponibles: creneauxDisponibles
          });
        }
      }
      
      currentDate.add(1, 'day');
    }
    
    console.log(`✅ ${jours.length} jours ouvrés avec créneaux disponibles`);
    jours.forEach(j => {
      console.log(`   ${j.date}: ${j.creneauxDisponibles} créneaux disponibles`);
    });
    
    res.json({ success: true, jours });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message, jours: [] });
  }
});


// ========== RÉCUPÉRER LES CRÉNEAUX DISPONIBLES POUR UNE DATE ==========
router.get('/creneaux-disponibles', protect, async (req, res) => {
  try {
    const { date, matricule_agent, id_planning_exclu } = req.query;
    
    console.log('🔍 /creneaux-disponibles appelé avec:', { date, matricule_agent, id_planning_exclu });
    
    if (!date) {
      return res.status(400).json({ success: false, message: 'Date requise' });
    }
    
    const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
    const resultats = [];
    
    // ✅ 1. Vérifier si l'agent a déjà une visite CE JOUR (quel que soit le statut)
    let agentOccupeCeJour = false;
    if (matricule_agent) {
      const agentVisite = await Planning.findOne({
        where: {
          matricule_agent: matricule_agent,
          date_visite: date,
          id_planning: { [Op.ne]: id_planning_exclu || 0 }
        }
      });
      agentOccupeCeJour = !!agentVisite;
    }
    
    // Si l'agent est déjà occupé, aucun créneau n'est disponible
    if (agentOccupeCeJour) {
      for (const heure of creneaux) {
        resultats.push({
          heure: heure,
          heure_affichage: heure.substring(0,5),
          statut: 'agent_occupe',
          message: '❌ L\'agent a déjà une visite ce jour (quel que soit le statut)',
          disponible: false
        });
      }
      return res.json({ success: true, creneaux: resultats, date, agentOccupeCeJour: true });
    }
    
    // ✅ 2. Récupérer TOUTES les visites pour cette date
    const toutesVisites = await Planning.findAll({
      where: { date_visite: date },
      attributes: ['id_planning', 'heure_visite', 'matricule_agent', 'type_visite', 'statut', 'visite_effectuee', 'creneau_bloque']
    });
    
    for (const heure of creneaux) {
      const visite = toutesVisites.find(v => v.heure_visite === heure);
      
      let disponible = false;
      let statut = '';
      let message = '';
      
      if (!visite) {
        // Pas de visite = créneau disponible
        statut = 'disponible';
        message = '✅ Créneau disponible';
        disponible = true;
      } else if (visite.creneau_bloque === true) {
        statut = 'bloque';
        message = '🔒 Créneau bloqué';
        disponible = false;
      } else if (visite.visite_effectuee === true) {
        statut = 'effectue';
        message = `✅ Visite EFFECTUÉE à ${heure.substring(0,5)} - Créneau non disponible`;
        disponible = false;
      } else if (visite.statut === 'Annulé') {
        statut = 'annule';
        message = `❌ Visite ANNULÉE à ${heure.substring(0,5)} - Créneau non disponible`;
        disponible = false;
      } else if (visite.statut === 'Programmé' && !visite.visite_effectuee) {
        // Vérifier si c'est la visite qu'on est en train de modifier
        if (visite.id_planning == id_planning_exclu) {
          statut = 'disponible';
          message = '✅ Créneau disponible (votre visite actuelle)';
          disponible = true;
        } else {
          const agentAutre = await Agent.findOne({
            where: { matricule_agent: visite.matricule_agent },
            attributes: ['nom', 'prenom']
          });
          const agentNom = agentAutre ? `${agentAutre.nom} ${agentAutre.prenom}` : `Agent #${visite.matricule_agent}`;
          statut = 'occupe';
          message = `❌ Occupé par ${agentNom} (${visite.type_visite})`;
          disponible = false;
        }
      } else {
        statut = 'disponible';
        message = '✅ Créneau disponible';
        disponible = true;
      }
      
      resultats.push({
        heure: heure,
        heure_affichage: heure.substring(0,5),
        statut: statut,
        message: message,
        disponible: disponible
      });
    }
    
    // Trier: disponibles en premier
    resultats.sort((a, b) => (b.disponible ? 1 : 0) - (a.disponible ? 1 : 0));
    
    const disponiblesCount = resultats.filter(c => c.disponible).length;
    console.log(`✅ Date ${date}: ${disponiblesCount}/4 créneaux disponibles`);
    
    res.json({ success: true, creneaux: resultats, date, agentOccupeCeJour: false });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;