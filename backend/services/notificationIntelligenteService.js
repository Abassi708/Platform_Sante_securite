// backend/services/notificationIntelligenteService.js
const { Op } = require('sequelize');
const db = require('../models');

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

  _joursRestants(dateCible) {
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    const cible = new Date(dateCible);
    cible.setHours(0, 0, 0, 0);
    return Math.round((cible - aujourdhui) / (1000 * 60 * 60 * 24));
  }

  calculerPeriodicite(agent) {
    if (agent.periodicite_jours && agent.periodicite_jours > 0) {
      return agent.periodicite_jours;
    }
    const estChauffeur = agent.code_affectation === 3;
    return estChauffeur ? 180 : 365;
  }

  async getUsersCibles(roles = ['social', 'admin']) {
    try {
      const users = await User.findAll({
        where: { Role: { [Op.in]: roles } },
        attributes: ['id_utilisateur', 'Login', 'Role']
      });
      return users.map(user => ({
        id: user.id_utilisateur,
        email: user.Login,
        role: user.Role
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

  // ============================================================
  //  CRÉATION DE NOTIFICATIONS
  // ============================================================

  async creerNotification(data) {
    try {
      if (!data.id_utilisateur) {
        console.error('❌ Notification sans id_utilisateur');
        return null;
      }
      if (!data.email_utilisateur) {
        console.error('❌ Notification sans email_utilisateur');
        return null;
      }
      if (!data.role_utilisateur) {
        console.error('❌ Notification sans role_utilisateur');
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

      console.log(`🔔 Notification créée [${data.type}] pour ${data.email_utilisateur}: ${data.titre}`);
      return notification;

    } catch (error) {
      console.error('❌ Erreur création notification:', error.message);
      return null;
    }
  }

  async creerNotificationsMultiples(donneesUtilisateurs, notificationBase) {
    const promises = donneesUtilisateurs.map(async (userData) => {
      const email = userData.email || userData.Login;
      const role = userData.role || userData.Role;
      const userId = userData.id || userData.id_utilisateur;

      if (!userId || !email || !role) {
        console.log('⚠️ Utilisateur sans données:', userData);
        return null;
      }

      return this.creerNotification({
        ...notificationBase,
        id_utilisateur: userId,
        email_utilisateur: email,
        role_utilisateur: role,
        details: userData.details || notificationBase.details
      });
    });

    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
  }

  // ============================================================
  //  DÉTECTION DES SITUATIONS
  // ============================================================

  // 1. Détection des visites périodiques bientôt dues ou en retard
  async detecterVisitesPeriodiquesBientotDues() {
    const situations = [];
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    const agents = await Agent.findAll({ where: { statut: 'actif' } });

    for (const agent of agents) {
      // Ignorer les agents en inaptitude
      if (agent.date_fin_inaptitude && new Date(agent.date_fin_inaptitude) > aujourdhui) {
        continue;
      }

      const periodicite = this.calculerPeriodicite(agent);
      const estChauffeur = agent.code_affectation === 3;
      const poste = estChauffeur ? 'Chauffeur' : 'Contrôleur';
      const periodiciteTexte = estChauffeur ? '6 mois' : '1 an';

      // Cas 1: Jamais de visite
      if (!agent.date_derniere_visite) {
        situations.push({
          type: 'PERIODIQUE_JAMAIS_VISITE',
          niveau: 'URGENT',
          titre: `🔴 Agent jamais visité — ${agent.nom} ${agent.prenom}`,
          message: `L'agent ${agent.nom} ${agent.prenom} (mat. ${agent.matricule_agent}, ${poste}) n'a jamais passé de visite médicale périodique (périodicité : ${periodiciteTexte}).`,
          action_suggested: 'Planifier une visite périodique en urgence',
          priorite: 5,
          details: { matricule_agent: agent.matricule_agent, poste, periodicite_jours: periodicite }
        });
        continue;
      }

      const dateDerniere = new Date(agent.date_derniere_visite);
      const joursDepuis = Math.floor((aujourdhui - dateDerniere) / (1000 * 60 * 60 * 24));
      const joursRestants = periodicite - joursDepuis;

      // Cas 2: En retard
      if (joursRestants < 0) {
        const joursRetard = Math.abs(joursRestants);
        situations.push({
          type: 'PERIODIQUE_EN_RETARD',
          niveau: joursRetard > 30 ? 'CRITIQUE' : 'IMPORTANT',
          titre: `⚠️ Visite périodique en retard — ${agent.nom} ${agent.prenom}`,
          message: `L'agent ${agent.nom} ${agent.prenom} (mat. ${agent.matricule_agent}, ${poste}) est en retard de ${joursRetard} jour(s) pour sa visite périodique (dernière visite : ${dateDerniere.toLocaleDateString('fr-FR')}, périodicité : ${periodiciteTexte}).`,
          action_suggested: 'Planifier une visite périodique dès que possible',
          priorite: joursRetard > 30 ? 5 : 4,
          details: { matricule_agent: agent.matricule_agent, poste, jours_retard: joursRetard, date_derniere_visite: agent.date_derniere_visite, periodicite_jours: periodicite }
        });
      } 
      // Cas 3: Bientôt due (dans les 30 jours)
      else if (joursRestants <= 30) {
        const niveauAlerte = joursRestants <= 7 ? 'URGENT' : joursRestants <= 15 ? 'IMPORTANT' : 'INFO';
        situations.push({
          type: 'PERIODIQUE_BIENTOT_DUE',
          niveau: niveauAlerte,
          titre: `📅 Visite périodique bientôt due — ${agent.nom} ${agent.prenom}`,
          message: `L'agent ${agent.nom} ${agent.prenom} (mat. ${agent.matricule_agent}, ${poste}) doit passer sa visite médicale périodique dans ${joursRestants} jour(s) (périodicité : ${periodiciteTexte}).`,
          action_suggested: joursRestants <= 7 ? 'Planifier la visite périodique en urgence' : 'Planifier la visite périodique prochainement',
          priorite: joursRestants <= 7 ? 4 : 3,
          details: { matricule_agent: agent.matricule_agent, poste, jours_restants: joursRestants, date_derniere_visite: agent.date_derniere_visite, periodicite_jours: periodicite }
        });
      }
    }

    return situations;
  }

  // 2. Détection des visites de reprise à planifier
  async detecterVisitesReprise() {
    const situations = [];
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    const agents = await Agent.findAll({ 
      where: { 
        date_fin_inaptitude: { [Op.not]: null }
      } 
    });

    for (const agent of agents) {
      const dateFin = new Date(agent.date_fin_inaptitude);
      
      if (dateFin < aujourdhui) continue;
      
      const dateRepriseIdeale = new Date(dateFin);
      dateRepriseIdeale.setDate(dateFin.getDate() - 3);
      
      const reprisePlanifiee = await Planning.findOne({
        where: {
          matricule_agent: agent.matricule_agent,
          type_visite: 'Reprise',
          statut: 'Programmé',
          date_visite: { [Op.gte]: aujourdhui }
        }
      });
      
      if (reprisePlanifiee) continue;
      
      const joursAvantRepriseIdeale = Math.floor((dateRepriseIdeale - aujourdhui) / (1000 * 60 * 60 * 24));
      
      if (joursAvantRepriseIdeale <= 7 && joursAvantRepriseIdeale >= 0) {
        const niveauAlerte = joursAvantRepriseIdeale <= 3 ? 'URGENT' : 'IMPORTANT';
        situations.push({
          type: 'REPRISE_A_PLANIFIER',
          niveau: niveauAlerte,
          titre: `🔄 Visite de reprise à planifier — ${agent.nom} ${agent.prenom}`,
          message: `L'agent ${agent.nom} ${agent.prenom} (mat. ${agent.matricule_agent}) termine son inaptitude le ${dateFin.toLocaleDateString('fr-FR')}. La visite de reprise doit être planifiée pour le ${dateRepriseIdeale.toLocaleDateString('fr-FR')} (dans ${joursAvantRepriseIdeale} jour(s)).`,
          action_suggested: 'Planifier la visite de reprise immédiatement',
          priorite: joursAvantRepriseIdeale <= 3 ? 5 : 4,
          details: { 
            matricule_agent: agent.matricule_agent, 
            date_fin_inaptitude: agent.date_fin_inaptitude,
            date_reprise_souhaitee: dateRepriseIdeale.toISOString().split('T')[0],
            jours_restants: joursAvantRepriseIdeale
          }
        });
      }
    }
    
    return situations;
  }

  // 3. Détection des visites programmées NON EFFECTUÉES (en retard)
  async detecterVisitesEnRetard() {
    const situations = [];
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    const visitesEnRetard = await Planning.findAll({
      where: {
        date_visite: { [Op.lt]: aujourdhui },
        visite_effectuee: false,
        statut: 'Programmé',
        type_visite: { [Op.in]: ['Périodique', 'Reprise', 'Reclassement', 'Embauche'] }
      },
      include: [{
        model: Agent,
        as: 'planningAgent',
        attributes: ['nom', 'prenom', 'matricule_agent']
      }]
    });
    
    for (const visite of visitesEnRetard) {
      const dateVisite = new Date(visite.date_visite);
      const joursRetard = Math.floor((aujourdhui - dateVisite) / (1000 * 60 * 60 * 24));
      const agent = visite.planningAgent;
      
      let niveau = 'IMPORTANT';
      let priorite = 4;
      
      if (joursRetard > 15) {
        niveau = 'CRITIQUE';
        priorite = 5;
      } else if (joursRetard > 7) {
        niveau = 'URGENT';
        priorite = 4;
      }
      
      situations.push({
        type: 'VISITE_EN_RETARD',
        niveau: niveau,
        titre: `⚠️ Visite ${visite.type_visite} en retard — ${agent?.nom} ${agent?.prenom}`,
        message: `La visite ${visite.type_visite} prévue le ${new Date(visite.date_visite).toLocaleDateString('fr-FR')} pour ${agent?.nom} ${agent?.prenom} (mat. ${agent?.matricule_agent}) n'a pas été effectuée. Retard de ${joursRetard} jour(s).`,
        action_suggested: `Effectuer ou reprogrammer la visite ${visite.type_visite} en urgence`,
        priorite: priorite,
        details: {
          id_planning: visite.id_planning,
          matricule_agent: agent?.matricule_agent,
          agent_nom: agent?.nom,
          agent_prenom: agent?.prenom,
          type_visite: visite.type_visite,
          date_prevue: visite.date_visite,
          jours_retard: joursRetard
        }
      });
    }
    
    return situations;
  }

  // 4. Détection des accidents NON DÉCLARÉS à la CNAM
  async detecterAccidentsNonDeclares() {
    const situations = [];
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    if (!Accident) {
      console.log('⚠️ Modèle Accident non disponible');
      return [];
    }
    
    const accidentsNonDeclares = await Accident.findAll({
      where: {
        statut: { [Op.ne]: 'declare' },
        date_accident: { [Op.not]: null }
      },
      include: [{
        model: Agent,
        as: 'accidentAgent',
        attributes: ['nom', 'prenom', 'matricule_agent']
      }],
      order: [['date_accident', 'DESC']]
    });
    
    for (const accident of accidentsNonDeclares) {
      const dateAccident = new Date(accident.date_accident);
      const joursDepuisAccident = Math.floor((aujourdhui - dateAccident) / (1000 * 60 * 60 * 24));
      const agent = accident.accidentAgent;
      
      const delaiLegal = 2;
      const estEnRetard = joursDepuisAccident > delaiLegal;
      
      let niveau = 'IMPORTANT';
      let priorite = 4;
      
      if (joursDepuisAccident > 15) {
        niveau = 'CRITIQUE';
        priorite = 5;
      } else if (joursDepuisAccident > 7) {
        niveau = 'URGENT';
        priorite = 4;
      } else if (estEnRetard) {
        niveau = 'URGENT';
        priorite = 4;
      }
      
      situations.push({
        type: 'ACCIDENT_NON_DECLARE',
        niveau: niveau,
        titre: `🚨 Accident non déclaré — ${agent?.nom} ${agent?.prenom}`,
        message: `L'accident de travail du ${new Date(accident.date_accident).toLocaleDateString('fr-FR')} concernant ${agent?.nom} ${agent?.prenom} (mat. ${agent?.matricule_agent}) n'a pas encore été déclaré à la CNAM. ${estEnRetard ? `Délai légal dépassé de ${joursDepuisAccident - delaiLegal} jour(s).` : ''}`,
        action_suggested: 'Déclarer l\'accident à la CNAM immédiatement',
        priorite: priorite,
        details: {
          id_accident: accident.id_accident,
          numero_accident: accident.numero_accident,
          matricule_agent: agent?.matricule_agent,
          agent_nom: agent?.nom,
          agent_prenom: agent?.prenom,
          date_accident: accident.date_accident,
          jours_depuis_accident: joursDepuisAccident,
          jours_retard: estEnRetard ? joursDepuisAccident - delaiLegal : 0,
          gravite: accident.gravite,
          jour_arret: accident.jour_arret
        }
      });
    }
    
    return situations;
  }

  // 5. Détection des convocations à envoyer
  async detecterConvocationsAVenir() {
    const situations = [];
    const aujourdhui = new Date();
    aujourdhui.setHours(0, 0, 0, 0);
    
    const dateLimite = new Date(aujourdhui);
    dateLimite.setDate(aujourdhui.getDate() + 7);
    
    const visitesSansConvocation = await Planning.findAll({
      where: {
        date_visite: { [Op.between]: [aujourdhui, dateLimite] },
        convocation_envoyee: false,
        statut: 'Programmé',
        type_visite: { [Op.in]: ['Périodique', 'Reprise'] }
      },
      include: [{
        model: Agent,
        as: 'planningAgent',
        attributes: ['nom', 'prenom', 'matricule_agent']
      }]
    });
    
    if (visitesSansConvocation.length > 0) {
      const visitesParJour = {};
      visitesSansConvocation.forEach(v => {
        const jour = v.date_visite;
        if (!visitesParJour[jour]) visitesParJour[jour] = [];
        visitesParJour[jour].push(v);
      });
      
      const detailsVisites = Object.entries(visitesParJour).map(([date, visites]) => ({
        date,
        nombre: visites.length,
        agents: visites.map(v => `${v.planningAgent?.nom} ${v.planningAgent?.prenom}`).join(', ')
      }));
      
      situations.push({
        type: 'CONVOCATIONS_A_ENVOYER',
        niveau: 'IMPORTANT',
        titre: `📧 ${visitesSansConvocation.length} convocation(s) à envoyer`,
        message: `${visitesSansConvocation.length} visite(s) médicale(s) (Périodique/Reprise) dans les 7 prochains jours n'ont pas encore reçu de convocation.`,
        action_suggested: 'Envoyer les convocations au GRH',
        priorite: 4,
        details: { visites: detailsVisites }
      });
    }
    
    return situations;
  }

  // 6. Détection de TOUTES les situations
  async detecterToutesSituations() {
    const toutes = [];

    const [periodiques, reprises, visitesRetard, accidentsNonDeclares, convocations] = await Promise.all([
      this.detecterVisitesPeriodiquesBientotDues(),
      this.detecterVisitesReprise(),
      this.detecterVisitesEnRetard(),
      this.detecterAccidentsNonDeclares(),
      this.detecterConvocationsAVenir()
    ]);

    toutes.push(...periodiques, ...reprises, ...visitesRetard, ...accidentsNonDeclares, ...convocations);

    console.log(`📊 ${toutes.length} situation(s) détectée(s):`);
    toutes.forEach(s => {
      console.log(`   - ${s.type} (${s.niveau}): ${s.titre}`);
    });

    return toutes;
  }

  // ============================================================
  //  ENVOI DES NOTIFICATIONS
  // ============================================================

  async envoyerNotifications() {
    console.log('\n🔔 Détection des situations pour notifications...');

    const situations = await this.detecterToutesSituations();
    console.log(`📊 ${situations.length} situation(s) détectée(s)`);

    if (situations.length === 0) return 0;

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
// Dans notificationIntelligenteService.js
async marquerCommeLue(idNotification, idUtilisateur) {
  try {
    const notification = await NotificationIntelligente.findOne({
      where: { id_notification: idNotification, id_utilisateur: idUtilisateur }
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
      { statut: 'lu', lu_at: new Date() },
      { where: { id_utilisateur: idUtilisateur, statut: 'non_lu' } }
    );
  }

  async archiver(idNotification, idUtilisateur) {
    const notification = await NotificationIntelligente.findOne({
      where: { id_notification: idNotification, id_utilisateur: idUtilisateur }
    });
    
    if (!notification) return null;
    
    notification.statut = 'archive';
    await notification.save();
    
    return notification;
  }

  async supprimer(idNotification, idUtilisateur) {
    const deleted = await NotificationIntelligente.destroy({
      where: { id_notification: idNotification, id_utilisateur: idUtilisateur }
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