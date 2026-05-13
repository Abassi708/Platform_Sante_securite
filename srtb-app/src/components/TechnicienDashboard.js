// frontend/src/pages/TechnicienDashboard.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Clock, Calendar, TrendingUp, Download, 
  LogOut, Search, Filter, Eye, CheckCircle, 
  Users, Bell, Key, Trash2, X, AlertCircle, User,
  Eye as EyeIcon, EyeOff, History, ChevronRight, Home,
  Building2, Activity, UserCheck, Truck, LayoutDashboard,
  Wrench, ArrowUpRight, MoreHorizontal, RefreshCw,
  Zap, Shield, FolderKanban, BarChart3, Settings,
  Crown, Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AgentsList from '../components/AgentsList';
import AffectationsView from '../components/AffectationsView';
import '../styles/TechnicienDashboard.css';

const TechnicienDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [stats] = useState({
    rapports: 24,
    enAttente: 7,
    completes: 17,
    taux: 75
  });

  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [globalStats, setGlobalStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bonjour');
    else if (hour < 18) setGreeting('Bon après-midi');
    else setGreeting('Bonsoir');
    
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!token || !userData) {
      navigate('/technicien');
      return;
    }
    
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    fetchNotifications(parsedUser.id);
    fetchGlobalStats();
  }, [navigate]);

  const fetchGlobalStats = async () => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/technicien/stats/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setGlobalStats(data.data);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchNotifications = async (userId) => {
    setLoadingNotifications(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/notifications/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        const unread = data.notifications?.filter(n => n.status !== 'read').length || 0;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      });
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, status: 'read' } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    if (!window.confirm('Supprimer cette notification ?')) return;
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const updated = notifications.filter(n => n.id !== notificationId);
      setNotifications(updated);
      setUnreadCount(updated.filter(n => n.status !== 'read').length);
      if (selectedNotification?.id === notificationId) setShowNotificationModal(false);
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const openNotification = async (notification) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/notifications/${notification.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setSelectedNotification(data.notification);
        setShowNotificationModal(true);
        if (notification.status !== 'read') markAsRead(notification.id);
      }
    } catch (err) {
      console.error('Erreur:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleHistorique = () => {
    navigate('/technicien/historique');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchGlobalStats();
    if (user) await fetchNotifications(user.id);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return "Aujourd'hui";
    if (diffDays === 1) return "Hier";
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getRoleColor = (role) => {
    const colors = { admin: '#3b82f6', technicien: '#f59e0b', social: '#10b981', agent: '#8b5cf6' };
    return colors[role] || '#64748b';
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return <Crown size={14} />;
      case 'technicien': return <Wrench size={14} />;
      case 'social': return <Heart size={14} />;
      default: return <User size={14} />;
    }
  };

  const getRoleLabel = (role) => {
    const labels = { admin: 'Administrateur', technicien: 'Technicien', social: 'Service Social', agent: 'Agent' };
    return labels[role] || role;
  };

  return (
    <div className="hse-tech-dashboard">
      {/* SIDEBAR */}
      <aside className="hse-sidebar">
        <div className="hse-sidebar-header">
          <div className="hse-logo">
            <Wrench size={24} />
            <span>HSE Manager</span>
            
          </div>
        </div>
        
        <nav className="hse-sidebar-nav">
          <button 
            className={`hse-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Tableau de bord</span>
          </button>
          <button 
            className={`hse-nav-item ${activeTab === 'agents' ? 'active' : ''}`}
            onClick={() => setActiveTab('agents')}
          >
            <Users size={18} />
            <span>Agents</span>
          </button>
          <button 
            className={`hse-nav-item ${activeTab === 'distribution' ? 'active' : ''}`}
            onClick={() => setActiveTab('distribution')}
          >
            <FolderKanban size={18} />
            <span>Distribution</span>
          </button>
        </nav>

        <div className="hse-sidebar-footer">
          <button className="hse-nav-item" onClick={handleHistorique}>
            <History size={18} />
            <span>Historique</span>
          </button>
          <button className="hse-nav-item hse-logout" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="hse-main-content">
        {/* TOP BAR */}
        <header className="hse-top-bar">
          <div className="hse-welcome-section">
            <h1>{activeTab === 'dashboard' ? 'Tableau de bord' : activeTab === 'agents' ? 'Gestion des agents' : 'Distribution des affectations'}</h1>
            <p>{greeting}, {user?.email?.split('@')[0] || 'Technicien'}</p>
          </div>
          
          <div className="hse-header-actions">
            <div className="hse-date-time">
              <Calendar size={12} />
              <span>{currentTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              <span className="hse-separator">•</span>
              <Clock size={12} />
              <span>{currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            
            <button className="hse-icon-btn" onClick={handleRefresh}>
              <RefreshCw size={18} className={isRefreshing ? 'hse-spin' : ''} />
            </button>
            
            <div className="hse-notifications-wrapper">
              <button className="hse-icon-btn hse-notif-btn" onClick={() => setShowNotifications(!showNotifications)}>
                <Bell size={18} />
                {unreadCount > 0 && <span className="hse-notif-badge">{unreadCount}</span>}
              </button>
              
              <AnimatePresence>
                {showNotifications && (
                  <motion.div 
                    className="hse-notif-dropdown"
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="hse-notif-header">
                      <h3>Notifications</h3>
                      <button onClick={() => setShowNotifications(false)}>
                        <X size={14} />
                      </button>
                    </div>
                    <div className="hse-notif-list">
                      {notifications.length === 0 ? (
                        <div className="hse-notif-empty">
                          <Bell size={32} />
                          <p>Aucune notification</p>
                        </div>
                      ) : (
                        notifications.slice(0, 5).map(notif => (
                          <div 
                            key={notif.id}
                            className={`hse-notif-item ${notif.status !== 'read' ? 'unread' : ''}`}
                            onClick={() => openNotification(notif)}
                          >
                            <div className="hse-notif-icon">
                              <Key size={14} />
                            </div>
                            <div className="hse-notif-info">
                              <div className="hse-notif-title">Mot de passe modifié</div>
                              <div className="hse-notif-desc">{notif.reason?.substring(0, 40)}</div>
                              <div className="hse-notif-date">{formatDate(notif.created_at)}</div>
                            </div>
                            {notif.status !== 'read' && <div className="hse-notif-unread-dot"></div>}
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* DASHBOARD CONTENT */}
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="hse-dashboard-view"
            >
              {/* STATS GRID */}
              <div className="hse-stats-grid">
                <div className="hse-stat-card">
                  <div className="hse-stat-icon orange">
                    <FileText size={22} />
                  </div>
                  <div className="hse-stat-info">
                    <span className="hse-stat-value">{stats.rapports}</span>
                    <span className="hse-stat-label">Rapports</span>
                  </div>
                  <ArrowUpRight size={14} className="hse-stat-trend up" />
                </div>
                <div className="hse-stat-card">
                  <div className="hse-stat-icon red">
                    <Clock size={22} />
                  </div>
                  <div className="hse-stat-info">
                    <span className="hse-stat-value">{stats.enAttente}</span>
                    <span className="hse-stat-label">En attente</span>
                  </div>
                </div>
                <div className="hse-stat-card">
                  <div className="hse-stat-icon green">
                    <CheckCircle size={22} />
                  </div>
                  <div className="hse-stat-info">
                    <span className="hse-stat-value">{stats.completes}</span>
                    <span className="hse-stat-label">Complétés</span>
                  </div>
                </div>
                <div className="hse-stat-card">
                  <div className="hse-stat-icon purple">
                    <TrendingUp size={22} />
                  </div>
                  <div className="hse-stat-info">
                    <span className="hse-stat-value">{stats.taux}%</span>
                    <span className="hse-stat-label">Taux activité</span>
                  </div>
                </div>
              </div>

              {/* GLOBAL STATS SECTION AMÉLIORÉE */}
              {globalStats && !loadingStats && (
                <div className="hse-global-stats-section">
                  <div className="hse-section-header">
                    <div className="hse-section-title-wrapper">
                      <div className="hse-section-icon">
                        <LayoutDashboard size={18} />
                      </div>
                      <h2>Vue d'ensemble</h2>
                      <span className="hse-section-badge">Statistiques en temps réel</span>
                    </div>
                    <div className="hse-live-indicator">
                      <span className="hse-live-dot"></span>
                      <span>Live</span>
                    </div>
                  </div>
                  
                  <div className="hse-global-stats-grid">
                    {/* Agents */}
                    <div className="hse-global-card" data-type="agents">
                      <div className="hse-global-card-icon">
                        <Users size={22} />
                      </div>
                      <div className="hse-global-value">{globalStats.agents.total}</div>
                      <div className="hse-global-label">Agents</div>
                      <div className="hse-global-trend up">
                        <TrendingUp size={10} /> +8%
                      </div>
                    </div>
                    
                    {/* Actifs */}
                    <div className="hse-global-card" data-type="actifs">
                      <div className="hse-global-card-icon">
                        <UserCheck size={22} />
                      </div>
                      <div className="hse-global-value">{globalStats.agents.actifs}</div>
                      <div className="hse-global-label">Actifs</div>
                      <div className="hse-global-trend up">
                        <TrendingUp size={10} /> +5%
                      </div>
                    </div>
                    
                    {/* Inaptitudes */}
                    <div className="hse-global-card" data-type="inaptitudes">
                      <div className="hse-global-card-icon">
                        <AlertCircle size={22} />
                      </div>
                      <div className="hse-global-value">{globalStats.agents.enInaptitude}</div>
                      <div className="hse-global-label">Inaptitudes</div>
                      <div className="hse-global-trend down">
                        <TrendingUp size={10} style={{ transform: 'rotate(180deg)' }} /> -2%
                      </div>
                    </div>
                    
                    {/* Taux activité */}
                    <div className="hse-global-card" data-type="taux">
                      <div className="hse-global-card-icon">
                        <Activity size={22} />
                      </div>
                      <div className="hse-global-value">{globalStats.agents.tauxActivite}%</div>
                      <div className="hse-global-label">Taux activité</div>
                      <div className="hse-global-trend up">
                        <TrendingUp size={10} /> +12%
                      </div>
                    </div>
                    
                    {/* Chauffeurs */}
                    <div className="hse-global-card" data-type="chauffeurs">
                      <div className="hse-global-card-icon">
                        <Truck size={22} />
                      </div>
                      <div className="hse-global-value">{globalStats.affectations.chauffeurs}</div>
                      <div className="hse-global-label">Chauffeurs</div>
                      <div className="hse-global-trend neutral">
                        <TrendingUp size={10} style={{ transform: 'rotate(90deg)' }} /> Stable
                      </div>
                    </div>
                    
                    {/* Visites à venir */}
                    <div className="hse-global-card" data-type="visites">
                      <div className="hse-global-card-icon">
                        <Calendar size={22} />
                      </div>
                      <div className="hse-global-value">{globalStats.visites.aVenir}</div>
                      <div className="hse-global-label">Visites à venir</div>
                      <div className="hse-global-trend up">
                        <TrendingUp size={10} /> +3
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* HISTORIQUE BANNER */}
              <motion.div 
                className="hse-historique-banner" 
                onClick={handleHistorique}
                whileHover={{ x: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className="hse-banner-icon">
                  <History size={24} />
                </div>
                <div className="hse-banner-text">
                  <h3>Historique des connexions</h3>
                  <p>Consultez l'ensemble de vos activités récentes et suivez votre parcours</p>
                </div>
                <div className="hse-banner-arrow">
                  <ChevronRight size={18} />
                </div>
              </motion.div>

              {/* RECENT NOTIFICATIONS */}
              {notifications.length > 0 && (
                <div className="hse-recent-section">
                  <div className="hse-section-header">
                    <div className="hse-section-title-wrapper">
                      <div className="hse-section-icon">
                        <Bell size={16} />
                      </div>
                      <h3>Notifications récentes</h3>
                      {unreadCount > 0 && <span className="hse-badge">{unreadCount} non lue(s)</span>}
                    </div>
                  </div>
                  <div className="hse-recent-grid">
                    {notifications.slice(0, 3).map((notif, index) => (
                      <motion.div 
                        key={notif.id}
                        className={`hse-recent-card ${notif.status !== 'read' ? 'unread' : ''}`}
                        onClick={() => openNotification(notif)}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ y: -3 }}
                      >
                        <div className="hse-recent-icon">
                          <Key size={16} />
                        </div>
                        <div className="hse-recent-info">
                          <div className="hse-recent-title">
                            Modification du mot de passe
                            {notif.status !== 'read' && <span className="hse-new-badge">Nouveau</span>}
                          </div>
                          <div className="hse-recent-desc">{notif.reason?.substring(0, 60)}</div>
                          <div className="hse-recent-date">{formatDate(notif.created_at)}</div>
                        </div>
                        {notif.status !== 'read' && <div className="hse-recent-unread-indicator"></div>}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'agents' && (
            <motion.div
              key="agents"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="hse-tab-view"
            >
              <div className="hse-glass-container">
                <AgentsList />
              </div>
            </motion.div>
          )}

          {activeTab === 'distribution' && (
            <motion.div
              key="distribution"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="hse-tab-view"
            >
              <div className="hse-glass-container">
                <AffectationsView />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* MODALE NOTIFICATION PREMIUM */}
      <AnimatePresence>
        {showNotificationModal && selectedNotification && (
          <motion.div 
            className="hse-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNotificationModal(false)}
          >
            <motion.div 
              className="hse-modal"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="hse-modal-header">
                <div className="hse-modal-icon">
                  <Bell size={20} />
                </div>
                <h3>Détail de la notification</h3>
                <button className="hse-modal-close" onClick={() => setShowNotificationModal(false)}>
                  <X size={18} />
                </button>
              </div>
              
              <div className="hse-modal-body">
                <div className="hse-info-row">
                  <span className="hse-info-label">Destinataire</span>
                  <span className="hse-info-value">{selectedNotification.user_email}</span>
                </div>
                <div className="hse-info-row">
                  <span className="hse-info-label">Rôle</span>
                  <span className="hse-info-value" style={{ color: getRoleColor(selectedNotification.user_role) }}>
                    {getRoleIcon(selectedNotification.user_role)} {getRoleLabel(selectedNotification.user_role)}
                  </span>
                </div>
                <div className="hse-info-row">
                  <span className="hse-info-label">Date d'envoi</span>
                  <span className="hse-info-value">
                    {new Date(selectedNotification.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
                <div className="hse-info-row">
                  <span className="hse-info-label">Raison</span>
                  <span className="hse-info-value hse-reason-text">{selectedNotification.reason}</span>
                </div>
                <div className="hse-info-row hse-password-info-row">
                  <span className="hse-info-label">Mot de passe</span>
                  <div className="hse-password-field">
                    <span className={`hse-password-value ${showPassword ? '' : 'hidden'}`}>
                      {showPassword ? selectedNotification.new_password : '••••••••'}
                    </span>
                    <button 
                      className="hse-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={14} /> : <EyeIcon size={14} />}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="hse-modal-footer">
                <button className="hse-btn-secondary" onClick={() => setShowNotificationModal(false)}>
                  Fermer
                </button>
                <button className="hse-btn-danger" onClick={() => deleteNotification(selectedNotification.id)}>
                  <Trash2 size={14} /> Supprimer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TechnicienDashboard;