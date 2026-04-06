// backend/services/chatbot/intelligentChatbot.js
const OpenAI = require('openai');
const db = require('../../models');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const jwt = require('jsonwebtoken');
moment.locale('fr');

class IntelligentChatbot {
  constructor() {
    // Configuration pour Groq ou OpenAI
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    });
    this.model = process.env.OPENAI_MODEL || 'llama-3.1-8b-instant';
    this.useAI = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('local');
  }

  // Récupérer le token de l'utilisateur pour les téléchargements
  async getUserToken(matricule) {
    try {
      const user = await db.local.User.findOne({
        where: { matricule_agent: matricule }
      });
      
      if (!user) {
        console.log('❌ Utilisateur non trouvé pour matricule:', matricule);
        return null;
      }
      
      const token = jwt.sign(
        { id: user.id_utilisateur },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      console.log('✅ Token généré pour téléchargement');
      return token;
    } catch (error) {
      console.error('Erreur génération token:', error);
      return null;
    }
  }

  async processMessage(message, userId, matricule) {
    console.log(`💬 Traitement: "${message}" pour agent ${matricule}`);
    
    const agentData = await this.getAgentCompleteData(matricule);
    
    if (!agentData) {
      return {
        reponse: "❌ Désolé, je n'ai pas pu trouver vos informations. Veuillez contacter l'administrateur.",
        intention: 'error',
        conversation_id: null
      };
    }
    
    const context = this.buildRichContext(agentData);
    let reponse;
    let intention = 'generated';
    
    if (this.useAI && process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('local')) {
      try {
        reponse = await this.callAI(message, context, agentData);
      } catch (error) {
        console.error('Erreur IA, utilisation du fallback:', error.message);
        reponse = await this.intelligentFallback(message, agentData);
      }
    } else {
      reponse = await this.intelligentFallback(message, agentData);
    }
    
    const conversationId = uuidv4();
    await db.local.ChatHistory.create({
      id_utilisateur: userId,
      matricule_agent: matricule,
      message_utilisateur: message,
      reponse_bot: reponse,
      conversation_id: conversationId,
      created_at: new Date()
    });
    
    return {
      reponse: reponse,
      intention: intention,
      conversation_id: conversationId
    };
  }

  async getAgentCompleteData(matricule) {
    try {
      const agent = await db.global.Agent.findOne({
        where: { matricule_agent: matricule },
        raw: true
      });
      if (!agent) return null;
      
      const [agence, affectation] = await Promise.all([
        agent.code_agence ? db.global.Agence.findByPk(agent.code_agence, { raw: true }) : null,
        agent.code_affectation ? db.global.Affectation.findByPk(agent.code_affectation, { raw: true }) : null
      ]);
      
      const prochaineVisite = await db.local.Planning.findOne({
        where: {
          matricule_agent: matricule,
          date_visite: { [db.Sequelize.Op.gte]: moment().format('YYYY-MM-DD') },
          statut: 'Programmé'
        },
        order: [['date_visite', 'ASC']],
        raw: true
      });
      
      const derniereVisite = await db.local.Visite.findOne({
        where: { matricule_agent: matricule },
        order: [['date_visite', 'DESC']],
        raw: true
      });
      
      const visitesRecentes = await db.local.Visite.findAll({
        where: {
          matricule_agent: matricule,
          date_visite: { [db.Sequelize.Op.gte]: moment().subtract(6, 'months').format('YYYY-MM-DD') }
        },
        order: [['date_visite', 'DESC']],
        limit: 10,
        raw: true
      });
      
      const accidents = await db.local.Accident.findAll({
        where: { matricule_agent: matricule },
        order: [['date_accident', 'DESC']],
        raw: true
      });
      
      const totalJoursArret = accidents.reduce((sum, a) => sum + (a.jour_arret || 0), 0);
      
      let inaptitudeStatus = null;
      if (agent.date_fin_inaptitude) {
        const fin = moment(agent.date_fin_inaptitude);
        const aujourdhui = moment();
        inaptitudeStatus = {
          estEnCours: fin.isAfter(aujourdhui),
          dateDebut: agent.date_debut_inaptitude,
          dateFin: agent.date_fin_inaptitude,
          joursRestants: fin.isAfter(aujourdhui) ? fin.diff(aujourdhui, 'days') : 0
        };
      }
      
      return {
        agent, agence, affectation, prochaineVisite, derniereVisite,
        visitesRecentes, accidents, totalJoursArret, inaptitudeStatus,
        periodicite: agent.code_affectation === 3 ? '6 mois' : '1 an',
        estChauffeur: agent.code_affectation === 3
      };
      
    } catch (error) {
      console.error('Erreur getAgentCompleteData:', error);
      return null;
    }
  }

  buildRichContext(data) {
    let context = `=== INFORMATIONS PERSONNELLES ===\n`;
    context += `Nom: ${data.agent.nom} ${data.agent.prenom}\n`;
    context += `Matricule: ${data.agent.matricule_agent}\n`;
    context += `Poste: ${data.affectation?.libelle_affectation || 'Non défini'}\n`;
    context += `Agence: ${data.agence?.nom_agence || 'Non définie'}\n`;
    context += `Périodicité: ${data.periodicite}\n\n`;
    
    if (data.prochaineVisite) {
      context += `=== PROCHAINE VISITE ===\n`;
      context += `Date: ${moment(data.prochaineVisite.date_visite).format('dddd DD MMMM YYYY')}\n`;
      context += `Heure: ${data.prochaineVisite.heure_visite?.substring(0,5) || 'À confirmer'}\n`;
      context += `Type: ${data.prochaineVisite.type_visite}\n\n`;
    }
    
    if (data.derniereVisite) {
      context += `=== DERNIÈRE VISITE ===\n`;
      context += `Date: ${moment(data.derniereVisite.date_visite).format('DD/MM/YYYY')}\n`;
      context += `Type: ${data.derniereVisite.type_visite}\n`;
      context += `Résultat: ${data.derniereVisite.resultat || 'Non renseigné'}\n\n`;
    }
    
    if (data.visitesRecentes && data.visitesRecentes.length > 0) {
      context += `=== HISTORIQUE VISITES (6 derniers mois) ===\n`;
      data.visitesRecentes.forEach((v, i) => {
        context += `${i+1}. ${moment(v.date_visite).format('DD/MM/YYYY')} - ${v.type_visite} : ${v.resultat || 'Non renseigné'}\n`;
      });
      context += `\n`;
    }
    
    if (data.accidents && data.accidents.length > 0) {
      context += `=== ACCIDENTS (${data.accidents.length} total) ===\n`;
      data.accidents.slice(0, 5).forEach((a, i) => {
        context += `${i+1}. ${moment(a.date_accident).format('DD/MM/YYYY')} - Gravité: ${a.gravite} - Arrêt: ${a.jour_arret || 0} jours\n`;
      });
      context += `Total jours d'arrêt: ${data.totalJoursArret}\n\n`;
    }
    
    if (data.inaptitudeStatus && data.inaptitudeStatus.estEnCours) {
      context += `=== INAPTITUDE EN COURS ===\n`;
      context += `Fin prévue: ${data.inaptitudeStatus.dateFin}\n`;
      context += `Jours restants: ${data.inaptitudeStatus.joursRestants}\n\n`;
    }
    
    return context;
  }

  async callAI(question, context, agentData) {
    const systemPrompt = `Tu es un assistant HSE professionnel pour la SRTB (Société Régionale de Transport de Bizerte).

**TON RÔLE** : Aider les agents avec leurs questions sur visites médicales, accidents, informations personnelles.

**RÈGLES ABSOLUES** :
1. ⚠️ JAMAIS d'avis médical - oriente vers le médecin du travail
2. 📊 Utilise UNIQUEMENT les données réelles du contexte
3. 🎯 Sois précis : dates, heures, nombres exacts
4. ❌ Si info manquante, dis "Je ne trouve pas cette info dans vos données"
5. 💡 Propose des conseils pratiques quand pertinent

**FORMAT** :
- Utilise des émojis (📅, ⚠️, 👤, 🏥, ✅, ❌)
- Structure avec **gras** pour les titres
- Sois chaleureux mais professionnel

**CONTEXTE DE L'AGENT** :
${context}

Réponds à la question de l'agent de manière personnalisée.`;

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        temperature: 0.3,
        max_tokens: 800
      });
      
      return response.choices[0].message.content;
      
    } catch (error) {
      console.error('Erreur API:', error.message);
      return await this.intelligentFallback(question, agentData);
    }
  }

  async intelligentFallback(question, agentData) {
    const q = question.toLowerCase().trim();
    
    console.log('🔍 [FALLBACK] Question reçue:', q);
    
    // ========== 1. RÉPONSES AUX MESSAGES SIMPLES (PRIORITÉ ABSOLUE) ==========
    
    // NON / NON MERCI
    if (q === 'non' || q === 'non merci' || q === 'non merci' || q === 'pas maintenant' || q === 'non rien') {
      return `👍 **D'accord !**

Je reste à votre disposition si vous avez besoin d'aide plus tard.

N'hésitez pas à me poser des questions comme :
• "Quand est ma prochaine visite ?"
• "Mes accidents de travail"
• "Génère mon certificat"

Bonne journée ! 👋`;
    }
    
    // OUI
    if (q === 'oui' || q === 'ok' || q === 'd\'accord' || q === 'entendu' || q === 'oui merci') {
      return `✅ **Très bien !**

De quoi avez-vous besoin ?

• 📅 "Quand est ma prochaine visite ?"
• ⚠️ "Mes accidents de travail"
• 📄 "Génère mon certificat"
• 📊 "Mes statistiques"

*Dites "aide" pour voir toutes mes capacités*`;
    }
    
    // Salutations
    if (q.match(/^(bonjour|salut|coucou|hello|hi|bonsoir|bienvenue|hey)/)) {
      const heure = new Date().getHours();
      let salutation = heure < 12 ? "Bonjour" : (heure < 18 ? "Bon après-midi" : "Bonsoir");
      return `${salutation} ! 👋\n\nJe suis votre assistant HSE. Comment puis-je vous aider aujourd'hui ?`;
    }
    
    // Remerciements
    if (q.match(/^(merci|thanks|thank you|merci beaucoup|c'est gentil|top|parfait|super)/)) {
      return `🌟 **Avec plaisir !** 🌟\n\nJe suis là pour vous aider. N'hésitez pas si vous avez d'autres questions.\n\nPassez une excellente journée ! 😊`;
    }
    
    // Comment ça va
    if (q.match(/(ça va|comment ça va|comment allez-vous|comment vas-tu)/)) {
      return `🤖 **Je vais très bien, merci de demander !**\n\nJe suis en pleine forme et prêt à vous aider.\n\nEt vous, comment allez-vous ?\n\nPuis-je vous aider avec quelque chose en particulier ?`;
    }
    
    // Au revoir
    if (q.match(/(au revoir|bye|à plus|ciao|adieu|à bientôt)/)) {
      return `👋 **Au revoir !**\n\nMerci d'avoir utilisé mes services.\n\nN'oubliez pas :\n• Votre santé est importante\n• Faites vos visites médicales à temps\n• Signalez tout accident rapidement\n\nÀ bientôt et prenez soin de vous ! 🛡️`;
    }
    
    // Aide
    if (q === 'aide' || q === 'help' || q === 'que peux-tu faire') {
      return this.formatAide();
    }
    
    // ========== 2. GRAPHIQUES ==========
    if (q.includes('graphique') || q.includes('courbe') || q.includes('évolution') || q.includes('tendance')) {
      return await this.genererGraphique(question, agentData);
    }
    
    // ========== 3. GÉNÉRATION DE DOCUMENTS ==========
    if (q.includes('générer') || q.includes('document') || q.includes('certificat') || 
        q.includes('attestation') || q.includes('déclaration') || q.includes('bilan') ||
        q.includes('export') || q.includes('convocation') || q.includes('télécharger') ||
        q.includes('pdf') || q.includes('excel')) {
      console.log('📄 [FALLBACK] SECTION DOCUMENTS DÉTECTÉE');
      return await this.formatDocumentGeneration(question, agentData);
    }
    
    // ========== 4. COMPARAISONS ET STATISTIQUES ==========
    if (q.includes('comparer') || q.includes('moyenne') || q.includes('statistique') || 
        (q.includes('plus') && q.includes('que')) || (q.includes('moins') && q.includes('que'))) {
      return await this.formatComparaison(question, agentData);
    }
    
    // ========== 5. RECHERCHE AVANCÉE ==========
    if (q.includes('cherche') || q.includes('trouve') || q.includes('recherche') || q.includes('filtre')) {
      return await this.rechercheAvancee(question, agentData);
    }
    
    // ========== 6. QUESTIONS STANDARDS ==========
    if (q.includes('information') || q.includes('personnelle') || q.includes('qui suis') || q.includes('mon profil')) {
      return this.formatPersonalInfo(agentData);
    }
    
    if (q.includes('visite') || q.includes('prochaine') || q.includes('rdv') || q.includes('rendez-vous')) {
      return this.formatProchaineVisite(agentData);
    }
    
    if (q.includes('historique') || q.includes('ancienne') || q.includes('liste visite')) {
      return this.formatHistoriqueVisites(agentData);
    }
    
    if (q.includes('accident') || q.includes('arrêt') || q.includes('sinistre')) {
      return this.formatAccidents(agentData);
    }
    
    if (q.includes('poste') || q.includes('travail') || q.includes('affectation')) {
      return this.formatPoste(agentData);
    }
    
    if (q.includes('agence') || q.includes('lieu')) {
      return this.formatAgence(agentData);
    }
    
    if (q.includes('apte') || q.includes('inaptitude') || q.includes('inapte')) {
      return this.formatAptitude(agentData);
    }
    
    return this.formatDefault(agentData);
  }

  // ========== GRAPHIQUES ==========
  async genererGraphique(question, agentData) {
    const q = question.toLowerCase();
    const token = await this.getUserToken(agentData.agent.matricule_agent);
    
    // Graphique des accidents par mois
    if (q.includes('accident') || q.includes('évolution')) {
      const accidentsParMois = Array(12).fill(0);
      agentData.accidents.forEach(acc => {
        const mois = new Date(acc.date_accident).getMonth();
        accidentsParMois[mois]++;
      });
      
      const url = `http://localhost:5000/api/charts/accidents?token=${token}`;
      const total = agentData.accidents.length;
      const moisMax = accidentsParMois.indexOf(Math.max(...accidentsParMois));
      const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      
      return `📊 **Graphique d'évolution de vos accidents**

${this.genererBarChartAscii(accidentsParMois)}

**Analyse :**
• Total des accidents : **${total}**
• Mois le plus critique : **${moisNoms[moisMax]}** (${accidentsParMois[moisMax]} accident(s))
• Tendance : ${this.analyserTendance(accidentsParMois)}

📈 **Téléchargez le graphique complet :**  
[📥 Cliquer ici pour télécharger le graphique (PNG)](${url})

💡 *Ce graphique montre l'évolution de vos accidents sur les 12 derniers mois.*`;
    }
    
    // Graphique de comparaison
    if (q.includes('comparaison') || q.includes('comparer')) {
      const agentsMemePoste = await db.global.Agent.findAll({
        where: { code_affectation: agentData.agent.code_affectation },
        attributes: ['matricule_agent']
      });
      const matricules = agentsMemePoste.map(a => a.matricule_agent);
      const tousAccidents = await db.local.Accident.findAll({
        where: { matricule_agent: matricules }
      });
      const moyennePoste = matricules.length > 0 ? (tousAccidents.length / matricules.length).toFixed(1) : 0;
      
      const url = `http://localhost:5000/api/charts/comparaison?token=${token}`;
      const difference = agentData.accidents.length - moyennePoste;
      const pourcentage = moyennePoste > 0 ? ((difference / moyennePoste) * 100).toFixed(1) : 0;
      
      return `📊 **Comparaison visuelle avec vos collègues**

${this.genererBarChartComparison(agentData.accidents.length, moyennePoste)}

**Analyse :**
• Vous : **${agentData.accidents.length}** accidents
• Moyenne du poste : **${moyennePoste}** accidents
• Écart : **${Math.abs(difference)}** accident(s) (${difference > 0 ? '+' : ''}${pourcentage}%)

${difference > 0 ? '⚠️ Vous êtes au-dessus de la moyenne.' : '✅ Vous êtes en dessous de la moyenne. Bravo !'}

📥 **Téléchargez le graphique :**  
[📊 Cliquer ici pour télécharger la comparaison (PNG)](${url})`;
    }
    
    return `📈 **Génération de graphiques**

Je peux créer des graphiques pour visualiser vos données :

• "graphique de mes accidents" → Évolution mensuelle
• "compare mes accidents avec graphique" → Comparaison visuelle
• "tendance de mes visites" → Courbe d'évolution

*Les graphiques sont téléchargeables au format PNG.*`;
  }

  genererBarChartAscii(data) {
    const max = Math.max(...data, 1);
    const height = 10;
    const bars = [];
    
    for (let i = 0; i < data.length; i++) {
      const barHeight = Math.round((data[i] / max) * height);
      const bar = '█'.repeat(barHeight) + '░'.repeat(height - barHeight);
      bars.push(bar);
    }
    
    let chart = '```\n';
    for (let row = 0; row < height; row++) {
      let line = '';
      for (let i = 0; i < data.length; i++) {
        line += bars[i][row] + ' ';
      }
      chart += line + '\n';
    }
    chart += '```\n';
    chart += '   J   F   M   A   M   J   J   A   S   O   N   D\n';
    
    return chart;
  }

  genererBarChartComparison(vous, moyenne) {
    const max = Math.max(vous, moyenne, 1);
    const height = 15;
    const vousHeight = Math.round((vous / max) * height);
    const moyenneHeight = Math.round((moyenne / max) * height);
    
    let chart = '```\n';
    chart += 'Vous     : ' + '█'.repeat(vousHeight) + '░'.repeat(height - vousHeight) + ` ${vous}\n`;
    chart += 'Moyenne  : ' + '█'.repeat(moyenneHeight) + '░'.repeat(height - moyenneHeight) + ` ${moyenne.toFixed(1)}\n`;
    chart += '```\n';
    
    return chart;
  }

  analyserTendance(data) {
    const dernierTrimestre = data.slice(-3).reduce((a, b) => a + b, 0);
    const trimestrePrecedent = data.slice(-6, -3).reduce((a, b) => a + b, 0);
    
    if (dernierTrimestre > trimestrePrecedent) {
      return '📈 En hausse ⚠️ (Soyez vigilant)';
    } else if (dernierTrimestre < trimestrePrecedent) {
      return '📉 En baisse ✅ (Bravo, continuez)';
    } else {
      return '➡️ Stable';
    }
  }

  // ========== GÉNÉRATION DE DOCUMENTS ==========
  async formatDocumentGeneration(question, agentData) {
    const q = question.toLowerCase();
    const token = await this.getUserToken(agentData.agent.matricule_agent);
    
    if (q.includes('certificat') || (q.includes('aptitude') && q.includes('générer'))) {
      return await this.genererCertificat(agentData, token);
    }
    
    if (q.includes('déclaration') || (q.includes('accident') && q.includes('générer'))) {
      return await this.genererDeclaration(agentData, token);
    }
    
    if (q.includes('convocation') || q.includes('rappel')) {
      return await this.genererConvocation(agentData, token);
    }
    
    if (q.includes('bilan') || q.includes('annuel')) {
      return await this.genererBilan(agentData, token);
    }
    
    if (q.includes('export') || q.includes('complet') || q.includes('tous')) {
      return await this.genererExportComplet(agentData, token);
    }
    
    return this.formatAideDocuments();
  }

  async genererCertificat(agentData, token) {
    if (!agentData.derniereVisite) {
      return `⚠️ **Impossible de générer le certificat**

Vous n'avez pas encore de visite médicale enregistrée.

📋 Une fois votre première visite effectuée, vous pourrez générer votre certificat d'aptitude.`;
    }
    
    const url = `http://localhost:5000/api/documents/certificat?token=${token}`;
    
    return `📄 **Certificat médical d'aptitude**

👤 **Agent** : ${agentData.agent.nom} ${agentData.agent.prenom}
📅 **Matricule** : ${agentData.agent.matricule_agent}
🏥 **Dernière visite** : ${moment(agentData.derniereVisite.date_visite).format('DD/MM/YYYY')}
✅ **Résultat** : ${agentData.derniereVisite.resultat || 'Apte'}

➡️ **Cliquez sur le lien ci-dessous pour télécharger votre certificat :**

🔗 ${url}

📋 *Ce document est officiel et certifié par le Dr. Mahmoud Khelifi, médecin du travail.*`;
  }

  async genererDeclaration(agentData, token) {
    if (!agentData.accidents || agentData.accidents.length === 0) {
      return `⚠️ **Aucun accident enregistré**

Vous n'avez pas d'accident de travail dans votre dossier.`;
    }
    
    const dernierAccident = agentData.accidents[0];
    const url = `http://localhost:5000/api/documents/declaration-accident/${dernierAccident.id_accident}?token=${token}`;
    
    return `📄 **Déclaration d'accident de travail**

⚠️ **Accident du ${moment(dernierAccident.date_accident).format('DD/MM/YYYY')}**

➡️ **Cliquez sur le lien ci-dessous pour télécharger la déclaration :**

🔗 ${url}`;
  }

  async genererConvocation(agentData, token) {
    if (!agentData.prochaineVisite) {
      return `📅 **Aucune visite programmée**

Vous n'avez pas de visite médicale prévue pour le moment.`;
    }
    
    const url = `http://localhost:5000/api/documents/convocation/${agentData.prochaineVisite.id_planning}?token=${token}`;
    const date = moment(agentData.prochaineVisite.date_visite).format('dddd DD MMMM YYYY');
    
    return `📄 **Convocation à visite médicale**

📅 **Date** : ${date}
⏰ **Heure** : ${agentData.prochaineVisite.heure_visite?.substring(0,5) || '09:00'}

➡️ **Cliquez sur le lien ci-dessous pour télécharger la convocation :**

🔗 ${url}`;
  }

  async genererBilan(agentData, token) {
    const url = `http://localhost:5000/api/documents/bilan-annuel?token=${token}`;
    const annee = new Date().getFullYear();
    
    return `📊 **Bilan annuel de santé ${annee}**

📋 **Visites** : ${agentData.visitesRecentes?.length || 0}
⚠️ **Accidents** : ${agentData.accidents?.length || 0}
📅 **Jours d'arrêt** : ${agentData.totalJoursArret || 0}

➡️ **Cliquez sur le lien ci-dessous pour télécharger le bilan :**

🔗 ${url}`;
  }

  async genererExportComplet(agentData, token) {
    const url = `http://localhost:5000/api/documents/export-complet?token=${token}`;
    
    return `📦 **Export complet de votre dossier**

➡️ **Cliquez sur le lien ci-dessous pour télécharger tous vos documents :**

🔗 ${url}`;
  }

  formatAideDocuments() {
    return `📄 **Génération de documents**

• 📋 Certificat d'aptitude - "génère mon certificat"
• ⚠️ Déclaration d'accident - "génère déclaration accident"  
• 📅 Convocation visite - "génère ma convocation"
• 📊 Bilan annuel - "génère mon bilan annuel"
• 📦 Export complet - "exporte tous mes documents"`;
  }

  // ========== COMPARAISONS AVANCÉES ==========
  async formatComparaison(question, data) {
    const q = question.toLowerCase();
    
    if (q.includes('accident')) {
      return await this.compareAccidents(data);
    }
    if (q.includes('visite') || q.includes('arrêt')) {
      return await this.compareVisites(data);
    }
    if (q.includes('apte') || q.includes('inaptitude')) {
      return await this.compareAptitude(data);
    }
    
    return await this.statsGenerales(data);
  }

  async compareAccidents(data) {
    const agentsMemePoste = await db.global.Agent.findAll({
      where: { code_affectation: data.agent.code_affectation },
      attributes: ['matricule_agent']
    });
    
    const matricules = agentsMemePoste.map(a => a.matricule_agent);
    const tousAccidents = await db.local.Accident.findAll({
      where: { matricule_agent: matricules }
    });
    
    const totalAccidents = tousAccidents.length;
    const totalJoursArret = tousAccidents.reduce((sum, a) => sum + (a.jour_arret || 0), 0);
    const nbAgents = matricules.length;
    
    const moyenneAccidents = nbAgents > 0 ? (totalAccidents / nbAgents).toFixed(1) : 0;
    const moyenneJours = nbAgents > 0 ? (totalJoursArret / nbAgents).toFixed(1) : 0;
    
    const accidentsParGravite = {
      faible: tousAccidents.filter(a => a.gravite === 'Faible').length,
      moyenne: tousAccidents.filter(a => a.gravite === 'Moyenne').length,
      elevee: tousAccidents.filter(a => a.gravite === 'Élevée').length,
      critique: tousAccidents.filter(a => a.gravite === 'Critique').length
    };
    
    const taux = moyenneAccidents > 0 ? (data.accidents.length / moyenneAccidents) * 100 : 100;
    let analyse = '';
    
    if (data.accidents.length > moyenneAccidents) {
      analyse = `⚠️ Vous avez ${Math.round(taux - 100)}% plus d'accidents que la moyenne.`;
    } else if (data.accidents.length < moyenneAccidents) {
      analyse = `✅ Vous avez ${Math.round(100 - taux)}% moins d'accidents que la moyenne. Bravo !`;
    } else {
      analyse = `📊 Vous êtes dans la moyenne.`;
    }
    
    return `📊 **Comparaison des accidents**

👤 **Vous** : ${data.accidents.length} accidents, ${data.totalJoursArret} jours
👥 **Moyenne** : ${moyenneAccidents} accidents, ${moyenneJours} jours

${analyse}

💡 *Conseil : ${data.accidents.length > moyenneAccidents ? 'Restez vigilant, une formation pourrait vous aider.' : 'Continuez vos bonnes pratiques !'}*`;
  }

  async compareVisites(data) {
    const agentsMemePoste = await db.global.Agent.findAll({
      where: { code_affectation: data.agent.code_affectation },
      attributes: ['matricule_agent']
    });
    
    const matricules = agentsMemePoste.map(a => a.matricule_agent);
    const visitesParAgent = await Promise.all(
      matricules.map(async (mat) => {
        return await db.local.Visite.count({ 
          where: { 
            matricule_agent: mat,
            date_visite: { [db.Sequelize.Op.gte]: moment().subtract(6, 'months').format('YYYY-MM-DD') }
          } 
        });
      })
    );
    
    const moyenneVisites = visitesParAgent.length > 0 ? (visitesParAgent.reduce((a, b) => a + b, 0) / visitesParAgent.length).toFixed(1) : 0;
    const votreNombre = data.visitesRecentes?.length || 0;
    
    let message = `📊 **Comparaison des visites médicales**

👤 **Vous** : ${votreNombre} visite(s) (6 derniers mois)
👥 **Moyenne** : ${moyenneVisites} visite(s)

`;
    
    if (votreNombre > moyenneVisites) {
      message += `✅ Vous êtes plus assidu(e) que la moyenne !`;
    } else if (votreNombre < moyenneVisites) {
      message += `⚠️ Vous avez moins de visites que la moyenne. Pensez à programmer votre prochaine visite.`;
    } else {
      message += `📊 Vous êtes dans la moyenne.`;
    }
    
    return message;
  }

  async compareAptitude(data) {
    const agentsMemePoste = await db.global.Agent.findAll({
      where: { code_affectation: data.agent.code_affectation },
      attributes: ['matricule_agent', 'date_fin_inaptitude']
    });
    
    const agentsEnInaptitude = agentsMemePoste.filter(a => {
      if (!a.date_fin_inaptitude) return false;
      return moment(a.date_fin_inaptitude).isAfter(moment());
    }).length;
    
    const pourcentage = agentsMemePoste.length > 0 ? (agentsEnInaptitude / agentsMemePoste.length * 100).toFixed(1) : 0;
    
    return `🏥 **Statut d'aptitude - Comparaison**

👤 **Vous** : ${data.inaptitudeStatus?.estEnCours ? '⚠️ Inapte temporaire' : '✅ Apte'}
👥 **Collègues** : ${agentsEnInaptitude}/${agentsMemePoste.length} en inaptitude (${pourcentage}%)

${data.inaptitudeStatus?.estEnCours ? '📋 Une visite de reprise sera programmée.' : '👍 Continuez à respecter les consignes de sécurité.'}`;
  }

  async statsGenerales(data) {
    return `📊 **Vos statistiques personnelles**

📅 **Visites médicales** : ${data.visitesRecentes?.length || 0} (6 derniers mois)
⚠️ **Accidents** : ${data.accidents?.length || 0}
📅 **Jours d'arrêt** : ${data.totalJoursArret || 0}

🏥 **Dernière visite** : ${data.derniereVisite?.date_visite || 'Aucune'}
📅 **Prochaine visite** : ${data.prochaineVisite?.date_visite || 'Non programmée'}
📊 **Statut** : ${data.agent.statut === 'actif' ? '✅ Actif' : data.agent.statut}`;
  }

  // ========== RECHERCHE AVANCÉE ==========
  async rechercheAvancee(question, data) {
    const q = question.toLowerCase();
    let resultats = [];
    let typeRecherche = '';
    
    const dateMatch = q.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (dateMatch) {
      const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      const accidents = data.accidents.filter(a => a.date_accident === date);
      const visites = data.visitesRecentes.filter(v => v.date_visite === date);
      
      accidents.forEach(a => resultats.push(`Accident du ${a.date_accident} : ${a.gravite} - ${a.jour_arret || 0} jours`));
      visites.forEach(v => resultats.push(`Visite du ${v.date_visite} : ${v.type_visite} - ${v.resultat || 'Non renseigné'}`));
      typeRecherche = `à la date du ${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}`;
    }
    
    if (q.includes('accident') && resultats.length === 0) {
      resultats = data.accidents.map(a => 
        `📅 ${a.date_accident} - ${a.gravite} - ${a.jour_arret || 0} jours`
      );
      typeRecherche = "d'accidents";
    }
    
    if (q.includes('visite') && resultats.length === 0) {
      resultats = data.visitesRecentes.map(v => 
        `📅 ${v.date_visite} - ${v.type_visite} - ${v.resultat || 'Non renseigné'}`
      );
      typeRecherche = "de visites";
    }
    
    const moisMap = {
      'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6,
      'juillet': 7, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
    };
    
    let moisMatch = null;
    for (const [mois, num] of Object.entries(moisMap)) {
      if (q.includes(mois)) {
        moisMatch = { mois: mois, num: num };
        break;
      }
    }
    
    if (moisMatch && resultats.length === 0) {
      const annee = q.match(/\d{4}/) ? parseInt(q.match(/\d{4}/)[0]) : new Date().getFullYear();
      const accidentsMois = data.accidents.filter(a => {
        const date = new Date(a.date_accident);
        return date.getMonth() + 1 === moisMatch.num && date.getFullYear() === annee;
      });
      
      resultats = accidentsMois.map(a => 
        `Accident du ${a.date_accident} : ${a.gravite} - ${a.jour_arret || 0} jours`
      );
      typeRecherche = `du ${moisMatch.mois} ${annee}`;
    }
    
    const graviteMatch = q.match(/(faible|moyenne|élevée|critique)/i);
    if (graviteMatch && resultats.length === 0) {
      const gravite = graviteMatch[1].charAt(0).toUpperCase() + graviteMatch[1].slice(1).toLowerCase();
      const accidentsGravite = data.accidents.filter(a => a.gravite === gravite);
      resultats = accidentsGravite.map(a => 
        `📅 ${a.date_accident} - ${a.gravite} - ${a.jour_arret || 0} jours`
      );
      typeRecherche = `de gravité ${gravite}`;
    }
    
    if (resultats.length === 0) {
      return `🔍 **Recherche avancée**

Aucun résultat trouvé pour "${question}".

💡 Suggestions :
• "cherche mes accidents de janvier 2025"
• "trouve mes visites du 15/03/2026"
• "recherche accidents de gravité moyenne"`;
    }
    
    return `🔍 **Résultats de recherche ${typeRecherche ? `(${typeRecherche})` : ''}**

${resultats.map((r, i) => `${i+1}. ${r}`).join('\n')}

📊 ${resultats.length} résultat(s) trouvé(s)`;
  }

  // ========== FORMATAGE STANDARD ==========
  formatPersonalInfo(data) {
    const agent = data.agent;
    return `👤 **Vos informations personnelles**

📛 **Nom complet** : ${agent.nom} ${agent.prenom}
🔢 **Matricule** : ${agent.matricule_agent}
📊 **Statut** : ${agent.statut === 'actif' ? '✅ Actif' : agent.statut}
🏢 **Agence** : ${data.agence?.nom_agence || 'Non définie'}
💼 **Poste** : ${data.affectation?.libelle_affectation || 'Non défini'}

📅 **Dernière visite** : ${data.derniereVisite?.date_visite || 'Aucune'}
📅 **Prochaine visite** : ${data.prochaineVisite?.date_visite || 'Non programmée'}
📊 **Total accidents** : ${data.accidents?.length || 0}
📅 **Total jours d'arrêt** : ${data.totalJoursArret || 0}`;
  }

  formatProchaineVisite(data) {
    if (!data.prochaineVisite) {
      return `📅 **Aucune visite programmée**

Vous n'avez pas de visite médicale prévue pour le moment.`;
    }
    
    const date = moment(data.prochaineVisite.date_visite).format('dddd DD MMMM YYYY');
    return `📅 **Votre prochaine visite médicale**

📆 **Date** : ${date}
⏰ **Heure** : ${data.prochaineVisite.heure_visite?.substring(0,5) || 'À confirmer'}
🏥 **Type** : ${data.prochaineVisite.type_visite}
📍 **Lieu** : Infirmerie SRTB - Bizerte
👨‍⚕️ **Médecin** : Dr. Mahmoud Khelifi

💡 **Présentez-vous 15 minutes avant avec votre carte d'identité.**`;
  }

  formatHistoriqueVisites(data) {
    if (!data.visitesRecentes || data.visitesRecentes.length === 0) {
      return `📋 **Aucune visite enregistrée**

Vous n'avez pas d'historique de visites médicales.`;
    }
    
    let message = `📋 **Historique de vos visites médicales**\n\n`;
    message += `📊 **Total** : ${data.visitesRecentes.length} visite(s) (6 derniers mois)\n\n`;
    
    data.visitesRecentes.forEach((v, i) => {
      const date = moment(v.date_visite).format('DD/MM/YYYY');
      message += `${i+1}. **${date}** - ${v.type_visite}\n`;
      message += `   ✅ Résultat : ${v.resultat || 'Non renseigné'}\n`;
      message += `\n`;
    });
    
    return message;
  }

  formatAccidents(data) {
    if (!data.accidents || data.accidents.length === 0) {
      return `⚠️ **Aucun accident enregistré**

Vous n'avez aucun accident de travail dans votre dossier.

Continuez à travailler en sécurité ! 🛡️`;
    }
    
    let message = `⚠️ **Vos accidents de travail**\n\n`;
    message += `📊 **Total** : ${data.accidents.length} accident(s)\n`;
    message += `📅 **Total jours d'arrêt** : ${data.totalJoursArret} jours\n\n`;
    message += `📋 **Détails** :\n\n`;
    
    data.accidents.forEach((a, i) => {
      const date = moment(a.date_accident).format('DD/MM/YYYY');
      message += `${i+1}. **${date}** - ${a.gravite || 'Non définie'}\n`;
      if (a.lieu_accident) message += `   📍 ${a.lieu_accident}\n`;
      if (a.jour_arret > 0) message += `   📅 Arrêt : ${a.jour_arret} jours\n`;
      message += `\n`;
    });
    
    return message;
  }

  formatPoste(data) {
    const isChauffeur = data.estChauffeur;
    return `💼 **Votre poste actuel**

👤 **Agent** : ${data.agent.nom} ${data.agent.prenom}
📌 **Poste** : ${isChauffeur ? '🚌 Chauffeur' : (data.affectation?.libelle_affectation || 'Non défini')}
📅 **Périodicité des visites** : ${data.periodicite}

${isChauffeur ? '🚌 Surveillance médicale renforcée tous les 6 mois.' : '📋 Périodicité adaptée à votre poste.'}`;
  }

  formatAgence(data) {
    if (!data.agence) {
      return `🏢 **Agence non définie**

Votre profil n'est pas associé à une agence.`;
    }
    
    return `🏢 **Votre agence de rattachement**

📛 **Agence** : ${data.agence.nom_agence}
📍 **Ville** : ${data.agence.ville || 'Non précisée'}
📮 **Adresse** : ${data.agence.adresse || 'Non précisée'}
📞 **Téléphone** : ${data.agence.telephone || 'Non précisé'}`;
  }

  formatAptitude(data) {
    if (data.inaptitudeStatus && data.inaptitudeStatus.estEnCours) {
      return `🏥 **Statut d'aptitude** : ⚠️ Inapte temporaire

📅 **Début** : ${data.inaptitudeStatus.dateDebut}
📅 **Fin prévue** : ${data.inaptitudeStatus.dateFin}
⏱️ **Jours restants** : ${data.inaptitudeStatus.joursRestants} jours

📋 Une visite de reprise sera programmée automatiquement.`;
    }
    
    return `🏥 **Statut d'aptitude** : ✅ Apte

Vous êtes actuellement apte à votre poste de travail.

📅 **Dernière visite** : ${data.derniereVisite?.date_visite || 'Non renseignée'}
📋 **Résultat** : ${data.derniereVisite?.resultat || 'Non renseigné'}

👍 Continuez à respecter les consignes de sécurité.`;
  }

  formatAide() {
    return `🤖 **Aide - Assistant HSE**

📅 **Visites médicales**
• "Quand est ma prochaine visite ?"
• "Historique de mes visites"

⚠️ **Accidents**
• "Mes accidents de travail"
• "Combien de jours d'arrêt ?"

📊 **Statistiques**
• "Compare mes accidents"
• "Mes statistiques"

📄 **Documents**
• "Génère mon certificat"
• "Génère ma déclaration accident"
• "Génère ma convocation"
• "Génère mon bilan annuel"
• "Exporte tous mes documents"

👤 **Informations**
• "Mes informations"
• "Mon poste"
• "Mon agence"

🏥 **Aptitude**
• "Suis-je apte ?"

💡 *Posez vos questions en français naturel.*`;
  }

  formatDefault(data) {
    return `👋 Bonjour ${data.agent.prenom || 'cher agent'} !

Je suis votre assistant HSE. Je peux vous aider avec :

• 📅 Vos visites médicales
• ⚠️ Vos accidents de travail
• 📊 Statistiques et comparaisons
• 📄 Génération de documents
• 👤 Vos informations personnelles
• 🏥 Votre statut d'aptitude

**Posez-moi votre question** comme vous le feriez avec un collègue.

*Exemples : "Quand est ma prochaine visite ?" ou "Génère mon certificat"*`;
  }
}

module.exports = IntelligentChatbot;