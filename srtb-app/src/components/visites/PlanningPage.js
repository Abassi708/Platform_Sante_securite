// frontend/components/visites/PlanningPage.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, User, Heart, FileText, CheckCircle, XCircle,
  AlertCircle, Info, RefreshCw, ChevronLeft, ChevronRight,
  AlertTriangle, X, Save, MapPin, Award, Filter, TrendingUp,
  Send, Mail, Download, Lock, Unlock, History, Bell, Eye, Zap,
} from 'lucide-react';
import moment from 'moment';
import '../../styles/PlanningPage.css';

// ========== FONCTIONS DE CALCUL DES SEMAINES ISO AVEC MOMENT.JS ==========
function getNumeroSemaine(date) {
  return moment(date).isoWeek();
}

function getLundiSemaine(numeroSemaine, annee) {
  return moment().year(annee).isoWeek(numeroSemaine).startOf('isoWeek').format('YYYY-MM-DD');
}

const PlanningPage = () => {
  // Calculer la semaine actuelle au chargement
  const aujourdhui = new Date();
  const semaineActuelle = getNumeroSemaine(aujourdhui);
  
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState([]);
  const [agents, setAgents] = useState([]);
  const [notification, setNotification] = useState({ show: false, type: 'info', title: '', message: '' });
  const [showHistorique, setShowHistorique] = useState(null);
  const [convocationsToSend, setConvocationsToSend] = useState([]);
  const [semaineCourante, setSemaineCourante] = useState({
    numero: semaineActuelle,
    annee: aujourdhui.getFullYear(),
    dateDebut: getLundiSemaine(semaineActuelle, aujourdhui.getFullYear())
  });
  const [generationLoading, setGenerationLoading] = useState(false);
  const [showReprogramModal, setShowReprogramModal] = useState(false);
  const [planningToReprogram, setPlanningToReprogram] = useState(null);
  const [nouvelleDate, setNouvelleDate] = useState('');
  const [nouvelleHeure, setNouvelleHeure] = useState('');
  const [reprogramMotif, setReprogramMotif] = useState('');
  const [reprogramLoading, setReprogramLoading] = useState(false);
  const [reprogramSource, setReprogramSource] = useState('manuel');
  const [showAnnulationModal, setShowAnnulationModal] = useState(false);
  const [planningToAnnuler, setPlanningToAnnuler] = useState(null);
  const [annulationMotif, setAnnulationMotif] = useState('');
  const [annulationLoading, setAnnulationLoading] = useState(false);
  const [showConvocationPreview, setShowConvocationPreview] = useState(false);
  const [convocationToPreview, setConvocationToPreview] = useState(null);

  // ========== CHARGEMENT DES DONNÉES ==========
  useEffect(() => {
    console.log('🔄 [PLANNING] useEffect déclenché - semaine:', semaineCourante);
    chargerDonnees();
  }, [semaineCourante]);

  useEffect(() => {
    chargerConvocationsAEnvoyer();
  }, [planning]);

  const chargerDonnees = async () => {
    console.log('🚀 [PLANNING] Chargement des données...');
    setLoading(true);
    try {
      await Promise.all([fetchAgents(), fetchPlanningSemaine()]);
      console.log('✅ [PLANNING] Données chargées avec succès');
    } catch (error) {
      console.error('❌ [PLANNING] Erreur chargement:', error);
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
        console.log(`✅ [PLANNING] ${data.agents?.length || 0} agents chargés`);
      }
    } catch (err) {
      console.error('Erreur chargement agents:', err);
    }
  };

  const fetchPlanningSemaine = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = `${process.env.REACT_APP_API_URL}/api/planning/${semaineCourante.numero}/${semaineCourante.annee}`;
      console.log('🔍 [PLANNING] Chargement planning:', url);
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('🔍 [PLANNING] Status réponse:', response.status);
      
      const data = await response.json();
      console.log('📊 [PLANNING] Données reçues:', data);
      
      if (data.success) {
        setPlanning(data.planning || []);
        console.log(`✅ [PLANNING] ${data.planning?.length || 0} visite(s) chargée(s)`);
        
        if (data.planning && data.planning.length > 0) {
          console.log('📋 [PLANNING] Exemple de visite:', data.planning[0]);
        }
      } else {
        console.error('❌ [PLANNING] Erreur API:', data.message);
        setPlanning([]);
      }
    } catch (err) {
      console.error('❌ [PLANNING] Erreur réseau:', err);
      setPlanning([]);
    }
  };

  const chargerConvocationsAEnvoyer = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/convocations-a-envoyer`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setConvocationsToSend(data.convocations || []);
    } catch (err) {
      console.error('Erreur chargement convocations:', err);
    }
  };

  // ========== GÉNÉRATION DU PLANNING ==========
  const genererPlanning = async () => {
    console.log('🚀 [PLANNING] Génération demandée');
    
    const aujourdhui = new Date();
    const lundiProchain = new Date(aujourdhui);
    const joursJusquaLundi = (8 - aujourdhui.getDay()) % 7;
    lundiProchain.setDate(aujourdhui.getDate() + (joursJusquaLundi === 0 ? 7 : joursJusquaLundi));
    lundiProchain.setHours(0, 0, 0, 0);
    
    const dateStr = lundiProchain.toISOString().split('T')[0];
    const semaineProchaine = getNumeroSemaine(lundiProchain);
    const anneeProchaine = lundiProchain.getFullYear();
    
    console.log('📅 [PLANNING] Génération pour:', { dateStr, semaineProchaine, anneeProchaine });
    
    if (!window.confirm(`Générer le planning pour la semaine ${semaineProchaine}/${anneeProchaine} ?`)) {
      console.log('❌ [PLANNING] Génération annulée');
      return;
    }

    setGenerationLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('📡 [PLANNING] Envoi requête POST /api/planning/generer');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/generer`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dateDebut: dateStr })
      });

      const data = await response.json();
      console.log('📊 [PLANNING] Réponse génération:', data);
      
      if (data.success) {
        showNotification({
          type: 'success',
          title: '✅ Planning généré',
          message: `${data.planning?.length || 0} visite(s) générée(s) pour la semaine ${semaineProchaine}/${anneeProchaine}`
        });
        
        setSemaineCourante({
          numero: semaineProchaine,
          annee: anneeProchaine,
          dateDebut: dateStr
        });
        
        await fetchPlanningSemaine();
        
      } else {
        console.error('❌ [PLANNING] Erreur génération:', data.message);
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message || 'Erreur inconnue' });
      }
    } catch (err) {
      console.error('❌ [PLANNING] Erreur réseau:', err);
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de la génération' });
    } finally {
      setGenerationLoading(false);
    }
  };

  // ========== REPROGRAMMATION MANUELLE ==========
  const handleReprogrammerManuel = (planningItem) => {
    setPlanningToReprogram(planningItem);
    setNouvelleDate('');
    setNouvelleHeure('');
    setReprogramMotif('');
    setReprogramSource('manuel');
    setShowReprogramModal(true);
  };

  // ========== REPROGRAMMATION AUTOMATIQUE ==========
   const handleReprogrammerAuto = async (planningItem) => {
  if (!window.confirm(`Reprogrammer automatiquement la visite pour ${getAgentNom(planningItem.matricule_agent)} ?`)) return;

  setReprogramLoading(true);
  try {
    const token = localStorage.getItem('token');
    const url = `${process.env.REACT_APP_API_URL}/api/planning/${planningItem.id_planning}/reprogrammer-auto`;
    
    console.log('🔄 Envoi requête reprogrammation auto:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('📥 Réponse:', data);
    
    if (response.ok && data.success) {
      showNotification({
        type: 'success',
        title: '✅ Visite reprogrammée automatiquement',
        message: `Nouvelle date: ${data.data.nouvelle_date} à ${data.data.nouvelle_heure.substring(0,5)}`
      });
      // Recharger le planning après un court délai
      setTimeout(() => {
        fetchPlanningSemaine();
      }, 500);
    } else {
      showNotification({ type: 'error', title: '❌ Erreur', message: data.message || 'Erreur lors de la reprogrammation' });
    }
  } catch (err) {
    console.error('❌ Erreur réseau:', err);
    showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur de connexion au serveur' });
  } finally {
    setReprogramLoading(false);
  }
};

  const confirmerReprogrammation = async () => {
    if (!planningToReprogram) return;
    
    if (!nouvelleDate || !nouvelleHeure) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Nouvelle date et heure requises' });
      return;
    }
    
    if (!reprogramMotif || reprogramMotif.trim() === '') {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Motif de reprogrammation requis' });
      return;
    }

    setReprogramLoading(true);
    try {
      const token = localStorage.getItem('token');
      const url = `${process.env.REACT_APP_API_URL}/api/planning/${planningToReprogram.id_planning}/reprogrammer`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nouvelle_date: nouvelleDate,
          nouvelle_heure: nouvelleHeure,
          motif: reprogramMotif,
          source: reprogramSource
        })
      });

      const data = await response.json();
      
      if (data.success) {
        showNotification({
          type: 'success',
          title: '✅ Visite reprogrammée',
          message: `Visite reprogrammée au ${nouvelleDate} à ${nouvelleHeure} (${reprogramSource === 'auto' ? 'auto' : 'manuel'})`
        });
        setShowReprogramModal(false);
        setPlanningToReprogram(null);
        fetchPlanningSemaine();
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de la reprogrammation' });
    } finally {
      setReprogramLoading(false);
    }
  };

  // ========== AUTRES FONCTIONS ==========
  const handleEnvoyerConvocation = async (planningItem) => {
    if (!window.confirm(`Envoyer la convocation pour ${getAgentNom(planningItem.matricule_agent)} ?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/envoyer-convocation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id_planning: planningItem.id_planning })
      });
      
      const data = await response.json();
      if (data.success) {
        showNotification({ type: 'success', title: '📧 Convocation envoyée', message: 'La convocation a été envoyée au GRH' });
        fetchPlanningSemaine();
        chargerConvocationsAEnvoyer();
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'envoi' });
    }
  };

  const handleEnvoyerToutesConvocations = async () => {
    const convocationsNonEnvoyees = planning.filter(
      p => !p.convocation_envoyee && p.statut === 'Programmé' && !p.visite_effectuee
    );
    
    if (convocationsNonEnvoyees.length === 0) {
      showNotification({ type: 'info', title: 'ℹ️ Info', message: 'Aucune convocation à envoyer' });
      return;
    }
    
    if (!window.confirm(`Envoyer ${convocationsNonEnvoyees.length} convocation(s) au GRH ?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const ids = convocationsNonEnvoyees.map(p => p.id_planning);
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/envoyer-convocations-groupees`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids_planning: ids })
      });
      
      const data = await response.json();
      if (data.success) {
        showNotification({ type: 'success', title: '📧 Convocations envoyées', message: data.message });
        fetchPlanningSemaine();
        chargerConvocationsAEnvoyer();
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'envoi' });
    }
  };

  const handleAnnulerVisite = (planningItem) => {
    if (planningItem.type_visite !== 'Reprise') {
      showNotification({ type: 'warning', title: '⚠️ Action non autorisée', message: 'Seules les visites de reprise peuvent être annulées' });
      return;
    }
    
    setPlanningToAnnuler(planningItem);
    setAnnulationMotif('');
    setShowAnnulationModal(true);
  };

  const confirmerAnnulation = async () => {
    if (!planningToAnnuler) return;
    
    if (!annulationMotif || annulationMotif.trim() === '') {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Motif d\'annulation requis' });
      return;
    }

    setAnnulationLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/${planningToAnnuler.id_planning}/annuler`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motif: annulationMotif })
      });

      const data = await response.json();
      
      if (data.success) {
        showNotification({ type: 'success', title: '✅ Visite annulée', message: 'La visite de reprise a été annulée avec succès' });
        setShowAnnulationModal(false);
        setPlanningToAnnuler(null);
        fetchPlanningSemaine();
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'annulation' });
    } finally {
      setAnnulationLoading(false);
    }
  };

  const handleEnregistrerVisite = async (planningItem) => {
    const medecin = window.prompt("Nom du médecin (Dr. Mahmoud Khelifi):") || "Dr. Mahmoud Khelifi";
    const resultat = window.prompt("Résultat (Apte, Apte avec réserves, Inapte temporaire, Inapte définitif):", "Apte");
    const observation = window.prompt("Observations (optionnel):") || "";
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/${planningItem.id_planning}/effectuer`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ medecin, observation, resultat })
      });
      
      const data = await response.json();
      if (data.success) {
        showNotification({ type: 'success', title: '✅ Visite effectuée', message: 'La visite a été marquée comme effectuée' });
        fetchPlanningSemaine();
      }
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const showNotification = ({ type, title, message }) => {
    setNotification({ show: true, type, title, message });
    setTimeout(() => setNotification({ show: false, type: '', title: '', message: '' }), 5000);
  };

  const changerSemaine = (direction) => {
    let nouveauNumero = semaineCourante.numero + direction;
    let nouvelleAnnee = semaineCourante.annee;

    if (nouveauNumero < 1) {
      nouveauNumero = 52;
      nouvelleAnnee--;
    } else if (nouveauNumero > 52) {
      nouveauNumero = 1;
      nouvelleAnnee++;
    }

    setSemaineCourante({
      numero: nouveauNumero,
      annee: nouvelleAnnee,
      dateDebut: getLundiSemaine(nouveauNumero, nouvelleAnnee)
    });
  };

  const getAgentNom = (matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    return agent ? `${agent.nom} ${agent.prenom}` : `Agent ${matricule}`;
  };

  const getAgentDetails = (matricule) => {
    return agents.find(a => a.matricule_agent === matricule);
  };

  const getDerniereVisite = (matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    if (!agent || !agent.date_derniere_visite) return 'Jamais';
    
    const periodiciteLabel = agent.code_affectation === 3 ? '6 mois' : '1 an';
    const dateStr = new Date(agent.date_derniere_visite).toLocaleDateString('fr-FR');
    return `${dateStr} (${periodiciteLabel})`;
  };

  const getPeriodiciteBadge = (matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    if (!agent) return null;
    
    if (agent.code_affectation === 3) {
      return <span className="periodicite-badge chauffeur" title="Périodicité 6 mois">🚌 6 mois</span>;
    }
    return <span className="periodicite-badge autre" title="Périodicité 1 an">👤 1 an</span>;
  };

  const getTypeVisiteBadge = (type) => {
    switch(type) {
      case 'Périodique': return <span className="type-badge periodique">📋 Périodique</span>;
      case 'Reprise': return <span className="type-badge reprise">🔄 Reprise</span>;
      case 'Reclassement': return <span className="type-badge reclassement">📝 Reclassement</span>;
      case 'Embauche': return <span className="type-badge embauche">👔 Embauche</span>;
      default: return <span className="type-badge">{type}</span>;
    }
  };

  const getStatutClass = (statut, effectuee, creneauBloque) => {
    if (creneauBloque) return 'bloque';
    if (effectuee === true || effectuee === 1 || effectuee === '1') return 'effectue';
    switch(statut) {
      case 'Programmé': return 'programme';
      case 'Reporté': return 'reporte';
      case 'Annulé': return 'annule';
      default: return '';
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getSourceBadge = (sourcePlanification) => {
    if (sourcePlanification === 'manuel') {
      return (
        <span className="source-badge manuel" title="Planifiée manuellement">
          ✏️ Manuel
        </span>
      );
    }
    return (
      <span className="source-badge auto" title="Planifiée automatiquement">
        🤖 Auto
      </span>
    );
  };

  const HistoriquePopup = ({ visite, onClose }) => {
    if (!visite || !visite.historique || visite.historique.length === 0) {
      return (
        <div className="historique-popup">
          <div className="popup-header"><h4>Historique de la visite</h4><button onClick={onClose}><X size={14} /></button></div>
          <div className="popup-content empty"><p>Aucun historique disponible</p></div>
        </div>
      );
    }
    
    return (
      <div className="historique-popup">
        <div className="popup-header"><h4>Historique de la visite</h4><button onClick={onClose}><X size={14} /></button></div>
        <div className="popup-content">
          {visite.historique.map((h, idx) => (
            <div key={idx} className="historique-item">
              <div className="historique-date">{new Date(h.created_at).toLocaleString('fr-FR')}</div>
              <div className={`historique-action ${h.type_action?.toLowerCase()}`}>
                {h.type_action === 'PROGRAMMATION' && '📅 Programmation'}
                {h.type_action === 'EFFECTUEE' && '✅ Visite effectuée'}
                {h.type_action === 'REPROGRAMMEE' && '🔄 Reprogrammation'}
                {h.type_action === 'ANNULEE' && '❌ Annulation'}
                {h.type_action === 'REAFFECTEE' && '👥 Réaffectation'}
              </div>
              {h.motif_action && <div className="historique-motif"><FileText size={10} /> Motif: {h.motif_action}</div>}
              {h.ancien_statut && <div className="historique-statut">Statut: {h.ancien_statut} → {h.nouveau_statut}</div>}
              {h.medecin && h.medecin !== 'Système' && <div className="historique-medecin"><User size={10} /> Médecin: {h.medecin}</div>}
              {h.resultat && <div className="historique-resultat"><Award size={10} /> Résultat: {h.resultat}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const joursSemaine = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
  const creneauxAffichage = ['08:00', '08:30', '09:00', '09:30'];
  const convocationsNonEnvoyees = planning.filter(p => !p.convocation_envoyee && p.statut === 'Programmé' && !p.visite_effectuee);

  // Calculer les dates pour le planning
  const datesSemaine = joursSemaine.map((jour, index) => {
    const date = new Date(semaineCourante.dateDebut);
    date.setDate(date.getDate() + index + 1);
    return date.toISOString().split('T')[0];
  });

  return (
    <div className="planning-page">
      {notification.show && (
        <div className={`notification-container ${notification.type}`}>
          <div className="notification-content">
            <div className="notification-icon">
              {notification.type === 'success' && <CheckCircle size={24} />}
              {notification.type === 'error' && <XCircle size={24} />}
              {notification.type === 'warning' && <AlertCircle size={24} />}
              {notification.type === 'info' && <Info size={24} />}
            </div>
            <div className="notification-text">
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
            </div>
            <button className="notification-close" onClick={() => setNotification({...notification, show: false})}><X size={16} /></button>
          </div>
        </div>
      )}

      <div className="planning-header">
        <div className="header-left">
          <div className="header-icon"><Calendar size={28} /></div>
          <div className="header-title">
            <h1>Planning des visites</h1>
            <p>Semaine {semaineCourante.numero} / {semaineCourante.annee}</p>
          </div>
        </div>
        <div className="header-right">
          <div className="semaine-nav">
            <button onClick={() => changerSemaine(-1)} disabled={generationLoading}><ChevronLeft size={20} /></button>
            <span>{semaineCourante.numero}</span>
            <button onClick={() => changerSemaine(1)} disabled={generationLoading}><ChevronRight size={20} /></button>
          </div>
          {convocationsNonEnvoyees.length > 0 && (
            <button className="btn-convocation" onClick={handleEnvoyerToutesConvocations}>
              <Mail size={16} /> Envoyer {convocationsNonEnvoyees.length} convocation(s)
            </button>
          )}
          <button className="btn-primary" onClick={genererPlanning} disabled={generationLoading}>
            {generationLoading ? <><span className="spinner-small"></span> Génération...</> : <><RefreshCw size={16} /> Générer semaine prochaine</>}
          </button>
        </div>
      </div>

      <div className="planning-legend">
        <div className="legend-item"><span className="legend-dot programme"></span><span>Programmé</span></div>
        <div className="legend-item"><span className="legend-dot effectue"></span><span>Effectué</span></div>
        <div className="legend-item"><span className="legend-dot reporte"></span><span>Reporté</span></div>
        <div className="legend-item"><span className="legend-dot annule"></span><span>Annulé</span></div>
        <div className="legend-item"><span className="legend-dot bloque"></span><span>🔒 Créneau bloqué</span></div>
        <div className="legend-item"><span className="legend-dot chauffeur-badge"></span><span>Chauffeur (6 mois)</span></div>
        <div className="legend-item"><span className="legend-dot autre-badge"></span><span>Autre (1 an)</span></div>
        <div className="legend-item"><span className="legend-dot convocation-badge"></span><span>📧 Convocation envoyée</span></div>
        <div className="legend-item"><span className="legend-dot periodique"></span><span>📋 Périodique</span></div>
        <div className="legend-item"><span className="legend-dot reprise"></span><span>🔄 Reprise</span></div>
        <div className="legend-item"><span className="legend-dot reclassement"></span><span>📝 Reclassement</span></div>
        <div className="legend-item">
          <span className="legend-dot auto-badge"></span>
          <span>🤖 Auto (planification automatique)</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot manuel-badge"></span>
          <span>✏️ Manuel (création manuelle)</span>
        </div>
      </div>

      {loading ? (
        <div className="loading-state"><div className="spinner"></div><p>Chargement du planning...</p></div>
      ) : planning.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <Calendar size={64} style={{ color: '#94a3b8', marginBottom: 20 }} />
          <h3>Aucune visite pour cette semaine</h3>
          <p>Cliquez sur "Générer semaine prochaine" pour créer le planning automatique</p>
          <button className="btn-primary" onClick={genererPlanning} style={{ marginTop: 20 }}>
            <RefreshCw size={16} /> Générer le planning
          </button>
        </div>
      ) : (
        <div className="planning-grid">
          {/* En-tête des jours */}
          <div className="planning-row header">
            <div className="planning-cell time-cell">Horaire</div>
            {joursSemaine.map((jour, index) => (
              <div key={jour} className="planning-cell day-cell">
                <div className="jour-label">{jour}</div>
                <div className="date-label">{formatDate(datesSemaine[index])}</div>
              </div>
            ))}
          </div>

          {/* Lignes des créneaux horaires */}
          {creneaux.map((creneau, cIndex) => (
            <div key={cIndex} className="planning-row">
              <div className="planning-cell time-cell">{creneauxAffichage[cIndex]}</div>
              {datesSemaine.map((dateStr, dIndex) => {
                const visite = planning.find(v => {
                  return v.date_visite === dateStr && v.heure_visite === creneau;
                });
                
                return (
                  <div key={dIndex} className="planning-cell">
                    {visite ? (
                      <div className={`visite-card ${getStatutClass(visite.statut, visite.visite_effectuee, visite.creneau_bloque)}`}>
                        <div className="visite-card-header">
                          <div className="agent-info-header">
                            {visite.creneau_bloque && <Lock size={12} className="bloque-icon" />}
                            <span className="agent-matricule">#{visite.matricule_agent}</span>
                            {getPeriodiciteBadge(visite.matricule_agent)}
                            {getSourceBadge(visite.source_planification)}
                            {visite.convocation_envoyee && (
                              <span className="convocation-sent-badge" title="Convocation envoyée">
                                <Mail size={10} /> Envoyé
                              </span>
                            )}
                          </div>
                          <span className={`badge-statut ${visite.creneau_bloque ? 'bloque' : visite.visite_effectuee ? 'effectue' : visite.statut === 'Programmé' ? 'programme' : visite.statut === 'Reporté' ? 'reporte' : visite.statut === 'Annulé' ? 'annule' : ''}`}>
                            {visite.creneau_bloque ? '🔒 BLOQUÉ' : (visite.visite_effectuee ? 'Effectué' : visite.statut)}
                          </span>
                        </div>
                        <div className="agent-nom">{getAgentNom(visite.matricule_agent)}</div>
                        {getAgentDetails(visite.matricule_agent) && (
                          <div className="agent-infos">
                            <span className="agent-agence"><MapPin size={10} /> Agence {getAgentDetails(visite.matricule_agent).code_agence}</span>
                            <span className="agent-derniere"><Clock size={10} /> Dernière: {getDerniereVisite(visite.matricule_agent)}</span>
                          </div>
                        )}
                        <div className="visite-type">{getTypeVisiteBadge(visite.type_visite)}</div>
                        {visite.reprogrammee && visite.creneau_bloque && (
                          <div className="visite-reprogram-info">
                            <div className="reprogram-header"><RefreshCw size={12} color="#f59e0b" /><strong>Reprogrammé le {formatDateTime(visite.date_reprogrammation)}</strong></div>
                            <div className="reprogram-motif"><FileText size={10} /> Motif: {visite.motif_reprogrammation}</div>
                            {visite.nouvelle_date_visite && (
                              <div className="reprogram-nouveau"><Calendar size={10} /> Nouveau créneau: {visite.nouvelle_date_visite} {visite.nouvelle_heure_visite?.substring(0,5)}</div>
                            )}
                            <div className="creneau-bloque-warning"><Lock size={10} color="#ef4444" /><small>🔒 Créneau bloqué - Non réattribuable</small></div>
                          </div>
                        )}
                        <div className="visite-card-actions">
                          {!visite.visite_effectuee && visite.statut === 'Programmé' && !visite.creneau_bloque && (
                            <>
                              <button className="action-btn success" onClick={() => handleEnregistrerVisite(visite)}><CheckCircle size={12} /> Effectué</button>
                              <div className="reprogram-buttons">
                                <button className="action-btn warning" onClick={() => handleReprogrammerManuel(visite)}><Calendar size={12} /> Reprogrammer (manuel)</button>
                                <button className="action-btn auto" onClick={() => handleReprogrammerAuto(visite)}><Zap size={12} /> Reprogrammer (auto)</button>
                              </div>
                              {visite.type_visite === 'Reprise' && (
                                <button className="action-btn danger" onClick={() => handleAnnulerVisite(visite)}><XCircle size={12} /> Annuler</button>
                              )}
                            </>
                          )}
                          {!visite.visite_effectuee && visite.statut === 'Programmé' && !visite.convocation_envoyee && !visite.creneau_bloque && (
                            <>
                              <button className="action-btn convocation" onClick={() => { setConvocationToPreview(visite); setShowConvocationPreview(true); }}><Eye size={12} /> Aperçu</button>
                              <button className="action-btn send" onClick={() => handleEnvoyerConvocation(visite)}><Mail size={12} /> Envoyer</button>
                            </>
                          )}
                          {visite.historique && visite.historique.length > 0 && (
                            <button className="action-btn info" onClick={() => setShowHistorique(visite.id_planning)}><History size={12} /> Historique</button>
                          )}
                        </div>
                        {visite.visite_effectuee && (
                          <div className="visite-effectuee-info"><CheckCircle size={12} color="#10b981" /><small>Effectuée le {formatDate(visite.date_visite)}</small></div>
                        )}
                      </div>
                    ) : (
                      <div className="visite-card empty"><span>Disponible</span></div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* MODALE REPROGRAMMATION MANUELLE */}
      <AnimatePresence>
        {showReprogramModal && planningToReprogram && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReprogramModal(false)}>
            <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header warning">
                <div className="header-icon warning"><Calendar size={24} /></div>
                <h2>Reprogrammer la visite</h2>
                <button className="modal-close" onClick={() => setShowReprogramModal(false)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="reprogram-info">
                  <p><strong>Agent :</strong> {getAgentNom(planningToReprogram.matricule_agent)}</p>
                  <p><strong>Type :</strong> {planningToReprogram.type_visite}</p>
                  <p><strong>Visite actuelle :</strong> {formatDate(planningToReprogram.date_visite)} à {planningToReprogram.heure_visite?.substring(0,5)}</p>
                  <div className="warning-box"><AlertCircle size={14} /><span>⚠️ Le créneau actuel sera BLOQUÉ et ne pourra pas être réattribué</span></div>
                </div>
                <div className="form-group">
                  <label>Nouvelle date <span className="required">*</span></label>
                  <input type="date" value={nouvelleDate} onChange={(e) => setNouvelleDate(e.target.value)} min={new Date().toISOString().split('T')[0]} required />
                </div>
                <div className="form-group">
                  <label>Nouvelle heure <span className="required">*</span></label>
                  <select value={nouvelleHeure} onChange={(e) => setNouvelleHeure(e.target.value)} required>
                    <option value="">Sélectionner une heure</option>
                    <option value="08:00:00">08:00</option>
                    <option value="08:30:00">08:30</option>
                    <option value="09:00:00">09:00</option>
                    <option value="09:30:00">09:30</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Motif de la reprogrammation <span className="required">*</span></label>
                  <textarea rows="3" value={reprogramMotif} onChange={(e) => setReprogramMotif(e.target.value)} placeholder="Congé maladie, absence, indisponibilité, etc." required />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowReprogramModal(false)}>Annuler</button>
                <button className="btn-primary" onClick={confirmerReprogrammation} disabled={!nouvelleDate || !nouvelleHeure || !reprogramMotif || reprogramLoading}>
                  {reprogramLoading ? <><span className="spinner-small"></span> Reprogrammation...</> : <><Calendar size={16} /> Confirmer</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE ANNULATION */}
      <AnimatePresence>
        {showAnnulationModal && planningToAnnuler && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAnnulationModal(false)}>
            <motion.div className="modal-content small" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header danger">
                <div className="header-icon danger"><XCircle size={24} /></div>
                <h2>Annuler la visite de reprise</h2>
                <button className="modal-close" onClick={() => setShowAnnulationModal(false)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="annulation-info">
                  <p><strong>Agent :</strong> {getAgentNom(planningToAnnuler.matricule_agent)}</p>
                  <p><strong>Date :</strong> {formatDate(planningToAnnuler.date_visite)} à {planningToAnnuler.heure_visite?.substring(0,5)}</p>
                </div>
                <div className="form-group"><label>Motif de l'annulation <span className="required">*</span></label>
                  <textarea rows="3" value={annulationMotif} onChange={(e) => setAnnulationMotif(e.target.value)} placeholder="Raison de l'annulation" required />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowAnnulationModal(false)}>Annuler</button>
                <button className="btn-danger" onClick={confirmerAnnulation} disabled={!annulationMotif || annulationLoading}>
                  {annulationLoading ? <><span className="spinner-small"></span> Traitement...</> : <><XCircle size={16} /> Confirmer</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE HISTORIQUE */}
      <AnimatePresence>
        {showHistorique && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistorique(null)}>
            <motion.div className="modal-content small" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <HistoriquePopup visite={planning.find(p => p.id_planning === showHistorique)} onClose={() => setShowHistorique(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE APERÇU CONVOCATION */}
      <AnimatePresence>
        {showConvocationPreview && convocationToPreview && (
          <motion.div className="modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowConvocationPreview(false)}>
            <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="convocation-preview">
                <div className="popup-header"><h4>📧 Aperçu de la convocation</h4><button onClick={() => setShowConvocationPreview(false)}><X size={14} /></button></div>
                <div className="popup-content">
                  <div className="convocation-card">
                    <div className="convocation-header"><h3>SRTB - Service HSE</h3><p>Convocation à visite médicale</p></div>
                    <div className="convocation-body">
                      <p><strong>Agent:</strong> {getAgentNom(convocationToPreview.matricule_agent)}</p>
                      <p><strong>Matricule:</strong> #{convocationToPreview.matricule_agent}</p>
                      <p><strong>Date:</strong> {new Date(convocationToPreview.date_visite).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p><strong>Heure:</strong> {convocationToPreview.heure_visite?.substring(0,5)}</p>
                      <p><strong>Type de visite:</strong> {convocationToPreview.type_visite}</p>
                      <p><strong>Lieu:</strong> Infirmerie SRTB - Bizerte</p>
                      <p><strong>Médecin:</strong> Dr. Mahmoud Khelifi</p>
                      <div className="convocation-instructions">
                        <strong>Instructions:</strong>
                        <ul><li>Se présenter 15 minutes avant l'heure du rendez-vous</li><li>Apporter la carte d'identité nationale</li><li>Être à jeun si nécessaire</li></ul>
                      </div>
                    </div>
                    <div className="convocation-footer">
                      <button className="btn-primary" onClick={() => { handleEnvoyerConvocation(convocationToPreview); setShowConvocationPreview(false); }}><Mail size={14} /> Envoyer la convocation</button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlanningPage;