// src/components/AuditLog.js
import React, { useState, useEffect } from 'react';
import { 
  Activity, Search, Filter, Calendar, ChevronLeft, ChevronRight,
  Download, RefreshCw, X, Eye, User, Shield, Clock, Globe,
  Edit, Trash2, PlusCircle, LogIn, LogOut, Key, AlertCircle,
  FileText, Database, Settings, Users, Heart, Wrench,
  Crown, CheckCircle, XCircle, Info, Copy, TrendingUp,
  Printer, FileSpreadsheet, Maximize2, Minimize2, Bell, MessageCircle,
  Mail, Hash, Tag, CalendarDays, Target, MessageCircle as MessageIcon
} from 'lucide-react';
import '../styles/AuditLog.css';

const AuditLog = () => {
  // ========== ÉTATS ==========
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedUser, setSelectedUser] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    byModule: [],
    byAction: []
  });
  const [uniqueUsers, setUniqueUsers] = useState([]);
  const [modules, setModules] = useState([]);
  const [actions] = useState(['CREATION', 'MODIFICATION', 'SUPPRESSION', 'REINITIALISATION_MDP', 'REPROGRAMMATION', 'ANNULATION', 'CHANGEMENT_STATUT']);
  const [currentTime, setCurrentTime] = useState(new Date());

  // ========== ÉTATS POUR LA MODALE DE CONFIRMATION ==========
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [logToDelete, setLogToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // ========== FONCTIONS UTILITAIRES ==========

  const formatDate = (dateString) => {
    if (!dateString) return { full: '', date: '', time: '', relative: '' };
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    let relative = '';
    if (diffMins < 1) relative = 'À l\'instant';
    else if (diffMins < 60) relative = `Il y a ${diffMins} min`;
    else if (diffHours < 24) relative = `Il y a ${diffHours} h`;
    else if (diffDays === 1) relative = 'Hier';
    else if (diffDays < 7) relative = `Il y a ${diffDays} j`;
    
    return {
      full: date.toLocaleString('fr-FR', { 
        weekday: 'long',
        day: '2-digit', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      }),
      date: date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }),
      time: date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      relative
    };
  };

  const getModuleLabel = (module) => {
    const labels = {
      'UTILISATEUR': 'utilisateur',
      'AGENT': 'agent',
      'ACCIDENT': 'accident',
      'PLANNING': 'planning',
      'VISITE': 'visite',
      'NOTIFICATION': 'notification',
      'CHATBOT': 'chatbot',
      'AUTRE': 'élément'
    };
    return labels[module] || module?.toLowerCase() || 'élément';
  };

  const getModuleLabelAvecArticle = (module) => {
    const labels = {
      'UTILISATEUR': 'un utilisateur',
      'AGENT': 'un agent',
      'ACCIDENT': 'un accident',
      'PLANNING': 'un planning',
      'VISITE': 'une visite',
      'NOTIFICATION': 'une notification',
      'CHATBOT': 'un chatbot',
      'AUTRE': 'un élément'
    };
    return labels[module] || 'un élément';
  };

  const getActionLabel = (action) => {
    const labels = {
      'CREATION': 'Création',
      'MODIFICATION': 'Modification',
      'SUPPRESSION': 'Suppression',
      'REINITIALISATION_MDP': 'Réinitialisation MDP',
      'REPROGRAMMATION': 'Reprogrammation',
      'ANNULATION': 'Annulation',
      'CHANGEMENT_STATUT': 'Changement statut'
    };
    return labels[action] || action;
  };

  const getModuleStyle = (module) => {
    const styles = {
      'UTILISATEUR': { bg: '#EEF2FF', text: '#4F46E5', icon: <Users size={14} />, label: 'Utilisateurs' },
      'ACCIDENT': { bg: '#FEF2F2', text: '#DC2626', icon: <AlertCircle size={14} />, label: 'Accidents' },
      'PLANNING': { bg: '#FEF3E2', text: '#C2410C', icon: <Calendar size={14} />, label: 'Planning' },
      'VISITE': { bg: '#E6F7F0', text: '#047857', icon: <Activity size={14} />, label: 'Visites' },
      'AGENT': { bg: '#F3E8FF', text: '#7C3AED', icon: <User size={14} />, label: 'Agents' },
      'NOTIFICATION': { bg: '#EFF6FF', text: '#2563EB', icon: <Bell size={14} />, label: 'Notifications' },
      'CHATBOT': { bg: '#FCE7F3', text: '#BE185D', icon: <MessageCircle size={14} />, label: 'Chatbot' },
      'AUTRE': { bg: '#F1F5F9', text: '#64748B', icon: <Database size={14} />, label: 'Autre' }
    };
    return styles[module] || styles['AUTRE'];
  };

  const getActionStyle = (action) => {
    const styles = {
      'CREATION': { bg: '#E6F7F0', text: '#10B981', icon: <PlusCircle size={12} />, label: 'Création' },
      'MODIFICATION': { bg: '#EFF6FF', text: '#3B82F6', icon: <Edit size={12} />, label: 'Modification' },
      'SUPPRESSION': { bg: '#FEF2F2', text: '#EF4444', icon: <Trash2 size={12} />, label: 'Suppression' },
      'REINITIALISATION_MDP': { bg: '#FEFCE8', text: '#EAB308', icon: <Key size={12} />, label: 'Réinitialisation MDP' },
      'REPROGRAMMATION': { bg: '#E0F2FE', text: '#0284C7', icon: <RefreshCw size={12} />, label: 'Reprogrammation' },
      'ANNULATION': { bg: '#FEF2F2', text: '#EF4444', icon: <XCircle size={12} />, label: 'Annulation' },
      'CHANGEMENT_STATUT': { bg: '#F3E8FF', text: '#8B5CF6', icon: <Shield size={12} />, label: 'Changement statut' }
    };
    return styles[action] || { bg: '#F1F5F9', text: '#64748B', icon: <Activity size={12} />, label: action };
  };

  // ========== FONCTIONS DE SUPPRESSION ==========
  
  const openDeleteConfirm = (log) => {
    setLogToDelete(log);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!logToDelete) return;
    
    setDeleting(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/audit/logs/${logToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        showToast('success', 'Log supprimé');
        fetchLogs();
      } else {
        showToast('error', data.message || 'Erreur');
      }
    } catch (error) {
      console.error('Erreur suppression:', error);
      showToast('error', 'Erreur');
    } finally {
      setDeleting(false);
      setShowConfirmModal(false);
      setLogToDelete(null);
    }
  };

  const showToast = (type, message) => {
    const toast = document.createElement('div');
    toast.className = `srtb-toast-notification ${type}`;
    toast.innerHTML = `
      <div class="srtb-toast-content">
        <span class="srtb-toast-icon">${type === 'success' ? '✓' : '✗'}</span>
        <span class="srtb-toast-message">${message}</span>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  };

  // ========== CHARGEMENT DES DONNÉES ==========
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/audit/logs`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.success) {
        setLogs(data.data);
        setFilteredLogs(data.data);
        
        const modulesSet = new Set();
        const usersSet = new Set();
        
        data.data.forEach(log => {
          if (log.module) modulesSet.add(log.module);
          if (log.email_utilisateur) usersSet.add(log.email_utilisateur);
        });
        
        setModules(Array.from(modulesSet));
        setUniqueUsers(Array.from(usersSet));
        await fetchStats();
      }
    } catch (error) {
      console.error('Erreur chargement logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/audit/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Erreur chargement stats:', error);
    }
  };

  // ========== FILTRAGE ==========
  useEffect(() => {
    let filtered = [...logs];
    
    if (searchTerm) {
      filtered = filtered.filter(log => 
        (log.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (log.email_utilisateur?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (log.identifiant_cible?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }
    
    if (selectedModule !== 'all') {
      filtered = filtered.filter(log => log.module === selectedModule);
    }
    
    if (selectedAction !== 'all') {
      filtered = filtered.filter(log => log.type_action === selectedAction);
    }
    
    if (selectedUser !== 'all') {
      filtered = filtered.filter(log => log.email_utilisateur === selectedUser);
    }
    
    if (dateRange === 'today') {
      const today = new Date().toDateString();
      filtered = filtered.filter(log => log.date_creation && new Date(log.date_creation).toDateString() === today);
    } else if (dateRange === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      filtered = filtered.filter(log => log.date_creation && new Date(log.date_creation) >= weekAgo);
    } else if (dateRange === 'month') {
      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      filtered = filtered.filter(log => log.date_creation && new Date(log.date_creation) >= monthAgo);
    } else if (dateRange === 'custom' && startDate && endDate) {
      filtered = filtered.filter(log => {
        if (!log.date_creation) return false;
        const date = new Date(log.date_creation);
        return date >= new Date(startDate) && date <= new Date(endDate + 'T23:59:59');
      });
    }
    
    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [logs, searchTerm, selectedModule, selectedAction, selectedUser, dateRange, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // ========== PAGINATION ==========
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredLogs.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  // ========== EXPORT ==========
  const handleExport = () => {
    const headers = ['ID', 'Date', 'Utilisateur', 'ID Utilisateur', 'Rôle', 'Action', 'Module', 'Cible', 'IP', 'Navigateur', 'Description', 'Nouvelles valeurs', 'Statut'];
    const csv = [
      headers.join(','),
      ...filteredLogs.map(log => [
        log.id,
        log.date_creation ? new Date(log.date_creation).toLocaleString('fr-FR') : '',
        log.email_utilisateur || '',
        log.id_utilisateur || '',
        log.role_utilisateur || '',
        getActionLabel(log.type_action),
        getModuleLabel(log.module),
        log.identifiant_cible || '',
        log.adresse_ip || '',
        `"${(log.navigateur || '').replace(/"/g, '""')}"`,
        `"${(log.description || '').replace(/"/g, '""')}"`,
        `"${(log.nouvelles_valeurs || '').replace(/"/g, '""')}"`,
        log.statut || ''
      ].join(','))
    ].join('\n');
    
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal_audit_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedModule('all');
    setSelectedAction('all');
    setSelectedUser('all');
    setDateRange('all');
    setStartDate('');
    setEndDate('');
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (selectedModule !== 'all') count++;
    if (selectedAction !== 'all') count++;
    if (selectedUser !== 'all') count++;
    if (dateRange !== 'all') count++;
    if (searchTerm) count++;
    return count;
  };

  // ========== RENDU ==========
  return (
    <div className="srtb-audit-log-container">
      {/* Horloge */}
      <div className="srtb-audit-clock">
        <Clock size={14} />
        <span>{currentTime.toLocaleTimeString('fr-FR')}</span>
        <span className="srtb-clock-date">{currentTime.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
      </div>

      {/* En-tête */}
      <div className="srtb-audit-header">
        <div className="srtb-header-left">
          <div className="srtb-header-icon">
            <Activity size={28} />
          </div>
          <div className="srtb-header-title">
            <h1>Journal d'audit</h1>
            <p>Historique complet de toutes les actions sur la plateforme</p>
          </div>
        </div>
        <div className="srtb-header-right">
          <button className="srtb-btn-export" onClick={handleExport}>
            <Download size={16} /> Exporter CSV
          </button>
          <button className="srtb-btn-refresh" onClick={fetchLogs}>
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Statistiques */}
      <div className="srtb-stats-cards">
        <div className="srtb-stat-card">
          <div className="srtb-stat-icon blue"><Activity size={20} /></div>
          <div className="srtb-stat-info">
            <span className="srtb-stat-value">{stats.total || 0}</span>
            <span className="srtb-stat-label">Actions totales</span>
          </div>
        </div>
        <div className="srtb-stat-card">
          <div className="srtb-stat-icon green"><Calendar size={20} /></div>
          <div className="srtb-stat-info">
            <span className="srtb-stat-value">{stats.aujourdhui || 0}</span>
            <span className="srtb-stat-label">Aujourd'hui</span>
          </div>
        </div>
        <div className="srtb-stat-card">
          <div className="srtb-stat-icon purple"><Users size={20} /></div>
          <div className="srtb-stat-info">
            <span className="srtb-stat-value">{uniqueUsers.length}</span>
            <span className="srtb-stat-label">Utilisateurs actifs</span>
          </div>
        </div>
        <div className="srtb-stat-card">
          <div className="srtb-stat-icon orange"><Database size={20} /></div>
          <div className="srtb-stat-info">
            <span className="srtb-stat-value">{modules.length}</span>
            <span className="srtb-stat-label">Modules</span>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="srtb-audit-filters">
        <div className="srtb-search-wrapper">
          <Search size={16} />
          <input 
            type="text" 
            placeholder="Rechercher par utilisateur, email, cible..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="srtb-clear-search" onClick={() => setSearchTerm('')}>
              <X size={14} />
            </button>
          )}
        </div>
        
        <button 
          className={`srtb-filter-toggle ${showFilters ? 'active' : ''}`} 
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={16} /> Filtres
          {getActiveFiltersCount() > 0 && <span className="srtb-filter-badge">{getActiveFiltersCount()}</span>}
        </button>
      </div>

      {/* Panneau filtres */}
      {showFilters && (
        <div className="srtb-filters-panel">
          <div className="srtb-filters-header">
            <h3>Filtres avancés</h3>
            <button className="srtb-reset-filters" onClick={resetFilters}>Réinitialiser</button>
          </div>
          <div className="srtb-filters-grid">
            <div className="srtb-filter-group">
              <label>Module</label>
              <select value={selectedModule} onChange={(e) => setSelectedModule(e.target.value)}>
                <option value="all">Tous les modules</option>
                {modules.map(module => (
                  <option key={module} value={module}>{getModuleStyle(module).label}</option>
                ))}
              </select>
            </div>
            
            <div className="srtb-filter-group">
              <label>Action</label>
              <select value={selectedAction} onChange={(e) => setSelectedAction(e.target.value)}>
                <option value="all">Toutes les actions</option>
                {actions.map(action => (
                  <option key={action} value={action}>{getActionStyle(action).label}</option>
                ))}
              </select>
            </div>
            
            <div className="srtb-filter-group">
              <label>Utilisateur</label>
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
                <option value="all">Tous les utilisateurs</option>
                {uniqueUsers.map(user => (
                  <option key={user} value={user}>{user}</option>
                ))}
              </select>
            </div>
            
            <div className="srtb-filter-group">
              <label>Période</label>
              <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                <option value="all">Tout l'historique</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">7 derniers jours</option>
                <option value="month">30 derniers jours</option>
                <option value="custom">Personnalisée</option>
              </select>
            </div>
            
            {dateRange === 'custom' && (
              <>
                <div className="srtb-filter-group">
                  <label>Date de début</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="srtb-filter-group">
                  <label>Date de fin</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </>
            )}
          </div>
          <div className="srtb-filters-footer">
            <span className="srtb-result-count">{filteredLogs.length} résultat(s)</span>
          </div>
        </div>
      )}

      {/* Tableau */}
      <div className="srtb-audit-table-wrapper">
        <table className="srtb-audit-table">
          <thead>
            <tr>
              <th>Date & Heure</th>
              <th>Utilisateur</th>
              <th>ID</th>
              <th>Rôle</th>
              <th>Action</th>
              <th>Module</th>
              <th>Description détaillée</th>
              <th>Statut</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="srtb-loading-cell">
                  <div className="srtb-loader"></div>
                  <p>Chargement des données...</p>
                 </td>
               </tr>
            ) : currentItems.length === 0 ? (
              <tr>
                <td colSpan="9" className="srtb-empty-cell">
                  <Activity size={48} />
                  <h3>Aucune activité trouvée</h3>
                  <p>Essayez de modifier vos filtres de recherche</p>
                 </td>
               </tr>
            ) : (
              currentItems.map(log => {
                const dateInfo = formatDate(log.date_creation);
                const moduleStyle = getModuleStyle(log.module);
                const actionStyle = getActionStyle(log.type_action);
                
                return (
                  <tr key={log.id} className="srtb-audit-row">
                    <td>
                      <div className="srtb-date-cell">
                        <span className="srtb-date-main">{dateInfo.date}</span>
                        <span className="srtb-date-time">{dateInfo.time}</span>
                        {dateInfo.relative && <span className="srtb-date-relative">{dateInfo.relative}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="srtb-user-cell">
                        <div className="srtb-user-avatar" style={{ background: '#4F46E5' }}>
                          {(log.email_utilisateur || 'S').charAt(0).toUpperCase()}
                        </div>
                        <div className="srtb-user-info">
                          <span className="srtb-user-email">{log.email_utilisateur || 'Système'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="srtb-user-id-cell">{log.id_utilisateur || '-'}</td>
                    <td className="srtb-role-cell">
                      <span className="srtb-role-badge-small" style={{ background: '#F1F5F9', color: '#475569' }}>
                        {log.role_utilisateur || 'system'}
                      </span>
                    </td>
                    <td className="srtb-action-cell">
                      <span className="srtb-action-badge" style={{ background: actionStyle.bg, color: actionStyle.text }}>
                        {actionStyle.icon} {actionStyle.label}
                      </span>
                    </td>
                    <td className="srtb-module-cell">
                      <span className="srtb-module-badge" style={{ background: moduleStyle.bg, color: moduleStyle.text }}>
                        {moduleStyle.icon} {moduleStyle.label}
                      </span>
                    </td>
                    <td className="srtb-description-cell">
                      <div className="srtb-description-preview">
                        <strong>{log.email_utilisateur || 'Système'}</strong> a effectué une <strong>{getActionLabel(log.type_action)}</strong> sur {getModuleLabelAvecArticle(log.module)}
                        {log.identifiant_cible && <span className="srtb-target-highlight"> : {log.identifiant_cible}</span>}
                      </div>
                      <div className="srtb-description-details">
                        <small>
                          IP: {log.adresse_ip || '0.0.0.0'} | 
                          ID cible: {log.id_cible || 'N/A'}
                        </small>
                      </div>
                    </td>
                    <td className="srtb-status-cell">
                      {log.statut === 'SUCCES' ? (
                        <span className="srtb-status-success"><CheckCircle size={12} /> Succès</span>
                      ) : (
                        <span className="srtb-status-failed"><XCircle size={12} /> Échec</span>
                      )}
                    </td>
                    <td className="srtb-actions-cell">
                      <button 
                        className="srtb-view-btn" 
                        onClick={() => { setSelectedLog(log); setShowDetailsModal(true); }} 
                        title="Consulter"
                      >
                        <Eye size={14} />
                      </button>
                      <button 
                        className="srtb-delete-btn" 
                        onClick={() => openDeleteConfirm(log)} 
                        title="Supprimer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredLogs.length > 0 && (
        <div className="srtb-pagination">
          <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}>
            <ChevronLeft size={16} /> Début
          </button>
          <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
            <ChevronLeft size={16} />
          </button>
          <span className="srtb-page-info">Page {currentPage} sur {totalPages}</span>
          <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
            <ChevronRight size={16} />
          </button>
          <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}>
            Fin <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ========== MODALE DE DÉTAILS PROFESSIONNELLE ========== */}
      {showDetailsModal && selectedLog && (
        <div className="srtb-modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="srtb-details-modal" onClick={e => e.stopPropagation()}>
            <div className="srtb-details-modal-header">
              <div className="srtb-details-modal-title">
                <div className="srtb-details-icon">
                  <FileText size={20} />
                </div>
                <div>
                  <h2>Détails de l'action</h2>
                  <p>ID: #{selectedLog.id} · {new Date(selectedLog.date_creation).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <button className="srtb-details-modal-close" onClick={() => setShowDetailsModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="srtb-details-modal-body">
              {/* Section Utilisateur */}
              <div className="srtb-details-card">
                <div className="srtb-details-card-header">
                  <User size={16} />
                  <span>Utilisateur</span>
                </div>
                <div className="srtb-details-card-content">
                  <div className="srtb-details-row">
                    <div className="srtb-details-label">Email</div>
                    <div className="srtb-details-value">{selectedLog.email_utilisateur || 'Système'}</div>
                  </div>
                  <div className="srtb-details-row">
                    <div className="srtb-details-label">ID Utilisateur</div>
                    <div className="srtb-details-value">{selectedLog.id_utilisateur || 'N/A'}</div>
                  </div>
                  <div className="srtb-details-row">
                    <div className="srtb-details-label">Rôle</div>
                    <div className="srtb-details-value">
                      <span className="srtb-role-tag">{selectedLog.role_utilisateur || 'system'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Action */}
              <div className="srtb-details-card">
                <div className="srtb-details-card-header">
                  <Activity size={16} />
                  <span>Action</span>
                </div>
                <div className="srtb-details-card-content">
                  <div className="srtb-details-row">
                    <div className="srtb-details-label">Type</div>
                    <div className="srtb-details-value">
                      <span className={`srtb-action-tag ${selectedLog.type_action?.toLowerCase()}`}>
                        {getActionLabel(selectedLog.type_action)}
                      </span>
                    </div>
                  </div>
                  <div className="srtb-details-row">
                    <div className="srtb-details-label">Module</div>
                    <div className="srtb-details-value">
                      <span className="srtb-module-tag">{getModuleLabel(selectedLog.module)}</span>
                    </div>
                  </div>
                  <div className="srtb-details-row">
                    <div className="srtb-details-label">Statut</div>
                    <div className="srtb-details-value">
                      <span className={`srtb-status-tag ${selectedLog.statut === 'SUCCES' ? 'success' : 'failed'}`}>
                        {selectedLog.statut === 'SUCCES' ? '✓ Succès' : '✗ Échec'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Cible */}
              {(selectedLog.identifiant_cible || selectedLog.id_cible) && (
                <div className="srtb-details-card">
                  <div className="srtb-details-card-header">
                    <Target size={16} />
                    <span>Cible</span>
                  </div>
                  <div className="srtb-details-card-content">
                    {selectedLog.identifiant_cible && (
                      <div className="srtb-details-row">
                        <div className="srtb-details-label">Identifiant</div>
                        <div className="srtb-details-value highlight">{selectedLog.identifiant_cible}</div>
                      </div>
                    )}
                    {selectedLog.id_cible && (
                      <div className="srtb-details-row">
                        <div className="srtb-details-label">ID Cible</div>
                        <div className="srtb-details-value">{selectedLog.id_cible}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Section Description */}
              <div className="srtb-details-card full-width">
                <div className="srtb-details-card-header">
                  <MessageIcon size={16} />
                  <span>Description</span>
                </div>
                <div className="srtb-details-card-content">
                  <p className="srtb-description-text">{selectedLog.description || 'Aucune description'}</p>
                </div>
              </div>

              {/* Section Informations techniques */}
              <div className="srtb-details-card full-width">
                <div className="srtb-details-card-header">
                  <Globe size={16} />
                  <span>Informations techniques</span>
                </div>
                <div className="srtb-details-card-content">
                  <div className="srtb-details-grid-2">
                    <div className="srtb-details-row">
                      <div className="srtb-details-label">Adresse IP</div>
                      <div className="srtb-details-value monospace">{selectedLog.adresse_ip || '0.0.0.0'}</div>
                    </div>
                    <div className="srtb-details-row">
                      <div className="srtb-details-label">Méthode HTTP</div>
                      <div className="srtb-details-value">
                        <span className="srtb-method-tag">{selectedLog.methode_http || 'GET'}</span>
                      </div>
                    </div>
                    <div className="srtb-details-row full-width">
                      <div className="srtb-details-label">URL</div>
                      <div className="srtb-details-value monospace url">{selectedLog.url || '-'}</div>
                    </div>
                    <div className="srtb-details-row full-width">
                      <div className="srtb-details-label">Navigateur</div>
                      <div className="srtb-details-value user-agent">{selectedLog.navigateur?.substring(0, 150) || 'Inconnu'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section Changements */}
              {(selectedLog.nouvelles_valeurs || selectedLog.anciennes_valeurs) && (
                <div className="srtb-details-card full-width">
                  <div className="srtb-details-card-header">
                    <Edit size={16} />
                    <span>Changements</span>
                  </div>
                  <div className="srtb-details-card-content srtb-changes-container">
                    {selectedLog.anciennes_valeurs && (
                      <div className="srtb-changes-column">
                        <div className="srtb-changes-label">Anciennes valeurs</div>
                        <pre className="srtb-changes-pre">{(() => {
                          try {
                            return JSON.stringify(JSON.parse(selectedLog.anciennes_valeurs), null, 2);
                          } catch {
                            return selectedLog.anciennes_valeurs;
                          }
                        })()}</pre>
                      </div>
                    )}
                    {selectedLog.nouvelles_valeurs && (
                      <div className="srtb-changes-column">
                        <div className="srtb-changes-label">Nouvelles valeurs</div>
                        <pre className="srtb-changes-pre">{(() => {
                          try {
                            return JSON.stringify(JSON.parse(selectedLog.nouvelles_valeurs), null, 2);
                          } catch {
                            return selectedLog.nouvelles_valeurs;
                          }
                        })()}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Message d'erreur */}
              {selectedLog.message_erreur && (
                <div className="srtb-details-card error-card full-width">
                  <div className="srtb-details-card-header">
                    <AlertCircle size={16} />
                    <span>Message d'erreur</span>
                  </div>
                  <div className="srtb-details-card-content">
                    <p className="srtb-error-text">{selectedLog.message_erreur}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="srtb-details-modal-footer">
              <button className="srtb-btn-secondary" onClick={() => setShowDetailsModal(false)}>
                Fermer
              </button>
              <button className="srtb-btn-copy" onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(selectedLog, null, 2));
                showToast('success', 'Copié');
              }}>
                <Copy size={14} /> Copier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODALE DE CONFIRMATION TRÈS COURTE ========== */}
      {showConfirmModal && logToDelete && (
        <div className="srtb-modal-overlay" onClick={() => !deleting && setShowConfirmModal(false)}>
          <div className="srtb-confirm-modal-short">
            <div className="srtb-confirm-modal-short-body">
              <div className="srtb-confirm-icon-short">
                <Trash2 size={24} color="#ef4444" />
              </div>
              <p>Supprimer ce log ?</p>
              <p className="srtb-confirm-warning-short">Action irréversible</p>
            </div>
            <div className="srtb-confirm-modal-short-footer">
              <button className="srtb-confirm-btn-cancel-short" onClick={() => setShowConfirmModal(false)} disabled={deleting}>
                Non
              </button>
              <button className="srtb-confirm-btn-delete-short" onClick={confirmDelete} disabled={deleting}>
                {deleting ? '...' : 'Oui'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;