// backend/services/reprogrammationAutoService.js
// Version CORRIGÉE avec vérifications complètes

const { Op } = require('sequelize');
const Planning = require('../models/Planning');
const Agent = require('../models/Agent');
const planningService = require('./planningService');
const tracabiliteService = require('./tracabiliteVisiteService');

class ReprogrammationAutoService {
  
  // ========== VÉRIFIER SI L'AGENT EST DISPONIBLE CE JOUR ==========
  async estAgentDisponibleCeJour(matriculeAgent, dateVisite, idExclu = null) {
    const whereClause = {
      matricule_agent: matriculeAgent,
      date_visite: dateVisite,
      statut: 'Programmé',
      visite_effectuee: false
    };
    if (idExclu) {
      whereClause.id_planning = { [Op.ne]: idExclu };
    }
    const visiteExistante = await Planning.findOne({ where: whereClause });
    return !visiteExistante;
  }

  // ========== VÉRIFIER SI LE CRÉNEAU EST DISPONIBLE ==========
  async estCreneauDisponible(dateVisite, heureVisite, idExclu = null) {
    const whereClause = {
      date_visite: dateVisite,
      heure_visite: heureVisite,
      [Op.or]: [
        { statut: 'Programmé', visite_effectuee: false },
        { creneau_bloque: true },
        { statut: 'Annulé' },
        { visite_effectuee: true }
      ]
    };
    if (idExclu) {
      whereClause.id_planning = { [Op.ne]: idExclu };
    }
    const visiteExistante = await Planning.findOne({ where: whereClause });
    return !visiteExistante;
  }


async reprogrammerAuto(idPlanning, nouvelleDate, nouvelleHeure, motif, userId, typeVisite) {
  try {
    console.log('\n🔄 REPROGRAMMATION AUTOMATIQUE');
    console.log(`   ID Planning: ${idPlanning}`);
    console.log(`   Type: ${typeVisite}`);

    // 1. Récupérer l'ancien planning
    const ancienPlanning = await Planning.findByPk(idPlanning, {
      include: [{
        model: Agent,
        as: 'planningAgent',
        attributes: ['nom', 'prenom', 'matricule_agent']
      }]
    });

    if (!ancienPlanning) throw new Error('Planning non trouvé');
    if (ancienPlanning.visite_effectuee) throw new Error('Visite déjà effectuée');

    const agent = ancienPlanning.planningAgent;
    const matriculeAgent = agent.matricule_agent;

    // 2. Chercher le prochain créneau disponible (jour + heure)
    const dateObj = new Date(nouvelleDate);
    let dateValide = new Date(dateObj);
    let heureFinale = nouvelleHeure;
    let trouve = false;
    let joursRecherche = 0;
    const maxJours = 30;

    while (!trouve && joursRecherche < maxJours) {
      const dateStr = dateValide.toISOString().split('T')[0];
      
      // Vérifier si le jour est ouvré
      const estOuvre = await planningService.estJourOuvre(dateValide);
      
      if (estOuvre) {
        // Vérifier si l'agent est disponible ce jour
        const agentDispo = await this.estAgentDisponibleCeJour(matriculeAgent, dateStr, idPlanning);
        
        if (agentDispo) {
          // Chercher un créneau disponible
          for (const heure of planningService.creneaux) {
            const creneauDispo = await this.estCreneauDisponible(dateStr, heure, idPlanning);
            if (creneauDispo) {
              heureFinale = heure;
              trouve = true;
              console.log(`   ✅ Créneau trouvé: ${dateStr} à ${heureFinale}`);
              break;
            }
          }
        }
      }
      
      if (!trouve) {
        dateValide.setDate(dateValide.getDate() + 1);
        joursRecherche++;
      }
    }

    if (!trouve) {
      throw new Error(`Aucun créneau disponible dans les ${maxJours} prochains jours`);
    }

    const nouvelleDateValide = dateValide.toISOString().split('T')[0];

    // 3. Marquer l'ancien créneau comme bloqué
    ancienPlanning.statut = 'Reporté';
    ancienPlanning.reprogrammee = true;
    ancienPlanning.source_reprogrammation = 'auto';
    ancienPlanning.motif_reprogrammation = `${motif} - Reporté au ${nouvelleDateValide} ${heureFinale}`;
    ancienPlanning.date_reprogrammation = new Date();
    ancienPlanning.creneau_bloque = true;
    ancienPlanning.nouvelle_date_visite = nouvelleDateValide;
    ancienPlanning.nouvelle_heure_visite = heureFinale;
    await ancienPlanning.save();

    // 4. Créer le nouveau planning
    const nouvelleDateObj = new Date(nouvelleDateValide);
    const semaine = planningService.getNumeroSemaine(nouvelleDateObj);
    const annee = nouvelleDateObj.getFullYear();

    const nouveauPlanning = await Planning.create({
      matricule_agent: ancienPlanning.matricule_agent,
      date_visite: nouvelleDateValide,
      heure_visite: heureFinale,
      type_visite: ancienPlanning.type_visite,
      statut: 'Programmé',
      priorite: (ancienPlanning.priorite || 0) + 20,
      visite_originale_id: ancienPlanning.id_planning,
      semaine: semaine,
      annee: annee,
      created_by: userId,
      convocation_envoyee: false,
      source_planification: 'auto'
    });

    // 5. Traçabilité
    await tracabiliteService.enregistrerReprogrammation(
      ancienPlanning,
      nouveauPlanning,
      `${motif} (auto)`,
      { id: userId, role: 'system' }
    );

    return {
      success: true,
      ancien_planning: {
        id: ancienPlanning.id_planning,
        date: ancienPlanning.date_visite,
        heure: ancienPlanning.heure_visite
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
      }
    };

  } catch (error) {
    console.error('❌ Erreur reprogrammation auto:', error);
    throw error;
  }
}

