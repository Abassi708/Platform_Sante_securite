// backend/services/chatbot/intelligentChatbot.js
const OpenAI = require('openai');
const db = require('../../models');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
moment.locale('fr');

// ========== CLASSE CIRCUIT BREAKER ==========
class CircuitBreaker {
  constructor(failureThreshold = 3, timeoutMs = 60000) {
    this.failureThreshold = failureThreshold;
    this.timeoutMs = timeoutMs;
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED';
  }

  async call(fn, fallback) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeoutMs) {
        this.state = 'HALF_OPEN';
        console.log('🔌 Circuit breaker: HALF_OPEN');
      } else {
        console.log('🔌 Circuit breaker: OPEN - using fallback');
        return fallback();
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
        console.log('🔌 Circuit breaker: CLOSED (recovered)');
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      console.error(`🔌 Circuit breaker: failure ${this.failures}/${this.failureThreshold}`);
      
      if (this.failures >= this.failureThreshold) {
        this.state = 'OPEN';
        console.error('🔌 Circuit breaker: OPEN');
      }
      return fallback();
    }
  }

  reset() {
    this.failures = 0;
    this.lastFailureTime = null;
    this.state = 'CLOSED';
    console.log('🔌 Circuit breaker: RESET');
  }
}

// ========== CLASSE RATE LIMITER ==========
class RateLimiter {
  constructor(maxRequests = 10, windowMs = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.requests = new Map();
  }

  isAllowed(userId) {
    const now = Date.now();
    const userRequests = this.requests.get(userId) || [];
    const recentRequests = userRequests.filter(t => now - t < this.windowMs);
    
    if (recentRequests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...recentRequests);
      const waitTime = Math.ceil((oldestRequest + this.windowMs - now) / 1000);
      console.log(`⚠️ Rate limit exceeded for user ${userId}. Wait ${waitTime}s`);
      return { allowed: false, waitTime };
    }
    
    recentRequests.push(now);
    this.requests.set(userId, recentRequests);
    return { allowed: true, waitTime: 0 };
  }

  reset(userId) {
    this.requests.delete(userId);
  }
}

