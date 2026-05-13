// src/components/HistoriqueConnexions.js
import React, { useState, useEffect } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  X,
  CheckCircle,
  XCircle,
  Clock,
  Globe,
  Smartphone,
  Laptop,
  Monitor,
  Tablet,
  User,
  Shield,
  AlertCircle,
  ArrowLeft,
  Eye,
  Copy,
  FileText,
  PieChart,
  TrendingUp,
  Users,
  Zap,
  Activity,
  LogOut,
  Key,
  Crown,
  Wrench,
  Heart,
  HelpCircle,
  Trash2,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/HistoriqueConnexions.css';

const HistoriqueConnexions = () => {
  const navigate = useNavigate();
  
  // ========== ÉTATS ==========
  const [connexions, setConnexions] = useState([]);
  const [filteredConnexions, setFilteredConnexions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedConnexion, setSelectedConnexion] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [connexionToDelete, setConnexionToDelete] = useState(null);
  const [error, setError] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  
  // ========== STATS DE BASE ==========
  const [baseStats, setBaseStats] = useState({
    total: 0,
    success: 0,
    failed: 0,
    uniqueUsers: 0,
    today: 0,
    week: 0,
    month: 0,
    successRate: 0,
    averagePerDay: 0,
    trend: 'stable'
  });

  // ========== HORLOGE EN TEMPS RÉEL ==========
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

  // Charger les données depuis l'API
  useEffect(() => {
    fetchHistorique();
  }, []);

  // Filtrer les données
  useEffect(() => {
    if (!connexions.length) return;
    
    let filtered = [...connexions];
    
    if (searchTerm) {
      filtered = filtered.filter(c => 
        (c.user_email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (c.ip_address || '').includes(searchTerm) ||
        (c.user_role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.location || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedRole !== 'all') {
      filtered = filtered.filter(c => c.user_role === selectedRole);
    }
    
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(c => c.success === (selectedStatus === 'success' ? 1 : 0));
    }
    
    if (dateRange === 'today') {
      const today = new Date().toDateString();
      filtered = filtered.filter(c => new Date(c.timestamp).toDateString() === today);
    } else if (dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(c => new Date(c.timestamp) >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(c => new Date(c.timestamp) >= monthAgo);
    } else if (dateRange === 'custom' && startDate && endDate) {
      filtered = filtered.filter(c => {
        const date = new Date(c.timestamp);
        return date >= new Date(startDate) && date <= new Date(endDate + 'T23:59:59');
      });
    }
    
    setFilteredConnexions(filtered);
    setCurrentPage(1);
  }, [connexions, searchTerm, selectedRole, selectedStatus, dateRange, startDate, endDate]);

  // ========== FONCTIONS API ==========
  
  const fetchHistorique = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Session expirée - Veuillez vous reconnecter');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/historique?page=1&limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 401) {
        setError('Session expirée - Veuillez vous reconnecter');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      if (response.status === 403) {
        setError('Accès non autorisé');
        setTimeout(() => navigate('/'), 2000);
        return;
      }

      const data = await response.json();

      if (data.success && Array.isArray(data.data)) {
        setConnexions(data.data);
        setFilteredConnexions(data.data);
        
        // Calculer les stats de base
        calculateBaseStats(data.data);
      } else {
        setError('Format de données invalide');
      }

    } catch (err) {
      setError('Erreur de connexion au serveur');
    } finally {
      setLoading(false);
    }
  };

  // ========== CALCUL DES STATS DE BASE ==========
  const calculateBaseStats = (data) => {
    const total = data.length;
    const success = data.filter(c => c.success === 1).length;
    const failed = data.filter(c => c.success === 0).length;
    const uniqueUsers = [...new Set(data.map(c => c.user_email))].length;
    const successRate = total > 0 ? Math.round((success / total) * 100) : 0;
    
    // Connexions aujourd'hui
    const today = new Date().toDateString();
    const todayCount = data.filter(c => new Date(c.timestamp).toDateString() === today).length;
    
    // Connexions cette semaine
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekCount = data.filter(c => new Date(c.timestamp) >= weekAgo).length;
    
    // Connexions ce mois
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const monthCount = data.filter(c => new Date(c.timestamp) >= monthAgo).length;
    
    // Moyenne par jour
    const oldestDate = data.length > 0 
      ? new Date(Math.min(...data.map(c => new Date(c.timestamp))))
      : new Date();
    const daysDiff = Math.max(1, Math.ceil((new Date() - oldestDate) / (1000 * 60 * 60 * 24)));
    const averagePerDay = Math.round((total / daysDiff) * 10) / 10;
    
    // Tendance
    const lastWeek = data.filter(c => new Date(c.timestamp) >= weekAgo).length;
    const previousWeek = data.filter(c => {
      const date = new Date(c.timestamp);
      return date < weekAgo && date >= new Date(weekAgo - 7 * 24 * 60 * 60 * 1000);
    }).length;
    
    let trend = 'stable';
    if (lastWeek > previousWeek * 1.1) trend = 'hausse';
    if (lastWeek < previousWeek * 0.9) trend = 'baisse';
    
    setBaseStats({
      total,
      success,
      failed,
      uniqueUsers,
      today: todayCount,
      week: weekCount,
      month: monthCount,
      successRate,
      averagePerDay,
      trend
    });
  };

  // ========== FONCTION DE SUPPRESSION ==========
  const handleDeleteClick = (e, connexion) => {
    e.stopPropagation();
    setConnexionToDelete(connexion);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!connexionToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      
      // Simulation de suppression (à remplacer par un vrai appel API)
      setTimeout(() => {
        const updatedConnexions = connexions.filter(c => c.id !== connexionToDelete.id);
        setConnexions(updatedConnexions);
        calculateBaseStats(updatedConnexions);
        setShowDeleteModal(false);
        setConnexionToDelete(null);
      }, 500);
      
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
      setError('Erreur lors de la suppression');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setConnexionToDelete(null);
  };

  const handleRefresh = () => {
    fetchHistorique();
  };

  const handleExport = (format) => {
    setShowExportModal(false);
    
    setTimeout(() => {
      const dataToExport = filteredConnexions;
      const fileName = `historique_connexions_${new Date().toISOString().split('T')[0]}`;
      
      if (format === 'csv') {
        const headers = ['ID', 'Utilisateur', 'Rôle', 'Date', 'Heure', 'IP', 'Statut'];
        const csvContent = [
          headers.join(','),
          ...dataToExport.map(c => [
            c.id,
            c.user_email,
            c.user_role,
            new Date(c.timestamp).toLocaleDateString('fr-FR'),
            new Date(c.timestamp).toLocaleTimeString('fr-FR'),
            c.ip_address,
            c.success ? 'Succès' : 'Échec'
          ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === 'pdf') {
        alert('Export PDF simulé - ' + dataToExport.length + ' connexions');
      } else {
        alert('Export Excel simulé - ' + dataToExport.length + ' connexions');
      }
    }, 500);
  };

  // ========== FONCTION DE RETOUR ==========
  const handleBack = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      const role = user.role;
      
      switch(role) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'technicien':
          navigate('/technicien/dashboard');
          break;
        case 'social':
          navigate('/social/dashboard');
          break;
        case 'agent':
          navigate('/agent/dashboard');
          break;
        default:
          navigate('/');
      }
    } else {
      navigate('/');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleViewDetails = (connexion) => {
    setSelectedConnexion(connexion);
    setShowDetailsModal(true);
  };

  // ========== PAGINATION ==========
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredConnexions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredConnexions.length / itemsPerPage);

  // ========== FONCTIONS UTILITAIRES ==========
  
  const getRoleBadgeClass = (role) => {
    switch(role) {
      case 'admin': return 'hsc-role-admin';
      case 'technicien': return 'hsc-role-technicien';
      case 'social': return 'hsc-role-social';
      case 'agent': return 'hsc-role-agent';
      default: return 'hsc-role-unknown';
    }
  };

  const getRoleLabel = (role) => {
    switch(role) {
      case 'admin': return 'Administrateur';
      case 'technicien': return 'Technicien';
      case 'social': return 'Service Social';
      case 'agent': return 'Agent';
      default: return 'Inconnu';
    }
  };

  const getRoleIcon = (role) => {
    switch(role) {
      case 'admin': return <Crown size={14} />;
      case 'technicien': return <Wrench size={14} />;
      case 'social': return <Heart size={14} />;
      case 'agent': return <User size={14} />;
      default: return <User size={14} />;
    }
  };

  const getDeviceIcon = (userAgent) => {
    if (!userAgent) return <Monitor size={14} />;
    const ua = userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('iphone') || ua.includes('android')) {
      return <Smartphone size={14} />;
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      return <Tablet size={14} />;
    } else if (ua.includes('mac') || ua.includes('windows') || ua.includes('linux')) {
      return <Laptop size={14} />;
    }
    return <Monitor size={14} />;
  };

  const getBrowserInfo = (userAgent) => {
    if (!userAgent) return 'Inconnu';
    const ua = userAgent.toLowerCase();
    if (ua.includes('chrome')) return 'Chrome';
    if (ua.includes('firefox')) return 'Firefox';
    if (ua.includes('safari')) return 'Safari';
    if (ua.includes('edge')) return 'Edge';
    if (ua.includes('opera')) return 'Opera';
    return 'Autre';
  };

  const getLocationFlag = (ip) => {
    if (!ip) return '🌍';
    if (ip.includes('::1') || ip.includes('127.0.0.1')) return 'Local';
    if (ip.startsWith('192.168.')) return 'Réseau';
    return 'Internet';
  };

  // ========== FONCTION FORMATDATE CORRIGÉE ==========
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    
    // Remettre les heures à 0 pour comparer les jours uniquement
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    const diffTime = today - targetDay;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    let relativeTime = '';
    if (diffDays === 0) {
      // Aujourd'hui - on regarde les heures
      const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor((now - date) / (1000 * 60));
        if (diffMinutes < 1) {
          relativeTime = 'à l\'instant';
        } else if (diffMinutes < 60) {
          relativeTime = `il y a ${diffMinutes} min`;
        }
      } else if (diffHours < 24) {
        relativeTime = `il y a ${diffHours}h`;
      }
    } else if (diffDays === 1) {
      relativeTime = 'hier';
    } else if (diffDays < 7) {
      relativeTime = `il y a ${diffDays}j`;
    } else {
      relativeTime = '';
    }
    
    return {
      date: date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
      }),
      time: date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit'
      }),
      relative: relativeTime,
      full: date.toLocaleString('fr-FR')
    };
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copié dans le presse-papiers');
  };

  // ========== MODAL DE DÉTAILS ==========
  const DetailsModal = ({ isOpen, onClose, connexion }) => {
    if (!isOpen || !connexion) return null;
    
    const { date, time, relative } = formatDate(connexion.timestamp);
    
    return (
      <div className="hsc-modal-overlay" onClick={onClose}>
        <div className="hsc-modal-content" onClick={e => e.stopPropagation()}>
          <div className="hsc-modal-header">
            <h2>Détails de la connexion</h2>
            <button className="hsc-modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          
          <div className="hsc-modal-body">
            <div className="hsc-details-profile">
              <div className={`hsc-details-avatar ${connexion.user_role || 'unknown'}`}>
                {connexion.user_email?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="hsc-details-title">
                <h3>{connexion.user_email || 'Inconnu'}</h3>
                <span className={`hsc-role-badge ${getRoleBadgeClass(connexion.user_role)}`}>
                  {getRoleIcon(connexion.user_role)}
                  {getRoleLabel(connexion.user_role)}
                </span>
              </div>
            </div>
            
            <div className="hsc-details-grid">
              <div className="hsc-detail-card">
                <div className="hsc-detail-icon">
                  <Clock size={16} />
                </div>
                <div className="hsc-detail-content">
                  <span className="hsc-detail-label">Date & Heure</span>
                  <span className="hsc-detail-value">{date}</span>
                  <span className="hsc-detail-sub">{time}</span>
                  {relative && <span className="hsc-detail-badge">{relative}</span>}
                </div>
              </div>
              
              <div className="hsc-detail-card">
                <div className="hsc-detail-icon">
                  <Globe size={16} />
                </div>
                <div className="hsc-detail-content">
                  <span className="hsc-detail-label">Adresse IP</span>
                  <span className="hsc-detail-value">{connexion.ip_address || '0.0.0.0'}</span>
                  <span className="hsc-detail-sub">{getLocationFlag(connexion.ip_address)}</span>
                  <button className="hsc-copy-btn-small" onClick={() => copyToClipboard(connexion.ip_address)}>
                    <Copy size={12} />
                  </button>
                </div>
              </div>
              
              <div className="hsc-detail-card hsc-full-width">
                <div className="hsc-detail-icon">
                  <Monitor size={16} />
                </div>
                <div className="hsc-detail-content">
                  <span className="hsc-detail-label">Appareil</span>
                  <div className="hsc-device-detail">
                    {getDeviceIcon(connexion.user_agent)}
                    <span>{getBrowserInfo(connexion.user_agent)}</span>
                  </div>
                  <div className="hsc-user-agent-full">
                    {connexion.user_agent || 'Inconnu'}
                  </div>
                </div>
              </div>
              
              <div className="hsc-detail-card">
                <div className="hsc-detail-icon">
                  <Shield size={16} />
                </div>
                <div className="hsc-detail-content">
                  <span className="hsc-detail-label">Statut</span>
                  {connexion.success ? (
                    <span className="hsc-status-badge hsc-success">
                      <CheckCircle size={14} /> Succès
                    </span>
                  ) : (
                    <span className="hsc-status-badge hsc-failed">
                      <XCircle size={14} /> Échec
                    </span>
                  )}
                </div>
              </div>
              
              <div className="hsc-detail-card">
                <div className="hsc-detail-icon">
                  <Key size={16} />
                </div>
                <div className="hsc-detail-content">
                  <span className="hsc-detail-label">ID Utilisateur</span>
                  <span className="hsc-detail-value">#{connexion.user_id || 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hsc-modal-footer">
            <button className="hsc-btn-cancel" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========== MODAL STATISTIQUES ==========
  const StatsModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    
    return (
      <div className="hsc-modal-overlay" onClick={onClose}>
        <div 
          className="hsc-modal-content hsc-large" 
          onClick={e => e.stopPropagation()}
          style={{ 
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div className="hsc-modal-header" style={{ flexShrink: 0 }}>
            <h2>Statistiques détaillées</h2>
            <button className="hsc-modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          
          <div 
            className="hsc-modal-body" 
            style={{ 
              overflowY: 'auto',
              padding: '24px',
              flex: 1
            }}
          >
            <div className="hsc-stats-overview">
              <div className="hsc-stats-card hsc-primary">
                <div className="hsc-stats-icon">
                  <Activity size={24} />
                </div>
                <div className="hsc-stats-content">
                  <span className="hsc-stats-label">Taux de réussite</span>
                  <span className="hsc-stats-value">{baseStats.successRate}%</span>
                  <div className="hsc-stats-progress">
                    <div className="hsc-progress-bar" style={{ width: `${baseStats.successRate}%` }}></div>
                  </div>
                </div>
              </div>
              
              <div className="hsc-stats-card">
                <div className="hsc-stats-icon">
                  <Users size={24} />
                </div>
                <div className="hsc-stats-content">
                  <span className="hsc-stats-label">Utilisateurs uniques</span>
                  <span className="hsc-stats-value">{baseStats.uniqueUsers}</span>
                </div>
              </div>
              
              <div className="hsc-stats-card">
                <div className="hsc-stats-icon">
                  <TrendingUp size={24} />
                </div>
                <div className="hsc-stats-content">
                  <span className="hsc-stats-label">Moyenne/jour</span>
                  <span className="hsc-stats-value">{baseStats.averagePerDay}</span>
                </div>
              </div>
            </div>
            
            <div className="hsc-stats-grid">
              <div className="hsc-stat-box">
                <span className="hsc-stat-box-label">Aujourd'hui</span>
                <span className="hsc-stat-box-value">{baseStats.today}</span>
                <span className="hsc-stat-box-change">
                  {baseStats.today > 0 ? 'Actif' : 'Calme'}
                </span>
              </div>
              
              <div className="hsc-stat-box">
                <span className="hsc-stat-box-label">Cette semaine</span>
                <span className="hsc-stat-box-value">{baseStats.week}</span>
                <span className="hsc-stat-box-sub">connexions</span>
              </div>
              
              <div className="hsc-stat-box">
                <span className="hsc-stat-box-label">Ce mois</span>
                <span className="hsc-stat-box-value">{baseStats.month}</span>
                <span className="hsc-stat-box-sub">connexions</span>
              </div>
              
              <div className="hsc-stat-box">
                <span className="hsc-stat-box-label">Total</span>
                <span className="hsc-stat-box-value">{baseStats.total}</span>
                <span className="hsc-stat-box-sub">connexions</span>
              </div>
            </div>
            
            <div className="hsc-stats-chart">
              <h3>Répartition par rôle</h3>
              <div className="hsc-role-distribution">
                {['admin', 'technicien', 'social', 'agent', 'inconnu'].map(role => {
                  const count = connexions.filter(c => c.user_role === role).length;
                  const percentage = baseStats.total > 0 ? Math.round((count / baseStats.total) * 100) : 0;
                  
                  return (
                    <div key={role} className="hsc-role-dist-item">
                      <div className="hsc-role-dist-label">
                        {getRoleIcon(role)}
                        {getRoleLabel(role)}
                      </div>
                      <div className="hsc-role-dist-bar">
                        <div className="hsc-dist-bar-fill" style={{ width: `${percentage}%` }}></div>
                      </div>
                      <span className="hsc-role-dist-percent">{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="hsc-stats-insights">
              <h3>
                <Sparkles size={16} />
                Insights
              </h3>
              <div className="hsc-insights-grid">
                <div className="hsc-insight-item">
                  <Activity size={14} />
                  <span>
                    {baseStats.successRate > 90 ? 'Excellent taux de connexion' : 
                     baseStats.successRate > 75 ? 'Bon taux de connexion' : 
                     'Taux de connexion à améliorer'}
                  </span>
                </div>
                <div className="hsc-insight-item">
                  <TrendingUp size={14} />
                  <span>
                    {baseStats.trend === 'hausse' ? 'Activité en hausse' : 
                     baseStats.trend === 'baisse' ? 'Activité en baisse' : 
                     'Activité stable'}
                  </span>
                </div>
                <div className="hsc-insight-item">
                  <Users size={14} />
                  <span>
                    {baseStats.uniqueUsers} utilisateur{baseStats.uniqueUsers > 1 ? 's' : ''} actif{baseStats.uniqueUsers > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="hsc-insight-item">
                  <Calendar size={14} />
                  <span>
                    Moyenne: {baseStats.averagePerDay} connexions/jour
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="hsc-modal-footer" style={{ flexShrink: 0 }}>
            <button className="hsc-btn-cancel" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========== MODAL EXPORT ==========
  const ExportModal = ({ isOpen, onClose, onExport }) => {
    if (!isOpen) return null;
    
    return (
      <div className="hsc-modal-overlay" onClick={onClose}>
        <div className="hsc-modal-content hsc-small" onClick={e => e.stopPropagation()}>
          <div className="hsc-modal-header">
            <h2>Exporter les données</h2>
            <button className="hsc-modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          
          <div className="hsc-modal-body">
            <p className="hsc-export-info">
              <FileText size={16} />
              {filteredConnexions.length} connexions à exporter
            </p>
            
            <div className="hsc-export-options">
              <button className="hsc-export-option" onClick={() => onExport('csv')}>
                <Download size={20} />
                <div>
                  <strong>CSV</strong>
                  <span>Format tableur</span>
                </div>
              </button>
              
              <button className="hsc-export-option" onClick={() => onExport('excel')}>
                <Download size={20} />
                <div>
                  <strong>Excel</strong>
                  <span>Microsoft Excel</span>
                </div>
              </button>
              
              <button className="hsc-export-option" onClick={() => onExport('pdf')}>
                <Download size={20} />
                <div>
                  <strong>PDF</strong>
                  <span>Document PDF</span>
                </div>
              </button>
            </div>
          </div>
          
          <div className="hsc-modal-footer">
            <button className="hsc-btn-cancel" onClick={onClose}>
              Annuler
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========== MODAL DE CONFIRMATION SUPPRESSION ==========
  const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, connexion }) => {
    if (!isOpen || !connexion) return null;
    
    return (
      <div className="hsc-modal-overlay" onClick={onClose}>
        <div className="hsc-modal-content hsc-small" onClick={e => e.stopPropagation()}>
          <div className="hsc-modal-header">
            <h2>Confirmer la suppression</h2>
            <button className="hsc-modal-close" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          
          <div className="hsc-modal-body">
            <div className="hsc-delete-icon">
              <AlertCircle size={48} />
            </div>
            <p className="hsc-delete-message">
              Êtes-vous sûr de vouloir supprimer cette connexion ?
            </p>
            <p className="hsc-delete-details">
              <strong>{connexion.user_email}</strong> - {formatDate(connexion.timestamp).date}
            </p>
            <p className="hsc-delete-warning">Cette action est irréversible.</p>
          </div>
          
          <div className="hsc-modal-footer">
            <button className="hsc-btn-cancel" onClick={onClose}>
              Annuler
            </button>
            <button className="hsc-btn-delete" onClick={onConfirm}>
              <Trash2 size={16} />
              Supprimer
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ========== RENDU PRINCIPAL ==========
  
  return (
    <div className="hsc-historique-container">
      
      {/* ========== BACKGROUND ========== */}
      <div className="hsc-bg-pattern"></div>

      {/* ========== HEADER ========== */}
      <div className="hsc-historique-header">
        <div className="hsc-header-left">
          <div className="hsc-header-icon-wrapper">
            <History size={24} />
          </div>
          <div className="hsc-header-title">
            <h1>Historique des connexions</h1>
            <div className="hsc-header-greeting">
              <Sparkles size={12} />
              <span>{greeting}, {(() => {
                const userData = localStorage.getItem('user');
                if (userData) {
                  const user = JSON.parse(userData);
                  return user.role === 'admin' ? 'Administrateur' : 
                         user.role === 'technicien' ? 'Technicien' :
                         user.role === 'social' ? 'Service Social' :
                         user.role === 'agent' ? 'Agent' : 'Utilisateur';
                }
                return 'Administrateur';
              })()}</span>
            </div>
          </div>
        </div>

        <div className="hsc-header-right">
          <div className="hsc-datetime-display">
            <div className="hsc-time-display">
              <Clock size={14} />
              <span>{currentTime.toLocaleTimeString('fr-FR')}</span>
            </div>
            <div className="hsc-date-display">
              <Calendar size={14} />
              <span>{currentTime.toLocaleDateString('fr-FR', { 
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
              })}</span>
            </div>
          </div>
          
          <div className="hsc-live-indicator">
            <span className="hsc-live-dot"></span>
            <span>Live</span>
          </div>
          
          <button 
            className="hsc-header-btn hsc-stats-btn"
            onClick={() => setShowStatsModal(true)}
            title="Statistiques"
          >
            <PieChart size={16} />
            <span>Stats</span>
          </button>
          
          <button 
            className="hsc-header-btn hsc-export-btn"
            onClick={() => setShowExportModal(true)}
            title="Exporter"
          >
            <Download size={16} />
            <span>Export</span>
          </button>
          
          <button 
            className="hsc-header-btn hsc-refresh-btn"
            onClick={handleRefresh}
            title="Actualiser"
          >
            <RefreshCw size={16} />
          </button>
          
          <button 
            className="hsc-header-btn hsc-back-btn"
            onClick={handleBack}
            title="Retour"
          >
            <ArrowLeft size={16} />
          </button>
          
          <button 
            className="hsc-header-btn hsc-logout-btn"
            onClick={handleLogout}
            title="Déconnexion"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* ========== STATS RAPIDES ========== */}
      <div className="hsc-quick-stats">
        <div className="hsc-quick-stat-card">
          <div className="hsc-quick-stat-icon">
            <Activity size={18} />
          </div>
          <div className="hsc-quick-stat-content">
            <span className="hsc-quick-stat-label">Taux de succès</span>
            <span className="hsc-quick-stat-value">{baseStats.successRate}%</span>
          </div>
        </div>
        
        <div className="hsc-quick-stat-card">
          <div className="hsc-quick-stat-icon">
            <Users size={18} />
          </div>
          <div className="hsc-quick-stat-content">
            <span className="hsc-quick-stat-label">Utilisateurs uniques</span>
            <span className="hsc-quick-stat-value">{baseStats.uniqueUsers}</span>
          </div>
        </div>
        
        <div className="hsc-quick-stat-card">
          <div className="hsc-quick-stat-icon">
            <Clock size={18} />
          </div>
          <div className="hsc-quick-stat-content">
            <span className="hsc-quick-stat-label">Aujourd'hui</span>
            <span className="hsc-quick-stat-value">{baseStats.today}</span>
          </div>
        </div>
        
        <div className="hsc-quick-stat-card">
          <div className="hsc-quick-stat-icon">
            <TrendingUp size={18} />
          </div>
          <div className="hsc-quick-stat-content">
            <span className="hsc-quick-stat-label">Cette semaine</span>
            <span className="hsc-quick-stat-value">{baseStats.week}</span>
          </div>
        </div>
        
        <div className="hsc-quick-stat-card">
          <div className="hsc-quick-stat-icon">
            <Calendar size={18} />
          </div>
          <div className="hsc-quick-stat-content">
            <span className="hsc-quick-stat-label">Ce mois</span>
            <span className="hsc-quick-stat-value">{baseStats.month}</span>
          </div>
        </div>
        
        <div className="hsc-quick-stat-card">
          <div className="hsc-quick-stat-icon">
            <Zap size={18} />
          </div>
          <div className="hsc-quick-stat-content">
            <span className="hsc-quick-stat-label">Total</span>
            <span className="hsc-quick-stat-value">{baseStats.total}</span>
          </div>
        </div>
      </div>

      {/* ========== FILTRES ========== */}
      <div className="hsc-filters-section">
        <div className="hsc-search-wrapper">
          <Search size={16} className="hsc-search-icon" />
          <input
            type="text"
            className="hsc-search-input"
            placeholder="Rechercher par email, IP, rôle..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="hsc-clear-btn" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <button 
          className={`hsc-filter-btn ${showFilters ? 'hsc-active' : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} />
          <span>Filtres</span>
          {(selectedRole !== 'all' || selectedStatus !== 'all' || dateRange !== 'all') && (
            <span className="hsc-filter-badge">
              {[selectedRole !== 'all', selectedStatus !== 'all', dateRange !== 'all'].filter(Boolean).length}
            </span>
          )}
        </button>
      </div>

      {/* ========== PANNEAU DE FILTRES ========== */}
      {showFilters && (
        <div className="hsc-filters-panel">
          <div className="hsc-filters-header">
            <h3>Filtres avancés</h3>
            <button onClick={() => {
              setSelectedRole('all');
              setSelectedStatus('all');
              setDateRange('all');
              setStartDate('');
              setEndDate('');
            }}>
              Réinitialiser
            </button>
          </div>
          
          <div className="hsc-filters-grid">
            <div className="hsc-filter-group">
              <label>Rôle</label>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                <option value="all">Tous les rôles</option>
                <option value="admin">Administrateur</option>
                <option value="technicien">Technicien</option>
                <option value="social">Service social</option>
                <option value="agent">Agent</option>
              </select>
            </div>

            <div className="hsc-filter-group">
              <label>Statut</label>
              <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
                <option value="all">Tous</option>
                <option value="success">Succès</option>
                <option value="failed">Échec</option>
              </select>
            </div>

            <div className="hsc-filter-group">
              <label>Période</label>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                <option value="all">Tout l'historique</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
                <option value="custom">Personnalisé</option>
              </select>
            </div>

            {dateRange === 'custom' && (
              <>
                <div className="hsc-filter-group">
                  <label>Du</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="hsc-filter-group">
                  <label>Au</label>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          
          <div className="hsc-filters-footer">
            <span className="hsc-filter-result">
              {filteredConnexions.length} résultat{filteredConnexions.length > 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* ========== CONTENU PRINCIPAL ========== */}
      <div className="hsc-content-wrapper">
        {loading ? (
          <div className="hsc-loading-container">
            <div className="hsc-loader-spinner"></div>
            <h3>Chargement</h3>
            <p>Récupération des données...</p>
          </div>
        ) : error ? (
          <div className="hsc-error-container">
            <AlertCircle size={40} />
            <h3>Erreur</h3>
            <p>{error}</p>
            <button className="hsc-retry-btn" onClick={fetchHistorique}>
              <RefreshCw size={14} />
              Réessayer
            </button>
          </div>
        ) : filteredConnexions.length === 0 ? (
          <div className="hsc-empty-container">
            <History size={48} />
            <h3>Aucune connexion</h3>
            <p>Aucune connexion ne correspond à vos critères.</p>
            <button className="hsc-reset-filters-btn" onClick={() => {
              setSearchTerm('');
              setSelectedRole('all');
              setSelectedStatus('all');
              setDateRange('all');
            }}>
              Réinitialiser
            </button>
          </div>
        ) : (
          <>
            {/* ========== TABLEAU ========== */}
            <div className="hsc-table-wrapper">
              <table className="hsc-historique-table">
                <thead>
                  <tr>
                    <th>Utilisateur</th>
                    <th>Rôle</th>
                    <th>Date & Heure</th>
                    <th>IP</th>
                    <th>Navigateur</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, index) => {
                    const { date, time, relative } = formatDate(item.timestamp);
                    return (
                      <tr
                        key={item.id || index}
                        className="hsc-historique-row"
                        onClick={() => handleViewDetails(item)}
                      >
                        <td>
                          <div className="hsc-user-cell">
                            <div className={`hsc-user-avatar ${item.user_role || 'unknown'}`}>
                              {item.user_email?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div className="hsc-user-info">
                              <span className="hsc-user-email">{item.user_email || 'Inconnu'}</span>
                              <span className="hsc-user-id">ID: {item.user_id || 'N/A'}</span>
                            </div>
                          </div>
                        </td>
                        
                        <td>
                          <span className={`hsc-role-badge ${getRoleBadgeClass(item.user_role)}`}>
                            {getRoleIcon(item.user_role)}
                            {getRoleLabel(item.user_role)}
                          </span>
                        </td>
                        
                        <td>
                          <div className="hsc-date-cell">
                            <span className="hsc-date-main">{date}</span>
                            <span className="hsc-date-time">{time}</span>
                            {relative && <span className="hsc-date-relative">{relative}</span>}
                          </div>
                        </td>
                        
                        <td>
                          <div className="hsc-ip-cell">
                            <span className="hsc-ip-address">{item.ip_address || '0.0.0.0'}</span>
                            <span className="hsc-ip-location">{getLocationFlag(item.ip_address)}</span>
                          </div>
                        </td>
                        
                        <td>
                          <div className="hsc-device-cell">
                            {getDeviceIcon(item.user_agent)}
                            <span>{getBrowserInfo(item.user_agent)}</span>
                          </div>
                        </td>
                        
                        <td>
                          {item.success ? (
                            <span className="hsc-status-badge hsc-success">
                              <CheckCircle size={12} />
                              Succès
                            </span>
                          ) : (
                            <span className="hsc-status-badge hsc-failed">
                              <XCircle size={12} />
                              Échec
                            </span>
                          )}
                        </td>
                        
                        <td>
                          <div className="hsc-action-buttons">
                            <button 
                              className="hsc-view-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewDetails(item);
                              }}
                              title="Détails"
                            >
                              <Eye size={14} />
                            </button>
                            <button 
                              className="hsc-delete-btn"
                              onClick={(e) => handleDeleteClick(e, item)}
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ========== PAGINATION ========== */}
            <div className="hsc-pagination-container">
              <div className="hsc-pagination-info">
                {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredConnexions.length)} sur {filteredConnexions.length}
              </div>
              
              <div className="hsc-pagination-controls">
                <button
                  className={`hsc-pagination-arrow ${currentPage === 1 ? 'hsc-disabled' : ''}`}
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </button>
                
                <div className="hsc-pagination-pages">
                  {[...Array(totalPages)].map((_, i) => {
                    const pageNum = i + 1;
                    if (
                      pageNum === 1 ||
                      pageNum === totalPages ||
                      (pageNum >= currentPage - 2 && pageNum <= currentPage + 2)
                    ) {
                      return (
                        <button
                          key={pageNum}
                          className={`hsc-pagination-page ${currentPage === pageNum ? 'hsc-active' : ''}`}
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      );
                    } else if (pageNum === currentPage - 3 || pageNum === currentPage + 3) {
                      return <span key={pageNum} className="hsc-pagination-ellipsis">...</span>;
                    }
                    return null;
                  })}
                </div>
                
                <button
                  className={`hsc-pagination-arrow ${currentPage === totalPages ? 'hsc-disabled' : ''}`}
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ========== MODALS ========== */}
      {showDetailsModal && (
        <DetailsModal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          connexion={selectedConnexion}
        />
      )}
      
      {showStatsModal && (
        <StatsModal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
        />
      )}
      
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          onExport={handleExport}
        />
      )}

      {showDeleteModal && (
        <DeleteConfirmModal
          isOpen={showDeleteModal}
          onClose={cancelDelete}
          onConfirm={confirmDelete}
          connexion={connexionToDelete}
        />
      )}
    </div>
  );
};

export default HistoriqueConnexions;