  // ========== REPROGRAMMATION RETARD PÉRIODIQUE ==========
  async reprogrammerRetardPeriodique(planning, userId) {
    const aujourdhui = new Date();
    const joursRetard = Math.floor((aujourdhui - new Date(planning.date_visite)) / (1000 * 60 * 60 * 24));
    
    const prochainJourValide = await planningService.getProchainJourOuvre(aujourdhui);
    
    if (!prochainJourValide) {
      console.log(`⚠️ Impossible de trouver un jour valide pour la visite #${planning.id_planning}`);
      return null;
    }
    
    return await this.reprogrammerAuto(
      planning.id_planning,
      prochainJourValide.toISOString().split('T')[0],
      planning.heure_visite,
      `Auto-report: retard de ${joursRetard} jours`,
      userId,
      'Périodique'
    );
  }

  // ========== REPROGRAMMATION RETARD REPRISE ==========
  async reprogrammerRetardReprise(planning, userId) {
    const aujourdhui = new Date();
    const joursRetard = Math.floor((aujourdhui - new Date(planning.date_visite)) / (1000 * 60 * 60 * 24));
    
    const prochainJourValide = await planningService.getProchainJourOuvre(aujourdhui);
    
    if (!prochainJourValide) {
      console.log(`⚠️ Impossible de trouver un jour valide pour la reprise #${planning.id_planning}`);
      return null;
    }
    
    return await this.reprogrammerAuto(
      planning.id_planning,
      prochainJourValide.toISOString().split('T')[0],
      planning.heure_visite,
      `Auto-report: retard de ${joursRetard} jours`,
      userId,
      'Reprise'
    );
  }
  
  async reprogrammerAutoPeriodique(idPlanning, nouvelleDate, nouvelleHeure, motif, userId) {
  return this.reprogrammerAuto(idPlanning, nouvelleDate, nouvelleHeure, motif, userId, 'Périodique');
}

async reprogrammerAutoReprise(idPlanning, nouvelleDate, nouvelleHeure, motif, userId) {
  return this.reprogrammerAuto(idPlanning, nouvelleDate, nouvelleHeure, motif, userId, 'Reprise');
}

async reprogrammerRetardPeriodique(planning, userId) {
  const aujourdhui = new Date();
  const prochainJourValide = await planningService.getProchainJourOuvre(aujourdhui);
  if (!prochainJourValide) return null;
  
  return await this.reprogrammerAutoPeriodique(
    planning.id_planning,
    prochainJourValide.toISOString().split('T')[0],
    planning.heure_visite,
    `Auto-report: retard`,
    userId
  );
}

async reprogrammerRetardReprise(planning, userId) {
  const aujourdhui = new Date();
  const prochainJourValide = await planningService.getProchainJourOuvre(aujourdhui);
  if (!prochainJourValide) return null;
  
  return await this.reprogrammerAutoReprise(
    planning.id_planning,
    prochainJourValide.toISOString().split('T')[0],
    planning.heure_visite,
    `Auto-report: retard`,
    userId
  );
}
}

module.exports = new ReprogrammationAutoService();