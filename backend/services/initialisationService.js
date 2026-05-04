// backend/services/initialisationService.js
const planningService = require('./planningService');
const notificationService = require('./notificationIntelligenteService');
const { sequelizeLocal } = require('../config/database');

class InitialisationService {
  
  async initialiser() {
    console.log('\n' + '='.repeat(70));
    console.log('🚀 SERVICE D\'INITIALISATION AUTOMATIQUE');
    console.log('='.repeat(70));
    
    // 1. Planning
    try {
      await this.verifierPlanning();
    } catch (error) {
      console.error(`❌ Planning: ${error.message}`);
    }
    
    // 2. Alertes - UNE SEULE FOIS au démarrage
    try {
      await this.verifierAlertes(); // ← Garder cette ligne
    } catch (error) {
      console.error(`❌ Alertes: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ INITIALISATION TERMINÉE');
    console.log('='.repeat(70) + '\n');
  }
  
  async verifierPlanning() {
    const aujourdhui = new Date();
    const semaineActuelle = planningService.getNumeroSemaine(aujourdhui);
    const annee = aujourdhui.getFullYear();
    
    const [planningExistant] = await sequelizeLocal.query(`
      SELECT COUNT(*) as count FROM planning WHERE semaine = ? AND annee = ?
    `, { replacements: [semaineActuelle, annee] });
    
    if (planningExistant[0].count === 0) {
      console.log(`📅 Génération planning semaine ${semaineActuelle}/${annee}...`);
      const dateDebut = planningService.getLundiSemaine(semaineActuelle, annee);
      const planning = await planningService.genererPlanningSemaine(new Date(dateDebut), 1);
      console.log(`   ✅ ${planning.length} visite(s) créée(s)`);
    } else {
      console.log(`   ✅ Planning OK (${planningExistant[0].count} visites)`);
    }
  }
  

async verifierAlertes() {
  console.log(`🔔 Vérification des alertes...`);
  
  // Récupérer les situations actuelles
  const situations = await notificationService.detecterToutesSituations();
  
  if (situations.length === 0) {
    console.log(`   ✅ Aucune situation problématique`);
    return;
  }
  
  console.log(`   📊 ${situations.length} situation(s) détectée(s)`);
  
  let nouvellesSituations = [];
  let nouvellesVisites = false;
  let nouveauxAccidents = 0;
  
  for (const situation of situations) {
    let dejaNotifie = false;
    
    if (situation.type === 'ACCIDENT_NON_DECLARE') {
      // Pour les accidents : vérifier par ID unique
      const idAccident = situation.details?.accident?.id_accident || situation.details?.id_accident;
      const [existant] = await sequelizeLocal.query(`
        SELECT id FROM notifications_intelligentes 
        WHERE source = 'ACCIDENT_NON_DECLARE' 
          AND JSON_EXTRACT(details, '$.accident.id_accident') = ?
        LIMIT 1
      `, { replacements: [idAccident] });
      
      if (existant && existant.length > 0) {
        dejaNotifie = true;
      } else {
        nouveauxAccidents++;
      }
    }
    else if (situation.type === 'VISITES_PERIODIQUES_EN_RETARD') {
      // Pour les visites : vérifier si les IDs des visites ont changé
      const idsVisites = situation.details?.visites?.map(v => v.id_planning).sort().join(',');
      
      const [existant] = await sequelizeLocal.query(`
        SELECT details FROM notifications_intelligentes 
        WHERE source = 'VISITES_PERIODIQUES_EN_RETARD' 
        ORDER BY created_at DESC LIMIT 1
      `);
      
      if (existant && existant.length > 0) {
        try {
          const anciensIds = JSON.parse(existant[0].details)?.visites?.map(v => v.id_planning).sort().join(',');
          if (anciensIds === idsVisites) {
            dejaNotifie = true;
            console.log(`   ⏭️ Visites déjà notifiées (mêmes IDs)`);
          } else {
            nouvellesVisites = true;
            console.log(`   🆕 Nouvelles visites détectées (IDs changés)`);
          }
        } catch(e) {
          nouvellesVisites = true;
        }
      } else {
        nouvellesVisites = true;
      }
    }
    else if (situation.type === 'AGENTS_PRIORITAIRES_CRITIQUES') {
      // Pour les agents prioritaires : vérifier si la liste a changé
      const idsAgents = situation.details?.agents?.map(a => a.matricule_agent).sort().join(',');
      
      const [existant] = await sequelizeLocal.query(`
        SELECT details FROM notifications_intelligentes 
        WHERE source = 'AGENTS_PRIORITAIRES_CRITIQUES' 
        ORDER BY created_at DESC LIMIT 1
      `);
      
      if (existant && existant.length > 0) {
        try {
          const anciensIds = JSON.parse(existant[0].details)?.agents?.map(a => a.matricule_agent).sort().join(',');
          if (anciensIds === idsAgents) {
            dejaNotifie = true;
          } else {
            nouvellesSituations.push(situation);
          }
        } catch(e) {
          nouvellesSituations.push(situation);
        }
      } else {
        nouvellesSituations.push(situation);
      }
    }
    
    if (!dejaNotifie && situation.type !== 'VISITES_PERIODIQUES_EN_RETARD' && situation.type !== 'AGENTS_PRIORITAIRES_CRITIQUES') {
      nouvellesSituations.push(situation);
    }
  }
  
  // Gestion spéciale pour les visites
  if (nouvellesVisites) {
    const situationVisites = situations.find(s => s.type === 'VISITES_PERIODIQUES_EN_RETARD');
    if (situationVisites) {
      nouvellesSituations.push(situationVisites);
    }
  }
  
  if (nouvellesSituations.length === 0 && nouveauxAccidents === 0 && !nouvellesVisites) {
    console.log(`   ✅ Aucune nouvelle notification à créer`);
    return;
  }
  
  console.log(`   📝 ${nouvellesSituations.length} nouvelle(s) situation(s) à notifier`);
  
  // Créer les notifications
  const users = await notificationService.getUsersCibles(['social']);
  if (users.length === 0) {
    console.log('   ⚠️ Aucun utilisateur cible');
    return;
  }
  
  let total = 0;
  for (const situation of nouvellesSituations) {
    for (const user of users) {
      const notif = await notificationService.creerNotification({
        id_utilisateur: user.id,
        type: notificationService._niveauToType(situation.niveau),
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
  
  console.log(`   ✅ ${total} nouvelle(s) notification(s) créée(s)`);
}}

module.exports = new InitialisationService();