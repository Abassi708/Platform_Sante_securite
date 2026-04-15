// frontend/components/visites/HistoriqueVisites.js
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, FileText, CheckCircle, XCircle,
  AlertCircle, Info, RefreshCw, Eye, Layers, PenTool, History, 
  Activity, Award, AlertTriangle, Filter, Search, ChevronLeft, 
  ChevronRight, Sliders, Grid3x3, List, PlusCircle, Repeat, Trash2, Users,
  TrendingUp, Calendar as CalendarIcon, Briefcase, Shield, Zap
} from 'lucide-react';
import '../../styles/HistoriqueVisites.css';

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

  // ========== CHARGEMENT INITIAL ==========
  useEffect(() => {
    chargerAgents();
    chargerStats();
    chargerToutesActions();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    chargerToutesActions();
  }, [activeTab, selectedAgent, dateDebut, dateFin, filterTypeVisite, filterSource, filterResultat, filterAction]);

  // ========== APPELS API ==========
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

  const chargerToutesActions = async () => {
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

  // ========== FONCTIONS UTILITAIRES ==========
  const getActionLabel = (action) => {
    const labels = {
      'PROGRAMMATION': 'Programmation',
      'EFFECTUEE': 'Visite effectuée',
      'REPROGRAMMEE': 'Reprogrammation',
      'ANNULEE': 'Annulation',
      'REAFFECTEE': 'Réaffectation',
      'SAISIE_MANUELLE': 'Saisie manuelle'
    };
    return labels[action] || action;
  };

  const getActionIcon = (action) => {
    const icons = {
      'PROGRAMMATION': '📅',
      'EFFECTUEE': '✅',
      'REPROGRAMMEE': '🔄',
      'ANNULEE': '❌',
      'REAFFECTEE': '👥',
      'SAISIE_MANUELLE': '✏️'
    };
    return icons[action] || '📋';
  };

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
      'Apte': { class: 'apte', icon: <CheckCircle size={14} />, color: '#10b981' },
      'Apte avec réserves': { class: 'reserves', icon: <AlertCircle size={14} />, color: '#f59e0b' },
      'Inapte temporaire': { class: 'temporaire', icon: <AlertTriangle size={14} />, color: '#f97316' },
      'Inapte définitif': { class: 'definitif', icon: <XCircle size={14} />, color: '#ef4444' }
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
      <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
        <div className="details-modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Détails de l'action</h2>
            <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
              <XCircle size={20} />
            </button>
          </div>
          
          <div className="modal-body">
            <div className="details-agent">
              <div className="agent-avatar large">
                {item.visiteAgent?.nom?.charAt(0)}{item.visiteAgent?.prenom?.charAt(0)}
              </div>
              <div className="agent-info">
                <h3>{item.visiteAgent?.nom} {item.visiteAgent?.prenom}</h3>
                <span className="matricule">Matricule: #{item.matricule_agent}</span>
                <span className="agence">Agence: {item.visiteAgent?.code_agence || 'N/A'}</span>
              </div>
            </div>
            
            <div className="details-section">
              <h4>📋 Informations</h4>
              <div className="details-grid">
                <div className="detail-item"><Calendar size={16} /><span>Date visite: <strong>{formatDateSimple(item.date_visite)}</strong></span></div>
                <div className="detail-item"><Clock size={16} /><span>Heure: <strong>{item.heure_visite?.substring(0,5) || '--:--'}</strong></span></div>
                <div className="detail-item"><FileText size={16} /><span>Type action: <strong>{item.actionLabel}</strong></span></div>
                <div className="detail-item"><Layers size={16} /><span>Source: <strong>{item.sourceLabel}</strong></span></div>
                <div className="detail-item"><Briefcase size={16} /><span>Type visite: <strong>{item.type_visite || 'Non spécifié'}</strong></span></div>
                {item.medecin && (<div className="detail-item"><User size={16} /><span>Médecin: <strong>{item.medecin}</strong></span></div>)}
              </div>
            </div>
            
            {item.resultat && (
              <div className={`details-decision ${resultatConfig.class}`}>
                <div className="decision-icon">{resultatConfig.icon}</div>
                <div className="decision-content">
                  <span className="decision-label">Décision médicale</span>
                  <span className="decision-value">{item.resultat}</span>
                </div>
              </div>
            )}
            
            {item.observation && (
              <div className="details-section">
                <h4>📝 Observation</h4>
                <div className="observation-box"><p>{item.observation}</p></div>
              </div>
            )}
            
            {item.motif_action && (
              <div className="details-section">
                <h4>📌 Motif</h4>
                <div className="motif-box"><p>{item.motif_action}</p></div>
              </div>
            )}
            
            {item.ancien_statut && (
              <div className="details-section">
                <h4>📊 Changement de statut</h4>
                <div className="status-change">
                  <span className="old-status">{item.ancien_statut}</span>
                  <span className="arrow">→</span>
                  <span className="new-status">{item.nouveau_statut}</span>
                </div>
              </div>
            )}
            
            {item.details && item.details.prochaine_visite && (
              <div className="details-section highlight">
                <h4>📅 Prochaine visite</h4>
                <p>{formatDateSimple(item.details.prochaine_visite)} ({item.details.periodicite_texte || '1 an'})</p>
              </div>
            )}
            
            <div className="details-footer">
              <Clock size={12} />
              <span>Enregistré le: {formatDate(item.created_at)}</span>
            </div>
          </div>
          
          <div className="modal-footer">
            <button className="btn-close" onClick={() => setShowDetailsModal(false)}>Fermer</button>
          </div>
        </div>
      </div>
    );
  };

  // ========== RENDU PRINCIPAL ==========
  return (
    <div className="historique-container">
      
      {/* HEADER */}
      <div className="historique-header">
        <div className="header-left">
          <div className="header-icon"><History size={28} /></div>
          <div className="header-title">
            <h1>Historique des actions</h1>
            <p>Suivi complet de toutes les actions (planning automatique + saisies manuelles)</p>
          </div>
        </div>
        <div className="header-right">
          {activeTab === 'planning' ? (
            <div className="stats-badge planning">
              <Layers size={14} />
              <span>Planning: {stats.PLANNING || 0}</span>
            </div>
          ) : (
            <div className="stats-badge formulaire">
              <PenTool size={14} />
              <span>Formulaire: {stats.FORMULAIRE || 0}</span>
            </div>
          )}
          <button className="btn-icon" onClick={chargerToutesActions} title="Actualiser">
            <RefreshCw size={18} />
          </button>
          <button 
            className={`btn-icon ${showFilters ? 'active' : ''}`} 
            onClick={() => setShowFilters(!showFilters)}
            title="Filtres avancés"
          >
            <Sliders size={18} />
          </button>
          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} 
              onClick={() => setViewMode('list')}
              title="Vue liste"
            >
              <List size={16} />
            </button>
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`} 
              onClick={() => setViewMode('grid')}
              title="Vue grille"
            >
              <Grid3x3 size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* STATS CARTES */}
      <div className="stats-cards">
        <div className="stat-card total">
          <div className="stat-icon"><Activity size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{additionalStats.total}</span>
            <span className="stat-label">Total actions</span>
          </div>
        </div>
        <div className="stat-card effectue">
          <div className="stat-icon"><CheckCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{additionalStats.effectuees}</span>
            <span className="stat-label">Visites effectuées</span>
          </div>
        </div>
        <div className="stat-card reprogramme">
          <div className="stat-icon"><Repeat size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{additionalStats.reprogrammations}</span>
            <span className="stat-label">Reprogrammations</span>
          </div>
        </div>
        <div className="stat-card saisie">
          <div className="stat-icon"><PenTool size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{additionalStats.saisies}</span>
            <span className="stat-label">Saisies manuelles</span>
          </div>
        </div>
      </div>

      {/* STATS PAR TYPE DE VISITE */}
      <div className="stats-types">
        <div className="stat-type periodique">
          <span className="type-icon">🔄</span>
          <div className="type-info">
            <span className="type-value">{additionalStats.periodiques}</span>
            <span className="type-label">Périodiques</span>
          </div>
        </div>
        <div className="stat-type reprise">
          <span className="type-icon">⚕️</span>
          <div className="type-info">
            <span className="type-value">{additionalStats.reprises}</span>
            <span className="type-label">Reprises</span>
          </div>
        </div>
        <div className="stat-type reclassement">
          <span className="type-icon">📝</span>
          <div className="type-info">
            <span className="type-value">{additionalStats.reclassements}</span>
            <span className="type-label">Reclassements</span>
          </div>
        </div>
        <div className="stat-type embauche">
          <span className="type-icon">🆕</span>
          <div className="type-info">
            <span className="type-value">{additionalStats.embauches}</span>
            <span className="type-label">Embauches</span>
          </div>
        </div>
      </div>

      {/* STATS PAR RÉSULTAT */}
      <div className="stats-resultats">
        <div className="stat-resultat apte">
          <CheckCircle size={14} />
          <span className="resultat-value">{additionalStats.aptes}</span>
          <span className="resultat-label">Aptes</span>
        </div>
        <div className="stat-resultat temporaire">
          <AlertTriangle size={14} />
          <span className="resultat-value">{additionalStats.inaptesTemp}</span>
          <span className="resultat-label">Inaptes temp.</span>
        </div>
        <div className="stat-resultat definitif">
          <XCircle size={14} />
          <span className="resultat-value">{additionalStats.inaptesDef}</span>
          <span className="resultat-label">Inaptes déf.</span>
        </div>
      </div>

      {/* RECHERCHE */}
      <div className="search-bar-container">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Rechercher par agent, matricule, type d'action..." 
            value={searchTerm} 
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} 
          />
          {searchTerm && <button className="clear-search" onClick={() => setSearchTerm('')}><XCircle size={16} /></button>}
        </div>
      </div>

      {/* FILTRES AVANCÉS */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-header">
            <h4><Filter size={16} /> Filtres avancés</h4>
            <button className="reset-filters" onClick={resetFilters}>
              <RefreshCw size={14} /> Réinitialiser
            </button>
          </div>
          <div className="filters-grid">
            <div className="filter-group">
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

            <div className="filter-group">
              <label>Type de visite</label>
              <select value={filterTypeVisite} onChange={(e) => setFilterTypeVisite(e.target.value)}>
                <option value="all">📋 Tous les types</option>
                <option value="Périodique">🔄 Périodique</option>
                <option value="Reprise">⚕️ Reprise</option>
                <option value="Reclassement">📝 Reclassement</option>
                <option value="Embauche">🆕 Embauche</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Source</label>
              <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
                <option value="all">🔀 Toutes les sources</option>
                <option value="PLANNING">📋 Planning automatique</option>
                <option value="FORMULAIRE">✏️ Formulaire manuel</option>
              </select>
            </div>

            <div className="filter-group">
              <label>Résultat</label>
              <select value={filterResultat} onChange={(e) => setFilterResultat(e.target.value)}>
                <option value="all">📊 Tous les résultats</option>
                <option value="Apte">✅ Apte</option>
                <option value="Apte avec réserves">⚠️ Apte avec réserves</option>
                <option value="Inapte temporaire">⏳ Inapte temporaire</option>
                <option value="Inapte définitif">❌ Inapte définitif</option>
              </select>
            </div>

            <div className="filter-group">
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

            <div className="filter-group">
              <label>Date début</label>
              <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>

            <div className="filter-group">
              <label>Date fin</label>
              <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>
          
          <div className="filters-actions">
            <button className="btn-apply" onClick={() => chargerToutesActions()}>
              Appliquer les filtres
            </button>
          </div>
        </div>
      )}

      {/* ONGLETS */}
      <div className="historique-tabs">
        <button 
          className={`tab-btn ${activeTab === 'planning' ? 'active' : ''}`} 
          onClick={() => setActiveTab('planning')}
        >
          <Activity size={18} />
          <span>Planning</span>
          <span className="tab-count">{historiqueActions.filter(a => a.source === 'PLANNING').length}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'formulaire' ? 'active' : ''}`} 
          onClick={() => setActiveTab('formulaire')}
        >
          <PenTool size={18} />
          <span>Formulaire</span>
          <span className="tab-count">{historiqueActions.filter(a => a.source === 'FORMULAIRE').length}</span>
        </button>
      </div>

      {/* ERREUR */}
      {error && (
        <div className="error-container">
          <AlertCircle size={20} />
          <div className="error-content"><strong>Erreur de chargement</strong><p>{error}</p></div>
          <button onClick={chargerToutesActions}><RefreshCw size={14} /> Réessayer</button>
        </div>
      )}

      {/* CONTENU */}
      {loading ? (
        <div className="loading-state"><div className="spinner"></div><p>Chargement de l'historique...</p></div>
      ) : (
        <div className="historique-content">
          {filteredData.length === 0 ? (
            <div className="empty-state">
              <History size={48} />
              <h3>Aucune action enregistrée</h3>
              <p>Les actions sur le planning et les saisies manuelles apparaîtront ici</p>
              <button className="btn-primary" onClick={chargerToutesActions}><RefreshCw size={16} /> Actualiser</button>
            </div>
          ) : (
            <>
              <div className={`timeline ${viewMode === 'grid' ? 'grid-view' : ''}`}>
                {paginatedData.map((item, index) => {
                  const actionColor = getActionColor(item.type_action);
                  const actionBg = getActionBg(item.type_action);
                  const resultatConfig = getResultatConfig(item.resultat);
                  
                  return (
                    <div key={item.id || index} className="timeline-item">
                      <div className="timeline-marker" style={{ background: actionColor }}>
                        {item.actionIcon}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <div className="action-info">
                            <span className="action-type" style={{ color: actionColor }}>{item.actionLabel}</span>
                            <span className="source-badge" style={{ background: item.sourceBg, color: item.sourceColor }}>
                              {item.sourceIcon} {item.sourceLabel}
                            </span>
                            {item.type_visite && (
                              <span className="type-badge-small" title={item.type_visite}>
                                {getTypeVisiteIcon(item.type_visite)} {item.type_visite}
                              </span>
                            )}
                            {item.resultat && item.type_action === 'EFFECTUEE' && (
                              <span className={`resultat-badge-small ${resultatConfig.class}`}>
                                {resultatConfig.icon} {item.resultat}
                              </span>
                            )}
                          </div>
                          <span className="action-date">{formatDate(item.created_at)}</span>
                        </div>
                        
                        <div className="action-details">
                          <div className="detail-row">
                            <User size={14} />
                            <strong>Agent:</strong>
                            <span>{item.visiteAgent?.nom} {item.visiteAgent?.prenom}</span>
                            <span className="matricule">#{item.matricule_agent}</span>
                          </div>
                          <div className="detail-row">
                            <CalendarIcon size={14} />
                            <strong>Date visite:</strong>
                            <span>{formatDateSimple(item.date_visite)}</span>
                            <Clock size={12} />
                            <span>{item.heure_visite?.substring(0,5) || '--:--'}</span>
                          </div>
                          
                          {item.medecin && (
                            <div className="detail-row">
                              <User size={14} />
                              <strong>Médecin:</strong>
                              <span>{item.medecin}</span>
                            </div>
                          )}
                          
                          {item.motif_action && item.type_action !== 'SAISIE_MANUELLE' && (
                            <div className="detail-row motif">
                              <FileText size={14} />
                              <strong>Motif:</strong>
                              <span className="motif-text">{item.motif_action.substring(0, 80)}...</span>
                            </div>
                          )}
                          
                          {item.observation && (
                            <div className="detail-row motif">
                              <FileText size={14} />
                              <strong>Observation:</strong>
                              <span className="observation-preview">{item.observation.substring(0, 80)}...</span>
                            </div>
                          )}
                          
                          {item.details && item.details.prochaine_visite && (
                            <div className="detail-row highlight">
                              <CalendarIcon size={14} />
                              <strong>Prochaine visite:</strong>
                              <span>{formatDateSimple(item.details.prochaine_visite)} ({item.details.periodicite_texte || '1 an'})</span>
                            </div>
                          )}
                          
                          <div className="timeline-actions">
                            <button className="btn-details-small" onClick={() => openDetailsModal(item)}>
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
                <div className="pagination">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft size={16} /> Précédent
                  </button>
                  <span className="page-info">Page {currentPage} sur {totalPages}</span>
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