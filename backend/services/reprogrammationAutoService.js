// backend/services/reprogrammationAutoService.js
const { Op } = require('sequelize');
const Planning = require('../models/Planning');
const Agent = require('../models/Agent');
const planningService = require('./planningService');
const tracabiliteService = require('./tracabiliteVisiteService');

class ReprogrammationAutoService {
  
  // ========== REPROGRAMMATION AUTO POUR PÉRIODIQUES ==========
  async reprogrammerAutoPeriodique(idPlanning, nouvelleDate, nouvelleHeure, motif, userId) {
    return this.reprogrammerAuto(idPlanning, nouvelleDate, nouvelleHeure, motif, userId, 'Périodique');
  }
  
  // ========== REPROGRAMMATION AUTO POUR REPRISES ==========
  async reprogrammerAutoReprise(idPlanning, nouvelleDate, nouvelleHeure, motif, userId) {
    return this.reprogrammerAuto(idPlanning, nouvelleDate, nouvelleHeure, motif, userId, 'Reprise');
  }
  
  // ========== REPROGRAMMATION AUTO (CORE LOGIC) ==========
  async reprogrammerAuto(idPlanning, nouvelleDate, nouvelleHeure, motif, userId, typeVisite) {
    try {
      console.log('\n🔄 REPROGRAMMATION AUTOMATIQUE');
      console.log(`   ID Planning: ${idPlanning}`);
      console.log(`   Type: ${typeVisite}`);
      console.log(`   Nouveau créneau: ${nouvelleDate} ${nouvelleHeure}`);
      console.log(`   Motif: ${motif}`);

      // 1. Récupérer l'ancien planning
      const ancienPlanning = await Planning.findByPk(idPlanning, {
        include: [{
          model: Agent,
          as: 'planningAgent',
          attributes: ['nom', 'prenom', 'code_affectation']
        }]
      });

      if (!ancienPlanning) throw new Error('Planning non trouvé');

      // 2. Vérifier le type
      if (ancienPlanning.type_visite !== typeVisite) {
        throw new Error(`Ce planning n'est pas une visite de type ${typeVisite}`);
      }

      // 3. Vérifier si le planning n'est pas déjà effectué
      if (ancienPlanning.visite_effectuee) {
        throw new Error('Impossible de reprogrammer une visite déjà effectuée');
      }

      // 4. Vérifier si le nouveau créneau est disponible
      const creneauOccupe = await Planning.findOne({
        where: {
          date_visite: nouvelleDate,
          heure_visite: nouvelleHeure,
          statut: 'Programmé',
          id_planning: { [Op.ne]: idPlanning }
        }
      });

      if (creneauOccupe) {
        throw new Error(`Le créneau ${nouvelleDate} à ${nouvelleHeure} est déjà occupé`);
      }

      // 5. Vérifier que le nouveau créneau est valide
      const dateObj = new Date(nouvelleDate);
      const jour = dateObj.getDay();
      const joursVisite = [2, 3, 4, 5];
      if (!joursVisite.includes(jour)) {
        throw new Error('Les visites ne peuvent être programmées que du mardi au vendredi');
      }

      // 6. MARQUER L'ANCIEN CRÉNEAU COMME BLOQUÉ
      ancienPlanning.statut = 'Reporté';
      ancienPlanning.reprogrammee = true;
      ancienPlanning.source_reprogrammation = 'auto';
      ancienPlanning.motif_reprogrammation = motif;
      ancienPlanning.date_reprogrammation = new Date();
      ancienPlanning.creneau_bloque = true;
      ancienPlanning.nouvelle_date_visite = nouvelleDate;
      ancienPlanning.nouvelle_heure_visite = nouvelleHeure;
      await ancienPlanning.save();

      console.log(`   🔒 Ancien créneau BLOQUÉ: ${ancienPlanning.date_visite} ${ancienPlanning.heure_visite}`);
      console.log(`   🤖 Source: Automatique`);

      // 7. CRÉER LE NOUVEAU PLANNING
      const semaine = planningService.getNumeroSemaine(dateObj);
      const annee = dateObj.getFullYear();

      const nouveauPlanning = await Planning.create({
        matricule_agent: ancienPlanning.matricule_agent,
        date_visite: nouvelleDate,
        heure_visite: nouvelleHeure,
        type_visite: ancienPlanning.type_visite,
        statut: 'Programmé',
        priorite: ancienPlanning.priorite + 20,
        visite_originale_id: ancienPlanning.id_planning,
        semaine: semaine,
        annee: annee,
        created_by: userId,
        convocation_envoyee: false
      });

      console.log(`   ✅ Nouveau planning créé: ${nouvelleDate} ${nouvelleHeure}`);

      // 8. TRAÇABILITÉ
      await tracabiliteService.enregistrerReprogrammation(
        ancienPlanning,
        nouveauPlanning,
        `${motif} (auto)`,
        { id: userId, role: 'system' }
      );

      // 9. Résultat
      const agent = ancienPlanning.planningAgent;
      return {
        success: true,
        ancien_planning: {
          id: ancienPlanning.id_planning,
          date: ancienPlanning.date_visite,
          heure: ancienPlanning.heure_visite,
          creneau_bloque: ancienPlanning.creneau_bloque,
          source_reprogrammation: ancienPlanning.source_reprogrammation
        },
        nouveau_planning: {
          id: nouveauPlanning.id_planning,
          date: nouveauPlanning.date_visite,
          heure: nouveauPlanning.heure_visite
        },
        agent: {
          matricule: agent?.matricule_agent,
          nom: agent?.nom,
          prenom: agent?.prenom
        },
        motif: motif,
        source: 'auto',
        type_visite: typeVisite,
        date_reprogrammation: new Date()
      };

    } catch (error) {
      console.error('❌ Erreur reprogrammation auto:', error);
      throw error;
    }
  }
  
