// frontend/src/components/AgentsList.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Filter, Download, Eye, User, Building2, Briefcase,
  Calendar, AlertCircle, CheckCircle, XCircle, Clock, ChevronRight,
  UserCheck, UserX, Users, Activity, Heart
} from 'lucide-react';
import AgentDetailsModal from './AgentDetailsModal';
import '../styles/AgentsList.css';

const AgentsList = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    statut: '',
    code_agence: '',
    code_affectation: '',
    en_inaptitude: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    total: 0,
    pages: 0,
    limit: 20
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [agences, setAgences] = useState([]);
  const [affectations, setAffectations] = useState([]);
  const [stats, setStats] = useState(null);

  // Charger les agences et affectations pour les filtres
  useEffect(() => {
    fetchAgences();
    fetchAffectations();
    fetchStats();
  }, []);

  // Charger les agents quand les filtres changent
  useEffect(() => {
    fetchAgents();
  }, [search, filters, pagination.page]);

  const fetchAgences = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/technicien/agences`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAgences(data.data);
      }
    } catch (err) {
      console.error('Erreur chargement agences:', err);
    }
  };

  const fetchAffectations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/technicien/affectations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAffectations(data.data);
      }
    } catch (err) {
      console.error('Erreur chargement affectations:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/technicien/stats/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  };

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Token:', token);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...(search && { search }),
        ...(filters.statut && { statut: filters.statut }),
        ...(filters.code_agence && { code_agence: filters.code_agence }),
        ...(filters.code_affectation && { code_affectation: filters.code_affectation }),
        ...(filters.en_inaptitude && { en_inaptitude: filters.en_inaptitude })
      });
      
      const url = `${process.env.REACT_APP_API_URL}/api/technicien/agents?${params}`;
    console.log('URL:', url); // ← AJOUTER
    
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('Response status:', response.status); // ← AJOUTER
    
    const data = await response.json();
    console.log('Data:', data); // ← AJOUTER
    
    if (data.success) {
      setAgents(data.data.agents);
      setPagination(prev => ({
        ...prev,
        total: data.data.pagination.total,
        pages: data.data.pagination.pages
      }));
    } else {
      console.error('Erreur API:', data.message);
    }
  } catch (err) {
    console.error('Erreur chargement agents:', err);
  } finally {
    setLoading(false);
  }
};

  const handleViewAgent = (agent) => {
    setSelectedAgent(agent);
    setShowDetailsModal(true);
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        ...(filters.code_agence && { code_agence: filters.code_agence }),
        ...(filters.code_affectation && { code_affectation: filters.code_affectation })
      });
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/technicien/agents/export/excel?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        // Créer un CSV à partir des données
        const headers = Object.keys(data.data[0]);
        const csvRows = [
          headers.join(','),
          ...data.data.map(row => headers.map(header => JSON.stringify(row[header] || '')).join(','))
        ];
        const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(csvBlob);
        link.setAttribute('href', url);
        link.setAttribute('download', `agents_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      console.error('Erreur export:', err);
    }
  };

  const getStatutBadge = (statut) => {
    const badges = {
      actif: { icon: <CheckCircle size={12} />, color: '#10b981', bg: '#10b98120' },
      inactif: { icon: <XCircle size={12} />, color: '#ef4444', bg: '#ef444420' },
      conge: { icon: <Clock size={12} />, color: '#f59e0b', bg: '#f59e0b20' },
      maladie: { icon: <Heart size={12} />, color: '#8b5cf6', bg: '#8b5cf620' }
    };
    const badge = badges[statut] || badges.actif;
    return (
      <span className="statut-badge" style={{ background: badge.bg, color: badge.color }}>
        {badge.icon}
        {statut}
      </span>
    );
  };

  if (loading && agents.length === 0) {
    return (
      <div className="agents-list-loading">
        <div className="spinner"></div>
        <p>Chargement des agents...</p>
      </div>
    );
  }

  return (
    <div className="agents-list-container">
      {/* Header avec statistiques */}
      <div className="agents-header">
        <div className="header-left">
          <h2>
            <Users size={24} />
            Gestion des Agents
          </h2>
          <p>Consultez et gérez les informations des agents pour le suivi santé-sécurité</p>
        </div>
        <div className="header-actions">
          <button className="btn-export" onClick={handleExport}>
            <Download size={18} />
            Exporter
          </button>
        </div>
      </div>

      {/* Cartes statistiques */}
      {stats && (
        <div className="stats-cards">
          <div className="stat-card-mini">
            <div className="stat-icon-mini" style={{ background: '#2563eb20', color: '#2563eb' }}>
              <Users size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value-mini">{stats.agents.total}</span>
              <span className="stat-label-mini">Total agents</span>
            </div>
          </div>
          <div className="stat-card-mini">
            <div className="stat-icon-mini" style={{ background: '#10b98120', color: '#10b981' }}>
              <UserCheck size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value-mini">{stats.agents.actifs}</span>
              <span className="stat-label-mini">Actifs</span>
            </div>
          </div>
          <div className="stat-card-mini">
            <div className="stat-icon-mini" style={{ background: '#ef444420', color: '#ef4444' }}>
              <UserX size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value-mini">{stats.agents.enInaptitude}</span>
              <span className="stat-label-mini">En inaptitude</span>
            </div>
          </div>
          <div className="stat-card-mini">
            <div className="stat-icon-mini" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
              <Activity size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value-mini">{stats.agents.tauxActivite}%</span>
              <span className="stat-label-mini">Taux activité</span>
            </div>
          </div>
        </div>
      )}

      {/* Barre de recherche et filtres */}
      <div className="search-filters-bar">
        <div className="search-wrapper">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher par nom, prénom ou matricule..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn-filters" onClick={() => setShowFilters(!showFilters)}>
          <Filter size={18} />
          Filtres
          {Object.values(filters).some(v => v) && <span className="filter-active-dot" />}
        </button>
      </div>

      {/* Panneau de filtres */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            className="filters-panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="filters-grid">
              <div className="filter-group">
                <label>Statut</label>
                <select
                  value={filters.statut}
                  onChange={(e) => setFilters({ ...filters, statut: e.target.value, page: 1 })}
                >
                  <option value="">Tous</option>
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                  <option value="conge">Congé</option>
                  <option value="maladie">Maladie</option>
                </select>
              </div>
              
              <div className="filter-group">
                <label>Agence</label>
                <select
                  value={filters.code_agence}
                  onChange={(e) => setFilters({ ...filters, code_agence: e.target.value, page: 1 })}
                >
                  <option value="">Toutes</option>
                  {agences.map(agence => (
                    <option key={agence.code_agence} value={agence.code_agence}>
                      {agence.nom_agence} ({agence.ville})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Affectation</label>
                <select
                  value={filters.code_affectation}
                  onChange={(e) => setFilters({ ...filters, code_affectation: e.target.value, page: 1 })}
                >
                  <option value="">Toutes</option>
                  {affectations.map(affectation => (
                    <option key={affectation.code_affectation} value={affectation.code_affectation}>
                      {affectation.libelle_affectation}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>Inaptitude</label>
                <select
                  value={filters.en_inaptitude}
                  onChange={(e) => setFilters({ ...filters, en_inaptitude: e.target.value, page: 1 })}
                >
                  <option value="">Tous</option>
                  <option value="true">En inaptitude</option>
                  <option value="false">Non inapte</option>
                </select>
              </div>
              
              <button
                className="btn-reset-filters"
                onClick={() => {
                  setFilters({ statut: '', code_agence: '', code_affectation: '', en_inaptitude: '' });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
              >
                Réinitialiser
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tableau des agents */}
      <div className="agents-table-wrapper">
        <table className="agents-table">
          <thead>
            <tr>
              <th>Matricule</th>
              <th>Nom & Prénom</th>
              <th>Âge</th>
              <th>Agence</th>
              <th>Affectation</th>
              <th>Statut</th>
              <th>Inaptitude</th>
              <th>Prochaine visite</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan="9" className="empty-row">
                  <AlertCircle size={32} />
                  <p>Aucun agent trouvé</p>
                </td>
              </tr>
            ) : (
              agents.map(agent => (
                <tr key={agent.matricule_agent}>
                  <td className="matricule-cell">{agent.matricule_agent}</td>
                  <td className="name-cell">
                    <div className="agent-name">
                      <span className="nom">{agent.nom}</span>
                      <span className="prenom">{agent.prenom}</span>
                    </div>
                  </td>
                  <td>{agent.age ? `${agent.age} ans` : '-'}</td>
                  <td>
                    <div className="agence-info">
                      <Building2 size={14} />
                      <span>{agent.agentAgence?.nom_agence || '-'}</span>
                      <small>{agent.agentAgence?.ville || ''}</small>
                    </div>
                  </td>
                  <td>
                    <div className="affectation-info">
                      <Briefcase size={14} />
                      <span>{agent.agentAffectation?.libelle_affectation || '-'}</span>
                      {agent.estChauffeur && (
                        <span className="chauffeur-badge">Chauffeur</span>
                      )}
                    </div>
                  </td>
                  <td>{getStatutBadge(agent.statut)}</td>
                  <td>
                    {agent.estEnInaptitude ? (
                      <span className="inaptitude-badge danger">
                        <AlertCircle size={12} />
                        {agent.joursRestantsInaptitude} jours
                      </span>
                    ) : (
                      <span className="inaptitude-badge safe">
                        <CheckCircle size={12} />
                        Non inapte
                      </span>
                    )}
                  </td>
                  <td>
                    {agent.date_prochaine_visite ? (
                      <div className="next-visite">
                        <Calendar size={12} />
                        {new Date(agent.date_prochaine_visite).toLocaleDateString('fr-FR')}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>
                    <button
                      className="btn-view"
                      onClick={() => handleViewAgent(agent)}
                      title="Voir détails"
                    >
                      <Eye size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={pagination.page === 1}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
          >
            Précédent
          </button>
          <span className="page-info">
            Page {pagination.page} / {pagination.pages}
          </span>
          <button
            className="page-btn"
            disabled={pagination.page === pagination.pages}
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
          >
            Suivant
          </button>
        </div>
      )}

      {/* Modal détails agent */}
      {showDetailsModal && selectedAgent && (
        <AgentDetailsModal
          agent={selectedAgent}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
    </div>
  );
};

export default AgentsList;