class IntelligentChatbot {
  constructor() {
    // Configuration pour Groq ou OpenAI
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    });
    this.model = process.env.OPENAI_MODEL || 'llama-3.1-8b-instant';
    this.useAI = process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('local');
    this.baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
    
    // Cache mémoire (5 minutes)
    this.cache = new Map();
    this.cacheTTL = 300000;
    
    // Sécurité
    this.rateLimiter = new RateLimiter(
      parseInt(process.env.CHATBOT_RATE_LIMIT) || 10,
      parseInt(process.env.CHATBOT_RATE_WINDOW) || 60000
    );
    this.circuitBreaker = new CircuitBreaker(3, 60000);
    
    // Métriques
    this.metrics = {
      totalRequests: 0,
      totalErrors: 0,
      avgResponseTime: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    // === MAPPING DES SOURCES DE DONNÉES ===
    this.dataSources = {
      agent: {
        table: 'agent',
        base: 'globale',
        champs: ['nom', 'prenom', 'matricule_agent', 'statut', 'date_naissance', 
                 'date_debut_inaptitude', 'date_fin_inaptitude', 'date_prochaine_inaptitude',
                 'date_derniere_visite', 'periodicite_jours', 'direction']
      },
      agence: {
        table: 'agence',
        base: 'globale',
        champs: ['nom_agence', 'ville', 'adresse', 'telephone']
      },
      affectation: {
        table: 'affectation',
        base: 'globale',
        champs: ['libelle_affectation', 'description']
      },
      planning: {
        table: 'planning',
        base: 'locale',
        champs: ['date_visite', 'heure_visite', 'type_visite', 'statut', 
                 'convocation_envoyee', 'semaine', 'annee']
      },
      visite: {
        table: 'visite',
        base: 'locale',
        champs: ['date_visite', 'heure_visite', 'type_visite', 'resultat', 
                 'medecin', 'observation', 'type_action']
      },
      accident: {
        table: 'accident',
        base: 'locale',
        champs: ['date_accident', 'heure_accident', 'lieu_accident', 'gravite', 
                 'jour_arret', 'nature_blessures', 'condition_accident']
      }
    };
  }

  // ========== METHODES DE SÉCURITÉ ==========
  
  _sanitizeInput(message) {
    if (!message) return '';
    
    let sanitized = message
      .replace(/[<>]/g, '')
      .replace(/[&]/g, '&amp;')
      .replace(/["']/g, '')
      .replace(/[\u0000-\u001F]/g, '');
    
    sanitized = sanitized.slice(0, 500);
    return sanitized.trim();
  }

  _validateMatricule(matricule) {
    const num = parseInt(matricule);
    return !isNaN(num) && num > 0 && num < 999999;
  }

  // ========== METHODES DE CACHE ==========
  
  _getCacheKey(matricule, type) {
    return `${matricule}:${type}`;
  }

  async _getCached(key, ttl = null) {
    const ttlMs = ttl || this.cacheTTL;
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttlMs) {
      this.metrics.cacheHits++;
      console.log(`📦 Cache hit: ${key}`);
      return cached.data;
    }
    
    this.metrics.cacheMisses++;
    console.log(`📦 Cache miss: ${key}`);
    return null;
  }

  async _setCached(key, data, ttl = null) {
    const ttlMs = ttl || this.cacheTTL;
    this.cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
    console.log(`💾 Cache set: ${key} (TTL: ${ttlMs/1000}s)`);
    
    if (this.cache.size > 100) {
      this._cleanCache();
    }
  }

  _cleanCache() {
    const now = Date.now();
    let deletedCount = 0;
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    console.log(`🧹 Cache cleaned: ${deletedCount} entries removed`);
  }

  async invalidateCache(matricule) {
    const keys = [
      this._getCacheKey(matricule, 'agentData'),
      this._getCacheKey(matricule, 'token')
    ];
    
    for (const key of keys) {
      if (this.cache.has(key)) {
        this.cache.delete(key);
        console.log(`🗑️ Cache invalidated: ${key}`);
      }
    }
  }

  // ========== METHODES DE NORMALISATION ET DETECTION ==========
  
  _normaliserPhrase(phrase) {
    return phrase
      .toLowerCase()
      .trim()
      .replace(/[éèêë]/g, 'e')
      .replace(/[àâä]/g, 'a')
      .replace(/[ôö]/g, 'o')
      .replace(/[ûü]/g, 'u')
      .replace(/[ïî]/g, 'i')
      .replace(/[ç]/g, 'c')
      .replace(/[’'"]/g, ' ')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  _calculerScoreSimilarite(phrase, motsCles) {
    const normalisee = this._normaliserPhrase(phrase);
    let score = 0;
    
    for (const motCle of motsCles) {
      const motsCleNormalises = motCle.toLowerCase().split(' ');
      let matchCount = 0;
      
      for (const mot of motsCleNormalises) {
        if (normalisee.includes(mot)) {
          matchCount++;
        }
      }
      
      if (matchCount === motsCleNormalises.length) {
        score += 10;
      } else if (matchCount > 0) {
        score += matchCount * 2;
      }
    }
    
    return score;
  }

  _detecterIntention(question) {
    // ✅ Correction des fautes courantes
    let correctedQuestion = question
      .toLowerCase()
      .replace(/visistes/g, 'visites')
      .replace(/visitee/g, 'visite')
      .replace(/donner/g, 'donne')
      .replace(/moies/g, 'mes')
      .replace(/donees/g, 'donnees')
      .replace(/ms/g, 'mes')
      .replace(/l historique/g, 'lhistorique');
    
    const q = this._normaliserPhrase(correctedQuestion);
    
    // ✅ MODIFICATION 1 : PRIORITÉ "type de visite future"
    if ((q.includes('type') && (q.includes('future') || q.includes('prochaine'))) ||
        (q.includes('quel type') && q.includes('visite'))) {
      console.log(`🎯 Intention forcée: prochaineVisite`);
      return { intention: 'prochaineVisite', score: 100 };
    }
    
    // ✅ MODIFICATION 2 : PRIORITÉ Questions sur les contacts
    if (q.includes('contacter') || q.includes('contact') || q.includes('telephone') || 
        q.includes('appeler') || q.includes('numero') || q.includes('adresse') ||
        q.includes('service hse') || q.includes('service sante') || q.includes('securite') ||
        q.includes('comment joindre')) {
      console.log(`🎯 Intention forcée: contact`);
      return { intention: 'contact', score: 100 };
    }
    
    // ✅ MODIFICATION 3 : PRIORITÉ "Pourquoi ce type de visite ?"
    if ((q.includes('pourquoi') || q.includes('raison')) && 
        (q.includes('periodique') || q.includes('reprise') || 
         q.includes('reclassement') || q.includes('embauche')) &&
        (q.includes('type') || q.includes('visite'))) {
      console.log(`🎯 Intention forcée: pourquoiTypeVisite`);
      return { intention: 'pourquoiTypeVisite', score: 100 };
    }
    
    // ✅ PRIORITÉ ABSOLUE : Questions "que faire en cas d'accident" (toutes formes)
    if ((q.includes('accident') && (q.includes('que faire') || q.includes('que dois je') || q.includes('dois je faire') || q.includes('que doit je') || q.includes('que faut il'))) ||
        (q.includes('accident') && q.includes('avant') && q.includes('visite')) ||
        (q.includes('accident') && q.includes('prochaine visite')) ||
        (q.includes('accident') && q.includes('périodique')) ||
        (q.includes('arrêt') && q.includes('visite')) ||
        (q.includes('reprogrammer') && q.includes('accident')) ||
        (q.includes('impact') && q.includes('accident')) ||
        (q.includes('conséquence') && q.includes('accident'))) {
      console.log(`🎯 Intention forcée: procedureAccident`);
      return { intention: 'procedureAccident', score: 100 };
    }
    
    // ✅ PRIORITÉ ABSOLUE : Questions sur les types de visites
    if (q.includes('type') && q.includes('visite') || 
        q.includes('difference') && q.includes('visite') ||
        q.includes('4 types') || q.includes('quatre types') ||
        q.includes('c est quoi une visite') ||
        q.includes('definition des visites')) {
      console.log(`🎯 Intention forcée: differenceTypesVisites`);
      return { intention: 'differenceTypesVisites', score: 100 };
    }
    
    // ✅ PRIORITÉ ABSOLUE : Détection des questions "pourquoi"
    if (q.startsWith('pourquoi') || 
        q.includes('pourquoi est ce que') || 
        q.includes('pourquoi ma') ||
        q.includes('pourquoi mon') ||
        q.includes('pourquoi cette') ||
        (q.includes('pourquoi') && (q.includes('visite') || q.includes('date') || q.includes('accident')))) {
      console.log(`🎯 Intention forcée: explication (détection du mot "pourquoi")`);
      return { intention: 'explication', score: 100 };
    }
    
    // ✅ PRIORITÉ POUR LES QUESTIONS DE REPROGRAMMATION
    if (q.includes('peux pas') || q.includes('pas aller') || q.includes('pas venir') ||
        q.includes('que faire') || q.includes('que dois je faire') || q.includes('reprogrammer') ||
        q.includes('changer date') || q.includes('modifier date') || q.includes('pas disponible')) {
      console.log(`🎯 Intention forcée: reprogrammation`);
      return { intention: 'reprogrammation', score: 100 };
    }
    
    const intentions = {
      salutation: ['bonjour', 'salut', 'coucou', 'hello', 'hi', 'bonsoir', 'bienvenue', 'hey'],
      remerciement: ['merci', 'thanks', 'merci beaucoup', 'cest gentil', 'top', 'parfait', 'super'],
      auRevoir: ['au revoir', 'bye', 'a plus', 'ciao', 'adieu', 'a bientot'],
      commentCaVa: ['ca va', 'comment ca va', 'comment allez vous', 'comment vas tu'],
      oui: ['oui', 'ok', 'daccord', 'entendu', 'oui merci'],
      non: ['non', 'non merci', 'pas maintenant', 'non rien'],
      aide: ['aide', 'help', 'que peux tu faire', 'que faire', 'besoin aide'],
      // ✅ MODIFICATION 5 : Ajout de contact et pourquoiTypeVisite
      contact: ['contacter', 'contact', 'telephone', 'appeler', 'numero', 'adresse', 'service hse', 'service sante', 'securite', 'comment joindre'],
      pourquoiTypeVisite: ['pourquoi periodique', 'pourquoi reprise', 'pourquoi reclassement', 'pourquoi embauche', 'raison de la visite periodique', 'pourquoi ce type de visite'],
      
      explication: ['explique', 'comment se fait il', 'quelle est la raison', 'pour quelle raison', 'explique moi', 'raison de', 'cause de'],
      
      identite: [
        'qui suis je', 'mes info', 'mon profil', 'me connaitre', 'presente moi', 
        'nom prenom', 'identite', 'matricule', 'mon matricule', 'numero agent',
        'mes donnees personnelles', 'mes donnees', 'mes informations personnelles',
        'donne moi mes informations', 'donner moi mes donnees', 'mes coordonnees',
        'ma fiche', 'mon dossier'
      ],
      poste: ['mon poste', 'ma fonction', 'mon travail', 'quel poste', 'mon role', 'ce que je fais', 'ma mission', 'suis je chauffeur', 'controleur', 'affectation'],
      agence: ['mon agence', 'ou je travaille', 'lieu travail', 'mon bureau', 'agence rattachement', 'dans quelle agence', 'adresse agence', 'telephone agence'],
      dateNaissance: ['date naissance', 'age', 'anniversaire', 'quel age', 'ne quand', 'ma date de naissance', 'je suis ne', 'annee naissance'],
      statut: ['mon statut', 'statut agent', 'actif', 'inactif', 'en activite', 'je travaille', 'je suis en poste'],
      
      prochaineVisite: ['prochaine visite', 'prochain rdv', 'prochain rendez vous', 'quand visite', 'date prochaine visite', 'quand mes visites', 'mes visites a venir', 'visites programmees', 'mes prochaines visites'],
      
      visitesFutures: [
        'visites futures', 'visites a venir', 'prochaines visites',
        'mes prochaines visites', 'visites programmees',
        'quels sont mes visites futures', 'quelles sont mes prochaines visites',
        'visites prevues', 'mes rendez vous a venir', 'planning a venir',
        'donne moi mes visites futures', 'afficher mes prochaines visites',
        'liste de mes prochaines visites', 'mes visites a venir'
      ],
      
      toutesVisites: [
        'toutes mes visites', 'liste mes visites', 'affiche mes visites', 
        'voir mes visites', 'planning complet', 'tous mes rdv', 
        'tous mes rendez vous', 'calendrier visites', 'mes consultations', 
        'afficher mes visites', 'donne moi toutes mes visites', 'planning total'
      ],
      
      prochainePeriodique: ['prochaine visite periodique', 'visite periodique', 'prochaine periodique', 'routine', 'visite de routine','prochaine visite programmé','visite future'],
      prochaineReprise: ['prochaine visite reprise', 'visite reprise', 'reprise apres arret', 'retour travail'],
      prochaineReclassement: ['prochaine visite reclassement', 'visite reclassement', 'reclassement', 'changement poste'],
      prochaineEmbauche: ['prochaine visite embauche', 'visite embauche', 'embauche', 'nouvel agent'],
      
      derniereVisite: ['derniere visite', 'ma derniere visite', 'quand visite', 'date derniere visite', 'c etait quand', 'dernier rdv'],
      resultatVisite: ['resultat visite', 'le medecin a dit', 'avis medecin', 'apte ou pas', 'suis je apte', 'visite resultat', 'conclusion visite'],
      
      historiqueVisites: [
        'historique visite', 'liste visite', 'ancienne visite', 'visite anterieure', 
        'tout mes visite', 'visites passees', 'mes anciennes visites', 
        'visites effectuees', 'mes visites passees', 'historique complet',
        'historique de mes visites', 'mes visites deja faites',
        'visites realisees', 'visites que j ai faites',
        'mon historique medical', 'les visites que j ai deja effectuees',
        'donne moi l historique de mes visites', 'donner moi l historique de mes visites'
      ],
      
      accidents: [
        'accident', 'accident travail', 'sinistre', 'blessure', 'arret maladie', 
        'arret travail', 'jour arret', 'combien accident', 'mes accident', 
        'incident', 'chute', 'fracture', 'entorse', 'blesse', 'traumatisme',
        'details sur les accidents', 'detail accident', 'les accidents',
        'mes accidents details', 'accident details', 'info accident',
        'description accident', 'circonstances accident', 'donne moi les details sur les accidents'
      ],
      
      inaptitude: ['inaptitude', 'inapte', 'pas apte', 'en arret', 'inapte temporaire', 'quand je reviens', 'date fin arret', 'jusqua quand arret', 'je suis malade'],
      
      documents: ['certificat', 'convocation', 'attestation', 'papier', 'document', 'justificatif', 'generer', 'telecharger', 'pdf', 'imprimer'],
      
      graphiques: ['graphique', 'courbe', 'evolution', 'tendance', 'diagramme', 'chart'],
      
      statistiques: ['statistique', 'combien', 'total', 'nombre', 'quantite', 'beaucoup', 'peu', 'frequence', 'moyenne'],
      
      comparaison: ['comparer', 'moyenne', 'par rapport', 'les autres', 'collegue', 'difference', 'ecart', 'normal']
    };
    
    let meilleureIntention = 'inconnue';
    let meilleurScore = 0;
    
    for (const [intention, motsCles] of Object.entries(intentions)) {
      const score = this._calculerScoreSimilarite(q, motsCles);
      if (score > meilleurScore) {
        meilleurScore = score;
        meilleureIntention = intention;
      }
    }
    
    // ✅ MODIFICATION 4 : Si le score est trop bas, retourner intention inconnue
    if (meilleurScore < 5) {
      console.log(`🎯 Score trop bas (${meilleurScore}), intention inconnue`);
      return { intention: 'inconnue', score: 0 };
    }
    
    console.log(`🎯 Intention détectée: ${meilleureIntention} (score: ${meilleurScore})`);
    return { intention: meilleureIntention, score: meilleurScore };
  }

  _extraireTypeVisite(question) {
    const q = this._normaliserPhrase(question);
    
    if (q.includes('periodique') || q.includes('routine') || q.includes('check') || q.includes('bilan')) {
      return 'Périodique';
    }
    if (q.includes('reprise') || q.includes('retour') || q.includes('apres arret')) {
      return 'Reprise';
    }
    if (q.includes('reclassement') || q.includes('changement poste') || q.includes('reorientation')) {
      return 'Reclassement';
    }
    if (q.includes('embauche') || q.includes('nouveau') || q.includes('recrutement') || q.includes('premiere')) {
      return 'Embauche';
    }
    return null;
  }

  _extraireDate(question) {
    const q = question.toLowerCase();
    
    const patterns = [
      { regex: /(\d{1,2})\/(\d{1,2})\/(\d{4})/, getDate: (m) => `${m[3]}-${m[2]}-${m[1]}` },
      { regex: /(\d{1,2})-(\d{1,2})-(\d{4})/, getDate: (m) => `${m[3]}-${m[2]}-${m[1]}` },
      { regex: /(\d{4})-(\d{1,2})-(\d{1,2})/, getDate: (m) => `${m[1]}-${m[2]}-${m[3]}` },
      { regex: /(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})/, 
        getDate: (m) => `${m[3]}-${this._moisEnNombre(m[2])}-${m[1]}` }
    ];
    
    for (const pattern of patterns) {
      const match = q.match(pattern.regex);
      if (match) {
        return pattern.getDate(match);
      }
    }
    
    return null;
  }

  _moisEnNombre(mois) {
    const moisMap = {
      'janvier': '01', 'fevrier': '02', 'mars': '03', 'avril': '04',
      'mai': '05', 'juin': '06', 'juillet': '07', 'aout': '08',
      'septembre': '09', 'octobre': '10', 'novembre': '11', 'decembre': '12'
    };
    return moisMap[mois] || '01';
  }

  _formaterDate(date, avecJour = true) {
    if (!date) return 'Non renseignée';
    const d = moment(date);
    return avecJour ? d.format('dddd DD MMMM YYYY') : d.format('DD/MM/YYYY');
  }

  _formaterHeure(heure) {
    if (!heure) return '09:00';
    return heure.substring(0, 5);
  }

  _getTypeEmoji(type) {
    const emojis = {
      'Périodique': '📅',
      'Reprise': '🔄',
      'Reclassement': '📋',
      'Embauche': '🆕'
    };
    return emojis[type] || '🏥';
  }

  _getTypeDescription(type) {
    const descriptions = {
      'Périodique': 'visite de routine médicale',
      'Reprise': 'visite de retour après un arrêt de travail',
      'Reclassement': 'visite pour un changement de poste',
      'Embauche': "visite d'intégration pour un nouvel agent"
    };
    return descriptions[type] || 'visite médicale';
  }

  // ========== RÈGLES MÉTIER ==========

  getBusinessRules() {
    return {
      accident: {
        impactOnVisite: {
          description: "Un accident avec arrêt de travail annule les visites programmées pendant l'arrêt",
          regle: (dateAccident, joursArret, dateVisiteProgrammee) => {
            if (!joursArret || joursArret === 0) return { impact: 'aucun', message: "La visite programmée est maintenue" };
            
            const finArret = moment(dateAccident).add(joursArret, 'days');
            const dateVisite = moment(dateVisiteProgrammee);
            
            if (dateVisite.isBefore(finArret)) {
              return { 
                impact: 'annulation', 
                message: `La visite sera annulée car elle tombe pendant votre arrêt.`,
                nouvelleVisite: 'reprise'
              };
            }
            return { impact: 'aucun', message: "Votre visite programmée est après la fin de l'arrêt, elle est maintenue." };
          }
        },
        calculDateReprise: (dateAccident, joursArret) => {
          const finArret = moment(dateAccident).add(joursArret, 'days');
          let dateReprise = moment(finArret).subtract(3, 'days');
          
          while (dateReprise.day() === 0 || dateReprise.day() === 6) {
            dateReprise.subtract(1, 'day');
          }
          
          return dateReprise;
        },
        typeVisiteApresAccident: (joursArret) => joursArret > 30 ? 'Reclassement' : 'Reprise',
        priorite: { 'Reprise': 150, 'Reclassement': 150, 'Périodique': 100, 'Embauche': 100 }
      }
    };
  }

  _estJourOuvre(date) {
    const jour = date.day();
    return jour >= 2 && jour <= 5;
  }

  // ========== RÉPONSE MÉTIER INTELLIGENTE ==========

  async reponseImpactAccident(question, agentData) {
    const prochaineVisite = agentData.toutesProchainesVisites[0];
    const businessRules = this.getBusinessRules();
    
    if (!prochaineVisite) {
      return `🔍 **IMPACT D'UN ACCIDENT DE TRAVAIL**

Vous n'avez actuellement aucune visite programmée.

**Si vous avez un accident :**

**Cas 1 : Accident SANS arrêt**
✅ Pas de visite supplémentaire programmée
📋 Mentionnez l'accident lors de votre prochaine visite périodique

**Cas 2 : Accident AVEC arrêt**
🔄 Une visite de reprise sera programmée automatiquement
📅 Date de reprise = (fin arrêt) - 3 jours ouvrables

**Selon la durée d'arrêt :**
• ≤ 30 jours → Visite de **REPRISE**
• > 30 jours → Visite de **RECLASSEMENT**

💡 **Recommandation :** Signalez tout accident immédiatement à votre supérieur.`;
    }

    const dateVisite = prochaineVisite.date_visite;
    const typeVisite = prochaineVisite.type_visite;
    const dateFormatted = this._formaterDate(dateVisite);
    
    let reponse = `🔍 **IMPACT D'UN ACCIDENT SUR VOTRE VISITE**

📋 **Votre situation actuelle :**
• Visite programmée : **${dateFormatted}** (${typeVisite})
• Poste : ${agentData.estChauffeur ? '🚌 Chauffeur' : '👤 Agent'}
• Périodicité : ${agentData.periodicite}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏥 **RÈGLES MÉTIER HSE**

**Cas 1 : Accident SANS arrêt de trabalho** (jour_arret = 0)

✅ **Votre visite du ${dateFormatted} reste maintenue**
📅 La date ne change pas
👨‍⚕️ Le médecin sera informé de l'accident lors de la visite
📋 L'accident sera ajouté à votre dossier médical

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Cas 2 : Accident AVEC arrêt de travail** (jour_arret > 0)

❌ **Votre visite du ${dateFormatted} sera automatiquement annulée**
🔄 Une **visite de reprise** sera programmée automatiquement

📊 **Calcul automatique du système (exemple avec arrêt de 15 jours) :**

`;

    const dateAccidentSimulee = moment().format('YYYY-MM-DD');
    const dureeTest = 15;
    const dateFinArret = moment(dateAccidentSimulee).add(dureeTest, 'days');
    const dateReprise = businessRules.accident.calculDateReprise(dateAccidentSimulee, dureeTest);
    const typePostAccident = businessRules.accident.typeVisiteApresAccident(dureeTest);
    
    reponse += `• Date accident : ${this._formaterDate(dateAccidentSimulee, false)}\n`;
    reponse += `• Durée d'arrêt : ${dureeTest} jours\n`;
    reponse += `• Fin d'arrêt : ${this._formaterDate(dateFinArret.format('YYYY-MM-DD'), false)}\n`;
    reponse += `• → Visite de ${typePostAccident} programmée le ${this._formaterDate(dateReprise.format('YYYY-MM-DD'))}\n\n`;

    reponse += `📌 **Selon la durée de votre arrêt :**
• Arrêt ≤ 30 jours → Visite de **REPRISE**
• Arrêt > 30 jours → Visite de **RECLASSEMENT**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 **CE QUE VOUS DEVEZ FAIRE :**
1. Signalez l'accident immédiatement à votre supérieur
2. Fournissez l'arrêt de travail au service RH
3. Le système reprogrammera automatiquement votre visite
4. Vous recevrez une notification avec la nouvelle date

💡 *Cette analyse est basée sur les règles de gestion du système. En cas de doute, contactez le service HSE.*`;

    return reponse;
  }

  // ========== RÉPONSE POUR LA REPROGRAMMATION ==========

  async reponseReprogrammation(question, agentData) {
    const prochaineVisite = agentData.toutesProchainesVisites[0];
    
    if (!prochaineVisite) {
      return `📅 **AUCUNE VISITE PROGRAMMÉE**

Vous n'avez pas de visite médicale prévue pour le moment.

💡 Si vous souhaitez planifier une visite, contactez le service HSE.`;
    }
    
    const dateFormatted = this._formaterDate(prochaineVisite.date_visite);
    const typeVisite = prochaineVisite.type_visite;
    const heureFormatted = this._formaterHeure(prochaineVisite.heure_visite);
    
    let reponse = `📅 **REPROGRAMMATION DE VOTRE VISITE**

Votre visite du **${dateFormatted}** à **${heureFormatted}** (${typeVisite}) ne vous convient pas ?

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ **CE QUE VOUS POUVEZ FAIRE :**

1. **Reprogrammation manuelle**
   → Contactez le service HSE au **71 123 456**
   → Ou envoyez un email à **hse@srtb.tn**
   → Précisez votre nom, matricule et les dates disponibles

2. **Reprogrammation automatique** (via l'application)
   → Connectez-vous à l'application HSE Manager
   → Allez dans "Planning" → "Mes visites"
   → Cliquez sur "Reprogrammer"
   → Choisissez une nouvelle date parmi les créneaux disponibles

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ **IMPORTANT :**
`;

    if (typeVisite === 'Périodique') {
      reponse += `• Une visite périodique peut être reprogrammée, mais pas annulée
• La nouvelle date doit respecter votre périodicité médicale (${agentData.periodicite})
• Prévoyez au moins **48h** à l'avance
`;
    } else if (typeVisite === 'Reprise' || typeVisite === 'Reclassement') {
      reponse += `• Ces visites sont prioritaires pour votre suivi médical
• Une annulation est possible uniquement avec justificatif
• Contactez rapidement le service HSE
`;
    } else {
      reponse += `• Prévoyez au moins **48h** à l'avance pour toute modification
• Une notification sera envoyée à votre responsable
`;
    }

    reponse += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 **Service HSE SRTB**
Téléphone : 71 123 456
Email : hse@srtb.tn
Horaires : Lundi-Vendredi, 8h-16h

💡 *Si vous avez un justificatif (arrêt maladie, urgence familiale), veuillez le transmettre au service HSE.*`;

    return reponse;
  }

  // ========== RÉPONSE PROCÉDURE EN CAS D'ACCIDENT (TOUTES FORMES) ==========

  async reponseProcedureAccident(question, agentData) {
    const prochaineVisite = agentData.toutesProchainesVisites[0];
    const dateProchaine = prochaineVisite ? this._formaterDate(prochaineVisite.date_visite) : 'Non programmée';
    const typeVisite = prochaineVisite?.type_visite || 'Périodique';
    const estChauffeur = agentData.estChauffeur;
    
    let reponse = `⚠️ **QUE FAIRE EN CAS D'ACCIDENT DE TRAVAIL ?**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 **VOTRE SITUATION ACTUELLE**
• Prochaine visite : ${dateProchaine} (${typeVisite})
• Poste : ${estChauffeur ? 'Chauffeur' : 'Contrôleur'}
• Périodicité : ${agentData.periodicite}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏥 **SI VOUS AVEZ UN ACCIDENT AVANT VOTRE VISITE**

**ÉTAPE 1 : DÉCLARATION IMMÉDIATE**
→ Informez votre supérieur hiérarchique SANS DÉLAI
→ Remplissez la déclaration d'accident de travail (formulaire HSE)
→ Consultez un médecin pour obtenir un certificat médical

**ÉTAPE 2 : TRANSMISSION DES DOCUMENTS**
→ Fournissez l'arrêt de travail au service RH
→ Envoyez une copie au service HSE (hse@srtb.tn)
→ Gardez une copie pour vos archives

**ÉTAPE 3 : IMPACT SUR VOTRE VISITE**

`;

    if (typeVisite === 'Périodique') {
      reponse += `**Cas A : Accident SANS arrêt de travail**
✅ VOTRE VISITE DU ${dateProchaine.toUpperCase()} RESTE MAINTENUE
📋 Mentionnez l'accident au médecin lors de la visite

**Cas B : Accident AVEC arrêt de travail**
❌ VOTRE VISITE SERA AUTOMATIQUEMENT ANNULÉE
🔄 Une visite de REPRISE sera reprogrammée
📅 La nouvelle date = (date fin d'arrêt) - 3 jours ouvrables
`;
    } else if (typeVisite === 'Reprise') {
      reponse += `⚠️ Vous avez déjà une visite de reprise programmée.

**Si vous avez un NOUVEL accident :**
• L'ancienne visite de reprise sera annulée
• Une NOUVELLE visite de reprise sera reprogrammée
• Contactez rapidement le service HSE
`;
    } else {
      reponse += `⚠️ Contactez le service HSE immédiatement
📞 Téléphone : 71 123 456
📧 Email : hse@srtb.tn
Ils reprogrammeront votre visite selon votre situation.
`;
    }

    reponse += `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ **RÉSUMÉ DES ACTIONS À ENTREPRENDRE**

1. 📞 Signalez l'accident à votre supérieur
2. 📄 Obtenez un certificat médical
3. 📧 Envoyez les documents au service HSE
4. ⏳ Attendez la notification de reprogrammation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📞 **CONTACTS SERVICE HSE SRTB**
Téléphone : 71 123 456
Email : hse@srtb.tn
Horaires : Lundi-Vendredi, 8h00 - 16h00

💡 *Important : Ne manquez pas votre visite programmée tant qu'elle n'est pas officiellement annulée par le service HSE.*`;

    return reponse;
  }

  // ========== RÉPONSE POUR LA DIFFÉRENCE ENTRE LES TYPES DE VISITES ==========

  reponseDifferenceTypesVisites(agentData) {
    const estChauffeur = agentData.estChauffeur;
    const prochaineVisite = agentData.prochainesParType['Périodique'];
    const dateProchaine = prochaineVisite ? this._formaterDate(prochaineVisite.date_visite, false) : 'Non programmée';
    
    return `📋 **LES 4 TYPES DE VISITES MÉDICALES**

**1. VISITE PÉRIODIQUE**
C'est une visite médicale de contrôle qui doit être faite régulièrement par tous les agents. Pour les chauffeurs, elle est obligatoire tous les 6 mois. Pour les contrôleurs, tous les 1 an.

**2. VISITE DE REPRISE**
C'est une visite obligatoire après un arrêt de travail de moins de 30 jours. Elle permet de vérifier que vous êtes apte à reprendre votre poste.

**3. VISITE DE RECLASSEMENT**
C'est une visite médicale qui évalue si vous pouvez changer de poste après un arrêt de plus de 30 jours ou une inaptitude médicale.

**4. VISITE D'EMBAUCHE**
C'est la visite médicale obligatoire pour tout nouvel agent avant son embauche définitive.

💡 **Votre cas** : Vous êtes chauffeur → visite périodique tous les 6 mois. Prochaine visite : ${dateProchaine}.`;
  }

  // ========== RÉCUPÉRATION DES DONNÉES (OPTIMISÉE) ==========

  async getUserToken(matricule) {
    if (!this._validateMatricule(matricule)) {
      console.log('❌ Matricule invalide');
      return null;
    }
    
    const cacheKey = this._getCacheKey(matricule, 'token');
    const cached = await this._getCached(cacheKey, 300000);
    if (cached) return cached;
    
    try {
      const user = await db.local.User.findOne({
        where: { matricule_agent: matricule },
        attributes: ['id_utilisateur', 'matricule_agent']
      });
      
      if (!user) {
        console.log('❌ Utilisateur non trouvé pour matricule:', matricule);
        return null;
      }
      
      const token = jwt.sign(
        { id: user.id_utilisateur, matricule: matricule },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      
      await this._setCached(cacheKey, token, 3600000);
      return token;
    } catch (error) {
      console.error('Erreur génération token:', error);
      return null;
    }
  }

  async getAgentCompleteData(matricule) {
    if (!this._validateMatricule(matricule)) {
      console.log('❌ Matricule invalide');
      return null;
    }
    
    const cacheKey = this._getCacheKey(matricule, 'agentData');
    const cached = await this._getCached(cacheKey);
    if (cached) return cached;
    
    const startTime = Date.now();
    
    try {
      console.log(`📊 Récupération données pour matricule ${matricule}`);
      
      const agent = await db.global.Agent.findOne({
        where: { matricule_agent: matricule },
        raw: true
      });
      
      if (!agent) {
        console.log(`❌ Agent non trouvé: ${matricule}`);
        return null;
      }
      
      // ✅ Parallélisation des requêtes
      const [agence, affectation, toutesProchainesVisites, toutesVisites, accidents] = await Promise.all([
        agent.code_agence ? db.global.Agence.findByPk(agent.code_agence, { raw: true }) : Promise.resolve(null),
        agent.code_affectation ? db.global.Affectation.findByPk(agent.code_affectation, { raw: true }) : Promise.resolve(null),
        db.local.Planning.findAll({
          where: {
            matricule_agent: matricule,
            date_visite: { [Op.gte]: moment().format('YYYY-MM-DD') },
            statut: 'Programmé'
          },
          order: [['date_visite', 'ASC'], ['heure_visite', 'ASC']],
          raw: true
        }),
        db.local.Visite.findAll({
          where: { matricule_agent: matricule },
          order: [['date_visite', 'DESC']],
          raw: true,
          limit: 100
        }),
        db.local.Accident.findAll({
          where: { matricule_agent: matricule },
          order: [['date_accident', 'DESC']],
          raw: true,
          limit: 50
        })
      ]);
      
      const prochainesParType = {
        'Périodique': toutesProchainesVisites.find(v => v.type_visite === 'Périodique'),
        'Reprise': toutesProchainesVisites.find(v => v.type_visite === 'Reprise'),
        'Reclassement': toutesProchainesVisites.find(v => v.type_visite === 'Reclassement'),
        'Embauche': toutesProchainesVisites.find(v => v.type_visite === 'Embauche')
      };
      
      const visitesParType = {
        'Périodique': toutesVisites.filter(v => v.type_visite === 'Périodique'),
        'Reprise': toutesVisites.filter(v => v.type_visite === 'Reprise'),
        'Reclassement': toutesVisites.filter(v => v.type_visite === 'Reclassement'),
        'Embauche': toutesVisites.filter(v => v.type_visite === 'Embauche')
      };
      
      const derniereParType = {
        'Périodique': visitesParType['Périodique'][0],
        'Reprise': visitesParType['Reprise'][0],
        'Reclassement': visitesParType['Reclassement'][0],
        'Embauche': visitesParType['Embauche'][0]
      };
      
      const visitesRecentes = toutesVisites.slice(0, 10);
      const totalJoursArret = accidents.reduce((sum, a) => sum + (a.jour_arret || 0), 0);
      
      const accidentsParMois = Array(12).fill(0);
      accidents.forEach(acc => {
        if (acc.date_accident) {
          const mois = new Date(acc.date_accident).getMonth();
          accidentsParMois[mois]++;
        }
      });
      
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
      
      const periodicite = agent.code_affectation === 3 ? '6 mois' : '1 an';
      const periodiciteJours = agent.code_affectation === 3 ? 180 : 365;
      
      const data = {
        agent, agence, affectation,
        toutesProchainesVisites, prochainesParType,
        toutesVisites, visitesParType, derniereParType, visitesRecentes,
        accidents, accidentsParMois, totalJoursArret, inaptitudeStatus,
        periodicite, periodiciteJours,
        estChauffeur: agent.code_affectation === 3
      };
      
      const duration = Date.now() - startTime;
      console.log(`✅ Données récupérées en ${duration}ms pour matricule ${matricule}`);
      
      await this._setCached(cacheKey, data);
      return data;
      
    } catch (error) {
      console.error('❌ Erreur getAgentCompleteData:', error);
      this.metrics.totalErrors++;
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
    
    context += `=== PROCHAINES VISITES ===\n`;
    for (const [type, visite] of Object.entries(data.prochainesParType)) {
      if (visite) {
        context += `${this._getTypeEmoji(type)} ${type}: ${moment(visite.date_visite).format('dddd DD MMMM YYYY')} à ${this._formaterHeure(visite.heure_visite)}\n`;
      } else {
        context += `${this._getTypeEmoji(type)} ${type}: Aucune programmée\n`;
      }
    }
    context += `\n`;
    
    context += `=== DERNIÈRES VISITES ===\n`;
    for (const [type, visite] of Object.entries(data.derniereParType)) {
      if (visite) {
        context += `${this._getTypeEmoji(type)} ${type}: ${moment(visite.date_visite).format('DD/MM/YYYY')} - Résultat: ${visite.resultat || 'Non renseigné'}\n`;
      }
    }
    context += `\n`;
    
    if (data.accidents && data.accidents.length > 0) {
      context += `=== ACCIDENTS ===\n`;
      context += `Total: ${data.accidents.length} accident(s)\n`;
      context += `Total jours d'arrêt: ${data.totalJoursArret}\n`;
    }
    
    if (data.inaptitudeStatus && data.inaptitudeStatus.estEnCours) {
      context += `=== INAPTITUDE EN COURS ===\n`;
      context += `Fin prévue: ${data.inaptitudeStatus.dateFin}\n`;
      context += `Jours restants: ${data.inaptitudeStatus.joursRestants}\n\n`;
    }
    
    return context;
  }

  // ========== RÉPONSES SPÉCIFIQUES ==========

  reponseSalutation() {
    const heure = new Date().getHours();
    const salutation = heure < 12 ? "Bonjour" : (heure < 18 ? "Bon après-midi" : "Bonsoir");
    return `${salutation} ! 👋\n\nJe suis votre assistant HSE. Comment puis-je vous aider aujourd'hui ?\n\n💡 Dites "aide" pour voir tout ce que je peux faire.`;
  }

  reponseRemerciement() {
    return `🌟 **Avec plaisir !** 🌟\n\nJe suis là pour vous aider. N'hésitez pas si vous avez d'autres questions.\n\nPassez une excellente journée ! 😊`;
  }

  reponseAuRevoir() {
    return `👋 **Au revoir !**\n\nMerci d'avoir utilisé mes services.\n\nN'oubliez pas :\n• Votre santé est importante\n• Faites vos visites médicales à temps\n• Signalez tout accident rapidement\n\nÀ bientôt et prenez soin de vous ! 🛡️`;
  }

  reponseCommentCaVa() {
    return `🤖 **Je vais très bien, merci de demander !**\n\nJe suis en pleine forme et prêt à vous aider.\n\nEt vous, comment allez-vous ?\n\nPuis-je vous aider avec quelque chose en particulier ?`;
  }

  reponseOui(agentData) {
    return `✅ **Très bien !**

De quoi avez-vous besoin ?

• 📅 "Quand est ma prochaine visite ?"
• ⚠️ "Mes accidents de travail"
• 📄 "Génère mon certificat"
• 📊 "Mes statistiques"

*Dites "aide" pour voir toutes mes capacités*`;
  }

  reponseNon() {
    return `👍 **D'accord !**

Je reste à votre disposition si vous avez besoin d'aide plus tard.

N'hésitez pas à me poser des questions comme :
• "Quand est ma prochaine visite ?"
• "Mes accidents de travail"
• "Génère mon certificat"

Bonne journée ! 👋`;
  }

  reponseIdentite(data) {
    const agent = data.agent;
    return `👤 **Vos informations personnelles**

📛 **Nom complet** : ${agent.nom} ${agent.prenom}
🔢 **Matricule** : ${agent.matricule_agent}
📊 **Statut** : ${agent.statut === 'actif' ? '✅ Actif' : '⚠️ ' + agent.statut}
📅 **Date de naissance** : ${this._formaterDate(agent.date_naissance, false) || 'Non renseignée'}

💼 **Poste** : ${data.affectation?.libelle_affectation || 'Non défini'}
🏢 **Agence** : ${data.agence?.nom_agence || 'Non définie'}

📋 **Dernière visite** : ${this._formaterDate(data.derniereParType['Périodique']?.date_visite, false) || 'Aucune'}
📅 **Prochaine visite** : ${this._formaterDate(data.prochainesParType['Périodique']?.date_visite) || 'Non programmée'}

📊 **Total accidents** : ${data.accidents?.length || 0}
📅 **Total jours d'arrêt** : ${data.totalJoursArret || 0}

❓ **Autres questions ?** Je peux vous renseigner sur vos visites, accidents, ou générer des documents.`;
  }

  reponsePoste(data) {
    const estChauffeur = data.estChauffeur;
    return `💼 **Votre poste actuel**

👤 **Agent** : ${data.agent.nom} ${data.agent.prenom}
📌 **Poste** : ${estChauffeur ? '🚌 Chauffeur' : (data.affectation?.libelle_affectation || 'Non défini')}
📅 **Périodicité des visites** : ${data.periodicite}

${estChauffeur ? '🚌 Surveillance médicale renforcée tous les 6 mois.' : '📋 Périodicité adaptée à votre poste.'}

💡 **Pour information** : Les chauffeurs ont une visite médicale tous les 6 mois, les contrôleurs tous les 1 an.`;
  }

  reponseAgence(data) {
    if (!data.agence) {
      return `🏢 **Agence non définie**

Votre profil n'est pas associé à une agence.

💡 Contactez le service RH pour mettre à jour vos informations.`;
    }
    
    return `🏢 **Votre agence de rattachement**

📛 **Agence** : ${data.agence.nom_agence}
📍 **Ville** : ${data.agence.ville || 'Non précisée'}
📮 **Adresse** : ${data.agence.adresse || 'Non précisée'}
📞 **Téléphone** : ${data.agence.telephone || 'Non précisé'}

💡 Besoin de contacter votre agence ? Utilisez le téléphone ci-dessus.`;
  }

  reponseProchaineVisite(data, typeSpecifique = null) {
    let visites = [];
    
    if (typeSpecifique) {
      const visite = data.prochainesParType[typeSpecifique];
      if (visite) {
        visites = [{ type: typeSpecifique, data: visite }];
      }
    } else {
      for (const [type, visite] of Object.entries(data.prochainesParType)) {
        if (visite) {
          visites.push({ type, data: visite });
        }
      }
    }
    
    if (visites.length === 0) {
      if (typeSpecifique) {
        return `📅 **Aucune visite de type ${typeSpecifique} programmée**

Vous n'avez pas de ${this._getTypeDescription(typeSpecifique)} prévue pour le moment.

💡 Les types de visites sont :
• 📅 **Périodique** : visite de routine (tous les ${data.periodicite})
• 🔄 **Reprise** : retour après arrêt
• 📋 **Reclassement** : changement de poste
• 🆕 **Embauche** : nouvel agent`;
      }
      
      return `📅 **Aucune visite programmée**

Vous n'avez aucune visite médicale prévue pour le moment.

💡 Votre prochaine visite sera programmée automatiquement selon votre périodicité (${data.periodicite}).`;
    }
    
    let message = `📅 **Vos prochaines visites médicales**\n\n`;
    
    for (const visite of visites) {
      const emoji = this._getTypeEmoji(visite.type);
      const dateFormatted = this._formaterDate(visite.data.date_visite);
      const heureFormatted = this._formaterHeure(visite.data.heure_visite);
      
      message += `${emoji} **${visite.type}** (${this._getTypeDescription(visite.type)})\n`;
      message += `   📆 ${dateFormatted}\n`;
      message += `   ⏰ ${heureFormatted}\n`;
      message += `   📍 Infirmerie SRTB - Bizerte\n`;
      message += `   👨‍⚕️ Dr. Mahmoud Khelifi\n\n`;
    }
    
    message += `💡 **Conseil** : Présentez-vous 15 minutes avant avec votre carte d'identité.`;
    
    return message;
  }

  reponseDerniereVisite(data, typeSpecifique = null) {
    let visite = null;
    let type = null;
    
    if (typeSpecifique) {
      visite = data.derniereParType[typeSpecifique];
      type = typeSpecifique;
    } else {
      const toutesVisites = Object.values(data.derniereParType).filter(v => v);
      if (toutesVisites.length > 0) {
        toutesVisites.sort((a, b) => new Date(b.date_visite) - new Date(a.date_visite));
        visite = toutesVisites[0];
        type = visite.type_visite;
      }
    }
    
    if (!visite) {
      return `📋 **Aucune visite enregistrée**

Vous n'avez pas d'historique de visites médicales.

💡 Votre première visite sera programmée automatiquement.`;
    }
    
    const emoji = this._getTypeEmoji(type);
    const dateFormatted = this._formaterDate(visite.date_visite, false);
    const resultat = visite.resultat || 'Non renseigné';
    const resultatEmoji = resultat === 'Apte' ? '✅' : (resultat.includes('Inapte') ? '⚠️' : '📋');
    
    return `📋 **Votre dernière visite médicale**

${emoji} **${type}** (${this._getTypeDescription(type)})
📆 **Date** : ${dateFormatted}
⏰ **Heure** : ${this._formaterHeure(visite.heure_visite)}
👨‍⚕️ **Médecin** : ${visite.medecin || 'Dr. Mahmoud Khelifi'}
${resultatEmoji} **Résultat** : ${resultat}
${visite.observation ? `📝 **Observations** : ${visite.observation}` : ''}

💡 **Besoin de plus de détails ?** Demandez "historique de mes visites".`;
  }

  reponseResultatVisite(data) {
    const toutesVisites = Object.values(data.derniereParType).filter(v => v);
    if (toutesVisites.length === 0) {
      return `📋 **Aucune visite médicale enregistrée**

Vous n'avez pas encore de visite médicale dans votre dossier.

💡 Votre première visite sera programmée selon votre poste.`;
    }
    
    toutesVisites.sort((a, b) => new Date(b.date_visite) - new Date(a.date_visite));
    const derniere = toutesVisites[0];
    const resultat = derniere.resultat || 'Non renseigné';
    const emoji = this._getTypeEmoji(derniere.type_visite);
    
    let message = `📋 **Résultat de votre dernière visite médicale**\n\n`;
    message += `${emoji} **${derniere.type_visite}**\n`;
    message += `📅 **Date** : ${this._formaterDate(derniere.date_visite, false)}\n`;
    message += `✅ **Résultat** : ${resultat}\n`;
    
    if (resultat === 'Apte') {
      message += `\n✅ **Vous êtes apte** à exercer votre poste. Continuez vos bonnes pratiques !`;
    } else if (resultat === 'Apte avec réserves') {
      message += `\n⚠️ **Vous êtes apte avec réserves** : Respectez les préconisations du médecin.`;
    } else if (resultat === 'Inapte temporaire') {
      message += `\n⚠️ **Vous êtes temporairement inapte**. Une visite de reprise sera programmée automatiquement.`;
    } else if (resultat === 'Inapte définitif') {
      message += `\n❌ **Vous êtes inapte définitif**. Veuillez contacter le service RH.`;
    }
    
    return message;
  }

  reponseHistoriqueVisites(data) {
    const visitesPassees = data.toutesVisites.filter(v => 
      moment(v.date_visite).isBefore(moment(), 'day')
    );
    
    if (visitesPassees.length === 0) {
      return `📋 **Aucune visite passée enregistrée**

Vous n'avez pas encore d'historique de visites médicales.

💡 Votre première visite sera programmée automatiquement selon votre poste.`;
    }
    
    let message = `📋 **HISTORIQUE DE VOS VISITES MÉDICALES**\n\n`;
    message += `📊 **Total des visites effectuées** : ${visitesPassees.length}\n\n`;
    
    const periodiques = visitesPassees.filter(v => v.type_visite === 'Périodique');
    const reprises = visitesPassees.filter(v => v.type_visite === 'Reprise');
    const reclassements = visitesPassees.filter(v => v.type_visite === 'Reclassement');
    const embauches = visitesPassees.filter(v => v.type_visite === 'Embauche');
    
    if (periodiques.length > 0) {
      message += `**📅 VISITES PÉRIODIQUES** (${periodiques.length})\n`;
      periodiques.forEach(v => {
        const date = this._formaterDate(v.date_visite, false);
        const resultat = v.resultat || 'Non renseigné';
        const resultatEmoji = resultat === 'Apte' ? '✅' : (resultat.includes('Inapte') ? '⚠️' : '📋');
        message += `   • ${date} : ${resultatEmoji} ${resultat}\n`;
      });
      message += `\n`;
    }
    
    if (reprises.length > 0) {
      message += `**🔄 VISITES DE REPRISE** (${reprises.length})\n`;
      reprises.forEach(v => {
        const date = this._formaterDate(v.date_visite, false);
        const resultat = v.resultat || 'Non renseigné';
        message += `   • ${date} : ${resultat}\n`;
      });
      message += `\n`;
    }
    
    if (reclassements.length > 0) {
      message += `**📋 VISITES DE RECLASSEMENT** (${reclassements.length})\n`;
      reclassements.forEach(v => {
        const date = this._formaterDate(v.date_visite, false);
        const resultat = v.resultat || 'Non renseigné';
        message += `   • ${date} : ${resultat}\n`;
      });
      message += `\n`;
    }
    
    if (embauches.length > 0) {
      message += `**🆕 VISITES D'EMBAUCHE** (${embauches.length})\n`;
      embauches.forEach(v => {
        const date = this._formaterDate(v.date_visite, false);
        const resultat = v.resultat || 'Non renseigné';
        message += `   • ${date} : ${resultat}\n`;
      });
      message += `\n`;
    }
    
    const derniere = visitesPassees[0];
    message += `**📌 DERNIÈRE VISITE**\n`;
    message += `   • Date : ${this._formaterDate(derniere.date_visite)}\n`;
    message += `   • Type : ${derniere.type_visite}\n`;
    message += `   • Résultat : ${derniere.resultat || 'Non renseigné'}\n\n`;
    
    message += `💡 Pour plus de détails, demandez "détails de ma visite du [date]"`;
    
    return message;
  }

  reponseVisitesFutures(data) {
    const visitesFutures = data.toutesProchainesVisites.filter(v => 
      moment(v.date_visite).isSameOrAfter(moment(), 'day')
    );
    
    if (visitesFutures.length === 0) {
      return `📅 **Aucune visite future programmée**

Vous n'avez pas de visite médicale prévue pour le moment.

💡 Votre prochaine visite sera programmée automatiquement selon votre périodicité (${data.periodicite}).`;
    }
    
    let message = `📅 **VOS VISITES FUTURES**\n\n`;
    message += `📊 **Total** : ${visitesFutures.length} visite(s) à venir\n\n`;
    
    for (const visite of visitesFutures) {
      const emoji = this._getTypeEmoji(visite.type_visite);
      const dateFormatted = this._formaterDate(visite.date_visite);
      const heureFormatted = this._formaterHeure(visite.heure_visite);
      const joursRestants = moment(visite.date_visite).diff(moment(), 'days');
      
      message += `${emoji} **${visite.type_visite}**\n`;
      message += `   📆 Date : ${dateFormatted}\n`;
      message += `   ⏰ Heure : ${heureFormatted}\n`;
      message += `   ⏱️ Dans : ${joursRestants} jour(s)\n`;
      message += `   📍 Lieu : Infirmerie SRTB - Bizerte\n`;
      message += `   👨‍⚕️ Médecin : Dr. Mahmoud Khelifi\n\n`;
    }
    
    message += `💡 **Conseil** : Présentez-vous 15 minutes avant avec votre carte d'identité.`;
    
    return message;
  }

  reponseToutesVisites(data) {
    const prochaines = data.toutesProchainesVisites;
    const passees = data.toutesVisites;
    
    let message = `📋 **TOUTES VOS VISITES MÉDICALES**\n\n`;
    
    if (prochaines && prochaines.length > 0) {
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📅 **VISITES À VENIR** (${prochaines.length})\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      for (const visite of prochaines) {
        const dateFormatted = this._formaterDate(visite.date_visite);
        const heureFormatted = this._formaterHeure(visite.heure_visite);
        message += `┌─────────────────────────────────────────────────┐\n`;
        message += `│ ${this._getTypeEmoji(visite.type_visite)} ${visite.type_visite}\n`;
        message += `├─────────────────────────────────────────────────┤\n`;
        message += `│ 📆 Date : ${dateFormatted}\n`;
        message += `│ ⏰ Heure : ${heureFormatted}\n`;
        message += `│ 📍 Lieu : Infirmerie SRTB - Bizerte\n`;
        message += `│ 👨‍⚕️ Médecin : Dr. Mahmoud Khelifi\n`;
        message += `│ 🏷️ Statut : ${visite.statut || 'Programmé'}\n`;
        message += `└─────────────────────────────────────────────────┘\n\n`;
      }
    } else {
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📅 **VISITES À VENIR**\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Aucune visite programmée.\n\n`;
    }
    
    if (passees && passees.length > 0) {
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📋 **HISTORIQUE DES VISITES** (${passees.length})\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      
      const periodiques = passees.filter(v => v.type_visite === 'Périodique');
      const reprises = passees.filter(v => v.type_visite === 'Reprise');
      const reclassements = passees.filter(v => v.type_visite === 'Reclassement');
      const embauches = passees.filter(v => v.type_visite === 'Embauche');
      
      if (periodiques.length > 0) {
        message += `┌─────────────────────────────────────────────────┐\n`;
        message += `│ 📅 VISITES PÉRIODIQUES (${periodiques.length})\n`;
        message += `├─────────────────────────────────────────────────┤\n`;
        for (const v of periodiques.slice(0, 10)) {
          message += `│ • ${this._formaterDate(v.date_visite, false)} : ${v.resultat || 'Non renseigné'}\n`;
        }
        if (periodiques.length > 10) {
          message += `│ • ... et ${periodiques.length - 10} autre(s)\n`;
        }
        message += `└─────────────────────────────────────────────────┘\n\n`;
      }
      
      if (reprises.length > 0) {
        message += `┌─────────────────────────────────────────────────┐\n`;
        message += `│ 🔄 VISITES DE REPRISE (${reprises.length})\n`;
        message += `├─────────────────────────────────────────────────┤\n`;
        for (const v of reprises.slice(0, 10)) {
          message += `│ • ${this._formaterDate(v.date_visite, false)} : ${v.resultat || 'Non renseigné'}\n`;
        }
        if (reprises.length > 10) {
          message += `│ • ... et ${reprises.length - 10} autre(s)\n`;
        }
        message += `└─────────────────────────────────────────────────┘\n\n`;
      }
      
      if (reclassements.length > 0) {
        message += `┌─────────────────────────────────────────────────┐\n`;
        message += `│ 📋 VISITES DE RECLASSEMENT (${reclassements.length})\n`;
        message += `├─────────────────────────────────────────────────┤\n`;
        for (const v of reclassements.slice(0, 10)) {
          message += `│ • ${this._formaterDate(v.date_visite, false)} : ${v.resultat || 'Non renseigné'}\n`;
        }
        if (reclassements.length > 10) {
          message += `│ • ... et ${reclassements.length - 10} autre(s)\n`;
        }
        message += `└─────────────────────────────────────────────────┘\n\n`;
      }
      
      if (embauches.length > 0) {
        message += `┌─────────────────────────────────────────────────┐\n`;
        message += `│ 🆕 VISITES D'EMBAUCHE (${embauches.length})\n`;
        message += `├─────────────────────────────────────────────────┤\n`;
        for (const v of embauches.slice(0, 10)) {
          message += `│ • ${this._formaterDate(v.date_visite, false)} : ${v.resultat || 'Non renseigné'}\n`;
        }
        if (embauches.length > 10) {
          message += `│ • ... et ${embauches.length - 10} autre(s)\n`;
        }
        message += `└─────────────────────────────────────────────────┘\n\n`;
      }
    } else {
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `📋 **HISTORIQUE DES VISITES**\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `Aucune visite passée enregistrée.\n\n`;
    }
    
    message += `💡 **Résumé** :\n`;
    message += `• ${prochaines?.length || 0} visite(s) à venir\n`;
    message += `• ${passees?.length || 0} visite(s) passée(s)`;
    
    return message;
  }

  // ✅ RÉPONSE POUR LES ACCIDENTS (AMÉLIORÉE AVEC TOUS LES DÉTAILS)
  reponseAccidents(data) {
    if (data.accidents.length === 0) {
      return `⚠️ **Aucun accident enregistré**

Vous n'avez aucun accident de travail dans votre dossier.

🛡️ **Continuez à travailler en sécurité !**

💡 N'oubliez pas de déclarer tout accident, même mineur, dans les plus brefs délais.`;
    }
    
    let message = `⚠️ **Vos accidents de travail**\n\n`;
    message += `📊 **Synthèse** :\n`;
    message += `   • Total : ${data.accidents.length} accident(s)\n`;
    message += `   • Jours d'arrêt : ${data.totalJoursArret} jour(s)\n\n`;
    message += `📋 **Détails** :\n\n`;
    
    data.accidents.forEach((a, i) => {
      message += `${i+1}. **${this._formaterDate(a.date_accident, false)}**\n`;
      
      if (a.heure_accident) {
        message += `   ⏰ Heure : ${a.heure_accident.substring(0,5)}\n`;
      }
      if (a.lieu_accident) {
        message += `   📍 Lieu : ${a.lieu_accident}\n`;
      }
      message += `   ⚠️ Gravité : ${a.gravite || 'Non définie'}\n`;
      if (a.jour_arret > 0) {
        message += `   📅 Arrêt : ${a.jour_arret} jour(s)\n`;
      } else {
        message += `   ✅ Pas d'arrêt de travail\n`;
      }
      if (a.nature_blessures) {
        message += `   🩺 Blessures : ${a.nature_blessures}\n`;
      }
      if (a.endroit_blessures) {
        message += `   📍 Blessures localisées : ${a.endroit_blessures}\n`;
      }
      if (a.condition_accident) {
        const condition = a.condition_accident.length > 100 ? a.condition_accident.substring(0, 100) + '...' : a.condition_accident;
        message += `   📋 Conditions : ${condition}\n`;
      }
      if (a.temoin1 || a.temoin2) {
        const temoins = [a.temoin1, a.temoin2].filter(t => t).join(', ');
        message += `   👥 Témoins : ${temoins}\n`;
      }
      if (a.pv_existe) {
        message += `   📄 PV n°${a.numero_pv || 'Non précisé'}`;
        if (a.date_pv) message += ` du ${this._formaterDate(a.date_pv, false)}`;
        message += `\n`;
      }
      if (a.tiers_responsable) {
        message += `   🚗 Tiers responsable : ${a.nom_tiers || 'Oui'}\n`;
      }
      if (a.facteurs_materiels) {
        const facteurs = a.facteurs_materiels.length > 100 ? a.facteurs_materiels.substring(0, 100) + '...' : a.facteurs_materiels;
        message += `   🔧 Facteurs matériels : ${facteurs}\n`;
      }
      if (a.mode_survenue) {
        const mode = a.mode_survenue.length > 100 ? a.mode_survenue.substring(0, 100) + '...' : a.mode_survenue;
        message += `   📝 Mode de survenue : ${mode}\n`;
      }
      message += `\n`;
    });
    
    message += `💡 **Conseil** : Signalez tout nouvel accident immédiatement à votre supérieur.`;
    
    return message;
  }

  reponseAptitude(data) {
    if (data.inaptitudeStatus && data.inaptitudeStatus.estEnCours) {
      return `🏥 **Statut d'aptitude** : ⚠️ Inapte temporaire

📅 **Début** : ${this._formaterDate(data.inaptitudeStatus.dateDebut, false)}
📅 **Fin prévue** : ${this._formaterDate(data.inaptitudeStatus.dateFin)}
⏱️ **Jours restants** : ${data.inaptitudeStatus.joursRestants} jours

📋 Une visite de reprise sera programmée automatiquement avant votre retour.

💡 **Conseil** : Suivez bien les recommandations de votre médecin.`;
    }
    
    const derniereVisite = data.derniereParType['Périodique'] || data.derniereParType['Reprise'];
    return `🏥 **Statut d'aptitude** : ✅ Apte

Vous êtes actuellement apte à votre poste de travail.

📅 **Dernière visite** : ${this._formaterDate(derniereVisite?.date_visite, false) || 'Non renseignée'}
📋 **Résultat** : ${derniereVisite?.resultat || 'Apte'}

👍 Continuez à respecter les consignes de sécurité.`;
  }

  reponseStatistiques(data) {
    const visites6Mois = data.visitesRecentes.length;
    const aptes = data.toutesVisites.filter(v => v.resultat === 'Apte').length;
    const inaptes = data.toutesVisites.filter(v => v.resultat && v.resultat.includes('Inapte')).length;
    
    let message = `📊 **Vos statistiques personnelles**\n\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `📅 **VISITES MÉDICALES**\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `• Total visites : ${data.toutesVisites.length}\n`;
    message += `• 6 derniers mois : ${visites6Mois}\n`;
    message += `• Visites aptes : ${aptes}\n`;
    message += `• Visites inaptes : ${inaptes}\n\n`;
    
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `⚠️ **ACCIDENTS**\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `• Total accidents : ${data.accidents.length}\n`;
    message += `• Jours d'arrêt : ${data.totalJoursArret}\n\n`;
    
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    message += `👤 **PROCHAINE VISITE**\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    const prochaine = data.toutesProchainesVisites[0];
    if (prochaine) {
      message += `• Date : ${this._formaterDate(prochaine.date_visite)}\n`;
      message += `• Type : ${prochaine.type_visite}\n`;
    } else {
      message += `• Aucune visite programmée\n`;
    }
    
    return message;
  }

  // ========== RÉPONSE POUR LES QUESTIONS "POURQUOI" (IA AMÉLIORÉE) ==========
  async reponseExplication(question, agentData) {
    if (this.useAI && process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith('local')) {
      try {
        let context = this.buildRichContext(agentData);
        
        if (agentData.prochainesParType['Périodique']) {
          const prochaine = agentData.prochainesParType['Périodique'];
          const derniere = agentData.derniereParType['Périodique'];
          const periodicite = agentData.periodicite;
          
          context += `\n=== QUESTION SPÉCIFIQUE SUR LA DATE ===\n`;
          context += `L'agent demande: "${question}"\n`;
          context += `Sa prochaine visite est le ${moment(prochaine.date_visite).format('dddd DD MMMM YYYY')}\n`;
          if (derniere) {
            context += `Sa dernière visite était le ${moment(derniere.date_visite).format('dddd DD MMMM YYYY')}\n`;
            context += `La périodicité est de ${periodicite}\n`;
            context += `Le calcul: ${moment(derniere.date_visite).format('DD/MM/YYYY')} + ${periodicite} = ${moment(prochaine.date_visite).format('DD/MM/YYYY')}\n`;
          }
          context += `L'agent est ${agentData.estChauffeur ? 'chauffeur' : 'contrôleur'}, ce qui justifie cette périodicité.\n`;
        }
        
        const reponseIA = await this.circuitBreaker.call(
          () => this.callAI(question, context, agentData),
          () => this.reponseExplicationDetaillee(question, agentData)
        );
        return reponseIA;
      } catch (error) {
        console.error('Erreur IA:', error.message);
        return this.reponseExplicationDetaillee(question, agentData);
      }
    } else {
      return this.reponseExplicationDetaillee(question, agentData);
    }
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

