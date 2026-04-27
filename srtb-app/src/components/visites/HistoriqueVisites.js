// frontend/components/visites/HistoriqueVisites.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, User, FileText, CheckCircle, XCircle,
  AlertCircle, Info, RefreshCw, Eye, Layers, PenTool, History, 
  Activity, Award, AlertTriangle, Filter, Search, ChevronLeft, 
  ChevronRight, Sliders, Grid3x3, List, PlusCircle, Repeat, Trash2, Users,
  TrendingUp, Calendar as CalendarIcon, Briefcase, Shield, Zap
} from 'lucide-react';
import '../../styles/HistoriqueVisites.css';

/**
 * Composant HistoriqueVisites
 * Complètement isolé avec des classes prefixées 'hv-'
 * Aucun conflit CSS avec le reste de l'application
 */
const HistoriqueVisites = () => {
  // ========== ÉTATS PRINCIPAUX ==========
  const [activeTab, setActiveTab] = useState('planning');
  const [historiqueActions, setHistoriqueActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ PLANNING: 0, FORMULAIRE: 0 });
  
  // ========== ÉTATS FILTRES ==========
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agents, setAgents] = useState([]);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('list');
  
  // ✅ NOUVEAUX FILTRES
  const [filterTypeVisite, setFilterTypeVisite] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterResultat, setFilterResultat] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  
  // ========== ÉTATS MODAL ==========
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);

  // ========== FONCTIONS UTILITAIRES (définies avant utilisation) ==========
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
      'PROGRAMMATION': '📅',
      'EFFECTUEE': '✅',
      'REPROGRAMMEE': '🔄',
      'ANNULEE': '❌',
      'REAFFECTEE': '👥',
      'SAISIE_MANUELLE': '✏️'
    };
    return icons[action] || '📋';
  }, []);

  const chargerToutesActions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      
      const [planningRes, formulaireRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/api/historique/planning`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_API_URL}/api/historique/formulaire`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      const planningData = await planningRes.json();
      const formulaireData = await formulaireRes.json();
      
      let toutesActions = [];
      
      // ========== PLANNING (toutes les actions) ==========
      if (planningData.success && Array.isArray(planningData.historique)) {
        const actionsPlanning = planningData.historique.map(item => ({
          ...item,
          source: 'PLANNING',
          sourceIcon: '📋',
          sourceLabel: 'Planning Auto',
          sourceColor: '#3b82f6',
          sourceBg: '#eff6ff',
          actionLabel: getActionLabel(item.type_action),
          actionIcon: getActionIcon(item.type_action)
        }));
        toutesActions = [...toutesActions, ...actionsPlanning];
      }
      
      // ========== FORMULAIRE (exclure SAISIE_MANUELLE) ==========
      if (formulaireData.success && Array.isArray(formulaireData.historique)) {
        const actionsFormulaire = formulaireData.historique
          .filter(item => item.type_action !== 'SAISIE_MANUELLE')
          .map(item => ({
            ...item,
            source: 'FORMULAIRE',
            sourceIcon: '✏️',
            sourceLabel: 'Formulaire',
            sourceColor: '#8b5cf6',
            sourceBg: '#f5f3ff',
            actionLabel: getActionLabel(item.type_action),
            actionIcon: getActionIcon(item.type_action)
          }));
        toutesActions = [...toutesActions, ...actionsFormulaire];
      }
      
      // Trier par date décroissante
      toutesActions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      
      // Appliquer les filtres
      let filtered = toutesActions;
      
      // Filtre par agent
      if (selectedAgent) {
        filtered = filtered.filter(a => a.matricule_agent == selectedAgent);
      }
      
      // Filtre par date début
      if (dateDebut) {
        filtered = filtered.filter(a => new Date(a.date_visite) >= new Date(dateDebut));
      }
      
      // Filtre par date fin
      if (dateFin) {
        filtered = filtered.filter(a => new Date(a.date_visite) <= new Date(dateFin));
      }
      
      // ✅ Filtre par type de visite
      if (filterTypeVisite !== 'all') {
        filtered = filtered.filter(a => a.type_visite === filterTypeVisite);
      }
      
      // ✅ Filtre par source
      if (filterSource !== 'all') {
        filtered = filtered.filter(a => a.source === filterSource);
      }
      
      // ✅ Filtre par résultat
      if (filterResultat !== 'all') {
        filtered = filtered.filter(a => a.resultat === filterResultat);
      }
      
      // ✅ Filtre par type d'action
      if (filterAction !== 'all') {
        filtered = filtered.filter(a => a.type_action === filterAction);
      }
      
      // Filtre par onglet
      if (activeTab === 'planning') {
        filtered = filtered.filter(a => a.source === 'PLANNING');
      } else if (activeTab === 'formulaire') {
        filtered = filtered.filter(a => a.source === 'FORMULAIRE');
      }
      
      setHistoriqueActions(filtered);
      
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedAgent, dateDebut, dateFin, filterTypeVisite, filterSource, filterResultat, filterAction, getActionLabel, getActionIcon]);

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

  const chargerStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const planningRes = await fetch(`${process.env.REACT_APP_API_URL}/api/historique/planning`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const planningData = await planningRes.json();
      
      const formulaireRes = await fetch(`${process.env.REACT_APP_API_URL}/api/historique/formulaire`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const formulaireData = await formulaireRes.json();
      
      const planningCount = planningData.success ? planningData.historique.length : 0;
      const formulaireCount = formulaireData.success 
        ? formulaireData.historique.filter(item => item.type_action !== 'SAISIE_MANUELLE').length 
        : 0;
      
      setStats({ PLANNING: planningCount, FORMULAIRE: formulaireCount });
      
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  };

  // ========== CHARGEMENT INITIAL ==========
  useEffect(() => {
    chargerAgents();
    chargerStats();
    chargerToutesActions();
  }, [chargerToutesActions]);

  useEffect(() => {
    setCurrentPage(1);
    chargerToutesActions();
  }, [activeTab, selectedAgent, dateDebut, dateFin, filterTypeVisite, filterSource, filterResultat, filterAction, chargerToutesActions]);

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

  const getActionBg = (action) => {
    const bg = {
      'PROGRAMMATION': '#eff6ff',
      'EFFECTUEE': '#f0fdf4',
      'REPROGRAMMEE': '#fffbeb',
      'ANNULEE': '#fef2f2',
      'REAFFECTEE': '#f5f3ff',
      'SAISIE_MANUELLE': '#f5f3ff'
    };
    return bg[action] || '#f1f5f9';
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

  const openDetailsModal = (action) => {
    setSelectedAction(action);
    setShowDetailsModal(true);
  };

  const resetFilters = () => {
    setSelectedAgent('');
    setDateDebut('');
    setDateFin('');
    setSearchTerm('');
    setFilterTypeVisite('all');
    setFilterSource('all');
    setFilterResultat('all');
    setFilterAction('all');
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDateSimple = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  // ========== FILTRAGE ET PAGINATION ==========
  const filterBySearch = (data, searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) return data;
    if (!data || !Array.isArray(data)) return [];
    
    const searchLower = searchTerm.toLowerCase().trim();
    return data.filter(item => {
      const matriculeStr = String(item.matricule_agent || '');
      const nomStr = String(item.visiteAgent?.nom || '');
      const prenomStr = String(item.visiteAgent?.prenom || '');
      const medecinStr = String(item.medecin || '');
      const typeStr = String(item.type_visite || '');
      const actionStr = String(item.actionLabel || '');
      
      return matriculeStr.toLowerCase().includes(searchLower) ||
             nomStr.toLowerCase().includes(searchLower) ||
             prenomStr.toLowerCase().includes(searchLower) ||
             medecinStr.toLowerCase().includes(searchLower) ||
             typeStr.toLowerCase().includes(searchLower) ||
             actionStr.toLowerCase().includes(searchLower);
    });
  };

  const getPaginatedData = (data) => {
    if (!data || !Array.isArray(data)) return [];
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  const filteredData = filterBySearch(historiqueActions, searchTerm);
  const paginatedData = getPaginatedData(filteredData);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // ========== STATISTIQUES ==========
  const getAdditionalStats = () => {
    const actions = historiqueActions;
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

  // ========== MODAL DE DÉTAILS ==========
  const DetailsModal = () => {
    if (!showDetailsModal || !selectedAction) return null;
    
    const item = selectedAction;
    const resultatConfig = getResultatConfig(item.resultat);
    
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
                {item.visiteAgent?.nom?.charAt(0)}{item.visiteAgent?.prenom?.charAt(0)}
              </div>
              <div className="hv-agent-info">
                <h3>{item.visiteAgent?.nom} {item.visiteAgent?.prenom}</h3>
                <span className="hv-matricule">Matricule: #{item.matricule_agent}</span>
                <span className="hv-agence">Agence: {item.visiteAgent?.code_agence || 'N/A'}</span>
              </div>
            </div>
            
            <div className="hv-details-section">
              <h4>📋 Informations</h4>
              <div className="hv-details-grid">
                <div className="hv-detail-item"><Calendar size={16} /><span>Date visite: <strong>{formatDateSimple(item.date_visite)}</strong></span></div>
                <div className="hv-detail-item"><Clock size={16} /><span>Heure: <strong>{item.heure_visite?.substring(0,5) || '--:--'}</strong></span></div>
                <div className="hv-detail-item"><FileText size={16} /><span>Type action: <strong>{item.actionLabel}</strong></span></div>
                <div className="hv-detail-item"><Layers size={16} /><span>Source: <strong>{item.sourceLabel}</strong></span></div>
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
            
            {item.observation && (
              <div className="hv-details-section">
                <h4>📝 Observation</h4>
                <div className="hv-observation-box"><p>{item.observation}</p></div>
              </div>
            )}
            
            {item.motif_action && (
              <div className="hv-details-section">
                <h4>📌 Motif</h4>
                <div className="hv-motif-box"><p>{item.motif_action}</p></div>
              </div>
            )}
            
            {item.ancien_statut && (
              <div className="hv-details-section">
                <h4>📊 Changement de statut</h4>
                <div className="hv-status-change">
                  <span className="hv-old-status">{item.ancien_statut}</span>
                  <span className="hv-arrow">→</span>
                  <span className="hv-new-status">{item.nouveau_statut}</span>
                </div>
              </div>
            )}
            
            {item.details && item.details.prochaine_visite && (
              <div className="hv-details-section hv-highlight">
                <h4>📅 Prochaine visite</h4>
                <p>{formatDateSimple(item.details.prochaine_visite)} ({item.details.periodicite_texte || '1 an'})</p>
              </div>
            )}
            
            <div className="hv-details-footer">
              <Clock size={12} />
              <span>Enregistré le: {formatDate(item.created_at)}</span>
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
            <div className="hv-stats-badge hv-planning">
              <Layers size={14} />
              <span>Planning: {stats.PLANNING || 0}</span>
            </div>
          ) : (
            <div className="hv-stats-badge hv-formulaire">
              <PenTool size={14} />
              <span>Formulaire: {stats.FORMULAIRE || 0}</span>
            </div>
          )}
          <button className="hv-btn-icon" onClick={chargerToutesActions} title="Actualiser">
            <RefreshCw size={18} />
          </button>
          <button 
            className={`hv-btn-icon ${showFilters ? 'hv-active' : ''}`} 
            onClick={() => setShowFilters(!showFilters)}
            title="Filtres avancés"
          >
            <Sliders size={18} />
          </button>
          <div className="hv-view-toggle">
            <button 
              className={`hv-view-btn ${viewMode === 'list' ? 'hv-active' : ''}`} 
              onClick={() => setViewMode('list')}
              title="Vue liste"
            >
              <List size={16} />
            </button>
            <button 
              className={`hv-view-btn ${viewMode === 'grid' ? 'hv-active' : ''}`} 
              onClick={() => setViewMode('grid')}
              title="Vue grille"
            >
              <Grid3x3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* STATS CARTES */}
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

      {/* STATS PAR TYPE DE VISITE */}
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

      {/* STATS PAR RÉSULTAT */}
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

      {/* RECHERCHE */}
      <div className="hv-search-bar-container">
        <div className="hv-search-input-wrapper">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Rechercher par agent, matricule, type d'action..." 
            value={searchTerm} 
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
          />
          {searchTerm && <button className="hv-clear-search" onClick={() => setSearchTerm('')}><XCircle size={16} /></button>}
        </div>
      </div>

      {/* FILTRES AVANCÉS */}
      {showFilters && (
        <div className="hv-filters-panel">
          <div className="hv-filters-header">
            <h4><Filter size={16} /> Filtres avancés</h4>
            <button className="hv-reset-filters" onClick={resetFilters}>
              <RefreshCw size={14} /> Réinitialiser
            </button>
          </div>
          <div className="hv-filters-grid">
            <div className="hv-filter-group">
              <label>Agent</label>
              <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
                <option value="">Tous les agents</option>
                {agents.map(agent => (
                  <option key={agent.matricule_agent} value={agent.matricule_agent}>
                    {agent.nom} {agent.prenom} - #{agent.matricule_agent}
                  </option>
                ))}
              </select>
            </div>

            <div className="hv-filter-group">
              <label>Type de visite</label>
              <select value={filterTypeVisite} onChange={(e) => setFilterTypeVisite(e.target.value)}>
                <option value="all">📋 Tous les types</option>
                <option value="Périodique">🔄 Périodique</option>
                <option value="Reprise">⚕️ Reprise</option>
                <option value="Reclassement">📝 Reclassement</option>
                <option value="Embauche">🆕 Embauche</option>
              </select>
            </div>

            <div className="hv-filter-group">
              <label>Source</label>
              <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
                <option value="all">🔀 Toutes les sources</option>
                <option value="PLANNING">📋 Planning automatique</option>
                <option value="FORMULAIRE">✏️ Formulaire manuel</option>
              </select>
            </div>

            <div className="hv-filter-group">
              <label>Résultat</label>
              <select value={filterResultat} onChange={(e) => setFilterResultat(e.target.value)}>
                <option value="all">📊 Tous les résultats</option>
                <option value="Apte">✅ Apte</option>
                <option value="Apte avec réserves">⚠️ Apte avec réserves</option>
                <option value="Inapte temporaire">⏳ Inapte temporaire</option>
                <option value="Inapte définitif">❌ Inapte définitif</option>
              </select>
            </div>

            <div className="hv-filter-group">
              <label>Type d'action</label>
              <select value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
                <option value="all">🔧 Toutes les actions</option>
                <option value="PROGRAMMATION">📅 Programmation</option>
                <option value="EFFECTUEE">✅ Effectuée</option>
                <option value="REPROGRAMMEE">🔄 Reprogrammation</option>
                <option value="ANNULEE">❌ Annulation</option>
                <option value="REAFFECTEE">👥 Réaffectation</option>
              </select>
            </div>

            <div className="hv-filter-group">
              <label>Date début</label>
              <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>

            <div className="hv-filter-group">
              <label>Date fin</label>
              <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>
          
          <div className="hv-filters-actions">
            <button className="hv-btn-apply" onClick={() => chargerToutesActions()}>
              Appliquer les filtres
            </button>
          </div>
        </div>
      )}

      {/* ONGLETS */}
      <div className="hv-historique-tabs">
        <button 
          className={`hv-tab-btn ${activeTab === 'planning' ? 'hv-active' : ''}`} 
          onClick={() => setActiveTab('planning')}
        >
          <Activity size={18} />
          <span>Planning</span>
          <span className="hv-tab-count">{historiqueActions.filter(a => a.source === 'PLANNING').length}</span>
        </button>
        <button 
          className={`hv-tab-btn ${activeTab === 'formulaire' ? 'hv-active' : ''}`} 
          onClick={() => setActiveTab('formulaire')}
        >
          <PenTool size={18} />
          <span>Formulaire</span>
          <span className="hv-tab-count">{historiqueActions.filter(a => a.source === 'FORMULAIRE').length}</span>
        </button>
      </div>

      {/* ERREUR */}
      {error && (
        <div className="hv-error-container">
          <AlertCircle size={20} />
          <div className="hv-error-content"><strong>Erreur de chargement</strong><p>{error}</p></div>
          <button onClick={chargerToutesActions}><RefreshCw size={14} /> Réessayer</button>
        </div>
      )}

      {/* CONTENU */}
      {loading ? (
        <div className="hv-loading-state"><div className="hv-spinner"></div><p>Chargement de l'historique...</p></div>
      ) : (
        <div className="hv-historique-content">
          {filteredData.length === 0 ? (
            <div className="hv-empty-state">
              <History size={48} />
              <h3>Aucune action enregistrée</h3>
              <p>Les actions sur le planning et les saisies manuelles apparaîtront ici</p>
              <button className="hv-btn-primary" onClick={chargerToutesActions}><RefreshCw size={16} /> Actualiser</button>
            </div>
          ) : (
            <>
              <div className={`hv-timeline ${viewMode === 'grid' ? 'hv-grid-view' : ''}`}>
                {paginatedData.map((item, index) => {
                  const actionColor = getActionColor(item.type_action);
                  const actionBg = getActionBg(item.type_action);
                  const resultatConfig = getResultatConfig(item.resultat);
                  
                  return (
                    <div key={item.id || index} className="hv-timeline-item">
                      <div className="hv-timeline-marker" style={{ background: actionColor }}>
                        {item.actionIcon}
                      </div>
                      <div className="hv-timeline-content">
                        <div className="hv-timeline-header">
                          <div className="hv-action-info">
                            <span className="hv-action-type" style={{ color: actionColor }}>{item.actionLabel}</span>
                            <span className="hv-source-badge" style={{ background: item.sourceBg, color: item.sourceColor }}>
                              {item.sourceIcon} {item.sourceLabel}
                            </span>
                            {item.type_visite && (
                              <span className="hv-type-badge-small" title={item.type_visite}>
                                {getTypeVisiteIcon(item.type_visite)} {item.type_visite}
                              </span>
                            )}
                            {item.resultat && item.type_action === 'EFFECTUEE' && (
                              <span className={`hv-resultat-badge-small ${resultatConfig.class}`}>
                                {resultatConfig.icon} {item.resultat}
                              </span>
                            )}
                          </div>
                          <span className="hv-action-date">{formatDate(item.created_at)}</span>
                        </div>
                        
                        <div className="hv-action-details">
                          <div className="hv-detail-row">
                            <User size={14} />
                            <strong>Agent:</strong>
                            <span>{item.visiteAgent?.nom} {item.visiteAgent?.prenom}</span>
                            <span className="hv-matricule">#{item.matricule_agent}</span>
                          </div>
                          <div className="hv-detail-row">
                            <CalendarIcon size={14} />
                            <strong>Date visite:</strong>
                            <span>{formatDateSimple(item.date_visite)}</span>
                            <Clock size={12} />
                            <span>{item.heure_visite?.substring(0,5) || '--:--'}</span>
                          </div>
                          
                          {item.medecin && (
                            <div className="hv-detail-row">
                              <User size={14} />
                              <strong>Médecin:</strong>
                              <span>{item.medecin}</span>
                            </div>
                          )}
                          
                          {item.motif_action && item.type_action !== 'SAISIE_MANUELLE' && (
                            <div className="hv-detail-row hv-motif">
                              <FileText size={14} />
                              <strong>Motif:</strong>
                              <span className="hv-motif-text">{item.motif_action.substring(0, 80)}...</span>
                            </div>
                          )}
                          
                          {item.observation && (
                            <div className="hv-detail-row hv-motif">
                              <FileText size={14} />
                              <strong>Observation:</strong>
                              <span className="hv-observation-preview">{item.observation.substring(0, 80)}...</span>
                            </div>
                          )}
                          
                          {item.details && item.details.prochaine_visite && (
                            <div className="hv-detail-row hv-highlight">
                              <CalendarIcon size={14} />
                              <strong>Prochaine visite:</strong>
                              <span>{formatDateSimple(item.details.prochaine_visite)} ({item.details.periodicite_texte || '1 an'})</span>
                            </div>
                          )}
                          
                          <div className="hv-timeline-actions">
                            <button className="hv-btn-details-small" onClick={() => openDetailsModal(item)}>
                              <Eye size={14} /> Détails
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="hv-pagination">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft size={16} /> Précédent
                  </button>
                  <span className="hv-page-info">Page {currentPage} sur {totalPages}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                    Suivant <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODAL DÉTAILS */}
      <DetailsModal />
    </div>
  );
};

export default HistoriqueVisites;