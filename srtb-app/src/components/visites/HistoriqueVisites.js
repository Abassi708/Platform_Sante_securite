// frontend/components/visites/HistoriqueVisites.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, User, FileText, CheckCircle, XCircle,
  AlertCircle, Info, RefreshCw, Eye, Layers, PenTool, History, 
  Activity, Award, AlertTriangle, Filter, Search, ChevronLeft, 
  ChevronRight, Sliders, Grid3x3, List, PlusCircle, Repeat, Trash2, Users,
  TrendingUp, Calendar as CalendarIcon, Briefcase, Shield, Zap,
  UserSearch, ChevronsLeft, ChevronsRight, BarChart3, PieChart,
  MoreHorizontal, Download, Mail, Phone, MapPin, Building2,
  Star, TrendingDown, MinusCircle, ArrowRight, Dot, Edit2 
} from 'lucide-react';
import AgentSearchInput from '../common/AgentSearchInput';
import '../../styles/HistoriqueVisites.css';

// ============================================
// FONCTIONS DE FORMATAGE DE DATES
// ============================================

const formatDateFr = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('fr-FR');
};

const formatDateTimeFr = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const formatDateVisiteLong = (dateStr) => {
  if (!dateStr) return '';
  if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const formatDate = formatDateTimeFr;
const formatDateSimple = formatDateFr;

// ============================================
// SOUS-COMPOSANTS
// ============================================

const StatCard = ({ title, value, icon: Icon, color, trend, trendValue }) => (
  <div className="hv-stat-card-premium" style={{ '--accent-color': color }}>
    <div className="hv-stat-card-header">
      <div className="hv-stat-icon-wrapper" style={{ backgroundColor: `${color}15` }}>
        <Icon size={20} style={{ color }} />
      </div>
      {trend && (
        <div className="hv-stat-trend">
          {trend === 'up' ? <TrendingUp size={12} /> : trend === 'down' ? <TrendingDown size={12} /> : <MinusCircle size={12} />}
          <span>{trendValue}</span>
        </div>
      )}
    </div>
    <div className="hv-stat-card-body">
      <span className="hv-stat-value">{value}</span>
      <span className="hv-stat-title">{title}</span>
    </div>
  </div>
);

const StatusBadge = ({ type, value, size = 'md' }) => {
  const configs = {
    'Apte': { class: 'hv-status-apte', icon: CheckCircle },
    'Inapte temporaire': { class: 'hv-status-temporaire', icon: AlertTriangle },
    'Inapte définitif': { class: 'hv-status-definitif', icon: XCircle },
    'PROGRAMMATION': { class: 'hv-status-programmation', icon: Calendar },
    'SAISIE_MANUELLE': { class: 'hv-status-programmation', icon: PenTool },
    'EFFECTUEE': { class: 'hv-status-effectuee', icon: CheckCircle },
    'REPROGRAMMEE': { class: 'hv-status-reprogrammee', icon: Repeat },
    'ANNULEE': { class: 'hv-status-annulee', icon: XCircle },
    'REAFFECTEE': { class: 'hv-status-reaffectee', icon: Users },
    'MODIFICATION': { class: 'hv-status-modification', icon: Edit2 } 
  };
  
  const config = configs[type] || { class: 'hv-status-default', icon: Info };
  const IconComponent = config.icon;
  
  return (
    <div className={`hv-status-badge ${config.class} hv-status-${size}`}>
      <IconComponent size={size === 'sm' ? 12 : 14} />
      <span>{value || type}</span>
    </div>
  );
};

const VisitTypeBadge = ({ type }) => {
  const types = {
    'Périodique': { icon: Calendar, color: '#4361ee' },
    'Reprise': { icon: Activity, color: '#f59f00' },
    'Reclassement': { icon: Briefcase, color: '#9c36b5' },
    'Embauche': { icon: UserPlus, color: '#2b9348' }
  };
  const { icon: Icon, color } = types[type] || { icon: FileText, color: '#6c757d' };
  
  return (
    <div className="hv-visit-type-badge" style={{ backgroundColor: `${color}12`, color }}>
      <Icon size={12} />
      <span>{type}</span>
    </div>
  );
};

const ActionCard = ({ action, onViewDetails, viewMode }) => {
  const actionColor = getActionColorStatic(action.type_action);
  const resultatConfig = getResultatConfigStatic(action.resultat);
  
  return (
    <div className={`hv-action-card ${viewMode === 'grid' ? 'hv-grid-mode' : ''}`}>
      <div className="hv-action-card-marker" style={{ backgroundColor: actionColor }} />
      
      <div className="hv-action-card-header">
        <div className="hv-action-header-left">
          <StatusBadge type={action.type_action} value={action.actionLabel} size="sm" />
          <div className="hv-action-source" style={{ color: action.sourceColor }}>
            <span>{action.sourceIcon}</span>
            <span>{action.sourceLabel}</span>
          </div>
          <VisitTypeBadge type={action.type_visite} />
          {action.resultat && action.type_action === 'EFFECTUEE' && (
            <StatusBadge type={action.resultat} value={action.resultat} size="sm" />
          )}
        </div>
        <div className="hv-action-header-right">
          <span className="hv-action-timestamp">{formatDateTimeFr(action.created_at)}</span>
        </div>
      </div>
      
      <div className="hv-action-card-body">
        <div className="hv-agent-info-row">
          <div className="hv-agent-avatar-sm">
            {action.visiteAgent?.nom?.charAt(0)}{action.visiteAgent?.prenom?.charAt(0)}
          </div>
          <div className="hv-agent-details">
            <span className="hv-agent-name">{action.visiteAgent?.nom} {action.visiteAgent?.prenom}</span>
            <span className="hv-agent-matricule">#{action.matricule_agent}</span>
          </div>
        </div>
        
        <div className="hv-visit-info-row">
          <div className="hv-visit-date">
            <Calendar size={12} />
            <span>{formatDateFr(action.date_visite)}</span>
          </div>
          <div className="hv-visit-time">
            <Clock size={12} />
            <span>{action.heure_visite?.substring(0,5) || '--:--'}</span>
          </div>
        </div>
        
        {action.motif_action && (
          <div className="hv-motif-preview">
            <FileText size={12} />
            <span>{action.motif_action.substring(0, 60)}...</span>
          </div>
        )}
      </div>
      
      <div className="hv-action-card-footer">
        <button className="hv-btn-details" onClick={() => onViewDetails(action)}>
          <Eye size={14} />
          <span>Consulter</span>
        </button>
      </div>
    </div>
  );
};

const getActionColorStatic = (action) => {
  const colors = {
    'PROGRAMMATION': '#4361ee',
    'EFFECTUEE': '#2b9348',
    'REPROGRAMMEE': '#f59f00',
    'ANNULEE': '#e63946',
    'REAFFECTEE': '#9c36b5',
    'SAISIE_MANUELLE': '#9c36b5',
    'MODIFICATION': '#f59f00'
  };
  return colors[action] || '#6c757d';
};

const getResultatConfigStatic = (resultat) => {
  const configs = {
    'Apte': { class: 'hv-apte', icon: CheckCircle, color: '#2b9348' },
    'Apte avec réserves': { class: 'hv-reserves', icon: AlertCircle, color: '#f59f00' },
    'Inapte temporaire': { class: 'hv-temporaire', icon: AlertTriangle, color: '#f59f00' },
    'Inapte définitif': { class: 'hv-definitif', icon: XCircle, color: '#e63946' }
  };
  return configs[resultat] || { class: '', icon: Info, color: '#6c757d' };
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const HistoriqueVisites = () => {
  // ========== ÉTATS PRINCIPAUX ==========
  const [activeTab, setActiveTab] = useState('planning');
  const [historiqueActionsPlanning, setHistoriqueActionsPlanning] = useState([]);
  const [historiqueActionsFormulaire, setHistoriqueActionsFormulaire] = useState([]);
  const [historiqueAgent, setHistoriqueAgent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [error, setError] = useState(null);
  
  // ========== ÉTATS POUR L'ONGLET PLANNING ==========
  const [planningFilters, setPlanningFilters] = useState({
    dateUnique: '',
    filterTypeVisite: 'all',
    filterResultat: 'all',
    filterAction: 'all',
    searchTerm: ''
  });
  const [currentPagePlanning, setCurrentPagePlanning] = useState(1);
  const [itemsPerPage] = useState(10);
  
  // ========== ÉTATS POUR L'ONGLET FORMULAIRE ==========
  const [formulaireFilters, setFormulaireFilters] = useState({
    dateUnique: '',
    filterTypeVisite: 'all',
    filterResultat: 'all',
    filterAction: 'all',
    searchTerm: ''
  });
  const [currentPageFormulaire, setCurrentPageFormulaire] = useState(1);
  
  // ========== ÉTATS POUR L'ONGLET AGENT ==========
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedAgentDetail, setSelectedAgentDetail] = useState(null);
  const [currentPageAgent, setCurrentPageAgent] = useState(1);
  const [agents, setAgents] = useState([]);
  
  // ========== ÉTATS UI COMMUNS ==========
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [stats, setStats] = useState({ PLANNING: 0, FORMULAIRE: 0 });

  // ========== FONCTIONS UTILITAIRES ==========
  const getActionLabel = useCallback((action) => {
    const labels = {
      'PROGRAMMATION': 'Programmation',
      'EFFECTUEE': 'Visite effectuée',
      'REPROGRAMMEE': 'Reprogrammation',
      'ANNULEE': 'Annulation',
      'REAFFECTEE': 'Réaffectation',
      'SAISIE_MANUELLE': 'Saisie manuelle',
      'MODIFICATION': 'Modification'
    };
    return labels[action] || action;
  }, []);

  const getActionIcon = useCallback((action) => {
    const icons = {
      'PROGRAMMATION': '📅',
      'EFFECTUEE': '✓',
      'REPROGRAMMEE': '🔄',
      'ANNULEE': '✗',
      'REAFFECTEE': '👥',
      'SAISIE_MANUELLE': '✏️',
      'MODIFICATION': '✏️'
    };
    return icons[action] || '📋';
  }, []);

  // ========== CHARGEMENT DE L'HISTORIQUE PLANNING ==========
  const chargerHistoriquePlanning = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/historique/planning`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        let actions = (data.historique || []).map(item => ({
          ...item,
          source: 'PLANNING',
          sourceIcon: '📋',
          sourceLabel: 'Planning Auto',
          sourceColor: '#4361ee',
          sourceBg: '#eef0fd',
          actionLabel: getActionLabel(item.type_action),
          actionIcon: getActionIcon(item.type_action)
        }));
        
        if (planningFilters.dateUnique && planningFilters.dateUnique !== '') {
          actions = actions.filter(a => a.date_visite === planningFilters.dateUnique);
        }
        if (planningFilters.filterTypeVisite && planningFilters.filterTypeVisite !== 'all') {
          actions = actions.filter(a => a.type_visite === planningFilters.filterTypeVisite);
        }
        if (planningFilters.filterResultat && planningFilters.filterResultat !== 'all') {
          actions = actions.filter(a => a.resultat === planningFilters.filterResultat);
        }
        if (planningFilters.filterAction && planningFilters.filterAction !== 'all') {
          actions = actions.filter(a => a.type_action === planningFilters.filterAction);
        }
        if (planningFilters.searchTerm && planningFilters.searchTerm !== '') {
          const searchLower = planningFilters.searchTerm.toLowerCase();
          actions = actions.filter(a => 
            (a.visiteAgent?.nom?.toLowerCase().includes(searchLower)) ||
            (a.visiteAgent?.prenom?.toLowerCase().includes(searchLower)) ||
            String(a.matricule_agent).includes(planningFilters.searchTerm)
          );
        }
        
        setHistoriqueActionsPlanning(actions);
        setStats(prev => ({ ...prev, PLANNING: actions.length }));
      }
    } catch (err) {
      console.error(err);
      setError("Impossible de charger l'historique du planning");
    } finally {
      setLoading(false);
    }
  }, [planningFilters, getActionLabel, getActionIcon]);

  // ========== CHARGEMENT DE L'HISTORIQUE FORMULAIRE ==========
  const chargerHistoriqueFormulaire = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/historique/formulaire`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        let actions = (data.historique || []).map(item => ({
          ...item,
          source: 'FORMULAIRE',
          sourceIcon: '✏️',
          sourceLabel: 'Saisie manuelle',
          sourceColor: '#9c36b5',
          sourceBg: '#f5f0fc',
          actionLabel: getActionLabel(item.type_action),
          actionIcon: getActionIcon(item.type_action)
        }));
        
        if (formulaireFilters.dateUnique && formulaireFilters.dateUnique !== '') {
          actions = actions.filter(a => a.date_visite === formulaireFilters.dateUnique);
        }
        if (formulaireFilters.filterTypeVisite && formulaireFilters.filterTypeVisite !== 'all') {
          actions = actions.filter(a => a.type_visite === formulaireFilters.filterTypeVisite);
        }
        if (formulaireFilters.filterResultat && formulaireFilters.filterResultat !== 'all') {
          actions = actions.filter(a => a.resultat === formulaireFilters.filterResultat);
        }
        if (formulaireFilters.filterAction && formulaireFilters.filterAction !== 'all') {
          actions = actions.filter(a => a.type_action === formulaireFilters.filterAction);
        }
        if (formulaireFilters.searchTerm && formulaireFilters.searchTerm !== '') {
          const searchLower = formulaireFilters.searchTerm.toLowerCase();
          actions = actions.filter(a => 
            (a.visiteAgent?.nom?.toLowerCase().includes(searchLower)) ||
            (a.visiteAgent?.prenom?.toLowerCase().includes(searchLower)) ||
            String(a.matricule_agent).includes(formulaireFilters.searchTerm)
          );
        }
        
        setHistoriqueActionsFormulaire(actions);
        setStats(prev => ({ ...prev, FORMULAIRE: actions.length }));
      }
    } catch (err) {
      console.error(err);
      setError("Impossible de charger l'historique du formulaire");
    } finally {
      setLoading(false);
    }
  }, [formulaireFilters, getActionLabel, getActionIcon]);

  // ========== CHARGER L'HISTORIQUE PAR AGENT ==========
  const chargerHistoriqueParAgent = async (matricule) => {
    if (!matricule) {
      setHistoriqueAgent([]);
      setSelectedAgentDetail(null);
      return;
    }
    
    setLoadingAgent(true);
    try {
      const token = localStorage.getItem('token');
      
      const agentRes = await fetch(`${process.env.REACT_APP_API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const agentsData = await agentRes.json();
      const agent = agentsData.agents?.find(a => a.matricule_agent == matricule);
      setSelectedAgentDetail(agent);
      
      const historiqueRes = await fetch(`${process.env.REACT_APP_API_URL}/api/historique/agent/${matricule}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const historiqueData = await historiqueRes.json();
      
      if (historiqueData.success) {
        const actions = historiqueData.historique || [];
        const uniqueActions = [];
        const keys = new Set();
        
        for (const action of actions) {
          const key = `${action.date_visite}|${action.type_action}`;
          if (!keys.has(key)) {
            keys.add(key);
            uniqueActions.push(action);
          }
        }
        
        const actionsFormatees = uniqueActions.map(item => ({
          ...item,
          visiteAgent: agent ? {
            nom: agent.nom,
            prenom: agent.prenom,
            code_agence: agent.code_agence,
            matricule_agent: agent.matricule_agent
          } : item.visiteAgent,
          actionLabel: getActionLabel(item.type_action),
          actionIcon: getActionIcon(item.type_action),
          sourceIcon: item.source === 'PLANNING' ? '📋' : '✏️',
          sourceLabel: item.source === 'PLANNING' ? 'Planning Auto' : 'Formulaire',
          sourceColor: item.source === 'PLANNING' ? '#4361ee' : '#9c36b5',
          sourceBg: item.source === 'PLANNING' ? '#eef0fd' : '#f5f0fc'
        }));
        
        setHistoriqueAgent(actionsFormatees);
        setCurrentPageAgent(1);
      } else {
        setHistoriqueAgent([]);
      }
      
    } catch (err) {
      console.error('Erreur chargement historique agent:', err);
      setHistoriqueAgent([]);
    } finally {
      setLoadingAgent(false);
    }
  };

  // ========== CHARGEMENT DES AGENTS ==========
  const chargerAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setAgents(data.agents);
    } catch (err) {
      console.error('Erreur chargement agents:', err);
    }
  };

  // ========== INITIALISATION ==========
  useEffect(() => {
    chargerAgents();
  }, []);

  useEffect(() => {
    if (activeTab === 'planning') {
      chargerHistoriquePlanning();
    } else if (activeTab === 'formulaire') {
      chargerHistoriqueFormulaire();
    }
  }, [activeTab, planningFilters, formulaireFilters, chargerHistoriquePlanning, chargerHistoriqueFormulaire]);

  // ========== STATISTIQUES HISTORIQUE AGENT ==========
  const getAgentStats = () => {
    const actions = historiqueAgent;
    if (!Array.isArray(actions)) return { 
      total: 0, effectuees: 0, reprogrammations: 0, annulations: 0, 
      reaffectations: 0, programmations: 0, periodiques: 0, reprises: 0,
      modifications: 0, reclassements: 0, embauches: 0, saisies: 0
    };
    
    return {
      total: actions.length,
      effectuees: actions.filter(a => a.type_action === 'EFFECTUEE').length,
      reprogrammations: actions.filter(a => a.type_action === 'REPROGRAMMEE').length,
      annulations: actions.filter(a => a.type_action === 'ANNULEE').length,
      reaffectations: actions.filter(a => a.type_action === 'REAFFECTEE').length,
      programmations: actions.filter(a => a.type_action === 'PROGRAMMATION').length,
      saisies: actions.filter(a => a.type_action === 'SAISIE_MANUELLE').length,
      modifications: actions.filter(a => a.type_action === 'MODIFICATION').length,
      periodiques: actions.filter(a => a.type_visite === 'Périodique').length,
      reprises: actions.filter(a => a.type_visite === 'Reprise').length,
      reclassements: actions.filter(a => a.type_visite === 'Reclassement').length,
      embauches: actions.filter(a => a.type_visite === 'Embauche').length
    };
  };

  const agentStats = getAgentStats();

  // ========== FONCTIONS DE PAGINATION ==========
  const getCurrentData = () => {
    if (activeTab === 'planning') {
      const start = (currentPagePlanning - 1) * itemsPerPage;
      return historiqueActionsPlanning.slice(start, start + itemsPerPage);
    } else if (activeTab === 'formulaire') {
      const start = (currentPageFormulaire - 1) * itemsPerPage;
      return historiqueActionsFormulaire.slice(start, start + itemsPerPage);
    } else {
      const start = (currentPageAgent - 1) * itemsPerPage;
      return historiqueAgent.slice(start, start + itemsPerPage);
    }
  };

  const getTotalPages = () => {
    if (activeTab === 'planning') {
      return Math.ceil(historiqueActionsPlanning.length / itemsPerPage);
    } else if (activeTab === 'formulaire') {
      return Math.ceil(historiqueActionsFormulaire.length / itemsPerPage);
    } else {
      return Math.ceil(historiqueAgent.length / itemsPerPage);
    }
  };

  const getCurrentPage = () => {
    if (activeTab === 'planning') return currentPagePlanning;
    if (activeTab === 'formulaire') return currentPageFormulaire;
    return currentPageAgent;
  };

  const setCurrentPage = (page) => {
    if (activeTab === 'planning') setCurrentPagePlanning(page);
    else if (activeTab === 'formulaire') setCurrentPageFormulaire(page);
    else setCurrentPageAgent(page);
  };

  const goToPreviousPage = () => {
    const newPage = Math.max(1, getCurrentPage() - 1);
    setCurrentPage(newPage);
  };

  const goToNextPage = () => {
    const newPage = Math.min(getTotalPages(), getCurrentPage() + 1);
    setCurrentPage(newPage);
  };

  const goToFirstPage = () => setCurrentPage(1);
  const goToLastPage = () => setCurrentPage(getTotalPages());

  const currentData = getCurrentData();
  const totalPages = getTotalPages();
  const currentPageNum = getCurrentPage();

  // ========== GESTIONNAIRES DE FILTRES ==========
  const updatePlanningFilter = (key, value) => {
    setPlanningFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPagePlanning(1);
  };

  const updateFormulaireFilter = (key, value) => {
    setFormulaireFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPageFormulaire(1);
  };

  const resetPlanningFilters = () => {
    setPlanningFilters({
      dateUnique: '',
      filterTypeVisite: 'all',
      filterResultat: 'all',
      filterAction: 'all',
      searchTerm: ''
    });
    setCurrentPagePlanning(1);
  };

  const resetFormulaireFilters = () => {
    setFormulaireFilters({
      dateUnique: '',
      filterTypeVisite: 'all',
      filterResultat: 'all',
      filterAction: 'all',
      searchTerm: ''
    });
    setCurrentPageFormulaire(1);
  };

