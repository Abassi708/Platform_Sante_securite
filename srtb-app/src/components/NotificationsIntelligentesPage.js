// frontend/components/NotificationsIntelligentesPage.js
import React, { useState, useEffect } from 'react';
import { Bell, X, CheckCircle, Info, Clock, Filter, RefreshCw, Eye, ChevronLeft, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/NotificationsIntelligentesPage.css';

const NotificationsIntelligentesPage = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({ total: 0, nonLues: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: 'all', statut: 'all' });
  const [showFilters, setShowFilters] = useState(false);

  const typeColors = {
    URGENT: { bg: '#ef444420', color: '#ef4444', icon: '🔴', label: 'Urgent' },
    IMPORTANT: { bg: '#f59e0b20', color: '#f59e0b', icon: '🟠', label: 'Important' },
    INFO: { bg: '#3b82f620', color: '#3b82f6', icon: '🔵', label: 'Information' }
  };

  useEffect(() => {
    chargerNotifications();
  }, [filters]);

  const chargerNotifications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_API_URL}/api/notifications-intelligentes/mes-notifications?limite=100`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        let filtered = data.notifications || [];
        
        if (filters.type !== 'all') {
          filtered = filtered.filter(n => n.type === filters.type);
        }
        
        if (filters.statut !== 'all') {
          filtered = filtered.filter(n => n.statut === filters.statut);
        }
        
        setNotifications(filtered);
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  };

  // ✅ CORRECTION : Utiliser 'id' comme clé (pas 'id_notification')
  const marquerCommeLue = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/notifications-intelligentes/${id}/lire`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Mettre à jour localement
        setNotifications(prev => prev.map(n => 
          n.id === id ? { ...n, statut: 'lu' } : n
        ));
        setStats(prev => ({ ...prev, nonLues: prev.nonLues - 1 }));
      }
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
      
      setNotifications(prev => prev.map(n => ({ ...n, statut: 'lu' })));
      setStats(prev => ({ ...prev, nonLues: 0 }));
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="notifications-page">
      
      {/* HEADER */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ChevronLeft size={20} />
        </button>
        <div className="header-title">
          <Bell size={24} />
          <h1>Notifications intelligentes</h1>
        </div>
        <div className="header-actions">
          <button className="btn-icon" onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} />
          </button>
          <button className="btn-icon" onClick={chargerNotifications}>
            <RefreshCw size={18} />
          </button>
          {stats.nonLues > 0 && (
            <button className="btn-primary" onClick={marquerToutLu}>
              <CheckCircle size={16} /> Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {/* STATS RAPIDES */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#8B5CF620', color: '#8B5CF6' }}>
            <Bell size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Total</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#ef444420', color: '#ef4444' }}>
            <Eye size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Non lues</span>
            <span className="stat-value">{stats.nonLues}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}>
            <CheckCircle size={20} />
          </div>
          <div className="stat-content">
            <span className="stat-label">Lues</span>
            <span className="stat-value">{stats.total - stats.nonLues}</span>
          </div>
        </div>
      </div>

      {/* FILTRES */}
      {showFilters && (
        <div className="filters-panel">
          <div className="filters-row">
            <select 
              value={filters.type} 
              onChange={(e) => setFilters({...filters, type: e.target.value})}
            >
              <option value="all">Tous les types</option>
              <option value="URGENT">🔴 Urgent</option>
              <option value="IMPORTANT">🟠 Important</option>
              <option value="INFO">🔵 Information</option>
            </select>
            
            <select 
              value={filters.statut} 
              onChange={(e) => setFilters({...filters, statut: e.target.value})}
            >
              <option value="all">Tous les statuts</option>
              <option value="non_lu">Non lu</option>
              <option value="lu">Lu</option>
            </select>
          </div>
        </div>
      )}

      {/* LISTE DES NOTIFICATIONS */}
      <div className="notifications-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Chargement des notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <h3>Aucune notification</h3>
            <p>Vous n'avez pas de notifications pour le moment</p>
          </div>
        ) : (
          notifications.map(notif => {
            const typeStyle = typeColors[notif.type] || typeColors.INFO;
            
            return (
              <div 
                key={notif.id}
                className={`notification-card ${notif.statut === 'non_lu' ? 'unread' : ''}`}
              >
                <div className="notification-indicator" style={{ background: typeStyle.color }} />
                
                <div className="notification-icon" style={{ background: typeStyle.bg }}>
                  <span>{typeStyle.icon}</span>
                </div>
                
                <div className="notification-content">
                  <div className="notification-header">
                    <div className="notification-title">
                      <span className="type-badge" style={{ background: typeStyle.bg, color: typeStyle.color }}>
                        {typeStyle.label}
                      </span>
                      <h3>{notif.titre}</h3>
                    </div>
                    <span className="notification-time">
                      <Clock size={12} /> {formatDate(notif.created_at)}
                    </span>
                  </div>
                  
                  <p className="notification-message">{notif.message}</p>
                  
                  {notif.action_suggested && (
                    <div className="notification-action">
                      <Zap size={12} />
                      <span>Action : {notif.action_suggested}</span>
                    </div>
                  )}
                </div>
                
                <div className="notification-actions">
                  {notif.statut === 'non_lu' ? (
                    <button 
                      className="action-btn mark-read"
                      onClick={() => marquerCommeLue(notif.id)}
                      title="Marquer comme lu"
                    >
                      <Eye size={14} />
                    </button>
                  ) : (
                    <span className="read-badge">Lu</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsIntelligentesPage;