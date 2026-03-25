// frontend/components/visites/HistoriqueVisites.js
import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, User, FileText, CheckCircle, XCircle,
  AlertCircle, Info, RefreshCw, Download, Eye,
  Layers, PenTool, History, Activity, TrendingUp, Award,
  MapPin, Heart, AlertTriangle, Filter, ChevronDown
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

  // ========== CHARGEMENT INITIAL ==========
  useEffect(() => {
    chargerAgents();
    chargerStats();
  }, []);

  // ========== RECHARGEMENT QUAND L'ONGLET CHANGE ==========
  useEffect(() => {
    if (activeTab === 'planning') {
      chargerHistoriquePlanning();
    } else {
      chargerHistoriqueFormulaire();
    }
  }, [activeTab, selectedAgent]);

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
      if (selectedAgent) url += `?matricule=${selectedAgent}`;
      
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
      if (selectedAgent) url += `?matricule=${selectedAgent}`;
      
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

  const getResultatClass = (resultat) => {
    const classes = {
      'Apte': 'apte',
      'Apte avec réserves': 'reserves',
      'Inapte temporaire': 'temporaire',
      'Inapte définitif': 'definitif'
    };
    return classes[resultat] || '';
  };

  const getResultatIcon = (resultat) => {
    switch(resultat) {
      case 'Apte': return <CheckCircle size={14} color="#10b981" />;
      case 'Apte avec réserves': return <AlertCircle size={14} color="#f59e0b" />;
      case 'Inapte temporaire': return <AlertTriangle size={14} color="#f97316" />;
      case 'Inapte définitif': return <XCircle size={14} color="#ef4444" />;
      default: return <Info size={14} />;
    }
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
  };

  // ========== RENDU ==========
  return (
    <div className="historique-container">
      
      {/* ===== HEADER ===== */}
      <div className="historique-header">
        <div className="header-left">
          <div className="header-icon">
            <History size={28} />
          </div>
          <div className="header-title">
            <h1>Historique des visites</h1>
            <p>Consultez toutes les visites et actions</p>
          </div>
        </div>

        <div className="header-right">
          <div className="stats-badge" title="Actions planning">
            <Layers size={14} />
            <span>Planning: {stats.PLANNING || 0}</span>
          </div>
          <div className="stats-badge" title="Visites formulaire">
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
            title="Filtres"
          >
            <Filter size={18} />
          </button>
        </div>
      </div>

      {/* ===== FILTRES ===== */}
      {showFilters && (
        <div className="filters-panel">
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
          <div className="filters-actions">
            <button className="btn-secondary" onClick={resetFilters}>
              Réinitialiser
            </button>
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
          <span>{error}</span>
          <button onClick={() => {
            if (activeTab === 'planning') chargerHistoriquePlanning();
            else chargerHistoriqueFormulaire();
          }}>
            <RefreshCw size={14} /> Réessayer
          </button>
        </div>
      )}

      {/* ===== CONTENU ===== */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement de l'historique {activeTab === 'planning' ? 'planning' : 'formulaire'}...</p>
        </div>
      ) : (
        <div className="historique-content">
          
          {/* ===== ONGLET 1 : HISTORIQUE PLANNING (actions sur le planning) ===== */}
          {activeTab === 'planning' && (
            <div className="planning-historique">
              {historiquePlanning.length === 0 ? (
                <div className="empty-state">
                  <Activity size={48} />
                  <h3>Aucune action planning</h3>
                  <p>Les actions sur le planning (programmation, effectué, reprogrammation, annulation) apparaîtront ici</p>
                  <button className="btn-primary" onClick={chargerHistoriquePlanning}>
                    <RefreshCw size={16} /> Actualiser
                  </button>
                </div>
              ) : (
                <div className="timeline">
                  {historiquePlanning.map((item, index) => {
                    const actionColor = getActionColor(item.type_action);
                    const actionLabel = getActionLabel(item.type_action);
                    
                    return (
                      <div key={item.id || index} className="timeline-item">
                        <div className="timeline-marker" style={{ background: actionColor }}>
                          {item.type_action === 'PROGRAMMATION' && '📅'}
                          {item.type_action === 'EFFECTUEE' && '✅'}
                          {item.type_action === 'REPROGRAMMEE' && '🔄'}
                          {item.type_action === 'ANNULEE' && '❌'}
                          {item.type_action === 'REAFFECTEE' && '👥'}
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <div>
                              <span className="action-type" style={{ color: actionColor }}>
                                {actionLabel}
                              </span>
                              <span className="action-badge" style={{ background: actionColor + '20', color: actionColor }}>
                                {item.type_action}
                              </span>
                            </div>
                            <span className="action-date">{formatDate(item.created_at)}</span>
                          </div>
                          
                          <div className="action-details">
                            <p><strong>Agent:</strong> {item.visiteAgent?.nom} {item.visiteAgent?.prenom} (#{item.matricule_agent})</p>
                            <p><strong>Date visite:</strong> {item.date_visite} à {item.heure_visite?.substring(0,5) || '--:--'}</p>
                            
                            {item.ancien_statut && (
                              <p><strong>Ancien statut:</strong> {item.ancien_statut}</p>
                            )}
                            
                            {item.nouveau_statut && (
                              <p><strong>Nouveau statut:</strong> {item.nouveau_statut}</p>
                            )}
                            
                            {item.motif_action && (
                              <p><strong>Motif:</strong> {item.motif_action}</p>
                            )}
                            
                            {item.type_action === 'EFFECTUEE' && item.resultat && (
                              <p><strong>Résultat:</strong> {item.resultat}</p>
                            )}
                            
                            {item.type_action === 'EFFECTUEE' && item.medecin && item.medecin !== 'Système' && (
                              <p><strong>Médecin:</strong> {item.medecin}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ===== ONGLET 2 : VISITES FORMULAIRE (saisies manuellement) ===== */}
          {activeTab === 'formulaire' && (
            <div className="formulaire-historique">
              {historiqueFormulaire.length === 0 ? (
                <div className="empty-state">
                  <PenTool size={48} />
                  <h3>Aucune visite formulaire</h3>
                  <p>Les visites saisies manuellement via le formulaire apparaîtront ici</p>
                  <button className="btn-primary" onClick={chargerHistoriqueFormulaire}>
                    <RefreshCw size={16} /> Actualiser
                  </button>
                </div>
              ) : (
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
                      {historiqueFormulaire.map(visite => (
                        <tr key={visite.matricule_visite}>
                          <td>
                            <div className="date-cell">
                              <Calendar size={12} />
                              {visite.date_visite} <span className="heure">{visite.heure_visite || '--:--'}</span>
                            </div>
                          </td>
                          <td>
                            <div className="agent-cell">
                              <div className="agent-avatar-small">
                                {visite.visiteAgent?.nom?.charAt(0)}{visite.visiteAgent?.prenom?.charAt(0)}
                              </div>
                              <div className="agent-info">
                                <span>{visite.visiteAgent?.nom} {visite.visiteAgent?.prenom}</span>
                                <small>#{visite.matricule_agent}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="type-badge">{visite.type_visite}</span>
                          </td>
                          <td>
                            <div className="medecin-cell">
                              <User size={12} />
                              {visite.medecin}
                            </div>
                          </td>
                          <td>
                            <span className={`resultat-badge ${getResultatClass(visite.resultat)}`}>
                              {getResultatIcon(visite.resultat)} {visite.resultat}
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
                              {formatDateSimple(visite.created_at)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HistoriqueVisites;