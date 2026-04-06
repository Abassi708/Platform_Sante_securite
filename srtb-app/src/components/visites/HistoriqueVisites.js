// frontend/components/visites/HistoriqueVisites.js
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, FileText, CheckCircle, XCircle,
  AlertCircle, Info, RefreshCw, Download, Eye,
  Layers, PenTool, History, Activity, TrendingUp, Award,
  MapPin, Heart, AlertTriangle, Filter, ChevronDown,
  Search, ChevronLeft, ChevronRight, Sliders, Grid3x3, List,
  Printer, FileSpreadsheet, Settings, Shield, Bell
} from 'lucide-react';
import '../../styles/HistoriqueVisites.css';

const HistoriqueVisites = () => {
  // ========== ÉTATS ==========
  const [activeTab, setActiveTab] = useState('planning');
  const [historiquePlanning, setHistoriquePlanning] = useState([]);
  const [historiqueFormulaire, setHistoriqueFormulaire] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ PLANNING: 0, FORMULAIRE: 0 });
  
  // Filtres
  const [selectedAgent, setSelectedAgent] = useState('');
  const [agents, setAgents] = useState([]);
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [viewMode, setViewMode] = useState('list');

  // ========== CHARGEMENT INITIAL ==========
  useEffect(() => {
    chargerAgents();
    chargerStats();
  }, []);

  // ========== RECHARGEMENT QUAND L'ONGLET CHANGE ==========
  useEffect(() => {
    setCurrentPage(1);
    if (activeTab === 'planning') {
      chargerHistoriquePlanning();
    } else {
      chargerHistoriqueFormulaire();
    }
  }, [activeTab, selectedAgent, dateDebut, dateFin]);

  // ========== FONCTIONS API ==========
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

  // ========== HISTORIQUE PLANNING (actions sur le planning) ==========
  const chargerHistoriquePlanning = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_API_URL}/api/historique/planning`;
      const params = new URLSearchParams();
      if (selectedAgent) params.append('matricule', selectedAgent);
      if (dateDebut) params.append('date_debut', dateDebut);
      if (dateFin) params.append('date_fin', dateFin);
      if (params.toString()) url += `?${params.toString()}`;
      
      console.log('🔍 Chargement historique planning:', url);
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      console.log('📊 Réponse historique planning:', data);
      
      if (data.success) {
        setHistoriquePlanning(data.historique || []);
        console.log(`✅ ${data.historique?.length || 0} actions planning chargées`);
      } else {
        setError(data.message || 'Erreur de chargement');
      }
    } catch (err) {
      console.error('❌ Erreur chargement historique planning:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========== HISTORIQUE FORMULAIRE (visites saisies manuellement) ==========
  const chargerHistoriqueFormulaire = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_API_URL}/api/historique/formulaire`;
      const params = new URLSearchParams();
      if (selectedAgent) params.append('matricule', selectedAgent);
      if (dateDebut) params.append('date_debut', dateDebut);
      if (dateFin) params.append('date_fin', dateFin);
      if (params.toString()) url += `?${params.toString()}`;
      
      console.log('🔍 Chargement historique formulaire:', url);
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      console.log('📊 Réponse historique formulaire:', data);
      
      if (data.success) {
        setHistoriqueFormulaire(data.historique || []);
        console.log(`✅ ${data.historique?.length || 0} visites formulaire chargées`);
      } else {
        setError(data.message || 'Erreur de chargement');
      }
    } catch (err) {
      console.error('❌ Erreur chargement historique formulaire:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ========== STATISTIQUES DES SOURCES ==========
  const chargerStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/historique/stats-sources`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      console.log('📊 Stats sources:', data);
      
      if (data.success) {
        const statsMap = { PLANNING: 0, FORMULAIRE: 0 };
        data.stats.forEach(s => {
          if (s.source === 'PLANNING') statsMap.PLANNING = s.nombre;
          if (s.source === 'FORMULAIRE') statsMap.FORMULAIRE = s.nombre;
        });
        setStats(statsMap);
      }
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  };

  // ========== FONCTIONS UTILITAIRES ==========
  const getActionConfig = (action) => {
    const configs = {
      'PROGRAMMATION': { color: 'blue', bg: '#eff6ff', icon: '📅', label: 'Programmation' },
      'EFFECTUEE': { color: 'blue', bg: '#f0fdf4', icon: '✅', label: 'Visite effectuée' },
      'REPROGRAMMEE': { color: 'blue', bg: '#fffbeb', icon: '🔄', label: 'Reprogrammation' },
      'ANNULEE': { color: '#ef4444', bg: '#fef2f2', icon: '❌', label: 'Annulation' },
      'REAFFECTEE': { color: '#8b5cf6', bg: '#f5f3ff', icon: '👥', label: 'Réaffectation' },
      'SAISIE_MANUELLE': { color: '#8b5cf6', bg: '#f5f3ff', icon: '✏️', label: 'Saisie manuelle' }
    };
    return configs[action] || { color: '#64748b', bg: '#f1f5f9', icon: '📋', label: action };
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

  const resetFilters = () => {
    setSelectedAgent('');
    setDateDebut('');
    setDateFin('');
    setSearchTerm('');
  };

  // Filtrer les données par recherche
  const filterBySearch = (data) => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(item => {
      if (activeTab === 'planning') {
        const agent = item.visiteAgent;
        return (agent?.nom?.toLowerCase().includes(term) ||
                agent?.prenom?.toLowerCase().includes(term) ||
                item.matricule_agent?.toLowerCase().includes(term) ||
                item.type_action?.toLowerCase().includes(term));
      } else {
        const agent = item.visiteAgent;
        return (agent?.nom?.toLowerCase().includes(term) ||
                agent?.prenom?.toLowerCase().includes(term) ||
                item.matricule_agent?.toLowerCase().includes(term) ||
                item.type_visite?.toLowerCase().includes(term) ||
                item.resultat?.toLowerCase().includes(term));
      }
    });
  };

  // Pagination
  const getPaginatedData = (data) => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return data.slice(start, end);
  };

  const filteredData = filterBySearch(activeTab === 'planning' ? historiquePlanning : historiqueFormulaire);
  const paginatedData = getPaginatedData(filteredData);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Statistiques supplémentaires
  const getAdditionalStats = () => {
    if (activeTab === 'planning') {
      const actions = historiquePlanning;
      return {
        total: actions.length,
        reprogrammations: actions.filter(a => a.type_action === 'REPROGRAMMEE').length,
        annulations: actions.filter(a => a.type_action === 'ANNULEE').length,
        effectuees: actions.filter(a => a.type_action === 'EFFECTUEE').length
      };
    } else {
      const visites = historiqueFormulaire;
      const results = visites.reduce((acc, v) => {
        acc[v.resultat] = (acc[v.resultat] || 0) + 1;
        return acc;
      }, {});
      return {
        total: visites.length,
        apte: results['Apte'] || 0,
        reserves: results['Apte avec réserves'] || 0,
        inapte: (results['Inapte temporaire'] || 0) + (results['Inapte définitif'] || 0)
      };
    }
  };

  const additionalStats = getAdditionalStats();

  // ========== RENDU ==========
  return (
    <div className="historique-container">
      
      {/* ===== HEADER AVEC STATS ===== */}
      <div className="historique-header">
        <div className="header-left">
          <div className="header-icon">
            <History size={28} />
          </div>
          <div className="header-title">
            <h1>Historique des visites médicales</h1>
            <p>Suivi complet des actions planning et visites effectuées</p>
          </div>
        </div>

        <div className="header-right">
          <div className="stats-badge planning">
            <Layers size={14} />
            <span>Planning: {stats.PLANNING || 0}</span>
          </div>
          <div className="stats-badge formulaire">
            <PenTool size={14} />
            <span>Formulaire: {stats.FORMULAIRE || 0}</span>
          </div>
          <button className="btn-icon" onClick={() => {
            if (activeTab === 'planning') chargerHistoriquePlanning();
            else chargerHistoriqueFormulaire();
            chargerStats();
          }} title="Actualiser">
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

      {/* ===== STATS CARTES ===== */}
      <div className="stats-cards">
        <div className="stat-card total">
          <div className="stat-icon"><Activity size={20} /></div>
          <div className="stat-info">
            <span className="stat-value">{additionalStats.total}</span>
            <span className="stat-label">Total enregistrements</span>
          </div>
        </div>
        {activeTab === 'planning' ? (
          <>
            <div className="stat-card effectue">
              <div className="stat-icon"><CheckCircle size={20} /></div>
              <div className="stat-info">
                <span className="stat-value">{additionalStats.effectuees}</span>
                <span className="stat-label">Visites effectuées</span>
              </div>
            </div>
            <div className="stat-card reprogramme">
              <div className="stat-icon"><RefreshCw size={20} /></div>
              <div className="stat-info">
                <span className="stat-value">{additionalStats.reprogrammations}</span>
                <span className="stat-label">Reprogrammations</span>
              </div>
            </div>
            <div className="stat-card annule">
              <div className="stat-icon"><XCircle size={20} /></div>
              <div className="stat-info">
                <span className="stat-value">{additionalStats.annulations}</span>
                <span className="stat-label">Annulations</span>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="stat-card apte">
              <div className="stat-icon"><Award size={20} /></div>
              <div className="stat-info">
                <span className="stat-value">{additionalStats.apte}</span>
                <span className="stat-label">Agents aptes</span>
              </div>
            </div>
            <div className="stat-card reserves">
              <div className="stat-icon"><AlertCircle size={20} /></div>
              <div className="stat-info">
                <span className="stat-value">{additionalStats.reserves}</span>
                <span className="stat-label">Aptes avec réserves</span>
              </div>
            </div>
            <div className="stat-card inapte">
              <div className="stat-icon"><AlertTriangle size={20} /></div>
              <div className="stat-info">
                <span className="stat-value">{additionalStats.inapte}</span>
                <span className="stat-label">Inaptes</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ===== BARRE DE RECHERCHE ===== */}
      <div className="search-bar-container">
        <div className="search-input-wrapper">
          <Search size={18} />
          <input 
            type="text" 
            placeholder="Rechercher par agent, matricule, type..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button className="clear-search" onClick={() => setSearchTerm('')}>
              <XCircle size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ===== FILTRES AVANCÉS ===== */}
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
              <label>Date début</label>
              <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
            </div>
            <div className="filter-group">
              <label>Date fin</label>
              <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {/* ===== ONGLETS ===== */}
      <div className="historique-tabs">
        <button 
          className={`tab-btn ${activeTab === 'planning' ? 'active' : ''}`}
          onClick={() => setActiveTab('planning')}
        >
          <Activity size={18} />
          <span>Historique Planning</span>
          <span className="tab-count">{stats.PLANNING || 0}</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'formulaire' ? 'active' : ''}`}
          onClick={() => setActiveTab('formulaire')}
        >
          <PenTool size={18} />
          <span>Visites Formulaire</span>
          <span className="tab-count">{stats.FORMULAIRE || 0}</span>
        </button>
      </div>

      {/* ===== MESSAGE D'ERREUR ===== */}
      {error && (
        <div className="error-container">
          <AlertCircle size={20} />
          <div className="error-content">
            <strong>Erreur de chargement</strong>
            <p>{error}</p>
          </div>
          <button onClick={() => {
            if (activeTab === 'planning') chargerHistoriquePlanning();
            else chargerHistoriqueFormulaire();
          }}>
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      )}

      {/* ===== CONTENU PRINCIPAL ===== */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement de l'historique {activeTab === 'planning' ? 'planning' : 'formulaire'}...</p>
        </div>
      ) : (
        <div className="historique-content">
          
          {/* ===== ONGLET 1 : HISTORIQUE PLANNING ===== */}
          {activeTab === 'planning' && (
            <div className="planning-historique">
              {filteredData.length === 0 ? (
                <div className="empty-state">
                  <Activity size={48} />
                  <h3>Aucune action planning</h3>
                  <p>Les actions sur le planning (programmation, effectué, reprogrammation, annulation) apparaîtront ici</p>
                  <button className="btn-primary" onClick={chargerHistoriquePlanning}>
                    <RefreshCw size={16} /> Actualiser
                  </button>
                </div>
              ) : (
                <>
                  <div className={`timeline ${viewMode === 'grid' ? 'grid-view' : ''}`}>
                    {paginatedData.map((item, index) => {
                      const actionConfig = getActionConfig(item.type_action);
                      
                      return (
                        <div key={item.id || index} className="timeline-item">
                          <div className="timeline-marker" style={{ background: actionConfig.color }}>
                            {actionConfig.icon}
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-header">
                              <div className="action-info">
                                <span className="action-type" style={{ color: actionConfig.color }}>
                                  {actionConfig.label}
                                </span>
                                <span className="action-badge" style={{ background: actionConfig.bg, color: actionConfig.color }}>
                                  {item.type_action}
                                </span>
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
                                <Calendar size={14} />
                                <strong>Date visite:</strong>
                                <span>{item.date_visite}</span>
                                <Clock size={12} />
                                <span>{item.heure_visite?.substring(0,5) || '--:--'}</span>
                              </div>
                              
                              {item.ancien_statut && (
                                <div className="detail-row">
                                  <strong>Ancien statut:</strong>
                                  <span className="statut ancien">{item.ancien_statut}</span>
                                  <span>→</span>
                                  <strong>Nouveau:</strong>
                                  <span className="statut nouveau">{item.nouveau_statut}</span>
                                </div>
                              )}
                              
                              {item.motif_action && (
                                <div className="detail-row motif">
                                  <FileText size={14} />
                                  <strong>Motif:</strong>
                                  <span>{item.motif_action}</span>
                                </div>
                              )}
                              
                              {item.type_action === 'EFFECTUEE' && item.resultat && (
                                <div className="detail-row">
                                  <Award size={14} />
                                  <strong>Résultat:</strong>
                                  <span className={`resultat ${getResultatConfig(item.resultat).class}`}>
                                    {getResultatConfig(item.resultat).icon} {item.resultat}
                                  </span>
                                </div>
                              )}
                              
                              {item.type_action === 'EFFECTUEE' && item.medecin && item.medecin !== 'Système' && (
                                <div className="detail-row">
                                  <User size={14} />
                                  <strong>Médecin:</strong>
                                  <span>{item.medecin}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft size={16} /> Précédent
                      </button>
                      <span className="page-info">
                        Page {currentPage} sur {totalPages}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Suivant <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ===== ONGLET 2 : VISITES FORMULAIRE ===== */}
          {activeTab === 'formulaire' && (
            <div className="formulaire-historique">
              {filteredData.length === 0 ? (
                <div className="empty-state">
                  <PenTool size={48} />
                  <h3>Aucune visite formulaire</h3>
                  <p>Les visites saisies manuellement via le formulaire apparaîtront ici</p>
                  <button className="btn-primary" onClick={chargerHistoriqueFormulaire}>
                    <RefreshCw size={16} /> Actualiser
                  </button>
                </div>
              ) : (
                <>
                  <div className="visites-table-container">
                    <table className="visites-table">
                      <thead>
                        <tr>
                          <th>Date visite</th>
                          <th>Agent</th>
                          <th>Type</th>
                          <th>Médecin</th>
                          <th>Résultat</th>
                          <th>Observations</th>
                          <th>Enregistré le</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedData.map(visite => (
                          <tr key={visite.matricule_visite}>
                            <td>
                              <div className="date-cell">
                                <Calendar size={12} />
                                <span className="date">{visite.date_visite}</span>
                                <Clock size={10} />
                                <span className="heure">{visite.heure_visite || '--:--'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="agent-cell">
                                <div className="agent-avatar">
                                  {visite.visiteAgent?.nom?.charAt(0)}{visite.visiteAgent?.prenom?.charAt(0)}
                                </div>
                                <div className="agent-info">
                                  <span className="agent-name">{visite.visiteAgent?.nom} {visite.visiteAgent?.prenom}</span>
                                  <span className="agent-matricule">#{visite.matricule_agent}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className="type-badge">{visite.type_visite}</span>
                            </td>
                            <td>
                              <div className="medecin-cell">
                                <User size={12} />
                                <span>{visite.medecin}</span>
                              </div>
                            </td>
                            <td>
                              <span className={`resultat-badge ${getResultatConfig(visite.resultat).class}`}>
                                {getResultatConfig(visite.resultat).icon} {visite.resultat}
                              </span>
                            </td>
                            <td>
                              <div className="observation-cell" title={visite.observation}>
                                {visite.observation?.substring(0, 50) || '-'}
                                {visite.observation?.length > 50 && '...'}
                              </div>
                            </td>
                            <td>
                              <div className="date-cell">
                                <Clock size={12} />
                                <span>{formatDateSimple(visite.created_at)}</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="pagination">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft size={16} /> Précédent
                      </button>
                      <span className="page-info">
                        Page {currentPage} sur {totalPages}
                      </span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Suivant <ChevronRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoriqueVisites;