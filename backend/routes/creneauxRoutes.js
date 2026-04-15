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
    
    const jours = [];
    const currentDate = dateDebut.clone();
    const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
    
    // ✅ Récupérer TOUTES les visites (quel que soit le statut) pour la période
    const toutesVisites = await Planning.findAll({
      where: {
        date_visite: { [Op.between]: [dateDebut.format('YYYY-MM-DD'), dateFin.format('YYYY-MM-DD')] }
      },
      attributes: ['date_visite', 'heure_visite', 'matricule_agent', 'type_visite', 'statut', 'visite_effectuee', 'creneau_bloque']
    });
    
    // ✅ Créer un Set des créneaux NON disponibles (occupés, effectués, annulés, bloqués)
    const creneauxNonDisponibles = new Set();
    for (const visite of toutesVisites) {
      // Un créneau est NON disponible si:
      // 1. Il est programmé et non effectué (occupé)
      // 2. Il est effectué
      // 3. Il est annulé
      // 4. Il est bloqué
      const estNonDisponible = 
        (visite.statut === 'Programmé' && !visite.visite_effectuee) ||
        visite.visite_effectuee === true ||
        visite.statut === 'Annulé' ||
        visite.creneau_bloque === true;
      
      if (estNonDisponible) {
        creneauxNonDisponibles.add(`${visite.date_visite}|${visite.heure_visite}`);
      }
    }
    
    // Dates où l'agent est déjà occupé (visite programmée non effectuée)
    const datesAgentOccupees = new Set();
    for (const visite of toutesVisites) {
      if (visite.matricule_agent == matricule_agent && 
          visite.statut === 'Programmé' && 
          !visite.visite_effectuee) {
        datesAgentOccupees.add(visite.date_visite);
      }
    }
    
    while (currentDate.isSameOrBefore(dateFin)) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const jourSemaine = currentDate.day();
      const estOuvre = await planningService.estJourOuvre(currentDate.toDate());
      
      // Uniquement les jours ouvrés (Mardi=2, Mercredi=3, Jeudi=4, Vendredi=5)
      // ET l'agent n'est pas déjà occupé ce jour
      if (estOuvre && !datesAgentOccupees.has(dateStr)) {
        let creneauxDisponibles = 0;
        
        for (const heure of creneaux) {
          const key = `${dateStr}|${heure}`;
          // ✅ Un créneau est disponible s'il n'est pas dans le Set des non disponibles
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
    // Afficher les détails pour debug
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
    
    // ✅ Récupérer TOUTES les visites pour cette date
    const whereClause = { date_visite: date };
    const toutesVisites = await Planning.findAll({
      where: whereClause,
      attributes: ['id_planning', 'heure_visite', 'matricule_agent', 'type_visite', 'statut', 'visite_effectuee', 'creneau_bloque']
    });
    
    // Vérifier si l'agent a déjà une visite CE JOUR (programmée non effectuée)
    let agentOccupeCeJour = false;
    if (matricule_agent) {
      const agentVisite = toutesVisites.find(v => 
        v.matricule_agent == matricule_agent && 
        v.statut === 'Programmé' && 
        !v.visite_effectuee &&
        v.id_planning != id_planning_exclu
      );
      agentOccupeCeJour = !!agentVisite;
    }
    
    for (const heure of creneaux) {
      // Trouver la visite pour ce créneau (si elle existe)
      const visite = toutesVisites.find(v => v.heure_visite === heure);
      
      let disponible = false;
      let statut = '';
      let message = '';
      
      // ✅ Logique de disponibilité
      if (agentOccupeCeJour) {
        statut = 'agent_occupe';
        message = '❌ L\'agent a déjà une visite ce jour';
        disponible = false;
      } else if (!visite) {
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
          // C'est la visite qu'on modifie, donc le créneau est disponible pour modification
          statut = 'disponible';
          message = '✅ Créneau disponible (votre visite actuelle)';
          disponible = true;
        } else {
          const agent = await Agent.findOne({
            where: { matricule_agent: visite.matricule_agent },
            attributes: ['nom', 'prenom']
          });
          const agentNom = agent ? `${agent.nom} ${agent.prenom}` : `Agent #${visite.matricule_agent}`;
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
    resultats.forEach(r => {
      console.log(`   ${r.heure_affichage}: ${r.disponible ? '✅ DISPONIBLE' : `❌ ${r.message}`}`);
    });
    
    res.json({ success: true, creneaux: resultats, date, agentOccupeCeJour });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;