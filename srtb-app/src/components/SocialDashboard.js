// frontend/components/SocialDashboard.js
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Users, Clock, Calendar, LogOut, Phone, Mail, MessageCircle, 
  Award, Bell, X, CheckCircle, Eye, Trash2, Info, AlertCircle, Key,
  History, ChevronRight, Crown, Wrench, User, EyeOff,
  AlertTriangle, FileText, Plus, BarChart3, Home, Activity, Zap,
  Bell as BellIcon, TrendingUp, Calendar as CalendarIcon, Settings,
  Download, Filter, ChevronDown, Star, Briefcase, Shield, Truck,
  Send, RefreshCw, MapPin, LayoutDashboard, Stethoscope, UserCircle,
  BriefcaseMedical, CalendarDays, ExternalLink, LifeBuoy, Award as AwardIcon,
  Target, TrendingUp as TrendingUpIcon, Users as UsersIcon, FolderOpen,
  Building2, Hospital, Scale, Bone, Brain, Footprints
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SocialAccidents from './SocialAccidents';
import PlanningPage from './visites/PlanningPage';
import GestionVisitesPage from './visites/GestionVisitesPage';
import HistoriqueVisites from './visites/HistoriqueVisites';
import HistoriqueConnexions from './HistoriqueConnexions'; // ⬅️ NOUVEAU COMPOSANT
import NotificationsIntelligentesPage from './NotificationsIntelligentesPage';
import ConvocationsPage from './visites/ConvocationsPage';
import '../styles/SocialDashboard.css';
import NotificationBadge from './NotificationBadge';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const SocialDashboard = () => {
  const navigate = useNavigate();
  
  // ========== ÉTATS ==========
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [visitesSubTab, setVisitesSubTab] = useState('planning');
  
  // ========== STATS ==========
  const [stats, setStats] = useState({
    total_agents: 0,
    chauffeurs: 0,
    visites_mois: 0,
    visites_retard: 0,
    accidents_mois: 0,
    taux_realisation: 0
  });
  
  // ========== PRÉVISIONS ==========
  const [previsions, setPrevisions] = useState(null);
  const [showPrevisions, setShowPrevisions] = useState(false);
  const [previsionsLoading, setPrevisionsLoading] = useState(false);
  
  // ========== STATS AVANCÉES ==========
  const [statsAvancees, setStatsAvancees] = useState(null);
  
  // ========== NOTIFICATIONS MOT DE PASSE ==========
  const [passwordNotifications, setPasswordNotifications] = useState([]);
  const [loadingPasswordNotifs, setLoadingPasswordNotifs] = useState(false);
  const [unreadPasswordCount, setUnreadPasswordCount] = useState(0);
  const [showPasswordDropdown, setShowPasswordDropdown] = useState(false);
  const [selectedPasswordNotif, setSelectedPasswordNotif] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ========== NOTIFICATIONS GÉNÉRALES ==========
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // ========== REFS POUR LES BOUTONS ==========
  const passwordButtonRef = useRef(null);
  const [passwordButtonPosition, setPasswordButtonPosition] = useState({ top: 0, right: 0 });

  // ========== EFFETS ==========
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bonjour');
    else if (hour < 18) setGreeting('Bon après-midi');
    else setGreeting('Bonsoir');
    return () => clearInterval(timer);
  }, []);

  // ========== CHARGEMENT UTILISATEUR ==========
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      navigate('/social');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      
      if (parsedUser.id) {
        fetchPasswordNotifications(parsedUser.id);
        fetchNotifications(parsedUser.id);
      }
      
      chargerDonneesDashboard();
      
    } catch (err) {
      console.error('❌ Erreur:', err);
      navigate('/social');
    }
  }, [navigate]);

  // ========== CHARGER DONNÉES DASHBOARD ==========
  const chargerDonneesDashboard = async () => {
    try {
      await Promise.all([
        chargerStats(),
        chargerPrevisions(),
        chargerStatsAvancees()
      ]);
    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
    }
  };

  // ========== CHARGER STATISTIQUES ==========
  const chargerStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const agentsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const agentsData = await agentsResponse.json();
      
      const visitesResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/visites/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const visitesData = await visitesResponse.json();
      
      const planningResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/13/2026`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const planningData = await planningResponse.json();
      
      const accidentsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/accidents/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const accidentsData = await accidentsResponse.json();
      
      const agents = agentsData.agents || [];
      const planning = planningData.planning || [];
      
      const totalVisites = visitesData.stats?.total || 0;
      const chauffeurs = agents.filter(a => a.code_affectation === 3).length;
      
      const visitesEffectuees = planning.filter(v => v.visite_effectuee === true || v.visite_effectuee === 1).length;
      const visitesRetard = planning.filter(v => !v.visite_effectuee && new Date(v.date_visite) < new Date()).length;
      const tauxRealisation = planning.length > 0 ? Math.round((visitesEffectuees / planning.length) * 100) : 0;
      
      setStats({
        total_agents: agents.length,
        chauffeurs: chauffeurs,
        visites_mois: totalVisites,
        visites_retard: visitesRetard,
        accidents_mois: accidentsData.stats?.total || 0,
        taux_realisation: tauxRealisation
      });
      
    } catch (err) {
      console.error('Erreur stats:', err);
    }
  };

  // ========== CHARGER PRÉVISIONS ==========
  const chargerPrevisions = async () => {
    setPrevisionsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/previsions/previsions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPrevisions(data);
      }
    } catch (err) {
      console.error('Erreur prévisions:', err);
    } finally {
      setPrevisionsLoading(false);
    }
  };

  // ========== CHARGER STATISTIQUES AVANCÉES ==========
  const chargerStatsAvancees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/previsions/stats-avancees`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStatsAvancees(data);
        setStats(prev => ({
          ...prev,
          taux_realisation: data.taux_realisation?.pourcentage || 0
        }));
      }
    } catch (err) {
      console.error('Erreur stats avancées:', err);
    }
  };

  // ========== NOTIFICATIONS GÉNÉRALES ==========
  const fetchNotifications = async (userId) => {
    setLoadingNotifications(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/notifications/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount((data.notifications || []).filter(n => n.status !== 'read').length);
      }
    } catch (err) {
      console.error('Erreur notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      setNotifications(notifications.map(n => n.id === notificationId ? { ...n, status: 'read' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erreur marquage:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!window.confirm('Supprimer cette notification ?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const updated = notifications.filter(n => n.id !== notificationId);
      setNotifications(updated);
      setUnreadCount(updated.filter(n => n.status !== 'read').length);
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  // ========== METTRE À JOUR LA POSITION DU DROPDOWN ==========
  useEffect(() => {
    if (showPasswordDropdown && passwordButtonRef.current) {
      const rect = passwordButtonRef.current.getBoundingClientRect();
      setPasswordButtonPosition({
        top: rect.bottom + window.scrollY + 5,
        right: window.innerWidth - rect.right - window.scrollX
      });
    }
  }, [showPasswordDropdown]);

  // ========== FERMER L'AUTRE DROPDOWN ==========
  const handlePasswordDropdownToggle = () => {
    const event = new CustomEvent('closeOtherDropdown', { detail: 'password' });
    window.dispatchEvent(event);
    setShowPasswordDropdown(!showPasswordDropdown);
  };

  // ========== ÉCOUTER LA FERMETURE DES AUTRES DROPDOWNS ==========
  useEffect(() => {
    const handleCloseOther = (e) => {
      if (e.detail !== 'password') {
        setShowPasswordDropdown(false);
      }
    };
    
    window.addEventListener('closeOtherDropdown', handleCloseOther);
    return () => window.removeEventListener('closeOtherDropdown', handleCloseOther);
  }, []);

  // ========== CHARGER NOTIFICATIONS MOT DE PASSE ==========
  const fetchPasswordNotifications = async (userId) => {
    setLoadingPasswordNotifs(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/notifications/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setPasswordNotifications(data.notifications || []);
        const unread = data.notifications?.filter(n => n.status !== 'lu').length || 0;
        setUnreadPasswordCount(unread);
      }
    } catch (err) {
      console.error('❌ Erreur réseau:', err);
    } finally {
      setLoadingPasswordNotifs(false);
    }
  };

  // ========== MARQUER COMME LUE (MOT DE PASSE) ==========
  const markPasswordAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPasswordNotifications(passwordNotifications.map(n => 
        n.id === notificationId ? { ...n, status: 'lu' } : n
      ));
      setUnreadPasswordCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erreur marquage:', err);
    }
  };

  // ========== SUPPRIMER (MOT DE PASSE) ==========
  const deletePasswordNotification = async (notificationId) => {
    if (!window.confirm('Supprimer cette notification ?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const updated = passwordNotifications.filter(n => n.id !== notificationId);
      setPasswordNotifications(updated);
      setUnreadPasswordCount(updated.filter(n => n.status !== 'lu').length);
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  // ========== OUVRIR NOTIFICATION (MOT DE PASSE) ==========
  const openPasswordNotification = async (notification) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/notifications/${notification.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSelectedPasswordNotif(data.notification);
        setShowPasswordModal(true);
        setShowPassword(false);
        if (notification.status !== 'lu') {
          markPasswordAsRead(notification.id);
        }
      }
    } catch (err) {
      console.error('Erreur ouverture:', err);
    }
  };

  // ========== DÉCONNEXION ==========
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // ========== FORMATER LA DATE ==========
  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.ceil(Math.abs(now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Non renseigné';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // ========== FONCTIONS UTILITAIRES ==========
  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return <Crown size={16} />;
      case 'technicien': return <Wrench size={16} />;
      case 'social': return <Heart size={16} />;
      default: return <User size={16} />;
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return '#2563eb';
      case 'technicien': return '#f59e0b';
      case 'social': return '#3b82f6';
      default: return '#64748b';
    }
  };

  const getRoleLabel = (role) => {
    const labels = { 'admin': 'Administrateur', 'technicien': 'Technicien', 'social': 'Service Social', 'agent': 'Agent' };
    return labels[role] || role;
  };

  // ========== STATISTIQUES CALCULÉES ==========
  const calculatedStats = {
    totalVisites: stats.visites_mois,
    totalAccidents: stats.accidents_mois,
    tauxAptitude: stats.taux_realisation,
    joursSansAccident: stats.visites_retard === 0 ? 30 : 5,
  };

  // ========== ALERTES ==========
  const alerts = (() => {
    const list = [];
    if (stats.visites_retard > 0) {
      list.push({ type: 'danger', icon: '🔴', title: 'Visites en retard', message: `${stats.visites_retard} visite(s) en retard` });
    }
    if (stats.accidents_mois > 3) {
      list.push({ type: 'warning', icon: '⚠️', title: 'Accidents fréquents', message: `${stats.accidents_mois} accidents ce mois` });
    }
    return list;
  })();

  // ========== COMPOSANT PORTAL ==========
  const Portal = ({ children }) => {
    const [container] = useState(() => document.createElement('div'));
    useEffect(() => {
      document.body.appendChild(container);
      return () => document.body.removeChild(container);
    }, [container]);
    return ReactDOM.createPortal(children, container);
  };

  // ========== ONGLETS (AJOUT DE L'ONGLET CONNEXIONS) ==========
  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, color: 'white' },
    { id: 'accidents', label: 'Accidents', icon: AlertCircle, color: '#ef4444' },
    { id: 'visites', label: 'Visites médicales', icon: Stethoscope, color: '#10b981' },
    { id: 'convocations', label: 'Convocations', icon: Send, color: '#f59e0b' },
    { id: 'historique', label: 'Historique', icon: History, color: 'white' },
    { id: 'connexions', label: 'Connexions', icon: LogOut, color: '#06b6d4' },     
    { id: 'alertes', label: 'Alertes', icon: Bell, color: '#ec4899' }
  ];

  // ========== AFFICHAGE CHARGEMENT ==========
  if (previsionsLoading) {
    return (
      <div className="sd-loading-container">
        <div className="sd-loading-spinner"></div>
        <p>Chargement de votre espace...</p>
      </div>
    );
  }

  // ========== RENDU PRINCIPAL ==========
  return (
    <div className="social-dashboard">
      
      {/* HEADER */}
      <header className="sd-header">
        <div className="sd-header-left">
          <div className="sd-logo">
            <Heart size={32} color="#3b82f6" />
            <div>
              <h1>Service Social</h1>
              <p>{greeting}, {user?.email?.split('@')[0] || 'Social'}</p>
            </div>
          </div>
        </div>
        
        <div className="sd-header-right">
          <div className="sd-datetime">
            <Clock size={14} />
            <span>{currentTime.toLocaleTimeString('fr-FR')}</span>
            <Calendar size={14} />
            <span>{currentTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>

          <NotificationBadge />
          
          {/* NOTIFICATIONS GÉNÉRALES */}
          <div className="sd-notifications-wrapper">
            <button className={`sd-notif-btn ${unreadCount > 0 ? 'has-notif' : ''}`} onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={18} />
              {unreadCount > 0 && <span className="sd-notif-badge">{unreadCount}</span>}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div className="sd-notif-dropdown" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="sd-notif-header">
                    <h3>Notifications</h3>
                    <button onClick={() => setShowNotifications(false)}><X size={16} /></button>
                  </div>
                  <div className="sd-notif-list">
                    {loadingNotifications ? <div className="sd-spinner"></div> :
                     notifications.length === 0 ? <div className="sd-notif-empty"><Bell size={32} /><p>Aucune notification</p></div> :
                     notifications.slice(0, 5).map(notif => (
                       <div key={notif.id} className={`sd-notif-item ${notif.status !== 'read' ? 'unread' : ''}`} onClick={() => { setSelectedNotification(notif); setShowNotificationModal(true); if (notif.status !== 'read') markAsRead(notif.id); }}>
                         <div className="sd-notif-icon"><Bell size={14} /></div>
                         <div className="sd-notif-content">
                           <div className="sd-notif-title">{notif.titre || 'Notification'}</div>
                           <div className="sd-notif-msg">{notif.message?.substring(0, 50)}...</div>
                           <div className="sd-notif-time">{formatDate(notif.created_at)}</div>
                         </div>
                         {notif.status !== 'read' && <span className="sd-notif-dot"></span>}
                       </div>
                     ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* NOTIFICATIONS MOT DE PASSE */}
          <div className="sd-password-notifications-wrapper">
            <button 
              ref={passwordButtonRef}
              className={`sd-btn-icon sd-notification-btn ${unreadPasswordCount > 0 ? 'has-notifications' : ''}`}
              onClick={handlePasswordDropdownToggle}
              title="Notifications mot de passe"
            >
              <Key size={18} />
              {unreadPasswordCount > 0 && (
                <span className="sd-notification-badge">{unreadPasswordCount > 9 ? '9+' : unreadPasswordCount}</span>
              )}
            </button>
            
            <AnimatePresence>
              {showPasswordDropdown && (
                <Portal>
                  <>
                    <div className="sd-dropdown-backdrop" onClick={() => setShowPasswordDropdown(false)} />
                    <motion.div 
                      className="sd-notifications-dropdown sd-portal-dropdown"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      style={{
                        position: 'fixed',
                        top: passwordButtonPosition.top,
                        right: passwordButtonPosition.right,
                        zIndex: 999999,
                        minWidth: '320px',
                        maxWidth: '400px'
                      }}
                    >
                      <div className="sd-notifications-header">
                        <h3>Mots de passe ({passwordNotifications.length})</h3>
                        <button onClick={() => setShowPasswordDropdown(false)}><X size={16} /></button>
                      </div>
                      <div className="sd-notifications-list">
                        {loadingPasswordNotifs ? (
                          <div className="sd-notifications-loading"><div className="sd-spinner"></div></div>
                        ) : passwordNotifications.length === 0 ? (
                          <div className="sd-notifications-empty"><Key size={32} /><p>Aucune notification</p></div>
                        ) : (
                          passwordNotifications.slice(0, 5).map(notif => (
                            <div key={notif.id} className={`sd-notification-item ${notif.status === 'lu' ? '' : 'unread'}`} onClick={() => openPasswordNotification(notif)}>
                              <div className="sd-notification-icon"><Key size={16} /></div>
                              <div className="sd-notification-content">
                                <div className="sd-notification-title">Mot de passe modifié</div>
                                <div className="sd-notification-message">{notif.reason?.substring(0, 50)}...</div>
                                <div className="sd-notification-time">{formatDate(notif.created_at)}</div>
                              </div>
                              {notif.status !== 'lu' && <span className="sd-notification-dot"></span>}
                            </div>
                          ))
                        )}
                        {passwordNotifications.length > 5 && (
                          <button className="sd-view-all-btn" onClick={() => setShowPasswordDropdown(false)}>
                            Voir toutes ({passwordNotifications.length})
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </>
                </Portal>
              )}
            </AnimatePresence>
          </div>
          
          <button className="sd-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </header>

      {/* ONGLETS DE NAVIGATION */}
      <nav className="sd-tabs-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`sd-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} style={{ color: activeTab === tab.id ? tab.color : '#6b7280' }} />
            <span>{tab.label}</span>
            {activeTab === tab.id && <motion.div className="sd-tab-indicator" layoutId="tabIndicator" />}
          </button>
        ))}
      </nav>

      {/* CONTENU PRINCIPAL */}
      <main className="sd-main-content">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            
            {/* ========== ONGLET 1 : TABLEAU DE BORD ========== */}
            {activeTab === 'dashboard' && (
              <div className="sd-tab-panel">
                {/* KPI Cards */}
                <div className="sd-kpi-grid">
                  <div className="sd-kpi-card">
                    <div className="sd-kpi-icon" style={{ background: '#e0e7ff', color: 'blue' }}><Users size={20} /></div>
                    <div className="sd-kpi-info">
                      <span className="sd-kpi-label">Agents actifs</span>
                      <span className="sd-kpi-value">{stats.total_agents}</span>
                    </div>
                  </div>
                  <div className="sd-kpi-card">
                    <div className="sd-kpi-icon" style={{ background: '#d1fae5', color: '#10b981' }}><Activity size={20} /></div>
                    <div className="sd-kpi-info">
                      <span className="sd-kpi-label">Visites ce mois</span>
                      <span className="sd-kpi-value">{stats.visites_mois}</span>
                    </div>
                  </div>
                  <div className="sd-kpi-card">
                    <div className="sd-kpi-icon" style={{ background: '#fee2e2', color: '#ef4444' }}><AlertCircle size={20} /></div>
                    <div className="sd-kpi-info">
                      <span className="sd-kpi-label">Accidents</span>
                      <span className="sd-kpi-value">{stats.accidents_mois}</span>
                    </div>
                  </div>
                  <div className="sd-kpi-card">
                    <div className="sd-kpi-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}><Clock size={20} /></div>
                    <div className="sd-kpi-info">
                      <span className="sd-kpi-label">Visites en retard</span>
                      <span className="sd-kpi-value">{stats.visites_retard}</span>
                    </div>
                  </div>
                </div>

                {/* Bandeau prévisions */}
                {previsions && previsions.stats && previsions.stats.total_a_planifier > 0 && (
                  <div className="sd-previsions-banner" onClick={() => setActiveTab('visites')}>
                    <div className="sd-previsions-content">
                      <TrendingUp size={24} />
                      <div>
                        <strong>{previsions.stats.total_a_planifier} agent(s) à programmer</strong>
                        <span>{previsions.stats.urgents > 0 && `⚠️ ${previsions.stats.urgents} urgent(s)`}</span>
                      </div>
                      <ChevronRight size={20} />
                    </div>
                  </div>
                )}

                {/* Alertes */}
                {alerts.length > 0 && (
                  <div className="sd-alerts-section">
                    <h3><AlertTriangle size={16} /> Alertes</h3>
                    {alerts.map((alert, i) => (
                      <div key={i} className={`sd-alert-card ${alert.type}`}>
                        <span className="sd-alert-icon">{alert.icon}</span>
                        <div>
                          <div className="sd-alert-title">{alert.title}</div>
                          <div className="sd-alert-msg">{alert.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions rapides */}
                <div className="sd-quick-actions">
                  <h3><ExternalLink size={16} /> Accès rapides</h3>
                  <div className="sd-actions-grid">
                    <button className="sd-action-btn" onClick={() => setActiveTab('accidents')}><AlertCircle size={18} /><span>Gestion accidents</span></button>
                    <button className="sd-action-btn" onClick={() => setActiveTab('visites')}><Stethoscope size={18} /><span>Planning visites</span></button>
                    <button className="sd-action-btn" onClick={() => setActiveTab('convocations')}><Send size={18} /><span>Convocations</span></button>
                  </div>
                </div>

                {/* Info médecin */}
                <div className="sd-medecin-info">
                  <div className="sd-medecin-icon"><User size={24} /></div>
                  <div className="sd-medecin-content">
                    <strong>Médecin traitant</strong>
                    <span>Dr. Mahmoud Khelifi - Médecin du travail agréé</span>
                    <small>Toutes les visites médicales sont effectuées par le Dr. Khelifi</small>
                  </div>
                </div>
              </div>
            )}

            {/* ========== ONGLET 2 : ACCIDENTS ========== */}
            {activeTab === 'accidents' && <SocialAccidents />}

            {/* ========== ONGLET 3 : VISITES MÉDICALES ========== */}
            {activeTab === 'visites' && (
              <div className="sd-visites-container">
                <div className="sd-visites-submenu">
                  <button className={`sd-submenu-btn ${visitesSubTab === 'planning' ? 'active' : ''}`} onClick={() => setVisitesSubTab('planning')}>
                    <CalendarIcon size={16} /> Planning
                  </button>
                  <button className={`sd-submenu-btn ${visitesSubTab === 'gestion' ? 'active' : ''}`} onClick={() => setVisitesSubTab('gestion')}>
                    <FileText size={16} /> Gestion Visites Manuellement
                  </button>
                </div>
                {visitesSubTab === 'planning' ? <PlanningPage /> : <GestionVisitesPage />}
              </div>
            )}

            {/* ========== ONGLET 4 : CONVOCATIONS ========== */}
            {activeTab === 'convocations' && <ConvocationsPage />}

            {/* ========== ONGLET 5 : HISTORIQUE DES VISITES ========== */}
            {activeTab === 'historique' && <HistoriqueVisites />}

            {/* ========== ONGLET 6 : CONNEXIONS (NOUVEAU) ========== */}
            {activeTab === 'connexions' && <HistoriqueConnexions />}

            {/* ========== ONGLET 7 : ALERTES ========== */}
            {activeTab === 'alertes' && <NotificationsIntelligentesPage />}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* MODALE NOTIFICATION */}
      <AnimatePresence>
        {showNotificationModal && selectedNotification && (
          <motion.div className="sd-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNotificationModal(false)}>
            <motion.div className="sd-modal-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <div className="sd-modal-header">
                <h2><Bell size={18} /> Notification</h2>
                <button onClick={() => setShowNotificationModal(false)}><X size={18} /></button>
              </div>
              <div className="sd-modal-body">
                <div><label>Date :</label><span>{formatDateTime(selectedNotification.created_at)}</span></div>
                <div><label>Message :</label><span>{selectedNotification.message}</span></div>
              </div>
              <div className="sd-modal-footer">
                <button className="sd-btn-delete" onClick={() => { deleteNotification(selectedNotification.id); setShowNotificationModal(false); }}><Trash2 size={14} /> Supprimer</button>
                <button className="sd-btn-close" onClick={() => setShowNotificationModal(false)}>Fermer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE NOTIFICATION MOT DE PASSE */}
      <AnimatePresence>
        {showPasswordModal && selectedPasswordNotif && (
          <div className="sd-modal-overlay" onClick={() => setShowPasswordModal(false)}>
            <motion.div className="sd-modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="sd-modal-header">
                <div className="sd-header-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1e40af)' }}><Key size={24} /></div>
                <h2>Notification mot de passe</h2>
                <button className="sd-modal-close" onClick={() => setShowPasswordModal(false)}><X size={18} /></button>
              </div>
              <div className="sd-modal-body">
                <div className="sd-info-box"><p><strong>📋 Raison :</strong></p><p>{selectedPasswordNotif.reason}</p></div>
                <div className="sd-password-box">
                  <p><strong>🔑 Nouveau mot de passe :</strong></p>
                  <div className="sd-password-display">
                    <span className="sd-password-value">{showPassword ? selectedPasswordNotif.new_password : '••••••••'}</span>
                    <button className="sd-toggle-password-btn" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="sd-warning-box"><AlertCircle size={16} /><span>Changez votre mot de passe lors de votre prochaine connexion</span></div>
              </div>
              <div className="sd-modal-footer">
                <button className="sd-btn-secondary" onClick={() => setShowPasswordModal(false)}>Fermer</button>
                <button className="sd-btn-danger" onClick={() => { deletePasswordNotification(selectedPasswordNotif.id); setShowPasswordModal(false); }}>
                  <Trash2 size={16} /> Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
};

export default SocialDashboard;