// frontend/components/visites/PlanningPage.jsx
import React, { useState, useEffect , useRef, useCallback, useMemo } from 'react';
import {
  Calendar, Clock, User, FileText, CheckCircle, XCircle, AlertCircle, Info,
  RefreshCw, ChevronLeft, ChevronRight, X, Filter, TrendingUp, Mail, Lock,
  History, Eye, Zap, Shield, Briefcase, Building, Search, Sliders,
  ChevronDown, ChevronUp, Edit2, Award, ArrowLeftRight, Send, Users, Stethoscope,
  CalendarPlus, CalendarX, CalendarSync, UserPlus
} from 'lucide-react';
import moment from 'moment';
import AgentSearchInput from '../common/AgentSearchInput';
import '../../styles/PlanningPage.css';

// ========== CONSTANTES ==========
const PREFIX = 'sp-';
const cx = (...classes) => classes.filter(Boolean).map(c => `${PREFIX}${c}`).join(' ');

// ========== FONCTIONS UTILITAIRES ==========
const getNumeroSemaine = (date) => moment(date).isoWeek();

const getLundiSemaine = (numeroSemaine, annee) => {
  const date = moment().year(annee).isoWeek(numeroSemaine).startOf('isoWeek');
  return date.format('YYYY-MM-DD');
};

const formatDate = (date) => date ? date.split('-').reverse().join('/') : '';
const formatDateLong = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

// ========== COMPOSANTS UI ==========
const Button = ({ variant = 'primary', size = 'md', icon: Icon, children, loading, fullWidth, className = '', ...props }) => {
  const variants = { primary: 'btn-primary', secondary: 'btn-secondary', success: 'btn-success', danger: 'btn-danger', warning: 'btn-warning', info: 'btn-info', ghost: 'btn-ghost', outline: 'btn-outline' };
  const sizes = { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' };
  return (
    <button className={`${cx('btn', variants[variant], sizes[size])} ${fullWidth ? cx('btn-full') : ''} ${loading ? cx('btn-loading') : ''} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <span className={cx('btn-spinner')}></span>}
      {Icon && !loading && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
      {children && <span>{children}</span>}
    </button>
  );
};

const Badge = ({ variant = 'default', icon: IconComponent, children, size = 'sm', className = '' }) => {
  const variants = {
    default: 'badge-default',
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    purple: 'badge-purple'
  };
 
  const iconSize = size === 'sm' ? 10 : size === 'md' ? 12 : 14;
 
  return (
    <span className={`${cx('badge', variants[variant], `badge-${size}`)} ${className}`}>
      {IconComponent && <IconComponent size={iconSize} />}
      {children}
    </span>
  );
};

const StatCard = ({ title, value, icon: Icon, variant, trend, onClick }) => (
  <div className={`${cx('stat-card')} ${variant ? cx(`stat-card-${variant}`) : ''}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    <div className={cx('stat-card-icon')}><Icon size={24} strokeWidth={1.5} /></div>
    <div className={cx('stat-card-content')}>
      <span className={cx('stat-card-value')}>{value}</span>
      <span className={cx('stat-card-title')}>{title}</span>
    </div>
    {trend && <div className={cx('stat-card-trend')}>{trend > 0 ? <TrendingUp size={14} /> : <TrendingUp size={14} style={{ transform: 'rotate(180deg)' }} />}<span>{Math.abs(trend)}%</span></div>}
  </div>
);

// ========== COMPOSANT PRINCIPAL ==========
const PlanningPage = () => {
  // ========== ÉTATS ==========
  const aujourdhui = new Date();
  const semaineActuelle = getNumeroSemaine(aujourdhui);
 
  // Données
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState([]);
  const [agents, setAgents] = useState([]);
  const [notification, setNotification] = useState({ show: false, type: 'info', title: '', message: '' });
  const [semaineCourante, setSemaineCourante] = useState({
  numero: semaineActuelle,
  annee: aujourdhui.getFullYear(),
  dateDebut: getLundiSemaine(semaineActuelle, aujourdhui.getFullYear())
});
 
  // Filtres et affichage
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [expandedCards, setExpandedCards] = useState(new Set());
  const [showHistorique, setShowHistorique] = useState(null);
 
  // Génération planning
  const [generationLoading, setGenerationLoading] = useState(false);
  const [showGenererPlanningModal, setShowGenererPlanningModal] = useState(false);
  const [generationData, setGenerationData] = useState({ semaineCible: null, anneeCible: null, lundiCible: null });
 
  // Reprogrammation manuelle
  const [showReprogramModal, setShowReprogramModal] = useState(false);
  const [planningToReprogram, setPlanningToReprogram] = useState(null);
  const [nouvelleDate, setNouvelleDate] = useState('');
  const [nouvelleHeure, setNouvelleHeure] = useState('');
  const [reprogramMotif, setReprogramMotif] = useState('');
  const [reprogramLoading, setReprogramLoading] = useState(false);
  const [reprogramSource, setReprogramSource] = useState('manuel');

  // Reprogrammation auto
  const [showAutoReprogramModal, setShowAutoReprogramModal] = useState(false);
  const [autoReprogramItem, setAutoReprogramItem] = useState(null);
  const [autoReprogramLoading, setAutoReprogramLoading] = useState(false);
 
  // Annulation
  const [showAnnulationModal, setShowAnnulationModal] = useState(false);
  const [planningToAnnuler, setPlanningToAnnuler] = useState(null);
  const [annulationMotif, setAnnulationMotif] = useState('');
  const [annulationLoading, setAnnulationLoading] = useState(false);

  // États pour le calendrier intelligent
  const [moisActuelReprog, setMoisActuelReprog] = useState(new Date().getMonth());
  const [anneeActuelleReprog, setAnneeActuelleReprog] = useState(new Date().getFullYear());
  const [joursDisponiblesReprog, setJoursDisponiblesReprog] = useState([]);
  const [creneauxDisponiblesReprog, setCreneauxDisponiblesReprog] = useState([]);
  const [loadingReprogJours, setLoadingReprogJours] = useState(false);
  const [loadingReprogCreneaux, setLoadingReprogCreneaux] = useState(false);
 
  // Convocation simple
  const [showConvocationModal, setShowConvocationModal] = useState(false);
  const [convocationToSend, setConvocationToSend] = useState(null);
  const [convocationLoading, setConvocationLoading] = useState(false);
 
  // Convocation groupée
  const [showGroupeConvocationModal, setShowGroupeConvocationModal] = useState(false);
  const [groupeConvocationCount, setGroupeConvocationCount] = useState(0);
  const [groupeConvocationLoading, setGroupeConvocationLoading] = useState(false);
 
  // Aperçu convocation
  const [showConvocationPreview, setShowConvocationPreview] = useState(false);
  const [convocationToPreview, setConvocationToPreview] = useState(null);
 
  // Visite
  const [showVisiteModal, setShowVisiteModal] = useState(false);
  const [visiteToComplete, setVisiteToComplete] = useState(null);
  const [visiteFormData, setVisiteFormData] = useState({ medecin: 'Dr. Mahmoud Khelifi', resultat: 'Apte', observation: '', duree_inaptitude: 30 });

  // Indisponibilité
  const [showIndisponibleModal, setShowIndisponibleModal] = useState(false);
  const [planningIndisponible, setPlanningIndisponible] = useState(null);
  const [indisponibleMode, setIndisponibleMode] = useState('manuel');
  const [indisponibleLoading, setIndisponibleLoading] = useState(false);
  const [reaffectationInfo, setReaffectationInfo] = useState(null);

  // ========== RÉAFFECTATION D'UN CRÉNEAU LIBÉRÉ ==========
const [showReaffectModal, setShowReaffectModal] = useState(false);
const [reaffectCreneau, setReaffectCreneau] = useState(null);
const [reaffectAgents, setReaffectAgents] = useState([]);
const [reaffectLoading, setReaffectLoading] = useState(false);
const [reaffectMotif, setReaffectMotif] = useState('');


const [agentsPrioritaires, setAgentsPrioritaires] = useState([]);
const [loadingAgents, setLoadingAgents] = useState(false);
const [selectedAgentReaffect, setSelectedAgentReaffect] = useState(null);

 const typesAutorisesIndisponible = ['Périodique', 'Reprise'];

useEffect(() => {
  console.log('📊 [DEBUG] showReaffectModal =', showReaffectModal);
  console.log('📊 [DEBUG] reaffectCreneau =', reaffectCreneau);
  console.log('📊 [DEBUG] agentsPrioritaires.length =', agentsPrioritaires.length);
  console.log('📊 [DEBUG] loadingAgents =', loadingAgents);
}, [showReaffectModal, reaffectCreneau, agentsPrioritaires, loadingAgents]);


const handleReaffecterCreneau = async (date, heure, id_planning) => {
  console.log('🔴 [DEBUG] handleReaffecterCreneau - date:', date, 'heure:', heure);
  setReaffectCreneau({ date, heure, id_planning });
  setSelectedAgentReaffect(null);
  console.log('🟡 [DEBUG] Appel de chargerAgentsPrioritaires...');
  await chargerAgentsPrioritaires();
  console.log('🟢 [DEBUG] setShowReaffectModal(true)');
  setShowReaffectModal(true);
};

const confirmerReaffectation = async () => {
  if (!selectedAgentReaffect) {
    showNotification({ type: 'error', title: '❌', message: 'Veuillez sélectionner un agent' });
    return;
  }
 
  setReaffectLoading(true);
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/confirmer-reaffectation`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date_visite: reaffectCreneau.date,
        heure_visite: reaffectCreneau.heure,
        matricule_agent: selectedAgentReaffect.matricule,
        type_visite: 'Périodique',
        motif: reaffectMotif || 'Réaffectation manuelle'
      })
    });
   
    const data = await response.json();
   
    if (data.success) {
      showNotification({ type: 'success', title: '✅', message: data.message });
      setShowReaffectModal(false);
     
      // ✅ AJOUTER LA NOUVELLE CARTE DIRECTEMENT
      if (data.planning) {
        setPlanning(prevPlanning => {
          // Supprimer l'ancienne carte "libérée" si elle existe (matricule_agent === 0)
          const withoutOld = prevPlanning.filter(p =>
            !(p.date_visite === reaffectCreneau.date &&
              p.heure_visite === reaffectCreneau.heure &&
              p.matricule_agent === 0)
          );
          // Ajouter la nouvelle
          return [...withoutOld, data.planning];
        });
      }
     
      // Rafraîchir
      await fetchPlanningSemaine();
     
    } else {
      showNotification({ type: 'error', title: '❌', message: data.message });
    }
  } catch (err) {
    showNotification({ type: 'error', title: '❌', message: 'Erreur de connexion' });
  } finally {
    setReaffectLoading(false);
  }
};

const confirmerReaffectationAvecAgent = async (agent) => {
  setReaffectLoading(true);
  try {
    const token = localStorage.getItem('token');
   
    // ✅ Ajouter l'ID du planning original (le créneau libéré)
    const body = {
      date_visite: reaffectCreneau.date,
      heure_visite: reaffectCreneau.heure,
      matricule_agent: agent.matricule,
      type_visite: 'Périodique',
      motif: reaffectMotif || `Réaffectation - Agent prioritaire`,
      id_planning_original: reaffectCreneau.id_planning  // ← AJOUTER
    };
   
    console.log('📤 Envoi réaffectation:', body);
   
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/confirmer-reaffectation`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
   
    const data = await response.json();
   
    if (data.success) {
      showNotification({ type: 'success', title: '✅', message: data.message });
      setShowReaffectModal(false);
      setSelectedAgentReaffect(null);
      setReaffectMotif('');
      await fetchPlanningSemaine();
    } else {
      showNotification({ type: 'error', title: '❌', message: data.message });
    }
  } catch (err) {
    showNotification({ type: 'error', title: '❌', message: 'Erreur de connexion' });
  } finally {
    setReaffectLoading(false);
  }
};

  // ========== CONSTANTES ==========
  const joursSemaine = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
  const creneauxAffichage = ['08:00', '08:30', '09:00', '09:30'];
  const datesSemaine = joursSemaine.map((_, i) => {
  const date = new Date(semaineCourante.dateDebut);
  date.setDate(date.getDate() + i + 1);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
});

  // ========== FONCTIONS DE CHARGEMENT ==========
  const fetchAgents = async () => {
  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`${process.env.REACT_APP_API_URL}/api/agents`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.log('📋 Agents chargés:', data.agents?.length);
    if (data.success) {
      setAgents(data.agents);
    }
  } catch (err) {
    console.error(err);
  }
};

  const fetchPlanningSemaine = async () => {
  try {
    const token = localStorage.getItem('token');
    const semaine = parseInt(semaineCourante.numero);
    const annee = parseInt(semaineCourante.annee);
   
    console.log(`📡 Chargement planning semaine ${semaine}/${annee}`);
   
    const url = `${process.env.REACT_APP_API_URL}/api/planning/${semaine}/${annee}`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
   
    if (data.success) {
      console.log(`📊 ${data.planning?.length || 0} visites reçues:`);
      data.planning?.forEach(p => {
        console.log(`   - ${p.date_visite} ${p.heure_visite} | ${p.type_visite} | Agent: ${p.matricule_agent}`);
      });
     
      const planningWithData = (data.planning || []).map(p => ({
        ...p,
        a_des_actions: p.historique?.length > 0 || false
      }));
      setPlanning(planningWithData);
    }
  } catch (err) {
    console.error('Erreur fetch planning:', err);
    setPlanning([]);
  }
};


// ========== CHARGER LES AGENTS PRIORITAIRES ==========
const chargerAgentsPrioritaires = async () => {
  console.log('🟢 chargerAgentsPrioritaires appelé');
  setLoadingAgents(true);
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/agents-prioritaires?limit=30`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    console.log('🟢 Réponse reçue:', data);
    if (data.success) {
      console.log('🟢 Agents chargés:', data.agents.length);
      setAgentsPrioritaires(data.agents);
    }
  } catch (err) {
    console.error('🔴 Erreur:', err);
  } finally {
    setLoadingAgents(false);
  }
};

  const fetchVisiteDetails = async (idPlanning) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/${idPlanning}/details`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPlanning(prev => prev.map(p =>
          p.id_planning === idPlanning
            ? {
                ...p,
                action_details: data.visite.action_details,
                historique: data.visite.historique,
                reprogrammation_details: data.visite.reprogrammation_details
              }
            : p
        ));
      }
    } catch (err) {
      console.error('Erreur chargement détails visite:', err);
    }
  };

  // ========== FONCTIONS CALENDRIER INTELLIGENT (UNE SEULE FOIS) ==========
  const chargerJoursDisponiblesReprog = async (mois, annee, matricule) => {
    if (!matricule) return;
   
    try {
      const token = localStorage.getItem('token');
      const url = `${process.env.REACT_APP_API_URL}/api/creneaux/jours-disponibles?mois=${mois + 1}&annee=${annee}&matricule_agent=${matricule}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) {
        setJoursDisponiblesReprog(data.jours.filter(j => j.creneauxDisponibles > 0));
      }
    } catch (err) {
      console.error('Erreur chargement jours:', err);
    }
  };

  const chargerCreneauxDisponiblesReprog = async (date, matricule, idExclu) => {
    if (!matricule || !date) return;
   
    try {
      const token = localStorage.getItem('token');
      const url = `${process.env.REACT_APP_API_URL}/api/creneaux/creneaux-disponibles?date=${date}&matricule_agent=${matricule}&id_planning_exclu=${idExclu}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      if (data.success) {
        setCreneauxDisponiblesReprog(data.creneaux);
      }
    } catch (err) {
      console.error('Erreur chargement créneaux:', err);
    }
  };

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchAgents(), fetchPlanningSemaine()]);
    } catch (error) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  };
 
  useEffect(() => { chargerDonnees(); }, [semaineCourante]);
  useEffect(() => {
  const handleRefresh = () => {
    console.log('🔄 Rafraîchissement du planning après modification');
    fetchPlanningSemaine();
  };
 
  window.addEventListener('refresh-planning', handleRefresh);
  return () => window.removeEventListener('refresh-planning', handleRefresh);
}, []);


  // ========== NOTIFICATIONS ==========
  const showNotification = ({ type, title, message, duration = 5000 }) => {
  setNotification({ show: true, type, title, message });
  setTimeout(() => setNotification({ show: false, type: '', title: '', message: '' }), duration);
};

  // ========== FONCTIONS UTILITAIRES ==========
