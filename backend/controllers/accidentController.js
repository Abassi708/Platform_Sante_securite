// backend/controllers/accidentController.js
const Accident = require('../models/Accident');
const Agent = require('../models/Agent');
const Planning = require('../models/Planning');
const Visite = require('../models/Visite');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const planningService = require('../services/planningService');
const notificationService = require('../services/notificationIntelligenteService');
const tracabiliteService = require('../services/tracabiliteVisiteService');

// ========== FONCTIONS UTILITAIRES ==========
async function getJourOuvreAvant(date) {
  const dateTemp = new Date(date);
  let joursEssais = 0;
  
  while (!(await planningService.estJourOuvre(dateTemp)) && joursEssais < 21) {
    dateTemp.setDate(dateTemp.getDate() - 1);
    joursEssais++;
  }
  
  return dateTemp;
}

async function getProchainJourOuvre(date) {
  const dateTemp = new Date(date);
  let joursEssais = 0;
  
  while (!(await planningService.estJourOuvre(dateTemp)) && joursEssais < 21) {
    dateTemp.setDate(dateTemp.getDate() + 1);
    joursEssais++;
  }
  
  return dateTemp;
}

// ========== FONCTION POUR TROUVER UN CRÉNEAU DISPONIBLE POUR LA REPRISE ==========
async function trouverCreneauDisponibleReprise(dateCible, agent) {
  const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
  
  console.log(`   📅 Date cible reçue: ${dateCible.toISOString().split('T')[0]}`);
  
  // 1. Ajuster au jour ouvré AVANT (PRIORITÉ ABSOLUE)
  let dateAjustee = new Date(dateCible);
  let joursRecherche = 0;
  
  while (!(await planningService.estJourOuvre(dateAjustee)) && joursRecherche < 10) {
    dateAjustee.setDate(dateCible.getDate() - (joursRecherche + 1));
    joursRecherche++;
  }
  
  const dateCibleStr = dateAjustee.toISOString().split('T')[0];
  console.log(`   📅 Date cible après ajustement: ${dateCibleStr}`);
  
  // 2. Vérifier les créneaux disponibles à cette date
  for (const heure of creneaux) {
    const existe = await Planning.findOne({
      where: {
        date_visite: dateCibleStr,
        heure_visite: heure,
        statut: 'Programmé'
      }
    });
    
    if (!existe) {
      console.log(`   ✅ Créneau disponible: ${dateCibleStr} à ${heure}`);
      return { date: dateAjustee, heure, trouve: true };
    }
  }
  
  console.log(`   ⚠️ Tous les créneaux du ${dateCibleStr} sont occupés`);
  
  // 3. Si tous les créneaux sont occupés, chercher le jour suivant (dernier recours)
  for (let i = 1; i <= 5; i++) {
    const dateSuivante = new Date(dateAjustee);
    dateSuivante.setDate(dateAjustee.getDate() + i);
    
    if (!(await planningService.estJourOuvre(dateSuivante))) continue;
    
    const dateStr = dateSuivante.toISOString().split('T')[0];
    console.log(`   🔍 Essai date suivante (J+${i}): ${dateStr}`);
    
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
        return { date: dateSuivante, heure, trouve: true };
      }
    }
  }
  
  return { trouve: false };
}
// ========== CRÉER UN ACCIDENT ==========
const createAccident = async (req, res) => {
  try {
    const accidentData = req.body;
    
    // Validation
    if (!accidentData.matricule_agent) {
      return res.status(400).json({ success: false, message: 'Matricule agent requis' });
    }
    if (!accidentData.date_accident) {
      return res.status(400).json({ success: false, message: 'Date d\'accident requise' });
    }
    
    accidentData.created_by = req.user.id;
    
    // Générer numéro d'accident
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
      const transaction = await sequelize.transaction();
      
      try {
        const agent = await Agent.findByPk(accident.matricule_agent, { transaction });
        
        if (agent) {
          // ÉTAPE 1: Calcul de la date de fin d'arrêt
          const [anneeA, moisA, jourA] = accident.date_accident.split('-');
          const dateAccident = new Date(parseInt(anneeA), parseInt(moisA) - 1, parseInt(jourA));
          const dateFinArret = new Date(dateAccident);
          dateFinArret.setDate(dateAccident.getDate() + accident.jour_arret);
          
          const anneeFin = dateFinArret.getFullYear();
          const moisFin = dateFinArret.getMonth() + 1;
          const jourFin = dateFinArret.getDate();
          const dateFinStr = `${anneeFin}-${moisFin.toString().padStart(2, '0')}-${jourFin.toString().padStart(2, '0')}`;
          
          console.log(`\n📅 ÉTAPE 1: Calcul fin inaptitude`);
          console.log(`   Date accident: ${accident.date_accident}`);
          console.log(`   + ${accident.jour_arret} jours`);
          console.log(`   = Fin inaptitude: ${dateFinStr}`);
          
          // ÉTAPE 2: Mettre à jour l'agent
          await agent.update({
            date_debut_inaptitude: accident.date_accident,
            date_fin_inaptitude: dateFinStr
          }, { transaction });
          console.log(`   ✅ Agent mis à jour`);
          
          // ÉTAPE 3: Calcul de la date de reprise = 3 jours AVANT la fin
          const dateReprise = new Date(dateFinArret);
          dateReprise.setDate(dateFinArret.getDate() - 3);
          
          const anneeR = dateReprise.getFullYear();
          const moisR = dateReprise.getMonth() + 1;
          const jourR = dateReprise.getDate();
          const dateRepriseStr = `${anneeR}-${moisR.toString().padStart(2, '0')}-${jourR.toString().padStart(2, '0')}`;
          
          console.log(`\n📅 ÉTAPE 2: Calcul date reprise idéale`);
          console.log(`   Fin inaptitude: ${dateFinStr}`);
          console.log(`   - 3 jours`);
          console.log(`   = Reprise idéale: ${dateRepriseStr}`);
          console.log(`   Jour: ${dateReprise.toLocaleDateString('fr-FR', { weekday: 'long' })}`);
          
          // ÉTAPE 3: Ajuster au jour ouvré (chercher le jour précédent si nécessaire)
          let dateFinale = new Date(dateReprise);
          let joursRecherche = 0;
          
          while (!(await planningService.estJourOuvre(dateFinale)) && joursRecherche < 10) {
            dateFinale.setDate(dateReprise.getDate() - (joursRecherche + 1));
            joursRecherche++;
          }
          
          const anneeF = dateFinale.getFullYear();
          const moisF = dateFinale.getMonth() + 1;
          const jourF = dateFinale.getDate();
          const dateFinaleStr = `${anneeF}-${moisF.toString().padStart(2, '0')}-${jourF.toString().padStart(2, '0')}`;
          
          console.log(`\n📅 ÉTAPE 3: Ajustement jour ouvré`);
          if (joursRecherche > 0) {
            console.log(`   ${dateRepriseStr} n'est pas un jour ouvré`);
            console.log(`   → Ajustement de ${joursRecherche} jour(s) avant`);
            console.log(`   = Date retenue: ${dateFinaleStr}`);
          } else {
            console.log(`   ✅ ${dateRepriseStr} est un jour ouvré, date retenue`);
          }
          
          // ÉTAPE 4: Chercher un créneau disponible
          const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
          let heureTrouvee = null;
          
          console.log(`\n📅 ÉTAPE 4: Recherche créneau disponible`);
          
          for (const heure of creneaux) {
            const existe = await Planning.findOne({
              where: {
                date_visite: dateFinaleStr,
                heure_visite: heure,
                statut: 'Programmé'
              }
            });
            
            if (!existe) {
              heureTrouvee = heure;
              console.log(`   ✅ Créneau trouvé: ${dateFinaleStr} à ${heure}`);
              break;
            } else {
              console.log(`   ⚠️ ${dateFinaleStr} à ${heure} est occupé`);
            }
          }
          
          if (!heureTrouvee) {
            console.log(`   ❌ Aucun créneau disponible le ${dateFinaleStr}`);
            await transaction.rollback();
            return res.status(400).json({ 
              success: false, 
              message: `Aucun créneau disponible le ${dateFinaleStr} pour la visite de reprise` 
            });
          }
          
          const typeVisite = accident.jour_arret > 30 ? 'Reclassement' : 'Reprise';
          
          // ÉTAPE 5: Créer la visite
          const planning = await Planning.create({
            matricule_agent: agent.matricule_agent,
            date_visite: dateFinaleStr,
            heure_visite: heureTrouvee,
            type_visite: typeVisite,
            statut: 'Programmé',
            priorite: 150,
            semaine: planningService.getNumeroSemaine(dateFinale),
            annee: dateFinale.getFullYear(),
            created_by: req.user.id,
            convocation_envoyee: false,
            motif_reprogrammation: `Visite ${typeVisite} post-accident (${accident.numero_accident})`,
            source_planification: 'auto'
          }, { transaction });
          
          console.log(`\n✅ VISITE DE REPRISE CRÉÉE:`);
          console.log(`   ID: ${planning.id_planning}`);
          console.log(`   Date: ${dateFinaleStr}`);
          console.log(`   Heure: ${heureTrouvee}`);
          console.log(`   Type: ${typeVisite}`);
          
          // ÉTAPE 6: Historique
          await Visite.create({
            matricule_agent: agent.matricule_agent,
            date_visite: dateFinaleStr,
            heure_visite: heureTrouvee,
            type_visite: typeVisite,
            medecin: 'Système',
            observation: `Programmation automatique pour ${typeVisite} post-accident (${accident.numero_accident})`,
            id_planning: planning.id_planning,
            type_action: 'PROGRAMMATION',
            ancien_statut: null,
            nouveau_statut: 'Programmé',
            motif_action: `Programmation automatique - ${typeVisite}`,
            details_action: JSON.stringify({
              accident_id: accident.id_accident,
              date_accident: accident.date_accident,
              date_fin_arret: dateFinStr,
              date_reprise_calculee: dateRepriseStr,
              date_reprise_retenue: dateFinaleStr,
              jours_arret: accident.jour_arret,
              ajustement_jours: joursRecherche
            }),
            source: 'PLANNING',
            created_by: req.user.id
          }, { transaction });
          
          await transaction.commit();
          
        } else {
          console.log(`❌ Agent non trouvé`);
          await transaction.rollback();
        }
        
      } catch (error) {
        await transaction.rollback();
        console.error('❌ Erreur transaction:', error);
        throw error;
      }
    }
    
    res.status(201).json({ 
      success: true, 
      message: 'Accident créé' + (accident.jour_arret > 0 ? ' - Visite de reprise programmée' : ''), 
      accident 
    });
    
  } catch (error) {
    console.error('❌ Erreur création accident:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// ========== RÉCUPÉRER TOUS LES ACCIDENTS ==========
const getAccidents = async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', statut, gravite, dateDebut, dateFin } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { numero_accident: { [Op.like]: `%${search}%` } },
        { lieu_accident: { [Op.like]: `%${search}%` } },
        { '$accidentAgent.nom$': { [Op.like]: `%${search}%` } },
        { '$accidentAgent.prenom$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (statut && statut !== 'all') whereClause.statut = statut;
    if (gravite && gravite !== 'all') whereClause.gravite = gravite;
    
    if (dateDebut && dateFin) {
      whereClause.date_accident = { [Op.between]: [dateDebut, dateFin] };
    }
    
    const { count, rows } = await Accident.findAndCountAll({
      where: whereClause,
      include: [{
        model: Agent,
        as: 'accidentAgent',
        attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation']
      }],
      order: [['date_accident', 'DESC'], ['heure_accident', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({ success: true, total: count, page: parseInt(page), totalPages: Math.ceil(count / limit), accidents: rows });
    
  } catch (error) {
    console.error('❌ Erreur récupération accidents:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des accidents' });
  }
};

// ========== RÉCUPÉRER UN ACCIDENT PAR ID ==========
const getAccidentById = async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id, {
      include: [{
        model: Agent,
        as: 'accidentAgent',
        attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation']
      }]
    });
    
    if (!accident) return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    
    res.json({ success: true, accident });
    
  } catch (error) {
    console.error('❌ Erreur récupération accident:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};

// ========== METTRE À JOUR UN ACCIDENT ==========
const updateAccident = async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id);
    if (!accident) return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    
    if (accident.statut === 'declare' && req.body.statut !== 'declare') {
      return res.status(403).json({ success: false, message: 'Impossible de modifier un accident déjà déclaré à la CNAM' });
    }
    
    const ancienJoursArret = accident.jour_arret;
    const ancienneDateAccident = accident.date_accident;
    
    req.body.updated_by = req.user.id;
    await accident.update(req.body);
    
    if (ancienJoursArret !== accident.jour_arret || ancienneDateAccident !== accident.date_accident) {
      if (accident.jour_arret > 0) {
        // Re-traiter l'arrêt avec les nouvelles dates
        const agent = await Agent.findByPk(accident.matricule_agent);
        if (agent) {
          const dateDebut = accident.date_accident;
          const dateFin = new Date(accident.date_accident);
          dateFin.setDate(dateFin.getDate() + accident.jour_arret);
          const dateFinStr = dateFin.toISOString().split('T')[0];
          
          await Agent.update(
            {
              date_debut_inaptitude: dateDebut,
              date_fin_inaptitude: dateFinStr
            },
            { where: { matricule_agent: agent.matricule_agent } }
          );
        }
      }
    }
    
    const accidentMisAJour = await Accident.findByPk(req.params.id, {
      include: [{ model: Agent, as: 'accidentAgent', attributes: ['nom', 'prenom'] }]
    });
    
    res.json({ success: true, message: 'Accident mis à jour avec succès', accident: accidentMisAJour });
    
  } catch (error) {
    console.error('❌ Erreur mise à jour accident:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la mise à jour' });
  }
};

