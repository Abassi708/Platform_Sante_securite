// backend/testRegles.js
const moment = require('moment');
const planningService = require('./services/planningService');
const sequelize = require('./config/database');
const Planning = require('./models/Planning');  // ← Correction : chemin correct
const Agent = require('./models/Agent');        // ← Ajouter Agent

async function testerRegles() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 TEST DES RÈGLES DE PLANIFICATION');
  console.log('='.repeat(70));
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connecté à MySQL\n');
    
    // ========== TEST 1: Vérifier les jours ouvrés ==========
    console.log('📅 TEST 1: Vérification des jours ouvrés');
    console.log('-'.repeat(50));
    
    const datesTest = [
      { date: '2026-03-23', attendu: 'dimanche' },
      { date: '2026-03-24', attendu: 'lundi' },
      { date: '2026-03-25', attendu: 'mardi' },
      { date: '2026-03-26', attendu: 'mercredi' },
      { date: '2026-03-27', attendu: 'jeudi' },
      { date: '2026-03-28', attendu: 'vendredi' },
      { date: '2026-03-29', attendu: 'samedi' },
      { date: '2026-03-30', attendu: 'dimanche' },
      { date: '2026-03-31', attendu: 'lundi' },
      { date: '2026-04-01', attendu: 'mardi' },
    ];
    
    for (const test of datesTest) {
      const [annee, mois, jour] = test.date.split('-');
      const date = new Date(parseInt(annee), parseInt(mois) - 1, parseInt(jour));
      const estOuvre = await planningService.estJourOuvre(date);
      const statut = estOuvre ? '✅ OUVRE' : '❌ FERME';
      console.log(`   ${test.date} (${test.attendu}) -> ${statut}`);
    }
    
    // ========== TEST 2: Vérifier les créneaux horaires ==========
    console.log('\n📅 TEST 2: Créneaux horaires autorisés');
    console.log('-'.repeat(50));
    console.log(`   Créneaux définis: ${planningService.creneaux.join(', ')}`);
    console.log(`   Heures autorisées: 08:00, 08:30, 09:00, 09:30`);
    
    // ========== TEST 3: Vérifier les jours de visite ==========
    console.log('\n📅 TEST 3: Jours de visite autorisés');
    console.log('-'.repeat(50));
    console.log(`   Jours autorisés: ${planningService.JOURS_VISITE.map(j => {
      switch(j) {
        case 2: return 'Mardi (2)';
        case 3: return 'Mercredi (3)';
        case 4: return 'Jeudi (4)';
        case 5: return 'Vendredi (5)';
        default: return j;
      }
    }).join(', ')}`);
    
    // ========== TEST 4: Vérifier les plannings existants ==========
    console.log('\n📅 TEST 4: Vérification des plannings existants');
    console.log('-'.repeat(50));
    
    const plannings = await Planning.findAll({
      attributes: ['id_planning', 'matricule_agent', 'date_visite', 'heure_visite', 'type_visite', 'source_planification'],
      order: [['date_visite', 'ASC']]
    });
    
    console.log(`   Total plannings: ${plannings.length}`);
    
    let erreurs = 0;
    let samedis = 0;
    let dimanches = 0;
    let lundis = 0;
    
    for (const p of plannings) {
      const [annee, mois, jour] = p.date_visite.split('-');
      const date = new Date(parseInt(annee), parseInt(mois) - 1, parseInt(jour));
      const jourSemaine = date.getDay();
      const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
      const jourNom = jours[jourSemaine];
      
      if (jourSemaine === 6) { // Samedi
        samedis++;
        console.log(`   ❌ ERREUR: Planning #${p.id_planning} le ${p.date_visite} (${jourNom}) -> SAMEDI INTERDIT !`);
        erreurs++;
      } else if (jourSemaine === 0) { // Dimanche
        dimanches++;
        console.log(`   ❌ ERREUR: Planning #${p.id_planning} le ${p.date_visite} (${jourNom}) -> DIMANCHE INTERDIT !`);
        erreurs++;
      } else if (jourSemaine === 1) { // Lundi
        lundis++;
        console.log(`   ❌ ERREUR: Planning #${p.id_planning} le ${p.date_visite} (${jourNom}) -> LUNDI INTERDIT !`);
        erreurs++;
      }
      
      // Vérifier l'heure
      const heure = p.heure_visite;
      if (heure && !planningService.creneaux.includes(heure)) {
        console.log(`   ❌ ERREUR: Planning #${p.id_planning} à ${heure} -> HEURE NON AUTORISEE !`);
        erreurs++;
      }
    }
    
    console.log(`\n   Récapitulatif:`);
    console.log(`   - Lundis interdits: ${lundis}`);
    console.log(`   - Samedis interdits: ${samedis}`);
    console.log(`   - Dimanches interdits: ${dimanches}`);
    console.log(`   - Total erreurs: ${erreurs}`);
    
    if (erreurs === 0) {
      console.log(`\n   ✅ TOUTES LES VISITES RESPECTENT LES RÈGLES !`);
    } else {
      console.log(`\n   ⚠️ ${erreurs} VISITE(S) NE RESPECTENT PAS LES RÈGLES !`);
    }
    
    // ========== TEST 5: Vérifier la périodicité des agents ==========
    console.log('\n📅 TEST 5: Vérification des périodicités');
    console.log('-'.repeat(50));
    
    const agents = await Agent.findAll({
      where: { statut: 'actif' },
      attributes: ['matricule_agent', 'nom', 'prenom', 'code_affectation', 'date_derniere_visite']
    });
    
    for (const agent of agents) {
      const periodicite = planningService.calculerPeriodicite(agent);
      const periodiciteTexte = agent.code_affectation === 3 ? '6 mois (180j)' : '1 an (365j)';
      console.log(`   Agent #${agent.matricule_agent} ${agent.nom} ${agent.prenom}: ${periodiciteTexte}`);
    }
    
    // ========== TEST 6: Simuler une reprise ==========
    console.log('\n📅 TEST 6: Simulation d\'une visite de reprise');
    console.log('-'.repeat(50));
    
    const dateFin = new Date(2026, 2, 21); // 21 mars 2026
    const dateReprise = new Date(dateFin);
    dateReprise.setDate(dateFin.getDate() - 3);
    
    console.log(`   Fin inaptitude: ${dateFin.getFullYear()}-${dateFin.getMonth()+1}-${dateFin.getDate()}`);
    console.log(`   Date reprise idéale: ${dateReprise.getFullYear()}-${dateReprise.getMonth()+1}-${dateReprise.getDate()}`);
    
    const estOuvreReprise = await planningService.estJourOuvre(dateReprise);
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    console.log(`   Jour de la semaine: ${jours[dateReprise.getDay()]}`);
    console.log(`   Est ouvré: ${estOuvreReprise ? '✅ OUI' : '❌ NON'}`);
    
    if (!estOuvreReprise) {
      let dateAjustee = new Date(dateReprise);
      let joursRecherche = 0;
      while (!(await planningService.estJourOuvre(dateAjustee)) && joursRecherche < 10) {
        dateAjustee.setDate(dateAjustee.getDate() - 1);
        joursRecherche++;
      }
      console.log(`   Date reprise ajustée: ${dateAjustee.getFullYear()}-${dateAjustee.getMonth()+1}-${dateAjustee.getDate()} (${joursRecherche} jour(s) avant)`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ TEST TERMINÉ');
    console.log('='.repeat(70));
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await sequelize.close();
  }
}

testerRegles();