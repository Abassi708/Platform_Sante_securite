// frontend/components/NotificationBadge.js
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom'; // ← AJOUTER CET IMPORT
import { Bell, X, CheckCircle, AlertTriangle, Info, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/NotificationBadge.css';

const NotificationBadge = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, nonLues: 0 });
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const buttonRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  const typeColors = {
    URGENT: { bg: '#ef444420', color: '#ef4444', icon: '🔴' },
    IMPORTANT: { bg: '#f59e0b20', color: '#f59e0b', icon: '🟠' },
    INFO: { bg: '#3b82f620', color: '#3b82f6', icon: '🔵' },
    RAPPEL: { bg: '#10b98120', color: '#10b981', icon: '🟢' },
    SUGGESTION: { bg: '#8b5cf620', color: '#8b5cf6', icon: '🟣' }
  };

  useEffect(() => {
    chargerNotifications();
    const interval = setInterval(chargerNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Écouter la fermeture des autres dropdowns
  useEffect(() => {
    const handleCloseOther = (e) => {
      if (e.detail !== 'planning') {
        setShowDropdown(false);
      }
    };
    
    window.addEventListener('closeOtherDropdown', handleCloseOther);
    return () => window.removeEventListener('closeOtherDropdown', handleCloseOther);
  }, []);

  // Mettre à jour la position
  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 5,
        right: window.innerWidth - rect.right - window.scrollX
      });
    }
  }, [showDropdown]);

  const handleToggle = () => {
    // Fermer l'autre dropdown
    const event = new CustomEvent('closeOtherDropdown', { detail: 'planning' });
    window.dispatchEvent(event);
    
    // Ouvrir celui-ci
    setShowDropdown(!showDropdown);
  };

  const chargerNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/notifications-intelligentes/mes-notifications?limite=5`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.notifications || []);
        setStats(data.stats || { total: 0, nonLues: 0 });
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  };

  const marquerCommeLue = async (id, e) => {
    e.stopPropagation();
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL}/api/notifications-intelligentes/${id}/lire`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications(notifications.filter(n => n.id !== id));
      setStats(prev => ({ ...prev, nonLues: prev.nonLues - 1 }));
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const marquerToutLu = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL}/api/notifications-intelligentes/tout-lire`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      setNotifications([]);
      setStats(prev => ({ ...prev, nonLues: 0 }));
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'À l\'instant';
    if (diff < 3600) return `Il y a ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)} h`;
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  // Composant Portal
  const Portal = ({ children }) => {
    const [container] = useState(() => document.createElement('div'));
    
    useEffect(() => {
      document.body.appendChild(container);
      return () => {
        document.body.removeChild(container);
      };
    }, [container]);
    
    return ReactDOM.createPortal(children, container);
  };

  return (
    <div className="notification-badge-container">
      <button 
        ref={buttonRef}
        className={`notification-badge ${stats.nonLues > 0 ? 'has-notifications' : ''}`}
        onClick={handleToggle}
      >
        <Bell size={20} />
        {stats.nonLues > 0 && (
          <span className="badge-count">{stats.nonLues > 9 ? '9+' : stats.nonLues}</span>
        )}
      </button>

      <AnimatePresence>
        {showDropdown && (
          <Portal>
            <>
              <div className="dropdown-backdrop" onClick={() => setShowDropdown(false)} />
              <motion.div 
                className="notification-dropdown portal-dropdown"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  position: 'fixed',
                  top: dropdownPosition.top,
                  right: dropdownPosition.right,
                  zIndex: 999999
                }}
              >
                <div className="dropdown-header">
                  <div>
                    <h3>Notifications</h3>
                    {stats.nonLues > 0 && (
                      <span className="non-lues-badge">{stats.nonLues} non lue{stats.nonLues > 1 ? 's' : ''}</span>
                    )}
                  </div>
                  <div className="header-actions">
                    {stats.nonLues > 0 && (
                      <button onClick={marquerToutLu} title="Tout marquer comme lu">
                        <CheckCircle size={14} />
                      </button>
                    )}
                    <button onClick={() => {
                      setShowDropdown(false);
                      navigate('/notifications-intelligentes');
                    }} title="Voir tout">
                      <span>Voir tout</span>
                    </button>
                  </div>
                </div>

                <div className="dropdown-list">
                  {notifications.length === 0 ? (
                    <div className="dropdown-empty">
                      <Bell size={32} />
                      <p>Aucune nouvelle notification</p>
                    </div>
                  ) : (
                    notifications.map(notif => {
                      const typeStyle = typeColors[notif.type] || typeColors.INFO;
                      
                      return (
                        <div 
                          key={notif.id} 
                          className="dropdown-item"
                          onClick={() => {
                            setShowDropdown(false);
                            navigate('/notifications-intelligentes');
                          }}
                        >
                          <div className="item-icon" style={{ background: typeStyle.bg }}>
                            <span>{typeStyle.icon}</span>
                          </div>
                          <div className="item-content">
                            <div className="item-title-row">
                              <span className="item-title">{notif.titre}</span>
                              <span className="item-time">{formatDate(notif.created_at)}</span>
                            </div>
                            <p className="item-message">{notif.message.substring(0, 60)}...</p>
                            {notif.action_suggested && (
                              <span className="item-action">
                                <Info size={10} /> {notif.action_suggested}
                              </span>
                            )}
                          </div>
                          <button 
                            className="item-mark-read"
                            onClick={(e) => marquerCommeLue(notif.id, e)}
                            title="Marquer comme lu"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                {notifications.length > 0 && (
                  <div className="dropdown-footer">
                    <button onClick={() => {
                      setShowDropdown(false);
                      navigate('/notifications-intelligentes');
                    }}>
                      Voir toutes les notifications
                    </button>
                  </div>
                )}
              </motion.div>
            </>
          </Portal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBadge;