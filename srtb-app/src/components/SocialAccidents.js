import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Heart, 
  Activity,
  X, 
  Eye, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle,
  BarChart3,
  TrendingUp,
  Users,
  Award,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  FileText,
  Camera,
  Upload,
  Info,
  AlertCircle,
  Shield,
  Briefcase,
  Phone,
  Mail,
  MessageCircle,
  Save,
  Send,
  Printer,
  Share2,
  MoreVertical,
  FilterX,
  PieChart,
  Calendar as CalendarIcon,
  UserCheck,
  UserX,
  Crown,
  Wrench,
  FileSignature,
  FileCheck,
  FileWarning,
  FilePlus,      // ← AJOUTEZ CELUI-CI
  FileMinus,
  List,
  Grid,
  Layout,
  Layers,
  Database,
  Server,
  Cpu,
  HardDrive,
  Globe,
  Lock,
  Key,
  Bell,
  BellRing,
  Settings,
  LogOut,
  Home,
  BookOpen,
  Bookmark,
  Star,
  Heart as HeartIcon,
  Award as AwardIcon,
  Zap,           // ← AJOUTEZ CELUI-CI
  Thermometer,
  Wind,
  Droplet,
  Sun,
  Moon,
  Cloud,
  Umbrella,
  Leaf,
  TreePine,
  FlaskRound,
  Beaker,
  Microscope,
  Dna,
  Atom,
  Code,
  Radio,
  Satellite,
  Wifi,
  Cable,
  CircuitBoard,
  Hash
} from 'lucide-react';
import '../styles/SocialAccidents.css';

const SocialAccidents = () => {
  // ========== ÉTATS PRINCIPAUX ==========
  const [activeView, setActiveView] = useState('list');
  const [accidents, setAccidents] = useState([]);
  const [filteredAccidents, setFilteredAccidents] = useState([]);
  const [selectedAccident, setSelectedAccident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agents, setAgents] = useState([]);
  
  // ========== STATISTIQUES ==========
  const [stats, setStats] = useState({
    total: 0,
    declares: 0,
    brouillons: 0,
    parGravite: {
      faible: 0,
      moyenne: 0,
      elevee: 0,
      critique: 0
    },
    parMois: Array(12).fill(0)
  });

  // ========== FILTRES ==========
  const [filters, setFilters] = useState({
    search: '',
    statut: 'all',
    gravite: 'all',
    dateDebut: '',
    dateFin: '',
    agent: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  // ========== PAGINATION ==========
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ========== FORMULAIRE ==========
  const [formData, setFormData] = useState({
    matricule_agent: '',
    date_accident: '',
    heure_accident: '',
    lieu_accident: '',
    condition_accident: '',
    endroit_blessures: '',
    nature_blessures: '',
    facteurs_materiels: '',
    mode_survenue: '',
    temoin1: '',
    temoin2: '',
    pv_existe: false,
    numero_pv: '',
    date_pv: '',
    tiers_responsable: false,
    nom_tiers: '',
    jour_arret: 0,
    gravite: 'Faible',
    statut: 'brouillon'
  });

  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ========== NOTIFICATIONS ==========
  const [notification, setNotification] = useState({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  // ========== MODALES ==========
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accidentToDelete, setAccidentToDelete] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // ========== ÉTATS UI ==========
  const [viewMode, setViewMode] = useState('table');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  // ========== INITIALISATION ==========
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bonjour');
    else if (hour < 18) setGreeting('Bon après-midi');
    else setGreeting('Bonsoir');

    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchAgents();
    fetchAccidents();
    fetchStats();
  }, []);

  // ========== FILTRAGE ==========
  useEffect(() => {
    if (!accidents.length) return;

    let filtered = [...accidents];

    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(a => 
        a.numero_accident?.toLowerCase().includes(term) ||
        a.lieu_accident?.toLowerCase().includes(term) ||
        a.agent?.nom?.toLowerCase().includes(term) ||
        a.agent?.prenom?.toLowerCase().includes(term)
      );
    }

    if (filters.statut !== 'all') {
      filtered = filtered.filter(a => a.statut === filters.statut);
    }

    if (filters.gravite !== 'all') {
      filtered = filtered.filter(a => a.gravite === filters.gravite);
    }

    if (filters.agent !== 'all') {
      filtered = filtered.filter(a => a.matricule_agent === parseInt(filters.agent));
    }

    if (filters.dateDebut && filters.dateFin) {
      filtered = filtered.filter(a => {
        const date = new Date(a.date_accident);
        return date >= new Date(filters.dateDebut) && date <= new Date(filters.dateFin);
      });
    }

    setFilteredAccidents(filtered);
    setCurrentPage(1);
  }, [filters, accidents]);

  // ========== FONCTIONS API ==========
  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/agents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAgents(data.agents);
      }
    } catch (err) {
      console.error('Erreur chargement agents:', err);
    }
  };

  const fetchAccidents = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/accidents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAccidents(data.accidents);
        setFilteredAccidents(data.accidents);
      }
    } catch (err) {
      setError('Erreur de chargement des accidents');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/accidents/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  };

  // ========== VALIDATION FORMULAIRE ==========
  const validateForm = () => {
    const errors = {};
    if (!formData.matricule_agent) errors.matricule_agent = 'Matricule agent requis';
    if (!formData.date_accident) errors.date_accident = 'Date requise';
    if (!formData.lieu_accident) errors.lieu_accident = 'Lieu requis';
    if (!formData.nature_blessures) errors.nature_blessures = 'Nature des blessures requise';
    if (formData.jour_arret < 0) errors.jour_arret = 'Nombre de jours invalide';
    return errors;
  };

  // ========== CRÉER / MODIFIER UN ACCIDENT ==========
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Vérifier si l'accident est déjà déclaré (pour modification)
    if (selectedAccident && selectedAccident.statut === 'declare') {
      showNotification({ 
        type: 'error', 
        title: '❌ Action impossible', 
        message: 'Un accident déclaré à la CNAM ne peut pas être modifié' 
      });
      return;
    }

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Veuillez remplir tous les champs obligatoires' 
      });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const url = selectedAccident 
        ? `http://localhost:5000/api/accidents/${selectedAccident.id_accident}`
        : 'http://localhost:5000/api/accidents';
      const method = selectedAccident ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.status === 403) {
        showNotification({ 
          type: 'error', 
          title: '❌ Action impossible', 
          message: data.message || 'Opération non autorisée' 
        });
      } else if (data.success) {
        showNotification({
          type: 'success',
          title: '✅ Succès',
          message: selectedAccident ? 'Accident modifié avec succès' : 'Accident créé avec succès'
        });
        fetchAccidents();
        fetchStats();
        resetForm();
        setActiveView('list');
      }
    } catch (err) {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Erreur lors de l\'enregistrement' 
      });
    } finally {
      setSaving(false);
    }
  };

  // ========== DÉCLARER À LA CNAM ==========
