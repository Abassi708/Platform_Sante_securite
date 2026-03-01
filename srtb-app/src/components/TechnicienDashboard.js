import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, Clock, Calendar, TrendingUp, Download, ArrowLeft, 
  LogOut, Search, Filter, Eye, CheckCircle, XCircle, BarChart,
  Users, Briefcase, Award, Zap, Bell, Settings, HelpCircle, Key,
  Trash2, X, AlertCircle, Info, User, Mail, Shield, Eye as EyeIcon,
  EyeOff, Send, MessageCircle, Hash, Crown, Wrench, Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/TechnicienDashboard.css';

const TechnicienDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // ========== STATS (simulées) ==========
  const [stats] = useState({
    rapports: 24,
    enAttente: 7,
    completes: 17,
    taches: 12,
    taux: 75
  });

  // ========== ÉTATS POUR LES NOTIFICATIONS ==========
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ========== EFFETS ==========
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
    
    // Charger les notifications de l'utilisateur
    fetchNotifications(parsedUser.id);
  }, [navigate]);

  // ========== CHARGER LES NOTIFICATIONS ==========
  const fetchNotifications = async (userId) => {
    setLoadingNotifications(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/notifications/user/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.notifications || []);
        const unread = data.notifications?.filter(n => n.status !== 'read').length || 0;
        setUnreadCount(unread);
      }
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  // ========== MARQUER COMME LUE ==========
  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, status: 'read' } : n
        ));
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Erreur marquage notification:', err);
    }
  };

  // ========== SUPPRIMER UNE NOTIFICATION ==========
  const deleteNotification = async (notificationId) => {
    if (!window.confirm('Supprimer cette notification ?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        const updatedNotifications = notifications.filter(n => n.id !== notificationId);
        setNotifications(updatedNotifications);
        const unread = updatedNotifications.filter(n => n.status !== 'read').length;
        setUnreadCount(unread);
        if (selectedNotification?.id === notificationId) {
          setShowNotificationModal(false);
        }
      }
    } catch (err) {
      console.error('Erreur suppression notification:', err);
    }
  };

  // ========== OUVRIR UNE NOTIFICATION (VERSION CORRIGÉE) ==========
  const openNotification = async (notification) => {
    try {
      // Récupérer la notification complète depuis le serveur
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/notifications/${notification.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSelectedNotification(data.notification);
        setShowNotificationModal(true);
        setShowPassword(false);
        
        if (notification.status !== 'read') {
          markAsRead(notification.id);
        }
      }
    } catch (err) {
      console.error('Erreur ouverture notification:', err);
    }
  };

  // ========== DÉCONNEXION ==========
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // ========== HISTORIQUE ==========
  const handleHistorique = () => {
    navigate('/technicien/historique');
  };

  // ========== FORMATER LA DATE ==========
  const formatDate = (dateString) => {
    if (!dateString) return 'Date inconnue';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Aujourd'hui";
    } else if (diffDays === 1) {
      return "Hier";
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    }
  };

  // ========== FONCTIONS UTILITAIRES ==========
  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return <Crown size={16} />;
      case 'technicien': return <Wrench size={16} />;
      case 'social': return <Heart size={16} />;
      case 'agent': return <User size={16} />;
      default: return <User size={16} />;
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return '#2563eb';
      case 'technicien': return '#f59e0b';
      case 'social': return '#10b981';
      case 'agent': return '#8b5cf6';
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

  return (
    <div className="technicien-dashboard">
      
      {/* HEADER */}
      <motion.div 
        className="dashboard-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="header-left">
          <div className="logo-icon" style={{ background: `linear-gradient(135deg, #f59e0b, #d97706)` }}>
            <Wrench size={28} color="white" />
          </div>
          <div>
            <h1>Espace Technicien</h1>
            <p className="header-greeting">{greeting}, <strong>{user?.email?.split('@')[0] || 'Technicien'}</strong></p>
          </div>
        </div>
        
        <div className="header-right">
          <div className="datetime">
            <Clock size={14} /> 
            <span>{currentTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            <Calendar size={14} /> 
            <span>{currentTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
          
          {/* BOUTON NOTIFICATIONS */}
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
            
            {/* DROPDOWN DES NOTIFICATIONS */}
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
                    <h3>Notifications</h3>
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
                          className={`notification-item ${notif.status !== 'read' ? 'unread' : ''}`}
                          onClick={() => openNotification(notif)}
                        >
                          <div className="notification-icon" style={{ background: `${getRoleColor(notif.user_role)}20`, color: getRoleColor(notif.user_role) }}>
                            <Key size={16} />
                          </div>
                          <div className="notification-content">
                            <div className="notification-title">
                              Mot de passe modifié
                            </div>
                            <div className="notification-message">
                              {notif.reason?.substring(0, 50)}...
                            </div>
                            <div className="notification-time">
                              {formatDate(notif.created_at)}
                            </div>
                          </div>
                          {notif.status !== 'read' && (
                            <span className="notification-dot"></span>
                          )}
                        </div>
                      ))
                    )}
                    
                    {notifications.length > 5 && (
                      <button className="view-all-btn">
                        Voir toutes les notifications
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button className="btn-icon" onClick={handleHistorique} title="Historique">
            <FileText size={18} />
          </button>
          
          <button className="btn-icon logout-btn" onClick={handleLogout} title="Déconnexion">
            <LogOut size={18} />
          </button>
        </div>
      </motion.div>

      {/* STATS CARDS */}
      <motion.div 
        className="stats-grid"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.3 }}
      >
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            <FileText size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Rapports</span>
            <span className="stat-value">{stats.rapports}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ef444420', color: '#ef4444' }}>
            <Clock size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">En attente</span>
            <span className="stat-value">{stats.enAttente}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>
            <CheckCircle size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Complétés</span>
            <span className="stat-value">{stats.completes}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#2563eb20', color: '#2563eb' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Taux</span>
            <span className="stat-value">{stats.taux}%</span>
          </div>
        </div>
      </motion.div>

      {/* CONTENU PRINCIPAL */}
      <motion.div 
        className="dashboard-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        <h2>Bienvenue dans votre espace de travail</h2>
        <p>Gérez vos rapports et tâches administratives</p>
        
        {/* SECTION NOTIFICATIONS RÉCENTES */}
        {notifications.length > 0 && (
          <div className="recent-notifications">
            <h3>
              <Bell size={18} />
              Notifications récentes
              {unreadCount > 0 && <span className="unread-badge">{unreadCount} non lue(s)</span>}
            </h3>
            
            <div className="recent-list">
              {notifications.slice(0, 3).map(notif => (
                <div 
                  key={notif.id} 
                  className={`recent-item ${notif.status !== 'read' ? 'unread' : ''}`}
                  onClick={() => openNotification(notif)}
                >
                  <div className="recent-icon" style={{ background: `${getRoleColor(notif.user_role)}20`, color: getRoleColor(notif.user_role) }}>
                    <Key size={16} />
                  </div>
                  <div className="recent-content">
                    <div className="recent-title">
                      Mot de passe modifié
                      {notif.status !== 'read' && <span className="new-badge">Nouveau</span>}
                    </div>
                    <div className="recent-reason">{notif.reason}</div>
                    <div className="recent-date">{formatDate(notif.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* MODALE DE NOTIFICATION AMÉLIORÉE */}
      <AnimatePresence>
        {showNotificationModal && selectedNotification && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowNotificationModal(false)}
          >
            <motion.div 
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header" style={{ background: `linear-gradient(135deg, #f59e0b20, #d9770620)` }}>
                <div className="header-icon" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                  <Bell size={24} />
                </div>
                <h2>Notification de changement de mot de passe</h2>
                <button className="modal-close" onClick={() => setShowNotificationModal(false)}>
                  <X size={18} />
                </button>
              </div>
              
              <div className="modal-body">
                <div className="notification-preview">
                  <div className="preview-card">
                    <div className="preview-row">
                      <span className="preview-label">Destinataire :</span>
                      <span className="preview-value">
                        <strong>{selectedNotification.user_email}</strong>
                      </span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-label">Rôle :</span>
                      <span className="preview-value">
                        <span className="role-badge-small" style={{ background: getRoleColor(selectedNotification.user_role) }}>
                          {getRoleIcon(selectedNotification.user_role)} {getRoleLabel(selectedNotification.user_role)}
                        </span>
                      </span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-label">Date d'envoi :</span>
                      <span className="preview-value">
                        {new Date(selectedNotification.created_at).toLocaleString('fr-FR', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="preview-row">
                      <span className="preview-label">Raison :</span>
                      <span className="preview-value reason">{selectedNotification.reason}</span>
                    </div>
                    <div className="preview-row password-row">
                      <span className="preview-label">Nouveau mot de passe :</span>
                      <div className="password-display">
                        <span className={`preview-value password ${showPassword ? '' : 'hidden'}`}>
                          {showPassword ? selectedNotification.new_password : '••••••••'}
                        </span>
                        <button 
                          className="password-toggle-btn"
                          onClick={() => setShowPassword(!showPassword)}
                          title={showPassword ? 'Masquer' : 'Afficher'}
                        >
                          {showPassword ? <EyeOff size={16} /> : <EyeIcon size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="preview-row">
                      <span className="preview-label">Statut :</span>
                      <span className={`preview-value status ${selectedNotification.status}`}>
                        {selectedNotification.status === 'read' ? 'Lu' : 'Non lu'}
                      </span>
                    </div>
                  </div>

                  <div className="notification-message-box">
                    <h4>Message complet</h4>
                    <div className="message-content">
                      <p><strong>Objet :</strong> Changement de votre mot de passe</p>
                      <p>Bonjour {user?.email},</p>
                      <p>Votre mot de passe a été modifié par l'administrateur.</p>
                      <p><strong>Raison :</strong> {selectedNotification.reason}</p>
                      <p><strong>Nouveau mot de passe :</strong> <span className="password-highlight">{showPassword ? selectedNotification.new_password : '••••••••'}</span></p>
                      <p>Nous vous recommandons de changer ce mot de passe après votre prochaine connexion.</p>
                      <p>Cordialement,<br/>L'équipe HSE Manager</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowNotificationModal(false)}
                >
                  Fermer
                </button>
                <button 
                  className="btn-delete"
                  onClick={() => {
                    if (window.confirm('Supprimer cette notification ?')) {
                      deleteNotification(selectedNotification.id);
                    }
                  }}
                >
                  <Trash2 size={16} /> Supprimer
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