// ========== STATISTIQUES GLOBALES (CORRIGÉ) ==========
const getGlobalStats = () => {
  const actions = activeTab === 'planning' ? historiqueActionsPlanning : historiqueActionsFormulaire;
  
  if (!Array.isArray(actions) || actions.length === 0) { 
    if (activeTab === 'planning') {
      return { 
        total: 0, effectuees: 0, programmations: 0, saisies: 0,
        reprogrammations: 0, annulations: 0, reaffectations: 0, modifications: 0,
        periodiques: 0, reprises: 0, reclassements: 0, embauches: 0, 
        aptes: 0, inaptesTemp: 0, inaptesDef: 0 
      };
    } else {
      return { 
        total: 0, effectuees: 0, programmations: 0, saisies: 0,
        reprogrammations: 0, modifications: 0,
        periodiques: 0, reprises: 0, reclassements: 0, embauches: 0, 
        aptes: 0, inaptesTemp: 0, inaptesDef: 0 
      };
    }
  }
  
  // ✅ Distinction claire :
  // - programmations = type_action === 'PROGRAMMATION' (créations auto du système)
  // - saisies = type_action === 'SAISIE_MANUELLE' (créations manuelles utilisateur)
  
  const programmationsCount = actions.filter(a => a.type_action === 'PROGRAMMATION').length;
  const saisiesCount = actions.filter(a => a.type_action === 'SAISIE_MANUELLE').length;
  
  const commonStats = {
    total: actions.length,
    effectuees: actions.filter(a => a.type_action === 'EFFECTUEE').length,
    reprogrammations: actions.filter(a => a.type_action === 'REPROGRAMMEE').length,
    periodiques: actions.filter(a => a.type_visite === 'Périodique').length,
    reprises: actions.filter(a => a.type_visite === 'Reprise').length,
    reclassements: actions.filter(a => a.type_visite === 'Reclassement').length,
    embauches: actions.filter(a => a.type_visite === 'Embauche').length,
    aptes: actions.filter(a => a.resultat === 'Apte' && a.type_action === 'EFFECTUEE').length,
    inaptesTemp: actions.filter(a => a.resultat === 'Inapte temporaire' && a.type_action === 'EFFECTUEE').length,
    inaptesDef: actions.filter(a => a.resultat === 'Inapte définitif' && a.type_action === 'EFFECTUEE').length
  };
  
  if (activeTab === 'planning') {
    return {
      ...commonStats,
      programmations: programmationsCount,
      saisies: 0,
      annulations: actions.filter(a => a.type_action === 'ANNULEE').length,
      reaffectations: actions.filter(a => a.type_action === 'REAFFECTEE').length,
      modifications: 0
    };
  } else {
    // FORMULAIRE : les deux sont distincts
    return {
      ...commonStats,
      programmations: programmationsCount,  // ← Visites auto (post-contrôle)
      saisies: saisiesCount,                // ← Visites manuelles utilisateur
      modifications: actions.filter(a => a.type_action === 'MODIFICATION').length,
      annulations: 0,
      reaffectations: 0
    };
  }
};

  const globalStats = getGlobalStats();

  // ========== MODAL DE DÉTAILS ==========
  const openDetailsModal = (action) => {
    setSelectedAction(action);
    setShowDetailsModal(true);
  };

  const DetailsModal = () => {
    if (!showDetailsModal || !selectedAction) return null;
    
    const item = selectedAction;
    const resultatConfig = getResultatConfigStatic(item.resultat);
    
    const agentNom = item.visiteAgent?.nom || item.agent_nom || 'Agent';
    const agentPrenom = item.visiteAgent?.prenom || item.agent_prenom || '';
    const agentMatricule = item.matricule_agent || '?';
    const agentAgence = item.visiteAgent?.code_agence || item.code_agence || 'N/A';
    
    return (
      <div className="hv-modal-overlay-premium" onClick={() => setShowDetailsModal(false)}>
        <div className="hv-details-modal-premium" onClick={e => e.stopPropagation()}>
          <div className="hv-modal-header-premium">
            <div className="hv-modal-title-section">
              <div className="hv-modal-icon">
                <History size={24} />
              </div>
              <div>
                <h2>Détails de l'action</h2>
                <p>{item.actionLabel} · {formatDateTimeFr(item.created_at)}</p>
              </div>
            </div>
            <button className="hv-modal-close-premium" onClick={() => setShowDetailsModal(false)}>
              <XCircle size={20} />
            </button>
          </div>
          
          <div className="hv-modal-body-premium">
            <div className="hv-details-agent-premium">
              <div className="hv-agent-avatar-premium">
                {agentNom.charAt(0)}{agentPrenom.charAt(0)}
              </div>
              <div className="hv-agent-info-premium">
                <h3>{agentNom} {agentPrenom}</h3>
                <div className="hv-agent-meta-premium">
                  <span className="hv-meta-item">
                    <Hash size={12} /> Matricule: #{agentMatricule}
                  </span>
                  <span className="hv-meta-item">
                    <Building2 size={12} /> Agence: {agentAgence !== 'N/A' ? `Agence ${agentAgence}` : 'Non spécifiée'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="hv-details-grid-premium">
              <div className="hv-detail-card-premium">
                <div className="hv-detail-icon"><Calendar size={16} /></div>
                <div className="hv-detail-content">
                  <label>Date de visite</label>
                  <span className="hv-detail-value">{formatDateFr(item.date_visite)}</span>
                </div>
              </div>
              
              <div className="hv-detail-card-premium">
                <div className="hv-detail-icon"><Clock size={16} /></div>
                <div className="hv-detail-content">
                  <label>Horaire</label>
                  <span className="hv-detail-value">{item.heure_visite?.substring(0,5) || '--:--'}</span>
                </div>
              </div>
              
              <div className="hv-detail-card-premium">
                <div className="hv-detail-icon"><Layers size={16} /></div>
                <div className="hv-detail-content">
                  <label>Type d'action</label>
                  <span className="hv-detail-value">{item.actionLabel}</span>
                </div>
              </div>
              
              <div className="hv-detail-card-premium">
                <div className="hv-detail-icon"><Briefcase size={16} /></div>
                <div className="hv-detail-content">
                  <label>Type de visite</label>
                  <span className="hv-detail-value">{item.type_visite || 'Non spécifié'}</span>
                </div>
              </div>
              
              {item.medecin && (
                <div className="hv-detail-card-premium">
                  <div className="hv-detail-icon"><User size={16} /></div>
                  <div className="hv-detail-content">
                    <label>Médecin</label>
                    <span className="hv-detail-value">{item.medecin}</span>
                  </div>
                </div>
              )}
              
              <div className="hv-detail-card-premium">
                <div className="hv-detail-icon"><Activity size={16} /></div>
                <div className="hv-detail-content">
                  <label>Source</label>
                  <span className="hv-detail-value">{item.sourceLabel}</span>
                </div>
              </div>
            </div>
            
            {item.resultat && (
              <div className={`hv-decision-section-premium ${resultatConfig.class}`}>
                <div className="hv-decision-icon-premium">
                  <resultatConfig.icon size={24} />
                </div>
                <div className="hv-decision-info-premium">
                  <span className="hv-decision-label">Décision médicale</span>
                  <span className="hv-decision-value">{item.resultat}</span>
                </div>
              </div>
            )}
            
            {item.motif_action && (
              <div className="hv-motif-section-premium">
                <h4>Motif de l'action</h4>
                <div className="hv-motif-content-premium">
                  <p>{item.motif_action}</p>
                </div>
              </div>
            )}
            
            {item.details && item.details.prochaine_visite && (
              <div className="hv-next-visit-premium">
                <CalendarIcon size={16} />
                <div>
                  <label>Prochaine visite programmée</label>
                  <span>{formatDateFr(item.details.prochaine_visite)}</span>
                  {item.details.periodicite_texte && <small>({item.details.periodicite_texte})</small>}
                </div>
              </div>
            )}
          </div>
          
          <div className="hv-modal-footer-premium">
            <button className="hv-btn-secondary-premium" onClick={() => setShowDetailsModal(false)}>
              Fermer
            </button>
            <button className="hv-btn-primary-premium" onClick={() => setShowDetailsModal(false)}>
              <CheckCircle size={16} /> Compris
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========== RENDU PRINCIPAL ==========
  return (
    <div className="hv-container-premium">
      
      {/* HEADER PREMIUM */}
      <div className="hv-header-premium">
        <div className="hv-header-left-premium">
          <div className="hv-header-icon-premium">
            <History size={28} />
          </div>
          <div className="hv-header-title-premium">
            <h1>Historique des actions</h1>
            <p>Suivi complet de toutes les opérations (planning automatique + saisies manuelles)</p>
          </div>
        </div>
        <div className="hv-header-right-premium">
          <div className="hv-stats-summary">
            <div className="hv-stat-chip">
              <Activity size={14} />
              <span>Planning: <strong>{stats.PLANNING}</strong></span>
            </div>
            <div className="hv-stat-chip">
              <PenTool size={14} />
              <span>Formulaire: <strong>{stats.FORMULAIRE}</strong></span>
            </div>
            {activeTab === 'agent' && selectedAgentDetail && (
              <div className="hv-stat-chip hv-agent-chip">
                <User size={14} />
                <span>{selectedAgentDetail.nom} {selectedAgentDetail.prenom}</span>
              </div>
            )}
          </div>
          <button className="hv-btn-icon-premium" onClick={() => {
            if (activeTab === 'planning') chargerHistoriquePlanning();
            else if (activeTab === 'formulaire') chargerHistoriqueFormulaire();
            else if (selectedAgent) chargerHistoriqueParAgent(selectedAgent);
          }} title="Actualiser">
            <RefreshCw size={18} />
          </button>
          {activeTab !== 'agent' && (
            <button className={`hv-btn-icon-premium ${showFilters ? 'hv-active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
              <Sliders size={18} />
            </button>
          )}
          <div className="hv-view-toggle-premium">
            <button className={`hv-view-btn-premium ${viewMode === 'list' ? 'hv-active' : ''}`} onClick={() => setViewMode('list')}>
              <List size={16} />
            </button>
            <button className={`hv-view-btn-premium ${viewMode === 'grid' ? 'hv-active' : ''}`} onClick={() => setViewMode('grid')}>
              <Grid3x3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* STATS SECTION - SANS "Total saisies" et SANS "Par type de visite" */}
      {(activeTab === 'planning' || activeTab === 'formulaire') && (
        <>
          {activeTab === 'planning' ? (
            <div className="hv-stats-grid-premium" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
              <StatCard title="Total actions" value={globalStats.total} icon={Activity} color="#4361ee" />
              <StatCard title="Visites effectuées" value={globalStats.effectuees} icon={CheckCircle} color="#2b9348" />
              <StatCard title="Programmations" value={globalStats.programmations} icon={Calendar} color="#4361ee" />
              <StatCard title="Reprogrammations" value={globalStats.reprogrammations || 0} icon={Repeat} color="#f59f00" />
              <StatCard title="Annulations" value={globalStats.annulations || 0} icon={XCircle} color="#e63946" />
              <StatCard title="Réaffectations" value={globalStats.reaffectations || 0} icon={Users} color="#9c36b5" />
            </div>
          ) : (
             <div className="hv-stats-grid-premium" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
    <StatCard title="Total actions" value={globalStats.total} icon={Activity} color="#4361ee" />
    <StatCard title="Visites effectuées" value={globalStats.effectuees} icon={CheckCircle} color="#2b9348" />
    <StatCard title="Programmations" value={globalStats.programmations} icon={Calendar} color="#4361ee" />
    <StatCard title="Saisies" value={globalStats.saisies} icon={PenTool} color="#9c36b5" />
    <StatCard title="Reprogrammations" value={globalStats.reprogrammations || 0} icon={Repeat} color="#f59f00" />
    <StatCard title="Modifications" value={globalStats.modifications || 0} icon={Edit2} color="#f59f00" />
  </div>
)}
          
          {/* UNIQUEMENT "Par résultat" - Plus de "Par type de visite" */}
          <div className="hv-stats-secondary-premium" style={{ gridTemplateColumns: 'repeat(1, 1fr)', display: 'grid', gap: '16px', marginTop: '16px' }}>
            <div className="hv-stat-group-premium">
              <span className="hv-stat-group-title">Par résultat</span>
              <div className="hv-result-stats-premium" style={{ display: 'flex', gap: '12px' }}>
                <div className="hv-result-stat-item hv-apte">
                  <CheckCircle size={14} />
                  <span>Aptes</span>
                  <strong>{globalStats.aptes}</strong>
                </div>
                <div className="hv-result-stat-item hv-temporaire">
                  <AlertTriangle size={14} />
                  <span>Inaptes temp.</span>
                  <strong>{globalStats.inaptesTemp}</strong>
                </div>
                <div className="hv-result-stat-item hv-definitif">
                  <XCircle size={14} />
                  <span>Inaptes déf.</span>
                  <strong>{globalStats.inaptesDef}</strong>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ========== ONGLETS PREMIUM ========== */}
      <div className="hv-tabs-premium">
        <button 
          className={`hv-tab-premium ${activeTab === 'planning' ? 'hv-active' : ''}`} 
          onClick={() => { setActiveTab('planning'); setShowFilters(false); }}
        >
          <Activity size={18} />
          <span>Planning automatique</span>
          <span className="hv-tab-badge">{stats.PLANNING}</span>
        </button>
        <button 
          className={`hv-tab-premium ${activeTab === 'formulaire' ? 'hv-active' : ''}`} 
          onClick={() => { setActiveTab('formulaire'); setShowFilters(false); }}
        >
          <PenTool size={18} />
          <span>Saisies manuelles</span>
          <span className="hv-tab-badge">{stats.FORMULAIRE}</span>
        </button>
        <button 
          className={`hv-tab-premium ${activeTab === 'agent' ? 'hv-active' : ''}`} 
          onClick={() => { setActiveTab('agent'); setShowFilters(false); setCurrentPageAgent(1); }}
        >
          <UserSearch size={18} />
          <span>Historique par agent</span>
          <span className="hv-tab-badge">{historiqueAgent.length}</span>
        </button>
      </div>

      {/* ========== ONGLET PLANNING ========== */}
      {activeTab === 'planning' && (
        <>
          <div className="hv-search-section-premium">
            <div className="hv-search-wrapper-premium">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Rechercher par nom d'agent, prénom ou matricule..." 
                value={planningFilters.searchTerm} 
                onChange={(e) => updatePlanningFilter('searchTerm', e.target.value)} 
              />
              {planningFilters.searchTerm && (
                <button className="hv-clear-premium" onClick={() => updatePlanningFilter('searchTerm', '')}>
                  <XCircle size={16} />
                </button>
              )}
            </div>
          </div>

          {showFilters && (
            <div className="hv-filters-premium">
              <div className="hv-filters-header-premium">
                <div className="hv-filters-title">
                  <Filter size={16} />
                  <h4>Filtres avancés</h4>
                </div>
                <button className="hv-reset-premium" onClick={resetPlanningFilters}>
                  <RefreshCw size={14} /> Réinitialiser
                </button>
              </div>
              <div className="hv-filters-grid-premium">
                <div className="hv-filter-premium">
                  <label>Date de visite</label>
                  <input type="date" value={planningFilters.dateUnique} onChange={(e) => updatePlanningFilter('dateUnique', e.target.value)} />
                </div>
                <div className="hv-filter-premium">
                  <label>Type de visite</label>
                  <select value={planningFilters.filterTypeVisite} onChange={(e) => updatePlanningFilter('filterTypeVisite', e.target.value)}>
                    <option value="all">Tous les types</option>
                    <option value="Périodique">Périodique</option>
                    <option value="Reprise">Reprise</option>
                    <option value="Reclassement">Reclassement</option>
                    <option value="Embauche">Embauche</option>
                  </select>
                </div>
                <div className="hv-filter-premium">
                  <label>Résultat médical</label>
                  <select value={planningFilters.filterResultat} onChange={(e) => updatePlanningFilter('filterResultat', e.target.value)}>
                    <option value="all">Tous les résultats</option>
                    <option value="Apte">Apte</option>
                    <option value="Inapte temporaire">Inapte temporaire</option>
                    <option value="Inapte définitif">Inapte définitif</option>
                  </select>
                </div>
                <div className="hv-filter-premium">
                  <label>Type d'action</label>
                  <select value={planningFilters.filterAction} onChange={(e) => updatePlanningFilter('filterAction', e.target.value)}>
                    <option value="all">Toutes les actions</option>
                    <option value="PROGRAMMATION">Programmation</option>
                    <option value="EFFECTUEE">Effectuée</option>
                    <option value="REPROGRAMMEE">Reprogrammation</option>
                    <option value="ANNULEE">Annulation</option>
                    <option value="REAFFECTEE">Réaffectation</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="hv-content-premium">
            {loading ? (
              <div className="hv-loading-premium">
                <div className="hv-spinner-premium"></div>
                <p>Chargement des données...</p>
              </div>
            ) : currentData.length === 0 ? (
              <div className="hv-empty-premium">
                <History size={48} strokeWidth={1.5} />
                <h3>Aucune action enregistrée</h3>
                <p>Aucune action n'a été trouvée pour les critères sélectionnés.</p>
                <button className="hv-btn-primary-premium" onClick={chargerHistoriquePlanning}>
                  <RefreshCw size={16} /> Actualiser
                </button>
              </div>
            ) : (
              <>
                <div className={`hv-actions-grid-premium ${viewMode === 'grid' ? 'hv-grid-view' : 'hv-list-view'}`}>
                  {currentData.map((item, idx) => (
                    <ActionCard 
                      key={item.id || idx} 
                      action={item} 
                      onViewDetails={openDetailsModal} 
                      viewMode={viewMode}
                    />
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <div className="hv-pagination-premium">
                    <button onClick={goToFirstPage} disabled={currentPageNum === 1}>
                      <ChevronsLeft size={16} />
                    </button>
                    <button onClick={goToPreviousPage} disabled={currentPageNum === 1}>
                      <ChevronLeft size={16} /> Précédent
                    </button>
                    <span className="hv-page-info-premium">
                      Page {currentPageNum} sur {totalPages}
                    </span>
                    <button onClick={goToNextPage} disabled={currentPageNum === totalPages}>
                      Suivant <ChevronRight size={16} />
                    </button>
                    <button onClick={goToLastPage} disabled={currentPageNum === totalPages}>
                      <ChevronsRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ========== ONGLET FORMULAIRE ========== */}
      {activeTab === 'formulaire' && (
        <>
          <div className="hv-search-section-premium">
            <div className="hv-search-wrapper-premium">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Rechercher par nom d'agent, prénom ou matricule..." 
                value={formulaireFilters.searchTerm} 
                onChange={(e) => updateFormulaireFilter('searchTerm', e.target.value)} 
              />
              {formulaireFilters.searchTerm && (
                <button className="hv-clear-premium" onClick={() => updateFormulaireFilter('searchTerm', '')}>
                  <XCircle size={16} />
                </button>
              )}
            </div>
          </div>

          {showFilters && (
  <div className="hv-filters-premium">
    <div className="hv-filters-header-premium">
      <div className="hv-filters-title">
        <Filter size={16} />
        <h4>Filtres avancés</h4>
      </div>
      <button className="hv-reset-premium" onClick={resetFormulaireFilters}>
        <RefreshCw size={14} /> Réinitialiser
      </button>
    </div>
    <div className="hv-filters-grid-premium">
      <div className="hv-filter-premium">
        <label>Date de visite</label>
        <input type="date" value={formulaireFilters.dateUnique} onChange={(e) => updateFormulaireFilter('dateUnique', e.target.value)} />
      </div>
      <div className="hv-filter-premium">
        <label>Type de visite</label>
        <select value={formulaireFilters.filterTypeVisite} onChange={(e) => updateFormulaireFilter('filterTypeVisite', e.target.value)}>
          <option value="all">Tous les types</option>
          <option value="Périodique">Périodique</option>
          <option value="Reprise">Reprise</option>
          <option value="Reclassement">Reclassement</option>
          <option value="Embauche">Embauche</option>
        </select>
      </div>
      <div className="hv-filter-premium">
        <label>Résultat médical</label>
        <select value={formulaireFilters.filterResultat} onChange={(e) => updateFormulaireFilter('filterResultat', e.target.value)}>
          <option value="all">Tous les résultats</option>
          <option value="Apte">Apte</option>
          <option value="Inapte temporaire">Inapte temporaire</option>
          <option value="Inapte définitif">Inapte définitif</option>
        </select>
      </div>
      <div className="hv-filter-premium">
        <label>Type d'action</label>
        <select value={formulaireFilters.filterAction} onChange={(e) => updateFormulaireFilter('filterAction', e.target.value)}>
          <option value="all">Toutes les actions</option>
          <option value="PROGRAMMATION">Programmation</option>
          <option value="SAISIE_MANUELLE">Saisie manuelle</option>
          <option value="EFFECTUEE"> Effectuée</option>
          <option value="REPROGRAMMEE"> Reprogrammation</option>
          <option value="MODIFICATION"> Modification</option>
        </select>
      </div>
    </div>
  </div>
)}

          <div className="hv-content-premium">
            {loading ? (
              <div className="hv-loading-premium">
                <div className="hv-spinner-premium"></div>
                <p>Chargement des données...</p>
              </div>
            ) : currentData.length === 0 ? (
              <div className="hv-empty-premium">
                <History size={48} strokeWidth={1.5} />
                <h3>Aucune action enregistrée</h3>
                <p>Aucune action n'a été trouvée pour les critères sélectionnés.</p>
                <button className="hv-btn-primary-premium" onClick={chargerHistoriqueFormulaire}>
                  <RefreshCw size={16} /> Actualiser
                </button>
              </div>
            ) : (
              <>
                <div className={`hv-actions-grid-premium ${viewMode === 'grid' ? 'hv-grid-view' : 'hv-list-view'}`}>
                  {currentData.map((item, idx) => (
                    <ActionCard 
                      key={item.id || idx} 
                      action={item} 
                      onViewDetails={openDetailsModal} 
                      viewMode={viewMode}
                    />
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <div className="hv-pagination-premium">
                    <button onClick={goToFirstPage} disabled={currentPageNum === 1}>
                      <ChevronsLeft size={16} />
                    </button>
                    <button onClick={goToPreviousPage} disabled={currentPageNum === 1}>
                      <ChevronLeft size={16} /> Précédent
                    </button>
                    <span className="hv-page-info-premium">
                      Page {currentPageNum} sur {totalPages}
                    </span>
                    <button onClick={goToNextPage} disabled={currentPageNum === totalPages}>
                      Suivant <ChevronRight size={16} />
                    </button>
                    <button onClick={goToLastPage} disabled={currentPageNum === totalPages}>
                      <ChevronsRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ========== ONGLET HISTORIQUE PAR AGENT ========== */}
      {activeTab === 'agent' && (
        <>
          <div className="hv-agent-search-premium">
            <div className="hv-agent-search-header-premium">
              <UserSearch size={20} />
              <h3>Rechercher un agent</h3>
            </div>
            <div className="hv-agent-search-form-premium">
              <div className="hv-agent-input-premium">
                <label>Agent</label>
                <AgentSearchInput 
                  value={selectedAgent} 
                  onChange={(matricule) => { 
                    setSelectedAgent(matricule || ''); 
                    if (matricule) chargerHistoriqueParAgent(matricule); 
                    else { setHistoriqueAgent([]); setSelectedAgentDetail(null); } 
                  }} 
                  onSelect={(agent) => { if (agent) chargerHistoriqueParAgent(agent.matricule_agent); }} 
                  placeholder="Tapez le nom, prénom ou matricule..." 
                />
              </div>
              <button className="hv-btn-reset-premium" onClick={() => { setSelectedAgent(''); setHistoriqueAgent([]); setSelectedAgentDetail(null); }}>
                <XCircle size={14} /> Réinitialiser
              </button>
            </div>
          </div>

          {selectedAgentDetail && (
            <div className="hv-agent-profile-premium">
              <div className="hv-profile-avatar-premium">
                {selectedAgentDetail.nom?.charAt(0)}{selectedAgentDetail.prenom?.charAt(0)}
              </div>
              <div className="hv-profile-info-premium">
                <h2>{selectedAgentDetail.nom} {selectedAgentDetail.prenom}</h2>
                <div className="hv-profile-details-premium">
                  <span><Hash size={12} /> Matricule: #{selectedAgentDetail.matricule_agent}</span>
                  <span><Building2 size={12} /> Agence: {selectedAgentDetail.code_agence || 'Non spécifiée'}</span>
                </div>
              </div>
              <div className="hv-profile-stats-premium" style={{ gridTemplateColumns: 'repeat(7, 1fr)', display: 'grid', gap: '12px' }}>
                <div className="hv-profile-stat">
                  <span className="hv-stat-number">{agentStats.total}</span>
                  <span className="hv-stat-label">Total actions</span>
                </div>
                <div className="hv-profile-stat">
                  <span className="hv-stat-number hv-success">{agentStats.effectuees}</span>
                  <span className="hv-stat-label">Effectuées</span>
                </div>
                <div className="hv-profile-stat">
                  <span className="hv-stat-number hv-primary">{agentStats.programmations}</span>
                  <span className="hv-stat-label">Programmations auto</span>
                </div>
                <div className="hv-profile-stat">
                  <span className="hv-stat-number hv-purple">{agentStats.saisies}</span>
                  <span className="hv-stat-label">Saisies manuelles</span>
                </div>
                <div className="hv-profile-stat">
                  <span className="hv-stat-number hv-warning">{agentStats.reprogrammations}</span>
                  <span className="hv-stat-label">Reprogrammations</span>
                </div>
                <div className="hv-profile-stat">
                  <span className="hv-stat-number hv-info">{agentStats.modifications}</span>
                  <span className="hv-stat-label">Modifiées</span>
                </div>
                <div className="hv-profile-stat">
                  <span className="hv-stat-number hv-purple">{agentStats.reaffectations}</span>
                  <span className="hv-stat-label">Réaffectations</span>
                </div>
                <div className="hv-profile-stat">
                  <span className="hv-stat-number hv-danger">{agentStats.annulations}</span>
                  <span className="hv-stat-label">Annulations</span>
                </div>
              </div>
            </div>
          )}

          <div className="hv-content-premium">
            {loadingAgent ? (
              <div className="hv-loading-premium">
                <div className="hv-spinner-premium"></div>
                <p>Chargement de l'historique...</p>
              </div>
            ) : !selectedAgent ? (
              <div className="hv-empty-premium">
                <UserSearch size={48} strokeWidth={1.5} />
                <h3>Aucun agent sélectionné</h3>
                <p>Recherchez un agent pour visualiser son historique complet</p>
              </div>
            ) : historiqueAgent.length === 0 ? (
              <div className="hv-empty-premium">
                <History size={48} strokeWidth={1.5} />
                <h3>Aucune action trouvée</h3>
                <p>Cet agent n'a aucune action enregistrée dans l'historique</p>
              </div>
            ) : (
              <>
                <div className={`hv-actions-grid-premium ${viewMode === 'grid' ? 'hv-grid-view' : 'hv-list-view'}`}>
                  {currentData.map((item, idx) => (
                    <ActionCard 
                      key={item.id || idx} 
                      action={item} 
                      onViewDetails={openDetailsModal} 
                      viewMode={viewMode}
                    />
                  ))}
                </div>
                
                {totalPages > 1 && (
                  <div className="hv-pagination-premium">
                    <button onClick={goToFirstPage} disabled={currentPageNum === 1}>
                      <ChevronsLeft size={16} />
                    </button>
                    <button onClick={goToPreviousPage} disabled={currentPageNum === 1}>
                      <ChevronLeft size={16} /> Précédent
                    </button>
                    <span className="hv-page-info-premium">
                      Page {currentPageNum} sur {totalPages}
                    </span>
                    <button onClick={goToNextPage} disabled={currentPageNum === totalPages}>
                      Suivant <ChevronRight size={16} />
                    </button>
                    <button onClick={goToLastPage} disabled={currentPageNum === totalPages}>
                      <ChevronsRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      <DetailsModal />
    </div>
  );
};

// Composant UserPlus manquant
const UserPlus = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="19" y1="8" x2="19" y2="14" />
    <line x1="22" y1="11" x2="16" y2="11" />
  </svg>
);

// Composant Hash manquant
const Hash = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </svg>
);

export default HistoriqueVisites;