const handleDeclarer = async (id) => {
  try {
    console.log('🟢 Déclaration CNAM pour ID:', id);
    
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Session expirée' 
      });
      return;
    }

    const response = await fetch(`http://localhost:5000/api/accidents/${id}/statut`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ statut: 'declare' })
    });
    
    console.log('📦 Status:', response.status);
    const data = await response.json();
    console.log('📦 Réponse:', data);
    
    if (response.ok && data.success) {
      showNotification({ 
        type: 'success', 
        title: '✅ Succès', 
        message: 'Accident déclaré à la CNAM' 
      });
      
      await fetchAccidents();
      await fetchStats();
      
      if (showDetailsModal) setShowDetailsModal(false);
    } else {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: data.message || 'Erreur inconnue' 
      });
    }
  } catch (err) {
    console.error('❌ Erreur:', err);
    showNotification({ 
      type: 'error', 
      title: '❌ Erreur', 
      message: 'Erreur de connexion' 
    });
  }
};
  // ========== SUPPRIMER UN ACCIDENT ==========
  const handleDelete = async () => {
  if (!accidentToDelete) return;
  
  console.log('🗑️ Tentative suppression:', accidentToDelete);
  
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000/api/accidents/${accidentToDelete.id_accident}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('📦 Status:', response.status);
    const data = await response.json();
    console.log('📦 Réponse:', data);
    
    if (response.ok) {
      showNotification({ 
        type: 'success', 
        title: '✅ Succès', 
        message: 'Accident supprimé' 
      });
      fetchAccidents();
      setShowDeleteModal(false);
      setAccidentToDelete(null);
    } else {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: data.message || 'Erreur inconnue' 
      });
    }
  } catch (err) {
    console.error('❌ Erreur:', err);
    showNotification({ 
      type: 'error', 
      title: '❌ Erreur', 
      message: 'Erreur de connexion' 
    });
  }
};
  // ========== FONCTIONS UTILITAIRES ==========
  const showNotification = ({ type, title, message }) => {
    setNotification({ show: true, type, title, message });
    setTimeout(() => setNotification({ show: false, type: '', title: '', message: '' }), 5000);
  };

  const resetForm = () => {
    setFormData({
      matricule_agent: '',
      date_accident: '',
      heure_accident: '',
      lieu_accident: '',
      condition_accident: '',
      endroit_blessures: '',
      nature_blessures: '',
      facteurs_materiels: '',
      mode_survenue: '',
      temoin1: '',
      temoin2: '',
      pv_existe: false,
      numero_pv: '',
      date_pv: '',
      tiers_responsable: false,
      nom_tiers: '',
      jour_arret: 0,
      gravite: 'Faible',
      statut: 'brouillon'
    });
    setFormErrors({});
    setSelectedAccident(null);
  };

  const editAccident = (accident) => {
    // Vérifier si l'accident est déjà déclaré
    if (accident.statut === 'declare') {
      showNotification({ 
        type: 'error', 
        title: '❌ Action impossible', 
        message: 'Un accident déclaré à la CNAM ne peut pas être modifié' 
      });
      return;
    }

    setSelectedAccident(accident);
    setFormData({
      matricule_agent: accident.matricule_agent,
      date_accident: accident.date_accident,
      heure_accident: accident.heure_accident || '',
      lieu_accident: accident.lieu_accident || '',
      condition_accident: accident.condition_accident || '',
      endroit_blessures: accident.endroit_blessures || '',
      nature_blessures: accident.nature_blessures || '',
      facteurs_materiels: accident.facteurs_materiels || '',
      mode_survenue: accident.mode_survenue || '',
      temoin1: accident.temoin1 || '',
      temoin2: accident.temoin2 || '',
      pv_existe: accident.pv_existe || false,
      numero_pv: accident.numero_pv || '',
      date_pv: accident.date_pv || '',
      tiers_responsable: accident.tiers_responsable || false,
      nom_tiers: accident.nom_tiers || '',
      jour_arret: accident.jour_arret || 0,
      gravite: accident.gravite || 'Faible',
      statut: accident.statut || 'brouillon'
    });
    setActiveView('form');
  };

  const viewDetails = (accident) => {
    setSelectedAccident(accident);
    setShowDetailsModal(true);
  };

  const confirmDelete = (accident) => {
    if (accident.statut === 'declare') {
      showNotification({ 
        type: 'error', 
        title: '❌ Action impossible', 
        message: 'Un accident déclaré à la CNAM ne peut pas être supprimé' 
      });
      return;
    }
    setAccidentToDelete(accident);
    setShowDeleteModal(true);
  };

  const getGraviteColor = (gravite) => {
    switch(gravite) {
      case 'Faible': return '#10b981';
      case 'Moyenne': return '#f59e0b';
      case 'Élevée': return '#f97316';
      case 'Critique': return '#ef4444';
      default: return '#64748b';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Non spécifiée';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatDateTime = (date, time) => {
    if (!date) return 'Non spécifiée';
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

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredAccidents.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAccidents.length / itemsPerPage);

  // ========== RENDU ==========
  return (
    <div className="social-accidents">
      
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
      <div className="accidents-header">
        <div className="header-left">
          <div className="header-icon">
            <AlertTriangle size={28} />
          </div>
          <div className="header-title">
            <h1>Gestion des accidents</h1>
            <p>
              <span>{greeting}, Service Social</span>
              <span className="header-badge">Santé & Sécurité</span>
            </p>
          </div>
        </div>
        
        <div className="header-right">
          <div className="header-stats">
            <div className="header-stat-item">
              <FileText size={16} />
              <span><strong>{stats.total}</strong> total</span>
            </div>
            <div className="header-stat-item">
              <CheckCircle size={16} style={{ color: '#10b981' }} />
              <span><strong>{stats.declares}</strong> déclarés</span>
            </div>
            <div className="header-stat-item">
              <Clock size={16} style={{ color: '#f59e0b' }} />
              <span><strong>{stats.brouillons}</strong> brouillons</span>
            </div>
          </div>
          
          <button className="btn-icon" onClick={fetchAccidents} title="Actualiser">
            <RefreshCw size={18} />
          </button>
          
          <button className="btn-primary" onClick={() => {
            resetForm();
            setActiveView('form');
          }}>
            <Plus size={18} />
            Nouvel accident
          </button>
        </div>
      </div>

      {/* MENU */}
      <div className="accidents-menu">
        <button 
          className={`menu-item ${activeView === 'list' ? 'active' : ''}`}
          onClick={() => setActiveView('list')}
        >
          <List size={18} />
          <span>Liste des accidents</span>
        </button>
        <button 
          className={`menu-item ${activeView === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveView('stats')}
        >
          <PieChart size={18} />
          <span>Statistiques</span>
        </button>
        <button 
          className={`menu-item ${activeView === 'form' ? 'active' : ''}`}
          onClick={() => {
            resetForm();
            setActiveView('form');
          }}
        >
          <FilePlus size={18} />
          <span>Nouvelle déclaration</span>
        </button>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="accidents-content">
        
        {/* VUE LISTE */}
        {activeView === 'list' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* FILTRES */}
            <div className="filters-section">
              <div className="filters-header">
                <h3>
                  <Filter size={16} />
                  Filtres
                </h3>
                <button onClick={() => setShowFilters(!showFilters)}>
                  {showFilters ? 'Masquer' : 'Afficher'} les filtres
                </button>
              </div>

              {showFilters && (
                <div className="filters-grid">
                  <div className="filter-group">
                    <label>Recherche</label>
                    <input
                      type="text"
                      placeholder="N° accident, lieu, agent..."
                      value={filters.search}
                      onChange={(e) => setFilters({...filters, search: e.target.value})}
                    />
                  </div>

                  <div className="filter-group">
                    <label>Statut</label>
                    <select value={filters.statut} onChange={(e) => setFilters({...filters, statut: e.target.value})}>
                      <option value="all">Tous</option>
                      <option value="brouillon">Brouillon</option>
                      <option value="declare">Déclaré</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Gravité</label>
                    <select value={filters.gravite} onChange={(e) => setFilters({...filters, gravite: e.target.value})}>
                      <option value="all">Toutes</option>
                      <option value="Faible">Faible</option>
                      <option value="Moyenne">Moyenne</option>
                      <option value="Élevée">Élevée</option>
                      <option value="Critique">Critique</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Agent</label>
                    <select value={filters.agent} onChange={(e) => setFilters({...filters, agent: e.target.value})}>
                      <option value="all">Tous les agents</option>
                      {agents.map(agent => (
                        <option key={agent.matricule_agent} value={agent.matricule_agent}>
                          {agent.nom} {agent.prenom}
                        </option>
                      ))}
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
              )}

              <div className="filters-footer">
                <span className="filter-result">
                  {filteredAccidents.length} accident(s) trouvé(s)
                </span>
                {Object.values(filters).some(v => v && v !== 'all' && v !== '') && (
                  <button className="clear-filters" onClick={() => setFilters({
                    search: '', statut: 'all', gravite: 'all', dateDebut: '', dateFin: '', agent: 'all'
                  })}>
                    <FilterX size={14} />
                    Effacer les filtres
                  </button>
                )}
              </div>
            </div>

            {/* VUE TABLEAU / CARTES */}
            {loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Chargement des accidents...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <AlertCircle size={48} />
                <h3>Erreur de chargement</h3>
                <p>{error}</p>
                <button className="btn-primary" onClick={fetchAccidents}>
                  <RefreshCw size={16} /> Réessayer
                </button>
              </div>
            ) : filteredAccidents.length === 0 ? (
              <div className="empty-state">
                <FileText size={48} />
                <h3>Aucun accident trouvé</h3>
                <p>Commencez par déclarer un nouvel accident</p>
                <button className="btn-primary" onClick={() => setActiveView('form')}>
                  <Plus size={16} /> Nouvel accident
                </button>
              </div>
            ) : (
              <>
                {/* Contrôles d'affichage */}
                <div className="view-controls">
                  <div className="view-toggle">
                    <button 
                      className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                      onClick={() => setViewMode('table')}
                    >
                      <List size={16} />
                    </button>
                    <button 
                      className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                      onClick={() => setViewMode('cards')}
                    >
                      <Layout size={16} />
                    </button>
                  </div>
                  <select value={itemsPerPage} onChange={(e) => setItemsPerPage(parseInt(e.target.value))}>
                    <option value="10">10 par page</option>
                    <option value="25">25 par page</option>
                    <option value="50">50 par page</option>
                    <option value="100">100 par page</option>
                  </select>
                </div>

                {/* VUE TABLEAU */}
                {viewMode === 'table' && (
                  <div className="table-container">
                    <table className="accidents-table">
                      <thead>
                        <tr>
                          <th>N° Accident</th>
                          <th>Agent</th>
                          <th>Date & Heure</th>
                          <th>Lieu</th>
                          <th>Blessures</th>
                          <th>Gravité</th>
                          <th>Jours arrêt</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.map(accident => (
                          <tr key={accident.id_accident} onClick={() => viewDetails(accident)}>
                            <td>
                              <span className="accident-number">
                                {accident.numero_accident || `ACC-${accident.id_accident}`}
                              </span>
                            </td>
                            <td>
                              <div className="agent-cell">
                                <div className="agent-avatar">
                                  {accident.agent?.nom?.charAt(0) || '?'}
                                  {accident.agent?.prenom?.charAt(0) || ''}
                                </div>
                                <div className="agent-info">
                                  <span className="agent-name">
                                    {accident.agent?.nom} {accident.agent?.prenom}
                                  </span>
                                  <span className="agent-matricule">
                                    Mat: {accident.matricule_agent}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              {formatDateTime(accident.date_accident, accident.heure_accident)}
                            </td>
                            <td>{accident.lieu_accident || '-'}</td>
                            <td>{accident.nature_blessures || '-'}</td>
                            <td>
                              <span className={`gravite-badge ${accident.gravite?.toLowerCase()}`}>
                                <span className="gravite-dot"></span>
                                {accident.gravite || 'Non définie'}
                              </span>
                            </td>
                            <td>
                              <span className="jours-arret">
                                <Clock size={12} />
                                {accident.jour_arret || 0} j
                              </span>
                            </td>
                            <td>
                              <span className={`statut-badge ${accident.statut}`}>
                                <span className="statut-dot"></span>
                                {accident.statut === 'declare' ? 'Déclaré' : 'Brouillon'}
                              </span>
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="row-actions">
                                <button className="action-btn" onClick={() => viewDetails(accident)} title="Détails">
                                  <Eye size={14} />
                                </button>
                                
                                {accident.statut === 'brouillon' && (
                                  <>
                                    <button className="action-btn" onClick={() => editAccident(accident)} title="Modifier">
                                      <Edit size={14} />
                                    </button>
                                    <button className="action-btn" onClick={() => handleDeclarer(accident.id_accident)} title="Déclarer">
                                      <Send size={14} />
                                    </button>
                                    <button className="action-btn delete" onClick={() => confirmDelete(accident)} title="Supprimer">
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                                
                                {accident.statut === 'declare' && (
                                  <span className="declare-badge">
                                    <CheckCircle size={14} /> Déclaré CNAM
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* VUE CARTES */}
                {viewMode === 'cards' && (
                  <div className="cards-grid">
                    {currentItems.map(accident => (
                      <div key={accident.id_accident} className={`accident-card ${accident.statut}`} onClick={() => viewDetails(accident)}>
                        <div className="card-header" style={{ borderLeftColor: getGraviteColor(accident.gravite) }}>
                          <div className="card-number">
                            {accident.numero_accident || `ACC-${accident.id_accident}`}
                          </div>
                          <span className={`card-statut ${accident.statut}`}>
                            {accident.statut === 'declare' ? 'Déclaré' : 'Brouillon'}
                          </span>
                        </div>
                        
                        <div className="card-agent">
                          <div className="agent-avatar" style={{ background: `linear-gradient(135deg, ${getGraviteColor(accident.gravite)}, ${getGraviteColor(accident.gravite)}dd)` }}>
                            {accident.agent?.nom?.charAt(0) || '?'}
                            {accident.agent?.prenom?.charAt(0) || ''}
                          </div>
                          <div className="agent-info">
                            <h4>{accident.agent?.nom} {accident.agent?.prenom}</h4>
                            <p>Matricule: {accident.matricule_agent}</p>
                          </div>
                        </div>

                        <div className="card-details">
                          <div className="detail-item">
                            <Calendar size={14} />
                            <span>{formatDate(accident.date_accident)}</span>
                          </div>
                          <div className="detail-item">
                            <Clock size={14} />
                            <span>{accident.heure_accident || 'Heure non spécifiée'}</span>
                          </div>
                          <div className="detail-item">
                            <MapPin size={14} />
                            <span>{accident.lieu_accident || 'Lieu non spécifié'}</span>
                          </div>
                          <div className="detail-item">
                            <Heart size={14} />
                            <span>{accident.nature_blessures || 'Blessures non spécifiées'}</span>
                          </div>
                          <div className="detail-item">
                            <Clock size={14} />
                            <span>Arrêt: {accident.jour_arret || 0} jours</span>
                          </div>
                        </div>

                        <div className="card-footer">
                          <span className={`gravite-badge ${accident.gravite?.toLowerCase()}`}>
                            <span className="gravite-dot"></span>
                            {accident.gravite || 'Non définie'}
                          </span>
                          <div className="card-actions">
                            <button className="card-btn" onClick={(e) => { e.stopPropagation(); viewDetails(accident); }}>
                              <Eye size={14} />
                            </button>
                            
                            {accident.statut === 'brouillon' && (
                              <button className="card-btn" onClick={(e) => { e.stopPropagation(); editAccident(accident); }}>
                                <Edit size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {accident.statut === 'declare' && (
                          <div className="card-declare-badge">
                            <CheckCircle size={16} /> Déclaré à la CNAM
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* PAGINATION */}
                {filteredAccidents.length > 0 && (
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
                      Page {currentPage} sur {totalPages}
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
          </motion.div>
        )}

        {/* VUE FORMULAIRE */}
        {activeView === 'form' && (
          <motion.div
            className="accident-form-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="form-header">
              <div className="form-header-icon">
                {selectedAccident ? <Edit size={20} /> : <FilePlus size={20} />}
              </div>
              <h2>{selectedAccident ? 'Modifier l\'accident' : 'Nouvelle déclaration d\'accident'}</h2>
              <button className="btn-secondary" onClick={() => setActiveView('list')}>
                <X size={16} /> Annuler
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-sections">
                
                {/* Agent concerné */}
                <div className="form-section">
                  <h3>
                    <User size={16} />
                    Agent concerné
                  </h3>
                  <div className="form-grid">
                    <div className="form-group full-width">
                      <label>
                        <User size={14} />
                        Matricule de l'agent <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        className={formErrors.matricule_agent ? 'error' : ''}
                        placeholder="Saisir le matricule de l'agent"
                        value={formData.matricule_agent}
                        onChange={(e) => setFormData({...formData, matricule_agent: e.target.value})}
                      />
                      {formErrors.matricule_agent && (
                        <div className="error-message">{formErrors.matricule_agent}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Circonstances */}
                <div className="form-section">
                  <h3>
                    <Calendar size={16} />
                    Circonstances de l'accident
                  </h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>
                        <Calendar size={14} />
                        Date <span className="required">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.date_accident}
                        onChange={(e) => setFormData({...formData, date_accident: e.target.value})}
                        className={formErrors.date_accident ? 'error' : ''}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <Clock size={14} />
                        Heure
                      </label>
                      <input
                        type="time"
                        value={formData.heure_accident}
                        onChange={(e) => setFormData({...formData, heure_accident: e.target.value})}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>
                        <MapPin size={14} />
                        Lieu <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.lieu_accident}
                        onChange={(e) => setFormData({...formData, lieu_accident: e.target.value})}
                        placeholder="Ex: Atelier principal, Ligne de production..."
                        className={formErrors.lieu_accident ? 'error' : ''}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>
                        <Info size={14} />
                        Conditions de l'accident
                      </label>
                      <textarea
                        value={formData.condition_accident}
                        onChange={(e) => setFormData({...formData, condition_accident: e.target.value})}
                        placeholder="Décrivez les conditions dans lesquelles l'accident s'est produit..."
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>
                        <AlertCircle size={14} />
                        Mode de survenue
                      </label>
                      <input
                        type="text"
                        value={formData.mode_survenue}
                        onChange={(e) => setFormData({...formData, mode_survenue: e.target.value})}
                        placeholder="Ex: Chute de plain-pied, Coincement, Heurt..."
                      />
                    </div>
                  </div>
                </div>

                {/* Blessures */}
                <div className="form-section">
                  <h3>
                    <Heart size={16} />
                    Blessures et conséquences
                  </h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>
                        <Activity size={14} />
                        Endroit des blessures
                      </label>
                      <input
                        type="text"
                        value={formData.endroit_blessures}
                        onChange={(e) => setFormData({...formData, endroit_blessures: e.target.value})}
                        placeholder="Ex: Main droite, Jambe gauche..."
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <AlertTriangle size={14} />
                        Nature des blessures <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nature_blessures}
                        onChange={(e) => setFormData({...formData, nature_blessures: e.target.value})}
                        placeholder="Ex: Fracture, Entorse, Coupure..."
                        className={formErrors.nature_blessures ? 'error' : ''}
                      />
                    </div>

                    <div className="form-group full-width">
                      <label>
                        <Zap size={14} />
                        Facteurs matériels
                      </label>
                      <textarea
                        value={formData.facteurs_materiels}
                        onChange={(e) => setFormData({...formData, facteurs_materiels: e.target.value})}
                        placeholder="Équipements, machines, outils impliqués..."
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <Clock size={14} />
                        Jours d'arrêt
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.jour_arret}
                        onChange={(e) => setFormData({...formData, jour_arret: parseInt(e.target.value) || 0})}
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <AlertTriangle size={14} />
                        Gravité
                      </label>
                      <select
                        value={formData.gravite}
                        onChange={(e) => setFormData({...formData, gravite: e.target.value})}
                      >
                        <option value="Faible">Faible</option>
                        <option value="Moyenne">Moyenne</option>
                        <option value="Élevée">Élevée</option>
                        <option value="Critique">Critique</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Témoins */}
                <div className="form-section">
                  <h3>
                    <Users size={16} />
                    Témoins
                  </h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label>
                        <User size={14} />
                        Témoin 1
                      </label>
                      <input
                        type="text"
                        value={formData.temoin1}
                        onChange={(e) => setFormData({...formData, temoin1: e.target.value})}
                        placeholder="Nom du témoin"
                      />
                    </div>

                    <div className="form-group">
                      <label>
                        <User size={14} />
                        Témoin 2
                      </label>
                      <input
                        type="text"
                        value={formData.temoin2}
                        onChange={(e) => setFormData({...formData, temoin2: e.target.value})}
                        placeholder="Nom du témoin"
                      />
                    </div>
                  </div>
                </div>

                {/* PV et responsabilité */}
                <div className="form-section">
                  <h3>
                    <FileText size={16} />
                    Procès-verbal et responsabilité
                  </h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <div className="checkbox-group">
                        <input
                          type="checkbox"
                          id="pv_existe"
                          checked={formData.pv_existe}
                          onChange={(e) => setFormData({...formData, pv_existe: e.target.checked})}
                        />
                        <label htmlFor="pv_existe">Procès-verbal existe</label>
                      </div>
                    </div>

                    {formData.pv_existe && (
                      <>
                        <div className="form-group">
                          <label>Numéro PV</label>
                          <input
                            type="text"
                            value={formData.numero_pv}
                            onChange={(e) => setFormData({...formData, numero_pv: e.target.value})}
                          />
                        </div>
                        <div className="form-group">
                          <label>Date PV</label>
                          <input
                            type="date"
                            value={formData.date_pv}
                            onChange={(e) => setFormData({...formData, date_pv: e.target.value})}
                          />
                        </div>
                      </>
                    )}

                    <div className="form-group">
                      <div className="checkbox-group">
                        <input
                          type="checkbox"
                          id="tiers_responsable"
                          checked={formData.tiers_responsable}
                          onChange={(e) => setFormData({...formData, tiers_responsable: e.target.checked})}
                        />
                        <label htmlFor="tiers_responsable">Tiers responsable</label>
                      </div>
                    </div>

                    {formData.tiers_responsable && (
                      <div className="form-group">
                        <label>Nom du tiers</label>
                        <input
                          type="text"
                          value={formData.nom_tiers}
                          onChange={(e) => setFormData({...formData, nom_tiers: e.target.value})}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="form-actions">
                  <button type="button" className="btn-secondary" onClick={() => setActiveView('list')}>
                    <X size={16} /> Annuler
                  </button>
                  <button type="button" className="btn-secondary" onClick={(event) => {
                    setFormData({...formData, statut: 'brouillon'});
                    handleSubmit(event);
                  }} disabled={saving}>
                    <Save size={16} /> Enregistrer comme brouillon
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? (
                      <>
                        <span className="spinner-small"></span>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> {selectedAccident ? 'Modifier' : 'Déclarer'} l'accident
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}

        {/* VUE STATISTIQUES */}
        {activeView === 'stats' && (
          <motion.div
            className="stats-dashboard"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="stats-overview">
              <div className="stat-large-card" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                <div className="stat-large-icon">
                  <FileText size={24} />
                </div>
                <div className="stat-large-content">
                  <div className="stat-large-label">Total accidents</div>
                  <div className="stat-large-value">{stats.total}</div>
                  <div className="stat-large-footer">depuis le début</div>
                </div>
              </div>

              <div className="stat-large-card" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <div className="stat-large-icon">
                  <CheckCircle size={24} />
                </div>
                <div className="stat-large-content">
                  <div className="stat-large-label">Déclarés CNAM</div>
                  <div className="stat-large-value">{stats.declares}</div>
                  <div className="stat-large-footer">accidents déclarés</div>
                </div>
              </div>

              <div className="stat-large-card" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <div className="stat-large-icon">
                  <Clock size={24} />
                </div>
                <div className="stat-large-content">
                  <div className="stat-large-label">Brouillons</div>
                  <div className="stat-large-value">{stats.brouillons}</div>
                  <div className="stat-large-footer">en attente</div>
                </div>
              </div>

              <div className="stat-large-card" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                <div className="stat-large-icon">
                  <AlertTriangle size={24} />
                </div>
                <div className="stat-large-content">
                  <div className="stat-large-label">Gravité critique</div>
                  <div className="stat-large-value">{stats.parGravite?.critique || 0}</div>
                  <div className="stat-large-footer">accidents graves</div>
                </div>
              </div>
            </div>

            <div className="stats-charts">
              <div className="chart-card">
                <h3>
                  <PieChart size={18} />
                  Répartition par gravité
                </h3>
                <div className="gravite-distribution">
                  <div className="gravite-item">
                    <span className="gravite-label">
                      <span className="gravite-dot" style={{ background: '#10b981' }}></span>
                      Faible
                    </span>
                    <div className="gravite-bar">
                      <div className="gravite-bar-fill faible" style={{ width: `${(stats.parGravite?.faible / stats.total * 100) || 0}%` }}></div>
                    </div>
                    <span className="gravite-count">{stats.parGravite?.faible || 0}</span>
                  </div>
                  <div className="gravite-item">
                    <span className="gravite-label">
                      <span className="gravite-dot" style={{ background: '#f59e0b' }}></span>
                      Moyenne
                    </span>
                    <div className="gravite-bar">
                      <div className="gravite-bar-fill moyenne" style={{ width: `${(stats.parGravite?.moyenne / stats.total * 100) || 0}%` }}></div>
                    </div>
                    <span className="gravite-count">{stats.parGravite?.moyenne || 0}</span>
                  </div>
                  <div className="gravite-item">
                    <span className="gravite-label">
                      <span className="gravite-dot" style={{ background: '#f97316' }}></span>
                      Élevée
                    </span>
                    <div className="gravite-bar">
                      <div className="gravite-bar-fill elevee" style={{ width: `${(stats.parGravite?.elevee / stats.total * 100) || 0}%` }}></div>
                    </div>
                    <span className="gravite-count">{stats.parGravite?.elevee || 0}</span>
                  </div>
                  <div className="gravite-item">
                    <span className="gravite-label">
                      <span className="gravite-dot" style={{ background: '#ef4444' }}></span>
                      Critique
                    </span>
                    <div className="gravite-bar">
                      <div className="gravite-bar-fill critique" style={{ width: `${(stats.parGravite?.critique / stats.total * 100) || 0}%` }}></div>
                    </div>
                    <span className="gravite-count">{stats.parGravite?.critique || 0}</span>
                  </div>
                </div>
              </div>

              <div className="chart-card">
                <h3>
                  <TrendingUp size={18} />
                  Évolution mensuelle
                </h3>
                <div className="bar-chart">
                  {stats.parMois?.map((count, index) => (
                    <div key={index} className="bar-item">
                      <div 
                        className="bar" 
                        style={{ 
                          height: `${(count / Math.max(...stats.parMois, 1)) * 150}px`,
                          background: 'linear-gradient(180deg, #2563eb, #1e40af)'
                        }}
                      ></div>
                      <span className="bar-value">{count}</span>
                      <span className="bar-label">{new Date(2024, index, 1).toLocaleString('fr-FR', { month: 'short' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* MODALE DÉTAILS */}
      {showDetailsModal && selectedAccident && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon">
                <FileText size={20} />
              </div>
              <h2>Détails de l'accident</h2>
              <button className="modal-close" onClick={() => setShowDetailsModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="accident-details-header">
                <div className="accident-details-number">
                  {selectedAccident.numero_accident || `ACC-${selectedAccident.id_accident}`}
                </div>
                <div className="accident-details-agent">
                  <div className="accident-details-agent-avatar" style={{ background: `linear-gradient(135deg, ${getGraviteColor(selectedAccident.gravite)}, ${getGraviteColor(selectedAccident.gravite)}dd)` }}>
                    {selectedAccident.agent?.nom?.charAt(0) || '?'}
                    {selectedAccident.agent?.prenom?.charAt(0) || ''}
                  </div>
                  <div className="accident-details-agent-info">
                    <h3>{selectedAccident.agent?.nom} {selectedAccident.agent?.prenom}</h3>
                    <p>
                      <span>Matricule: {selectedAccident.matricule_agent}</span>
                      <span className={`gravite-badge ${selectedAccident.gravite?.toLowerCase()}`}>
                        <span className="gravite-dot"></span>
                        {selectedAccident.gravite || 'Non définie'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="accident-details-badges">
                  <span className={`statut-badge ${selectedAccident.statut}`}>
                    <span className="statut-dot"></span>
                    {selectedAccident.statut === 'declare' ? 'Déclaré CNAM' : 'Brouillon'}
                  </span>
                </div>
              </div>

              <div className="details-grid">
                <div className="detail-card">
                  <div className="detail-icon">
                    <Calendar size={16} />
                  </div>
                  <div className="detail-content">
                    <div className="detail-label">Date & Heure</div>
                    <div className="detail-value">
                      {formatDateTime(selectedAccident.date_accident, selectedAccident.heure_accident)}
                    </div>
                  </div>
                </div>

                <div className="detail-card">
                  <div className="detail-icon">
                    <MapPin size={16} />
                  </div>
                  <div className="detail-content">
                    <div className="detail-label">Lieu</div>
                    <div className="detail-value">{selectedAccident.lieu_accident || 'Non spécifié'}</div>
                  </div>
                </div>

                <div className="detail-card">
                  <div className="detail-icon">
                    <Activity size={16} />
                  </div>
                  <div className="detail-content">
                    <div className="detail-label">Blessures</div>
                    <div className="detail-value">{selectedAccident.nature_blessures || 'Non spécifiées'}</div>
                    {selectedAccident.endroit_blessures && (
                      <div className="detail-sub">{selectedAccident.endroit_blessures}</div>
                    )}
                  </div>
                </div>

                <div className="detail-card">
                  <div className="detail-icon">
                    <Clock size={16} />
                  </div>
                  <div className="detail-content">
                    <div className="detail-label">Arrêt de travail</div>
                    <div className="detail-value">{selectedAccident.jour_arret || 0} jours</div>
                  </div>
                </div>

                <div className="detail-card full-width">
                  <div className="detail-icon">
                    <Info size={16} />
                  </div>
                  <div className="detail-content">
                    <div className="detail-label">Conditions</div>
                    <div className="detail-value">{selectedAccident.condition_accident || 'Non spécifiées'}</div>
                  </div>
                </div>

                {selectedAccident.facteurs_materiels && (
                  <div className="detail-card full-width">
                    <div className="detail-icon">
                      <Zap size={16} />
                    </div>
                    <div className="detail-content">
                      <div className="detail-label">Facteurs matériels</div>
                      <div className="detail-value">{selectedAccident.facteurs_materiels}</div>
                    </div>
                  </div>
                )}

                <div className="detail-card">
                  <div className="detail-icon">
                    <Users size={16} />
                  </div>
                  <div className="detail-content">
                    <div className="detail-label">Témoins</div>
                    <div className="detail-value witnesses">
                      {selectedAccident.temoin1 && (
                        <span className="witness-item">
                          <User size={12} /> {selectedAccident.temoin1}
                        </span>
                      )}
                      {selectedAccident.temoin2 && (
                        <span className="witness-item">
                          <User size={12} /> {selectedAccident.temoin2}
                        </span>
                      )}
                      {!selectedAccident.temoin1 && !selectedAccident.temoin2 && (
                        <span>Aucun témoin</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="detail-card">
                  <div className="detail-icon">
                    <FileText size={16} />
                  </div>
                  <div className="detail-content">
                    <div className="detail-label">Procès-verbal</div>
                    <div className="detail-value">
                      {selectedAccident.pv_existe ? (
                        <>
                          PV n°{selectedAccident.numero_pv} du {formatDate(selectedAccident.date_pv)}
                        </>
                      ) : 'Non'}
                    </div>
                  </div>
                </div>

                {selectedAccident.tiers_responsable && (
                  <div className="detail-card">
                    <div className="detail-icon">
                      <Briefcase size={16} />
                    </div>
                    <div className="detail-content">
                      <div className="detail-label">Tiers responsable</div>
                      <div className="detail-value">{selectedAccident.nom_tiers || 'Non spécifié'}</div>
                    </div>
                  </div>
                )}

                {selectedAccident.date_declaration_cnam && selectedAccident.statut === 'declare' && (
                  <div className="detail-card">
                    <div className="detail-icon">
                      <Send size={16} />
                    </div>
                    <div className="detail-content">
                      <div className="detail-label">Déclaration CNAM</div>
                      <div className="detail-value">{selectedAccident.date_declaration_cnam}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDetailsModal(false)}>
                Fermer
              </button>
              
              {selectedAccident.statut === 'brouillon' && (
                <>
                  <button className="btn-primary" onClick={() => {
                    setShowDetailsModal(false);
                    editAccident(selectedAccident);
                  }}>
                    <Edit size={16} /> Modifier
                  </button>
                  <button className="btn-primary" onClick={() => {
                    setShowDetailsModal(false);
                    handleDeclarer(selectedAccident.id_accident);
                  }}>
                    <Send size={16} /> Déclarer à la CNAM
                  </button>
                </>
              )}
              
              {selectedAccident.statut === 'declare' && (
                <div className="declare-info">
                  <CheckCircle size={16} color="#10b981" />
                  <span>Accident déclaré à la CNAM - Aucune modification possible</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION SUPPRESSION */}
      {showDeleteModal && accidentToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header warning">
              <div className="modal-header-icon warning">
                <AlertTriangle size={24} />
              </div>
              <h2>Confirmer la suppression</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="delete-confirm-content">
                <p>Êtes-vous sûr de vouloir supprimer cet accident ?</p>
                <div className="delete-info">
                  <strong>{accidentToDelete.numero_accident || `ACC-${accidentToDelete.id_accident}`}</strong>
                  <p>Agent: {accidentToDelete.agent?.nom} {accidentToDelete.agent?.prenom}</p>
                  <p>Date: {formatDate(accidentToDelete.date_accident)}</p>
                </div>
                <p className="delete-warning">Cette action est irréversible.</p>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>
                Annuler
              </button>
              <button className="btn-danger" onClick={handleDelete}>
                <Trash2 size={16} /> Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SocialAccidents;