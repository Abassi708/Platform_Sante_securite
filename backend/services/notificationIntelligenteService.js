// backend/services/notificationIntelligenteService.js
const { Op } = require('sequelize');
const db = require('../models');
const { sequelizeLocal, sequelizeGlobal } = require('../config/database');

// Récupération des modèles
const Agent = db.global.Agent;
const Planning = db.local.Planning;
const Visite = db.local.Visite;
const User = db.local.User;
const NotificationIntelligente = db.local.NotificationIntelligente;
const Accident = db.local.Accident;

class NotificationIntelligenteService {

  // ============================================================
  //  UTILITAIRES
  // ============================================================

  async getUsersCibles(roles = ['social']) {
    try {
      const users = await User.findAll({
        where: { Role: { [Op.in]: roles } },
        attributes: ['id_utilisateur', 'Login', 'Role']
      });
      return users.map(user => ({
        id: user.id_utilisateur,
        email: user.Login,
        role: user.Role,
      }));
    } catch (error) {
      console.error('❌ Erreur getUsersCibles:', error);
      return [];
    }
  }

  _niveauToType(niveau) {
    const map = { 
      'CRITIQUE': 'URGENT', 
      'URGENT': 'URGENT', 
      'IMPORTANT': 'IMPORTANT', 
      'INFO': 'INFO' 
    };
    return map[niveau] || 'INFO';
  }

  async creerNotification(data) {
    try {
      if (!data.id_utilisateur || !data.email_utilisateur || !data.role_utilisateur) {
        return null;
      }

      const notification = await NotificationIntelligente.create({
        type: data.type || 'INFO',
        titre: data.titre,
        message: data.message,
        action_suggested: data.action_suggested || null,
        priorite: data.priorite || 3,
        id_utilisateur: data.id_utilisateur,
        email_utilisateur: data.email_utilisateur,
        role_utilisateur: data.role_utilisateur,
        details: data.details || null,
        source: data.source || 'systeme',
        statut: 'non_lu',
        created_at: new Date()
      });

      console.log(`🔔 Notification créée: ${data.titre}`);
      return notification;

    } catch (error) {
      console.error('❌ Erreur création notification:', error.message);
      return null;
    }
  }

  // ============================================================
  //  ALERTE 1: VISITES PASSÉES SANS ACTION
  // ============================================================
async detecterVisitesPasseesSansAction() {
  const situations = [];
  
  try {
    // Requête SQL corrigée selon VOS données
    const [visitesPassees] = await sequelizeLocal.query(`
      SELECT 
        p.id_planning,
        p.matricule_agent,
        p.date_visite,
        p.heure_visite,
        p.type_visite,
        DATEDIFF(CURDATE(), p.date_visite) as jours_retard
      FROM planning p
      WHERE p.date_visite <= '2026-04-30'
        AND p.date_visite >= '2026-04-28'
        AND p.visite_effectuee = 0
        AND p.statut = 'Programmé'
        AND p.type_visite IN ('Périodique', 'Reprise')
      ORDER BY p.date_visite DESC
    `);
    
    console.log(`📊 Requête SQL visites: ${visitesPassees?.length || 0} visite(s) trouvée(s)`);
    
    // Afficher les IDs trouvés pour debug
    if (visitesPassees && visitesPassees.length > 0) {
      console.log('IDs des visites trouvées:', visitesPassees.map(v => v.id_planning));
    }
    
    if (!visitesPassees || visitesPassees.length === 0) {
      // Deuxième tentative avec CURDATE() - 1
      const [autresVisites] = await sequelizeLocal.query(`
        SELECT 
          p.id_planning,
          p.matricule_agent,
          p.date_visite,
          p.heure_visite,
          p.type_visite,
          DATEDIFF(CURDATE(), p.date_visite) as jours_retard
        FROM planning p
        WHERE p.date_visite < CURDATE()
          AND p.visite_effectuee = 0
          AND p.statut = 'Programmé'
          AND p.type_visite IN ('Périodique', 'Reprise')
        ORDER BY p.date_visite DESC
        LIMIT 20
      `);
      
      if (!autresVisites || autresVisites.length === 0) {
        console.log('📊 Aucune visite passée sans action');
        return [];
      }
      
      visitesPassees.push(...autresVisites);
      console.log(`📊 ${visitesPassees.length} visite(s) trouvée(s) avec CURDATE()`);
    }
    
    // Récupérer les noms des agents
    const matricules = [...new Set(visitesPassees.map(v => v.matricule_agent))].join(',');
    
    const [agents] = await sequelizeGlobal.query(`
      SELECT matricule_agent, nom, prenom
      FROM agent
      WHERE matricule_agent IN (${matricules})
    `);
    
    const agentsMap = new Map();
    agents.forEach(agent => {
      agentsMap.set(agent.matricule_agent, agent);
    });
    
    // Compter par type
    const periodiques = visitesPassees.filter(v => v.type_visite === 'Périodique');
    
    if (periodiques.length > 0) {
      const maxRetard = Math.max(...periodiques.map(v => parseInt(v.jours_retard) || 1));
      const jours = maxRetard > 0 ? maxRetard : 1;
      
      const agentsListe = periodiques.slice(0, 5).map(v => {
        const a = agentsMap.get(v.matricule_agent);
        return `${a?.nom || 'Agent'} ${a?.prenom || ''}`;
      }).join(', ');
      
      situations.push({
        type: 'VISITES_PERIODIQUES_EN_RETARD',
        niveau: jours > 15 ? 'URGENT' : 'IMPORTANT',
        priorite: jours > 15 ? 4 : 3,
        titre: `⚠️ ${periodiques.length} visite(s) périodique(s) en retard`,
        message: `${periodiques.length} visite(s) périodique(s) prévues entre le 28/04 et le 30/04 n'ont pas été effectuées. Retard: ${jours} jours. Agents: ${agentsListe}`,
        action_suggested: 'Consulter le planning et effectuer ces visites immédiatement',
        details: { visites: periodiques, date_detection: new Date().toISOString() }
      });
    }
    
    return situations;
    
  } catch (error) {
    console.error('❌ Erreur detecterVisitesPasseesSansAction:', error);
    return [];
  }
}


