// frontend/components/visites/PlanningPage.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, User, Heart, FileText, CheckCircle, XCircle,
  AlertCircle, Info, RefreshCw, ChevronLeft, ChevronRight,
  AlertTriangle, X, Save, MapPin, Award, Filter, TrendingUp,
  Send, Mail, Download, Lock, Unlock, History, Bell, Eye, Zap,
  MoreVertical, Printer, Share2, Settings, Shield, Star,
  Briefcase, Building, Phone, Mail as MailIcon, Users, BarChart3,
  Plus, Search, Sliders, Grid, List, LayoutGrid, Maximize2,
  Minimize2, ExternalLink, Copy, Flag, ThumbsUp, ThumbsDown,
  Clock8, CalendarDays, ChevronDown, ChevronUp, ArrowLeftRight, Edit2
} from 'lucide-react';
import moment from 'moment';
import '../../styles/PlanningPage.css';

// ========== PREFIXES POUR ÉVITER LES CONFLITS ==========
const PREFIX = 'sp-'; // sp = SRTB Planning
const cx = (...classes) => classes.filter(Boolean).map(c => `${PREFIX}${c}`).join(' ');

// ========== FONCTIONS DE CALCUL DES SEMAINES ISO AVEC MOMENT.JS ==========
function getNumeroSemaine(date) {
  return moment(date).isoWeek();
}

function getLundiSemaine(numeroSemaine, annee) {
  return moment().year(annee).isoWeek(numeroSemaine).startOf('isoWeek').format('YYYY-MM-DD');
}

