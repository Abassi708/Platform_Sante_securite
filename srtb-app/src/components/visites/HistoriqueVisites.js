// frontend/components/visites/HistoriqueVisites.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, User, FileText, CheckCircle, XCircle,
  AlertCircle, Info, RefreshCw, Eye, Layers, PenTool, History, 
  Activity, Award, AlertTriangle, Filter, Search, ChevronLeft, 
  ChevronRight, Sliders, Grid3x3, List, PlusCircle, Repeat, Trash2, Users,
  TrendingUp, Calendar as CalendarIcon, Briefcase, Shield, Zap,
  UserSearch, ChevronsLeft, ChevronsRight
} from 'lucide-react';
import AgentSearchInput from '../common/AgentSearchInput';
import '../../styles/HistoriqueVisites.css';

// ============================================
// FONCTIONS DE FORMATAGE DE DATES CORRIGÉES (sans décalage horaire)
// ============================================

// Formatage simple YYYY-MM-DD -> DD/MM/YYYY
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

// Formatage avec heure pour les timestamps (created_at)
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

// Formatage long avec jour de la semaine (pour les détails)
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

// Alias pour compatibilité
const formatDate = formatDateTimeFr;
const formatDateSimple = formatDateFr;

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

/**
 * Composant HistoriqueVisites
 * Complètement isolé avec des classes prefixées 'hv-'
 * Aucun conflit CSS avec le reste de l'application
 */
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
      'SAISIE_MANUELLE': 'Saisie manuelle'
    };
    return labels[action] || action;
  }, []);

  const getActionIcon = useCallback((action) => {
    const icons = {
      'PROGRAMMATION': '',
      'EFFECTUEE': '',
      'REPROGRAMMEE': '',
      'ANNULEE': '',
      'REAFFECTEE': '',
      'SAISIE_MANUELLE': ''
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
          sourceColor: '#3b82f6',
          sourceBg: '#eff6ff',
          actionLabel: getActionLabel(item.type_action),
          actionIcon: getActionIcon(item.type_action)
        }));
        
        // Application des filtres
        if (planningFilters.dateUnique) {
          actions = actions.filter(a => a.date_visite === planningFilters.dateUnique);
        }
        if (planningFilters.filterTypeVisite !== 'all') {
          actions = actions.filter(a => a.type_visite === planningFilters.filterTypeVisite);
        }
        if (planningFilters.filterResultat !== 'all') {
          actions = actions.filter(a => a.resultat === planningFilters.filterResultat);
        }
        if (planningFilters.filterAction !== 'all') {
          actions = actions.filter(a => a.type_action === planningFilters.filterAction);
        }
        if (planningFilters.searchTerm) {
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
    } finally {
      setLoading(false);
    }
  }, [planningFilters]);

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
          sourceColor: '#8b5cf6',
          sourceBg: '#f5f3ff',
          actionLabel: getActionLabel(item.type_action),
          actionIcon: getActionIcon(item.type_action)
        }));
        
        // Application des filtres
        if (formulaireFilters.dateUnique) {
          actions = actions.filter(a => a.date_visite === formulaireFilters.dateUnique);
        }
        if (formulaireFilters.filterTypeVisite !== 'all') {
          actions = actions.filter(a => a.type_visite === formulaireFilters.filterTypeVisite);
        }
        if (formulaireFilters.filterResultat !== 'all') {
          actions = actions.filter(a => a.resultat === formulaireFilters.filterResultat);
        }
        if (formulaireFilters.filterAction !== 'all') {
          actions = actions.filter(a => a.type_action === formulaireFilters.filterAction);
        }
        if (formulaireFilters.searchTerm) {
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
    } finally {
      setLoading(false);
    }
  }, [formulaireFilters]);

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
          sourceIcon: item.source === 'PLANNING' ? '' : '',
          sourceLabel: item.source === 'PLANNING' ? 'Planning Auto' : 'Formulaire',
          sourceColor: item.source === 'PLANNING' ? '#3b82f6' : '#8b5cf6',
          sourceBg: item.source === 'PLANNING' ? '#eff6ff' : '#f5f3ff'
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
      reaffectations: 0, programmations: 0, periodiques: 0, reprises: 0
    };
    
    return {
      total: actions.length,
      effectuees: actions.filter(a => a.type_action === 'EFFECTUEE').length,
      reprogrammations: actions.filter(a => a.type_action === 'REPROGRAMMEE').length,
      annulations: actions.filter(a => a.type_action === 'ANNULEE').length,
      reaffectations: actions.filter(a => a.type_action === 'REAFFECTEE').length,
      programmations: actions.filter(a => a.type_action === 'PROGRAMMATION').length,
      periodiques: actions.filter(a => a.type_visite === 'Périodique').length,
      reprises: actions.filter(a => a.type_visite === 'Reprise').length
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

  // ========== RENDU DES CARTES STATS ==========
  const getAdditionalStats = () => {
    const actions = activeTab === 'planning' ? historiqueActionsPlanning : historiqueActionsFormulaire;
    if (!Array.isArray(actions)) return { 
      total: 0, effectuees: 0, reprogrammations: 0, annulations: 0, saisies: 0,
      periodiques: 0, reprises: 0, reclassements: 0, embauches: 0, 
      aptes: 0, inaptesTemp: 0, inaptesDef: 0 
    };
    
    return {
      total: actions.length,
      effectuees: actions.filter(a => a.type_action === 'EFFECTUEE').length,
      reprogrammations: actions.filter(a => a.type_action === 'REPROGRAMMEE').length,
      annulations: actions.filter(a => a.type_action === 'ANNULEE').length,
      saisies: actions.filter(a => a.type_action === 'SAISIE_MANUELLE').length,
      programmations: actions.filter(a => a.type_action === 'PROGRAMMATION').length,
      periodiques: actions.filter(a => a.type_visite === 'Périodique').length,
      reprises: actions.filter(a => a.type_visite === 'Reprise').length,
      reclassements: actions.filter(a => a.type_visite === 'Reclassement').length,
      embauches: actions.filter(a => a.type_visite === 'Embauche').length,
      aptes: actions.filter(a => a.resultat === 'Apte' && a.type_action === 'EFFECTUEE').length,
      inaptesTemp: actions.filter(a => a.resultat === 'Inapte temporaire' && a.type_action === 'EFFECTUEE').length,
      inaptesDef: actions.filter(a => a.resultat === 'Inapte définitif' && a.type_action === 'EFFECTUEE').length
    };
  };

  const additionalStats = getAdditionalStats();

  // ========== RENDU DES COULEURS ==========
  const getActionColor = (action) => {
    const colors = {
      'PROGRAMMATION': '#3b82f6',
      'EFFECTUEE': '#10b981',
      'REPROGRAMMEE': '#f59e0b',
      'ANNULEE': '#ef4444',
      'REAFFECTEE': '#8b5cf6',
      'SAISIE_MANUELLE': '#8b5cf6'
    };
    return colors[action] || '#64748b';
  };

  const getResultatConfig = (resultat) => {
    const configs = {
      'Apte': { class: 'hv-apte', icon: <CheckCircle size={14} />, color: '#10b981' },
      'Apte avec réserves': { class: 'hv-reserves', icon: <AlertCircle size={14} />, color: '#f59e0b' },
      'Inapte temporaire': { class: 'hv-temporaire', icon: <AlertTriangle size={14} />, color: '#f97316' },
      'Inapte définitif': { class: 'hv-definitif', icon: <XCircle size={14} />, color: '#ef4444' }
    };
    return configs[resultat] || { class: '', icon: <Info size={14} />, color: '#64748b' };
  };

  const getTypeVisiteIcon = (type) => {
    const icons = {
      'Périodique': '🔄',
      'Reprise': '⚕️',
      'Reclassement': '📝',
      'Embauche': '🆕'
    };
    return icons[type] || '📋';
  };

  // ========== MODAL DE DÉTAILS ==========
  const openDetailsModal = (action) => {
    setSelectedAction(action);
    setShowDetailsModal(true);
  };

  const DetailsModal = () => {
    if (!showDetailsModal || !selectedAction) return null;
    
    const item = selectedAction;
    const resultatConfig = getResultatConfig(item.resultat);
    
    const agentNom = item.visiteAgent?.nom || item.agent_nom || 'Agent';
    const agentPrenom = item.visiteAgent?.prenom || item.agent_prenom || '';
    const agentMatricule = item.matricule_agent || '?';
    const agentAgence = item.visiteAgent?.code_agence || item.code_agence || 'N/A';
    
    return (
      <div className="hv-modal-overlay" onClick={() => setShowDetailsModal(false)}>
        <div className="hv-details-modal" onClick={e => e.stopPropagation()}>
          <div className="hv-modal-header">
            <h2>Détails de l'action</h2>
            <button className="hv-modal-close" onClick={() => setShowDetailsModal(false)}>
              <XCircle size={20} />
            </button>
          </div>
          
          <div className="hv-modal-body">
            <div className="hv-details-agent">
              <div className="hv-agent-avatar hv-large">
                {agentNom.charAt(0)}{agentPrenom.charAt(0)}
              </div>
              <div className="hv-agent-info">
                <h3>{agentNom} {agentPrenom}</h3>
                <span className="hv-matricule">Matricule: #{agentMatricule}</span>
                <span className="hv-agence">Agence: {agentAgence !== 'N/A' ? `Agence ${agentAgence}` : 'Non spécifiée'}</span>
              </div>
            </div>
            
            <div className="hv-details-section">
              <h4> Informations</h4>
              <div className="hv-details-grid">
                <div className="hv-detail-item"><Calendar size={16} /><span>Date visite: <strong>{formatDateFr(item.date_visite)}</strong></span></div>
                <div className="hv-detail-item"><Clock size={16} /><span>Heure: <strong>{item.heure_visite?.substring(0,5) || '--:--'}</strong></span></div>
                <div className="hv-detail-item"><FileText size={16} /><span>Type action: <strong>{item.actionLabel || item.type_action}</strong></span></div>
                <div className="hv-detail-item"><Layers size={16} /><span>Source: <strong>{item.sourceLabel || item.source}</strong></span></div>
                <div className="hv-detail-item"><Briefcase size={16} /><span>Type visite: <strong>{item.type_visite || 'Non spécifié'}</strong></span></div>
                {item.medecin && (<div className="hv-detail-item"><User size={16} /><span>Médecin: <strong>{item.medecin}</strong></span></div>)}
              </div>
            </div>
            
            {item.resultat && (
              <div className={`hv-details-decision ${resultatConfig.class}`}>
                <div className="hv-decision-icon">{resultatConfig.icon}</div>
                <div className="hv-decision-content">
                  <span className="hv-decision-label">Décision médicale</span>
                  <span className="hv-decision-value">{item.resultat}</span>
                </div>
              </div>
            )}
            
            {item.motif_action && (
              <div className="hv-details-section">
                <h4>Motif</h4>
                <div className="hv-motif-box"><p>{item.motif_action}</p></div>
              </div>
            )}
            
            {item.details && item.details.prochaine_visite && (
              <div className="hv-details-section hv-highlight">
                <h4>Prochaine visite</h4>
                <p>{formatDateFr(item.details.prochaine_visite)} ({item.details.periodicite_texte || '1 an'})</p>
              </div>
            )}
            
            <div className="hv-details-footer">
              <Clock size={12} />
              <span>Enregistré le: {formatDateTimeFr(item.created_at)}</span>
            </div>
          </div>
          
          <div className="hv-modal-footer">
            <button className="hv-btn-close" onClick={() => setShowDetailsModal(false)}>Fermer</button>
          </div>
        </div>
      </div>
    );
  };

  // ========== RENDU PRINCIPAL ==========
  return (
    <div className="hv-container">
      
      {/* HEADER */}
      <div className="hv-header">
        <div className="hv-header-left">
          <div className="hv-header-icon"><History size={28} /></div>
          <div className="hv-header-title">
            <h1>Historique des actions</h1>
            <p>Suivi complet de toutes les actions (planning automatique + saisies manuelles)</p>
          </div>
        </div>
        <div className="hv-header-right">
          {activeTab === 'planning' ? (
            <div className="hv-stats-badge hv-planning"><Layers size={14} /><span>Planning: {stats.PLANNING}</span></div>
          ) : activeTab === 'formulaire' ? (
            <div className="hv-stats-badge hv-formulaire"><PenTool size={14} /><span>Formulaire: {stats.FORMULAIRE}</span></div>
          ) : (
            <div className="hv-stats-badge hv-agent"><UserSearch size={14} /><span>Agent: {selectedAgentDetail ? selectedAgentDetail.nom : 'Non sélectionné'}</span></div>
          )}
          <button className="hv-btn-icon" onClick={() => {
            if (activeTab === 'planning') chargerHistoriquePlanning();
            else if (activeTab === 'formulaire') chargerHistoriqueFormulaire();
            else if (selectedAgent) chargerHistoriqueParAgent(selectedAgent);
          }} title="Actualiser">
            <RefreshCw size={18} />
          </button>
          {activeTab !== 'agent' && (
            <button className={`hv-btn-icon ${showFilters ? 'hv-active' : ''}`} onClick={() => setShowFilters(!showFilters)}>
              <Sliders size={18} />
            </button>
          )}
          <div className="hv-view-toggle">
            <button className={`hv-view-btn ${viewMode === 'list' ? 'hv-active' : ''}`} onClick={() => setViewMode('list')}><List size={16} /></button>
            <button className={`hv-view-btn ${viewMode === 'grid' ? 'hv-active' : ''}`} onClick={() => setViewMode('grid')}><Grid3x3 size={16} /></button>
          </div>
        </div>
      </div>

      {/* STATS CARTES - UNIQUEMENT POUR PLANNING/FORMULAIRE */}
      {(activeTab === 'planning' || activeTab === 'formulaire') && (
        <>
          <div className="hv-stats-cards">
            <div className="hv-stat-card hv-total">
              <div className="hv-stat-icon"><Activity size={20} /></div>
              <div className="hv-stat-info">
                <span className="hv-stat-value">{additionalStats.total}</span>
                <span className="hv-stat-label">Total actions</span>
              </div>
            </div>
            <div className="hv-stat-card hv-effectue">
              <div className="hv-stat-icon"><CheckCircle size={20} /></div>
              <div className="hv-stat-info">
                <span className="hv-stat-value">{additionalStats.effectuees}</span>
                <span className="hv-stat-label">Visites effectuées</span>
              </div>
            </div>
            <div className="hv-stat-card hv-reprogramme">
              <div className="hv-stat-icon"><Repeat size={20} /></div>
              <div className="hv-stat-info">
                <span className="hv-stat-value">{additionalStats.reprogrammations}</span>
                <span className="hv-stat-label">Reprogrammations</span>
              </div>
            </div>
            <div className="hv-stat-card hv-saisie">
              <div className="hv-stat-icon"><PenTool size={20} /></div>
              <div className="hv-stat-info">
                <span className="hv-stat-value">{additionalStats.saisies}</span>
                <span className="hv-stat-label">Saisies manuelles</span>
              </div>
            </div>
          </div>
          
          <div className="hv-stats-types">
            <div className="hv-stat-type hv-periodique">
              <span className="hv-type-icon">🔄</span>
              <div className="hv-type-info">
                <span className="hv-type-value">{additionalStats.periodiques}</span>
                <span className="hv-type-label">Périodiques</span>
              </div>
            </div>
            <div className="hv-stat-type hv-reprise">
              <span className="hv-type-icon">⚕️</span>
              <div className="hv-type-info">
                <span className="hv-type-value">{additionalStats.reprises}</span>
                <span className="hv-type-label">Reprises</span>
              </div>
            </div>
            <div className="hv-stat-type hv-reclassement">
              <span className="hv-type-icon">📝</span>
              <div className="hv-type-info">
                <span className="hv-type-value">{additionalStats.reclassements}</span>
                <span className="hv-type-label">Reclassements</span>
              </div>
            </div>
            <div className="hv-stat-type hv-embauche">
              <span className="hv-type-icon">🆕</span>
              <div className="hv-type-info">
                <span className="hv-type-value">{additionalStats.embauches}</span>
                <span className="hv-type-label">Embauches</span>
              </div>
            </div>
          </div>
          
          <div className="hv-stats-resultats">
            <div className="hv-stat-resultat hv-apte">
              <CheckCircle size={14} />
              <span className="hv-resultat-value">{additionalStats.aptes}</span>
              <span className="hv-resultat-label">Aptes</span>
            </div>
            <div className="hv-stat-resultat hv-temporaire">
              <AlertTriangle size={14} />
              <span className="hv-resultat-value">{additionalStats.inaptesTemp}</span>
              <span className="hv-resultat-label">Inaptes temp.</span>
            </div>
            <div className="hv-stat-resultat hv-definitif">
              <XCircle size={14} />
              <span className="hv-resultat-value">{additionalStats.inaptesDef}</span>
              <span className="hv-resultat-label">Inaptes déf.</span>
            </div>
          </div>
        </>
      )}

      {/* ========== ONGLETS ========== */}
      <div className="hv-historique-tabs">
        <button className={`hv-tab-btn ${activeTab === 'planning' ? 'hv-active' : ''}`} onClick={() => { setActiveTab('planning'); setShowFilters(false); }}>
          <Activity size={18} /><span>Planning</span><span className="hv-tab-count">{stats.PLANNING}</span>
        </button>
        <button className={`hv-tab-btn ${activeTab === 'formulaire' ? 'hv-active' : ''}`} onClick={() => { setActiveTab('formulaire'); setShowFilters(false); }}>
          <PenTool size={18} /><span>Formulaire</span><span className="hv-tab-count">{stats.FORMULAIRE}</span>
        </button>
        <button className={`hv-tab-btn ${activeTab === 'agent' ? 'hv-active' : ''}`} onClick={() => { setActiveTab('agent'); setShowFilters(false); setCurrentPageAgent(1); }}>
          <UserSearch size={18} /><span>Historique par Agent</span><span className="hv-tab-count">{historiqueAgent.length}</span>
        </button>
      </div>

      {/* ========== ONGLET PLANNING ========== */}
      {activeTab === 'planning' && (
        <>
          <div className="hv-search-bar-container">
            <div className="hv-search-input-wrapper">
              <Search size={18} />
              <input type="text" placeholder="Rechercher par agent, matricule..." value={planningFilters.searchTerm} onChange={(e) => updatePlanningFilter('searchTerm', e.target.value)} />
              {planningFilters.searchTerm && <button className="hv-clear-search" onClick={() => updatePlanningFilter('searchTerm', '')}><XCircle size={16} /></button>}
            </div>
          </div>

          {showFilters && (
            <div className="hv-filters-panel">
              <div className="hv-filters-header">
                <h4><Filter size={16} /> Filtres avancés</h4>
                <button className="hv-reset-filters" onClick={resetPlanningFilters}>
                  <RefreshCw size={14} /> Réinitialiser
                </button>
              </div>
              <div className="hv-filters-grid">
                <div className="hv-filter-group">
                  <label>Date de visite</label>
                  <input type="date" value={planningFilters.dateUnique} onChange={(e) => updatePlanningFilter('dateUnique', e.target.value)} />
                </div>
                <div className="hv-filter-group">
                  <label>Type de visite</label>
                  <select value={planningFilters.filterTypeVisite} onChange={(e) => updatePlanningFilter('filterTypeVisite', e.target.value)}>
                    <option value="all"> Tous</option>
                    <option value="Périodique"> Périodique</option>
                    <option value="Reprise"> Reprise</option>
                    <option value="Reclassement"> Reclassement</option>
                    <option value="Embauche"> Embauche</option>
                  </select>
                </div>
                <div className="hv-filter-group">
                  <label>Résultat</label>
                  <select value={planningFilters.filterResultat} onChange={(e) => updatePlanningFilter('filterResultat', e.target.value)}>
                    <option value="all"> Tous</option>
                    <option value="Apte"> Apte</option>
                    <option value="Inapte temporaire"> Inapte temporaire</option>
                    <option value="Inapte définitif"> Inapte définitif</option>
                  </select>
                </div>
                <div className="hv-filter-group">
                  <label>Type d'action</label>
                  <select value={planningFilters.filterAction} onChange={(e) => updatePlanningFilter('filterAction', e.target.value)}>
                    <option value="all"> Toutes</option>
                    <option value="PROGRAMMATION"> Programmation</option>
                    <option value="EFFECTUEE"> Effectuée</option>
                    <option value="REPROGRAMMEE"> Reprogrammation</option>
                    <option value="ANNULEE"> Annulation</option>
                    <option value="REAFFECTEE"> Réaffectation</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="hv-historique-content">
            {loading ? (
              <div className="hv-loading-state"><div className="hv-spinner"></div><p>Chargement...</p></div>
            ) : currentData.length === 0 ? (
              <div className="hv-empty-state"><History size={48} /><h3>Aucune action</h3><button className="hv-btn-primary" onClick={chargerHistoriquePlanning}><RefreshCw size={16} /> Actualiser</button></div>
            ) : (
              <>
                <div className={`hv-timeline ${viewMode === 'grid' ? 'hv-grid-view' : ''}`}>
                  {currentData.map((item, idx) => {
                    const actionColor = getActionColor(item.type_action);
                    const resultatConfig = getResultatConfig(item.resultat);
                    const typeVisite = item.type_visite || 'Non spécifié';
                    return (
                      <div key={item.id || idx} className="hv-timeline-item">
                        <div className="hv-timeline-marker" style={{ background: actionColor }}>{item.actionIcon}</div>
                        <div className="hv-timeline-content">
                          <div className="hv-timeline-header">
                            <div className="hv-action-info">
                              <span className="hv-action-type" style={{ color: actionColor }}>{item.actionLabel}</span>
                              <span className="hv-source-badge" style={{ background: item.sourceBg, color: item.sourceColor }}>{item.sourceIcon} {item.sourceLabel}</span>
                              <span className="hv-type-badge-medium">{getTypeVisiteIcon(typeVisite)} {typeVisite}</span>
                              {item.resultat && item.type_action === 'EFFECTUEE' && (
                                <span className={`hv-resultat-badge ${resultatConfig.class}`}>{resultatConfig.icon} {item.resultat}</span>
                              )}
                            </div>
                            <span className="hv-action-date">{formatDateTimeFr(item.created_at)}</span>
                          </div>
                          <div className="hv-action-details">
                            <div className="hv-detail-row">
                              <User size={14} /><strong>Agent:</strong>
                              <span>{item.visiteAgent?.nom} {item.visiteAgent?.prenom}</span>
                              <span className="hv-matricule">#{item.matricule_agent}</span>
                            </div>
                            <div className="hv-detail-row">
                              <Calendar size={14} />
                              <strong>Date visite:</strong>
                              <span>{formatDateFr(item.date_visite)}</span>
                              <Clock size={12} />
                              <span>{item.heure_visite?.substring(0,5)}</span>
                            </div>
                            {item.motif_action && (
                              <div className="hv-detail-row hv-motif">
                                <FileText size={14} /><strong>Motif:</strong>
                                <span className="hv-motif-text">{item.motif_action.substring(0, 80)}...</span>
                              </div>
                            )}
                          </div>
                          <div className="hv-timeline-actions">
                            <button className="hv-btn-details-small" onClick={() => openDetailsModal(item)}><Eye size={14} /> Détails</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="hv-pagination">
                    <button onClick={goToFirstPage} disabled={currentPageNum === 1}><ChevronsLeft size={16} /></button>
                    <button onClick={goToPreviousPage} disabled={currentPageNum === 1}><ChevronLeft size={16} /> Précédent</button>
                    <span className="hv-page-info">Page {currentPageNum} sur {totalPages}</span>
                    <button onClick={goToNextPage} disabled={currentPageNum === totalPages}>Suivant <ChevronRight size={16} /></button>
                    <button onClick={goToLastPage} disabled={currentPageNum === totalPages}><ChevronsRight size={16} /></button>
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
          <div className="hv-search-bar-container">
            <div className="hv-search-input-wrapper">
              <Search size={18} />
              <input type="text" placeholder="Rechercher par agent, matricule..." value={formulaireFilters.searchTerm} onChange={(e) => updateFormulaireFilter('searchTerm', e.target.value)} />
              {formulaireFilters.searchTerm && <button className="hv-clear-search" onClick={() => updateFormulaireFilter('searchTerm', '')}><XCircle size={16} /></button>}
            </div>
          </div>

          {showFilters && (
            <div className="hv-filters-panel">
              <div className="hv-filters-header">
                <h4><Filter size={16} /> Filtres avancés</h4>
                <button className="hv-reset-filters" onClick={resetFormulaireFilters}>
                  <RefreshCw size={14} /> Réinitialiser
                </button>
              </div>
              <div className="hv-filters-grid">
                <div className="hv-filter-group">
                  <label>Date de visite</label>
                  <input type="date" value={formulaireFilters.dateUnique} onChange={(e) => updateFormulaireFilter('dateUnique', e.target.value)} />
                </div>
                <div className="hv-filter-group">
                  <label>Type de visite</label>
                  <select value={formulaireFilters.filterTypeVisite} onChange={(e) => updateFormulaireFilter('filterTypeVisite', e.target.value)}>
                    <option value="all"> Tous</option>
                    <option value="Périodique"> Périodique</option>
                    <option value="Reprise"> Reprise</option>
                    <option value="Reclassement"> Reclassement</option>
                    <option value="Embauche"> Embauche</option>
                  </select>
                </div>
                <div className="hv-filter-group">
                  <label>Résultat</label>
                  <select value={formulaireFilters.filterResultat} onChange={(e) => updateFormulaireFilter('filterResultat', e.target.value)}>
                    <option value="all"> Tous</option>
                    <option value="Apte"> Apte</option>
                    <option value="Inapte temporaire"> Inapte temporaire</option>
                    <option value="Inapte définitif"> Inapte définitif</option>
                  </select>
                </div>
                <div className="hv-filter-group">
                  <label>Type d'action</label>
                  <select value={formulaireFilters.filterAction} onChange={(e) => updateFormulaireFilter('filterAction', e.target.value)}>
                    <option value="all">Toutes</option>
                    <option value="PROGRAMMATION"> Programmation</option>
                    <option value="EFFECTUEE"> Effectuée</option>
                    <option value="REPROGRAMMEE"> Reprogrammation</option>
                    <option value="ANNULEE"> Annulation</option>
                    <option value="REAFFECTEE"> Réaffectation</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="hv-historique-content">
            {loading ? (
              <div className="hv-loading-state"><div className="hv-spinner"></div><p>Chargement...</p></div>
            ) : currentData.length === 0 ? (
              <div className="hv-empty-state"><History size={48} /><h3>Aucune action</h3><button className="hv-btn-primary" onClick={chargerHistoriqueFormulaire}><RefreshCw size={16} /> Actualiser</button></div>
            ) : (
              <>
                <div className={`hv-timeline ${viewMode === 'grid' ? 'hv-grid-view' : ''}`}>
                  {currentData.map((item, idx) => {
                    const actionColor = getActionColor(item.type_action);
                    const resultatConfig = getResultatConfig(item.resultat);
                    const typeVisite = item.type_visite || 'Non spécifié';
                    return (
                      <div key={item.id || idx} className="hv-timeline-item">
                        <div className="hv-timeline-marker" style={{ background: actionColor }}>{item.actionIcon}</div>
                        <div className="hv-timeline-content">
                          <div className="hv-timeline-header">
                            <div className="hv-action-info">
                              <span className="hv-action-type" style={{ color: actionColor }}>{item.actionLabel}</span>
                              <span className="hv-source-badge" style={{ background: item.sourceBg, color: item.sourceColor }}>{item.sourceIcon} {item.sourceLabel}</span>
                              <span className="hv-type-badge-medium">{getTypeVisiteIcon(typeVisite)} {typeVisite}</span>
                              {item.resultat && item.type_action === 'EFFECTUEE' && (
                                <span className={`hv-resultat-badge ${resultatConfig.class}`}>{resultatConfig.icon} {item.resultat}</span>
                              )}
                            </div>
                            <span className="hv-action-date">{formatDateTimeFr(item.created_at)}</span>
                          </div>
                          <div className="hv-action-details">
                            <div className="hv-detail-row">
                              <User size={14} /><strong>Agent:</strong>
                              <span>{item.visiteAgent?.nom} {item.visiteAgent?.prenom}</span>
                              <span className="hv-matricule">#{item.matricule_agent}</span>
                            </div>
                            <div className="hv-detail-row">
                              <Calendar size={14} />
                              <strong>Date visite:</strong>
                              <span>{formatDateFr(item.date_visite)}</span>
                              <Clock size={12} />
                              <span>{item.heure_visite?.substring(0,5)}</span>
                            </div>
                            {item.motif_action && (
                              <div className="hv-detail-row hv-motif">
                                <FileText size={14} /><strong>Motif:</strong>
                                <span className="hv-motif-text">{item.motif_action.substring(0, 80)}...</span>
                              </div>
                            )}
                          </div>
                          <div className="hv-timeline-actions">
                            <button className="hv-btn-details-small" onClick={() => openDetailsModal(item)}><Eye size={14} /> Détails</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="hv-pagination">
                    <button onClick={goToFirstPage} disabled={currentPageNum === 1}><ChevronsLeft size={16} /></button>
                    <button onClick={goToPreviousPage} disabled={currentPageNum === 1}><ChevronLeft size={16} /> Précédent</button>
                    <span className="hv-page-info">Page {currentPageNum} sur {totalPages}</span>
                    <button onClick={goToNextPage} disabled={currentPageNum === totalPages}>Suivant <ChevronRight size={16} /></button>
                    <button onClick={goToLastPage} disabled={currentPageNum === totalPages}><ChevronsRight size={16} /></button>
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
          <div className="hv-agent-search-section" style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
            <div className="hv-agent-search-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' }}>
              <UserSearch size={20} color="#3b82f6" />
              <h3 style={{ fontSize: '16px', fontWeight: '600' }}>Rechercher un agent</h3>
            </div>
            <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, minWidth: '250px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#64748b', marginBottom: '5px' }}>Agent</label>
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
              <button className="hv-btn-reset" onClick={() => { setSelectedAgent(''); setHistoriqueAgent([]); setSelectedAgentDetail(null); }} style={{ padding: '8px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer' }}>
                <XCircle size={14} /> Réinitialiser
              </button>
            </div>
          </div>

          {selectedAgentDetail && (
            <div className="hv-agent-info-card" style={{ background: 'linear-gradient(135deg, #1e40af, #2563eb)', color: 'white', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '50px', height: '50px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', fontWeight: 'bold' }}>
                    {selectedAgentDetail.nom?.charAt(0)}{selectedAgentDetail.prenom?.charAt(0)}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{selectedAgentDetail.nom} {selectedAgentDetail.prenom}</h2>
                    <p style={{ margin: '5px 0 0', opacity: 0.8, fontSize: '13px' }}>Matricule: #{selectedAgentDetail.matricule_agent}</p>
                    <p style={{ margin: '5px 0 0', opacity: 0.7, fontSize: '11px' }}>Agence: {selectedAgentDetail.code_agence || 'Non spécifiée'}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 'bold' }}>{agentStats.total}</div><div style={{ fontSize: '11px', opacity: 0.8 }}>Total</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#34d399' }}>{agentStats.effectuees}</div><div style={{ fontSize: '11px', opacity: 0.8 }}>Effectuées</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fbbf24' }}>{agentStats.programmations}</div><div style={{ fontSize: '11px', opacity: 0.8 }}>Programmations</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f87171' }}>{agentStats.annulations}</div><div style={{ fontSize: '11px', opacity: 0.8 }}>Annulations</div></div>
                  <div style={{ textAlign: 'center' }}><div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b' }}>{agentStats.reprogrammations}</div><div style={{ fontSize: '11px', opacity: 0.8 }}>Reprogrammations</div></div>
                </div>
              </div>
            </div>
          )}

          <div className="hv-historique-content">
            {loadingAgent ? (
              <div className="hv-loading-state"><div className="hv-spinner"></div><p>Chargement...</p></div>
            ) : !selectedAgent ? (
              <div className="hv-empty-state"><UserSearch size={48} /><h3>Aucun agent sélectionné</h3><p>Recherchez un agent pour voir son historique complet</p></div>
            ) : historiqueAgent.length === 0 ? (
              <div className="hv-empty-state"><History size={48} /><h3>Aucune action</h3><p>Cet agent n'a aucune action enregistrée</p></div>
            ) : (
              <>
                <div className={`hv-timeline ${viewMode === 'grid' ? 'hv-grid-view' : ''}`}>
                  {currentData.map((item, idx) => {
                    const actionColor = getActionColor(item.type_action);
                    const resultatConfig = getResultatConfig(item.resultat);
                    const typeVisite = item.type_visite || 'Non spécifié';
                    return (
                      <div key={item.id || idx} className="hv-timeline-item">
                        <div className="hv-timeline-marker" style={{ background: actionColor }}>{item.actionIcon}</div>
                        <div className="hv-timeline-content">
                          <div className="hv-timeline-header">
                            <div className="hv-action-info">
                              <span className="hv-action-type" style={{ color: actionColor }}>{item.actionLabel}</span>
                              <span className="hv-source-badge" style={{ background: item.sourceBg, color: item.sourceColor }}>{item.sourceIcon} {item.sourceLabel}</span>
                              <span className="hv-type-badge-medium">{getTypeVisiteIcon(typeVisite)} {typeVisite}</span>
                              {item.resultat && item.type_action === 'EFFECTUEE' && (
                                <span className={`hv-resultat-badge ${resultatConfig.class}`}>{resultatConfig.icon} {item.resultat}</span>
                              )}
                            </div>
                            <span className="hv-action-date">{formatDateTimeFr(item.created_at)}</span>
                          </div>
                          <div className="hv-action-details">
                            <div className="hv-detail-row">
                              <Calendar size={14} />
                              <strong>Date visite:</strong>
                              <span>{formatDateFr(item.date_visite)}</span>
                              <Clock size={12} />
                              <span>{item.heure_visite?.substring(0,5)}</span>
                            </div>
                            {item.medecin && (
                              <div className="hv-detail-row">
                                <User size={14} /><strong>Médecin:</strong><span>{item.medecin}</span>
                              </div>
                            )}
                            {item.motif_action && (
                              <div className="hv-detail-row hv-motif">
                                <FileText size={14} /><strong>Motif:</strong>
                                <span className="hv-motif-text">{item.motif_action.substring(0, 80)}...</span>
                              </div>
                            )}
                          </div>
                          <div className="hv-timeline-actions">
                            <button className="hv-btn-details-small" onClick={() => openDetailsModal(item)}><Eye size={14} /> Détails</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {totalPages > 1 && (
                  <div className="hv-pagination">
                    <button onClick={goToFirstPage} disabled={currentPageNum === 1}><ChevronsLeft size={16} /></button>
                    <button onClick={goToPreviousPage} disabled={currentPageNum === 1}><ChevronLeft size={16} /> Précédent</button>
                    <span className="hv-page-info">Page {currentPageNum} sur {totalPages}</span>
                    <button onClick={goToNextPage} disabled={currentPageNum === totalPages}>Suivant <ChevronRight size={16} /></button>
                    <button onClick={goToLastPage} disabled={currentPageNum === totalPages}><ChevronsRight size={16} /></button>
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

export default HistoriqueVisites;