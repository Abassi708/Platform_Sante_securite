// backend/services/reprogrammationService.js
const { Op } = require('sequelize');
const Planning = require('../models/Planning');
const Agent = require('../models/Agent');
const tracabiliteService = require('./tracabiliteVisiteService');

class ReprogrammationService {

  // ========== REPROGRAMMER UNE VISITE (CHANGEMENT DE DATE) ==========
  async reprogrammerVisite(idPlanning, nouvelleDate, nouvelleHeure, motif, userId) {
    try {
      console.log('\n🔄 REPROGRAMMATION (CHANGEMENT DE DATE)');
      console.log(`   ID Planning: ${idPlanning}`);
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

      // 2. Vérifier si le planning n'est pas déjà effectué
      if (ancienPlanning.visite_effectuee) {
        throw new Error('Impossible de reprogrammer une visite déjà effectuée');
      }

      // 3. Vérifier si le nouveau créneau est disponible
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

      // 4. Vérifier que le nouveau créneau est valide (jour ouvré)
      const dateObj = new Date(nouvelleDate);
      const jour = dateObj.getDay();
      const joursVisite = [2, 3, 4, 5]; // Mardi à Vendredi
      if (!joursVisite.includes(jour)) {
        throw new Error('Les visites ne peuvent être programmées que du mardi au vendredi');
      }

      // 5. MARQUER L'ANCIEN CRÉNEAU COMME BLOQUÉ
      ancienPlanning.statut = 'Reporté';
      ancienPlanning.reprogrammee = true;
      ancienPlanning.motif_reprogrammation = motif;
      ancienPlanning.date_reprogrammation = new Date();
      ancienPlanning.creneau_bloque = true;           // ← CRÉNEAU BLOQUÉ
      ancienPlanning.nouvelle_date_visite = nouvelleDate;
      ancienPlanning.nouvelle_heure_visite = nouvelleHeure;
      await ancienPlanning.save();

      console.log(`   🔒 Ancien créneau BLOQUÉ: ${ancienPlanning.date_visite} ${ancienPlanning.heure_visite}`);

      // 6. CRÉER LE NOUVEAU PLANNING
      const planningService = require('./planningService');
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

      // 7. TRAÇABILITÉ
      await tracabiliteService.enregistrerReprogrammation(
        ancienPlanning,
        nouveauPlanning,
        motif,
        { id: userId, role: 'user' }
      );

      // 8. Résultat
      const agent = ancienPlanning.planningAgent;
      return {
        success: true,
        ancien_planning: {
          id: ancienPlanning.id_planning,
          date: ancienPlanning.date_visite,
          heure: ancienPlanning.heure_visite,
          creneau_bloque: ancienPlanning.creneau_bloque
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
        date_reprogrammation: new Date()
      };

    } catch (error) {
      console.error('❌ Erreur reprogrammation:', error);
      throw error;
    }
  }

  // ========== VÉRIFIER SI UN CRÉNEAU EST BLOQUÉ ==========
  async estCreneauBloque(date, heure) {
    const planning = await Planning.findOne({
      where: {
        date_visite: date,
        heure_visite: heure,
        creneau_bloque: true
      }
    });
    return planning !== null;
  }

  // ========== RÉCUPÉRER TOUS LES CRÉNEAUX BLOQUÉS ==========
  async getCreneauxBloques(dateDebut = null, dateFin = null) {
    const where = { creneau_bloque: true };
    
    if (dateDebut && dateFin) {
      where.date_visite = {
        [Op.between]: [dateDebut, dateFin]
      };
    }

    return await Planning.findAll({
      where,
      include: [{
        model: Agent,
        as: 'planningAgent',
        attributes: ['nom', 'prenom', 'code_affectation']
      }],
      order: [['date_visite', 'ASC'], ['heure_visite', 'ASC']]
    });
  }

  // ========== RÉCUPÉRER L'HISTORIQUE DES REPROGRAMMATIONS ==========
  async getHistoriqueReprogrammations(matriculeAgent = null) {
    const where = { reprogrammee: true, creneau_bloque: true };
    if (matriculeAgent) {
      where.matricule_agent = matriculeAgent;
    }

    return await Planning.findAll({
      where,
      include: [{
        model: Agent,
        as: 'planningAgent',
        attributes: ['nom', 'prenom', 'code_affectation']
      }],
      order: [['date_reprogrammation', 'DESC']]
    });
  }
}

module.exports = new ReprogrammationService();