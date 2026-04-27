// frontend/components/visites/PlanningPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Calendar, Clock, User, FileText, CheckCircle, XCircle, AlertCircle, Info, 
  RefreshCw, ChevronLeft, ChevronRight, X, Filter, TrendingUp, Mail, Lock, 
  History, Eye, Zap, Shield, Briefcase, Building, Search, Sliders, 
  ChevronDown, ChevronUp, Edit2, Award, ArrowLeftRight, Send, Users, Stethoscope,
  CalendarPlus, CalendarX, CalendarSync
} from 'lucide-react';
import moment from 'moment';
import '../../styles/PlanningPage.css';

// ========== CONSTANTES ==========
const PREFIX = 'sp-';
const cx = (...classes) => classes.filter(Boolean).map(c => `${PREFIX}${c}`).join(' ');

// ========== FONCTIONS UTILITAIRES ==========
const getNumeroSemaine = (date) => moment(date).isoWeek();

// ✅ FONCTION CORRIGÉE - Calcul correct du lundi d'une semaine ISO
const getLundiSemaine = (numeroSemaine, annee) => {
  const date = new Date(annee, 0, 4);
  const jour = date.getDay();
  const decalage = (jour === 0 ? 6 : jour - 1);
  date.setDate(date.getDate() - decalage);
  date.setDate(date.getDate() + (numeroSemaine - 1) * 7);
  return date.toISOString().split('T')[0];
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
  
  // Historique agent
  const [showAgentHistoryModal, setShowAgentHistoryModal] = useState(false);
  const [selectedAgentForHistory, setSelectedAgentForHistory] = useState('');
  const [selectedAgentNameForHistory, setSelectedAgentNameForHistory] = useState('');
  
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

  // ========== CONSTANTES ==========
  const joursSemaine = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const creneaux = ['08:00:00', '08:30:00', '09:00:00', '09:30:00'];
  const creneauxAffichage = ['08:00', '08:30', '09:00', '09:30'];
  const datesSemaine = joursSemaine.map((_, i) => {
    const date = new Date(semaineCourante.dateDebut);
    date.setDate(date.getDate() + i + 1);
    return date.toISOString().split('T')[0];
  });

  // ========== CHARGEMENT ==========
  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/agents`, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const data = await res.json();
      if (data.success) {
        const normalizedAgents = data.agents.map(agent => ({
          ...agent,
          code_affectation_normalized: agent.code_affectation === 3 ? 3 : 1,
          periodicite_text: agent.periodicite_jours === 180 ? '6 mois' : '1 an'
        }));
        setAgents(normalizedAgents);
      }
    } catch (err) { console.error(err); }
  };

  const fetchPlanningSemaine = async () => {
    try {
      const token = localStorage.getItem('token');
      const semaine = parseInt(semaineCourante.numero);
      const annee = parseInt(semaineCourante.annee);
      
      if (isNaN(semaine) || isNaN(annee)) {
        console.error('Semaine ou année invalide:', semaine, annee);
        return;
      }
      
      const url = `${process.env.REACT_APP_API_URL}/api/planning/${semaine}/${annee}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) {
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

  // ========== NOTIFICATIONS ==========
  const showNotification = ({ type, title, message }) => {
    setNotification({ show: true, type, title, message });
    setTimeout(() => setNotification({ show: false, type: '', title: '', message: '' }), 5000);
  };

  // ========== GESTION AGENTS ==========
  const getAgentNom = useCallback((matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    return agent ? `${agent.nom} ${agent.prenom}` : `Agent ${matricule}`;
  }, [agents]);

  const getAgentDetails = useCallback((matricule) => agents.find(a => a.matricule_agent === matricule), [agents]);

  const getDerniereVisite = useCallback((matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    if (!agent?.date_derniere_visite) return 'Jamais';
    const periodicite = agent.periodicite_jours === 180 ? '6 mois' : '1 an';
    return `${new Date(agent.date_derniere_visite).toLocaleDateString('fr-FR')} (${periodicite})`;
  }, [agents]);

  // ========== FONCTION POUR OUVRIR L'HISTORIQUE AGENT ==========
  const handleOpenAgentHistory = () => {
    if (!selectedAgentForHistory) {
      showNotification({ type: 'warning', title: '⚠️ Attention', message: 'Veuillez sélectionner un agent' });
      return;
    }
    setShowAgentHistoryModal(true);
  };

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

  // ========== COMPOSANT MODAL HISTORIQUE AGENT ==========
  const AgentHistoryModal = ({ matricule, onClose }) => {
    const [loadingHisto, setLoadingHisto] = useState(true);
    const [historiqueAgent, setHistoriqueAgent] = useState([]);
    const [visitesProgrammees, setVisitesProgrammees] = useState([]);
    const [statsAgent, setStatsAgent] = useState({});
    const [agentInfo, setAgentInfo] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [filterResultat, setFilterResultat] = useState('all');
    const [expandedItems, setExpandedItems] = useState(new Set());
    const [expandedProgrammees, setExpandedProgrammees] = useState(new Set());
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
      if (hasLoaded) return;
      setHasLoaded(true);
      
      const chargerDonnees = async () => {
        setLoadingHisto(true);
        try {
          const token = localStorage.getItem('token');
          
          const resHistorique = await fetch(`${process.env.REACT_APP_API_URL}/api/historique/agent/${matricule}?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const dataHistorique = await resHistorique.json();
          
          const resPlanning = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/agent/${matricule}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const dataPlanning = await resPlanning.json();
          
          if (dataHistorique.success) {
            setHistoriqueAgent(dataHistorique.historique || []);
            setStatsAgent(dataHistorique.stats || {});
            setAgentInfo(dataHistorique.agent);
          }
          
          if (dataPlanning.success) {
            setVisitesProgrammees(dataPlanning.planning || []);
          }
        } catch (err) {
          console.error('Erreur:', err);
        } finally {
          setLoadingHisto(false);
        }
      };
      chargerDonnees();
    }, [matricule, hasLoaded]);

    const toggleExpand = (id) => {
      const newExpanded = new Set(expandedItems);
      newExpanded.has(id) ? newExpanded.delete(id) : newExpanded.add(id);
      setExpandedItems(newExpanded);
    };

    const toggleExpandProgrammee = (id) => {
      const newExpanded = new Set(expandedProgrammees);
      newExpanded.has(id) ? newExpanded.delete(id) : newExpanded.add(id);
      setExpandedProgrammees(newExpanded);
    };

    const filteredHistorique = historiqueAgent.filter(item => {
      if (filterType !== 'all' && item.type_visite !== filterType) return false;
      if (filterResultat !== 'all' && item.resultat !== filterResultat) return false;
      return true;
    });

    const filteredProgrammees = visitesProgrammees.filter(item => {
      if (filterType !== 'all' && item.type_visite !== filterType) return false;
      return true;
    });

    return (
      <div className="ha-modal-overlay" onClick={onClose}>
        <div className="ha-modal-content">
          <div className="ha-header">
            <div className="ha-header-left">
              <History size={24} />
              <div>
                <h2>Historique complet des visites</h2>
                <p>{agentInfo?.nom} {agentInfo?.prenom} • Matricule: {matricule}</p>
              </div>
            </div>
            <button className="ha-close-btn" onClick={onClose}>✕</button>
          </div>

          <div className="ha-stats-grid">
            <div className="ha-stat-card">
              <div className="ha-stat-value">{statsAgent.total || 0}</div>
              <div className="ha-stat-label">Visites effectuées</div>
            </div>
            <div className="ha-stat-card">
              <div className="ha-stat-value">{filteredProgrammees.length}</div>
              <div className="ha-stat-label">Visites programmées</div>
            </div>
            <div className="ha-stat-card success">
              <div className="ha-stat-value">{statsAgent.aptes || 0}</div>
              <div className="ha-stat-label">Apte</div>
            </div>
            <div className="ha-stat-card warning">
              <div className="ha-stat-value">{statsAgent.inaptesTemp || 0}</div>
              <div className="ha-stat-label">Inapte temporaire</div>
            </div>
            <div className="ha-stat-card danger">
              <div className="ha-stat-value">{statsAgent.inaptesDef || 0}</div>
              <div className="ha-stat-label">Inapte définitif</div>
            </div>
          </div>

          <div className="ha-filters">
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">📋 Tous les types</option>
              <option value="Périodique">🔄 Périodique</option>
              <option value="Reprise">⚕️ Reprise</option>
              <option value="Reclassement">📝 Reclassement</option>
              <option value="Embauche">🆕 Embauche</option>
            </select>
            <select value={filterResultat} onChange={(e) => setFilterResultat(e.target.value)}>
              <option value="all">📊 Tous les résultats</option>
              <option value="Apte">✅ Apte</option>
              <option value="Inapte temporaire">⚠️ Inapte temporaire</option>
              <option value="Inapte définitif">❌ Inapte définitif</option>
            </select>
            <button className="ha-reset-btn" onClick={() => { setFilterType('all'); setFilterResultat('all'); }}>
              <X size={14} /> Réinitialiser
            </button>
          </div>

          {filteredProgrammees.length > 0 && (
            <>
              <div className="ha-section-title">
                <Calendar size={16} />
                <span>Visites programmées (à venir)</span>
              </div>
              <div className="ha-list">
                {filteredProgrammees.map((item, idx) => (
                  <div key={`prog-${item.id_planning || idx}`} className="ha-item programme">
                    <div className="ha-item-header" onClick={() => toggleExpandProgrammee(item.id_planning)}>
                      <div className="ha-item-left">
                        <span className="ha-action-badge info">📅 Programmé</span>
                        <span className="ha-type-badge">{item.type_visite}</span>
                      </div>
                      <div className="ha-item-right">
                        <span className="ha-date">{formatDate(item.date_visite)}</span>
                        <span className="ha-heure">{item.heure_visite?.substring(0,5)}</span>
                        <button className="ha-expand-btn">
                          {expandedProgrammees.has(item.id_planning) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>
                    
                    {expandedProgrammees.has(item.id_planning) && (
                      <div className="ha-item-details">
                        <div className="ha-detail-row">
                          <User size={14} />
                          <span><strong>Agent:</strong> {getAgentNom(item.matricule_agent)}</span>
                        </div>
                        <div className="ha-detail-row">
                          <Calendar size={14} />
                          <span><strong>Date:</strong> {formatDate(item.date_visite)} à {item.heure_visite?.substring(0,5)}</span>
                        </div>
                        <div className="ha-detail-row">
                          <Briefcase size={14} />
                          <span><strong>Type:</strong> {item.type_visite}</span>
                        </div>
                        {item.motif_reprogrammation && (
                          <div className="ha-detail-row">
                            <FileText size={14} />
                            <span><strong>Motif:</strong> {item.motif_reprogrammation}</span>
                          </div>
                        )}
                        <div className="ha-detail-row meta">
                          <Clock size={12} />
                          <span>Statut: {item.statut}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="ha-section-title">
            <History size={16} />
            <span>Historique des visites effectuées</span>
          </div>
          <div className="ha-list">
            {loadingHisto ? (
              <div className="ha-loading">Chargement de l'historique...</div>
            ) : filteredHistorique.length === 0 ? (
              <div className="ha-empty">
                <History size={48} strokeWidth={1} />
                <p>Aucune visite trouvée pour cet agent</p>
              </div>
            ) : (
              filteredHistorique.map((item, idx) => (
                <div key={item.id || idx} className={`ha-item ${item.action_couleur || ''}`}>
                  <div className="ha-item-header" onClick={() => toggleExpand(item.id)}>
                    <div className="ha-item-left">
                      <span className={`ha-action-badge ${item.action_couleur || 'default'}`}>
                        {item.action_libelle || item.type_action}
                      </span>
                      <span className="ha-type-badge">{item.type_visite}</span>
                      {item.resultat && (
                        <span className="ha-resultat-badge" style={{ 
                          background: item.resultat === 'Apte' ? '#10b981' : 
                                     item.resultat === 'Inapte temporaire' ? '#f59e0b' : '#ef4444' 
                        }}>
                          {item.resultat}
                        </span>
                      )}
                    </div>
                    <div className="ha-item-right">
                      <span className="ha-date">{formatDate(item.date_visite)}</span>
                      <span className="ha-heure">{item.heure_visite}</span>
                      <button className="ha-expand-btn">
                        {expandedItems.has(item.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  {expandedItems.has(item.id) && (
                    <div className="ha-item-details">
                      <div className="ha-detail-row">
                        <User size={14} />
                        <span><strong>Médecin:</strong> {item.medecin || 'Non spécifié'}</span>
                      </div>
                      {item.observation && (
                        <div className="ha-detail-row">
                          <FileText size={14} />
                          <span><strong>Observations:</strong> {item.observation}</span>
                        </div>
                      )}
                      {item.motif_action && (
                        <div className="ha-detail-row">
                          <AlertCircle size={14} />
                          <span><strong>Motif:</strong> {item.motif_action}</span>
                        </div>
                      )}
                      
                      {item.details?.prochaine_visite && (
                        <div className="ha-detail-row highlight">
                          <Calendar size={14} />
                          <span><strong>Prochaine visite périodique:</strong> {formatDate(item.details.prochaine_visite)} ({item.details.periodicite_texte || '1 an'})</span>
                        </div>
                      )}
                      {item.details?.date_prochaine_reprise && (
                        <div className="ha-detail-row warning">
                          <Calendar size={14} />
                          <span><strong>Prochaine visite de reprise:</strong> {formatDate(item.details.date_prochaine_reprise)}</span>
                        </div>
                      )}
                      {item.details?.date_visite_controle && (
                        <div className="ha-detail-row info">
                          <Calendar size={14} />
                          <span><strong>Visite de contrôle:</strong> {formatDate(item.details.date_visite_controle)}</span>
                        </div>
                      )}
                      {item.details?.duree_inaptitude && (
                        <div className="ha-detail-row warning">
                          <AlertCircle size={14} />
                          <span><strong>Durée d'inaptitude:</strong> {item.details.duree_inaptitude} jours</span>
                        </div>
                      )}
                      {item.details?.duree_supplementaire && (
                        <div className="ha-detail-row warning">
                          <AlertCircle size={14} />
                          <span><strong>Prolongation:</strong> {item.details.duree_supplementaire} jours supplémentaires</span>
                        </div>
                      )}
                      {item.details?.date_fin_inaptitude && (
                        <div className="ha-detail-row warning">
                          <Calendar size={14} />
                          <span><strong>Fin d'inaptitude:</strong> {formatDate(item.details.date_fin_inaptitude)}</span>
                        </div>
                      )}
                      
                      <div className="ha-detail-row meta">
                        <Clock size={12} />
                        <span>Enregistré le: {new Date(item.date_creation).toLocaleString('fr-FR')}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="ha-footer">
            <Button variant="ghost" size="sm" onClick={onClose}>Fermer</Button>
          </div>
        </div>

        <style>{`
          .ha-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }
          .ha-modal-content {
            width: 950px;
            max-width: 90vw;
            max-height: 85vh;
            background: white;
            border-radius: 16px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .ha-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 24px;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            color: white;
          }
          .ha-header-left { display: flex; align-items: center; gap: 12px; }
          .ha-header-left h2 { margin: 0; font-size: 18px; }
          .ha-header-left p { margin: 4px 0 0; font-size: 12px; opacity: 0.8; }
          .ha-close-btn { background: none; border: none; color: white; font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 8px; }
          .ha-close-btn:hover { background: rgba(255,255,255,0.1); }
          .ha-stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; padding: 16px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
          .ha-stat-card { text-align: center; padding: 12px; background: white; border-radius: 12px; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
          .ha-stat-card.success { border-left: 3px solid #10b981; }
          .ha-stat-card.warning { border-left: 3px solid #f59e0b; }
          .ha-stat-card.danger { border-left: 3px solid #ef4444; }
          .ha-stat-value { font-size: 24px; font-weight: bold; color: #1e293b; }
          .ha-stat-label { font-size: 12px; color: #64748b; margin-top: 4px; }
          .ha-filters { display: flex; gap: 12px; padding: 16px 24px; background: white; border-bottom: 1px solid #e2e8f0; }
          .ha-filters select { padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 13px; background: white; cursor: pointer; }
          .ha-reset-btn { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; font-size: 12px; }
          .ha-section-title { display: flex; align-items: center; gap: 8px; padding: 12px 24px; background: #f1f5f9; font-weight: 600; color: #1e293b; border-bottom: 1px solid #e2e8f0; }
          .ha-list { flex: 1; overflow-y: auto; padding: 16px 24px; background: #f8fafc; max-height: 400px; }
          .ha-item { background: white; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 12px; overflow: hidden; }
          .ha-item.programme { border-left: 3px solid #3b82f6; }
          .ha-item.success { border-left: 3px solid #10b981; }
          .ha-item.warning { border-left: 3px solid #f59e0b; }
          .ha-item.danger { border-left: 3px solid #ef4444; }
          .ha-item-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; cursor: pointer; }
          .ha-item-header:hover { background: #f8fafc; }
          .ha-item-left { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
          .ha-action-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 500; }
          .ha-action-badge.success { background: #d1fae5; color: #065f46; }
          .ha-action-badge.warning { background: #fed7aa; color: #92400e; }
          .ha-action-badge.danger { background: #fee2e2; color: #991b1b; }
          .ha-action-badge.info { background: #dbeafe; color: #1e40af; }
          .ha-action-badge.purple { background: #f3e8ff; color: #6b21a5; }
          .ha-type-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; background: #f1f5f9; color: #475569; }
          .ha-resultat-badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; color: white; }
          .ha-item-right { display: flex; align-items: center; gap: 12px; }
          .ha-date, .ha-heure { font-size: 13px; color: #475569; }
          .ha-expand-btn { background: none; border: none; cursor: pointer; padding: 4px; border-radius: 4px; }
          .ha-expand-btn:hover { background: #e2e8f0; }
          .ha-item-details { padding: 12px 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
          .ha-detail-row { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; margin-bottom: 8px; }
          .ha-detail-row.highlight { color: #d97706; }
          .ha-detail-row.warning { color: #dc2626; }
          .ha-detail-row.info { color: #2563eb; }
          .ha-detail-row.meta { font-size: 11px; color: #94a3b8; margin-top: 8px; }
          .ha-loading, .ha-empty { text-align: center; padding: 40px; color: #94a3b8; display: flex; flex-direction: column; align-items: center; gap: 12px; }
          .ha-footer { padding: 12px 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; background: white; }
        `}</style>
      </div>
    );
  };

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
        </div>
        
        <div className={cx('visit-card-actions')}>
          {!visite.visite_effectuee && visite.statut === 'Programmé' && !visite.creneau_bloque && (
            <>
              <Button variant="success" size="sm" icon={CheckCircle} onClick={() => handleEnregistrerVisite(visite)}>Effectuer</Button>
              <Button variant="warning" size="sm" icon={Calendar} onClick={() => handleReprogrammerManuel(visite)}>Reprogrammer</Button>
              <Button variant="info" size="sm" icon={Zap} onClick={() => handleReprogrammerAuto(visite)}>Auto</Button>
              {visite.type_visite === 'Reprise' && <Button variant="danger" size="sm" icon={XCircle} onClick={() => handleAnnulerVisite(visite)}>Annuler</Button>}
            </>
          )}
          
          {!visite.visite_effectuee && visite.statut === 'Programmé' && !visite.convocation_envoyee && !visite.creneau_bloque && 
           (visite.type_visite === 'Périodique' || visite.type_visite === 'Reprise') && (
            <>
              <Button variant="info" size="sm" icon={Eye} onClick={() => { setConvocationToPreview(visite); setShowConvocationPreview(true); }}>Aperçu</Button>
              <Button variant="success" size="sm" icon={Mail} onClick={() => handleEnvoyerConvocation(visite)}>Envoyer</Button>
            </>
          )}
          
          {(visite.historique?.length > 0 || visite.a_des_actions === true) && (
            <Button variant="ghost" size="sm" icon={History} onClick={() => {
              if (!visite.historique) {
                fetchVisiteDetails(visite.id_planning);
              }
              setShowHistorique(visite.id_planning);
            }}>
              Historique ({visite.historique?.length || 0})
            </Button>
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

  // ========== RENDU ==========
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
            <div>
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
            </div>
            <button onClick={() => setNotification({...notification, show: false})}><X size={16} /></button>
          </div>
        </div>
      )}

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
          <div className={cx('search-bar')}>
            <Search size={16} />
            <input 
              type="text" 
              placeholder="Rechercher un agent..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            {searchTerm && <button onClick={() => setSearchTerm('')}><X size={14} /></button>}
          </div>
          
          <select 
            className={cx('agent-history-select')}
            value={selectedAgentForHistory} 
            onChange={(e) => {
              const agent = agents.find(a => a.matricule_agent === e.target.value);
              setSelectedAgentForHistory(e.target.value);
              setSelectedAgentNameForHistory(agent ? `${agent.nom} ${agent.prenom}` : '');
            }}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white' }}
          >
            <option value="">Sélectionner un agent</option>
            {agents.map(a => (
              <option key={a.matricule_agent} value={a.matricule_agent}>
                {a.nom} {a.prenom} (#{a.matricule_agent})
              </option>
            ))}
          </select>
          
          <Button 
            variant="info" 
            icon={History} 
            onClick={handleOpenAgentHistory}
            style={{ 
              background: '#0f5b63',
              backgroundImage: 'linear-gradient(135deg, #0f5b63 0%, #0a4a50 100%)',
              color: 'white',
              border: 'none',
              boxShadow: '0 2px 8px rgba(15, 91, 99, 0.3)'
            }}
          >
            Historique agent
          </Button>
          
          <Button variant={showFilters ? 'primary' : 'outline'} icon={Filter} onClick={() => setShowFilters(!showFilters)}>Filtres</Button>
          {stats.convocationsRestantes > 0 && (
            <Button variant="success" icon={Mail} onClick={handleEnvoyerToutesConvocations}>
              Envoyer {stats.convocationsRestantes} convoc.
            </Button>
          )}
          <Button variant="primary" icon={RefreshCw} loading={generationLoading} onClick={handleGenererPlanning}>
            Générer semaine suivante
          </Button>
        </div>
      </div>

      {showFilters && (
        <div className={cx('filters-panel')}>
          <div className={cx('filters-header')}>
            <h4><Sliders size={16} /> Filtres avancés</h4>
            <button className={cx('clear-filters')} onClick={() => { setSelectedAgentFilter(''); setSelectedTypeFilter(''); setSelectedStatusFilter(''); setSearchTerm(''); }}>
              <X size={14} /> Tout effacer
            </button>
          </div>
          <div className={cx('filters-body')}>
            <select value={selectedAgentFilter} onChange={(e) => setSelectedAgentFilter(e.target.value)}>
              <option value="">Tous les agents</option>
              {agents.map(a => <option key={a.matricule_agent} value={a.matricule_agent}>{a.nom} {a.prenom} (#{a.matricule_agent})</option>)}
            </select>
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

      <div className={cx('stats-grid')}>
        <StatCard title="Total visites" value={stats.total} icon={Calendar} variant="primary" />
        <StatCard title="Programmées" value={stats.programme} icon={Clock} variant="warning" />
        <StatCard title="Effectuées" value={stats.effectue} icon={CheckCircle} variant="success" />
        <StatCard title="Reportées" value={stats.reporte} icon={RefreshCw} variant="warning" />
        <StatCard title="Annulées" value={stats.annule} icon={XCircle} variant="danger" />
        <StatCard title="Convocations" value={stats.convocationsEnvoyees} icon={Mail} variant="info" />
      </div>

      <div className={cx('legend-bar')}>
        <div className={cx('legend-item')}><span className={`${cx('legend-dot')} programme`}></span><span>Programmé</span></div>
        <div className={cx('legend-item')}><span className={`${cx('legend-dot')} effectue`}></span><span>Effectué</span></div>
        <div className={cx('legend-item')}><span className={`${cx('legend-dot')} reporte`}></span><span>Reporté</span></div>
        <div className={cx('legend-item')}><span className={`${cx('legend-dot')} annule`}></span><span>Annulé</span></div>
        <div className={cx('legend-item')}><span className={`${cx('legend-dot')} bloque`}></span><span>Bloqué</span></div>
        <div className={cx('legend-divider')}></div>
        <div className={cx('legend-item')}><Badge variant="info" size="sm">Auto</Badge><span>Auto</span></div>
        <div className={cx('legend-item')}><Badge variant="purple" size="sm">Manuel</Badge><span>Manuel</span></div>
        <div className={cx('legend-item')}><Badge variant="primary" size="sm">Périodique</Badge><span>Périodique</span></div>
        <div className={cx('legend-item')}><Badge variant="warning" size="sm">Reprise</Badge><span>Reprise</span></div>
        <div className={cx('legend-item')}><Badge variant="info" size="sm">Contrôle auto</Badge><span>Contrôle auto</span></div>
      </div>

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
                return (
                  <div key={dIdx} className={cx('planning-cell')}>
                    {visite ? (
                      <VisitCard visite={visite} />
                    ) : bloque ? (
                      <div className={cx('blocked-slot')}>
                        <Lock size={20} />
                        <span>Créneau bloqué</span>
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

      {/* MODALES */}
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
                <div className={cx('warning-box')}>
                  <AlertCircle size={14} /> Le créneau actuel sera BLOQUÉ
                </div>
              </div>
              <div className={cx('form-group')}>
                <label>Nouvelle date *</label>
                <input type="date" value={nouvelleDate} onChange={(e) => setNouvelleDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className={cx('form-group')}>
                <label>Nouvelle heure *</label>
                <select value={nouvelleHeure} onChange={(e) => setNouvelleHeure(e.target.value)}>
                  <option value="">Sélectionner</option>
                  <option value="08:00:00">08:00</option>
                  <option value="08:30:00">08:30</option>
                  <option value="09:00:00">09:00</option>
                  <option value="09:30:00">09:30</option>
                </select>
              </div>
              <div className={cx('form-group')}>
                <label>Motif *</label>
                <textarea rows="3" value={reprogramMotif} onChange={(e) => setReprogramMotif(e.target.value)} placeholder="Congé maladie, absence..." />
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

      {showHistorique && (
        <div className={cx('modal-overlay')} onClick={() => setShowHistorique(null)}>
          <div className={`${cx('modal-content')} small`} onClick={e => e.stopPropagation()}>
            <HistoriquePopup visite={planning.find(p => p.id_planning === showHistorique)} onClose={() => setShowHistorique(null)} />
          </div>
        </div>
      )}

      {showAgentHistoryModal && selectedAgentForHistory && (
        <AgentHistoryModal 
          matricule={selectedAgentForHistory} 
          onClose={() => setShowAgentHistoryModal(false)} 
        />
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
    </div>
  );
};

export default PlanningPage;