const getAgentNom = useCallback((matricule) => {
  if (!matricule || matricule === 0 || matricule === '0') return '?';
  const agent = agents.find(a => a.matricule_agent === matricule);
  return agent ? `${agent.nom} ${agent.prenom}` : '?';
}, [agents]);

  const getAgentDetails = useCallback((matricule) => agents.find(a => a.matricule_agent === matricule), [agents]);

  const getDerniereVisite = useCallback((matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    if (!agent?.date_derniere_visite) return 'Jamais';
    const periodicite = agent.periodicite_jours === 180 ? '6 mois' : '1 an';
    return `${new Date(agent.date_derniere_visite).toLocaleDateString('fr-FR')} (${periodicite})`;
  }, [agents]);



  // ========== FONCTIONS DE CLASSE ==========
  const getCardStatusClass = (visite) => {
    if (visite.creneau_bloque) return 'bloque';
    if (visite.visite_effectuee) return 'effectue';
    switch(visite.statut) {
      case 'Programmé': return 'programme';
      case 'Reporté': return 'reporte';
      case 'Annulé': return 'annule';
      default: return '';
    }
  };

  const getCardClassName = (visite) => {
    const status = getCardStatusClass(visite);
    return status ? `${cx('visit-card')} ${PREFIX}${status}` : cx('visit-card');
  };

  // ========== BADGES ==========
  const getTypeVisiteBadge = (type) => {
    switch(type) {
      case 'Périodique': return <Badge variant="primary" icon={Calendar}>Périodique</Badge>;
      case 'Reprise': return <Badge variant="warning" icon={RefreshCw}>Reprise</Badge>;
      case 'Reclassement': return <Badge variant="info" icon={Briefcase}>Reclassement</Badge>;
      case 'Embauche': return <Badge variant="success" icon={User}>Embauche</Badge>;
      default: return <Badge variant="default">{type}</Badge>;
    }
  };

  const getPeriodiciteBadge = useCallback((matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    if (!agent) return null;
    const periodiciteJours = agent.periodicite_jours || 365;
    const periodiciteTexte = periodiciteJours === 180 ? '6 mois' : '1 an';
    const estChauffeur = agent.code_affectation_normalized === 3;
    return estChauffeur
      ? <Badge variant="purple" icon={Shield}>Chauffeur · {periodiciteTexte}</Badge>
      : <Badge variant="primary" icon={Briefcase}>Standard · {periodiciteTexte}</Badge>;
  }, [agents]);

  const getSourceBadge = (source, motif) => {
    if (source === 'manuel') {
      return <Badge variant="purple" icon={Edit2}>Manuel</Badge>;
    }
    if (motif && motif.includes('Visite de contrôle automatique')) {
      return <Badge variant="info" icon={Zap}>Contrôle auto</Badge>;
    }
    return <Badge variant="info" icon={Zap}>Auto</Badge>;
  };

  const getStatusBadge = (statut, effectuee, bloque) => {
    if (bloque) return <Badge variant="default" icon={Lock}>Bloqué</Badge>;
    if (effectuee) return <Badge variant="success" icon={CheckCircle}>Effectué</Badge>;
    switch(statut) {
      case 'Programmé': return <Badge variant="primary" icon={Calendar}>Programmé</Badge>;
      case 'Reporté': return <Badge variant="warning" icon={RefreshCw}>Reporté</Badge>;
      case 'Annulé': return <Badge variant="danger" icon={XCircle}>Annulé</Badge>;
      default: return <Badge variant="default">{statut}</Badge>;
    }
  };

  // ========== AFFICHAGE DES DÉTAILS CONTEXTUELS ==========
  const getActionDetailsDisplay = (visite) => {
    const details = visite.action_details;
    if (!details) return null;

    if (details.raison === 'accident' && details.ancienne_date) {
      return (
        <div className={cx('action-details', 'reprogram-periodique')}>
          <div className={cx('action-details-header')}>
            <CalendarX size={14} />
            <strong>Visite périodique reprogrammée</strong>
          </div>
          <div className={cx('action-details-content')}>
            <div className={cx('detail-row')}>
              <span className={cx('detail-label')}>Ancienne date:</span>
              <span className={cx('detail-value')}>{formatDate(details.ancienne_date)}</span>
            </div>
            <div className={cx('detail-row')}>
              <span className={cx('detail-label')}>Nouvelle date:</span>
              <span className={cx('detail-value', 'highlight')}>{formatDate(details.nouvelle_date)} à {details.nouvelle_heure?.substring(0,5)}</span>
            </div>
            <div className={cx('detail-row')}>
              <span className={cx('detail-label')}>Raison:</span>
              <span className={cx('detail-value')}>Accident de travail le {formatDate(details.date_accident)} - Visite de reprise le {formatDate(details.date_reprise)}</span>
            </div>
          </div>
        </div>
      );
    }

    if (details.type === 'visite_controle' && details.date_controle) {
      return (
        <div className={cx('action-details', 'visite-controle')}>
          <div className={cx('action-details-header')}>
            <CalendarSync size={14} />
            <strong>Visite de contrôle programmée</strong>
          </div>
          <div className={cx('action-details-content')}>
            <div className={cx('detail-row')}>
              <span className={cx('detail-label')}>Inaptitude:</span>
              <span className={cx('detail-value')}>du {formatDate(details.date_inaptitude_debut)} au {formatDate(details.date_inaptitude_fin)}</span>
            </div>
            <div className={cx('detail-row')}>
              <span className={cx('detail-label')}>Contrôle:</span>
              <span className={cx('detail-value', 'highlight')}>{formatDate(details.date_controle)} à {details.heure_controle?.substring(0,5)}</span>
            </div>
            <div className={cx('detail-row')}>
              <span className={cx('detail-label')}>Durée:</span>
              <span className={cx('detail-value')}>{details.duree_inaptitude} jours</span>
            </div>
          </div>
        </div>
      );
    }

    if (details.type === 'prolongation_inaptitude') {
      return (
        <div className={cx('action-details', 'prolongation')}>
          <div className={cx('action-details-header')}>
            <AlertCircle size={14} />
            <strong>Prolongation d'inaptitude</strong>
          </div>
          <div className={cx('action-details-content')}>
            <div className={cx('detail-row')}>
              <span className={cx('detail-label')}>Ancienne fin:</span>
              <span className={cx('detail-value')}>{formatDate(details.ancienne_date_fin)}</span>
            </div>
            <div className={cx('detail-row')}>
              <span className={cx('detail-label')}>Nouvelle fin:</span>
              <span className={cx('detail-value', 'warning')}>{formatDate(details.nouvelle_date_fin)}</span>
            </div>
            <div className={cx('detail-row')}>
              <span className={cx('detail-label')}>Nouvelle reprise:</span>
              <span className={cx('detail-value', 'highlight')}>{formatDate(details.date_nouvelle_reprise)} à {details.heure_nouvelle_reprise?.substring(0,5)}</span>
            </div>
            <div className={cx('detail-row')}>
              <span className={cx('detail-label')}>Jours supplémentaires:</span>
              <span className={cx('detail-value')}>{details.duree_supplementaire} jours</span>
            </div>
          </div>
        </div>
      );
    }

    if (details.type === 'reprise_apte') {
      return (
        <div className={cx('action-details', 'reprise-apte')}>
          <div className={cx('action-details-header')}>
            <CheckCircle size={14} />
            <strong>Reprise - Apte</strong>
          </div>
          <div className={cx('action-details-content')}>
            <div className={cx('detail-row')}>
              <span className={cx('detail-value')}>L'agent a été déclaré apte lors de la visite de reprise</span>
            </div>
          </div>
        </div>
      );
    }

    if (details.type === 'inapte_definitif') {
      return (
        <div className={cx('action-details', 'inapte-definitif')}>
          <div className={cx('action-details-header')}>
            <XCircle size={14} />
            <strong>Inapte définitif</strong>
          </div>
          <div className={cx('action-details-content')}>
            <div className={cx('detail-row')}>
              <span className={cx('detail-value')}>L'agent a été déclaré inapte définitif</span>
            </div>
          </div>
        </div>
      );
    }

    if (details.type === 'inapte_temporaire' && !details.date_controle) {
      return (
        <div className={cx('action-details', 'inapte-temporaire')}>
          <div className={cx('action-details-header')}>
            <AlertCircle size={14} />
            <strong>Inapte temporaire</strong>
          </div>
          <div className={cx('action-details-content')}>
            <div className={cx('detail-row')}>
              <span className={cx('detail-label')}>Fin d'inaptitude:</span>
              <span className={cx('detail-value')}>{formatDate(details.date_fin_inaptitude)}</span>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // ========== FORMATAGE DES DÉTAILS HISTORIQUE ==========
  const formatHistoriqueDetails = (item) => {
    if (!item.details) return null;
    const details = item.details;
   
    if (item.type_action === 'REPROGRAMMEE') {
      return (
        <div className={cx('historique-details')}>
          <div className={cx('detail-text')}>
            📅 Ancienne: {formatDate(details.ancienne_date)} {details.ancienne_heure?.substring(0,5)}
          </div>
          <div className={cx('detail-text', 'highlight')}>
            🎯 Nouvelle: {formatDate(details.nouvelle_date)} {details.nouvelle_heure?.substring(0,5)}
          </div>
          <div className={cx('detail-text', 'info')}>
            🔧 Source: {details.source === 'auto' ? 'Automatique' : 'Manuelle'}
          </div>
          {details.raison && (
            <div className={cx('detail-text')}>
              📝 Motif: {details.raison}
            </div>
          )}
        </div>
      );
    }
   
    if (item.type_action === 'ANNULEE' && details?.raison === 'accident') {
      return (
        <div className={cx('historique-details')}>
          <div className={cx('detail-text', 'warning')}>
            ⚠️ Annulée suite à accident du {formatDate(details.date_accident)}
          </div>
          <div className={cx('detail-text', 'highlight')}>
            🎯 Nouvelle visite périodique: {formatDate(details.nouvelle_date)} {details.nouvelle_heure?.substring(0,5)}
          </div>
          <div className={cx('detail-text')}>
            📅 Visite de reprise: {formatDate(details.date_reprise)}
          </div>
        </div>
      );
    }
   
    if (details.type === 'prolongation_inaptitude') {
      return (
        <div className={cx('historique-details')}>
          <div className={cx('detail-text', 'warning')}>
            ⚠️ Prolongation de {details.duree_supplementaire} jours
          </div>
          <div className={cx('detail-text')}>
            📅 Ancienne fin: {formatDate(details.ancienne_date_fin_inaptitude)}
          </div>
          <div className={cx('detail-text', 'warning')}>
            📅 Nouvelle fin: {formatDate(details.nouvelle_date_fin_inaptitude)}
          </div>
          <div className={cx('detail-text', 'highlight')}>
            🎯 Prochaine reprise: {formatDate(details.date_prochaine_reprise)} {details.heure_prochaine_reprise?.substring(0,5)}
          </div>
        </div>
      );
    }
   
    if (details.type === 'reclassement_inapte_temp_avec_controle' || details.type === 'programmation_visite_controle') {
      return (
        <div className={cx('historique-details')}>
          <div className={cx('detail-text', 'warning')}>
            ⚠️ Inapte temporaire - {details.duree_inaptitude} jours
          </div>
          <div className={cx('detail-text')}>
            📅 Fin d'inaptitude: {formatDate(details.date_fin_inaptitude)}
          </div>
          <div className={cx('detail-text', 'highlight')}>
            🎯 Visite de contrôle: {formatDate(details.date_visite_controle)} {details.heure_visite_controle?.substring(0,5)}
          </div>
        </div>
      );
    }
   
    if (item.type_action === 'PROGRAMMATION' && details?.type === 'programmation_visite_controle') {
      return (
        <div className={cx('historique-details')}>
          <div className={cx('detail-text', 'info')}>
            🤖 Programmation automatique d'une visite de contrôle
          </div>
          <div className={cx('detail-text')}>
            📅 Suite à inaptitude temporaire jusqu'au {formatDate(details.date_fin_inaptitude)}
          </div>
          <div className={cx('detail-text', 'highlight')}>
            🎯 Visite de contrôle: {formatDate(details.date_visite_controle)} {details.heure_visite_controle?.substring(0,5)}
          </div>
        </div>
      );
    }
   
    return null;
  };

  const getDetailsDisplay = (item) => {
    if (!item.details) return null;
    const d = item.details;
   
    if (d.type === 'periodique_effectuee') {
      return (
        <div className={cx('historique-details')}>
          <div className={cx('detail-text')}>📅 Date: {formatDate(d.date_visite)} à {d.heure_visite}</div>
          <div className={cx('detail-text')}>👨‍⚕️ Médecin: {d.medecin}</div>
          <div className={cx('detail-text')}>📊 Résultat: <strong>{d.resultat}</strong></div>
          {d.observation && <div className={cx('detail-text', 'observation')}>📝 Observations: {d.observation}</div>}
          <div className={cx('detail-text', 'highlight')}>📅 Prochaine visite: {formatDate(d.prochaine_visite)} ({d.periodicite_texte})</div>
        </div>
      );
    }
   
    if (d.type === 'periodique_annulee_accident') {
      return (
        <div className={cx('historique-details')}>
          <div className={cx('detail-text', 'warning')}>🚑 Accident de travail: {formatDate(d.date_accident)}</div>
          <div className={cx('detail-text')}>📅 Fin d'arrêt: {formatDate(d.date_fin_inaptitude)}</div>
          <div className={cx('detail-text', 'highlight')}>🔄 Visite de reprise: {formatDate(d.date_reprise)}</div>
          <div className={cx('detail-text', 'highlight')}>📅 Nouvelle visite périodique: {formatDate(d.nouvelle_date_visite)} à {d.nouvelle_heure_visite?.substring(0,5)}</div>
        </div>
      );
    }
   
    if (d.type === 'reprise_apte') {
      return (
        <div className={cx('historique-details')}>
          <div className={cx('detail-text')}>📅 Date: {formatDate(d.date_visite)} à {d.heure_visite}</div>
          <div className={cx('detail-text')}>👨‍⚕️ Médecin: {d.medecin}</div>
          <div className={cx('detail-text', 'success')}>✅ Résultat: APTE - Reprise normale</div>
          {d.observation && <div className={cx('detail-text', 'observation')}>📝 Observations: {d.observation}</div>}
        </div>
      );
    }
   
    if (d.type === 'reprise_inapte_temp_prolongation') {
      return (
        <div className={cx('historique-details')}>
          <div className={cx('detail-text')}>📅 Date: {formatDate(d.date_visite)} à {d.heure_visite}</div>
          <div className={cx('detail-text')}>👨‍⚕️ Médecin: {d.medecin}</div>
          <div className={cx('detail-text', 'warning')}>⚠️ Résultat: INAPTE TEMPORAIRE</div>
          <div className={cx('detail-text')}>⏱️ Prolongation: {d.duree_supplementaire} jours supplémentaires</div>
          <div className={cx('detail-text')}>📅 Ancienne fin: {formatDate(d.ancienne_date_fin_inaptitude)}</div>
          <div className={cx('detail-text', 'warning')}>📅 Nouvelle fin: {formatDate(d.nouvelle_date_fin_inaptitude)}</div>
          <div className={cx('detail-text', 'highlight')}>🔄 Prochaine reprise: {formatDate(d.date_prochaine_reprise)} à {d.heure_prochaine_reprise}</div>
          {d.observation && <div className={cx('detail-text', 'observation')}>📝 Observations: {d.observation}</div>}
        </div>
      );
    }
   
    if (d.type === 'reclassement_inapte_temp_avec_controle') {
      return (
        <div className={cx('historique-details')}>
          <div className={cx('detail-text')}>📅 Date: {formatDate(d.date_visite)} à {d.heure_visite}</div>
          <div className={cx('detail-text')}>👨‍⚕️ Médecin: {d.medecin}</div>
          <div className={cx('detail-text', 'warning')}>⚠️ Résultat: INAPTE TEMPORAIRE</div>
          <div className={cx('detail-text')}>⏱️ Durée: {d.duree_inaptitude} jours</div>
          <div className={cx('detail-text')}>📅 Fin d'inaptitude: {formatDate(d.date_fin_inaptitude)}</div>
          <div className={cx('detail-text', 'highlight')}>🔄 Visite de contrôle: {formatDate(d.date_visite_controle)} à {d.heure_visite_controle}</div>
          {d.observation && <div className={cx('detail-text', 'observation')}>📝 Observations: {d.observation}</div>}
        </div>
      );
    }
   
    if (d.type === 'reclassement_apte') {
      return (
        <div className={cx('historique-details')}>
          <div className={cx('detail-text')}>📅 Date: {formatDate(d.date_visite)} à {d.heure_visite}</div>
          <div className={cx('detail-text')}>👨‍⚕️ Médecin: {d.medecin}</div>
          <div className={cx('detail-text', 'success')}>✅ Résultat: APTE</div>
          {d.observation && <div className={cx('detail-text', 'observation')}>📝 Observations: {d.observation}</div>}
        </div>
      );
    }
   
    if (d.type === 'reclassement_inapte_definitif') {
      return (
        <div className={cx('historique-details')}>
          <div className={cx('detail-text')}>📅 Date: {formatDate(d.date_visite)} à {d.heure_visite}</div>
          <div className={cx('detail-text')}>👨‍⚕️ Médecin: {d.medecin}</div>
          <div className={cx('detail-text', 'danger')}>❌ Résultat: INAPTE DÉFINITIF</div>
          {d.observation && <div className={cx('detail-text', 'observation')}>📝 Observations: {d.observation}</div>}
        </div>
      );
    }
   
    if (d.type === 'embauche_apte') {
      return (
        <div className={cx('historique-details')}>
          <div className={cx('detail-text')}>📅 Date: {formatDate(d.date_visite)} à {d.heure_visite}</div>
          <div className={cx('detail-text')}>👨‍⚕️ Médecin: {d.medecin}</div>
          <div className={cx('detail-text', 'success')}>✅ Résultat: APTE - Agent embauché</div>
          <div className={cx('detail-text', 'highlight')}>📅 Prochaine visite périodique: {formatDate(d.prochaine_visite)} ({d.periodicite_texte})</div>
          {d.observation && <div className={cx('detail-text', 'observation')}>📝 Observations: {d.observation}</div>}
        </div>
      );
    }
   
    return null;
  };

  // ========== GESTION CARTES ==========
  const toggleCardExpand = (id) => {
    const newExpanded = new Set(expandedCards);
    const isExpanding = !newExpanded.has(id);
   
    if (isExpanding) {
      fetchVisiteDetails(id);
    }
   
    newExpanded.has(id) ? newExpanded.delete(id) : newExpanded.add(id);
    setExpandedCards(newExpanded);
  };

  // ========== GÉNÉRATION PLANNING ==========
  const handleGenererPlanning = () => {
    let semaineCible = semaineCourante.numero + 1;
    let anneeCible = semaineCourante.annee;
    if (semaineCible > 52) { semaineCible = 1; anneeCible++; }
    const lundiCible = getLundiSemaine(semaineCible, anneeCible);
   
    setGenerationData({ semaineCible, anneeCible, lundiCible });
    setShowGenererPlanningModal(true);
  };

  const confirmerGenererPlanning = async () => {
    const { semaineCible, anneeCible, lundiCible } = generationData;
    setGenerationLoading(true);
    setShowGenererPlanningModal(false);
   
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/generer`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dateDebut: lundiCible })
      });
      const data = await res.json();
      if (data.success) {
        showNotification({ type: 'success', title: '✅ Planning généré', message: `${data.planning?.length || 0} visite(s) générée(s) pour la semaine ${semaineCible}/${anneeCible}` });
        setSemaineCourante({ numero: semaineCible, annee: anneeCible, dateDebut: lundiCible });
        await fetchPlanningSemaine();
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de la génération' });
    } finally { setGenerationLoading(false); }
  };

  // ========== REPROGRAMMATION ==========
  const verifierDisponibiliteCreneau = async (date, heure, idPlanningExclu) => {
    try {
      const token = localStorage.getItem('token');
      const url = `${process.env.REACT_APP_API_URL}/api/planning/verifier-disponibilite-creneau?date=${date}&heure=${heure}&id_planning_exclu=${idPlanningExclu}`;
      const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await response.json();
      return { disponible: data.disponible === true, message: data.message };
    } catch (error) {
      console.error('Erreur vérification disponibilité:', error);
      return { disponible: false, message: 'Erreur de vérification' };
    }
  };

  const handleReprogrammerManuel = (item) => {
    setPlanningToReprogram(item);
    setNouvelleDate('');
    setNouvelleHeure('');
    setReprogramMotif('');
    setReprogramSource('manuel');
    setShowReprogramModal(true);
  };

  const handleReprogrammerAuto = (item) => {
    setAutoReprogramItem(item);
    setShowAutoReprogramModal(true);
  };

  const confirmerReprogrammationAuto = async () => {
    if (!autoReprogramItem) return;
    setAutoReprogramLoading(true);
    setShowAutoReprogramModal(false);
   
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/${autoReprogramItem.id_planning}/reprogrammer-auto`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showNotification({ type: 'success', title: '✅ Visite reprogrammée', message: `Nouvelle date: ${data.data.nouvelle_date} à ${data.data.nouvelle_heure?.substring(0,5)}` });
        setTimeout(() => fetchPlanningSemaine(), 500);
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur de connexion' });
    } finally {
      setAutoReprogramLoading(false);
      setAutoReprogramItem(null);
    }
  };

  const confirmerReprogrammation = async () => {
    if (!planningToReprogram) return;
    if (!nouvelleDate || !nouvelleHeure) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Nouvelle date et heure requises' });
      return;
    }
    if (!reprogramMotif?.trim()) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Motif requis' });
      return;
    }

    setReprogramLoading(true);
    const result = await verifierDisponibiliteCreneau(nouvelleDate, nouvelleHeure, planningToReprogram.id_planning);
   
    if (!result.disponible) {
      let title = '⚠️ Créneau non disponible';
      if (result.message.includes('EFFECTUÉE')) title = '❌ Visite déjà effectuée';
      else if (result.message.includes('ANNULÉE')) title = '❌ Visite annulée';
      else if (result.message.includes('REPORTÉE')) title = '⚠️ Visite reportée';
      else if (result.message.includes('BLOQUÉ')) title = '🔒 Créneau bloqué';
      else if (result.message.includes('PROGRAMMÉ')) title = '📅 Créneau déjà programmé';
     
      showNotification({ type: 'error', title: title, message: result.message });
      setReprogramLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/${planningToReprogram.id_planning}/reprogrammer`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nouvelle_date: nouvelleDate, nouvelle_heure: nouvelleHeure, motif: reprogramMotif, source: reprogramSource })
      });
      const data = await res.json();
      if (data.success) {
        showNotification({ type: 'success', title: '✅ Visite reprogrammée', message: `Reprogrammée au ${nouvelleDate} à ${nouvelleHeure}` });
        setShowReprogramModal(false);
        await fetchPlanningSemaine();
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

  // ========== ENREGISTREMENT VISITE ==========
  const handleEnregistrerVisite = (item) => {
    setVisiteToComplete(item);
    setVisiteFormData({ medecin: 'Dr. Mahmoud Khelifi', resultat: 'Apte', observation: '', duree_inaptitude: 30 });
    setShowVisiteModal(true);
  };

  const confirmerEnregistrementVisite = async () => {
    if (!visiteToComplete) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/${visiteToComplete.id_planning}/effectuer`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(visiteFormData)
      });
      const data = await res.json();
      if (data.success) {
        showNotification({ type: 'success', title: '✅ Visite effectuée', message: 'Visite enregistrée avec succès' });
        setShowVisiteModal(false);
        setVisiteToComplete(null);
        fetchPlanningSemaine();
        fetchAgents();
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'enregistrement' });
    }
  };

  // ========== ANNULATION ==========
  const handleAnnulerVisite = (item) => {
    if (item.type_visite !== 'Reprise') {
      showNotification({ type: 'warning', title: '⚠️ Action non autorisée', message: 'Seules les visites de reprise peuvent être annulées' });
      return;
    }
    setPlanningToAnnuler(item);
    setAnnulationMotif('');
    setShowAnnulationModal(true);
  };

  const confirmerAnnulation = async () => {
    if (!planningToAnnuler || !annulationMotif?.trim()) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Motif requis' });
      return;
    }
    setAnnulationLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/${planningToAnnuler.id_planning}/annuler`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ motif: annulationMotif })
      });
      const data = await res.json();
      if (data.success) {
        showNotification({ type: 'success', title: '✅ Visite annulée', message: 'Visite annulée avec succès' });
        setShowAnnulationModal(false);
        setPlanningToAnnuler(null);
        fetchPlanningSemaine();
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'annulation' });
    } finally { setAnnulationLoading(false); }
  };

  // ========== CONVOCATIONS ==========
  const handleEnvoyerConvocation = (item) => {
    setConvocationToSend(item);
    setShowConvocationModal(true);
  };

  const confirmerEnvoiConvocation = async () => {
    if (!convocationToSend) return;
    setConvocationLoading(true);
    setShowConvocationModal(false);
   
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/envoyer-convocation`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_planning: convocationToSend.id_planning })
      });
      const data = await res.json();
      if (data.success) {
        showNotification({ type: 'success', title: '📧 Convocation envoyée', message: `Convocation envoyée pour ${getAgentNom(convocationToSend.matricule_agent)}` });
        fetchPlanningSemaine();
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'envoi' });
    } finally {
      setConvocationLoading(false);
      setConvocationToSend(null);
    }
  };

  const handleEnvoyerToutesConvocations = () => {
    const aEnvoyer = planning.filter(p =>
      !p.convocation_envoyee &&
      p.statut === 'Programmé' &&
      !p.visite_effectuee &&
      (p.type_visite === 'Périodique' || p.type_visite === 'Reprise')
    );
    if (aEnvoyer.length === 0) {
      showNotification({ type: 'info', title: 'ℹ️ Info', message: 'Aucune convocation à envoyer (uniquement Périodique et Reprise)' });
      return;
    }
    setGroupeConvocationCount(aEnvoyer.length);
    setShowGroupeConvocationModal(true);
  };

  const confirmerEnvoiToutesConvocations = async () => {
    const aEnvoyer = planning.filter(p =>
      !p.convocation_envoyee &&
      p.statut === 'Programmé' &&
      !p.visite_effectuee &&
      (p.type_visite === 'Périodique' || p.type_visite === 'Reprise')
    );
    if (aEnvoyer.length === 0) return;
   
    setGroupeConvocationLoading(true);
    setShowGroupeConvocationModal(false);
   
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/envoyer-convocations-groupees`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids_planning: aEnvoyer.map(p => p.id_planning) })
      });
      const data = await res.json();
      if (data.success) {
        showNotification({ type: 'success', title: '📧 Convocations envoyées', message: `${aEnvoyer.length} convocation(s) envoyée(s) au GRH` });
        fetchPlanningSemaine();
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'envoi' });
    } finally {
      setGroupeConvocationLoading(false);
    }
  };

  // ========== GESTION INDISPONIBILITÉ ==========
  // ========== GESTION INDISPONIBILITÉ (AVEC VÉRIFICATION DU DÉLAI) ==========
const handleIndisponible = (item) => {
  // Vérifier si l'agent a déclaré son indisponibilité en avance (>= J-2)
  const dateVisite = new Date(item.date_visite);
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
 
  // Calculer la différence en jours (sans tenir compte des heures)
  const diffTime = dateVisite.getTime() - aujourdhui.getTime();
  const diffJours = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
 
  console.log('📅 Vérification délai indisponibilité:');
  console.log(`   Date visite: ${item.date_visite}`);
  console.log(`   Aujourd'hui: ${aujourdhui.toISOString().split('T')[0]}`);
  console.log(`   Différence: ${diffJours} jours`);
 
  // Si la visite est aujourd'hui (J0) ou demain (J1) ou déjà passée (J-1, J-2...)
  if (diffJours < 2) {
    let message = '';
    let titre = '❌ Action impossible';
   
    if (diffJours === 1) {
      message = `⚠️ Impossible de déclarer l'indisponibilité pour une visite prévue DEMAIN (J-1).\n\n` +
                `📋 Règle: La déclaration d'indisponibilité doit être faite au moins 2 jours ouvrables avant la visite.\n\n` +
                `🔄 Pour gérer une absence pour demain, utilisez les boutons:\n` +
                `   • "Reprogrammer" (choisir manuellement une nouvelle date)\n` +
                `   • "Auto" (reprogrammation automatique)`;
    } else if (diffJours === 0) {
      message = `⚠️ Impossible de déclarer l'indisponibilité pour une visite prévue AUJOURD'HUI (J-0).\n\n` +
                `📋 Règle: La déclaration d'indisponibilité doit être faite au moins 2 jours avant la visite.\n\n` +
                `🔄 Pour gérer une absence aujourd'hui, utilisez les boutons:\n` +
                `   • "Reprogrammer" (choisir manuellement une nouvelle date)\n` +
                `   • "Auto" (reprogrammation automatique)`;
    } else if (diffJours < 0) {
      const joursPasses = Math.abs(diffJours);
      message = `⚠️ Impossible de déclarer l'indisponibilité pour une visite qui a eu lieu il y a ${joursPasses} jour(s).\n\n` +
                `📋 Cette visite est déjà passée.\n\n` +
                `🔄 Si la visite n'a pas été effectuée, utilisez le bouton "Reprogrammer" ou "Auto" pour la reporter.`;
    }
   
    showNotification({
      type: 'error',
      title: titre,
      message: message,
      duration: 8000
    });
    return;
  }
 
  // Si délai OK (>= J-2), ouvrir le modal
  console.log('✅ Délai respecté (>= J-2) - Ouverture du modal');
  setPlanningIndisponible(item);
  setNouvelleDate('');
  setNouvelleHeure('');
  setReprogramMotif('');
  setIndisponibleMode('manuel');
  setReaffectationInfo(null);
  setShowIndisponibleModal(true);
  setMoisActuelReprog(new Date().getMonth());
  setAnneeActuelleReprog(new Date().getFullYear());
  setJoursDisponiblesReprog([]);
  setCreneauxDisponiblesReprog([]);
  chargerJoursDisponiblesReprog(new Date().getMonth(), new Date().getFullYear(), item.matricule_agent);
};

  const confirmerIndisponible = async () => {
    if (!planningIndisponible) return;
   
    if (indisponibleMode === 'manuel' && (!nouvelleDate || !nouvelleHeure)) {
      showNotification({ type: 'error', title: '❌', message: 'Date et heure requises pour le mode manuel' });
      return;
    }
   
    if (!reprogramMotif?.trim()) {
      showNotification({ type: 'error', title: '❌', message: 'Motif requis' });
      return;
    }

    setIndisponibleLoading(true);
    try {
      const token = localStorage.getItem('token');
      const body = {
        motif: reprogramMotif,
        mode: indisponibleMode
      };
     
      if (indisponibleMode === 'manuel') {
        body.nouvelle_date = nouvelleDate;
        body.nouvelle_heure = nouvelleHeure;
      }
     
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/${planningIndisponible.id_planning}/reprogrammer-indisponible`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
     
      const data = await response.json();
     
      if (data.success) {
        let message = data.message;
        if (data.data?.reaffectation) {
          message += ` → Remplaçant: ${data.data.reaffectation.agent.nom} ${data.data.reaffectation.agent.prenom}`;
        }
        showNotification({ type: 'success', title: '✅', message: message });
        setShowIndisponibleModal(false);
        setPlanningIndisponible(null);
        fetchPlanningSemaine();
      } else {
        showNotification({ type: 'error', title: '❌', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌', message: 'Erreur de connexion' });
    } finally {
      setIndisponibleLoading(false);
    }
  };

  // ========== NAVIGATION ==========
  const changerSemaine = (direction) => {
    let nouveauNumero = semaineCourante.numero + direction;
    let nouvelleAnnee = semaineCourante.annee;
    if (nouveauNumero < 1) { nouveauNumero = 52; nouvelleAnnee--; }
    else if (nouveauNumero > 52) { nouveauNumero = 1; nouvelleAnnee++; }
    setSemaineCourante({ numero: nouveauNumero, annee: nouvelleAnnee, dateDebut: getLundiSemaine(nouveauNumero, nouvelleAnnee) });
  };

  // ========== FILTRES & STATS ==========
  const filteredPlanning = useMemo(() => planning.filter(item => {
    if (selectedAgentFilter && item.matricule_agent !== selectedAgentFilter) return false;
    if (selectedTypeFilter && item.type_visite !== selectedTypeFilter) return false;
    if (selectedStatusFilter === 'effectue' && !item.visite_effectuee) return false;
    if (selectedStatusFilter === 'programme' && (item.visite_effectuee || item.statut !== 'Programmé')) return false;
    if (selectedStatusFilter === 'reporte' && item.statut !== 'Reporté') return false;
    if (selectedStatusFilter === 'annule' && item.statut !== 'Annulé') return false;
    if (searchTerm) {
      const nom = getAgentNom(item.matricule_agent).toLowerCase();
      if (!nom.includes(searchTerm.toLowerCase()) && !item.matricule_agent.toString().includes(searchTerm)) return false;
    }
    return true;
  }), [planning, selectedAgentFilter, selectedTypeFilter, selectedStatusFilter, searchTerm, getAgentNom]);

  const stats = useMemo(() => ({
    total: planning.length,
    programme: planning.filter(p => p.statut === 'Programmé' && !p.visite_effectuee).length,
    effectue: planning.filter(p => p.visite_effectuee).length,
    reporte: planning.filter(p => p.statut === 'Reporté').length,
    annule: planning.filter(p => p.statut === 'Annulé').length,
    convocationsEnvoyees: planning.filter(p => p.convocation_envoyee).length,
    convocationsRestantes: planning.filter(p =>
      !p.convocation_envoyee &&
      p.statut === 'Programmé' &&
      !p.visite_effectuee &&
      (p.type_visite === 'Périodique' || p.type_visite === 'Reprise')
    ).length
  }), [planning]);

  // ========== COMPOSANT HISTORIQUE POPUP ==========
  const HistoriquePopup = ({ visite, onClose }) => {
    if (!visite?.historique?.length) {
      return (
        <div className={cx('historique-popup')}>
          <div className={cx('popup-header')}>
            <h4><History size={16} /> Historique des actions</h4>
            <button onClick={onClose}><X size={14} /></button>
          </div>
          <div className={`${cx('popup-content')} empty`}>
            <History size={48} />
            <p>Aucun historique disponible pour cette visite</p>
          </div>
        </div>
      );
    }

    const groupedHistory = visite.historique.reduce((acc, item) => {
      const date = new Date(item.date_action).toLocaleDateString('fr-FR');
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    }, {});

    return (
      <div className={cx('historique-popup')}>
        <div className={cx('popup-header')}>
          <h4><History size={16} /> Historique des actions</h4>
          <div className={cx('popup-header-right')}>
            <Badge variant="info" size="sm">{visite.historique.length} action(s)</Badge>
            <button onClick={onClose}><X size={14} /></button>
          </div>
        </div>
       
        <div className={cx('popup-content')}>
          {Object.entries(groupedHistory).map(([date, items]) => (
            <div key={date} className={cx('historique-groupe')}>
              <div className={cx('historique-groupe-date')}>
                <Calendar size={12} />
                <span>{date}</span>
              </div>
              <div className={cx('historique-items')}>
                {items.map((item, idx) => (
                  <div key={idx} className={cx('historique-item')}>
                    <div className={cx('historique-item-header')}>
                      <div className={`${cx('historique-action-badge')} ${item.type_action?.toLowerCase()}`}>
                        {item.type_action === 'PROGRAMMATION' && '📅 Programmation'}
                        {item.type_action === 'EFFECTUEE' && '✅ Effectuée'}
                        {item.type_action === 'REPROGRAMMEE' && '🔄 Reprogrammation'}
                        {item.type_action === 'ANNULEE' && '❌ Annulation'}
                        {item.type_action === 'REAFFECTEE' && '👥 Réaffectation'}
                        {item.type_action === 'SAISIE_MANUELLE' && '✏️ Saisie manuelle'}
                      </div>
                      <div className={cx('historique-time')}>
                        <Clock size={10} />
                        <span>{new Date(item.date_action).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                   
                    {item.message_formate && (
                      <div className={cx('historique-message')}>
                        {item.message_formate}
                      </div>
                    )}
                   
                    {getDetailsDisplay(item)}
                    {!getDetailsDisplay(item) && formatHistoriqueDetails(item)}
                   
                    {!formatHistoriqueDetails(item) && item.type_action === 'EFFECTUEE' && (
                      <div className={cx('historique-details')}>
                        {item.resultat && (
                          <div className={cx('detail-badge', item.resultat === 'Apte' ? 'success' : 'danger')}>
                            {item.resultat === 'Apte' ? '✅ Apte' : item.resultat === 'Inapte temporaire' ? '⚠️ Inapte temporaire' : '❌ Inapte définitif'}
                          </div>
                        )}
                        {item.medecin && item.medecin !== 'Système' && (
                          <div className={cx('detail-text')}><User size={10} /> {item.medecin}</div>
                        )}
                        {item.observation && (
                          <div className={cx('detail-text', 'observation')}><FileText size={10} /> {item.observation}</div>
                        )}
                      </div>
                    )}
                   
                    {!formatHistoriqueDetails(item) && item.type_action === 'ANNULEE' && item.motif_action && (
                      <div className={cx('historique-details')}>
                        <div className={cx('detail-text', 'danger')}>
                          <AlertCircle size={10} /> Motif: {item.motif_action}
                        </div>
                      </div>
                    )}
                   
                    {item.motif_action && item.type_action !== 'ANNULEE' && !item.message_formate?.includes(item.motif_action) && !formatHistoriqueDetails(item) && (
                      <div className={cx('historique-motif')}>
                        <FileText size={10} /> {item.motif_action}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
       
        <div className={cx('popup-footer')}>
          <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
        </div>
      </div>
    );
  };

  // ========== COMPOSANT VISIT CARD ==========
  const VisitCard = ({ visite }) => {
    const isExpanded = expandedCards.has(visite.id_planning);
    const agent = getAgentDetails(visite.matricule_agent);
    const actionDetailsDisplay = getActionDetailsDisplay(visite);
   
    const shouldShow = (value) => {
      return value !== null && value !== undefined && value !== 0 && value !== '';
    };

    return (
      <div className={getCardClassName(visite)}>
        <div className={cx('visit-card-header')}>
          <div className={cx('visit-card-header-left')}>
            <div className={cx('agent-avatar')}>
              <span>
                {(() => {
                  const nom = getAgentNom(visite.matricule_agent);
                  if (!nom || nom === 'Agent inconnu' || nom === 'Agent 0') return '?';
                  const parts = nom.split(' ');
                  return parts.map(n => n[0]).join('').slice(0, 2);
                })()}
              </span>
            </div>
            <div>
              <div className={cx('agent-name')}>
                {getAgentNom(visite.matricule_agent).replace('Agent 0', 'Agent ?')}
              </div>
              <div className={cx('agent-matricule')}>
                {visite.matricule_agent ? `#${visite.matricule_agent}` : '#?'}
              </div>
            </div>
          </div>
          <div className={cx('visit-card-header-right')}>
            {getStatusBadge(visite.statut, visite.visite_effectuee, visite.creneau_bloque)}
            <button className={cx('card-expand-btn')} onClick={() => toggleCardExpand(visite.id_planning)}>
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>
       
        <div className={cx('visit-card-body')}>
          <div className={cx('visit-datetime')}>
            <div><Calendar size={14} /> {formatDate(visite.date_visite)}</div>
            <div><Clock size={14} /> {visite.heure_visite?.substring(0,5)}</div>
          </div>
         
          <div className={cx('visit-badges')}>
            {getTypeVisiteBadge(visite.type_visite)}
            {getPeriodiciteBadge(visite.matricule_agent)}
            {getSourceBadge(visite.source_planification, visite.motif_reprogrammation)}
            {visite.convocation_envoyee && <Badge variant="success" icon={Mail}>Convocation envoyée</Badge>}
          </div>
         
          {agent && shouldShow(agent.code_agence) && (
            <div className={cx('visit-details')}>
              <span><Building size={12} /> Agence {agent.code_agence}</span>
              <span className={cx('visit-details-separator')}>•</span>
              <span><History size={12} /> Dernière visite: {getDerniereVisite(visite.matricule_agent)}</span>
            </div>
          )}
         
          {actionDetailsDisplay && (
            <div className={cx('action-details-wrapper')}>
              {actionDetailsDisplay}
            </div>
          )}
         
          {visite.reprogrammee && visite.creneau_bloque && !actionDetailsDisplay && (
            <div className={cx('reprogram-info')}>
              <div><RefreshCw size={12} /> <strong>Reprogrammé</strong></div>
              {shouldShow(visite.motif_reprogrammation) && <div><FileText size={10} /> {visite.motif_reprogrammation}</div>}
              {visite.nouvelle_date_visite && <div><Calendar size={10} /> Nouveau: {formatDate(visite.nouvelle_date_visite)} {visite.nouvelle_heure_visite?.substring(0,5)}</div>}
            </div>
          )}

          {visite.motif_annulation && (
            <div className={cx('annulation-motif')}>
              <AlertCircle size={12} />
              <span>Motif: {visite.motif_annulation}</span>
            </div>
          )}
          {visite.info_suppression && (
          <div className={cx('info-suppression')}>
            <AlertCircle size={14} style={{ color: '#f59e0b' }} />
            <span>{visite.info_suppression.message}</span>
          </div>
        )}
        </div>
       
        <div className={cx('visit-card-actions')}>
  {!visite.visite_effectuee && visite.statut === 'Programmé' && !visite.creneau_bloque && (
    <>
      <Button variant="success" size="sm" icon={CheckCircle} onClick={() => handleEnregistrerVisite(visite)}>Effectuer</Button>
      <Button variant="warning" size="sm" icon={Calendar} onClick={() => handleReprogrammerManuel(visite)}>Reprogrammer</Button>
      <Button variant="info" size="sm" icon={Zap} onClick={() => handleReprogrammerAuto(visite)}>Auto</Button>
     
      {/* ✅ MODIFIER ICI - Ajouter la condition */}
      {typesAutorisesIndisponible.includes(visite.type_visite) && (
        <Button
          variant="warning"
          size="sm"
          icon={AlertCircle}
          onClick={() => handleIndisponible(visite)}
          title="Déclaration d'indisponibilité (uniquement si déclarée au moins 2 jours avant la visite)"
        >
          Indisponible
        </Button>
      )}
     
      {visite.type_visite === 'Reprise' && (
        <Button variant="danger" size="sm" icon={XCircle} onClick={() => handleAnnulerVisite(visite)}>Annuler</Button>
      )}
    </>
  )}

         
          {!visite.visite_effectuee && visite.statut === 'Programmé' && !visite.convocation_envoyee && !visite.creneau_bloque &&
           (visite.type_visite === 'Périodique' || visite.type_visite === 'Reprise') && (
            <>
              <Button variant="info" size="sm" icon={Eye} onClick={() => { setConvocationToPreview(visite); setShowConvocationPreview(true); }}>Aperçu</Button>
              <Button variant="success" size="sm" icon={Mail} onClick={() => handleEnvoyerConvocation(visite)}>Envoyer</Button>
            </>
          )}
         
         
        </div>
       
        {visite.visite_effectuee && (
          <div className={cx('visit-completed-badge')}>
            <CheckCircle size={14} /> Effectuée le {formatDate(visite.date_visite)}
          </div>
        )}
      </div>
    );
  };

  // ========== RENDU PRINCIPAL ==========
  return (
    <div className={cx('planning-page')}>
      {/* NOTIFICATION */}
      {notification.show && (
        <div className={`${cx('notification-container')} ${notification.type}`}>
          <div className={cx('notification-content')}>
            <div className={cx('notification-icon')}>
              {notification.type === 'success' && <CheckCircle size={24} />}
              {notification.type === 'error' && <XCircle size={24} />}
              {notification.type === 'warning' && <AlertCircle size={24} />}
              {notification.type === 'info' && <Info size={24} />}
            </div>
            <div>
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
            </div>
            <button onClick={() => setNotification({...notification, show: false})}><X size={16} /></button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className={cx('planning-header')}>
        <div className={cx('header-left')}>
          <div className={cx('header-icon-wrapper')}>
            <Stethoscope size={32} strokeWidth={1.5} />
          </div>
          <div>
            <h1>Planning des visites médicales</h1>
            <div className={cx('header-subtitle')}>
              <span>Semaine {semaineCourante.numero} • {semaineCourante.annee}</span>
              <span>{formatDate(datesSemaine[0])} - {formatDate(datesSemaine[datesSemaine.length - 1])}</span>
            </div>
          </div>
        </div>
        <div className={cx('header-right')}>
  <div className={cx('week-navigation')}>
    <button className={cx('week-nav-btn')} onClick={() => changerSemaine(-1)}><ChevronLeft size={18} /></button>
    <div className={cx('week-display')}>
      <span className={cx('week-label')}>Semaine</span>
      <span className={cx('week-number')}>{semaineCourante.numero}</span>
    </div>
    <button className={cx('week-nav-btn')} onClick={() => changerSemaine(1)}><ChevronRight size={18} /></button>
  </div>
 
  <div className={cx('search-bar')}>
    <Search size={16} />
    <input type="text" placeholder="Rechercher un agent..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
    {searchTerm && <button onClick={() => setSearchTerm('')}><X size={14} /></button>}
  </div>
 
  <Button variant={showFilters ? 'primary' : 'outline'} icon={Filter} onClick={() => setShowFilters(!showFilters)}>Filtres</Button>
  {stats.convocationsRestantes > 0 && (
    <Button variant="success" icon={Mail} onClick={handleEnvoyerToutesConvocations}>Envoyer {stats.convocationsRestantes} convoc.</Button>
  )}
  <Button variant="primary" icon={RefreshCw} loading={generationLoading} onClick={handleGenererPlanning}>Générer semaine suivante</Button>
</div>
      </div>

      {/* FILTRES */}
      {showFilters && (
        <div className={cx('filters-panel')}>
          <div className={cx('filters-header')}>
            <h4><Sliders size={16} /> Filtres avancés</h4>
            <button className={cx('clear-filters')} onClick={() => { setSelectedAgentFilter(''); setSelectedTypeFilter(''); setSelectedStatusFilter(''); setSearchTerm(''); }}>
              <X size={14} /> Tout effacer
            </button>
          </div>
          <div className={cx('filters-body')}>
  <div className={cx('filter-agent')}>
  <label>Agent</label>
  <div style={{ position: 'relative' }}>
    <AgentSearchInput
      value={selectedAgentFilter}
      onChange={(matricule) => setSelectedAgentFilter(matricule)}
      onSelect={(agent) => setSelectedAgentFilter(agent?.matricule_agent || '')}
      placeholder="Rechercher un agent..."
    />
  </div>
</div>

  <select value={selectedTypeFilter} onChange={(e) => setSelectedTypeFilter(e.target.value)}>
    <option value="">Tous les types</option>
    <option value="Périodique">Périodique</option>
    <option value="Reprise">Reprise</option>
    <option value="Reclassement">Reclassement</option>
    <option value="Embauche">Embauche</option>
  </select>
  <select value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)}>
    <option value="">Tous les statuts</option>
    <option value="programme">Programmé</option>
    <option value="effectue">Effectué</option>
    <option value="reporte">Reporté</option>
    <option value="annule">Annulé</option>
  </select>
</div>
        </div>
      )}

      {/* STATS */}
      <div className={cx('stats-grid')}>
        <StatCard title="Total visites" value={stats.total} icon={Calendar} variant="primary" />
        <StatCard title="Programmées" value={stats.programme} icon={Clock} variant="warning" />
        <StatCard title="Effectuées" value={stats.effectue} icon={CheckCircle} variant="success" />
        <StatCard title="Reportées" value={stats.reporte} icon={RefreshCw} variant="warning" />
        <StatCard title="Annulées" value={stats.annule} icon={XCircle} variant="danger" />
        <StatCard title="Convocations" value={stats.convocationsEnvoyees} icon={Mail} variant="info" />
      </div>

      

      {/* PLANNING GRID */}
      {loading ? (
        <div className={cx('loading-state')}>
          <div className={cx('spinner')}></div>
          <p>Chargement du planning...</p>
        </div>
      ) : filteredPlanning.length === 0 ? (
        <div className={cx('empty-state')}>
          <Calendar size={64} strokeWidth={1} />
          <h3>Aucune visite pour cette semaine</h3>
          <p>Générez le planning pour la semaine suivante ou modifiez les filtres.</p>
          <Button variant="primary" icon={RefreshCw} onClick={handleGenererPlanning}>Générer le planning</Button>
        </div>
      ) : (
        <div className={cx('planning-grid')}>
          <div className={`${cx('planning-row')} header`}>
            <div className={`${cx('planning-cell')} time-cell`}><Clock size={16} /><span>Horaire</span></div>
            {joursSemaine.map((jour, i) => (
              <div key={jour} className={`${cx('planning-cell')} day-cell`}>
                <div className={cx('jour-label')}>{jour}</div>
                <div className={cx('date-label')}>{formatDate(datesSemaine[i])}</div>
              </div>
            ))}
          </div>
          {creneaux.map((creneau, cIdx) => (
            <div key={cIdx} className={cx('planning-row')}>
              <div className={`${cx('planning-cell')} time-cell`}>
                <span>{creneauxAffichage[cIdx]}</span>
              </div>
              {datesSemaine.map((dateStr, dIdx) => {
                const visite = filteredPlanning.find(v => v.date_visite === dateStr && v.heure_visite === creneau);
                const bloque = planning.find(v => v.date_visite === dateStr && v.heure_visite === creneau && v.creneau_bloque);
                const vide = planning.find(v => v.date_visite === dateStr && v.heure_visite === creneau && v.matricule_agent === 0);
               
                return (
                  <div key={dIdx} className={cx('planning-cell')}>
                    {visite && visite.matricule_agent !== 0 ? (
                      <VisitCard visite={visite} />
                    ) : bloque ? (
                      <div className={cx('blocked-slot')}><Lock size={20} /><span>Bloqué</span></div>
                    ) : vide ? (
  <div className={cx('empty-slot', 'libre')}>
    <Clock size={20} />
    <span>Libéré</span>
    <Button
      variant="success"
      size="sm"
      icon={UserPlus}
      onClick={() => handleReaffecterCreneau(dateStr, creneau, vide.id_planning)}
      style={{ marginTop: 8 }}
    >
      Réaffecter
    </Button>
  </div>
) : (
  <div className={cx('empty-slot')}>
    <Clock size={20} />
    <span>Disponible</span>
  </div>
)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* MODALES - À conserver telles quelles */}
      {showGenererPlanningModal && (
        <div className={cx('modal-overlay')} onClick={() => setShowGenererPlanningModal(false)}>
          <div className={`${cx('modal-content')} small`} onClick={e => e.stopPropagation()}>
            <div className={`${cx('modal-header')} primary`}>
              <div className={cx('header-icon')}><RefreshCw size={24} /></div>
              <h2>Générer le planning</h2>
              <button className={cx('modal-close')} onClick={() => setShowGenererPlanningModal(false)}><X size={18} /></button>
            </div>
            <div className={cx('modal-body')}>
              <div className={cx('confirmation-info')}>
                <div className={cx('info-icon')}><Calendar size={48} strokeWidth={1} /></div>
                <h3>Semaine {generationData.semaineCible}/{generationData.anneeCible}</h3>
                <p>À partir du {formatDate(generationData.lundiCible)}</p>
                <div className={`${cx('info-message')} info`}>
                  <Info size={16} />
                  <span>Le planning sera généré automatiquement selon les règles de périodicité et les disponibilités.</span>
                </div>
              </div>
            </div>
            <div className={cx('modal-footer')}>
              <Button variant="secondary" onClick={() => setShowGenererPlanningModal(false)}>Annuler</Button>
              <Button variant="primary" icon={RefreshCw} onClick={confirmerGenererPlanning}>Générer</Button>
            </div>
          </div>
        </div>
      )}

      {showReprogramModal && planningToReprogram && (
  <div className={cx('modal-overlay')} onClick={() => setShowReprogramModal(false)}>
    <div className={cx('modal-content')} onClick={e => e.stopPropagation()}>
      <div className={`${cx('modal-header')} warning`}>
        <Calendar size={24} />
        <h2>Reprogrammer la visite</h2>
        <button className={cx('modal-close')} onClick={() => setShowReprogramModal(false)}><X size={18} /></button>
      </div>
      <div className={cx('modal-body')}>
        <div className={cx('current-visite-info')}>
          <p><strong>Agent:</strong> {getAgentNom(planningToReprogram.matricule_agent)}</p>
          <p><strong>Type:</strong> {planningToReprogram.type_visite}</p>
          <p><strong>Actuelle:</strong> {formatDate(planningToReprogram.date_visite)} à {planningToReprogram.heure_visite?.substring(0,5)}</p>
        </div>
       
        <div className={cx('form-group', 'full-width')}>
          <label><Calendar size={14} /> Nouvelle date *</label>
          <div className={cx('mois-navigation')}>
            <button type="button" onClick={() => {
              let newMois = moisActuelReprog - 1;
              let newAnnee = anneeActuelleReprog;
              if (newMois < 0) { newMois = 11; newAnnee--; }
              setMoisActuelReprog(newMois);
              setAnneeActuelleReprog(newAnnee);
              chargerJoursDisponiblesReprog(newMois, newAnnee, planningToReprogram.matricule_agent);
            }}>◀</button>
            <span>{new Date(anneeActuelleReprog, moisActuelReprog).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</span>
            <button type="button" onClick={() => {
              let newMois = moisActuelReprog + 1;
              let newAnnee = anneeActuelleReprog;
              if (newMois > 11) { newMois = 0; newAnnee++; }
              setMoisActuelReprog(newMois);
              setAnneeActuelleReprog(newAnnee);
              chargerJoursDisponiblesReprog(newMois, newAnnee, planningToReprogram.matricule_agent);
            }}>▶</button>
          </div>
         
          {loadingReprogJours ? (
            <div className={cx('loading-creneaux')}>Chargement des jours disponibles...</div>
          ) : (
            <div className={cx('calendrier-jours')}>
              {joursDisponiblesReprog.map(jour => {
                const [year, month, day] = jour.date.split('-');
                const jourNum = parseInt(day);
                const dateObj = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
                const jourSemaine = dateObj.getUTCDay();
                const joursSemaine = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                if (jourSemaine === 0 || jourSemaine === 1 || jourSemaine === 6) return null;
                return (
                  <button
                    key={jour.date}
                    type="button"
                    className={`${cx('jour-cell')} ${nouvelleDate === jour.date ? 'selected' : ''}`}
                    onClick={() => {
                      setNouvelleDate(jour.date);
                      setNouvelleHeure('');
                      chargerCreneauxDisponiblesReprog(jour.date, planningToReprogram.matricule_agent, planningToReprogram.id_planning);
                    }}
                  >
                    <span className={cx('jour-num')}>{jourNum}</span>
                    <span className={cx('jour-semaine')}>{joursSemaine[jourSemaine]}</span>
                    <span className={cx('creneaux-count')}>{jour.creneauxDisponibles} créneau(x)</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
       
        {nouvelleDate && (
          <div className={cx('form-group')}>
            <label><Clock size={14} /> Nouvelle heure *</label>
            {loadingReprogCreneaux ? (
              <div className={cx('loading-creneaux')}>Chargement des créneaux...</div>
            ) : (
              <div className={cx('creneaux-grid')}>
                {creneauxDisponiblesReprog.map(creneau => (
                  <button
                    key={creneau.heure}
                    type="button"
                    className={`${cx('creneau-cell')} ${creneau.disponible ? 'disponible' : 'indisponible'} ${nouvelleHeure === creneau.heure ? 'selected' : ''}`}
                    onClick={() => creneau.disponible && setNouvelleHeure(creneau.heure)}
                    disabled={!creneau.disponible}
                    title={creneau.message}
                  >
                    {creneau.heure_affichage}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
       
        <div className={cx('form-group')}>
          <label>Motif de reprogrammation *</label>
          <textarea rows="3" value={reprogramMotif} onChange={(e) => setReprogramMotif(e.target.value)} placeholder="Congé maladie, absence, formation, etc." />
        </div>
      </div>
      <div className={cx('modal-footer')}>
        <Button variant="secondary" onClick={() => setShowReprogramModal(false)}>Annuler</Button>
        <Button variant="primary" icon={Calendar} loading={reprogramLoading} onClick={confirmerReprogrammation}>Confirmer</Button>
      </div>
    </div>
  </div>
)}

      {showAutoReprogramModal && autoReprogramItem && (
        <div className={cx('modal-overlay')} onClick={() => setShowAutoReprogramModal(false)}>
          <div className={`${cx('modal-content')} auto-reprogram`} onClick={e => e.stopPropagation()}>
            <div className={`${cx('modal-header')} info`}>
              <div className={cx('header-icon')}><Zap size={28} /></div>
              <h2>Reprogrammation automatique</h2>
              <button className={cx('modal-close')} onClick={() => setShowAutoReprogramModal(false)}><X size={18} /></button>
            </div>
            <div className={cx('modal-body')}>
              <div className={cx('auto-reprogram-info')}>
                <div className={cx('agent-chip')}>
                  <div className={`${cx('agent-avatar')} small`}><span>{autoReprogramItem.matricule_agent}</span></div>
                  <div>
                    <div className={cx('agent-name')}>{getAgentNom(autoReprogramItem.matricule_agent)}</div>
                    <div>Matricule: {autoReprogramItem.matricule_agent}</div>
                  </div>
                </div>
                <div className={cx('current-slot')}>
                  <div><Calendar size={14} /> Date actuelle</div>
                  <div>{formatDate(autoReprogramItem.date_visite)} à {autoReprogramItem.heure_visite?.substring(0,5)}</div>
                </div>
                <div className={cx('arrow-icon')}><ArrowLeftRight size={24} /></div>
                <div className={cx('new-slot', 'auto')}>
                  <div><Zap size={14} /> Nouvelle date (automatique)</div>
                  <div>Le système va chercher le prochain créneau disponible</div>
                </div>
              </div>
              <div className={cx('info-message', 'warning')}>
                <AlertCircle size={16} /> Le créneau actuel sera <strong>bloqué</strong> et ne pourra plus être utilisé.
              </div>
            </div>
            <div className={cx('modal-footer')}>
              <Button variant="secondary" onClick={() => setShowAutoReprogramModal(false)}>Annuler</Button>
              <Button variant="info" icon={Zap} loading={autoReprogramLoading} onClick={confirmerReprogrammationAuto}>Confirmer</Button>
            </div>
          </div>
        </div>
      )}

      {showAnnulationModal && planningToAnnuler && (
        <div className={cx('modal-overlay')} onClick={() => setShowAnnulationModal(false)}>
          <div className={`${cx('modal-content')} small`} onClick={e => e.stopPropagation()}>
            <div className={`${cx('modal-header')} danger`}>
              <XCircle size={24} />
              <h2>Annuler la visite</h2>
              <button className={cx('modal-close')} onClick={() => setShowAnnulationModal(false)}><X size={18} /></button>
            </div>
            <div className={cx('modal-body')}>
              <div className={cx('current-visite-info')}>
                <p><strong>Agent:</strong> {getAgentNom(planningToAnnuler.matricule_agent)}</p>
                <p><strong>Date:</strong> {formatDate(planningToAnnuler.date_visite)} à {planningToAnnuler.heure_visite?.substring(0,5)}</p>
              </div>
              <div className={cx('form-group')}>
                <label>Motif *</label>
                <textarea rows="3" value={annulationMotif} onChange={(e) => setAnnulationMotif(e.target.value)} placeholder="Raison de l'annulation" />
              </div>
            </div>
            <div className={cx('modal-footer')}>
              <Button variant="secondary" onClick={() => setShowAnnulationModal(false)}>Annuler</Button>
              <Button variant="danger" icon={XCircle} loading={annulationLoading} onClick={confirmerAnnulation}>Confirmer</Button>
            </div>
          </div>
        </div>
      )}

      {showVisiteModal && visiteToComplete && (
        <div className={cx('modal-overlay')} onClick={() => setShowVisiteModal(false)}>
          <div className={cx('modal-content')} onClick={e => e.stopPropagation()}>
            <div className={`${cx('modal-header')} success`}>
              <CheckCircle size={24} />
              <h2>Enregistrer la visite</h2>
              <button className={cx('modal-close')} onClick={() => setShowVisiteModal(false)}><X size={18} /></button>
            </div>
            <div className={cx('modal-body')}>
              <div className={cx('current-visite-info')}>
                <p><strong>Agent:</strong> {getAgentNom(visiteToComplete.matricule_agent)}</p>
                <p><strong>Date:</strong> {formatDate(visiteToComplete.date_visite)}</p>
                <p><strong>Type:</strong> {visiteToComplete.type_visite}</p>
              </div>
              <div className={cx('form-group')}>
                <label>Médecin *</label>
                <input type="text" value={visiteFormData.medecin} onChange={(e) => setVisiteFormData({...visiteFormData, medecin: e.target.value})} />
              </div>
              <div className={cx('form-group')}>
                <label>Résultat *</label>
                <select value={visiteFormData.resultat} onChange={(e) => setVisiteFormData({...visiteFormData, resultat: e.target.value})}>
                  <option value="Apte">✅ Apte</option>
                  <option value="Inapte temporaire">❌ Inapte temporaire</option>
                  <option value="Inapte définitif">🚫 Inapte définitif</option>
                </select>
              </div>
              {visiteFormData.resultat === 'Inapte temporaire' && (
                <div className={cx('form-group')}>
                  <label>Durée d'inaptitude (jours)</label>
                  <input type="number" value={visiteFormData.duree_inaptitude} onChange={(e) => setVisiteFormData({...visiteFormData, duree_inaptitude: parseInt(e.target.value)})} min="1" max="365" />
                </div>
              )}
              <div className={cx('form-group')}>
                <label>Observations</label>
                <textarea rows="4" value={visiteFormData.observation} onChange={(e) => setVisiteFormData({...visiteFormData, observation: e.target.value})} placeholder="Notes médicales, recommandations..." />
              </div>
            </div>
            <div className={cx('modal-footer')}>
              <Button variant="secondary" onClick={() => setShowVisiteModal(false)}>Annuler</Button>
              <Button variant="success" icon={CheckCircle} onClick={confirmerEnregistrementVisite}>Enregistrer</Button>
            </div>
          </div>
        </div>
      )}

      {showConvocationModal && convocationToSend && (
        <div className={cx('modal-overlay')} onClick={() => setShowConvocationModal(false)}>
          <div className={`${cx('modal-content')} small`} onClick={e => e.stopPropagation()}>
            <div className={`${cx('modal-header')} success`}>
              <div className={cx('header-icon')}><Mail size={24} /></div>
              <h2>Envoyer la convocation</h2>
              <button className={cx('modal-close')} onClick={() => setShowConvocationModal(false)}><X size={18} /></button>
            </div>
            <div className={cx('modal-body')}>
              <div className={cx('confirmation-info')}>
                <div className={cx('agent-chip', 'compact')}>
                  <div className={`${cx('agent-avatar')} small`}><span>{convocationToSend.matricule_agent}</span></div>
                  <div>
                    <div className={cx('agent-name')}>{getAgentNom(convocationToSend.matricule_agent)}</div>
                    <div className={cx('agent-detail')}>Matricule: {convocationToSend.matricule_agent}</div>
                  </div>
                </div>
                <div className={cx('visit-details-compact')}>
                  <div><Calendar size={14} /> {formatDate(convocationToSend.date_visite)}</div>
                  <div><Clock size={14} /> {convocationToSend.heure_visite?.substring(0,5)}</div>
                  <div><Briefcase size={14} /> {convocationToSend.type_visite}</div>
                </div>
                <div className={`${cx('info-message')} success`}>
                  <Mail size={16} />
                  <span>La convocation sera envoyée au service GRH qui se chargera de la distribution à l'agent.</span>
                </div>
              </div>
            </div>
            <div className={cx('modal-footer')}>
              <Button variant="secondary" onClick={() => setShowConvocationModal(false)}>Annuler</Button>
              <Button variant="success" icon={Mail} loading={convocationLoading} onClick={confirmerEnvoiConvocation}>Envoyer</Button>
            </div>
          </div>
        </div>
      )}

      {showGroupeConvocationModal && (
        <div className={cx('modal-overlay')} onClick={() => setShowGroupeConvocationModal(false)}>
          <div className={`${cx('modal-content')} small`} onClick={e => e.stopPropagation()}>
            <div className={`${cx('modal-header')} success`}>
              <div className={cx('header-icon')}><Users size={24} /></div>
              <h2>Envoi groupé de convocations</h2>
              <button className={cx('modal-close')} onClick={() => setShowGroupeConvocationModal(false)}><X size={18} /></button>
            </div>
            <div className={cx('modal-body')}>
              <div className={cx('confirmation-info')}>
                <div className={cx('info-icon')}><Send size={48} strokeWidth={1} /></div>
                <h3>{groupeConvocationCount} convocation(s)</h3>
                <p>à envoyer au service GRH</p>
                <div className={`${cx('info-message')} warning`}>
                  <AlertCircle size={16} />
                  <span>Cette action ne peut pas être annulée. Les convocations seront envoyées en une seule fois.</span>
                </div>
              </div>
            </div>
            <div className={cx('modal-footer')}>
              <Button variant="secondary" onClick={() => setShowGroupeConvocationModal(false)}>Annuler</Button>
              <Button variant="success" icon={Send} loading={groupeConvocationLoading} onClick={confirmerEnvoiToutesConvocations}>Envoyer toutes</Button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE HISTORIQUE POUR UNE CARTE (visite spécifique) */}
{showHistorique && (
  <div className={cx('modal-overlay')} onClick={() => setShowHistorique(null)}>
    <div className={`${cx('modal-content')} small`} onClick={e => e.stopPropagation()}>
      <HistoriquePopup visite={planning.find(p => p.id_planning === showHistorique)} onClose={() => setShowHistorique(null)} />
    </div>
  </div>
)}    

      {showConvocationPreview && convocationToPreview && (
        <div className={cx('modal-overlay')} onClick={() => setShowConvocationPreview(false)}>
          <div className={cx('modal-content')} onClick={e => e.stopPropagation()}>
            <div className={cx('popup-header')}>
              <h4><Mail size={16} /> Aperçu de la convocation</h4>
              <button onClick={() => setShowConvocationPreview(false)}><X size={14} /></button>
            </div>
            <div className={cx('convocation-card')}>
              <div className={cx('convocation-header')}>
                <h3>SRTB - Service HSE</h3>
                <p>Convocation à visite médicale</p>
              </div>
              <div className={cx('convocation-details')}>
                <p><strong>Agent:</strong> {getAgentNom(convocationToPreview.matricule_agent)}</p>
                <p><strong>Date:</strong> {formatDateLong(convocationToPreview.date_visite)}</p>
                <p><strong>Heure:</strong> {convocationToPreview.heure_visite?.substring(0,5)}</p>
                <p><strong>Type:</strong> {convocationToPreview.type_visite}</p>
                <p><strong>Lieu:</strong> Infirmerie SRTB - Bizerte</p>
                <p><strong>Médecin:</strong> Dr. Mahmoud Khelifi</p>
              </div>
              <div className={cx('convocation-instructions')}>
                <strong>Instructions:</strong>
                <ul>
                  <li>Se présenter 15 minutes avant</li>
                  <li>Apporter la carte d'identité</li>
                  <li>Être à jeun si nécessaire</li>
                </ul>
              </div>
              <Button variant="primary" icon={Mail} onClick={() => { handleEnvoyerConvocation(convocationToPreview); setShowConvocationPreview(false); }}>
                Envoyer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE INDISPONIBILITÉ */}
      {showIndisponibleModal && planningIndisponible && (
  <div className={cx('modal-overlay')} onClick={() => setShowIndisponibleModal(false)}>
    <div className={`${cx('modal-content')} indisponible-modal`} onClick={e => e.stopPropagation()}>
      <div className={`${cx('modal-header')} warning`}>
        <AlertCircle size={24} />
        <h2>Déclaration d'indisponibilité</h2>
        <button className={cx('modal-close')} onClick={() => setShowIndisponibleModal(false)}><X size={18} /></button>
      </div>
     
      <div className={cx('modal-body')}>
        <div className={cx('current-visite-info')}>
          <p><strong>👤 Agent:</strong> {getAgentNom(planningIndisponible.matricule_agent)}</p>
          <p><strong>📅 Date actuelle:</strong> {formatDate(planningIndisponible.date_visite)} à {planningIndisponible.heure_visite?.substring(0,5)}</p>
          <p><strong>📋 Type:</strong> {planningIndisponible.type_visite}</p>
        </div>
       
        <div className={cx('info-message', 'warning')}>
          <AlertCircle size={16} />
          <span>⚠️ Le créneau actuel sera <strong>libéré</strong> et proposé à d'autres agents.</span>
        </div>
       
        <div className={cx('form-group')}>
          <label>Mode de traitement</label>
          <div className={cx('mode-selector')}>
            <button
              type="button"
              className={`${cx('mode-btn')} ${indisponibleMode === 'manuel' ? 'active' : ''}`}
              onClick={() => setIndisponibleMode('manuel')}
            >
               Choisir une nouvelle date
            </button>
            <button
              type="button"
              className={`${cx('mode-btn')} ${indisponibleMode === 'auto' ? 'active' : ''}`}
              onClick={() => setIndisponibleMode('auto')}
            >
               Reprogrammation automatique
            </button>
          </div>
        </div>
       
        {indisponibleMode === 'manuel' ? (
          <>
            <div className={cx('form-group', 'full-width')}>
              <label><Calendar size={14} /> Nouvelle date</label>
              <div className={cx('mois-navigation')}>
                <button type="button" onClick={() => {
                  let newMois = moisActuelReprog - 1;
                  let newAnnee = anneeActuelleReprog;
                  if (newMois < 0) { newMois = 11; newAnnee--; }
                  setMoisActuelReprog(newMois);
                  setAnneeActuelleReprog(newAnnee);
                  chargerJoursDisponiblesReprog(newMois, newAnnee, planningIndisponible.matricule_agent);
                }}>◀</button>
                <span>{new Date(anneeActuelleReprog, moisActuelReprog).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                <button type="button" onClick={() => {
                  let newMois = moisActuelReprog + 1;
                  let newAnnee = anneeActuelleReprog;
                  if (newMois > 11) { newMois = 0; newAnnee++; }
                  setMoisActuelReprog(newMois);
                  setAnneeActuelleReprog(newAnnee);
                  chargerJoursDisponiblesReprog(newMois, newAnnee, planningIndisponible.matricule_agent);
                }}>▶</button>
              </div>
             
              {loadingReprogJours ? (
                <div className={cx('loading-creneaux')}>Chargement...</div>
              ) : (
                <div className={cx('calendrier-jours')}>
                  {joursDisponiblesReprog.map(jour => {
                    const [year, month, day] = jour.date.split('-');
                    const jourNum = parseInt(day);
                    const dateObj = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
                    const jourSemaine = dateObj.getUTCDay();
                    const joursSemaine = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                    if (jourSemaine === 0 || jourSemaine === 1 || jourSemaine === 6) return null;
                    return (
                      <button
                        key={jour.date}
                        type="button"
                        className={`${cx('jour-cell')} ${nouvelleDate === jour.date ? 'selected' : ''}`}
                        onClick={() => {
                          setNouvelleDate(jour.date);
                          setNouvelleHeure('');
                          chargerCreneauxDisponiblesReprog(jour.date, planningIndisponible.matricule_agent, planningIndisponible.id_planning);
                        }}
                      >
                        <span className={cx('jour-num')}>{jourNum}</span>
                        <span className={cx('jour-semaine')}>{joursSemaine[jourSemaine]}</span>
                        <span className={cx('creneaux-count')}>{jour.creneauxDisponibles} créneau(x)</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
           
            {nouvelleDate && (
              <div className={cx('form-group')}>
                <label><Clock size={14} /> Nouvelle heure</label>
                {loadingReprogCreneaux ? (
                  <div className={cx('loading-creneaux')}>Chargement...</div>
                ) : (
                  <div className={cx('creneaux-grid')}>
                    {creneauxDisponiblesReprog.map(creneau => (
                      <button
                        key={creneau.heure}
                        type="button"
                        className={`${cx('creneau-cell')} ${creneau.disponible ? 'disponible' : 'indisponible'} ${nouvelleHeure === creneau.heure ? 'selected' : ''}`}
                        onClick={() => creneau.disponible && setNouvelleHeure(creneau.heure)}
                        disabled={!creneau.disponible}
                      >
                        {creneau.heure_affichage}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className={cx('info-message', 'info')}>
            <Zap size={16} />
            <div>
              <strong>Mode automatique</strong>
              <p>Le système va :</p>
              <ul>
                <li>Libérer le créneau actuel</li>
                <li>Chercher le prochain créneau disponible</li>
                <li>Reprogrammer l'agent automatiquement</li>
              </ul>
            </div>
          </div>
        )}
       
        <div className={cx('form-group')}>
          <label>Motif de l'indisponibilité</label>
          <textarea rows={3} value={reprogramMotif} onChange={(e) => setReprogramMotif(e.target.value)} placeholder="Ex: Congé maladie, Formation, Mission, etc." />
        </div>
      </div>
     
      <div className={cx('modal-footer')}>
        <Button variant="secondary" onClick={() => setShowIndisponibleModal(false)}>Annuler</Button>
        <Button variant="warning" icon={indisponibleMode === 'auto' ? Zap : Calendar} loading={indisponibleLoading} onClick={confirmerIndisponible}>
          {indisponibleMode === 'auto' ? 'Reprogrammer automatiquement' : 'Confirmer'}
        </Button>
      </div>
    </div>
  </div>
)}

{showReaffectModal && reaffectCreneau && (
  <div className={cx('modal-overlay')} onClick={() => setShowReaffectModal(false)}>
    <div className={`${cx('modal-content')} reaffect-modal`} onClick={e => e.stopPropagation()}>
      <div className={`${cx('modal-header')} success`}>
        <UserPlus size={24} />
        <h2>Réaffectation du créneau</h2>
        <button className={cx('modal-close')} onClick={() => setShowReaffectModal(false)}>
          <X size={18} />
        </button>
      </div>
     
      <div className={cx('modal-body')}>
        <div className={cx('creneau-info')}>
          <p><strong>📅 Date:</strong> {formatDate(reaffectCreneau.date)}</p>
          <p><strong>⏰ Heure:</strong> {reaffectCreneau.heure.substring(0,5)}</p>
        </div>
       
        <div className={cx('info-message', 'info')}>
          <Info size={16} />
          <span>Sélectionnez un agent parmi la liste des prioritaires</span>
        </div>
       
        {loadingAgents ? (
          <div className={cx('loading-state')}>
            <div className={cx('spinner')}></div>
            <p>Chargement des agents prioritaires...</p>
          </div>
        ) : agentsPrioritaires.length === 0 ? (
          <div className={cx('empty-state')}>
            <p>❌ Aucun agent prioritaire trouvé</p>
            <button className={cx('btn-secondary')} onClick={() => chargerAgentsPrioritaires()}>
              <RefreshCw size={14} /> Recharger
            </button>
          </div>
        ) : (
          <div className={cx('agents-list')}>
            <h4>Agents prioritaires ({agentsPrioritaires.length})</h4>
            {agentsPrioritaires.map((agent, idx) => (
              <div
                key={agent.matricule}
                className={`${cx('agent-item')} ${selectedAgentReaffect?.matricule === agent.matricule ? 'selected' : ''}`}
                onClick={() => setSelectedAgentReaffect(agent)}
              >
                <div className={cx('agent-avatar')}>
                  {agent.nom?.charAt(0)}{agent.prenom?.charAt(0)}
                </div>
                <div className={cx('agent-info')}>
                  <div className={cx('agent-name')}>{agent.nom} {agent.prenom}</div>
                  <div className={cx('agent-details')}>
                    <Badge variant={agent.poste === 'Chauffeur' ? 'purple' : 'primary'} size="sm">
                      {agent.poste}
                    </Badge>
                    <span>Agence {agent.agence}</span>
                    <span>Dernière visite: {agent.derniere_visite}</span>
                    <span>Périodicité: {agent.periodicite}</span>
                  </div>
                  <div className={cx('agent-priorite')}>
                    <span className={`priority-${agent.priorite >= 500 ? 'high' : agent.priorite >= 200 ? 'medium' : 'low'}`}>
                      {agent.raisons?.join(' • ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
       
        <div className={cx('form-group')}>
          <label>Motif de la réaffectation (optionnel)</label>
          <textarea
            rows={2}
            value={reaffectMotif}
            onChange={(e) => setReaffectMotif(e.target.value)}
            placeholder="Ex: Réaffectation suite à indisponibilité"
          />
        </div>
      </div>
     
      <div className={cx('modal-footer')}>
        <Button variant="secondary" onClick={() => setShowReaffectModal(false)}>Annuler</Button>
        <Button
          variant="success"
          icon={UserPlus}
          loading={reaffectLoading}
          disabled={!selectedAgentReaffect || reaffectLoading}
          onClick={() => {
            if (selectedAgentReaffect) {
              confirmerReaffectationAvecAgent(selectedAgentReaffect);
            }
          }}
        >
          Réaffecter à {selectedAgentReaffect?.nom || 'cet agent'}
        </Button>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default PlanningPage;