  // ========== REPROGRAMMATION AUTO SUR RETARD (PÉRIODIQUES) ==========
  async reprogrammerRetardPeriodique(planning, userId) {
    const aujourdhui = new Date();
    const joursRetard = Math.floor((aujourdhui - new Date(planning.date_visite)) / (1000 * 60 * 60 * 24));
    
    const nouvelleDate = new Date(aujourdhui);
    nouvelleDate.setDate(aujourdhui.getDate() + 7);
    
    let joursEssais = 0;
    while (!(await planningService.estJourOuvre(nouvelleDate)) && joursEssais < 21) {
      nouvelleDate.setDate(nouvelleDate.getDate() + 1);
      joursEssais++;
    }
    
    if (joursEssais >= 21) {
      console.log(`⚠️ Impossible de reprogrammer auto la visite #${planning.id_planning}`);
      return null;
    }
    
    return await this.reprogrammerAutoPeriodique(
      planning.id_planning,
      nouvelleDate.toISOString().split('T')[0],
      planning.heure_visite,
      `Auto-report: retard de ${joursRetard} jours`,
      userId
    );
  }
  
  // ========== REPROGRAMMATION AUTO SUR RETARD (REPRISES) ==========
  async reprogrammerRetardReprise(planning, userId) {
    const aujourdhui = new Date();
    const joursRetard = Math.floor((aujourdhui - new Date(planning.date_visite)) / (1000 * 60 * 60 * 24));
    
    const nouvelleDate = new Date(aujourdhui);
    nouvelleDate.setDate(aujourdhui.getDate() + 7);
    
    let joursEssais = 0;
    while (!(await planningService.estJourOuvre(nouvelleDate)) && joursEssais < 21) {
      nouvelleDate.setDate(nouvelleDate.getDate() + 1);
      joursEssais++;
    }
    
    if (joursEssais >= 21) {
      console.log(`⚠️ Impossible de reprogrammer auto la visite de reprise #${planning.id_planning}`);
      return null;
    }
    
    return await this.reprogrammerAutoReprise(
      planning.id_planning,
      nouvelleDate.toISOString().split('T')[0],
      planning.heure_visite,
      `Auto-report: retard de ${joursRetard} jours`,
      userId
    );
  }
}

module.exports = new ReprogrammationAutoService();