import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, Users, Clock, Calendar, LogOut, Phone, Mail, MessageCircle, 
  Award, Bell, X, CheckCircle, Eye, Trash2, Info, AlertCircle, Key,
  History, ChevronRight, Crown, Wrench, User, EyeOff,
  AlertTriangle, FileText, Plus, BarChart3, Home, Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SocialAccidents from './SocialAccidents';
import PlanningPage from './visites/PlanningPage';
import GestionVisitesPage from './visites/GestionVisitesPage';
import '../styles/SocialDashboard.css';

const SocialDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  
  // ========== ONGLET ACTIF ==========
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // ========== SOUS-ONGLET POUR LES VISITES ==========
  const [visitesSubTab, setVisitesSubTab] = useState('planning'); // 'planning' ou 'gestion'
  
  // ========== STATS ==========
  const [stats] = useState({
    beneficiaires: 156,
    consultations: 43,
    suivis: 28,
    satisfaction: 94
  });

  // ========== NOTIFICATIONS ==========
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ========== EFFETS ==========
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bonjour');
    else if (hour < 18) setGreeting('Bon après-midi');
    else setGreeting('Bonsoir');
    return () => clearInterval(timer);
  }, []);

  // ========== CHARGEMENT UTILISATEUR ET NOTIFICATIONS ==========
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    console.log('🔍 Token:', token ? 'présent' : 'absent');
    console.log('🔍 userData:', userData);
    
    if (!token || !userData) {
      navigate('/social');
      return;
    }
    
    try {
      const parsedUser = JSON.parse(userData);
      console.log('🔍 Utilisateur parsé:', parsedUser);
      
      // Récupérer l'ID directement
      const userId = parsedUser.id;
      console.log('✅ ID utilisateur:', userId);
      
      setUser(parsedUser);
      
      if (userId) {
        fetchNotifications(userId);
      } else {
        console.error('❌ ID utilisateur manquant');
      }
      
    } catch (err) {
      console.error('❌ Erreur:', err);
      navigate('/social');
    }
  }, [navigate]);

  // ========== CHARGER LES NOTIFICATIONS ==========
  const fetchNotifications = async (userId) => {
    console.log('📥 fetchNotifications pour userId:', userId);
    setLoadingNotifications(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/notifications/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      console.log('📥 Réponse brute:', data);
      
      if (data.success) {
        console.log('📥 Notifications reçues:', data.notifications);
        setNotifications(data.notifications || []);
        const unread = data.notifications?.filter(n => n.status !== 'lu').length || 0;
        setUnreadCount(unread);
      } else {
        console.error('❌ Erreur API:', data.message);
      }
    } catch (err) {
      console.error('❌ Erreur réseau:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // ========== MARQUER COMME LUE ==========
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, status: 'lu' } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erreur marquage:', err);
    }
  };

  // ========== SUPPRIMER UNE NOTIFICATION ==========
  const deleteNotification = async (notificationId) => {
    if (!window.confirm('Supprimer cette notification ?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const updated = notifications.filter(n => n.id !== notificationId);
      setNotifications(updated);
      setUnreadCount(updated.filter(n => n.status !== 'lu').length);
    } catch (err) {
      console.error('Erreur suppression:', err);
    }
  };

  // ========== OUVRIR UNE NOTIFICATION ==========
  const openNotification = async (notification) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/notifications/${notification.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedNotification(data.notification);
        setShowNotificationModal(true);
        setShowPassword(false);
        
        if (notification.status !== 'lu') {
          markAsRead(notification.id);
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
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
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
      case 'social': return '#10b981';
      default: return '#64748b';
    }
  };

  const getRoleLabel = (role) => {
    const labels = { 
      'admin': 'Administrateur', 
      'technicien': 'Technicien', 
      'social': 'Service Social', 
      'agent': 'Agent' 
    };
    return labels[role] || role;
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
          <div className="logo-icon" style={{ background: `linear-gradient(135deg, #10b981, #059669)` }}>
            <Heart size={28} color="white" />
          </div>
          <div>
            <h1>Service Social</h1>
            <p className="header-greeting">{greeting}, <strong>{user?.email?.split('@')[0] || 'Social'}</strong></p>
            <p className="user-id-info" style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
              ID: {user?.id || 'inconnu'}
            </p>
          </div>
        </div>
        
        <div className="header-right">
          <div className="datetime">
            <Clock size={14} /> 
            <span>{currentTime.toLocaleTimeString('fr-FR')}</span>
            <Calendar size={14} /> 
            <span>{currentTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
          </div>
          
          {/* NOTIFICATIONS */}
          <div className="notifications-wrapper">
            <button 
              className={`btn-icon notification-btn ${unreadCount > 0 ? 'has-notifications' : ''}`}
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </button>
            
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  className="notifications-dropdown"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="notifications-header">
                    <h3>Notifications ({notifications.length})</h3>
                    <button onClick={() => setShowNotifications(false)}>
                      <X size={16} />
                    </button>
                  </div>
                  
                  <div className="notifications-list">
                    {loadingNotifications ? (
                      <div className="notifications-loading">
                        <div className="spinner"></div>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="notifications-empty">
                        <Bell size={32} />
                        <p>Aucune notification</p>
                      </div>
                    ) : (
                      notifications.slice(0, 5).map(notif => (
                        <div 
                          key={notif.id} 
                          className={`notification-item ${notif.status === 'lu' ? '' : 'unread'}`}
                          onClick={() => openNotification(notif)}
                        >
                          <div className="notification-icon" style={{ background: `${getRoleColor(notif.role_utilisateur)}20`, color: getRoleColor(notif.role_utilisateur) }}>
                            <Key size={16} />
                          </div>
                          <div className="notification-content">
                            <div className="notification-title">
                              Mot de passe modifié
                            </div>
                            <div className="notification-message">
                              {notif.raison?.substring(0, 50)}...
                            </div>
                            <div className="notification-time">
                              {formatDate(notif.created_at)}
                            </div>
                          </div>
                          {notif.status !== 'lu' && (
                            <span className="notification-dot"></span>
                          )}
                        </div>
                      ))
                    )}
                    
                    {notifications.length > 5 && (
                      <button className="view-all-btn">Voir toutes</button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* MENU PRINCIPAL */}
          <div className="dashboard-menu">
            <button 
              className={`menu-btn ${activeTab === 'dashboard' ? 'active' : ''}`} 
              onClick={() => setActiveTab('dashboard')}
            >
              <Home size={18} /> <span>Accueil</span>
            </button>
            
            <button 
              className={`menu-btn ${activeTab === 'accidents' ? 'active' : ''}`} 
              onClick={() => setActiveTab('accidents')}
            >
              <AlertTriangle size={18} /> <span>Accidents</span>
            </button>
            
            {/* NOUVEAU BOUTON VISITES */}
            <button 
              className={`menu-btn ${activeTab === 'visites' ? 'active' : ''}`} 
              onClick={() => setActiveTab('visites')}
            >
              <Activity size={18} /> <span>Visites</span>
            </button>
            
            <button 
              className={`menu-btn ${activeTab === 'historique' ? 'active' : ''}`} 
              onClick={() => navigate('/social/historique')}
            >
              <History size={18} /> <span>Historique</span>
            </button>
          </div>
          
          <button className="btn-icon logout-btn" onClick={handleLogout} title="Déconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </motion.div>

      {/* CONTENU */}
      <motion.div className="dashboard-content">
        
        {/* ACCUEIL */}
        {activeTab === 'dashboard' && (
          <>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>
                  <Users size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Bénéficiaires</span>
                  <span className="stat-value">{stats.beneficiaires}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>
                  <Phone size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Consultations</span>
                  <span className="stat-value">{stats.consultations}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>
                  <MessageCircle size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Suivis</span>
                  <span className="stat-value">{stats.suivis}</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>
                  <Award size={24} />
                </div>
                <div className="stat-content">
                  <span className="stat-label">Satisfaction</span>
                  <span className="stat-value">{stats.satisfaction}%</span>
                </div>
              </div>
            </div>

            <h2>Espace d'accompagnement social</h2>
            <p>Gérez vos dossiers et suivis sociaux</p>
            
            {/* BANNIÈRE ACCIDENTS */}
            <div className="historique-banner" onClick={() => setActiveTab('accidents')}>
              <div className="banner-icon">
                <AlertTriangle size={32} />
              </div>
              <div className="banner-content">
                <h3>Gestion des accidents du travail</h3>
                <p>Déclarez et suivez les accidents, consultez les statistiques</p>
              </div>
              <div className="banner-arrow">
                <ChevronRight size={24} />
              </div>
            </div>
            
            {/* BANNIÈRE VISITES (NOUVELLE) */}
            <div className="historique-banner" onClick={() => setActiveTab('visites')} style={{ marginTop: '1rem', borderColor: '#10b981' }}>
              <div className="banner-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <Activity size={32} />
              </div>
              <div className="banner-content">
                <h3>Gestion des visites médicales</h3>
                <p>Planning automatique, enregistrement et historique des consultations</p>
              </div>
              <div className="banner-arrow" style={{ color: '#10b981' }}>
                <ChevronRight size={24} />
              </div>
            </div>
            
            {/* NOTIFICATIONS RÉCENTES */}
            {notifications.length > 0 && (
              <div className="recent-notifications">
                <h3>
                  <Bell size={18} /> Notifications récentes
                  {unreadCount > 0 && <span className="unread-badge">{unreadCount} non lue(s)</span>}
                </h3>
                <div className="recent-list">
                  {notifications.slice(0, 3).map(notif => (
                    <div 
                      key={notif.id} 
                      className={`recent-item ${notif.status !== 'lu' ? 'unread' : ''}`} 
                      onClick={() => openNotification(notif)}
                    >
                      <div className="recent-icon" style={{ background: `${getRoleColor(notif.role_utilisateur)}20`, color: getRoleColor(notif.role_utilisateur) }}>
                        <Key size={16} />
                      </div>
                      <div className="recent-content">
                        <div className="recent-title">
                          Mot de passe modifié
                          {notif.status !== 'lu' && <span className="new-badge">Nouveau</span>}
                        </div>
                        <div className="recent-reason">{notif.raison}</div>
                        <div className="recent-date">{formatDate(notif.created_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ACCIDENTS */}
        {activeTab === 'accidents' && <SocialAccidents />}

        {/* VISITES MÉDICALES */}
        {activeTab === 'visites' && (
          <div className="visites-container">
            {/* SOUS-MENU POUR LES VISITES */}
            <div className="visites-submenu" style={{
              display: 'flex',
              gap: '0.5rem',
              marginBottom: '1.5rem',
              padding: '0.375rem',
              background: 'var(--bg-white)',
              border: '1px solid var(--border)',
              borderRadius: '9999px',
              width: 'fit-content'
            }}>
              <button 
                className={`submenu-btn ${visitesSubTab === 'planning' ? 'active' : ''}`}
                onClick={() => setVisitesSubTab('planning')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '9999px',
                  background: visitesSubTab === 'planning' ? 'var(--primary)' : 'transparent',
                  color: visitesSubTab === 'planning' ? 'white' : 'var(--text-light)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <Calendar size={18} /> Planning
              </button>
              <button 
                className={`submenu-btn ${visitesSubTab === 'gestion' ? 'active' : ''}`}
                onClick={() => setVisitesSubTab('gestion')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.25rem',
                  borderRadius: '9999px',
                  background: visitesSubTab === 'gestion' ? 'var(--primary)' : 'transparent',
                  color: visitesSubTab === 'gestion' ? 'white' : 'var(--text-light)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <FileText size={18} /> Gestion & Historique
              </button>
            </div>

            {/* CONTENU DES VISITES */}
            <motion.div
              key={visitesSubTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {visitesSubTab === 'planning' ? <PlanningPage /> : <GestionVisitesPage />}
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* MODALE NOTIFICATION */}
      <AnimatePresence>
        {showNotificationModal && selectedNotification && (
          <div className="modal-overlay" onClick={() => setShowNotificationModal(false)}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Notification</h2>
                <button className="modal-close" onClick={() => setShowNotificationModal(false)}>
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <p><strong>Raison :</strong> {selectedNotification.reason}</p>
                <p><strong>Nouveau mot de passe :</strong> {showPassword ? selectedNotification.new_password : '••••••••'}</p>
                <button onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? 'Masquer' : 'Afficher'}
                </button>
              </div>
              <div className="modal-footer">
                <button onClick={() => setShowNotificationModal(false)}>Fermer</button>
                <button onClick={() => deleteNotification(selectedNotification.id)}>Supprimer</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SocialDashboard;