// backend/services/notificationIntelligenteService.js
const { Op } = require('sequelize');
const Agent = require('../models/Agent');
const Planning = require('../models/Planning');
const User = require('../models/User');
const NotificationIntelligente = require('../models/NotificationIntelligente');

class NotificationIntelligenteService {

  // ============================================================
  //  UTILITAIRES
  // ============================================================

  _joursRestants(dateCible) {
    const aujourd_hui = new Date();
    aujourd_hui.setHours(0, 0, 0, 0);
    const cible = new Date(dateCible);
    cible.setHours(0, 0, 0, 0);
    return Math.round((cible - aujourd_hui) / (1000 * 60 * 60 * 24));
  }

  calculerPeriodicite(agent) {
    if (agent.periodicite_jours && agent.periodicite_jours > 0) {
      return agent.periodicite_jours;
    }
    return agent.code_affectation === 3 ? 180 : 365;
  }

  async getUsersCibles(roles = ['social']) {
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

  async detecterVisitesPeriodiquesBientotDues() {
    const situations = [];
    const aujourd_hui = new Date();
    const agents = await Agent.findAll({ where: { statut: 'actif' } });

    for (const agent of agents) {
      const periodicite = this.calculerPeriodicite(agent);
      const poste = agent.code_affectation === 3 ? 'Chauffeur' : 'Autre';
      const periodiciteTexte = agent.code_affectation === 3 ? '6 mois' : '1 an';

      if (agent.date_fin_inaptitude && new Date(agent.date_fin_inaptitude) > aujourd_hui) {
        continue;
      }

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
      const joursDepuis = Math.floor((aujourd_hui - dateDerniere) / (1000 * 60 * 60 * 24));
      const joursRestants = periodicite - joursDepuis;

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
      } else if (joursRestants <= 30) {
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

  async detecterVisitesReprise() {
    const situations = [];
    const aujourd_hui = new Date();

    const agentsEnArret = await Agent.findAll({
      where: {
        statut: 'actif',
        date_fin_inaptitude: { [Op.ne]: null, [Op.gte]: aujourd_hui }
      }
    });

    for (const agent of agentsEnArret) {
      const joursRestants = this._joursRestants(agent.date_fin_inaptitude);

      const visitePlanifiee = await Planning.findOne({
        where: {
          matricule_agent: agent.matricule_agent,
          type_visite: 'Reprise',
          statut: 'Programmé',
          date_visite: { [Op.gte]: aujourd_hui }
        }
      });

      if (joursRestants <= 3) {
        situations.push({
          type: 'REPRISE_CRITIQUE',
          niveau: 'CRITIQUE',
          titre: `🚨 Reprise CRITIQUE — ${agent.nom} ${agent.prenom} (J-${joursRestants})`,
          message: `L'agent ${agent.nom} ${agent.prenom} (mat. ${agent.matricule_agent}) reprend le travail dans ${joursRestants} jour(s) (fin arrêt : ${new Date(agent.date_fin_inaptitude).toLocaleDateString('fr-FR')}). ${visitePlanifiee ? '✅ Visite de reprise déjà planifiée.' : '❌ Aucune visite de reprise planifiée !'}`,
          action_suggested: visitePlanifiee ? 'Vérifier que la convocation a été envoyée' : 'Planifier une visite de reprise en URGENCE ABSOLUE',
          priorite: 5,
          details: { matricule_agent: agent.matricule_agent, date_fin_inaptitude: agent.date_fin_inaptitude, jours_restants: joursRestants, visite_planifiee: !!visitePlanifiee }
        });
      } else if (joursRestants <= 7) {
        situations.push({
          type: 'REPRISE_URGENTE',
          niveau: 'URGENT',
          titre: `⚠️ Reprise urgente — ${agent.nom} ${agent.prenom} (J-${joursRestants})`,
          message: `L'agent ${agent.nom} ${agent.prenom} (mat. ${agent.matricule_agent}) reprend le travail dans ${joursRestants} jour(s) (fin arrêt : ${new Date(agent.date_fin_inaptitude).toLocaleDateString('fr-FR')}). ${visitePlanifiee ? '✅ Visite de reprise planifiée.' : '⚠️ Aucune visite de reprise planifiée.'}`,
          action_suggested: visitePlanifiee ? 'Préparer la convocation pour la visite de reprise' : 'Planifier la visite de reprise dès que possible',
          priorite: 4,
          details: { matricule_agent: agent.matricule_agent, date_fin_inaptitude: agent.date_fin_inaptitude, jours_restants: joursRestants, visite_planifiee: !!visitePlanifiee }
        });
      } else if (joursRestants <= 14 && !visitePlanifiee) {
        situations.push({
          type: 'REPRISE_A_PLANIFIER',
          niveau: 'INFO',
          titre: `📋 Visite de reprise à planifier — ${agent.nom} ${agent.prenom}`,
          message: `L'agent ${agent.nom} ${agent.prenom} (mat. ${agent.matricule_agent}) reprend le travail dans ${joursRestants} jour(s). Aucune visite de reprise n'est encore planifiée.`,
          action_suggested: 'Planifier la visite de reprise',
          priorite: 3,
          details: { matricule_agent: agent.matricule_agent, date_fin_inaptitude: agent.date_fin_inaptitude, jours_restants: joursRestants }
        });
      }
    }

    return situations;
  }

  async detecterVisitesManuellesApprochantes() {
    const situations = [];
    const aujourd_hui = new Date();
    const dans2Jours = new Date(aujourd_hui);
    dans2Jours.setDate(aujourd_hui.getDate() + 2);

    const plannings = await Planning.findAll({
      where: {
        type_visite: { [Op.in]: ['Reclassement', 'Embauche'] },
        statut: 'Programmé',
        date_visite: {
          [Op.gte]: aujourd_hui.toISOString().split('T')[0],
          [Op.lte]: dans2Jours.toISOString().split('T')[0]
        },
        convocation_envoyee: false
      },
      include: [{
        model: Agent,
        as: 'planningAgent',
        attributes: ['matricule_agent', 'nom', 'prenom', 'code_affectation']
      }]
    });

    for (const planning of plannings) {
      const agent = planning.planningAgent;
      if (!agent) continue;

      const joursRestants = this._joursRestants(planning.date_visite);
      const emoji = planning.type_visite === 'Reclassement' ? '📝' : '👔';

      situations.push({
        type: `${planning.type_visite.toUpperCase()}_APPROCHANT`,
        niveau: joursRestants <= 1 ? 'URGENT' : 'IMPORTANT',
        titre: `${emoji} ${planning.type_visite} dans ${joursRestants}j — ${agent.nom} ${agent.prenom}`,
        message: `Visite de ${planning.type_visite} planifiée le ${new Date(planning.date_visite).toLocaleDateString('fr-FR')} à ${(planning.heure_visite || '').substring(0, 5)} pour l'agent ${agent.nom} ${agent.prenom} (mat. ${agent.matricule_agent}). La convocation n'a pas encore été envoyée.`,
        action_suggested: 'Envoyer la convocation au service GRH dès maintenant',
        priorite: 4,
        details: { matricule_agent: agent.matricule_agent, id_planning: planning.id_planning, date_visite: planning.date_visite, type_visite: planning.type_visite, heure_visite: planning.heure_visite, jours_restants: joursRestants }
      });
    }

    return situations;
  }

  async detecterConvocationsAEnvoyer() {
    const situations = [];
    const aujourd_hui = new Date();
    const dans7Jours = new Date(aujourd_hui);
    dans7Jours.setDate(aujourd_hui.getDate() + 7);

    const convocations = await Planning.findAll({
      where: {
        statut: 'Programmé',
        convocation_envoyee: false,
        date_visite: {
          [Op.gte]: aujourd_hui.toISOString().split('T')[0],
          [Op.lte]: dans7Jours.toISOString().split('T')[0]
        }
      },
      include: [{
        model: Agent,
        as: 'planningAgent',
        attributes: ['matricule_agent', 'nom', 'prenom']
      }]
    });

    if (convocations.length > 0) {
      const agents_liste = convocations.slice(0, 5).map(p => `${p.planningAgent?.nom || '?'} ${p.planningAgent?.prenom || ''}`).join(', ');

      situations.push({
        type: 'CONVOCATIONS_A_ENVOYER',
        niveau: 'IMPORTANT',
        titre: `📧 ${convocations.length} convocation(s) à envoyer cette semaine`,
        message: `${convocations.length} agent(s) ont une visite médicale dans les 7 prochains jours mais n'ont pas encore reçu leur convocation. Agents : ${agents_liste}${convocations.length > 5 ? '...' : ''}.`,
        action_suggested: 'Envoyer les convocations via le module Planning',
        priorite: 4,
        details: { nb_convocations: convocations.length, ids_planning: convocations.map(p => p.id_planning) }
      });
    }

    return situations;
  }

  async detecterProblemesPlanningHebdomadaire() {
    const situations = [];
    const aujourd_hui = new Date();

    const d = new Date(aujourd_hui);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
    const week1 = new Date(d.getFullYear(), 0, 4);
    const semaineActuelle = 1 + Math.round(((d - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    const annee = aujourd_hui.getFullYear();

    const planningActuel = await Planning.findOne({ where: { semaine: semaineActuelle, annee } });

    if (!planningActuel) {
      situations.push({
        type: 'PLANNING_SEMAINE_MANQUANT',
        niveau: 'URGENT',
        titre: `🚨 Planning semaine ${semaineActuelle}/${annee} non généré`,
        message: `Le planning automatique de la semaine ${semaineActuelle}/${annee} n'a pas encore été généré. Le système va tenter de le générer automatiquement.`,
        action_suggested: 'Vérifier le planning ou le générer manuellement',
        priorite: 5,
        details: { semaine: semaineActuelle, annee }
      });
    } else {
      const total = await Planning.count({ where: { semaine: semaineActuelle, annee } });
      const effectuees = await Planning.count({ where: { semaine: semaineActuelle, annee, statut: 'Effectué' } });
      const taux = total > 0 ? Math.round((effectuees / total) * 100) : 0;
      const jourSemaine = aujourd_hui.getDay();

      if ([4, 5].includes(jourSemaine) && taux < 70 && total > 0) {
        situations.push({
          type: 'TAUX_REALISATION_FAIBLE',
          niveau: 'IMPORTANT',
          titre: `📊 Taux de réalisation faible — semaine ${semaineActuelle} (${taux}%)`,
          message: `La semaine ${semaineActuelle}/${annee} affiche un taux de réalisation de ${taux}% (${effectuees}/${total} visites effectuées).`,
          action_suggested: 'Vérifier les visites non effectuées et les reprogrammer',
          priorite: 3,
          details: { semaine: semaineActuelle, annee, taux, effectuees, total }
        });
      }
    }

    return situations;
  }

  async detecterToutesSituations() {
    const toutes = [];

    const [periodiques, reprises, manuelles, convocations, planning] = await Promise.all([
      this.detecterVisitesPeriodiquesBientotDues(),
      this.detecterVisitesReprise(),
      this.detecterVisitesManuellesApprochantes(),
      this.detecterConvocationsAEnvoyer(),
      this.detecterProblemesPlanningHebdomadaire()
    ]);

    toutes.push(...reprises);
    toutes.push(...periodiques);
    toutes.push(...manuelles);
    toutes.push(...convocations);
    toutes.push(...planning);

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

    const users = await this.getUsersCibles(['social']);
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

  _niveauToType(niveau) {
    const map = { CRITIQUE: 'IMPORTANT', URGENT: 'IMPORTANT', IMPORTANT: 'IMPORTANT', INFO: 'INFO' };
    return map[niveau] || 'INFO';
  }

  async verifierConvocationsAVenir() {
    console.log('\n📧 Vérification des convocations à venir...');
    const situations = await this.detecterConvocationsAEnvoyer();
    const situations2 = await this.detecterVisitesManuellesApprochantes();

    const toutes = [...situations, ...situations2];
    if (toutes.length === 0) {
      console.log('✅ Aucune convocation urgente');
      return 0;
    }

    const users = await this.getUsersCibles(['social']);
    let total = 0;

    for (const situation of toutes) {
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
        if (notif) total++;
      }
    }

    return total;
  }

  // ============================================================
  //  GESTION DES NOTIFICATIONS UTILISATEUR
  // ============================================================

  async getNotificationsUtilisateur(idUtilisateur, statut = null, limit = 50) {
    const where = { id_utilisateur: idUtilisateur };
    if (statut && statut !== 'toutes') where.statut = statut;

    return NotificationIntelligente.findAll({
      where,
      order: [['priorite', 'DESC'], ['created_at', 'DESC']],
      limit
    });
  }

  async marquerCommeLue(id, idUtilisateur) {
    const notif = await NotificationIntelligente.findOne({ where: { id, id_utilisateur: idUtilisateur } });
    if (!notif) return null;

    notif.statut = 'lu';
    notif.lu_le = new Date();
    await notif.save();
    return notif;
  }

  async marquerToutesLues(idUtilisateur) {
    return NotificationIntelligente.update(
      { statut: 'lu', lu_le: new Date() },
      { where: { id_utilisateur: idUtilisateur, statut: 'non_lu' } }
    );
  }

  async archiver(id, idUtilisateur) {
    const notif = await NotificationIntelligente.findOne({ where: { id, id_utilisateur: idUtilisateur } });
    if (!notif) return null;

    notif.statut = 'archive';
    await notif.save();
    return notif;
  }

  async supprimer(id, idUtilisateur) {
    return NotificationIntelligente.destroy({ where: { id, id_utilisateur: idUtilisateur } });
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