  // ============================================================
  //  ALERTE 2: ACCIDENTS NON DÉCLARÉS
  // ============================================================

  async detecterAccidentsNonDeclares() {
    const situations = [];
    
    try {
      const [accidents] = await sequelizeLocal.query(`
        SELECT 
          a.id_accident,
          a.numero_accident,
          a.matricule_agent,
          a.date_accident,
          a.gravite,
          a.jour_arret,
          a.statut,
          DATEDIFF(CURDATE(), a.date_accident) as jours_depuis
        FROM accident a
        WHERE a.statut != 'declare'
          AND a.date_accident IS NOT NULL
        ORDER BY a.date_accident DESC
      `);
      
      if (!accidents || accidents.length === 0) {
        console.log('📊 Aucun accident non déclaré');
        return [];
      }
      
      console.log(`📊 ${accidents.length} accident(s) non déclaré(s)`);
      
      // Récupérer les agents
      const matricules = accidents.map(a => a.matricule_agent).join(',');
      
      const [agents] = await sequelizeGlobal.query(`
        SELECT matricule_agent, nom, prenom
        FROM agent
        WHERE matricule_agent IN (${matricules})
      `);
      
      const agentsMap = new Map();
      agents.forEach(agent => {
        agentsMap.set(agent.matricule_agent, agent);
      });
      
      for (const accident of accidents) {
        const agent = agentsMap.get(accident.matricule_agent);
        const jours = parseInt(accident.jours_depuis);
        const delaiLegal = 48;
        const estEnRetard = jours > delaiLegal;
        
        let niveau = 'IMPORTANT';
        let priorite = 3;
        
        if (jours > 30) {
          niveau = 'CRITIQUE';
          priorite = 5;
        } else if (jours > 15) {
          niveau = 'URGENT';
          priorite = 4;
        } else if (estEnRetard) {
          niveau = 'URGENT';
          priorite = 4;
        }
        
        situations.push({
          type: 'ACCIDENT_NON_DECLARE',
          niveau: niveau,
          priorite: priorite,
          titre: `🚨 Accident non déclaré - ${agent?.nom || 'Agent'} ${agent?.prenom || ''}`,
          message: `L'accident du ${new Date(accident.date_accident).toLocaleDateString('fr-FR')} concernant ${agent?.nom || 'Agent'} ${agent?.prenom || ''} (${accident.matricule_agent}) n'a pas été déclaré à la CNAM. ${estEnRetard ? `DÉLAI DÉPASSÉ de ${jours - delaiLegal} jour(s).` : `Retard: ${jours} jours.`}`,
          action_suggested: 'Déclarer l\'accident à la CNAM immédiatement',
          details: { accident }
        });
      }
      
      return situations;
      
    } catch (error) {
      console.error('❌ Erreur detecterAccidentsNonDeclares:', error);
      return [];
    }
  }