**FORMAT DE RÉPONSE - IMPORTANT** :
- Réponse de 8 à 15 lignes minimum
- Structure avec des titres en **gras** (ex: **Calcul :**, **Raison :**)
- Utilise des émojis pertinents (📅, ⚠️, 👤, 🏥, ✅, ❌, 💡)
- Inclus le calcul détaillé si la question concerne une date
- Termine par un conseil pratique ou une recommandation

**CONTEXTE DE L'AGENT** :
${context}

Réponds à la question de l'agent de manière complète, détaillée et personnalisée.`;

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
      throw error;
    }
  }

  // Version détaillée du fallback pour les questions "pourquoi"
    // ✅ MODIFICATION 13 : Version courte et professionnelle
  reponseExplicationDetaillee(question, agentData) {
    const q = question.toLowerCase();
    
    // Questions sur la date de la prochaine visite
    if ((q.includes('visite') || q.includes('date')) && 
        (q.includes('pourquoi') || q.includes('raison') || q.includes('pour quelle'))) {
      
      const prochaine = agentData.prochainesParType['Périodique'];
      if (prochaine) {
        const derniereVisite = agentData.derniereParType['Périodique'];
        const periodicite = agentData.periodiciteJours;
        const estChauffeur = agentData.estChauffeur;
        
        let reponse = `🔍 **POURQUOI VOTRE PROCHAINE VISITE EST LE ${this._formaterDate(prochaine.date_visite, false)} ?**\n\n`;
        reponse += `**Raison :** Calcul automatique basé sur votre historique médical.\n\n`;
        reponse += `• **Dernière visite** : ${this._formaterDate(derniereVisite?.date_visite, false) || 'Non renseignée'}\n`;
        reponse += `• **Votre poste** : ${estChauffeur ? 'Chauffeur' : 'Contrôleur'} → périodicité ${periodicite} jours\n`;
        reponse += `• **Calcul** : ${this._formaterDate(derniereVisite?.date_visite, false)} + ${periodicite} jours = ${this._formaterDate(prochaine.date_visite, false)}\n\n`;
        reponse += `📌 **Règle SRTB** : Les ${estChauffeur ? 'chauffeurs ont une visite tous les 6 mois' : 'contrôleurs ont une visite tous les 1 an'}.\n\n`;
        reponse += `💡 **Si cette date ne vous convient pas** : Contactez le service HSE au 71 123 456 pour reprogrammer.`;
        
        return reponse;
      }
    }
    
    // Questions sur les accidents
    if (q.includes('accident')) {
      return `🔍 **POURQUOI CETTE DATE ?**\n\n` +
             `📊 **Vos accidents** : ${agentData.accidents.length} accident(s), ${agentData.totalJoursArret} jours d'arrêt.\n\n` +
             `💡 Pour plus de détails, demandez "mes accidents".`;
    }
    
    // Questions sur l'inaptitude
    if (q.includes('inaptitude') || q.includes('inapte')) {
      if (agentData.inaptitudeStatus?.estEnCours) {
        return `🔍 **POURQUOI CETTE PÉRIODE D'INAPTITUDE ?**\n\n` +
               `📅 **Début** : ${this._formaterDate(agentData.inaptitudeStatus.dateDebut, false)}\n` +
               `📅 **Fin** : ${this._formaterDate(agentData.inaptitudeStatus.dateFin, false)}\n` +
               `⏱️ **Jours restants** : ${agentData.inaptitudeStatus.joursRestants}\n\n` +
               `**Raison** : Période définie par le médecin du travail lors de votre dernière visite.\n\n` +
               `💡 Une visite de reprise sera programmée automatiquement avant la fin.`;
      }
    }
    
    // Réponse par défaut courte
    return `🔍 **POURQUOI ?**\n\n` +
           `Je peux vous expliquer :\n` +
           `• "Pourquoi ma prochaine visite est le [date] ?" → Calcul basé sur votre dernière visite + périodicité\n` +
           `• "Pourquoi suis-je en inaptitude ?" → Période définie par le médecin\n` +
           `• "Pourquoi j'ai eu autant d'accidents ?" → Historique détaillé\n\n` +
           `💡 Pour une réponse précise, formulez une question complète.`;
  }

  // ========== GRAPHIQUES ==========
  async genererGraphique(question, agentData) {
    const q = question.toLowerCase();
    
    if (q.includes('accident') || q.includes('évolution')) {
      const accidentsParMois = agentData.accidentsParMois;
      const total = agentData.accidents.length;
      const moisMax = accidentsParMois.indexOf(Math.max(...accidentsParMois));
      const moisNoms = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
      
      return `📊 **Évolution de vos accidents**

${this.genererBarChartAscii(accidentsParMois)}

Total : ${total} accident(s) | Max : ${moisNoms[moisMax]} (${accidentsParMois[moisMax]}) | Tendance : ${this.analyserTendance(accidentsParMois)}`;
    }
    
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
      
      const difference = agentData.accidents.length - moyennePoste;
      
      if (agentData.accidents.length > moyennePoste) {
        return `⚠️ Vous avez ${Math.abs(Math.round(difference))} accident(s) de plus que la moyenne (${moyennePoste}).`;
      } else if (agentData.accidents.length < moyennePoste) {
        return `✅ Vous avez ${Math.abs(Math.round(difference))} accident(s) de moins que la moyenne (${moyennePoste}). Bravo !`;
      } else {
        return `📊 Vous êtes dans la moyenne (${moyennePoste} accident(s)).`;
      }
    }
    
    return `📈 Demandez "graphique de mes accidents" pour voir l'évolution.`;
  }

  genererBarChartAscii(data) {
    const max = Math.max(...data, 1);
    const height = 8;
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
    chart += ' J  F  M  A  M  J  J  A  S  O  N  D';
    
    return chart;
  }

  genererBarChartComparison(vous, moyenne) {
    const max = Math.max(vous, moyenne, 1);
    const height = 10;
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
      return '📈 En hausse ⚠️';
    } else if (dernierTrimestre < trimestrePrecedent) {
      return '📉 En baisse ✅';
    } else {
      return '➡️ Stable';
    }
  }

  // ========== COMPARAISONS ==========
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
    
    const moyenneAccidents = matricules.length > 0 ? (tousAccidents.length / matricules.length).toFixed(1) : 0;
    const difference = data.accidents.length - moyenneAccidents;
    
    if (data.accidents.length > moyenneAccidents) {
      return `⚠️ ${Math.abs(Math.round(difference))} accident(s) de plus que la moyenne (${moyenneAccidents}).`;
    } else if (data.accidents.length < moyenneAccidents) {
      return `✅ ${Math.abs(Math.round(difference))} accident(s) de moins que la moyenne (${moyenneAccidents}). Bravo !`;
    } else {
      return `📊 Vous êtes dans la moyenne (${moyenneAccidents} accident(s)).`;
    }
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
            date_visite: { [Op.gte]: moment().subtract(6, 'months').format('YYYY-MM-DD') }
          } 
        });
      })
    );
    
    const moyenneVisites = visitesParAgent.length > 0 ? (visitesParAgent.reduce((a, b) => a + b, 0) / visitesParAgent.length).toFixed(1) : 0;
    const votreNombre = data.visitesRecentes?.length || 0;
    
    if (votreNombre > moyenneVisites) {
      return `✅ ${Math.round(votreNombre - moyenneVisites)} visite(s) de plus que la moyenne.`;
    } else if (votreNombre < moyenneVisites) {
      return `⚠️ ${Math.round(moyenneVisites - votreNombre)} visite(s) de moins que la moyenne.`;
    } else {
      return `📊 Vous êtes dans la moyenne.`;
    }
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
    
    return `${data.inaptitudeStatus?.estEnCours ? '⚠️ Inapte temporaire' : '✅ Apte'} | ${pourcentage}% des collègues en inaptitude.`;
  }

  async statsGenerales(data) {
    return `📊 Visites : ${data.toutesVisites.length} | Accidents : ${data.accidents.length} (${data.totalJoursArret}j) | Prochaine : ${data.toutesProchainesVisites[0] ? this._formaterDate(data.toutesProchainesVisites[0].date_visite, false) : 'Aucune'}`;
  }

  // ========== RECHERCHE AVANCÉE ==========
  async rechercheAvancee(question, data) {
    const q = question.toLowerCase();
    const dateMatch = q.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    
    if (dateMatch) {
      const date = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`;
      const accidents = data.accidents.filter(a => a.date_accident === date);
      const visites = data.visitesRecentes.filter(v => v.date_visite === date);
      
      if (accidents.length > 0) {
        return `⚠️ Accident du ${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]} : ${accidents[0].gravite || '?'}${accidents[0].jour_arret > 0 ? ` (${accidents[0].jour_arret}j arrêt)` : ''}`;
      }
      if (visites.length > 0) {
        return `📋 Visite du ${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]} : ${visites[0].type_visite} - ${visites[0].resultat || '?'}`;
      }
      return `🔍 Aucun résultat pour le ${dateMatch[1]}/${dateMatch[2]}/${dateMatch[3]}.`;
    }
    
    return `🔍 Recherche par date : "trouve mes visites du 15/03/2026"`;
  }

  // ========== GÉNÉRATION DE DOCUMENTS PROFESSIONNELS (OPTION 3) ==========

  async formatDocumentGeneration(question, agentData) {
    const q = question.toLowerCase();
    
    if (q.includes('certificat') || (q.includes('aptitude') && q.includes('générer'))) {
      return await this.genererCertificatProfessionnel(agentData);
    }
    
    if (q.includes('déclaration') || (q.includes('accident') && q.includes('générer'))) {
      return await this.genererDeclarationProfessionnelle(agentData);
    }
    
    if (q.includes('convocation') || q.includes('rappel')) {
      return await this.genererConvocationProfessionnelle(agentData);
    }
    
    if (q.includes('bilan') || q.includes('annuel')) {
      return await this.genererBilanProfessionnel(agentData);
    }
    
    if (q.includes('export') || q.includes('complet') || q.includes('tous')) {
      return await this.genererExportCompletProfessionnel(agentData);
    }
    
    return this.formatAideDocumentsProfessionnelle();
  }

  formatAideDocumentsProfessionnelle() {
    return `📄 **GÉNÉRATION DE DOCUMENTS OFFICIELS**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• **Certificat médical d'aptitude**
  → "génère mon certificat"

