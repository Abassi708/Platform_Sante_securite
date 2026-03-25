// backend/scripts/recalculerReprisesAccident.js
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const Accident = require('../models/Accident');
const Agent = require('../models/Agent');
const Planning = require('../models/Planning');
const Visite = require('../models/Visite');
const planningService = require('../services/planningService');

async function recalculerReprisesAccident() {
  console.log('\n' + '='.repeat(70));
  console.log('🔄 RECALCUL DES VISITES DE REPRISE POST-ACCIDENT');
  console.log('='.repeat(70) + '\n');
  
  try {
    // 1. CONNEXION À LA BASE
    await sequelize.authenticate();
    console.log('✅ Connecté à MySQL\n');
    
    // 2. TROUVER UN UTILISATEUR VALIDE (admin)
    const User = require('../models/User');
    let adminUser = await User.findOne({ where: { Role: 'admin' } });
    
    if (!adminUser) {
      adminUser = await User.findOne();
    }
    
    if (!adminUser) {
      console.error('❌ Aucun utilisateur trouvé dans la base');
      process.exit(1);
    }
    
    const userId = adminUser.id_utilisateur;
    console.log(`👤 Utilisateur utilisé: ${adminUser.Login} (ID: ${userId})\n`);
    
    // 3. RÉCUPÉRER TOUS LES ACCIDENTS AVEC ARRÊT
    const accidents = await Accident.findAll({
      where: { 
        jour_arret: { [Op.gt]: 0 }
      },
      order: [['date_accident', 'DESC']]
    });
    
    console.log(`📊 ${accidents.length} accident(s) avec arrêt trouvé(s)\n`);
    
    if (accidents.length === 0) {
      console.log('ℹ️ Aucun accident à traiter');
      process.exit(0);
    }
    
    // 4. AFFICHER LA LISTE
    console.log('📋 Liste des accidents avec arrêt:');
    for (const accident of accidents) {
      const agent = await Agent.findByPk(accident.matricule_agent);
      console.log(`   ${accident.numero_accident} - Agent ${agent?.nom} ${agent?.prenom} (${accident.jour_arret} jours) - ${accident.date_accident}`);
    }
    console.log('');
    
    // 5. STATISTIQUES
    let reprisesCrees = 0;
    let reprisesExistantes = 0;
    let erreurs = 0;
    let agentsModifies = 0;
    let planningsSupprimes = 0;
    
    // 6. TRAITER CHAQUE ACCIDENT
    for (const accident of accidents) {
      try {
        console.log(`\n📌 Traitement accident: ${accident.numero_accident}`);
        console.log(`   Date accident: ${accident.date_accident}`);
        console.log(`   Jours d'arrêt: ${accident.jour_arret}`);
        
        // Récupérer l'agent
        const agent = await Agent.findByPk(accident.matricule_agent);
        if (!agent) {
          console.log(`   ❌ Agent #${accident.matricule_agent} non trouvé`);
          erreurs++;
          continue;
        }
        
        console.log(`   Agent: ${agent.nom} ${agent.prenom} (mat. ${agent.matricule_agent})`);
        
        // 7. CALCULER LA DATE DE FIN D'ARRÊT
        const dateAccident = new Date(accident.date_accident);
        const dateFinArret = new Date(dateAccident);
        dateFinArret.setDate(dateFinArret.getDate() + accident.jour_arret);
        const dateFinStr = dateFinArret.toISOString().split('T')[0];
        console.log(`   Fin d'arrêt calculée: ${dateFinStr}`);
        
        // 8. METTRE À JOUR L'AGENT
        await agent.update({
          date_debut_inaptitude: accident.date_accident,
          date_fin_inaptitude: dateFinArret
        });
        agentsModifies++;
        console.log(`   ✅ Agent mis à jour avec période d'inaptitude: ${dateFinStr}`);
        
        // 9. SUPPRIMER LES ANCIENNES VISITES DE REPRISE (avec gestion des contraintes)
        const anciennesReprises = await Planning.findAll({
          where: {
            matricule_agent: agent.matricule_agent,
            type_visite: ['Reprise', 'Reclassement']
          }
        });
        
        for (const ancienne of anciennesReprises) {
          // Supprimer d'abord les visites liées à ce planning
          await Visite.destroy({
            where: { id_planning: ancienne.id_planning }
          });
          // Puis supprimer le planning
          await ancienne.destroy();
          planningsSupprimes++;
          console.log(`   🗑️ Suppression ancienne visite ${ancienne.type_visite} du ${ancienne.date_visite}`);
        }
        
        // 10. CALCULER LA DATE DE REPRISE (3 jours après fin d'arrêt)
        const dateReprise = new Date(dateFinArret);
        dateReprise.setDate(dateReprise.getDate() + 3);
        
        // 11. TROUVER UN JOUR OUVRÉ
        let joursEssais = 0;
        const dateOriginale = new Date(dateReprise);
        
        while (!(await planningService.estJourOuvre(dateReprise)) && joursEssais < 21) {
          dateReprise.setDate(dateReprise.getDate() + 1);
          joursEssais++;
        }
        
        if (joursEssais > 0) {
          console.log(`   📅 Ajustement date: ${dateOriginale.toLocaleDateString('fr-FR')} → ${dateReprise.toLocaleDateString('fr-FR')} (${joursEssais} jour(s))`);
        }
        
        if (joursEssais >= 21) {
          console.log(`   ⚠️ Impossible de trouver une date ouvrable`);
          erreurs++;
          continue;
        }
        
        // 12. DÉTERMINER LE TYPE DE VISITE
        const typeVisite = accident.jour_arret > 30 ? 'Reclassement' : 'Reprise';
        
        // 13. CRÉER LE PLANNING DE REPRISE
        const semaine = planningService.getNumeroSemaine(dateReprise);
        const annee = dateReprise.getFullYear();
        
        const planning = await Planning.create({
          matricule_agent: agent.matricule_agent,
          date_visite: dateReprise.toISOString().split('T')[0],
          heure_visite: '09:00:00',
          type_visite: typeVisite,
          statut: 'Programmé',
          priorite: 150,
          semaine: semaine,
          annee: annee,
          created_by: userId,
          convocation_envoyee: false,
          motif_reprogrammation: `Visite ${typeVisite} post-accident (${accident.numero_accident})`
        });
        
        console.log(`   ✅ Visite de ${typeVisite} créée le ${planning.date_visite}`);
        reprisesCrees++;
        
        // 14. ENREGISTRER DANS L'HISTORIQUE
        await Visite.create({
          matricule_agent: agent.matricule_agent,
          date_visite: planning.date_visite,
          heure_visite: planning.heure_visite,
          type_visite: typeVisite,
          medecin: 'Système',
          observation: `Programmation automatique pour ${typeVisite} post-accident (${accident.numero_accident})`,
          id_planning: planning.id_planning,
          source: 'PLANNING',
          type_action: 'PROGRAMMATION',
          nouveau_statut: 'Programmé',
          motif_action: `Programmation automatique pour ${typeVisite} post-accident (${accident.numero_accident})`,
          details_action: {
            accident_id: accident.id_accident,
            numero_accident: accident.numero_accident,
            date_accident: accident.date_accident,
            date_fin_arret: dateFinStr,
            jours_arret: accident.jour_arret
          },
          created_by: userId
        });
        console.log(`   📝 Historique enregistré`);
        
      } catch (err) {
        console.error(`   ❌ Erreur traitement accident ${accident.numero_accident}:`, err.message);
        erreurs++;
      }
    }
    
    // 15. RÉSUMÉ FINAL
    console.log('\n' + '='.repeat(70));
    console.log('📊 RÉSUMÉ DU TRAITEMENT');
    console.log('='.repeat(70));
    console.log(`   • Accidents traités: ${accidents.length}`);
    console.log(`   • Visites de reprise créées: ${reprisesCrees}`);
    console.log(`   • Anciennes visites supprimées: ${planningsSupprimes}`);
    console.log(`   • Agents mis à jour: ${agentsModifies}`);
    console.log(`   • Erreurs: ${erreurs}`);
    console.log('='.repeat(70));
    
    if (reprisesCrees > 0) {
      console.log('\n✅ ' + reprisesCrees + ' visite(s) de reprise créée(s) avec succès !');
    }
    
    // 16. AFFICHER LES VISITES DE REPRISE PLANIFIÉES
    const nouvellesReprises = await Planning.findAll({
      where: {
        type_visite: ['Reprise', 'Reclassement']
      },
      order: [['date_visite', 'ASC']]
    });
    
    if (nouvellesReprises.length > 0) {
      console.log('\n📋 VISITES DE REPRISE PLANIFIÉES:');
      for (const p of nouvellesReprises) {
        const agent = await Agent.findByPk(p.matricule_agent);
        console.log(`   • ${p.date_visite} - ${agent?.nom} ${agent?.prenom} - ${p.type_visite}`);
      }
    }
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erreur fatale:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

// Exécuter le script
recalculerReprisesAccident();