  // ============================================================
  //  ALERTE 3: AGENTS PRIORITAIRES SANS VISITE
  // ============================================================

  async detecterAgentsPrioritairesSansVisite() {
    const situations = [];
    
    try {
      const [agents] = await sequelizeGlobal.query(`
        SELECT 
          a.matricule_agent,
          a.nom,
          a.prenom,
          a.code_affectation,
          a.date_derniere_visite,
          a.periodicite_jours,
          DATEDIFF(CURDATE(), a.date_derniere_visite) as jours_depuis
        FROM agent a
        WHERE a.statut = 'actif'
        ORDER BY 
          CASE WHEN a.date_derniere_visite IS NULL THEN 0 ELSE 1 END,
          jours_depuis DESC
        LIMIT 20
      `);
      
      const prioritaires = [];
      
      for (const agent of agents) {
        // Agent jamais visité
        if (!agent.date_derniere_visite) {
          const [planifie] = await sequelizeLocal.query(`
            SELECT id_planning FROM planning 
            WHERE matricule_agent = ? AND type_visite = 'Périodique' AND statut = 'Programmé' AND date_visite >= CURDATE()
            LIMIT 1
          `, { replacements: [agent.matricule_agent] });
          
          if (!planifie || planifie.length === 0) {
            prioritaires.push({
              ...agent,
              raison: 'Aucune visite médicale enregistrée',
              priorite: 100
            });
          }
          continue;
        }
        
        const periodicite = agent.periodicite_jours || (agent.code_affectation === 3 ? 180 : 365);
        const joursDepuis = parseInt(agent.jours_depuis) || 0;
        const joursRestants = periodicite - joursDepuis;
        
        if (joursRestants < 0) {
          const [planifie] = await sequelizeLocal.query(`
            SELECT id_planning FROM planning 
            WHERE matricule_agent = ? AND type_visite = 'Périodique' AND statut = 'Programmé' AND date_visite >= CURDATE()
            LIMIT 1
          `, { replacements: [agent.matricule_agent] });
          
          if (!planifie || planifie.length === 0) {
            prioritaires.push({
              ...agent,
              jours_retard: Math.abs(joursRestants),
              raison: `Visite en retard de ${Math.abs(joursRestants)} jours`,
              priorite: Math.min(Math.abs(joursRestants) * 2, 100)
            });
          }
        }
      }
      
      if (prioritaires.length === 0) {
        console.log('📊 Aucun agent prioritaire');
        return [];
      }
      
      console.log(`📊 ${prioritaires.length} agent(s) prioritaire(s)`);
      
      const critiques = prioritaires.filter(a => a.priorite >= 80);
      const urgents = prioritaires.filter(a => a.priorite >= 40 && a.priorite < 80);
      
      if (critiques.length > 0) {
        const liste = critiques.slice(0, 5).map(a => `${a.nom} ${a.prenom} (${a.raison})`).join(', ');
        situations.push({
          type: 'AGENTS_PRIORITAIRES_CRITIQUES',
          niveau: 'CRITIQUE',
          priorite: 5,
          titre: `🔴 ${critiques.length} agent(s) nécessitent une visite URGENTE`,
          message: `Agents: ${liste}${critiques.length > 5 ? '...' : ''}`,
          action_suggested: 'Planifier des visites médicales IMMÉDIATEMENT',
          details: { agents: critiques }
        });
      }
      
      if (urgents.length > 0) {
        situations.push({
          type: 'AGENTS_PRIORITAIRES_URGENTS',
          niveau: 'URGENT',
          priorite: 4,
          titre: `🟠 ${urgents.length} agent(s) avec visite en retard`,
          message: `${urgents.length} agent(s) sont en retard sur leur visite médicale.`,
          action_suggested: 'Planifier les visites dans les plus brefs délais',
          details: { agents: urgents }
        });
      }
      
      return situations;
      
    } catch (error) {
      console.error('❌ Erreur detecterAgentsPrioritairesSansVisite:', error);
      return [];
    }
  }

  // ============================================================
  //  DÉTECTION DE TOUTES LES SITUATIONS
  // ============================================================

