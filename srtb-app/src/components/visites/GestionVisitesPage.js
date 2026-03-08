// frontend/components/visites/GestionVisitesPage.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Users, Calendar, Clock, User, FileText, CheckCircle, XCircle,
  AlertCircle, Info, Plus, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Search, Filter, Eye, Edit,
  Trash2, Save, X, Award, AlertTriangle, MapPin
} from 'lucide-react';
import '../../styles/GestionVisitesPage.css';

const GestionVisitesPage = () => {
  const [loading, setLoading] = useState(true);
  const [visites, setVisites] = useState([]);
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    parType: [],
    parResultat: [],
    planningSemaine: 0,
    parMois: Array(12).fill(0)
  });
  const [notification, setNotification] = useState({ show: false, type: 'info', title: '', message: '' });

  // ========== ÉTATS POUR LE FORMULAIRE ==========
  const [showForm, setShowForm] = useState(false);
  const [selectedVisite, setSelectedVisite] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    matricule_agent: '',
    date_visite: '',
    heure_visite: '',
    type_visite: 'Périodique',
    medecin: '',
    observation: '',
    resultat: 'Apte',
    id_planning: null
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ========== ÉTATS POUR LES FILTRES ==========
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    resultat: 'all',
    dateDebut: '',
    dateFin: '',
    agent: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  // ========== PAGINATION ==========
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // ========== CHARGEMENT DES DONNÉES ==========
  useEffect(() => {
    chargerDonnees();
  }, []);

  // Appliquer les filtres
  useEffect(() => {
    if (visites.length > 0) {
      // Les filtres sont appliqués côté serveur via fetchVisites
      // On recharge juste quand les filtres changent
      fetchVisites();
    }
  }, [filters]);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAgents(),
        fetchVisites(),
        fetchStats()
      ]);
    } catch (error) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/agents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setAgents(data.agents);
    } catch (err) {
      console.error('Erreur chargement agents:', err);
    }
  };

  const fetchVisites = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = 'http://localhost:5000/api/visites?limit=1000';

      if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
      if (filters.type !== 'all') url += `&type=${encodeURIComponent(filters.type)}`;
      if (filters.resultat !== 'all') url += `&resultat=${encodeURIComponent(filters.resultat)}`;
      if (filters.dateDebut && filters.dateFin) {
        url += `&dateDebut=${filters.dateDebut}&dateFin=${filters.dateFin}`;
      }
      if (filters.agent !== 'all') url += `&agentId=${filters.agent}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setVisites(data.visites || []);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Erreur chargement visites:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/visites/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        console.log('Stats reçues:', data.stats);
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  };

  // ========== ENREGISTRER / MODIFIER UNE VISITE ==========
  const validateForm = () => {
    const errors = {};
    if (!formData.matricule_agent) errors.matricule_agent = 'Agent requis';
    if (!formData.date_visite) errors.date_visite = 'Date requise';
    if (!formData.medecin) errors.medecin = 'Médecin requis';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Champs obligatoires manquants' });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = editMode && selectedVisite
        ? `http://localhost:5000/api/visites/${selectedVisite.matricule_visite}`
        : 'http://localhost:5000/api/visites';
      const method = editMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        showNotification({
          type: 'success',
          title: editMode ? '✅ Modifiée' : '✅ Ajoutée',
          message: editMode ? 'Visite modifiée avec succès' : 'Visite ajoutée avec succès'
        });
        setShowForm(false);
        resetForm();
        fetchVisites();
        fetchStats();
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
    }
  };

  // ========== SUPPRIMER UNE VISITE ==========
  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette visite ?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/visites/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        showNotification({
          type: 'success',
          title: '✅ Supprimée',
          message: 'Visite supprimée avec succès'
        });
        fetchVisites();
        fetchStats();
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de la suppression' });
    }
  };

  // ========== ÉDITER UNE VISITE ==========
  const handleEdit = (visite) => {
    setSelectedVisite(visite);
    setEditMode(true);
    setFormData({
      matricule_agent: visite.matricule_agent,
      date_visite: visite.date_visite,
      heure_visite: visite.heure_visite || '',
      type_visite: visite.type_visite || 'Périodique',
      medecin: visite.medecin || '',
      observation: visite.observation || '',
      resultat: visite.resultat || 'Apte',
      id_planning: visite.id_planning
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      matricule_agent: '',
      date_visite: '',
      heure_visite: '',
      type_visite: 'Périodique',
      medecin: '',
      observation: '',
      resultat: 'Apte',
      id_planning: null
    });
    setFormErrors({});
    setSelectedVisite(null);
    setEditMode(false);
  };

  // ========== UTILITAIRES ==========
  const showNotification = ({ type, title, message }) => {
    setNotification({ show: true, type, title, message });
    setTimeout(() => setNotification({ show: false, type: '', title: '', message: '' }), 5000);
  };

  const getAgentNom = (matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    return agent ? `${agent.nom} ${agent.prenom}` : 'Inconnu';
  };

  const getResultatClass = (resultat) => {
    switch(resultat) {
      case 'Apte': return 'apte';
      case 'Apte avec réserves': return 'reserves';
      case 'Inapte temporaire': return 'temporaire';
      case 'Inapte définitif': return 'definitif';
      default: return '';
    }
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
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatDateTime = (date, time) => {
    if (!date) return '';
    const d = new Date(date);
    if (time) {
      const [hours, minutes] = time.split(':');
      d.setHours(hours, minutes);
    }
    return d.toLocaleString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // ========== PAGINATION ==========
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVisites = visites.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(visites.length / itemsPerPage);

  // ========== RENDU ==========
  return (
    <div className="gestion-visites-page">

      {/* NOTIFICATION */}
      {notification.show && (
        <div className={`notification-container ${notification.type}`}>
          <div className="notification-content">
            <div className="notification-icon">
              {notification.type === 'success' && <CheckCircle size={24} />}
              {notification.type === 'error' && <XCircle size={24} />}
              {notification.type === 'warning' && <AlertCircle size={24} />}
              {notification.type === 'info' && <Info size={24} />}
            </div>
            <div className="notification-text">
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
            </div>
            <button className="notification-close" onClick={() => setNotification({...notification, show: false})}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="gestion-header">
        <div className="header-left">
          <div className="header-icon">
            <Heart size={28} />
          </div>
          <div className="header-title">
            <h1>Gestion des visites médicales</h1>
            <p>Enregistrement, historique et statistiques</p>
          </div>
        </div>

        <div className="header-right">
          <div className="header-stats">
            <div className="header-stat-item">
              <FileText size={16} />
              <span><strong>{stats.total || 0}</strong> total</span>
            </div>
          </div>

          <button className="btn-icon" onClick={chargerDonnees} title="Actualiser">
            <RefreshCw size={18} />
          </button>

          <button className="btn-primary" onClick={() => {
            resetForm();
            setShowForm(true);
          }}>
            <Plus size={16} /> Nouvelle visite
          </button>
        </div>
      </div>

      {/* FILTRES */}
      <div className="filters-section">
        <div className="filters-header">
          <button
            className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} /> Filtres avancés
          </button>

          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Rechercher un agent, médecin..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Type de visite</label>
                <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})}>
                  <option value="all">Tous</option>
                  <option value="Périodique">Périodique</option>
                  <option value="Reprise">Reprise</option>
                  <option value="Reclassement">Reclassement</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Résultat</label>
                <select value={filters.resultat} onChange={(e) => setFilters({...filters, resultat: e.target.value})}>
                  <option value="all">Tous</option>
                  <option value="Apte">Apte</option>
                  <option value="Apte avec réserves">Apte avec réserves</option>
                  <option value="Inapte temporaire">Inapte temporaire</option>
                  <option value="Inapte définitif">Inapte définitif</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Date début</label>
                <input
                  type="date"
                  value={filters.dateDebut}
                  onChange={(e) => setFilters({...filters, dateDebut: e.target.value})}
                />
              </div>

              <div className="filter-group">
                <label>Date fin</label>
                <input
                  type="date"
                  value={filters.dateFin}
                  onChange={(e) => setFilters({...filters, dateFin: e.target.value})}
                />
              </div>
            </div>

            <div className="filters-actions">
              <button className="btn-secondary" onClick={() => {
                setFilters({
                  search: '', type: 'all', resultat: 'all', dateDebut: '', dateFin: '', agent: 'all'
                });
                fetchVisites();
              }}>
                Réinitialiser
              </button>
              <button className="btn-primary" onClick={fetchVisites}>
                Appliquer les filtres
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CONTENU PRINCIPAL */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des visites...</p>
        </div>
      ) : (
        <div className="gestion-content">
          
          {/* STATISTIQUES RAPIDES */}
          <div className="stats-mini-grid">
            <div className="stat-mini-card">
              <div className="stat-mini-icon" style={{ background: '#2563eb20', color: '#2563eb' }}>
                <FileText size={20} />
              </div>
              <div className="stat-mini-content">
                <span className="stat-mini-label">Total</span>
                <span className="stat-mini-value">{stats.total || 0}</span>
              </div>
            </div>

            <div className="stat-mini-card">
              <div className="stat-mini-icon" style={{ background: '#10b98120', color: '#10b981' }}>
                <CheckCircle size={20} />
              </div>
              <div className="stat-mini-content">
                <span className="stat-mini-label">Aptes</span>
                <span className="stat-mini-value">
                  {stats.parResultat?.find(r => r.resultat === 'Apte')?.count || 0}
                </span>
              </div>
            </div>

            <div className="stat-mini-card">
              <div className="stat-mini-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
                <AlertCircle size={20} />
              </div>
              <div className="stat-mini-content">
                <span className="stat-mini-label">Réserves</span>
                <span className="stat-mini-value">
                  {stats.parResultat?.find(r => r.resultat === 'Apte avec réserves')?.count || 0}
                </span>
              </div>
            </div>

            <div className="stat-mini-card">
              <div className="stat-mini-icon" style={{ background: '#ef444420', color: '#ef4444' }}>
                <XCircle size={20} />
              </div>
              <div className="stat-mini-content">
                <span className="stat-mini-label">Inaptes</span>
                <span className="stat-mini-value">
                  {(stats.parResultat?.find(r => r.resultat === 'Inapte temporaire')?.count || 0) +
                   (stats.parResultat?.find(r => r.resultat === 'Inapte définitif')?.count || 0)}
                </span>
              </div>
            </div>
          </div>

          {/* TABLEAU DES VISITES */}
          {visites.length === 0 ? (
            <div className="empty-state">
              <Heart size={48} />
              <h3>Aucune visite trouvée</h3>
              <p>Commencez par enregistrer une visite médicale</p>
              <button className="btn-primary" onClick={() => {
                resetForm();
                setShowForm(true);
              }}>
                <Plus size={16} /> Nouvelle visite
              </button>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="visites-table">
                  <thead>
                    <tr>
                      <th>Date & Heure</th>
                      <th>Agent</th>
                      <th>Type</th>
                      <th>Médecin</th>
                      <th>Résultat</th>
                      <th>Observations</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentVisites.map(visite => (
                      <tr key={visite.matricule_visite}>
                        <td>
                          <div className="date-cell">
                            <Calendar size={12} />
                            {formatDateTime(visite.date_visite, visite.heure_visite)}
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
                          <span className="type-badge">{visite.type_visite || 'Périodique'}</span>
                        </td>
                        <td>
                          <div className="medecin-cell">
                            <User size={12} />
                            {visite.medecin || '-'}
                          </div>
                        </td>
                        <td>
                          <span className={`resultat-badge ${getResultatClass(visite.resultat)}`}>
                            {getResultatIcon(visite.resultat)}
                            {visite.resultat || 'Non défini'}
                          </span>
                        </td>
                        <td>
                          <div className="observation-cell" title={visite.observation}>
                            {visite.observation?.substring(0, 30) || '-'}
                            {visite.observation?.length > 30 && '...'}
                          </div>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="action-btn edit"
                              onClick={() => handleEdit(visite)}
                              title="Modifier"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              className="action-btn delete"
                              onClick={() => handleDelete(visite.matricule_visite)}
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* PAGINATION */}
              {visites.length > 0 && (
                <div className="pagination">
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronsLeft size={16} />
                  </button>
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="pagination-info">
                    Page {currentPage} / {totalPages}
                  </span>

                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight size={16} />
                  </button>
                  <button
                    className="pagination-btn"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronsRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MODALE FORMULAIRE */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="header-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  <Heart size={24} />
                </div>
                <h2>{editMode ? 'Modifier la visite' : 'Nouvelle visite médicale'}</h2>
                <button className="modal-close" onClick={() => setShowForm(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>
                        <User size={14} />
                        Agent <span className="required">*</span>
                      </label>
                      <select
                        value={formData.matricule_agent}
                        onChange={(e) => setFormData({...formData, matricule_agent: e.target.value})}
                        className={formErrors.matricule_agent ? 'error' : ''}
                        required
                      >
                        <option value="">Sélectionner un agent</option>
                        {agents.map(agent => (
                          <option key={agent.matricule_agent} value={agent.matricule_agent}>
                            {agent.nom} {agent.prenom} - #{agent.matricule_agent}
                          </option>
                        ))}
                      </select>
                      {formErrors.matricule_agent && (
                        <div className="error-message">{formErrors.matricule_agent}</div>
                      )}
                    </div>

                    <div className="form-group">
                      <label>
                        <Calendar size={14} />
                        Date <span className="required">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.date_visite}
                        onChange={(e) => setFormData({...formData, date_visite: e.target.value})}
                        className={formErrors.date_visite ? 'error' : ''}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <Clock size={14} />
                        Heure
                      </label>
                      <input
                        type="time"
                        value={formData.heure_visite}
                        onChange={(e) => setFormData({...formData, heure_visite: e.target.value})}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <FileText size={14} />
                        Type
                      </label>
                      <select
                        value={formData.type_visite}
                        onChange={(e) => setFormData({...formData, type_visite: e.target.value})}
                      >
                        <option value="Périodique">Périodique</option>
                        <option value="Reprise">Reprise</option>
                        <option value="Reclassement">Reclassement</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>
                        <User size={14} />
                        Médecin <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.medecin}
                        onChange={(e) => setFormData({...formData, medecin: e.target.value})}
                        placeholder="Dr. ..."
                        className={formErrors.medecin ? 'error' : ''}
                        required
                      />
                      {formErrors.medecin && <div className="error-message">{formErrors.medecin}</div>}
                    </div>

                    <div className="form-group">
                      <label>
                        <Award size={14} />
                        Résultat
                      </label>
                      <select
                        value={formData.resultat}
                        onChange={(e) => setFormData({...formData, resultat: e.target.value})}
                      >
                        <option value="Apte">Apte</option>
                        <option value="Apte avec réserves">Apte avec réserves</option>
                        <option value="Inapte temporaire">Inapte temporaire</option>
                        <option value="Inapte définitif">Inapte définitif</option>
                      </select>
                    </div>

                    <div className="form-group full-width">
                      <label>
                        <FileText size={14} />
                        Observations
                      </label>
                      <textarea
                        rows="3"
                        value={formData.observation}
                        onChange={(e) => setFormData({...formData, observation: e.target.value})}
                        placeholder="Observations médicales..."
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? (
                      <><span className="spinner-small"></span> Enregistrement...</>
                    ) : (
                      <><Save size={16} /> {editMode ? 'Modifier' : 'Enregistrer'}</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GestionVisitesPage;