// ========== SUPPRIMER UN ACCIDENT ==========
const deleteAccident = async (req, res) => {
  try {
    const accident = await Accident.findByPk(req.params.id);
    if (!accident) return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    
    if (accident.statut === 'declare') {
      return res.status(403).json({ success: false, message: 'Impossible de supprimer un accident déjà déclaré à la CNAM' });
    }
    
    await accident.destroy();
    res.json({ success: true, message: 'Accident supprimé avec succès' });
    
  } catch (error) {
    console.error('❌ Erreur suppression accident:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la suppression' });
  }
};

// ========== CHANGER LE STATUT D'UN ACCIDENT ==========
const changerStatut = async (req, res) => {
  try {
    const { statut } = req.body;
    const accident = await Accident.findByPk(req.params.id);
    if (!accident) return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    
    const ancienStatut = accident.statut;
    accident.statut = statut;
    
    if (statut === 'declare') {
      accident.date_declaration_cnam = new Date().toLocaleString('fr-FR');
    }
    
    accident.updated_by = req.user.id;
    await accident.save();
    
    if (statut === 'declare' && accident.jour_arret > 0) {
      const agent = await Agent.findByPk(accident.matricule_agent);
      if (agent && agent.date_fin_inaptitude) {
        const dateFin = new Date(agent.date_fin_inaptitude);
        if (dateFin <= new Date() || (dateFin - new Date()) <= 7 * 24 * 60 * 60 * 1000) {
          // Planifier la reprise si elle n'existe pas
          const dateReprise = new Date(dateFin);
          dateReprise.setDate(dateFin.getDate() - 3);
          const creneauDisponible = await trouverCreneauDisponibleReprise(dateReprise, agent);
          
          if (creneauDisponible.trouve) {
            const planning = await Planning.create({
              matricule_agent: agent.matricule_agent,
              date_visite: creneauDisponible.date.toISOString().split('T')[0],
              heure_visite: creneauDisponible.heure,
              type_visite: accident.jour_arret > 30 ? 'Reclassement' : 'Reprise',
              statut: 'Programmé',
              priorite: 150,
              semaine: planningService.getNumeroSemaine(creneauDisponible.date),
              annee: creneauDisponible.date.getFullYear(),
              created_by: req.user.id,
              convocation_envoyee: false,
              motif_reprogrammation: `Visite post-déclaration (${accident.numero_accident})`,
              source_planification: 'auto'
            });
            
            console.log(`✅ Visite de reprise planifiée après déclaration: ${planning.date_visite}`);
          }
        }
      }
    }
    
    // Envoyer une notification
    const users = await notificationService.getUsersCibles(['social', 'admin']);
    const agent = await Agent.findByPk(accident.matricule_agent, { attributes: ['nom', 'prenom'] });
    await notificationService.creerNotificationsMultiples(
      users.map(u => ({ id: u.id_utilisateur, email: u.Login, role: u.Role })),
      {
        type: statut === 'declare' ? 'INFO' : 'IMPORTANT',
        titre: `📋 Accident ${statut === 'declare' ? 'déclaré' : 'modifié'}`,
        message: `Accident ${accident.numero_accident} - Agent ${agent?.nom} ${agent?.prenom} - Statut changé de ${ancienStatut} à ${statut}.`,
        action_suggested: statut === 'declare' && accident.jour_arret > 0 
          ? 'Vérifier la planification de la visite de reprise' 
          : null,
        priorite: 3,
        source: 'accident_statut',
        details: {
          id_accident: accident.id_accident,
          numero_accident: accident.numero_accident,
          ancien_statut: ancienStatut,
          nouveau_statut: statut
        }
      }
    );
    
    res.json({ success: true, message: `Statut changé à ${statut}`, accident });
    
  } catch (error) {
    console.error('❌ Erreur changement statut:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du changement de statut' });
  }
};