• **Convocation à visite médicale**
  → "génère ma convocation"

• **Déclaration d'accident de travail**
  → "génère ma déclaration"

• **Bilan annuel de santé**
  → "génère mon bilan"

• **Export complet du dossier médical**
  → "exporte tous mes documents"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 Les documents officiels s'affichent directement dans la conversation.
   Vous pouvez les copier ou en faire une capture d'écran.`;
  }

  async genererCertificatProfessionnel(agentData) {
    if (!agentData.derniereParType['Périodique'] && !agentData.derniereParType['Reprise']) {
      return `⚠️ **Impossible de générer le certificat**

Aucune visite médicale n'a été enregistrée dans votre dossier.

📋 Veuillez contacter le service HSE pour planifier votre première visite.`;
    }
    
    const derniere = agentData.derniereParType['Périodique'] || agentData.derniereParType['Reprise'];
    const dateProchaine = agentData.prochainesParType['Périodique'] ? 
      this._formaterDate(agentData.prochainesParType['Périodique'].date_visite, false) : 'Non programmée';
    const periodiciteJours = agentData.periodiciteJours;
    const dateExpiration = moment(derniere.date_visite).add(periodiciteJours, 'days').format('DD/MM/YYYY');
    
    return `┌─────────────────────────────────────────────────────────────────┐
│                  SRTB - SERVICE HSE                                  │
│         Société Régionale de Transport de Bizerte                    │
│              Infirmerie Médicale du Travail                          │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                    **CERTIFICAT MÉDICAL D'APTITUDE**
                          N° ${moment().format('YYYYMMDD')}-${agentData.agent.matricule_agent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**IDENTIFICATION DE L'AGENT**

Nom complet  : ${agentData.agent.nom} ${agentData.agent.prenom}
Matricule    : ${agentData.agent.matricule_agent}
Poste occupé : ${agentData.estChauffeur ? 'Chauffeur professionnel' : 'Agent de contrôle'}
Agence       : ${agentData.agence?.nom_agence || 'Non définie'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**RÉSULTAT DE LA DERNIÈRE VISITE MÉDICALE**

Date de la visite : ${this._formaterDate(derniere.date_visite)}
Type de visite    : ${derniere.type_visite}
Médecin traitant  : ${derniere.medecin || 'Dr. Mahmoud Khelifi'}
Résultat          : **${derniere.resultat || 'Apte'}**
${derniere.observation ? `Observations     : ${derniere.observation}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**VALIDITÉ DU CERTIFICAT**

✓ Le présent certificat est valable jusqu'au **${dateExpiration}**
✓ Prochaine visite obligatoire : **${dateProchaine}**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**SIGNATURES**

Fait à Bizerte, le ${moment().format('DD/MM/YYYY')}

Le Médecin du travail                    Le Chef du Service HSE
Dr. Mahmoud Khelifi                      Signature électronique

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*Document officiel - Seule une version papier signée fait foi*
*Ce document a été généré électroniquement le ${moment().format('DD/MM/YYYY à HH:mm')}`;
  }

  async genererConvocationProfessionnelle(agentData) {
    const prochaine = agentData.toutesProchainesVisites[0];
    if (!prochaine) {
      return `📅 **Aucune visite programmée**

Vous n'avez actuellement aucune visite médicale prévue dans le système.

💡 Pour toute question, contactez le service HSE au 71 123 456.`;
    }
    
    const dateFormatted = this._formaterDate(prochaine.date_visite);
    const heureFormatted = this._formaterHeure(prochaine.heure_visite);
    
    return `┌─────────────────────────────────────────────────────────────────┐
│                  SRTB - SERVICE HSE                                  │
│         Société Régionale de Transport de Bizerte                    │
│              Infirmerie Médicale du Travail                          │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                      **CONVOCATION À VISITE MÉDICALE**
                          N° ${moment().format('YYYYMMDD')}-${agentData.agent.matricule_agent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**IDENTIFICATION DE L'AGENT**

Nom complet  : ${agentData.agent.nom} ${agentData.agent.prenom}
Matricule    : ${agentData.agent.matricule_agent}
Poste occupé : ${agentData.estChauffeur ? 'Chauffeur professionnel' : 'Agent de contrôle'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**DÉTAILS DE LA VISITE**

Date et heure : **${dateFormatted} à ${heureFormatted}**
Type de visite : ${prochaine.type_visite}
Lieu          : Infirmerie SRTB - Bizerte
Médecin       : Dr. Mahmoud Khelifi

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**INSTRUCTIONS IMPORTANTES**

1. Veuillez vous présenter **15 minutes avant** l'heure prévue
2. Munissez-vous de votre **carte d'identité nationale**
3. Apportez vos **lunettes de vue** si vous en portez
4. Signalez tout traitement médical en cours au médecin

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**EN CAS D'EMPÊCHEMENT**

Toute absence non justifiée sera signalée à votre hiérarchie.
Pour modifier ou annuler ce rendez-vous, contactez :

📞 Service HSE : 71 123 456
📧 Email : hse@srtb.tn

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**SIGNATURES**

Fait à Bizerte, le ${moment().format('DD/MM/YYYY')}

Le Médecin du travail                    Le Chef du Service HSE
Dr. Mahmoud Khelifi                      Signature électronique

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*Convocation officielle - À présenter le jour de la visite*
*Document généré électroniquement le ${moment().format('DD/MM/YYYY à HH:mm')}`;
  }

  async genererDeclarationProfessionnelle(agentData) {
    if (!agentData.accidents || agentData.accidents.length === 0) {
      return `⚠️ **Aucun accident enregistré**

Vous ne déclarez aucun accident de travail dans votre dossier.

💡 En cas d'accident, veuillez le déclarer immédiatement à votre supérieur.`;
    }
    
    const accident = agentData.accidents[0];
    
    return `┌─────────────────────────────────────────────────────────────────┐
│                  SRTB - SERVICE HSE                                  │
│         Société Régionale de Transport de Bizerte                    │
│              Déclaration d'Accident de Travail                       │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                 **DÉCLARATION D'ACCIDENT DE TRAVAIL**
                          N° ${accident.numero_accident || `ACC-${moment().format('YYYYMMDD')}`}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**IDENTIFICATION DE L'AGENT**

Nom complet  : ${agentData.agent.nom} ${agentData.agent.prenom}
Matricule    : ${agentData.agent.matricule_agent}
Poste occupé : ${agentData.estChauffeur ? 'Chauffeur professionnel' : 'Agent de contrôle'}
Agence       : ${agentData.agence?.nom_agence || 'Non définie'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**CIRCONSTANCES DE L'ACCIDENT**

Date de l'accident    : ${this._formaterDate(accident.date_accident)}
Heure                 : ${accident.heure_accident?.substring(0,5) || 'Non renseignée'}
Lieu précis           : ${accident.lieu_accident || 'Non renseigné'}
Gravité estimée       : ${accident.gravite || 'Non définie'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**CONSÉQUENCES MÉDICALES**

Nature des blessures  : ${accident.nature_blessures || 'Non renseignée'}
Localisation          : ${accident.endroit_blessures || 'Non renseignée'}
Durée d'arrêt         : ${accident.jour_arret || 0} jour(s)

Conditions de l'accident : ${accident.condition_accident || 'Non renseignées'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**INFORMATIONS COMPLÉMENTAIRES**

${accident.temoin1 ? `Témoin(s) : ${accident.temoin1}${accident.temoin2 ? `, ${accident.temoin2}` : ''}` : 'Aucun témoin déclaré'}
${accident.pv_existe ? `Procès-verbal n° : ${accident.numero_pv || 'Non précisé'} du ${accident.date_pv ? this._formaterDate(accident.date_pv, false) : 'Non daté'}` : 'Aucun procès-verbal établi'}
${accident.tiers_responsable ? `Tiers responsable : ${accident.nom_tiers || 'Oui'}` : 'Aucun tiers responsable identifié'}
${accident.facteurs_materiels ? `Facteurs matériels : ${accident.facteurs_materiels.substring(0, 150)}${accident.facteurs_materiels.length > 150 ? '...' : ''}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**SIGNATURES**

Fait à Bizerte, le ${moment().format('DD/MM/YYYY')}

L'agent déclarant                      Le Chef du Service HSE
${agentData.agent.nom} ${agentData.agent.prenom}                    Signature électronique

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*Déclaration officielle - À transmettre à la CNAM dans les 48h*
*Document généré électroniquement le ${moment().format('DD/MM/YYYY à HH:mm')}`;
  }

  async genererBilanProfessionnel(agentData) {
    const annee = new Date().getFullYear();
    const visitesCetteAnnee = agentData.toutesVisites.filter(v => moment(v.date_visite).year() === annee);
    const accidentsCetteAnnee = agentData.accidents.filter(a => moment(a.date_accident).year() === annee);
    const totalJoursArretAnnee = accidentsCetteAnnee.reduce((sum, a) => sum + (a.jour_arret || 0), 0);
    
    const visitesParType = {
      periodiques: agentData.toutesVisites.filter(v => v.type_visite === 'Périodique').length,
      reprises: agentData.toutesVisites.filter(v => v.type_visite === 'Reprise').length,
      reclassements: agentData.toutesVisites.filter(v => v.type_visite === 'Reclassement').length,
      embauches: agentData.toutesVisites.filter(v => v.type_visite === 'Embauche').length
    };
    
    const resultatsParType = {
      aptes: agentData.toutesVisites.filter(v => v.resultat === 'Apte').length,
      reserves: agentData.toutesVisites.filter(v => v.resultat === 'Apte avec réserves').length,
      inaptesTemp: agentData.toutesVisites.filter(v => v.resultat === 'Inapte temporaire').length,
      inaptesDef: agentData.toutesVisites.filter(v => v.resultat === 'Inapte définitif').length
    };
    
    return `┌─────────────────────────────────────────────────────────────────┐
│                  SRTB - SERVICE HSE                                  │
│         Société Régionale de Transport de Bizerte                    │
│                    Suivi Médical Annuel                              │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                    **BILAN ANNUEL DE SANTÉ ${annee}**
                    Période du 01/01/${annee} au 31/12/${annee}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**IDENTIFICATION DE L'AGENT**

Nom complet      : ${agentData.agent.nom} ${agentData.agent.prenom}
Matricule        : ${agentData.agent.matricule_agent}
Poste            : ${agentData.estChauffeur ? 'Chauffeur professionnel' : 'Agent de contrôle'}
Agence           : ${agentData.agence?.nom_agence || 'Non définie'}
Statut actuel    : ${agentData.agent.statut === 'actif' ? 'Actif' : agentData.agent.statut}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**STATISTIQUES DES VISITES MÉDICALES**

┌─────────────────────────────────────────────────────────────────────┐
│ Total des visites (${annee})          : ${visitesCetteAnnee.length} visite(s)          │
│ Visites périodiques                   : ${visitesParType.periodiques}                   │
│ Visites de reprise                    : ${visitesParType.reprises}                    │
│ Visites de reclassement               : ${visitesParType.reclassements}               │
│ Visites d'embauche                    : ${visitesParType.embauches}                    │
├─────────────────────────────────────────────────────────────────────┤
│ Résultats favorables (Apte)           : ${resultatsParType.aptes}                      │
│ Résultats avec réserves               : ${resultatsParType.reserves}                   │
│ Inaptitudes temporaires               : ${resultatsParType.inaptesTemp}               │
│ Inaptitudes définitives               : ${resultatsParType.inaptesDef}                │
└─────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**STATISTIQUES DES ACCIDENTS DE TRAVAIL**

┌─────────────────────────────────────────────────────────────────────┐
│ Total des accidents (${annee})        : ${accidentsCetteAnnee.length} accident(s)        │
│ Total des jours d'arrêt              : ${totalJoursArretAnnee} jour(s)                 │
└─────────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**PROCHAINES ÉCHÉANCES**

• Prochaine visite obligatoire : ${agentData.toutesProchainesVisites[0] ? this._formaterDate(agentData.toutesProchainesVisites[0].date_visite, false) : 'À programmer'}
• Périodicité médicale : ${agentData.periodicite}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**CONCLUSION**

Le présent bilan atteste que l'agent a satisfait à ses obligations médicales
pour l'année ${annee} conformément à la réglementation en vigueur.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**SIGNATURES**

Fait à Bizerte, le ${moment().format('DD/MM/YYYY')}

Le Médecin du travail                    Le Chef du Service HSE
Dr. Mahmoud Khelifi                      Signature électronique

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*Document officiel - Bilan annuel de santé*
*Généré le ${moment().format('DD/MM/YYYY à HH:mm')}`;
  }

  async genererExportCompletProfessionnel(agentData) {
    const dateExport = moment().format('DD/MM/YYYY à HH:mm');
    
    return `┌─────────────────────────────────────────────────────────────────┐
│                  SRTB - SERVICE HSE                                  │
│         Société Régionale de Transport de Bizerte                    │
│                 Dossier Médical Complet                              │
└─────────────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                  **EXPORT COMPLET DU DOSSIER MÉDICAL**
                          N° EXP-${moment().format('YYYYMMDD')}-${agentData.agent.matricule_agent}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**IDENTIFICATION COMPLÈTE DE L'AGENT**

Nom complet       : ${agentData.agent.nom} ${agentData.agent.prenom}
Matricule         : ${agentData.agent.matricule_agent}
Date de naissance : ${this._formaterDate(agentData.agent.date_naissance, false) || 'Non renseignée'}
Poste             : ${agentData.estChauffeur ? 'Chauffeur professionnel' : 'Agent de contrôle'}
Agence            : ${agentData.agence?.nom_agence || 'Non définie'}
Statut            : ${agentData.agent.statut === 'actif' ? 'Actif' : agentData.agent.statut}
Date d'embauche   : ${agentData.agent.date_embauche ? this._formaterDate(agentData.agent.date_embauche, false) : 'Non renseignée'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**HISTORIQUE COMPLET DES VISITES MÉDICALES**

┌─────────────────────────────────────────────────────────────────────┐
│ Total des visites : ${agentData.toutesVisites.length}                                      │
│ Dernière visite   : ${agentData.derniereParType['Périodique'] ? this._formaterDate(agentData.derniereParType['Périodique'].date_visite, false) : 'Aucune'}      │
│ Prochaine visite  : ${agentData.toutesProchainesVisites[0] ? this._formaterDate(agentData.toutesProchainesVisites[0].date_visite, false) : 'Non programmée'}    │
└─────────────────────────────────────────────────────────────────────┘

${agentData.toutesVisites.map((v, i) => {
  return `${i+1}. ${this._formaterDate(v.date_visite, false)} | ${v.type_visite} | ${v.resultat || 'Non renseigné'}${v.medecin ? ` | Dr. ${v.medecin}` : ''}`;
}).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**HISTORIQUE COMPLET DES ACCIDENTS DE TRAVAIL**

┌─────────────────────────────────────────────────────────────────────┐
│ Total des accidents : ${agentData.accidents.length}                                     │
│ Total jours d'arrêt : ${agentData.totalJoursArret}                                     │
└─────────────────────────────────────────────────────────────────────┘

${agentData.accidents.map((a, i) => {
  return `${i+1}. ${this._formaterDate(a.date_accident, false)} | ${a.gravite || 'Gravité non définie'} | ${a.jour_arret || 0} jours d'arrêt${a.lieu_accident ? ` | Lieu : ${a.lieu_accident}` : ''}`;
}).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**INFORMATIONS MÉDICALES COMPLÉMENTAIRES**

Périodicité médicale        : ${agentData.periodicite}
Statut d'inaptitude         : ${agentData.inaptitudeStatus?.estEnCours ? `Oui (jusqu'au ${this._formaterDate(agentData.inaptitudeStatus.dateFin, false)})` : 'Non'}
${agentData.inaptitudeStatus?.estEnCours ? `Jours restants : ${agentData.inaptitudeStatus.joursRestants}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**MENTIONS LÉGALES**

Conformément à la réglementation en vigueur, le présent document atteste
du suivi médical de l'agent au sein de la SRTB.

Ce document est confidentiel et destiné exclusivement à l'usage du service
médical et de l'agent concerné.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**SIGNATURES**

Fait à Bizerte, le ${moment().format('DD/MM/YYYY')}

Le Médecin du travail                    Le Chef du Service HSE
Dr. Mahmoud Khelifi                      Signature électronique

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

*Export officiel du dossier médical*
*Généré le ${dateExport}
*Document confidentiel - Ne pas diffuser*`;
  }

  // ========== RÉPONSE DÉFAUT ET AIDE ==========

  formatAide() {
    return `🤖 **AIDE**

📅 Visites : "prochaine visite", "historique", "visites futures"
⚠️ Accidents : "mes accidents", "détails accidents"
👤 Infos : "mes informations", "mon poste", "mon agence"
📄 Documents : "génère mon certificat", "génère ma convocation"
❓ Pourquoi : "pourquoi ma visite est le 10 juin ?"
🔄 Reprogrammation : "je peux pas aller le 10 juin"
📋 Types : "différence entre les 4 types de visites"
🚨 Accident avant visite : "que faire si j'ai un accident avant ma visite"`;
  }

  formatDefault(data) {
    return `👋 Bonjour ${data.agent.prenom || 'cher agent'} !

Questions possibles :
• "Mes informations"
• "Prochaine visite"
• "Historique de mes visites"
• "Mes accidents"
• "Différence entre les 4 types de visites"
• "Génère mon certificat"
• "Que faire si j'ai un accident avant ma visite ?"

💡 Dites "aide" pour plus d'options.`;
  }

  // ✅ MODIFICATION 6 : MÉTHODE reponseContact
  reponseContact(agentData) {
    return `📞 **CONTACT SERVICE HSE SRTB**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Téléphone** : 71 123 456
**Email** : hse@srtb.tn
**Horaires** : Lundi - Vendredi, 8h00 - 16h00

**Adresse** : Infirmerie Médicale du Travail
             SRTB - Bizerte

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Motif de contact** :

| Besoin | Action |
|--------|--------|
| Reprogrammer visite | Appeler le 71 123 456 |
| Question médicale | Email à hse@srtb.tn |
| Documents | Via l'application |
| Urgence médicale | Contacter votre médecin traitant |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Pour toute question, n'hésitez pas à nous contacter.`;
  }

  // ✅ MODIFICATION 7 : MÉTHODE reponsePourquoiTypeVisite
  reponsePourquoiTypeVisite(question, agentData) {
    const q = question.toLowerCase();
    const estChauffeur = agentData.estChauffeur;
    
    let type = null;
    if (q.includes('periodique')) type = 'Périodique';
    else if (q.includes('reprise')) type = 'Reprise';
    else if (q.includes('reclassement')) type = 'Reclassement';
    else if (q.includes('embauche')) type = 'Embauche';
    
    const explications = {
      'Périodique': {
        titre: 'VISITE PÉRIODIQUE',
        raison: `En tant que ${estChauffeur ? 'chauffeur professionnel' : 'agent de contrôle'}, la réglementation vous impose une visite médicale ${estChauffeur ? 'tous les 6 mois' : 'tous les 1 an'}.`,
        regle: `Article R. 4624-16 du Code du travail : "Les travailleurs bénéficient d'un suivi médical individuel dont la périodicité est adaptée à leur poste."`,
        pourquoi: `Pour les conducteurs professionnels, une surveillance médicale renforcée est obligatoire (arrêté du 21/12/2005).`
      },
      'Reprise': {
        titre: 'VISITE DE REPRISE',
        raison: `Vous avez eu un arrêt de travail de moins de 30 jours. La loi impose une visite médicale de reprise avant votre retour.`,
        regle: `Article R. 4624-22 du Code du travail : "Une visite de reprise est obligatoire après un arrêt d'au moins 30 jours."`,
        pourquoi: `Cette visite vérifie que vous êtes apte à reprendre votre poste en toute sécurité.`
      },
      'Reclassement': {
        titre: 'VISITE DE RECLASSEMENT',
        raison: `Votre arrêt a dépassé 30 jours ou votre médecin a émis un avis d'inaptitude partielle.`,
        regle: `Article R. 4624-31 du Code du travail : "Le médecin du travail peut proposer un reclassement si l'agent n'est plus apte à son poste."`,
        pourquoi: `Pour évaluer votre capacité à occuper un autre poste adapté à votre état de santé.`
      },
      'Embauche': {
        titre: "VISITE D'EMBAUCHE",
        raison: `Vous êtes un nouvel agent SRTB. La visite médicale d'embauche est obligatoire avant votre prise de poste.`,
        regle: `Article R. 4624-10 du Code du travail : "Tout nouvel embauché bénéficie d'une visite d'information et de prévention."`,
        pourquoi: `Pour s'assurer que vous êtes apte au poste et vous informer sur les risques professionnels.`
      }
    };
    
    const explication = explications[type] || explications['Périodique'];
    
    let reponse = `🔍 **POURQUOI CETTE ${explication.titre} ?**\n\n`;
    reponse += `📌 **Raison** : ${explication.raison}\n\n`;
    reponse += `⚖️ **Fondement réglementaire** : ${explication.regle}\n\n`;
    reponse += `📖 **Explication** : ${explication.pourquoi}\n\n`;
    reponse += `💡 **Dans votre cas** : ${estChauffeur ? 'Vous êtes chauffeur, donc visite tous les 6 mois.' : 'Vous êtes contrôleur, donc visite tous les 1 an.'}`;
    
    return reponse;
  }

  // ========== MÉTHODE PRINCIPALE ==========

  async processMessage(message, userId, matricule) {
    const startTime = Date.now();
    
    // ✅ 1. Sanitization des entrées
    const sanitizedMessage = this._sanitizeInput(message);
    if (!sanitizedMessage) {
      return {
        reponse: "❌ Message vide ou invalide.",
        intention: 'error',
        conversation_id: null
      };
    }
    
    // ✅ 2. Rate Limiting
    const rateCheck = this.rateLimiter.isAllowed(userId);
    if (!rateCheck.allowed) {
      console.log(`⚠️ Rate limit exceeded for user ${userId}`);
      return {
        reponse: `⚠️ Trop de demandes. Patientez ${rateCheck.waitTime}s.`,
        intention: 'rate_limited',
        conversation_id: null
      };
    }
    
    // ✅ 3. Validation du matricule
    if (!this._validateMatricule(matricule)) {
      console.log(`❌ Matricule invalide: ${matricule}`);
      return {
        reponse: "❌ Numéro d'agent invalide.",
        intention: 'error',
        conversation_id: null
      };
    }
    
    console.log(`💬 Traitement: "${sanitizedMessage}" pour agent ${matricule}`);
    
    // ✅ 4. Récupération des données (avec cache)
    const agentData = await this.getAgentCompleteData(matricule);
    if (!agentData) {
      this.metrics.totalErrors++;
      return {
        reponse: "❌ Impossible de trouver vos informations.",
        intention: 'error',
        conversation_id: null
      };
    }
    
    // ✅ 5. Détection d'intention prioritaire
    const { intention, score } = this._detecterIntention(sanitizedMessage);
    const typeSpecifique = this._extraireTypeVisite(sanitizedMessage);
    const demandeDocument = sanitizedMessage.toLowerCase().includes('générer') || 
                           sanitizedMessage.toLowerCase().includes('certificat') ||
                           sanitizedMessage.toLowerCase().includes('convocation') ||
                           sanitizedMessage.toLowerCase().includes('télécharger');
    
    console.log(`🎯 Intention: ${intention} (score: ${score})`);
    if (typeSpecifique) console.log(`📌 Type spécifique: ${typeSpecifique}`);
    
    let reponse = '';
    const msgNorm = sanitizedMessage.toLowerCase().trim();
    
    // Messages simples
    if (msgNorm === 'non' || msgNorm === 'non merci' || msgNorm === 'pas maintenant') {
      reponse = this.reponseNon();
    } else if (msgNorm === 'oui' || msgNorm === 'ok' || msgNorm === 'd\'accord') {
      reponse = this.reponseOui(agentData);
    } else if (intention === 'salutation') {
      reponse = this.reponseSalutation();
    } else if (intention === 'remerciement') {
      reponse = this.reponseRemerciement();
    } else if (intention === 'auRevoir') {
      reponse = this.reponseAuRevoir();
    } else if (intention === 'commentCaVa') {
      reponse = this.reponseCommentCaVa();
    } else if (intention === 'aide') {
      reponse = this.formatAide();
    }
    // ✅ MODIFICATION 9 : Ajout du traitement contact
    else if (intention === 'contact') {
      reponse = this.reponseContact(agentData);
    }
    // ✅ MODIFICATION 9 : Ajout du traitement pourquoiTypeVisite
    else if (intention === 'pourquoiTypeVisite') {
      reponse = this.reponsePourquoiTypeVisite(sanitizedMessage, agentData);
    }
    // ✅ PROCÉDURE EN CAS D'ACCIDENT (PRIORITÉ ABSOLUE)
    else if (intention === 'procedureAccident') {
      reponse = await this.reponseProcedureAccident(sanitizedMessage, agentData);
    }
    // ✅ DIFFÉRENCE ENTRE LES TYPES DE VISITES
    else if (intention === 'differenceTypesVisites') {
      reponse = this.reponseDifferenceTypesVisites(agentData);
    }
    // ✅ REPROGRAMMATION
    else if (intention === 'reprogrammation') {
      reponse = await this.reponseReprogrammation(sanitizedMessage, agentData);
    }
    // ✅ QUESTIONS "POURQUOI" (réponses intelligentes et détaillées)
    else if (intention === 'explication') {
      reponse = await this.reponseExplication(sanitizedMessage, agentData);
    }
    // ✅ VISITES FUTURES (UNIQUEMENT À VENIR)
    else if (intention === 'visitesFutures') {
      reponse = this.reponseVisitesFutures(agentData);
    }
    // ✅ HISTORIQUE (UNIQUEMENT PASSÉ)
    else if (intention === 'historiqueVisites') {
      reponse = this.reponseHistoriqueVisites(agentData);
    }
    // TOUTES LES VISITES (futur + passé)
    else if (intention === 'toutesVisites') {
      reponse = this.reponseToutesVisites(agentData);
    }
    // Documents professionnels
    else if (demandeDocument || intention === 'documents') {
      reponse = await this.formatDocumentGeneration(sanitizedMessage, agentData);
    }
    // Graphiques
    else if (intention === 'graphiques') {
      reponse = await this.genererGraphique(sanitizedMessage, agentData);
    }
    // Comparaisons
    else if (intention === 'comparaison') {
      reponse = await this.formatComparaison(sanitizedMessage, agentData);
    }
    // Statistiques
    else if (intention === 'statistiques') {
      reponse = this.reponseStatistiques(agentData);
    }
    // Informations personnelles
    else if (intention === 'identite') {
      reponse = this.reponseIdentite(agentData);
    } else if (intention === 'poste') {
      reponse = this.reponsePoste(agentData);
    } else if (intention === 'agence') {
      reponse = this.reponseAgence(agentData);
    } else if (intention === 'dateNaissance') {
      reponse = this.reponseIdentite(agentData);
    } else if (intention === 'statut') {
      reponse = this.reponseAptitude(agentData);
    }
    // Visites - prochaines
    else if (intention === 'prochaineVisite') {
      reponse = this.reponseProchaineVisite(agentData, typeSpecifique);
    } else if (intention === 'prochainePeriodique') {
      reponse = this.reponseProchaineVisite(agentData, 'Périodique');
    } else if (intention === 'prochaineReprise') {
      reponse = this.reponseProchaineVisite(agentData, 'Reprise');
    } else if (intention === 'prochaineReclassement') {
      reponse = this.reponseProchaineVisite(agentData, 'Reclassement');
    } else if (intention === 'prochaineEmbauche') {
      reponse = this.reponseProchaineVisite(agentData, 'Embauche');
    }
    // Visites - dernières
    else if (intention === 'derniereVisite') {
      reponse = this.reponseDerniereVisite(agentData, typeSpecifique);
    } else if (intention === 'resultatVisite') {
      reponse = this.reponseResultatVisite(agentData);
    }
    // ✅ ACCIDENTS
    else if (intention === 'accidents') {
      reponse = this.reponseAccidents(agentData);
    }
    // Aptitude
    else if (intention === 'inaptitude') {
      reponse = this.reponseAptitude(agentData);
    }
    // Recherche avancée
    else if (sanitizedMessage.toLowerCase().includes('cherche') || sanitizedMessage.toLowerCase().includes('trouve')) {
      reponse = await this.rechercheAvancee(sanitizedMessage, agentData);
    }
    // Défaut
    else {
      reponse = this.formatDefault(agentData);
    }
    
    // Sauvegarde
    const conversationId = uuidv4();
    await db.local.ChatHistory.create({
      id_utilisateur: userId,
      matricule_agent: matricule,
      message_utilisateur: sanitizedMessage,
      reponse_bot: reponse,
      intention: intention,
      conversation_id: conversationId,
      created_at: new Date()
    });
    
    // Métriques
    const duration = Date.now() - startTime;
    this.metrics.totalRequests++;
    this.metrics.avgResponseTime = 
      (this.metrics.avgResponseTime * (this.metrics.totalRequests - 1) + duration) / this.metrics.totalRequests;
    
    console.log(`✅ Réponse générée en ${duration}ms (moyenne: ${Math.round(this.metrics.avgResponseTime)}ms)`);
    
    return {
      reponse: reponse,
      intention: intention,
      conversation_id: conversationId
    };
  }
  
  // ========== METHODES UTILITAIRES ==========
  
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      cacheHitRate: this.metrics.totalRequests > 0 
        ? Math.round((this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100)
        : 0
    };
  }
  
  resetRateLimiter(userId) {
    this.rateLimiter.reset(userId);
  }
  
  resetCircuitBreaker() {
    this.circuitBreaker.reset();
  }
  
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Cache complet vidé');
  }
}

module.exports = IntelligentChatbot; 