  async detecterToutesSituations() {
    const toutes = [];

    console.log('\n' + '='.repeat(70));
    console.log('🔔 DÉTECTION DES SITUATIONS POUR ALERTES');
    console.log('='.repeat(70));

    const [visitesPassees, accidentsNonDeclares, agentsPrioritaires] = await Promise.all([
      this.detecterVisitesPasseesSansAction(),
      this.detecterAccidentsNonDeclares(),
      this.detecterAgentsPrioritairesSansVisite()
    ]);

    toutes.push(...visitesPassees, ...accidentsNonDeclares, ...agentsPrioritaires);

    console.log(`\n📊 RÉSUMÉ: ${toutes.length} situation(s) détectée(s)`);
    toutes.forEach(s => {
      console.log(`   - [${s.niveau}] ${s.titre || s.type}`);
    });
    console.log('='.repeat(70) + '\n');

    return toutes;
  }

  // ============================================================
  //  ENVOI DES NOTIFICATIONS
  // ============================================================

  async envoyerNotifications() {
    console.log('\n🔔 Lancement du système intelligent d\'alertes...');

    const situations = await this.detecterToutesSituations();

    if (situations.length === 0) {
      console.log('ℹ️ Aucune situation nécessitant une alerte');
      return 0;
    }

    const users = await this.getUsersCibles(['social', 'admin']);
    if (users.length === 0) {
      console.log('⚠️ Aucun utilisateur cible trouvé');
      return 0;
    }

    let total = 0;

    for (const situation of situations) {
      for (const user of users) {
        const notif = await this.creerNotification({
          id_utilisateur: user.id,
          type: this._niveauToType(situation.niveau),
          titre: situation.titre,
          message: situation.message,
          action_suggested: situation.action_suggested,
          priorite: situation.priorite,
          source: situation.type,
          email_utilisateur: user.email,
          role_utilisateur: user.role,
          details: situation.details
        });

        if (notif) {
          total++;
        }
      }
    }

    console.log(`✅ ${total} notification(s) créée(s)`);
    return total;
  }

  // ============================================================
  //  GESTION DES NOTIFICATIONS
  // ============================================================

  async getNotificationsUtilisateur(idUtilisateur, statut = null, limit = 50) {
    const where = { id_utilisateur: idUtilisateur };
    if (statut && statut !== 'toutes') {
      where.statut = statut;
    }
    
    const notifications = await NotificationIntelligente.findAll({
      where,
      order: [['priorite', 'DESC'], ['created_at', 'DESC']],
      limit: parseInt(limit)
    });
    
    return notifications;
  }

  async marquerCommeLue(idNotification, idUtilisateur) {
    try {
      const notification = await NotificationIntelligente.findOne({
        where: { id: idNotification, id_utilisateur: idUtilisateur }
      });
      
      if (!notification) return null;
      
      notification.statut = 'lu';
      notification.lu_le = new Date();
      await notification.save();
      
      return notification;
    } catch (error) {
      console.error('❌ Erreur marquerCommeLue:', error);
      return null;
    }
  }

  async marquerToutesLues(idUtilisateur) {
    await NotificationIntelligente.update(
      { statut: 'lu', lu_le: new Date() },
      { where: { id_utilisateur: idUtilisateur, statut: 'non_lu' } }
    );
  }

  async archiver(idNotification, idUtilisateur) {
    const notification = await NotificationIntelligente.findOne({
      where: { id: idNotification, id_utilisateur: idUtilisateur }
    });
    
    if (!notification) return null;
    
    notification.statut = 'archive';
    await notification.save();
    
    return notification;
  }

  async supprimer(idNotification, idUtilisateur) {
    const deleted = await NotificationIntelligente.destroy({
      where: { id: idNotification, id_utilisateur: idUtilisateur }
    });
    
    return deleted > 0;
  }

  async getStats(idUtilisateur = null) {
    const baseWhere = idUtilisateur ? { id_utilisateur: idUtilisateur } : {};

    const total = await NotificationIntelligente.count({ where: baseWhere });
    const nonLues = await NotificationIntelligente.count({ where: { ...baseWhere, statut: 'non_lu' } });
    const parType = await NotificationIntelligente.findAll({
      where: baseWhere,
      attributes: ['type', [NotificationIntelligente.sequelize.fn('COUNT', '*'), 'count']],
      group: ['type']
    });
    const parSource = await NotificationIntelligente.findAll({
      where: baseWhere,
      attributes: ['source', [NotificationIntelligente.sequelize.fn('COUNT', '*'), 'count']],
      group: ['source']
    });

    return { total, nonLues, parType, parSource };
  }
}

module.exports = new NotificationIntelligenteService();