// ========== STATISTIQUES DES ACCIDENTS ==========
const getStats = async (req, res) => {
  try {
    const total = await Accident.count();
    const declares = await Accident.count({ where: { statut: 'declare' } });
    const brouillons = await Accident.count({ where: { statut: 'brouillon' } });
    
    const parGravite = await Accident.findAll({
      attributes: ['gravite', [Accident.sequelize.fn('COUNT', 'gravite'), 'count']],
      group: ['gravite']
    });
    
    const graviteStats = { faible: 0, moyenne: 0, elevee: 0, critique: 0 };
    parGravite.forEach(item => {
      const gravite = item.gravite?.toLowerCase() || '';
      const count = parseInt(item.dataValues.count);
      if (gravite === 'faible') graviteStats.faible = count;
      else if (gravite === 'moyenne') graviteStats.moyenne = count;
      else if (gravite === 'élevée') graviteStats.elevee = count;
      else if (gravite === 'critique') graviteStats.critique = count;
    });
    
    const currentYear = new Date().getFullYear();
    const parMois = await Accident.findAll({
      attributes: [
        [Accident.sequelize.fn('MONTH', Accident.sequelize.col('date_accident')), 'mois'],
        [Accident.sequelize.fn('COUNT', 'id_accident'), 'count']
      ],
      where: Accident.sequelize.where(Accident.sequelize.fn('YEAR', Accident.sequelize.col('date_accident')), currentYear),
      group: [Accident.sequelize.fn('MONTH', Accident.sequelize.col('date_accident'))],
      order: [[Accident.sequelize.fn('MONTH', Accident.sequelize.col('date_accident')), 'ASC']]
    });
    
    const moisStats = Array(12).fill(0);
    parMois.forEach(item => {
      const mois = parseInt(item.dataValues.mois) - 1;
      moisStats[mois] = parseInt(item.dataValues.count);
    });
    
    const totalJoursArret = await Accident.sum('jour_arret');
    const accidentsAvecArret = await Accident.count({ where: { jour_arret: { [Op.gt]: 0 } } });
    
    res.json({
      success: true,
      stats: { 
        total, 
        declares, 
        brouillons, 
        parGravite: graviteStats, 
        parMois: moisStats,
        joursArret: { total: totalJoursArret || 0, accidentsAvecArret }
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur stats accidents:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du calcul des statistiques' });
  }
};

// ========== RÉCUPÉRER TOUS LES AGENTS ==========
const getAgents = async (req, res) => {
  try {
    const agents = await Agent.findAll({
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation'],
      order: [['nom', 'ASC']]
    });
    res.json({ success: true, agents });
  } catch (error) {
    console.error('❌ Erreur récupération agents:', error);
    res.status(500).json({ success: false, message: 'Erreur lors de la récupération des agents' });
  }
};

// ========== RÉCUPÉRER LES STATISTIQUES DES ACCIDENTS PAR AGENT ==========
const getStatsParAgent = async (req, res) => {
  try {
    const stats = await Accident.findAll({
      attributes: [
        'matricule_agent',
        [Accident.sequelize.fn('COUNT', '*'), 'nb_accidents'],
        [Accident.sequelize.fn('SUM', Accident.sequelize.col('jour_arret')), 'total_jours_arret']
      ],
      include: [{ model: Agent, as: 'accidentAgent', attributes: ['nom', 'prenom', 'code_affectation'] }],
      group: ['matricule_agent'],
      order: [[Accident.sequelize.fn('COUNT', '*'), 'DESC']],
      limit: 10
    });
    res.json({ success: true, stats });
  } catch (error) {
    console.error('❌ Erreur stats par agent:', error);
    res.status(500).json({ success: false, message: 'Erreur lors du calcul des statistiques' });
  }
};

module.exports = {
  createAccident,
  getAccidents,
  getAccidentById,
  updateAccident,
  deleteAccident,
  changerStatut,
  getStats,
  getAgents,
  getStatsParAgent
};