// frontend/components/NotificationsIntelligentesPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  Bell, X, CheckCircle, Info, Clock, Filter, RefreshCw, Eye, 
  ChevronLeft, Zap, AlertCircle, AlertTriangle 
} from 'lucide-react';
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
    URGENT: { bg: 'var(--nip-urgent-bg)', color: 'var(--nip-urgent-icon)', label: 'Urgent', className: 'nip-type-URGENT' },
    IMPORTANT: { bg: 'var(--nip-important-bg)', color: 'var(--nip-important-icon)', label: 'Important', className: 'nip-type-IMPORTANT' },
    INFO: { bg: 'var(--nip-info-bg)', color: 'var(--nip-info-icon)', label: 'Information', className: 'nip-type-INFO' },
    RAPPEL: { bg: 'var(--nip-rappel-bg)', color: 'var(--nip-rappel-icon)', label: 'Rappel', className: 'nip-type-RAPPEL' },
    ALERTE: { bg: 'var(--nip-alerte-bg)', color: 'var(--nip-alerte-icon)', label: 'Alerte', className: 'nip-type-ALERTE' }
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

  const marquerCommeLue = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/notifications-intelligentes/${id}/lire`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
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

  const getTypeIcon = (type) => {
    switch(type) {
      case 'URGENT': return <AlertCircle size={20} />;
      case 'IMPORTANT': return <Info size={20} />;
      case 'INFO': return <Bell size={20} />;
      case 'RAPPEL': return <Clock size={20} />;
      case 'ALERTE': return <Zap size={20} />;
      default: return <Bell size={20} />;
    }
  };

  return (
    <div className="nip-page">
      
      {/* HEADER */}
      <div className="nip-header-premium">
        <div className="nip-header-content">
          <button className="nip-back-btn" onClick={() => navigate(-1)}>
            <ChevronLeft size={20} />
          </button>
          
          <div className="nip-title-section">
            <div className="nip-icon-wrapper">
              <div className="nip-icon">
                <Bell size={24} />
              </div>
            </div>
            <div>
              <h1>Notifications intelligentes</h1>
              <p>Centre de notifications · Service HSE</p>
            </div>
          </div>

          <div className="nip-header-actions">
            <button 
              className={`nip-filter-btn ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} /> Filtres
            </button>
            <button className="nip-refresh-btn" onClick={chargerNotifications}>
              <RefreshCw size={16} /> Actualiser
            </button>
            {stats.nonLues > 0 && (
              <button className="nip-mark-all-btn" onClick={marquerToutLu}>
                <CheckCircle size={16} /> <span>Tout marquer comme lu</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* STATISTIQUES */}
      <div className="nip-stats-premium">
        <div className="nip-stat-card">
          <div className="nip-stat-icon blue">
            <Bell size={22} />
          </div>
          <div className="nip-stat-info">
            <span className="nip-stat-value">{stats.total}</span>
            <span className="nip-stat-label">Total notifications</span>
          </div>
        </div>
        <div className="nip-stat-card">
          <div className="nip-stat-icon red">
            <Eye size={22} />
          </div>
          <div className="nip-stat-info">
            <span className="nip-stat-value">{stats.nonLues}</span>
            <span className="nip-stat-label">Non lues</span>
          </div>
        </div>
        <div className="nip-stat-card">
          <div className="nip-stat-icon green">
            <CheckCircle size={22} />
          </div>
          <div className="nip-stat-info">
            <span className="nip-stat-value">{stats.total - stats.nonLues}</span>
            <span className="nip-stat-label">Lues</span>
          </div>
        </div>
      </div>

      {/* FILTRES */}
      {showFilters && (
        <div className="nip-filters-premium">
          <div className="nip-filters-row">
            <div className="nip-filter-group">
              <label>Type</label>
              <select 
                value={filters.type} 
                onChange={(e) => setFilters({...filters, type: e.target.value})}
              >
                <option value="all">Tous les types</option>
                <option value="URGENT">Urgent</option>
                <option value="IMPORTANT">Important</option>
                <option value="INFO">Information</option>
                <option value="RAPPEL">Rappel</option>
                <option value="ALERTE">Alerte</option>
              </select>
            </div>
            
            <div className="nip-filter-group">
              <label>Statut</label>
              <select 
                value={filters.statut} 
                onChange={(e) => setFilters({...filters, statut: e.target.value})}
              >
                <option value="all">Tous les statuts</option>
                <option value="non_lu">Non lues</option>
                <option value="lu">Lues</option>
              </select>
            </div>

            {(filters.type !== 'all' || filters.statut !== 'all') && (
              <button 
                className="nip-reset-filters"
                onClick={() => setFilters({ type: 'all', statut: 'all' })}
              >
                <X size={14} /> Réinitialiser
              </button>
            )}
          </div>
        </div>
      )}

      {/* LISTE DES NOTIFICATIONS */}
      <div className="nip-list-premium">
        {loading ? (
          <div className="nip-loading-state">
            <div className="nip-spinner"></div>
            <p>Chargement des notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="nip-empty-state">
            <div className="nip-empty-icon">
              <Bell size={48} strokeWidth={1} />
            </div>
            <h3>Aucune notification</h3>
            <p>Vous n'avez pas de notifications pour le moment</p>
          </div>
        ) : (
          notifications.map(notif => {
            const type = typeColors[notif.type] || typeColors.INFO;
            const isUnread = notif.statut === 'non_lu';
            
            return (
              <div 
                key={notif.id}
                className={`nip-card-premium ${type.className} ${isUnread ? 'unread' : ''}`}
              >
                <div className="nip-card-indicator"></div>
                
                <div className="nip-card-icon">
                  {getTypeIcon(notif.type)}
                </div>
                
                <div className="nip-card-content">
                  <div className="nip-card-header">
                    <div className="nip-card-badges">
                      <span className="nip-type-badge">{type.label}</span>
                      {notif.action_suggested && (
                        <span className="nip-action-badge">
                          <Zap size={10} /> Action suggérée
                        </span>
                      )}
                    </div>
                    <span className="nip-card-time">
                      <Clock size={11} /> {formatDate(notif.created_at)}
                    </span>
                  </div>
                  
                  <h4 className="nip-card-title">{notif.titre}</h4>
                  <p className="nip-card-message">{notif.message}</p>
                  
                  {notif.action_suggested && (
                    <div className="nip-card-action">
                      <Zap size={12} />
                      <span>Action : {notif.action_suggested}</span>
                    </div>
                  )}
                </div>
                
                <div className="nip-card-actions">
                  {isUnread ? (
                    <button 
                      className="nip-mark-read-btn"
                      onClick={() => marquerCommeLue(notif.id)}
                      title="Marquer comme lu"
                    >
                      <Eye size={15} />
                    </button>
                  ) : (
                    <span className="nip-read-badge">
                      <CheckCircle size={11} /> Lu
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FOOTER */}
      <div className="nip-footer">
        SRTB · Service HSE · Dr. Mahmoud Khelifi
      </div>
    </div>
  );
};

export default NotificationsIntelligentesPage;