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
  FilePlus,
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
  Zap,
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
  Hash,
  CalendarDays,
  CalendarRange,
  ArrowUp,
  ArrowDown,
  Minus,
  Fingerprint,
  History
} from 'lucide-react';
import AgentSearchInput from './common/AgentSearchInput';
import CnamDeclarationModal from './accidents/CnamDeclarationModal';
import '../styles/SocialAccidents.css';

const API_URL = 'http://localhost:5000';

const SocialAccidents = () => {
  // ========== ÉTATS PRINCIPAUX ==========
  const [sa2_activeView, setSa2_activeView] = useState('list');
  const [sa2_accidents, setSa2_accidents] = useState([]);
  const [sa2_filteredAccidents, setSa2_filteredAccidents] = useState([]);
  const [sa2_selectedAccident, setSa2_selectedAccident] = useState(null);
  const [sa2_loading, setSa2_loading] = useState(true);
  const [sa2_error, setSa2_error] = useState(null);
  const [sa2_agents, setSa2_agents] = useState([]);
  const [sa2_showCnamModal, setSa2_showCnamModal] = useState(false);
  const [sa2_cnamAccidentData, setSa2_cnamAccidentData] = useState(null);
  
  // ========== STATISTIQUES ==========
  const [sa2_stats, setSa2_stats] = useState({
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
  const [sa2_filters, setSa2_filters] = useState({
    search: '',
    statut: 'all',
    gravite: 'all',
    dateAccident: '',
    agent: 'all'
  });
  const [sa2_showFilters, setSa2_showFilters] = useState(false);

  // ========== PAGINATION ==========
  const [sa2_currentPage, setSa2_currentPage] = useState(1);
  const [sa2_itemsPerPage, setSa2_itemsPerPage] = useState(10);

  // ========== FORMULAIRE ==========
  const [sa2_formData, setSa2_formData] = useState({
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

  const [sa2_formErrors, setSa2_formErrors] = useState({});
  const [sa2_saving, setSa2_saving] = useState(false);

  // ========== NOTIFICATIONS ==========
  const [sa2_notification, setSa2_notification] = useState({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });

  // ========== MODALES ==========
  const [sa2_showDeleteModal, setSa2_showDeleteModal] = useState(false);
  const [sa2_accidentToDelete, setSa2_accidentToDelete] = useState(null);
  const [sa2_showDetailsModal, setSa2_showDetailsModal] = useState(false);

  // ========== ÉTATS UI ==========
  const [sa2_viewMode, setSa2_viewMode] = useState('table');
  const [sa2_currentTime, setSa2_currentTime] = useState(new Date());
  const [sa2_greeting, setSa2_greeting] = useState('');

  // ========== INITIALISATION ==========
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setSa2_greeting('Bonjour');
    else if (hour < 18) setSa2_greeting('Bon après-midi');
    else setSa2_greeting('Bonsoir');

    const timer = setInterval(() => setSa2_currentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Chargement initial PARALLÈLE (plus rapide)
  useEffect(() => {
    const init = async () => {
      setSa2_loading(true);
      try {
        await Promise.all([
          sa2_fetchAgents(),
          sa2_fetchAccidents()
        ]);
      } catch (err) {
        console.error('Erreur chargement:', err);
        setSa2_error('Erreur de chargement des données');
      } finally {
        setSa2_loading(false);
      }
    };
    init();
  }, []);

  // ========== FILTRAGE ==========
  useEffect(() => {
    if (!sa2_accidents.length) return;

    let filtered = [...sa2_accidents];

    if (sa2_filters.search) {
      const term = sa2_filters.search.toLowerCase();
      filtered = filtered.filter(a => 
        a.numero_accident?.toLowerCase().includes(term) ||
        a.lieu_accident?.toLowerCase().includes(term) ||
        a.agent?.nom?.toLowerCase().includes(term) ||
        a.agent?.prenom?.toLowerCase().includes(term)
      );
    }

    if (sa2_filters.statut !== 'all') {
      filtered = filtered.filter(a => a.statut === sa2_filters.statut);
    }

    if (sa2_filters.gravite !== 'all') {
      filtered = filtered.filter(a => a.gravite === sa2_filters.gravite);
    }

    if (sa2_filters.agent !== 'all') {
      filtered = filtered.filter(a => a.matricule_agent === parseInt(sa2_filters.agent));
    }

    if (sa2_filters.dateAccident) {
  filtered = filtered.filter(a => a.date_accident === sa2_filters.dateAccident);
}

    setSa2_filteredAccidents(filtered);
    setSa2_currentPage(1);
  }, [sa2_filters, sa2_accidents]);

  // ========== FONCTIONS API ==========
  const sa2_fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSa2_agents(data.agents);
      }
      return data;
    } catch (err) {
      console.error('Erreur chargement agents:', err);
      throw err;
    }
  };

  const sa2_fetchAccidents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/accidents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success && Array.isArray(data.accidents)) {
        const accidentsAvecAgent = data.accidents.map(acc => ({
          ...acc,
          agent: acc.accidentAgent || null
        }));
        
        setSa2_accidents(accidentsAvecAgent);
        setSa2_filteredAccidents(accidentsAvecAgent);
        
        const total = accidentsAvecAgent.length;
        const declares = accidentsAvecAgent.filter(a => a.statut === 'declare').length;
        const brouillons = accidentsAvecAgent.filter(a => a.statut === 'brouillon').length;
        
        const parGravite = {
          faible: accidentsAvecAgent.filter(a => a.gravite === 'Faible').length,
          moyenne: accidentsAvecAgent.filter(a => a.gravite === 'Moyenne').length,
          elevee: accidentsAvecAgent.filter(a => a.gravite === 'Élevée').length,
          critique: accidentsAvecAgent.filter(a => a.gravite === 'Critique').length
        };
        
        const parMois = Array(12).fill(0);
        accidentsAvecAgent.forEach(acc => {
          if (acc.date_accident) {
            const [year, month, day] = acc.date_accident.split('-');
            const mois = parseInt(month) - 1;
            if (!isNaN(mois) && mois >= 0 && mois < 12) {
              parMois[mois]++;
            }
          }
        });
        
        setSa2_stats({ total, declares, brouillons, parGravite, parMois });
      }
      return data;
    } catch (err) {
      console.error('Erreur chargement accidents:', err);
      setSa2_error('Erreur de connexion au serveur');
      throw err;
    }
  };

  // ========== VALIDATION FORMULAIRE ==========
  const sa2_validateForm = () => {
    const errors = {};
    if (!sa2_formData.matricule_agent) errors.matricule_agent = 'Matricule agent requis';
    if (!sa2_formData.date_accident) errors.date_accident = 'Date requise';
    if (!sa2_formData.lieu_accident) errors.lieu_accident = 'Lieu requis';
    if (!sa2_formData.nature_blessures) errors.nature_blessures = 'Nature des blessures requise';
    if (sa2_formData.jour_arret < 0) errors.jour_arret = 'Nombre de jours invalide';
    return errors;
  };

  // ========== CRÉER / MODIFIER UN ACCIDENT ==========
  const sa2_handleSubmit = async (e) => {
    e.preventDefault();
    
    if (sa2_selectedAccident && sa2_selectedAccident.statut === 'declare') {
      sa2_showNotification({ 
        type: 'error', 
        title: '❌ Action impossible', 
        message: 'Un accident déclaré à la CNAM ne peut pas être modifié' 
      });
      return;
    }

    const errors = sa2_validateForm();
    if (Object.keys(errors).length > 0) {
      setSa2_formErrors(errors);
      sa2_showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Veuillez remplir tous les champs obligatoires' 
      });
      return;
    }

    setSa2_saving(true);
    try {
      const token = localStorage.getItem('token');
      const url = sa2_selectedAccident 
        ? `${API_URL}/api/accidents/${sa2_selectedAccident.id_accident}`
        : `${API_URL}/api/accidents`;
      const method = sa2_selectedAccident ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sa2_formData)
      });

      const data = await response.json();
      
      if (response.status === 403) {
        sa2_showNotification({ 
          type: 'error', 
          title: '❌ Action impossible', 
          message: data.message || 'Opération non autorisée' 
        });
      } else if (data.success) {
        sa2_showNotification({
          type: 'success',
          title: '✅ Succès',
          message: sa2_selectedAccident ? 'Accident modifié avec succès' : 'Accident créé avec succès'
        });
        await sa2_fetchAccidents();
        sa2_resetForm();
        setSa2_activeView('list');
      } else {
        sa2_showNotification({ 
          type: 'error', 
          title: '❌ Erreur', 
          message: data.message || 'Erreur lors de l\'enregistrement' 
        });
      }
    } catch (err) {
      console.error('Erreur:', err);
      sa2_showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Erreur de connexion au serveur' 
      });
    } finally {
      setSa2_saving(false);
    }
  };

  // ========== DÉCLARER À LA CNAM ==========
  const sa2_handleDeclarer = async (accident) => {
    console.log('🟢 handleDeclarer appelé avec accident:', accident);
    
    try {
      const token = localStorage.getItem('token');
      console.log('🟢 Token:', token ? 'Présent' : 'Manquant');
      
      const url = `${API_URL}/api/accidents/${accident.id_accident}/cnam-data`;
      console.log('🟢 URL appelée:', url);
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('🟢 Statut réponse:', response.status);
      const data = await response.json();
      console.log('🟢 Données reçues:', data);
    
      if (data.success) {
        console.log('🟢 Données OK, ouverture de la modale');
        console.log('  - Accident:', data.accident);
        console.log('  - Agent:', data.agent);
        
        setSa2_cnamAccidentData({ accident: data.accident, agent: data.agent });
        setSa2_showCnamModal(true);
        console.log('🟢 setShowCnamModal(true) exécuté');
      } else {
        console.log('🔴 Erreur:', data.message);
        sa2_showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      console.error('🔴 Erreur:', err);
      sa2_showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur de connexion: ' + err.message });
    }
  };

  const sa2_confirmCnamDeclaration = async (declarationData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/accidents/${sa2_cnamAccidentData.accident.id_accident}/declarer-cnam`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(declarationData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        sa2_showNotification({ type: 'success', title: '✅ Déclaration CNAM', message: data.message });
        setSa2_showCnamModal(false);
        setSa2_cnamAccidentData(null);
        await sa2_fetchAccidents();
      } else {
        sa2_showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      sa2_showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur de connexion' });
    }
  };

  // ========== SUPPRIMER UN ACCIDENT ==========
  const sa2_handleDelete = async () => {
    if (!sa2_accidentToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/accidents/${sa2_accidentToDelete.id_accident}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        sa2_showNotification({ 
          type: 'success', 
          title: '✅ Succès', 
          message: 'Accident supprimé' 
        });
        await sa2_fetchAccidents();
        setSa2_showDeleteModal(false);
        setSa2_accidentToDelete(null);
      } else {
        sa2_showNotification({ 
          type: 'error', 
          title: '❌ Erreur', 
          message: data.message || 'Erreur inconnue' 
        });
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      sa2_showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Erreur de connexion' 
      });
    }
  };

  // ========== FONCTIONS UTILITAIRES ==========
  const sa2_showNotification = ({ type, title, message }) => {
    setSa2_notification({ show: true, type, title, message });
    setTimeout(() => setSa2_notification({ show: false, type: '', title: '', message: '' }), 5000);
  };

  const sa2_resetForm = () => {
    setSa2_formData({
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
    setSa2_formErrors({});
    setSa2_selectedAccident(null);
  };

  const sa2_editAccident = (accident) => {
    if (accident.statut === 'declare') {
      sa2_showNotification({ 
        type: 'error', 
        title: '❌ Action impossible', 
        message: 'Un accident déclaré à la CNAM ne peut pas être modifié' 
      });
      return;
    }

    console.log('📝 Édition accident:', accident);
    
    const agent = sa2_agents.find(a => a.matricule_agent === accident.matricule_agent);
    
    setSa2_selectedAccident(accident);
    setSa2_formData({
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

    setSa2_activeView('form');
  };

  const sa2_viewDetails = (accident) => {
    setSa2_selectedAccident(accident);
    setSa2_showDetailsModal(true);
  };

  const sa2_confirmDelete = (accident) => {
    if (accident.statut === 'declare') {
      sa2_showNotification({ 
        type: 'error', 
        title: '❌ Action impossible', 
        message: 'Un accident déclaré à la CNAM ne peut pas être supprimé' 
      });
      return;
    }
    setSa2_accidentToDelete(accident);
    setSa2_showDeleteModal(true);
  };

  const sa2_getGraviteColor = (gravite) => {
    switch(gravite) {
      case 'Faible': return '#10b981';
      case 'Moyenne': return '#f59e0b';
      case 'Élevée': return '#f97316';
      case 'Critique': return '#ef4444';
      default: return '#64748b';
    }
  };

  const sa2_formatDate = (dateStr) => {
    if (!dateStr) return 'Non spécifiée';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const sa2_formatDateTime = (dateStr, timeStr) => {
    if (!dateStr) return 'Non spécifiée';
    const [year, month, day] = dateStr.split('-');
    const dateFormatted = `${day}/${month}/${year}`;
    if (timeStr) {
      const heure = timeStr.substring(0, 5);
      return `${dateFormatted} ${heure}`;
    }
    return dateFormatted;
  };

  // Pagination
  const sa2_indexOfLastItem = sa2_currentPage * sa2_itemsPerPage;
  const sa2_indexOfFirstItem = sa2_indexOfLastItem - sa2_itemsPerPage;
  const sa2_currentItems = sa2_filteredAccidents.slice(sa2_indexOfFirstItem, sa2_indexOfLastItem);
  const sa2_totalPages = Math.ceil(sa2_filteredAccidents.length / sa2_itemsPerPage);

  // Calcul du top 5 des agents les plus accidentés
  const sa2_getTopAgents = () => {
    if (!sa2_accidents.length) return [];
    
    const agentAccidentCount = {};
    sa2_accidents.forEach(acc => {
      const agentId = acc.matricule_agent;
      const agentName = acc.agent?.nom && acc.agent?.prenom 
        ? `${acc.agent.nom} ${acc.agent.prenom}` 
        : `Agent ${agentId}`;
      
      if (!agentAccidentCount[agentId]) {
        agentAccidentCount[agentId] = {
          id: agentId,
          name: agentName,
          count: 0,
          totalJoursArret: 0
        };
      }
      agentAccidentCount[agentId].count++;
      agentAccidentCount[agentId].totalJoursArret += (acc.jour_arret || 0);
    });
    
    return Object.values(agentAccidentCount)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const sa2_topAgents = sa2_getTopAgents();
  const sa2_maxCount = sa2_topAgents.length > 0 ? Math.max(...sa2_topAgents.map(a => a.count), 1) : 1;

  // ========== RENDU ==========
  return (
    <div className="sa2_social-accidents">
      
      {/* NOTIFICATION */}
      {sa2_notification.show && (
        <div className={`sa2_notification-container ${sa2_notification.type}`}>
          <div className="sa2_notification-content">
            <div className="sa2_notification-icon">
              {sa2_notification.type === 'success' && <CheckCircle size={24} />}
              {sa2_notification.type === 'error' && <XCircle size={24} />}
              {sa2_notification.type === 'warning' && <AlertCircle size={24} />}
              {sa2_notification.type === 'info' && <Info size={24} />}
            </div>
            <div className="sa2_notification-text">
              <h4>{sa2_notification.title}</h4>
              <p>{sa2_notification.message}</p>
            </div>
            <button className="sa2_notification-close" onClick={() => setSa2_notification({...sa2_notification, show: false})}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="sa2_accidents-header">
        <div className="sa2_header-left">
          <div className="sa2_header-icon">
            <AlertTriangle size={28} />
          </div>
          <div className="sa2_header-title">
            <h1>Gestion des accidents</h1>
            <p>
              <span>{sa2_greeting}, Service Social</span>
              <span className="sa2_header-badge">Santé & Sécurité</span>
            </p>
          </div>
        </div>
        
        <div className="sa2_header-right">
          <div className="sa2_header-stats">
            <div className="sa2_header-stat-item">
              <FileText size={16} />
              <span><strong>{sa2_stats.total}</strong> total</span>
            </div>
            <div className="sa2_header-stat-item">
              <CheckCircle size={16} style={{ color: '#10b981' }} />
              <span><strong>{sa2_stats.declares}</strong> déclarés</span>
            </div>
            <div className="sa2_header-stat-item">
              <Clock size={16} style={{ color: '#f59e0b' }} />
              <span><strong>{sa2_stats.brouillons}</strong> brouillons</span>
            </div>
          </div>
          
          <button className="sa2_btn-icon" onClick={sa2_fetchAccidents} title="Actualiser">
            <RefreshCw size={18} />
          </button>
          
          <button className="sa2_btn-primary" onClick={() => {
            sa2_resetForm();
            setSa2_activeView('form');
          }}>
            <Plus size={18} />
            Nouvel accident
          </button>
        </div>
      </div>

      {/* MENU */}
      <div className="sa2_accidents-menu">
        <button 
          className={`sa2_menu-item ${sa2_activeView === 'list' ? 'sa2_active' : ''}`}
          onClick={() => setSa2_activeView('list')}
        >
          <List size={18} />
          <span>Liste des accidents</span>
        </button>
        <button 
          className={`sa2_menu-item ${sa2_activeView === 'stats' ? 'sa2_active' : ''}`}
          onClick={() => setSa2_activeView('stats')}
        >
          <PieChart size={18} />
          <span>Statistiques</span>
        </button>
        <button 
          className={`sa2_menu-item ${sa2_activeView === 'form' ? 'sa2_active' : ''}`}
          onClick={() => {
            sa2_resetForm();
            setSa2_activeView('form');
          }}
        >
          <FilePlus size={18} />
          <span>Nouvelle déclaration</span>
        </button>
      </div>

      {/* CONTENU PRINCIPAL */}
      <div className="sa2_accidents-content">
        
        {/* VUE LISTE */}
        {sa2_activeView === 'list' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* FILTRES */}
            <div className="sa2_filters-section">
              <div className="sa2_filters-header">
                <h3>
                  <Filter size={16} />
                  Filtres
                </h3>
                <button onClick={() => setSa2_showFilters(!sa2_showFilters)}>
                  {sa2_showFilters ? 'Masquer' : 'Afficher'} les filtres
                </button>
              </div>

              {sa2_showFilters && (
  <div className="sa2_filters-grid">
    <div className="sa2_filter-group">
      <label>Recherche</label>
      <input
        type="text"
        placeholder="N° accident, lieu..."
        value={sa2_filters.search}
        onChange={(e) => setSa2_filters({...sa2_filters, search: e.target.value})}
      />
    </div>

    <div className="sa2_filter-group">
      <label>Statut</label>
      <select value={sa2_filters.statut} onChange={(e) => setSa2_filters({...sa2_filters, statut: e.target.value})}>
        <option value="all">Tous</option>
        <option value="brouillon">Brouillon</option>
        <option value="declare">Déclaré</option>
      </select>
    </div>

    <div className="sa2_filter-group">
      <label>Gravité</label>
      <select value={sa2_filters.gravite} onChange={(e) => setSa2_filters({...sa2_filters, gravite: e.target.value})}>
        <option value="all">Toutes</option>
        <option value="Faible">Faible</option>
        <option value="Moyenne">Moyenne</option>
        <option value="Élevée">Élevée</option>
        <option value="Critique">Critique</option>
      </select>
    </div>

    {/* ✅ NOUVEAU FILTRE DATE D'ACCIDENT (un seul champ) */}
    <div className="sa2_filter-group">
      <label>Date d'accident</label>
      <input
        type="date"
        value={sa2_filters.dateAccident}
        onChange={(e) => setSa2_filters({...sa2_filters, dateAccident: e.target.value})}
      />
    </div>

    {/* ✅ FILTRE AGENT AVEC AgentSearchInput (remplace la liste déroulante) */}
    <div className="sa2_filter-group sa2_filter-agent">
      <label>Agent</label>
      <AgentSearchInput
        value={sa2_filters.agent}
        onChange={(matricule) => setSa2_filters({...sa2_filters, agent: matricule || 'all'})}
        onSelect={(agent) => setSa2_filters({...sa2_filters, agent: agent?.matricule_agent || 'all'})}
        placeholder="Rechercher un agent..."
      />
      {sa2_filters.agent && sa2_filters.agent !== 'all' && (
        <button onClick={() => setSa2_filters({...sa2_filters, agent: 'all'})} className="sa2_filter-clear">
          <X size={14} />
        </button>
      )}
    </div>
  </div>
)}

              <div className="sa2_filters-footer">
                <span className="sa2_filter-result">
                  {sa2_filteredAccidents.length} accident(s) trouvé(s)
                </span>
                {Object.values(sa2_filters).some(v => v && v !== 'all' && v !== '') && (
                  <button className="sa2_clear-filters" onClick={() => setSa2_filters({
                    search: '', statut: 'all', gravite: 'all', dateAccident: '', agent: 'all'
                  })}>
                    <FilterX size={14} />
                    Effacer les filtres
                  </button>
                )}
              </div>
            </div>

            {/* VUE TABLEAU / CARTES */}
            {sa2_loading ? (
              <div className="sa2_loading-state">
                <div className="sa2_spinner"></div>
                <p>Chargement des accidents...</p>
              </div>
            ) : sa2_error ? (
              <div className="sa2_error-state">
                <AlertCircle size={48} />
                <h3>Erreur de chargement</h3>
                <p>{sa2_error}</p>
                <button className="sa2_btn-primary" onClick={sa2_fetchAccidents}>
                  <RefreshCw size={16} /> Réessayer
                </button>
              </div>
            ) : sa2_filteredAccidents.length === 0 ? (
              <div className="sa2_empty-state">
                <FileText size={48} />
                <h3>Aucun accident trouvé</h3>
                <p>Commencez par déclarer un nouvel accident</p>
                <button className="sa2_btn-primary" onClick={() => setSa2_activeView('form')}>
                  <Plus size={16} /> Nouvel accident
                </button>
              </div>
            ) : (
              <>
                {/* Contrôles d'affichage */}
                <div className="sa2_view-controls">
                  <div className="sa2_view-toggle">
                    <button 
                      className={`sa2_view-btn ${sa2_viewMode === 'table' ? 'sa2_active' : ''}`}
                      onClick={() => setSa2_viewMode('table')}
                    >
                      <List size={16} />
                    </button>
                    <button 
                      className={`sa2_view-btn ${sa2_viewMode === 'cards' ? 'sa2_active' : ''}`}
                      onClick={() => setSa2_viewMode('cards')}
                    >
                      <Layout size={16} />
                    </button>
                  </div>
                  <select value={sa2_itemsPerPage} onChange={(e) => setSa2_itemsPerPage(parseInt(e.target.value))}>
                    <option value="10">10 par page</option>
                    <option value="25">25 par page</option>
                    <option value="50">50 par page</option>
                    <option value="100">100 par page</option>
                  </select>
                </div>

                {/* VUE TABLEAU */}
                {sa2_viewMode === 'table' && (
                  <div className="sa2_table-container">
                    <table className="sa2_accidents-table">
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
                        {sa2_currentItems.map(accident => (
                          <tr key={accident.id_accident} onClick={() => sa2_viewDetails(accident)}>
                            <td>
                              <span className="sa2_accident-number">
                                {accident.numero_accident || `ACC-${accident.id_accident}`}
                              </span>
                            </td>
                            <td>
                              <div className="sa2_agent-cell">
                                <div className="sa2_agent-avatar">
                                  {accident.agent?.nom?.charAt(0) || '?'}
                                  {accident.agent?.prenom?.charAt(0) || ''}
                                </div>
                                <div className="sa2_agent-info">
                                  <span className="sa2_agent-name">
                                    {accident.agent?.nom} {accident.agent?.prenom}
                                  </span>
                                  <span className="sa2_agent-matricule">
                                    Mat: {accident.matricule_agent}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td>
                              {sa2_formatDateTime(accident.date_accident, accident.heure_accident)}
                            </td>
                            <td>{accident.lieu_accident || '-'}</td>
                            <td>{accident.nature_blessures || '-'}</td>
                            <td>
                              <span className={`sa2_gravite-badge ${accident.gravite?.toLowerCase()}`}>
                                <span className="sa2_gravite-dot"></span>
                                {accident.gravite || 'Non définie'}
                              </span>
                            </td>
                            <td>
                              <span className="sa2_jours-arret">
                                <Clock size={12} />
                                {accident.jour_arret || 0} j
                              </span>
                            </td>
                            <td>
                              <span className={`sa2_statut-badge ${accident.statut}`}>
                                <span className="sa2_statut-dot"></span>
                                {accident.statut === 'declare' ? 'Déclaré' : 'Brouillon'}
                              </span>
                            </td>
                            <td onClick={(e) => e.stopPropagation()}>
                              <div className="sa2_row-actions">
                                <button className="sa2_action-btn" onClick={() => sa2_viewDetails(accident)} title="Détails">
                                  <Eye size={14} />
                                </button>
                                
                                {accident.statut === 'brouillon' && (
                                  <>
                                    <button className="sa2_action-btn" onClick={() => sa2_editAccident(accident)} title="Modifier">
                                      <Edit size={14} />
                                    </button>
                                    <button className="sa2_card-btn" onClick={(e) => { e.stopPropagation(); sa2_handleDeclarer(accident); }} title="Déclarer">
                                      <Send size={14} />
                                    </button>
                                    <button className="sa2_action-btn sa2_delete" onClick={() => sa2_confirmDelete(accident)} title="Supprimer">
                                      <Trash2 size={14} />
                                    </button>
                                  </>
                                )}
                                
                                {accident.statut === 'declare' && (
                                  <span className="sa2_declare-badge">
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
                {sa2_viewMode === 'cards' && (
                  <div className="sa2_cards-grid">
                    {sa2_currentItems.map(accident => (
                      <div key={accident.id_accident} className={`sa2_accident-card ${accident.statut}`} onClick={() => sa2_viewDetails(accident)}>
                        <div className="sa2_card-header" style={{ borderLeftColor: sa2_getGraviteColor(accident.gravite) }}>
                          <div className="sa2_card-number">
                            {accident.numero_accident || `ACC-${accident.id_accident}`}
                          </div>
                          <span className={`sa2_card-statut ${accident.statut}`}>
                            {accident.statut === 'declare' ? 'Déclaré' : 'Brouillon'}
                          </span>
                        </div>
                        
                        <div className="sa2_card-agent">
                          <div className="sa2_agent-avatar" style={{ background: `linear-gradient(135deg, ${sa2_getGraviteColor(accident.gravite)}, ${sa2_getGraviteColor(accident.gravite)}dd)` }}>
                            {accident.agent?.nom?.charAt(0) || '?'}
                            {accident.agent?.prenom?.charAt(0) || ''}
                          </div>
                          <div className="sa2_agent-info">
                            <h4>{accident.agent?.nom} {accident.agent?.prenom}</h4>
                            <p>Matricule: {accident.matricule_agent}</p>
                          </div>
                        </div>

                        <div className="sa2_card-details">
                          <div className="sa2_detail-item">
                            <Calendar size={14} />
                            <span>{sa2_formatDate(accident.date_accident)}</span>
                          </div>
                          <div className="sa2_detail-item">
                            <Clock size={14} />
                            <span>{accident.heure_accident || 'Heure non spécifiée'}</span>
                          </div>
                          <div className="sa2_detail-item">
                            <MapPin size={14} />
                            <span>{accident.lieu_accident || 'Lieu non spécifié'}</span>
                          </div>
                          <div className="sa2_detail-item">
                            <Heart size={14} />
                            <span>{accident.nature_blessures || 'Blessures non spécifiées'}</span>
                          </div>
                          <div className="sa2_detail-item">
                            <Clock size={14} />
                            <span>Arrêt: {accident.jour_arret || 0} jours</span>
                          </div>
                        </div>

                        <div className="sa2_card-footer">
                          <span className={`sa2_gravite-badge ${accident.gravite?.toLowerCase()}`}>
                            <span className="sa2_gravite-dot"></span>
                            {accident.gravite || 'Non définie'}
                          </span>
                          <div className="sa2_card-actions">
                            <button className="sa2_card-btn" onClick={(e) => { e.stopPropagation(); sa2_viewDetails(accident); }}>
                              <Eye size={14} />
                            </button>
                            
                            {accident.statut === 'brouillon' && (
                              <button className="sa2_card-btn" onClick={(e) => { e.stopPropagation(); sa2_editAccident(accident); }}>
                                <Edit size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {accident.statut === 'declare' && (
                          <div className="sa2_card-declare-badge">
                            <CheckCircle size={16} /> Déclaré à la CNAM
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* PAGINATION */}
                {sa2_filteredAccidents.length > 0 && (
                  <div className="sa2_pagination">
                    <button 
                      className="sa2_pagination-btn"
                      onClick={() => setSa2_currentPage(1)}
                      disabled={sa2_currentPage === 1}
                    >
                      <ChevronsLeft size={16} />
                    </button>
                    <button 
                      className="sa2_pagination-btn"
                      onClick={() => setSa2_currentPage(prev => Math.max(1, prev - 1))}
                      disabled={sa2_currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <span className="sa2_pagination-info">
                      Page {sa2_currentPage} sur {sa2_totalPages}
                    </span>
                    
                    <button 
                      className="sa2_pagination-btn"
                      onClick={() => setSa2_currentPage(prev => Math.min(sa2_totalPages, prev + 1))}
                      disabled={sa2_currentPage === sa2_totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button 
                      className="sa2_pagination-btn"
                      onClick={() => setSa2_currentPage(sa2_totalPages)}
                      disabled={sa2_currentPage === sa2_totalPages}
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
        {sa2_activeView === 'form' && (
          <motion.div
            className="sa2_accident-form-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="sa2_form-header">
              <div className="sa2_form-header-icon">
                {sa2_selectedAccident ? <Edit size={20} /> : <FilePlus size={20} />}
              </div>
              <h2>{sa2_selectedAccident ? 'Modifier l\'accident' : 'Nouvelle déclaration d\'accident'}</h2>
              <button className="sa2_btn-secondary" onClick={() => setSa2_activeView('list')}>
                <X size={16} /> Annuler
              </button>
            </div>

            <form onSubmit={sa2_handleSubmit}>
              <div className="sa2_form-sections">
                
                {/* Agent concerné */}
                <div className="sa2_form-section">
                  <h3>
                    <User size={16} />
                    Agent concerné
                  </h3>
                  <div className="sa2_form-grid">
                    <div className="sa2_form-group sa2_full-width">
                      <label>
                        <User size={14} />
                        Agent <span className="sa2_required">*</span>
                      </label>
                      {sa2_selectedAccident ? (
                        <div className="sa2_agent-display">
                          <div className="sa2_agent-display-info">
                            <strong>{sa2_agents.find(a => a.matricule_agent === sa2_formData.matricule_agent)?.nom} {sa2_agents.find(a => a.matricule_agent === sa2_formData.matricule_agent)?.prenom}</strong>
                            <span className="sa2_agent-matricule">#{sa2_formData.matricule_agent}</span>
                          </div>
                          <input type="hidden" name="matricule_agent" value={sa2_formData.matricule_agent} />
                        </div>
                      ) : (
                        <AgentSearchInput
                          value={sa2_formData.matricule_agent}
                          onChange={(matricule) => setSa2_formData({...sa2_formData, matricule_agent: matricule})}
                          onSelect={(agent) => console.log('Agent sélectionné:', agent)}
                          placeholder="Tapez le nom, prénom ou matricule..."
                        />
                      )}
                      {sa2_formErrors.matricule_agent && (
                        <div className="sa2_error-message">{sa2_formErrors.matricule_agent}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Circonstances */}
                <div className="sa2_form-section">
                  <h3>
                    <Calendar size={16} />
                    Circonstances de l'accident
                  </h3>
                  <div className="sa2_form-grid">
                    <div className="sa2_form-group">
                      <label>
                        <Calendar size={14} />
                        Date <span className="sa2_required">*</span>
                      </label>
                      <input
                        type="date"
                        value={sa2_formData.date_accident}
                        onChange={(e) => setSa2_formData({...sa2_formData, date_accident: e.target.value})}
                        className={sa2_formErrors.date_accident ? 'sa2_error' : ''}
                      />
                    </div>

                    <div className="sa2_form-group">
                      <label>
                        <Clock size={14} />
                        Heure
                      </label>
                      <input
                        type="time"
                        value={sa2_formData.heure_accident}
                        onChange={(e) => setSa2_formData({...sa2_formData, heure_accident: e.target.value})}
                      />
                    </div>

                    <div className="sa2_form-group sa2_full-width">
                      <label>
                        <MapPin size={14} />
                        Lieu <span className="sa2_required">*</span>
                      </label>
                      <input
                        type="text"
                        value={sa2_formData.lieu_accident}
                        onChange={(e) => setSa2_formData({...sa2_formData, lieu_accident: e.target.value})}
                        placeholder="Ex: Atelier principal, Ligne de production..."
                        className={sa2_formErrors.lieu_accident ? 'sa2_error' : ''}
                      />
                    </div>

                    <div className="sa2_form-group sa2_full-width">
                      <label>
                        <Info size={14} />
                        Conditions de l'accident
                      </label>
                      <textarea
                        value={sa2_formData.condition_accident}
                        onChange={(e) => setSa2_formData({...sa2_formData, condition_accident: e.target.value})}
                        placeholder="Décrivez les conditions dans lesquelles l'accident s'est produit..."
                      />
                    </div>

                    <div className="sa2_form-group sa2_full-width">
                      <label>
                        <AlertCircle size={14} />
                        Mode de survenue
                      </label>
                      <input
                        type="text"
                        value={sa2_formData.mode_survenue}
                        onChange={(e) => setSa2_formData({...sa2_formData, mode_survenue: e.target.value})}
                        placeholder="Ex: Chute de plain-pied, Coincement, Heurt..."
                      />
                    </div>
                  </div>
                </div>

                {/* Blessures */}
                <div className="sa2_form-section">
                  <h3>
                    <Heart size={16} />
                    Blessures et conséquences
                  </h3>
                  <div className="sa2_form-grid">
                    <div className="sa2_form-group">
                      <label>
                        <Activity size={14} />
                        Endroit des blessures
                      </label>
                      <input
                        type="text"
                        value={sa2_formData.endroit_blessures}
                        onChange={(e) => setSa2_formData({...sa2_formData, endroit_blessures: e.target.value})}
                        placeholder="Ex: Main droite, Jambe gauche..."
                      />
                    </div>

                    <div className="sa2_form-group">
                      <label>
                        <AlertTriangle size={14} />
                        Nature des blessures <span className="sa2_required">*</span>
                      </label>
                      <input
                        type="text"
                        value={sa2_formData.nature_blessures}
                        onChange={(e) => setSa2_formData({...sa2_formData, nature_blessures: e.target.value})}
                        placeholder="Ex: Fracture, Entorse, Coupure..."
                        className={sa2_formErrors.nature_blessures ? 'sa2_error' : ''}
                      />
                    </div>

                    <div className="sa2_form-group sa2_full-width">
                      <label>
                        <Zap size={14} />
                        Facteurs matériels
                      </label>
                      <textarea
                        value={sa2_formData.facteurs_materiels}
                        onChange={(e) => setSa2_formData({...sa2_formData, facteurs_materiels: e.target.value})}
                        placeholder="Équipements, machines, outils impliqués..."
                      />
                    </div>

                    <div className="sa2_form-group">
                      <label>
                        <Clock size={14} />
                        Jours d'arrêt
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={sa2_formData.jour_arret}
                        onChange={(e) => setSa2_formData({...sa2_formData, jour_arret: parseInt(e.target.value) || 0})}
                      />
                    </div>

                    <div className="sa2_form-group">
                      <label>
                        <AlertTriangle size={14} />
                        Gravité
                      </label>
                      <select
                        value={sa2_formData.gravite}
                        onChange={(e) => setSa2_formData({...sa2_formData, gravite: e.target.value})}
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
                <div className="sa2_form-section">
                  <h3>
                    <Users size={16} />
                    Témoins
                  </h3>
                  <div className="sa2_form-grid">
                    <div className="sa2_form-group">
                      <label>
                        <User size={14} />
                        Témoin 1
                      </label>
                      <input
                        type="text"
                        value={sa2_formData.temoin1}
                        onChange={(e) => setSa2_formData({...sa2_formData, temoin1: e.target.value})}
                        placeholder="Nom du témoin"
                      />
                    </div>

                    <div className="sa2_form-group">
                      <label>
                        <User size={14} />
                        Témoin 2
                      </label>
                      <input
                        type="text"
                        value={sa2_formData.temoin2}
                        onChange={(e) => setSa2_formData({...sa2_formData, temoin2: e.target.value})}
                        placeholder="Nom du témoin"
                      />
                    </div>
                  </div>
                </div>

                {/* PV et responsabilité */}
                <div className="sa2_form-section">
                  <h3>
                    <FileText size={16} />
                    Procès-verbal et responsabilité
                  </h3>
                  <div className="sa2_form-grid">
                    <div className="sa2_form-group">
                      <div className="sa2_checkbox-group">
                        <input
                          type="checkbox"
                          id="sa2_pv_existe"
                          checked={sa2_formData.pv_existe}
                          onChange={(e) => setSa2_formData({...sa2_formData, pv_existe: e.target.checked})}
                        />
                        <label htmlFor="sa2_pv_existe">Procès-verbal existe</label>
                      </div>
                    </div>

                    {sa2_formData.pv_existe && (
                      <>
                        <div className="sa2_form-group">
                          <label>Numéro PV</label>
                          <input
                            type="text"
                            value={sa2_formData.numero_pv}
                            onChange={(e) => setSa2_formData({...sa2_formData, numero_pv: e.target.value})}
                          />
                        </div>
                        <div className="sa2_form-group">
                          <label>Date PV</label>
                          <input
                            type="date"
                            value={sa2_formData.date_pv}
                            onChange={(e) => setSa2_formData({...sa2_formData, date_pv: e.target.value})}
                          />
                        </div>
                      </>
                    )}

                    <div className="sa2_form-group">
                      <div className="sa2_checkbox-group">
                        <input
                          type="checkbox"
                          id="sa2_tiers_responsable"
                          checked={sa2_formData.tiers_responsable}
                          onChange={(e) => setSa2_formData({...sa2_formData, tiers_responsable: e.target.checked})}
                        />
                        <label htmlFor="sa2_tiers_responsable">Tiers responsable</label>
                      </div>
                    </div>

                    {sa2_formData.tiers_responsable && (
                      <div className="sa2_form-group">
                        <label>Nom du tiers</label>
                        <input
                          type="text"
                          value={sa2_formData.nom_tiers}
                          onChange={(e) => setSa2_formData({...sa2_formData, nom_tiers: e.target.value})}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Boutons d'action */}
                <div className="sa2_form-actions">
                  <button type="button" className="sa2_btn-secondary" onClick={() => setSa2_activeView('list')}>
                    <X size={16} /> Annuler
                  </button>
                  <button type="button" className="sa2_btn-secondary" onClick={(event) => {
                    setSa2_formData({...sa2_formData, statut: 'brouillon'});
                    sa2_handleSubmit(event);
                  }} disabled={sa2_saving}>
                    <Save size={16} /> Enregistrer comme brouillon
                  </button>
                  <button type="submit" className="sa2_btn-primary" disabled={sa2_saving}>
                    {sa2_saving ? (
                      <>
                        <span className="sa2_spinner-small"></span>
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <Send size={16} /> {sa2_selectedAccident ? 'Modifier' : 'Déclarer'} l'accident
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}

        {/* ========== VUE STATISTIQUES ========== */}
        {sa2_activeView === 'stats' && (
          <motion.div
            className="sa2_stats-dashboard-premium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="sa2_stats-premium-header">
              <div className="sa2_stats-title-section">
                <h2>Statistiques des accidents</h2>
                <p className="sa2_stats-subtitle">Vue d'ensemble complète</p>
              </div>
            </div>

            {sa2_loading ? (
              <div className="sa2_stats-loading">
                <div className="sa2_spinner"></div>
                <p>Chargement des statistiques...</p>
              </div>
            ) : (
              <>
                {/* 4 KPI CARDS */}
                <div className="sa2_kpi-premium-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                  {/* Carte 1: Déclarés CNAM */}
                  <div className="sa2_kpi-premium-card sa2_green">
                    <div className="sa2_kpi-premium-icon">
                      <CheckCircle size={24} />
                    </div>
                    <div className="sa2_kpi-premium-content">
                      <span className="sa2_kpi-premium-label">Déclarés CNAM</span>
                      <span className="sa2_kpi-premium-value">{sa2_stats.declares}</span>
                    </div>
                  </div>

                  {/* Carte 2: Brouillons */}
                  <div className="sa2_kpi-premium-card sa2_orange">
                    <div className="sa2_kpi-premium-icon">
                      <Clock size={24} />
                    </div>
                    <div className="sa2_kpi-premium-content">
                      <span className="sa2_kpi-premium-label">Brouillons</span>
                      <span className="sa2_kpi-premium-value">{sa2_stats.brouillons}</span>
                    </div>
                  </div>

                  {/* Carte 3: Total jours d'arrêt */}
                  <div className="sa2_kpi-premium-card sa2_blue">
                    <div className="sa2_kpi-premium-icon">
                      <CalendarDays size={24} />
                    </div>
                    <div className="sa2_kpi-premium-content">
                      <span className="sa2_kpi-premium-label">Total jours d'arrêt</span>
                      <span className="sa2_kpi-premium-value">
                        {sa2_accidents.reduce((sum, a) => sum + (a.jour_arret || 0), 0)}
                      </span>
                    </div>
                  </div>

                  {/* Carte 4: Taux déclaration */}
                  <div className="sa2_kpi-premium-card sa2_purple">
                    <div className="sa2_kpi-premium-icon">
                      <PieChart size={24} />
                    </div>
                    <div className="sa2_kpi-premium-content">
                      <span className="sa2_kpi-premium-label">Taux déclaration</span>
                      <span className="sa2_kpi-premium-value">
                        {sa2_stats.total > 0 ? Math.round((sa2_stats.declares / sa2_stats.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* GRAPHIQUES */}
                <div className="sa2_charts-premium-grid">
                  {/* Graphique 1: Répartition par gravité */}
                  <div className="sa2_chart-premium-card">
                    <div className="sa2_chart-premium-header">
                      <h3>Répartition par gravité</h3>
                      <span className="sa2_chart-premium-badge">Total: {sa2_stats.total} accidents</span>
                    </div>
                    <div className="sa2_chart-premium-content sa2_donut-container">
                      <div className="sa2_donut-chart">
                        <svg viewBox="0 0 100 100" className="sa2_donut-svg">
                          {sa2_stats.total > 0 ? (
                            <>
                              {(() => {
                                const total = sa2_stats.total;
                                const circumference = 2 * Math.PI * 40;
                                
                                const faiblePercent = sa2_stats.parGravite.faible / total;
                                const moyennePercent = sa2_stats.parGravite.moyenne / total;
                                const eleveePercent = sa2_stats.parGravite.elevee / total;
                                const critiquePercent = sa2_stats.parGravite.critique / total;
                                
                                let faibleOffset = 0;
                                let moyenneOffset = faiblePercent * circumference;
                                let eleveeOffset = moyenneOffset + (moyennePercent * circumference);
                                let critiqueOffset = eleveeOffset + (eleveePercent * circumference);
                                
                                return (
                                  <>
                                    {faiblePercent > 0 && (
                                      <circle
                                        cx="50" cy="50" r="40"
                                        fill="transparent" stroke="#10b981" strokeWidth="15"
                                        strokeDasharray={`${circumference * faiblePercent} ${circumference}`}
                                        strokeDashoffset={-faibleOffset} strokeLinecap="butt"
                                      />
                                    )}
                                    {moyennePercent > 0 && (
                                      <circle
                                        cx="50" cy="50" r="40"
                                        fill="transparent" stroke="#f59e0b" strokeWidth="15"
                                        strokeDasharray={`${circumference * moyennePercent} ${circumference}`}
                                        strokeDashoffset={-moyenneOffset} strokeLinecap="butt"
                                      />
                                    )}
                                    {eleveePercent > 0 && (
                                      <circle
                                        cx="50" cy="50" r="40"
                                        fill="transparent" stroke="#f97316" strokeWidth="15"
                                        strokeDasharray={`${circumference * eleveePercent} ${circumference}`}
                                        strokeDashoffset={-eleveeOffset} strokeLinecap="butt"
                                      />
                                    )}
                                    {critiquePercent > 0 && (
                                      <circle
                                        cx="50" cy="50" r="40"
                                        fill="transparent" stroke="#ef4444" strokeWidth="15"
                                        strokeDasharray={`${circumference * critiquePercent} ${circumference}`}
                                        strokeDashoffset={-critiqueOffset} strokeLinecap="butt"
                                      />
                                    )}
                                  </>
                                );
                              })()}
                            </>
                          ) : (
                            <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e2e8f0" strokeWidth="15"
                              strokeDasharray={`${2 * Math.PI * 40} ${2 * Math.PI * 40}`} strokeDashoffset="0" strokeLinecap="round"
                            />
                          )}
                          <circle cx="50" cy="50" r="25" fill="var(--sa2_bg-card, white)" />
                        </svg>
                        <div className="sa2_donut-center">
                          <span className="sa2_donut-total">{sa2_stats.total}</span>
                          <span className="sa2_donut-label">total</span>
                        </div>
                      </div>
                      
                      <div className="sa2_donut-legend">
                        <div className="sa2_legend-item">
                          <span className="sa2_legend-color sa2_faible"></span>
                          <span className="sa2_legend-label">Faible</span>
                          <span className="sa2_legend-value">{sa2_stats.parGravite.faible}</span>
                        </div>
                        <div className="sa2_legend-item">
                          <span className="sa2_legend-color sa2_moyenne"></span>
                          <span className="sa2_legend-label">Moyenne</span>
                          <span className="sa2_legend-value">{sa2_stats.parGravite.moyenne}</span>
                        </div>
                        <div className="sa2_legend-item">
                          <span className="sa2_legend-color sa2_elevee"></span>
                          <span className="sa2_legend-label">Élevée</span>
                          <span className="sa2_legend-value">{sa2_stats.parGravite.elevee}</span>
                        </div>
                        <div className="sa2_legend-item">
                          <span className="sa2_legend-color sa2_critique"></span>
                          <span className="sa2_legend-label">Critique</span>
                          <span className="sa2_legend-value">{sa2_stats.parGravite.critique}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Graphique 2: Top 5 des agents les plus accidentés */}
                  <div className="sa2_chart-premium-card">
                    <div className="sa2_chart-premium-header">
                      <h3>
                        <Users size={16} />
                        Agents les plus accidentés
                      </h3>
                      <span className="sa2_chart-premium-badge">Top {sa2_topAgents.length}</span>
                    </div>
                    <div className="sa2_chart-premium-content">
                      {sa2_topAgents.length === 0 ? (
                        <div className="sa2_empty-chart">
                          <Users size={48} />
                          <p>Aucun accident enregistré</p>
                        </div>
                      ) : (
                        <div className="sa2_top-agents-list">
                          {sa2_topAgents.map((agent, index) => {
                            const percentage = (agent.count / sa2_maxCount) * 100;
                            const barColor = index === 0 ? '#ef4444' : index === 1 ? '#f97316' : index === 2 ? '#f59e0b' : '#3b82f6';
                            
                            return (
                              <div key={agent.id} className="sa2_agent-rank-item">
                                <div className="sa2_rank-number">
                                  <span className={`sa2_rank-badge sa2_rank-${index + 1}`}>{index + 1}</span>
                                </div>
                                <div className="sa2_agent-rank-info">
                                  <div className="sa2_agent-rank-name">{agent.name}</div>
                                  <div className="sa2_agent-rank-stats">
                                    <span className="sa2_agent-rank-count">
                                      <AlertTriangle size={12} /> {agent.count} accident{agent.count > 1 ? 's' : ''}
                                    </span>
                                    <span className="sa2_agent-rank-days">
                                      <Clock size={12} /> {agent.totalJoursArret} jours d'arrêt
                                    </span>
                                  </div>
                                  <div className="sa2_agent-rank-bar-container">
                                    <div 
                                      className="sa2_agent-rank-bar" 
                                      style={{ 
                                        width: `${percentage}%`,
                                        background: `linear-gradient(90deg, ${barColor}, ${barColor}dd)`
                                      }}
                                    >
                                      <span className="sa2_agent-rank-percentage">{Math.round(percentage)}%</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* MODALE DÉTAILS */}
      {sa2_showDetailsModal && sa2_selectedAccident && (
        <div className="sa2_modal-overlay" onClick={() => setSa2_showDetailsModal(false)}>
          <div className="sa2_modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="sa2_modal-header">
              <div className="sa2_modal-header-icon">
                <FileText size={20} />
              </div>
              <h2>Détails de l'accident</h2>
              <button className="sa2_modal-close" onClick={() => setSa2_showDetailsModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="sa2_modal-body">
              <div className="sa2_accident-details-header">
                <div className="sa2_accident-details-number">
                  {sa2_selectedAccident.numero_accident || `ACC-${sa2_selectedAccident.id_accident}`}
                </div>
                <div className="sa2_accident-details-agent">
                  <div className="sa2_accident-details-agent-avatar" style={{ background: `linear-gradient(135deg, ${sa2_getGraviteColor(sa2_selectedAccident.gravite)}, ${sa2_getGraviteColor(sa2_selectedAccident.gravite)}dd)` }}>
                    {sa2_selectedAccident.agent?.nom?.charAt(0) || '?'}
                    {sa2_selectedAccident.agent?.prenom?.charAt(0) || ''}
                  </div>
                  <div className="sa2_accident-details-agent-info">
                    <h3>{sa2_selectedAccident.agent?.nom} {sa2_selectedAccident.agent?.prenom}</h3>
                    <p>
                      <span>Matricule: {sa2_selectedAccident.matricule_agent}</span>
                      <span className={`sa2_gravite-badge ${sa2_selectedAccident.gravite?.toLowerCase()}`}>
                        <span className="sa2_gravite-dot"></span>
                        {sa2_selectedAccident.gravite || 'Non définie'}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="sa2_accident-details-badges">
                  <span className={`sa2_statut-badge ${sa2_selectedAccident.statut}`}>
                    <span className="sa2_statut-dot"></span>
                    {sa2_selectedAccident.statut === 'declare' ? 'Déclaré CNAM' : 'Brouillon'}
                  </span>
                </div>
              </div>

              <div className="sa2_details-grid">
                <div className="sa2_detail-card">
                  <div className="sa2_detail-icon"><Calendar size={16} /></div>
                  <div className="sa2_detail-content">
                    <div className="sa2_detail-label">Date & Heure</div>
                    <div className="sa2_detail-value">{sa2_formatDateTime(sa2_selectedAccident.date_accident, sa2_selectedAccident.heure_accident)}</div>
                  </div>
                </div>

                <div className="sa2_detail-card">
                  <div className="sa2_detail-icon"><MapPin size={16} /></div>
                  <div className="sa2_detail-content">
                    <div className="sa2_detail-label">Lieu</div>
                    <div className="sa2_detail-value">{sa2_selectedAccident.lieu_accident || 'Non spécifié'}</div>
                  </div>
                </div>

                <div className="sa2_detail-card">
                  <div className="sa2_detail-icon"><Activity size={16} /></div>
                  <div className="sa2_detail-content">
                    <div className="sa2_detail-label">Blessures</div>
                    <div className="sa2_detail-value">{sa2_selectedAccident.nature_blessures || 'Non spécifiées'}</div>
                    {sa2_selectedAccident.endroit_blessures && <div className="sa2_detail-sub">{sa2_selectedAccident.endroit_blessures}</div>}
                  </div>
                </div>

                <div className="sa2_detail-card">
                  <div className="sa2_detail-icon"><Clock size={16} /></div>
                  <div className="sa2_detail-content">
                    <div className="sa2_detail-label">Arrêt de travail</div>
                    <div className="sa2_detail-value">{sa2_selectedAccident.jour_arret || 0} jours</div>
                  </div>
                </div>

                <div className="sa2_detail-card sa2_full-width">
                  <div className="sa2_detail-icon"><Info size={16} /></div>
                  <div className="sa2_detail-content">
                    <div className="sa2_detail-label">Conditions</div>
                    <div className="sa2_detail-value">{sa2_selectedAccident.condition_accident || 'Non spécifiées'}</div>
                  </div>
                </div>

                {sa2_selectedAccident.facteurs_materiels && (
                  <div className="sa2_detail-card sa2_full-width">
                    <div className="sa2_detail-icon"><Zap size={16} /></div>
                    <div className="sa2_detail-content">
                      <div className="sa2_detail-label">Facteurs matériels</div>
                      <div className="sa2_detail-value">{sa2_selectedAccident.facteurs_materiels}</div>
                    </div>
                  </div>
                )}

                <div className="sa2_detail-card">
                  <div className="sa2_detail-icon"><Users size={16} /></div>
                  <div className="sa2_detail-content">
                    <div className="sa2_detail-label">Témoins</div>
                    <div className="sa2_detail-value sa2_witnesses">
                      {sa2_selectedAccident.temoin1 && <span className="sa2_witness-item"><User size={12} /> {sa2_selectedAccident.temoin1}</span>}
                      {sa2_selectedAccident.temoin2 && <span className="sa2_witness-item"><User size={12} /> {sa2_selectedAccident.temoin2}</span>}
                      {!sa2_selectedAccident.temoin1 && !sa2_selectedAccident.temoin2 && <span>Aucun témoin</span>}
                    </div>
                  </div>
                </div>

                <div className="sa2_detail-card">
                  <div className="sa2_detail-icon"><FileText size={16} /></div>
                  <div className="sa2_detail-content">
                    <div className="sa2_detail-label">Procès-verbal</div>
                    <div className="sa2_detail-value">
                      {sa2_selectedAccident.pv_existe ? `PV n°${sa2_selectedAccident.numero_pv} du ${sa2_formatDate(sa2_selectedAccident.date_pv)}` : 'Non'}
                    </div>
                  </div>
                </div>

                {sa2_selectedAccident.tiers_responsable && (
                  <div className="sa2_detail-card">
                    <div className="sa2_detail-icon"><Briefcase size={16} /></div>
                    <div className="sa2_detail-content">
                      <div className="sa2_detail-label">Tiers responsable</div>
                      <div className="sa2_detail-value">{sa2_selectedAccident.nom_tiers || 'Non spécifié'}</div>
                    </div>
                  </div>
                )}

                {sa2_selectedAccident.date_declaration_cnam && sa2_selectedAccident.statut === 'declare' && (
                  <div className="sa2_detail-card">
                    <div className="sa2_detail-icon"><Send size={16} /></div>
                    <div className="sa2_detail-content">
                      <div className="sa2_detail-label">Déclaration CNAM</div>
                      <div className="sa2_detail-value">{sa2_selectedAccident.date_declaration_cnam}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="sa2_modal-footer">
              <button className="sa2_btn-secondary" onClick={() => setSa2_showDetailsModal(false)}>Fermer</button>
              {sa2_selectedAccident.statut === 'brouillon' && (
                <>
                  <button className="sa2_btn-primary" onClick={() => { setSa2_showDetailsModal(false); sa2_editAccident(sa2_selectedAccident); }}>
                    <Edit size={16} /> Modifier
                  </button>
                  <button className="sa2_btn-primary" onClick={() => { setSa2_showDetailsModal(false); sa2_handleDeclarer(sa2_selectedAccident); }}>
                    <Send size={16} /> Déclarer à la CNAM
                  </button>
                </>
              )}
              {sa2_selectedAccident.statut === 'declare' && (
                <div className="sa2_declare-info"><CheckCircle size={16} color="#10b981" /><span>Accident déclaré à la CNAM - Aucune modification possible</span></div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE CNAM */}
      {sa2_showCnamModal && sa2_cnamAccidentData && (
        <CnamDeclarationModal
          accident={sa2_cnamAccidentData.accident}
          agent={sa2_cnamAccidentData.agent}
          onClose={() => {
            setSa2_showCnamModal(false);
            setSa2_cnamAccidentData(null);
          }}
          onConfirm={sa2_confirmCnamDeclaration}
        />
      )}

      {/* MODALE DE CONFIRMATION SUPPRESSION */}
      {sa2_showDeleteModal && sa2_accidentToDelete && (
        <div className="sa2_modal-overlay" onClick={() => setSa2_showDeleteModal(false)}>
          <div className="sa2_modal-content sa2_small" onClick={(e) => e.stopPropagation()}>
            <div className="sa2_modal-header sa2_warning">
              <div className="sa2_modal-header-icon sa2_warning"><AlertTriangle size={24} /></div>
              <h2>Confirmer la suppression</h2>
              <button className="sa2_modal-close" onClick={() => setSa2_showDeleteModal(false)}><X size={18} /></button>
            </div>
            <div className="sa2_modal-body">
              <div className="sa2_delete-confirm-content">
                <p>Êtes-vous sûr de vouloir supprimer cet accident ?</p>
                <div className="sa2_delete-info">
                  <strong>{sa2_accidentToDelete.numero_accident || `ACC-${sa2_accidentToDelete.id_accident}`}</strong>
                  <p>Agent: {sa2_accidentToDelete.agent?.nom} {sa2_accidentToDelete.agent?.prenom}</p>
                  <p>Date: {sa2_formatDate(sa2_accidentToDelete.date_accident)}</p>
                </div>
                <p className="sa2_delete-warning">Cette action est irréversible.</p>
              </div>
            </div>
            <div className="sa2_modal-footer">
              <button className="sa2_btn-secondary" onClick={() => setSa2_showDeleteModal(false)}>Annuler</button>
              <button className="sa2_btn-danger" onClick={sa2_handleDelete}><Trash2 size={16} /> Supprimer</button>
            </div>
          </div>
        </div>
      )}

      {/* Style pour agent-display */}
      <style>{`
        .sa2_agent-display {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px 15px;
        }
        .sa2_agent-display-info {
          display: flex;
          align-items: baseline;
          gap: 10px;
          flex-wrap: wrap;
        }
        .sa2_agent-display-info strong {
          font-size: 15px;
          color: #1e293b;
        }
        .sa2_agent-matricule {
          font-size: 12px;
          color: #64748b;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
};

export default SocialAccidents;