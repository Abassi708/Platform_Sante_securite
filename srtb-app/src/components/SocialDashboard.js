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
  Send, RefreshCw, MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SocialAccidents from './SocialAccidents';
import PlanningPage from './visites/PlanningPage';
import GestionVisitesPage from './visites/GestionVisitesPage';
import HistoriqueVisites from './visites/HistoriqueVisites';
import NotificationsIntelligentesPage from './NotificationsIntelligentesPage';
import ConvocationsPage from './visites/ConvocationsPage';
import '../styles/SocialDashboard.css';
import NotificationBadge from './NotificationBadge';

const SocialDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  
  // ========== ONGLET ACTIF ==========
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // ========== SOUS-ONGLET POUR LES VISITES ==========
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
    
    // Agents
    const agentsResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/agents`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const agentsData = await agentsResponse.json();
    
    // Visites TOTAL (sans filtre source)
    const visitesResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/visites/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const visitesData = await visitesResponse.json();
    
    // Planning
    const planningResponse = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/13/2026`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const planningData = await planningResponse.json();
    
    // Accidents
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

  // ========== MARQUER COMME LUE ==========
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

  // ========== SUPPRIMER ==========
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

  // ========== OUVRIR NOTIFICATION ==========
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

  // ========== COMPOSANT PORTAL ==========
  const Portal = ({ children }) => {
    const [container] = useState(() => document.createElement('div'));
    useEffect(() => {
      document.body.appendChild(container);
      return () => document.body.removeChild(container);
    }, [container]);
    return ReactDOM.createPortal(children, container);
  };

  // ========== RENDU ==========
  return (
    <div className="social-dashboard">
      
      {/* HEADER */}
      <motion.div 
        className="dashboard-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="header-left">
          <div className="logo-icon">
            <Heart size={28} color="white" />
          </div>
          <div>
            <h1>Service Social</h1>
            <p className="header-greeting">{greeting}, <strong>{user?.email?.split('@')[0] || 'Social'}</strong></p>
            <p className="user-id-info">ID: {user?.id || 'inconnu'} • Rôle: {getRoleLabel(user?.role)}</p>
          </div>
        </div>
        
        <div className="header-right">
          <div className="datetime">
            <Clock size={14} /> <span>{currentTime.toLocaleTimeString('fr-FR')}</span>
            <Calendar size={14} /> <span>{currentTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          </div>
          
          {/* NOTIFICATIONS PLANNING (INTELLIGENTES) */}
          <NotificationBadge />
          
          {/* NOTIFICATIONS MOT DE PASSE */}
          <div className="password-notifications-wrapper">
            <button 
              ref={passwordButtonRef}
              className={`btn-icon notification-btn ${unreadPasswordCount > 0 ? 'has-notifications' : ''}`}
              onClick={handlePasswordDropdownToggle}
              title="Notifications mot de passe"
            >
              <Key size={18} />
              {unreadPasswordCount > 0 && (
                <span className="notification-badge">{unreadPasswordCount > 9 ? '9+' : unreadPasswordCount}</span>
              )}
            </button>
            
            <AnimatePresence>
              {showPasswordDropdown && (
                <Portal>
                  <>
                    <div className="dropdown-backdrop" onClick={() => setShowPasswordDropdown(false)} />
                    <motion.div 
                      className="notifications-dropdown portal-dropdown"
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
                      <div className="notifications-header">
                        <h3>Mots de passe ({passwordNotifications.length})</h3>
                        <button onClick={() => setShowPasswordDropdown(false)}><X size={16} /></button>
                      </div>
                      <div className="notifications-list">
                        {loadingPasswordNotifs ? (
                          <div className="notifications-loading"><div className="spinner"></div></div>
                        ) : passwordNotifications.length === 0 ? (
                          <div className="notifications-empty"><Key size={32} /><p>Aucune notification</p></div>
                        ) : (
                          passwordNotifications.slice(0, 5).map(notif => (
                            <div key={notif.id} className={`notification-item ${notif.status === 'lu' ? '' : 'unread'}`} onClick={() => openPasswordNotification(notif)}>
                              <div className="notification-icon"><Key size={16} /></div>
                              <div className="notification-content">
                                <div className="notification-title">Mot de passe modifié</div>
                                <div className="notification-message">{notif.reason?.substring(0, 50)}...</div>
                                <div className="notification-time">{formatDate(notif.created_at)}</div>
                              </div>
                              {notif.status !== 'lu' && <span className="notification-dot"></span>}
                            </div>
                          ))
                        )}
                        {passwordNotifications.length > 5 && (
                          <button className="view-all-btn" onClick={() => setShowPasswordDropdown(false)}>
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
          
          {/* MENU PRINCIPAL */}
          <div className="dashboard-menu">
            <button className={`menu-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
              <Home size={18} /> <span>Accueil</span>
            </button>
            
            <button className={`menu-btn ${activeTab === 'accidents' ? 'active' : ''}`} onClick={() => setActiveTab('accidents')}>
              <AlertTriangle size={18} /> <span>Accidents</span>
            </button>
            
            <button className={`menu-btn ${activeTab === 'visites' ? 'active' : ''}`} onClick={() => setActiveTab('visites')}>
              <Activity size={18} /> <span>Visites</span>
            </button>
            
        
            <button className={`menu-btn ${activeTab === 'convocations' ? 'active' : ''}`} onClick={() => setActiveTab('convocations')}>
              <Send size={18} /> <span>Convocations</span>
            </button>
            
            <button className={`menu-btn ${activeTab === 'historiqueVisites' ? 'active' : ''}`} onClick={() => setActiveTab('historiqueVisites')}>
              <History size={18} /> <span>Historique</span>
            </button>

            <button className="menu-btn" onClick={() => navigate('/social/historique')}>
              <BarChart3 size={18} /> <span>Connexions</span>
            </button>

            <button className={`menu-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
              <BellIcon size={18} /> <span>Alertes</span>
            </button>
          </div>
          
          <button className="btn-icon logout-btn" onClick={handleLogout} title="Déconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </motion.div>

      {/* ========== CONTENU PRINCIPAL ========== */}
      <motion.div 
        className="dashboard-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        
        {/* ACCUEIL */}
        {activeTab === 'dashboard' && (
          <>
            {/* BANDEAU PRÉVISIONS */}
            {previsions && previsions.stats && previsions.stats.total_a_planifier > 0 && (
              <motion.div className="previsions-alert" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} onClick={() => { setActiveTab('visites'); setVisitesSubTab('planning'); }}>
                <div className="previsions-alert-content">
                  <TrendingUp size={24} />
                  <div>
                    <strong>{previsions.stats.total_a_planifier} agent(s) à programmer</strong>
                    <span>{previsions.stats.urgents > 0 && `⚠️ ${previsions.stats.urgents} urgent(s)`}{previsions.stats.chauffeurs > 0 && ` • 🚛 ${previsions.stats.chauffeurs} chauffeur(s)`}</span>
                  </div>
                  <ChevronRight size={20} />
                </div>
              </motion.div>
            )}

            {/* STATS CARDS */}
            <div className="stats-grid">
              <motion.div className="stat-card" whileHover={{ y: -4 }}>
                <div className="stat-icon" style={{ background: '#3b82f620', color: '#3b82f6' }}><Users size={24} /></div>
                <div className="stat-content"><span className="stat-label">AGENTS ACTIFS</span><span className="stat-value">{stats.total_agents}</span><span className="stat-sub">{stats.chauffeurs} chauffeurs</span></div>
              </motion.div>
              
              <motion.div className="stat-card" whileHover={{ y: -4 }}>
                <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}><Activity size={24} /></div>
                <div className="stat-content"><span className="stat-label">VISITES CE MOIS</span><span className="stat-value">{stats.visites_mois}</span><span className="stat-sub">Taux: {stats.taux_realisation}%</span></div>
              </motion.div>
              
              <motion.div className="stat-card" whileHover={{ y: -4 }}>
                <div className="stat-icon" style={{ background: '#ef444420', color: '#ef4444' }}><AlertTriangle size={24} /></div>
                <div className="stat-content"><span className="stat-label">ACCIDENTS</span><span className="stat-value">{stats.accidents_mois}</span><span className="stat-sub">Ce mois</span></div>
              </motion.div>
              
              <motion.div className="stat-card" whileHover={{ y: -4 }}>
                <div className="stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}><Clock size={24} /></div>
                <div className="stat-content"><span className="stat-label">VISITES EN RETARD</span><span className="stat-value">{stats.visites_retard}</span><span className="stat-sub">À traiter</span></div>
              </motion.div>
            </div>

            {/* BANNIÈRES D'ACCÈS RAPIDE */}
            <div className="quick-access-grid">
              <div className="quick-access-card" onClick={() => setActiveTab('accidents')}>
                <div className="quick-icon" style={{ background: '#ef444420', color: '#ef4444' }}><AlertTriangle size={32} /></div>
                <div className="quick-content"><h3>Gestion des accidents</h3><p>Déclarez et suivez les accidents du travail</p></div>
                <ChevronRight size={20} className="quick-arrow" />
              </div>
              
              <div className="quick-access-card" onClick={() => { setActiveTab('visites'); setVisitesSubTab('planning'); }}>
                <div className="quick-icon" style={{ background: '#3b82f620', color: '#3b82f6' }}><CalendarIcon size={32} /></div>
                <div className="quick-content"><h3>Planning des visites</h3><p>Gérez le planning médical intelligent</p></div>
                <ChevronRight size={20} className="quick-arrow" />
              </div>
              
              
              
              <div className="quick-access-card" onClick={() => setActiveTab('convocations')}>
                <div className="quick-icon" style={{ background: '#10b98120', color: '#10b981' }}><Send size={32} /></div>
                <div className="quick-content"><h3>Convocations GRH</h3><p>Envoyez les convocations au service GRH</p></div>
                <ChevronRight size={20} className="quick-arrow" />
              </div>
            </div>

            {/* INFO MÉDECIN */}
            <div className="medecin-info">
              <div className="medecin-icon"><User size={24} /></div>
              <div className="medecin-content">
                <strong>Médecin traitant</strong>
                <span>Dr. Mahmoud Khelifi - Médecin du travail agréé</span>
                <small>Toutes les visites médicales sont effectuées par le Dr. Khelifi</small>
              </div>
            </div>
          </>
        )}

        {/* ACCIDENTS */}
        {activeTab === 'accidents' && <SocialAccidents />}

        {/* VISITES MÉDICALES */}
        {activeTab === 'visites' && (
          <div className="visites-container">
            <div className="visites-submenu">
              <button className={`submenu-btn ${visitesSubTab === 'planning' ? 'active' : ''}`} onClick={() => setVisitesSubTab('planning')}>
                <CalendarIcon size={18} /> Planning
              </button>
              <button className={`submenu-btn ${visitesSubTab === 'gestion' ? 'active' : ''}`} onClick={() => setVisitesSubTab('gestion')}>
                <FileText size={18} /> Gestion & Historique
              </button>
            </div>

            <motion.div key={visitesSubTab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>
              {visitesSubTab === 'planning' ? <PlanningPage /> : <GestionVisitesPage />}
            </motion.div>
          </div>
        )}

        

        {/* CONVOCATIONS */}
        {activeTab === 'convocations' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <ConvocationsPage />
          </motion.div>
        )}

        {/* HISTORIQUE DES VISITES */}
        {activeTab === 'historiqueVisites' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <HistoriqueVisites />
          </motion.div>
        )}

        {/* NOTIFICATIONS INTELLIGENTES */}
        {activeTab === 'notifications' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <NotificationsIntelligentesPage />
          </motion.div>
        )}
      </motion.div>

      {/* MODALE NOTIFICATION MOT DE PASSE */}
      <AnimatePresence>
        {showPasswordModal && selectedPasswordNotif && (
          <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
            <motion.div className="modal-content" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div className="header-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #1e40af)' }}><Key size={24} /></div>
                <h2>Notification mot de passe</h2>
                <button className="modal-close" onClick={() => setShowPasswordModal(false)}><X size={18} /></button>
              </div>
              <div className="modal-body">
                <div className="info-box"><p><strong>📋 Raison :</strong></p><p>{selectedPasswordNotif.reason}</p></div>
                <div className="password-box">
                  <p><strong>🔑 Nouveau mot de passe :</strong></p>
                  <div className="password-display">
                    <span className="password-value">{showPassword ? selectedPasswordNotif.new_password : '••••••••'}</span>
                    <button className="toggle-password-btn" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="warning-box"><AlertCircle size={16} /><span>Changez votre mot de passe lors de votre prochaine connexion</span></div>
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowPasswordModal(false)}>Fermer</button>
                <button className="btn-danger" onClick={() => { deletePasswordNotification(selectedPasswordNotif.id); setShowPasswordModal(false); }}>
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