// Composant bouton avancé avec préfixes
const Button = ({ variant = 'primary', size = 'md', icon: Icon, children, loading, fullWidth, className = '', ...props }) => {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    success: 'btn-success',
    danger: 'btn-danger',
    warning: 'btn-warning',
    info: 'btn-info',
    ghost: 'btn-ghost',
    outline: 'btn-outline'
  };
  
  const sizes = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg'
  };
  
  const baseClass = cx('btn', variants[variant], sizes[size]);
  const fullClass = fullWidth ? cx('btn-full') : '';
  const loadingClass = loading ? cx('btn-loading') : '';
  
  return (
    <button 
      className={`${baseClass} ${fullClass} ${loadingClass} ${className}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className={cx('btn-spinner')}></span>}
      {Icon && !loading && <Icon size={size === 'sm' ? 14 : size === 'lg' ? 18 : 16} />}
      {children && <span>{children}</span>}
    </button>
  );
};

// Composant badge avancé avec préfixes
const Badge = ({ variant = 'default', icon: Icon, children, size = 'sm', className = '' }) => {
  const variants = {
    default: 'badge-default',
    primary: 'badge-primary',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    info: 'badge-info',
    purple: 'badge-purple'
  };
  
  const baseClass = cx('badge', variants[variant], `badge-${size}`);
  
  return (
    <span className={`${baseClass} ${className}`}>
      {Icon && <Icon size={size === 'sm' ? 10 : 12} />}
      {children}
    </span>
  );
};

// Composant carte statistique avec préfixes
const StatCard = ({ title, value, icon: Icon, variant, trend, onClick }) => {
  return (
    <motion.div 
      className={cx('stat-card', variant)}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <div className={cx('stat-card-icon')}>
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <div className={cx('stat-card-content')}>
        <span className={cx('stat-card-value')}>{value}</span>
        <span className={cx('stat-card-title')}>{title}</span>
      </div>
      {trend && (
        <div className={cx('stat-card-trend')}>
          {trend > 0 ? <TrendingUp size={14} /> : <TrendingUp size={14} style={{ transform: 'rotate(180deg)' }} />}
          <span>{Math.abs(trend)}%</span>
        </div>
      )}
    </motion.div>
  );
};

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
  const [selectedAgentFilter, setSelectedAgentFilter] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCards, setExpandedCards] = useState(new Set());

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

  const toggleCardExpand = (id) => {
    const newExpanded = new Set(expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCards(newExpanded);
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

  // CORRECTION : useCallback pour stabiliser getAgentNom
  const getAgentNom = useCallback((matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    return agent ? `${agent.nom} ${agent.prenom}` : `Agent ${matricule}`;
  }, [agents]);

  const getAgentDetails = useCallback((matricule) => {
    return agents.find(a => a.matricule_agent === matricule);
  }, [agents]);

  const getDerniereVisite = useCallback((matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    if (!agent || !agent.date_derniere_visite) return 'Jamais';
    
    const periodiciteLabel = agent.code_affectation === 3 ? '6 mois' : '1 an';
    const dateStr = new Date(agent.date_derniere_visite).toLocaleDateString('fr-FR');
    return `${dateStr} (${periodiciteLabel})`;
  }, [agents]);

  const getPeriodiciteBadge = useCallback((matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    if (!agent) return null;
    
    if (agent.code_affectation === 3) {
      return <Badge variant="purple" icon={Shield} size="sm">Chauffeur · 6 mois</Badge>;
    }
    return <Badge variant="primary" icon={Briefcase} size="sm">Standard · 1 an</Badge>;
  }, [agents]);

  const getTypeVisiteBadge = (type) => {
    switch(type) {
      case 'Périodique': return <Badge variant="primary" icon={Calendar}>Périodique</Badge>;
      case 'Reprise': return <Badge variant="warning" icon={RefreshCw}>Reprise</Badge>;
      case 'Reclassement': return <Badge variant="info" icon={Briefcase}>Reclassement</Badge>;
      case 'Embauche': return <Badge variant="success" icon={User}>Embauche</Badge>;
      default: return <Badge variant="default">{type}</Badge>;
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
      return <Badge variant="purple" icon={Edit2}>Manuel</Badge>;
    }
    return <Badge variant="info" icon={Zap}>Auto</Badge>;
  };

  const getStatusBadge = (statut, effectuee, creneauBloque) => {
    if (creneauBloque) {
      return <Badge variant="secondary" icon={Lock}>Bloqué</Badge>;
    }
    if (effectuee) {
      return <Badge variant="success" icon={CheckCircle}>Effectué</Badge>;
    }
    switch(statut) {
      case 'Programmé': return <Badge variant="primary" icon={Calendar}>Programmé</Badge>;
      case 'Reporté': return <Badge variant="warning" icon={RefreshCw}>Reporté</Badge>;
      case 'Annulé': return <Badge variant="danger" icon={XCircle}>Annulé</Badge>;
      default: return <Badge variant="default">{statut}</Badge>;
    }
  };

  const HistoriquePopup = ({ visite, onClose }) => {
    if (!visite || !visite.historique || visite.historique.length === 0) {
      return (
        <div className={cx('historique-popup')}>
          <div className={cx('popup-header')}><h4>Historique de la visite</h4><button onClick={onClose}><X size={14} /></button></div>
          <div className={cx('popup-content', 'empty')}><p>Aucun historique disponible</p></div>
        </div>
      );
    }
    
    return (
      <div className={cx('historique-popup')}>
        <div className={cx('popup-header')}><h4>Historique de la visite</h4><button onClick={onClose}><X size={14} /></button></div>
        <div className={cx('popup-content')}>
          {visite.historique.map((h, idx) => (
            <div key={idx} className={cx('historique-item')}>
              <div className={cx('historique-date')}>{new Date(h.created_at).toLocaleString('fr-FR')}</div>
              <div className={`${cx('historique-action')} ${h.type_action?.toLowerCase()}`}>
                {h.type_action === 'PROGRAMMATION' && '📅 Programmation'}
                {h.type_action === 'EFFECTUEE' && '✅ Visite effectuée'}
                {h.type_action === 'REPROGRAMMEE' && '🔄 Reprogrammation'}
                {h.type_action === 'ANNULEE' && '❌ Annulation'}
                {h.type_action === 'REAFFECTEE' && '👥 Réaffectation'}
              </div>
              {h.motif_action && <div className={cx('historique-motif')}><FileText size={10} /> Motif: {h.motif_action}</div>}
              {h.ancien_statut && <div className={cx('historique-statut')}>Statut: {h.ancien_statut} → {h.nouveau_statut}</div>}
              {h.medecin && h.medecin !== 'Système' && <div className={cx('historique-medecin')}><User size={10} /> Médecin: {h.medecin}</div>}
              {h.resultat && <div className={cx('historique-resultat')}><Award size={10} /> Résultat: {h.resultat}</div>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const joursSemaine = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
  const creneauxAffichage = ['08:00', '08:30', '09:00', '09:30'];

  // Calculer les dates pour le planning
  const datesSemaine = joursSemaine.map((jour, index) => {
    const date = new Date(semaineCourante.dateDebut);
    date.setDate(date.getDate() + index + 1);
    return date.toISOString().split('T')[0];
  });

  // CORRECTION : useMemo avec getAgentNom maintenant stable
  const filteredPlanning = useMemo(() => {
    return planning.filter(item => {
      if (selectedAgentFilter && item.matricule_agent !== selectedAgentFilter) return false;
      if (selectedTypeFilter && item.type_visite !== selectedTypeFilter) return false;
      if (selectedStatusFilter) {
        if (selectedStatusFilter === 'effectue' && !item.visite_effectuee) return false;
        if (selectedStatusFilter === 'programme' && (item.visite_effectuee || item.statut !== 'Programmé')) return false;
        if (selectedStatusFilter === 'reporte' && item.statut !== 'Reporté') return false;
        if (selectedStatusFilter === 'annule' && item.statut !== 'Annulé') return false;
      }
      if (searchTerm) {
        const agentNom = getAgentNom(item.matricule_agent).toLowerCase();
        const matricule = item.matricule_agent.toString();
        const searchLower = searchTerm.toLowerCase();
        if (!agentNom.includes(searchLower) && !matricule.includes(searchLower)) return false;
      }
      return true;
    });
  }, [planning, selectedAgentFilter, selectedTypeFilter, selectedStatusFilter, searchTerm, getAgentNom]);

  // Statistiques
  const stats = useMemo(() => ({
    total: planning.length,
    programme: planning.filter(p => p.statut === 'Programmé' && !p.visite_effectuee).length,
    effectue: planning.filter(p => p.visite_effectuee).length,
    reporte: planning.filter(p => p.statut === 'Reporté').length,
    annule: planning.filter(p => p.statut === 'Annulé').length,
    convocationsEnvoyees: planning.filter(p => p.convocation_envoyee).length,
    convocationsRestantes: planning.filter(p => !p.convocation_envoyee && p.statut === 'Programmé' && !p.visite_effectuee).length
  }), [planning]);

  // Composant de carte visite - SANS ANIMATIONS
  const VisitCard = ({ visite }) => {
    const isExpanded = expandedCards.has(visite.id_planning);
    const agentDetails = getAgentDetails(visite.matricule_agent);
    
    return (
      <div className={`${cx('visit-card')} ${getStatutClass(visite.statut, visite.visite_effectuee, visite.creneau_bloque)} ${isExpanded ? cx('expanded') : ''}`}>
        <div className={cx('visit-card-header')}>
          <div className={cx('visit-card-header-left')}>
            <div className={cx('agent-avatar')}>
              <span className={cx('avatar-initials')}>
                {getAgentNom(visite.matricule_agent).split(' ').map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            <div className={cx('agent-info')}>
              <div className={cx('agent-name')}>{getAgentNom(visite.matricule_agent)}</div>
              <div className={cx('agent-matricule')}>#{visite.matricule_agent}</div>
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
            <div className={cx('datetime-item')}>
              <Calendar size={14} />
              <span>{formatDate(visite.date_visite)}</span>
            </div>
            <div className={cx('datetime-item')}>
              <Clock size={14} />
              <span>{visite.heure_visite?.substring(0,5)}</span>
            </div>
          </div>

          <div className={cx('visit-badges')}>
            {getTypeVisiteBadge(visite.type_visite)}
            {getPeriodiciteBadge(visite.matricule_agent)}
            {getSourceBadge(visite.source_planification)}
            {visite.convocation_envoyee && (
              <Badge variant="success" icon={Mail} size="sm">Convocation envoyée</Badge>
            )}
          </div>

          {agentDetails && (
            <div className={cx('visit-details')}>
              <div className={cx('detail-row')}>
                <Building size={12} />
                <span>Agence {agentDetails.code_agence}</span>
              </div>
              <div className={cx('detail-row')}>
                <History size={12} />
                <span>Dernière visite: {getDerniereVisite(visite.matricule_agent)}</span>
              </div>
            </div>
          )}

          {visite.reprogrammee && visite.creneau_bloque && (
            <div className={cx('reprogram-info')}>
              <div className={cx('reprogram-header')}>
                <RefreshCw size={12} />
                <strong>Reprogrammé</strong>
              </div>
              <div className={cx('reprogram-detail')}>
                <FileText size={10} />
                <span>{visite.motif_reprogrammation}</span>
              </div>
              {visite.nouvelle_date_visite && (
                <div className={cx('reprogram-detail')}>
                  <Calendar size={10} />
                  <span>Nouveau: {visite.nouvelle_date_visite} {visite.nouvelle_heure_visite?.substring(0,5)}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={cx('visit-card-actions')}>
          {!visite.visite_effectuee && visite.statut === 'Programmé' && !visite.creneau_bloque && (
            <>
              <Button variant="success" size="sm" icon={CheckCircle} onClick={() => handleEnregistrerVisite(visite)}>
                Effectuer
              </Button>
              <div className={cx('action-group')}>
                <Button variant="warning" size="sm" icon={Calendar} onClick={() => handleReprogrammerManuel(visite)}>
                  Reprogrammer
                </Button>
                <Button variant="info" size="sm" icon={Zap} onClick={() => handleReprogrammerAuto(visite)}>
                  Auto
                </Button>
              </div>
              {visite.type_visite === 'Reprise' && (
                <Button variant="danger" size="sm" icon={XCircle} onClick={() => handleAnnulerVisite(visite)}>
                  Annuler
                </Button>
              )}
            </>
          )}
          {!visite.visite_effectuee && visite.statut === 'Programmé' && !visite.convocation_envoyee && !visite.creneau_bloque && (
            <div className={cx('action-group')}>
              <Button variant="info" size="sm" icon={Eye} onClick={() => { setConvocationToPreview(visite); setShowConvocationPreview(true); }}>
                Aperçu
              </Button>
              <Button variant="success" size="sm" icon={Mail} onClick={() => handleEnvoyerConvocation(visite)}>
                Envoyer
              </Button>
            </div>
          )}
          {visite.historique && visite.historique.length > 0 && (
            <Button variant="ghost" size="sm" icon={History} onClick={() => setShowHistorique(visite.id_planning)}>
              Historique
            </Button>
          )}
        </div>

        {visite.visite_effectuee && (
          <div className={cx('visit-completed-badge')}>
            <CheckCircle size={14} />
            <span>Effectuée le {formatDate(visite.date_visite)}</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cx('planning-page')}>
      {notification.show && (
        <div className={`${cx('notification-container')} ${notification.type}`}>
          <div className={cx('notification-content')}>
            <div className={cx('notification-icon')}>
              {notification.type === 'success' && <CheckCircle size={24} />}
              {notification.type === 'error' && <XCircle size={24} />}
              {notification.type === 'warning' && <AlertCircle size={24} />}
              {notification.type === 'info' && <Info size={24} />}
            </div>
            <div className={cx('notification-text')}>
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
            </div>
            <button className={cx('notification-close')} onClick={() => setNotification({...notification, show: false})}><X size={16} /></button>
          </div>
        </div>
      )}

      {/* EN-TÊTE PRINCIPAL */}
      <div className={cx('planning-header')}>
        <div className={cx('header-left')}>
          <div className={cx('header-icon')}>
            <Calendar size={32} strokeWidth={1.5} />
          </div>
          <div className={cx('header-title')}>
            <h1>Planning des visites médicales</h1>
            <div className={cx('header-subtitle')}>
              <span className={cx('week-badge')}>
                Semaine {semaineCourante.numero} • {semaineCourante.annee}
              </span>
              <span className={cx('date-range')}>
                {formatDate(datesSemaine[0])} - {formatDate(datesSemaine[datesSemaine.length - 1])}
              </span>
            </div>
          </div>
        </div>
        
        <div className={cx('header-right')}>
          {/* Navigation semaine */}
          <div className={cx('week-navigation')}>
            <button className={cx('week-nav-btn')} onClick={() => changerSemaine(-1)}>
              <ChevronLeft size={18} />
            </button>
            <div className={cx('week-display')}>
              <span className={cx('week-label')}>Semaine</span>
              <span className={cx('week-number')}>{semaineCourante.numero}</span>
            </div>
            <button className={cx('week-nav-btn')} onClick={() => changerSemaine(1)}>
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Barre de recherche */}
          <div className={cx('search-bar')}>
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Rechercher un agent..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Bouton filtres */}
          <Button 
            variant={showFilters ? 'primary' : 'outline'} 
            icon={Filter}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filtres
            {(selectedAgentFilter || selectedTypeFilter || selectedStatusFilter) && (
              <span className={cx('filter-active-badge')}></span>
            )}
          </Button>

          {/* Bouton convocations groupées */}
          {stats.convocationsRestantes > 0 && (
            <Button variant="success" icon={Mail} onClick={handleEnvoyerToutesConvocations}>
              Envoyer {stats.convocationsRestantes} convoc.
            </Button>
          )}

          {/* Bouton génération */}
          <Button variant="primary" icon={RefreshCw} loading={generationLoading} onClick={genererPlanning}>
            Générer semaine prochaine
          </Button>
        </div>
      </div>

      {/* PANEL DE FILTRES */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            className={cx('filters-panel')}
            initial={{ opacity: 0, y: -20, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
          >
            <div className={cx('filters-header')}>
              <h4><Sliders size={16} /> Filtres avancés</h4>
              <button className={cx('clear-filters')} onClick={() => { setSelectedAgentFilter(''); setSelectedTypeFilter(''); setSelectedStatusFilter(''); }}>
                <X size={14} /> Tout effacer
              </button>
            </div>
            <div className={cx('filters-body')}>
              <div className={cx('filter-group')}>
                <label>Agent</label>
                <select value={selectedAgentFilter} onChange={(e) => setSelectedAgentFilter(e.target.value)}>
                  <option value="">Tous les agents</option>
                  {agents.map(agent => (
                    <option key={agent.matricule_agent} value={agent.matricule_agent}>
                      {agent.nom} {agent.prenom} (#{agent.matricule_agent})
                    </option>
                  ))}
                </select>
              </div>
              <div className={cx('filter-group')}>
                <label>Type de visite</label>
                <select value={selectedTypeFilter} onChange={(e) => setSelectedTypeFilter(e.target.value)}>
                  <option value="">Tous les types</option>
                  <option value="Périodique">Périodique</option>
                  <option value="Reprise">Reprise</option>
                  <option value="Reclassement">Reclassement</option>
                  <option value="Embauche">Embauche</option>
                </select>
              </div>
              <div className={cx('filter-group')}>
                <label>Statut</label>
                <select value={selectedStatusFilter} onChange={(e) => setSelectedStatusFilter(e.target.value)}>
                  <option value="">Tous les statuts</option>
                  <option value="programme">Programmé</option>
                  <option value="effectue">Effectué</option>
                  <option value="reporte">Reporté</option>
                  <option value="annule">Annulé</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CARTES STATISTIQUES */}
      <div className={cx('stats-grid')}>
        <StatCard title="Total visites" value={stats.total} icon={Calendar} variant="primary" />
        <StatCard title="Programmées" value={stats.programme} icon={Clock} variant="warning" />
        <StatCard title="Effectuées" value={stats.effectue} icon={CheckCircle} variant="success" />
        <StatCard title="Reportées" value={stats.reporte} icon={RefreshCw} variant="warning" />
        <StatCard title="Annulées" value={stats.annule} icon={XCircle} variant="danger" />
        <StatCard title="Convocations" value={stats.convocationsEnvoyees} icon={Mail} variant="info" />
      </div>

      {/* LÉGENDE */}
      <div className={cx('legend-bar')}>
        <div className={cx('legend-item')}><span className={cx('legend-dot', 'programme')}></span><span>Programmé</span></div>
        <div className={cx('legend-item')}><span className={cx('legend-dot', 'effectue')}></span><span>Effectué</span></div>
        <div className={cx('legend-item')}><span className={cx('legend-dot', 'reporte')}></span><span>Reporté</span></div>
        <div className={cx('legend-item')}><span className={cx('legend-dot', 'annule')}></span><span>Annulé</span></div>
        <div className={cx('legend-item')}><span className={cx('legend-dot', 'bloque')}></span><span>Bloqué</span></div>
        <div className={cx('legend-divider')}></div>
        <div className={cx('legend-item')}><Badge variant="info" size="sm">Auto</Badge><span>Auto</span></div>
        <div className={cx('legend-item')}><Badge variant="purple" size="sm">Manuel</Badge><span>Manuel</span></div>
        <div className={cx('legend-item')}><Badge variant="primary" size="sm">Périodique</Badge><span>Périodique</span></div>
        <div className={cx('legend-item')}><Badge variant="warning" size="sm">Reprise</Badge><span>Reprise</span></div>
      </div>

      {/* GRILLE PRINCIPALE */}
      {loading ? (
        <div className={cx('loading-state')}>
          <div className={cx('spinner')}></div>
          <p>Chargement du planning...</p>
        </div>
      ) : filteredPlanning.length === 0 ? (
        <div className={cx('empty-state')}>
          <Calendar size={64} strokeWidth={1} />
          <h3>Aucune visite pour cette semaine</h3>
          <p>Cliquez sur "Générer semaine prochaine" pour créer le planning automatique</p>
          <Button variant="primary" icon={RefreshCw} onClick={genererPlanning}>
            Générer le planning
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className={cx('planning-grid')}>
          {/* En-tête des jours */}
          <div className={cx('planning-row', 'header')}>
            <div className={cx('planning-cell', 'time-cell')}>
              <Clock size={16} />
              <span>Horaire</span>
            </div>
            {joursSemaine.map((jour, index) => (
              <div key={jour} className={cx('planning-cell', 'day-cell')}>
                <div className={cx('jour-label')}>{jour}</div>
                <div className={cx('date-label')}>{formatDate(datesSemaine[index])}</div>
              </div>
            ))}
          </div>

          {/* Lignes des créneaux horaires */}
          {creneaux.map((creneau, cIndex) => (
            <div key={cIndex} className={cx('planning-row')}>
              <div className={cx('planning-cell', 'time-cell')}>
                <span className={cx('heure-value')}>{creneauxAffichage[cIndex]}</span>
              </div>
              {datesSemaine.map((dateStr, dIndex) => {
                const visite = filteredPlanning.find(v => {
                  return v.date_visite === dateStr && v.heure_visite === creneau;
                });
                
                return (
                  <div key={dIndex} className={cx('planning-cell')}>
                    {visite ? (
                      <VisitCard visite={visite} />
                    ) : (
                      <div className={cx('empty-slot')}>
                        <Clock size={20} strokeWidth={1} />
                        <span>Disponible</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className={cx('visits-list')}>
          {filteredPlanning.map((visite) => (
            <VisitCard key={visite.id_planning} visite={visite} />
          ))}
        </div>
      )}

      {/* MODALES - conservées avec animations */}
      <AnimatePresence>
        {showReprogramModal && planningToReprogram && (
          <motion.div className={cx('modal-overlay')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowReprogramModal(false)}>
            <motion.div className={cx('modal-content')} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className={cx('modal-header', 'warning')}>
                <div className={cx('header-icon', 'warning')}><Calendar size={24} /></div>
                <h2>Reprogrammer la visite</h2>
                <button className={cx('modal-close')} onClick={() => setShowReprogramModal(false)}><X size={18} /></button>
              </div>
              <div className={cx('modal-body')}>
                <div className={cx('reprogram-info')}>
                  <p><strong>Agent :</strong> {getAgentNom(planningToReprogram.matricule_agent)}</p>
                  <p><strong>Type :</strong> {planningToReprogram.type_visite}</p>
                  <p><strong>Visite actuelle :</strong> {formatDate(planningToReprogram.date_visite)} à {planningToReprogram.heure_visite?.substring(0,5)}</p>
                  <div className={cx('warning-box')}><AlertCircle size={14} /><span>⚠️ Le créneau actuel sera BLOQUÉ et ne pourra pas être réattribué</span></div>
                </div>
                <div className={cx('form-group')}>
                  <label>Nouvelle date <span className={cx('required')}>*</span></label>
                  <input type="date" value={nouvelleDate} onChange={(e) => setNouvelleDate(e.target.value)} min={new Date().toISOString().split('T')[0]} required />
                </div>
                <div className={cx('form-group')}>
                  <label>Nouvelle heure <span className={cx('required')}>*</span></label>
                  <select value={nouvelleHeure} onChange={(e) => setNouvelleHeure(e.target.value)} required>
                    <option value="">Sélectionner une heure</option>
                    <option value="08:00:00">08:00</option>
                    <option value="08:30:00">08:30</option>
                    <option value="09:00:00">09:00</option>
                    <option value="09:30:00">09:30</option>
                  </select>
                </div>
                <div className={cx('form-group')}>
                  <label>Motif de la reprogrammation <span className={cx('required')}>*</span></label>
                  <textarea rows="3" value={reprogramMotif} onChange={(e) => setReprogramMotif(e.target.value)} placeholder="Congé maladie, absence, indisponibilité, etc." required />
                </div>
              </div>
              <div className={cx('modal-footer')}>
                <Button variant="secondary" onClick={() => setShowReprogramModal(false)}>Annuler</Button>
                <Button variant="primary" icon={Calendar} loading={reprogramLoading} onClick={confirmerReprogrammation} disabled={!nouvelleDate || !nouvelleHeure || !reprogramMotif}>
                  Confirmer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAnnulationModal && planningToAnnuler && (
          <motion.div className={cx('modal-overlay')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAnnulationModal(false)}>
            <motion.div className={cx('modal-content', 'small')} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className={cx('modal-header', 'danger')}>
                <div className={cx('header-icon', 'danger')}><XCircle size={24} /></div>
                <h2>Annuler la visite de reprise</h2>
                <button className={cx('modal-close')} onClick={() => setShowAnnulationModal(false)}><X size={18} /></button>
              </div>
              <div className={cx('modal-body')}>
                <div className={cx('annulation-info')}>
                  <p><strong>Agent :</strong> {getAgentNom(planningToAnnuler.matricule_agent)}</p>
                  <p><strong>Date :</strong> {formatDate(planningToAnnuler.date_visite)} à {planningToAnnuler.heure_visite?.substring(0,5)}</p>
                </div>
                <div className={cx('form-group')}><label>Motif de l'annulation <span className={cx('required')}>*</span></label>
                  <textarea rows="3" value={annulationMotif} onChange={(e) => setAnnulationMotif(e.target.value)} placeholder="Raison de l'annulation" required />
                </div>
              </div>
              <div className={cx('modal-footer')}>
                <Button variant="secondary" onClick={() => setShowAnnulationModal(false)}>Annuler</Button>
                <Button variant="danger" icon={XCircle} loading={annulationLoading} onClick={confirmerAnnulation} disabled={!annulationMotif}>
                  Confirmer
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHistorique && (
          <motion.div className={cx('modal-overlay')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowHistorique(null)}>
            <motion.div className={cx('modal-content', 'small')} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <HistoriquePopup visite={planning.find(p => p.id_planning === showHistorique)} onClose={() => setShowHistorique(null)} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConvocationPreview && convocationToPreview && (
          <motion.div className={cx('modal-overlay')} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowConvocationPreview(false)}>
            <motion.div className={cx('modal-content')} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className={cx('convocation-preview')}>
                <div className={cx('popup-header')}><h4>📧 Aperçu de la convocation</h4><button onClick={() => setShowConvocationPreview(false)}><X size={14} /></button></div>
                <div className={cx('popup-content')}>
                  <div className={cx('convocation-card')}>
                    <div className={cx('convocation-header')}><h3>SRTB - Service HSE</h3><p>Convocation à visite médicale</p></div>
                    <div className={cx('convocation-body')}>
                      <p><strong>Agent:</strong> {getAgentNom(convocationToPreview.matricule_agent)}</p>
                      <p><strong>Matricule:</strong> #{convocationToPreview.matricule_agent}</p>
                      <p><strong>Date:</strong> {new Date(convocationToPreview.date_visite).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      <p><strong>Heure:</strong> {convocationToPreview.heure_visite?.substring(0,5)}</p>
                      <p><strong>Type de visite:</strong> {convocationToPreview.type_visite}</p>
                      <p><strong>Lieu:</strong> Infirmerie SRTB - Bizerte</p>
                      <p><strong>Médecin:</strong> Dr. Mahmoud Khelifi</p>
                      <div className={cx('convocation-instructions')}>
                        <strong>Instructions:</strong>
                        <ul><li>Se présenter 15 minutes avant l'heure du rendez-vous</li><li>Apporter la carte d'identité nationale</li><li>Être à jeun si nécessaire</li></ul>
                      </div>
                    </div>
                    <div className={cx('convocation-footer')}>
                      <Button variant="primary" icon={Mail} onClick={() => { handleEnvoyerConvocation(convocationToPreview); setShowConvocationPreview(false); }}>
                        Envoyer la convocation
                      </Button>
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