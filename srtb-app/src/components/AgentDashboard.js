// src/components/AgentDashboard.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, Clock, Calendar, MapPin, LogOut,
  Briefcase, CheckCircle, AlertCircle, Bell, X, Trash2,
  TrendingUp, Activity, Shield, Award,
  Bot, LayoutDashboard, Stethoscope,
  UserCircle, AlertTriangle, Building2,
  Hospital, BriefcaseMedical, CalendarDays, Info, ExternalLink, LifeBuoy,
  History, Eye, FileText, Heart, Activity as ActivityIcon,
  BarChart3, PieChart, Settings, HelpCircle, Phone, Mail,
  ClipboardList, FolderOpen, Award as AwardIcon, Target, TrendingUp as TrendingUpIcon,
  Home, Users, Car, Coffee, Droplet, Thermometer, Weight, Ruler,
  FileText as FileIcon, Scale, Bone, Brain, Footprints
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AgentChatbot from './AgentChatbot';
import '../styles/AgentDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getNumeroSemaine = (date) => {
  const d = new Date(date);
  const dayNum = d.getDay();
  d.setDate(d.getDate() + 4 - (dayNum || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

const getDaysLeft = (dateString) => {
  if (!dateString) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateString);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const formatDate = (dateString) => {
  if (!dateString) return 'Non renseigné';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateLong = (dateString) => {
  if (!dateString) return 'Non renseigné';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
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

const getStatutTexte = (statut) => {
  switch(statut) {
    case 'actif': return 'Actif';
    case 'conge': return 'En congé';
    case 'maladie': return 'En maladie';
    default: return statut || 'Actif';
  }
};

const getGraviteColor = (gravite) => {
  switch(gravite) {
    case 'Faible': return '#10b981';
    case 'Moyenne': return '#f59e0b';
    case 'Élevée': return '#f97316';
    case 'Critique': return '#ef4444';
    default: return '#6b7280';
  }
};

const getGraviteIcon = (gravite) => {
  switch(gravite) {
    case 'Faible': return '🟢';
    case 'Moyenne': return '🟡';
    case 'Élevée': return '🟠';
    case 'Critique': return '🔴';
    default: return '⚪';
  }
};

const getResultatIcon = (resultat) => {
  switch(resultat) {
    case 'Apte': return '✅';
    case 'Apte avec réserves': return '⚠️';
    case 'Inapte temporaire': return '🏥';
    case 'Inapte définitif': return '❌';
    default: return '📋';
  }
};

const getTypeVisiteIcon = (type) => {
  switch(type) {
    case 'Périodique': return '📅';
    case 'Reprise': return '🔄';
    case 'Reclassement': return '📋';
    case 'Embauche': return '🆕';
    default: return '🏥';
  }
};

const AgentDashboard = () => {
  const navigate = useNavigate();
  
  // ========== ÉTATS ==========
  const [user, setUser] = useState(null);
  const [agentData, setAgentData] = useState(null);
  const [visites, setVisites] = useState([]);
  const [accidents, setAccidents] = useState([]);
  const [prochainesVisites, setProchainesVisites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isRobotHovered, setIsRobotHovered] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // ========== HORLOGE ==========
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bonjour');
    else if (hour < 18) setGreeting('Bon après-midi');
    else setGreeting('Bonsoir');
    return () => clearInterval(timer);
  }, []);

  // ========== CALCUL DES STATISTIQUES ==========
  const stats = {
    totalVisites: visites.length,
    visitesCetteAnnee: visites.filter(v => new Date(v.date_visite).getFullYear() === new Date().getFullYear()).length,
    totalAccidents: accidents.length,
    totalJoursArret: accidents.reduce((sum, a) => sum + (a.jour_arret || 0), 0),
    accidentsCetteAnnee: accidents.filter(a => new Date(a.date_accident).getFullYear() === new Date().getFullYear()).length,
    joursArretCetteAnnee: accidents.filter(a => new Date(a.date_accident).getFullYear() === new Date().getFullYear()).reduce((sum, a) => sum + (a.jour_arret || 0), 0),
    dernierAccident: accidents.length > 0 ? new Date(Math.max(...accidents.map(a => new Date(a.date_accident)))) : null,
    visitesAptes: visites.filter(v => v.resultat === 'Apte').length,
    tauxAptitude: visites.length > 0 ? ((visites.filter(v => v.resultat === 'Apte').length / visites.length) * 100).toFixed(0) : 100,
    joursSansAccident: (() => {
      if (accidents.length === 0) return 365;
      const dernier = new Date(Math.max(...accidents.map(a => new Date(a.date_accident))));
      return Math.floor((new Date() - dernier) / (1000 * 60 * 60 * 24));
    })(),
    scoreSecurite: (() => {
      let score = 100;
      if (accidents.length > 0) score -= Math.min(40, accidents.length * 8);
      const taux = visites.length > 0 ? ((visites.filter(v => v.resultat === 'Apte').length / visites.length) * 100) : 100;
      if (taux < 80) score -= 15;
      const joursSansAcc = (() => {
        if (accidents.length === 0) return 365;
        const dernier = new Date(Math.max(...accidents.map(a => new Date(a.date_accident))));
        return Math.floor((new Date() - dernier) / (1000 * 60 * 60 * 24));
      })();
      if (joursSansAcc > 365) score += 5;
      return Math.max(0, Math.min(100, score));
    })()
  };

  // ========== GÉNÉRATION DES ALERTES ==========
  const alerts = (() => {
    const list = [];
    const prochaine = prochainesVisites[0];
    if (prochaine) {
      const days = getDaysLeft(prochaine.date_visite);
      if (days <= 7 && days > 0) {
        list.push({ type: 'danger', icon: '🔴', title: 'Visite imminente', message: `Dans ${days} jours (${formatDate(prochaine.date_visite)})` });
      } else if (days <= 0) {
        list.push({ type: 'danger', icon: '🔴', title: 'Visite dépassée', message: `Depuis ${Math.abs(days)} jours` });
      }
    }
    if (agentData?.date_fin_inaptitude && new Date(agentData.date_fin_inaptitude) >= new Date()) {
      list.push({ type: 'danger', icon: '🏥', title: 'Période d\'inaptitude', message: `Jusqu'au ${formatDate(agentData.date_fin_inaptitude)}` });
    }
    if (stats.scoreSecurite < 60) {
      list.push({ type: 'warning', icon: '⚠️', title: 'Score de sécurité faible', message: `${stats.scoreSecurite}/100` });
    }
    if (accidents.length > 2) {
      list.push({ type: 'warning', icon: '🚑', title: 'Accidents fréquents', message: `${accidents.length} accidents déclarés` });
    }
    return list;
  })();

  // ========== NOTIFICATIONS ==========
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
      console.error('Erreur:', err);
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
      console.error('Erreur:', err);
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
      console.error('Erreur:', err);
    }
  };

  // ========== DÉCONNEXION ==========
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/agent');
  };

  // ========== CHARGEMENT DES DONNÉES ==========
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const userData = JSON.parse(localStorage.getItem('user'));
        if (!token || !userData) { 
          navigate('/agent'); 
          return; 
        }
        
        setUser(userData);
        const matricule = userData.matricule_agent || userData.id;
        
        const agentRes = await fetch(`${API_URL}/api/agents`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (agentRes.ok) {
          const data = await agentRes.json();
          if (data.success) {
            const agent = data.agents.find(a => a.matricule_agent === parseInt(matricule));
            if (agent) setAgentData(agent);
          }
        }
        
        const visitesRes = await fetch(`${API_URL}/api/historique/formulaire?matricule=${matricule}&limit=50`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (visitesRes.ok) {
          const data = await visitesRes.json();
          if (data.success) setVisites(data.historique || []);
        }
        
        const aujourdhui = new Date().toISOString().split('T')[0];
        const toutesVisitesTemp = [];
        
        for(let i = 0; i <= 20; i++) {
          const dateTemp = new Date();
          dateTemp.setDate(dateTemp.getDate() + (i * 7));
          const semaineTemp = getNumeroSemaine(dateTemp);
          const anneeTemp = dateTemp.getFullYear();
          
          try {
            const planningRes = await fetch(`${API_URL}/api/planning/${semaineTemp}/${anneeTemp}`, { 
              headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (planningRes.ok) {
              const data = await planningRes.json();
              if (data.success) {
                const visites = data.planning.filter(p => 
                  p.matricule_agent === parseInt(matricule) && 
                  p.statut === 'Programmé'
                );
                toutesVisitesTemp.push(...visites);
              }
            }
          } catch(e) {}
        }
        
        const visitesFutures = toutesVisitesTemp
          .filter(v => v.date_visite >= aujourdhui)
          .sort((a, b) => new Date(a.date_visite) - new Date(b.date_visite));
        
        setProchainesVisites(visitesFutures);
        
        const accidentsRes = await fetch(`${API_URL}/api/accidents`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (accidentsRes.ok) {
          const data = await accidentsRes.json();
          if (data.success) {
            setAccidents(data.accidents.filter(a => a.matricule_agent === parseInt(matricule)));
          }
        }
        
      } catch (error) {
        console.error('Erreur chargement:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (localStorage.getItem('token')) {
      loadData();
    }
  }, [navigate]);

  useEffect(() => {
    if (user?.id) fetchNotifications(user.id);
  }, [user]);

  // ========== ONGLETS ==========
  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard, color: '#c4a962' },
    { id: 'medical', label: 'Suivi médical', icon: Stethoscope, color: '#10b981' },
    { id: 'accidents', label: 'Accidents', icon: AlertCircle, color: '#ef4444' },
    { id: 'profile', label: 'Mon profil', icon: UserCircle, color: '#3b82f6' }
  ];

  // ========== ROBOT 3D ==========
  const Robot3DProfessional = () => (
    <motion.button
      className={`ad-robot-3d-pro ${isChatbotOpen ? 'active' : ''}`}
      onClick={() => setIsChatbotOpen(!isChatbotOpen)}
      onMouseEnter={() => setIsRobotHovered(true)}
      onMouseLeave={() => setIsRobotHovered(false)}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={{
        y: [0, -3, 0],
        transition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
      }}
    >
      <div className="ad-robot-3d-container">
        <div className="ad-robot-3d-shadow"></div>
        <div className="ad-robot-3d-main">
          <div className="ad-robot-3d-head">
            <div className="ad-robot-3d-helmet">
              <div className="ad-helmet-reflection"></div>
              <div className="ad-helmet-light"></div>
            </div>
            <div className="ad-robot-3d-face">
              <div className="ad-robot-3d-visor">
                <div className="ad-visor-glow"></div>
              </div>
              <div className="ad-robot-3d-eyes">
                <div className="ad-eye-3d left"></div>
                <div className="ad-eye-3d right"></div>
              </div>
            </div>
            <div className="ad-robot-3d-antenna">
              <div className="ad-antenna-rod"></div>
              <div className="ad-antenna-sphere"></div>
            </div>
          </div>
          <div className="ad-robot-3d-neck"></div>
          <div className="ad-robot-3d-torso">
            <div className="ad-torso-panel top"></div>
            <div className="ad-torso-panel center">
              <div className="ad-power-core">
                <div className="ad-core-inner"></div>
              </div>
            </div>
            <div className="ad-torso-panel bottom"></div>
            <div className="ad-robot-3d-badge">
              <Shield size={14} />
            </div>
          </div>
          <div className="ad-robot-3d-arm left">
            <div className="ad-arm-shoulder"></div>
            <div className="ad-arm-forearm"></div>
            <div className="ad-arm-hand"></div>
          </div>
          <div className="ad-robot-3d-arm right">
            <div className="ad-arm-shoulder"></div>
            <div className="ad-arm-forearm"></div>
            <div className="ad-arm-hand"></div>
          </div>
          <div className="ad-robot-3d-legs">
            <div className="ad-leg left">
              <div className="ad-leg-upper"></div>
              <div className="ad-leg-lower"></div>
              <div className="ad-leg-foot"></div>
            </div>
            <div className="ad-leg right">
              <div className="ad-leg-upper"></div>
              <div className="ad-leg-lower"></div>
              <div className="ad-leg-foot"></div>
            </div>
          </div>
        </div>
        <div className="ad-robot-3d-glow"></div>
        
        <AnimatePresence>
          {isRobotHovered && !isChatbotOpen && (
            <motion.div 
              className="ad-robot-3d-bubble"
              initial={{ opacity: 0, scale: 0.9, x: -20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="ad-bubble-icon">
                <Bot size={16} />
              </div>
              <div className="ad-bubble-content">
                <span className="ad-bubble-title">Assistant SRTB</span>
                <span className="ad-bubble-desc">Bonjour ! Comment puis-je vous aider ? 👋</span>
              </div>
              <div className="ad-bubble-tail"></div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {!isChatbotOpen && unreadCount > 0 && (
          <div className="ad-robot-3d-badge-notification">
            <span>{unreadCount}</span>
          </div>
        )}
      </div>
    </motion.button>
  );

  // ========== AFFICHAGE CHARGEMENT ==========
  if (loading) {
    return (
      <div className="ad-loading-container">
        <div className="ad-loading-spinner"></div>
        <p>Chargement de votre espace agent...</p>
      </div>
    );
  }

  // ========== RENDU PRINCIPAL ==========
  return (
    <div className="ad-dashboard-v2">
      
      {/* HEADER */}
      <header className="ad-header-v2">
        <div className="ad-header-left">
          <div className="ad-logo">
            <Shield size={32} color="#c4a962" />
            <div>
              <h1>Espace Agent</h1>
              <p>{greeting}, {agentData?.prenom || 'Agent'} {agentData?.nom || ''}</p>
            </div>
          </div>
        </div>
        
        <div className="ad-header-right">
          <div className="ad-datetime">
            <Clock size={14} />
            <span>{currentTime.toLocaleTimeString('fr-FR')}</span>
            <Calendar size={14} />
            <span>{currentTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          
          <div className="ad-notifications-wrapper">
            <button className={`ad-notif-btn ${unreadCount > 0 ? 'has-notif' : ''}`} onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={18} />
              {unreadCount > 0 && <span className="ad-notif-badge">{unreadCount}</span>}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div className="ad-notif-dropdown" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="ad-notif-header">
                    <h3>Notifications</h3>
                    <button onClick={() => setShowNotifications(false)}><X size={16} /></button>
                  </div>
                  <div className="ad-notif-list">
                    {loadingNotifications ? <div className="ad-spinner"></div> :
                     notifications.length === 0 ? <div className="ad-notif-empty"><Bell size={32} /><p>Aucune notification</p></div> :
                     notifications.slice(0, 5).map(notif => (
                       <div key={notif.id} className={`ad-notif-item ${notif.status !== 'read' ? 'unread' : ''}`} onClick={() => { setSelectedNotification(notif); setShowNotificationModal(true); if (notif.status !== 'read') markAsRead(notif.id); }}>
                         <div className="ad-notif-icon"><Bell size={14} /></div>
                         <div className="ad-notif-content">
                           <div className="ad-notif-title">{notif.titre || 'Notification'}</div>
                           <div className="ad-notif-msg">{notif.message?.substring(0, 50)}...</div>
                           <div className="ad-notif-time">{formatDate(notif.created_at)}</div>
                         </div>
                         {notif.status !== 'read' && <span className="ad-notif-dot"></span>}
                       </div>
                     ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          <button className="ad-logout-btn" onClick={handleLogout}>
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </header>

      {/* ONGLETS DE NAVIGATION */}
      <nav className="ad-tabs-nav">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`ad-tab-btn-v2 ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} style={{ color: activeTab === tab.id ? tab.color : '#6b7280' }} />
            <span>{tab.label}</span>
            {activeTab === tab.id && <motion.div className="ad-tab-indicator" layoutId="tabIndicator" />}
          </button>
        ))}
      </nav>

      {/* CONTENU PRINCIPAL */}
      <main className="ad-main-content">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            
            {/* ========== ONGLET 1 : VUE D'ENSEMBLE ========== */}
            {activeTab === 'overview' && (
              <div className="ad-tab-panel">
                {/* KPI Cards */}
                <div className="ad-kpi-grid-v2">
                  <div className="ad-kpi-card-v2">
                    <div className="ad-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}><User size={20} /></div>
                    <div className="ad-kpi-info">
                      <span className="ad-kpi-label">Statut</span>
                      <span className="ad-kpi-value">{getStatutTexte(agentData?.statut)}</span>
                    </div>
                  </div>
                  <div className="ad-kpi-card-v2">
                    <div className="ad-kpi-icon" style={{ background: '#d1fae5', color: '#059669' }}><CalendarDays size={20} /></div>
                    <div className="ad-kpi-info">
                      <span className="ad-kpi-label">Prochaine visite</span>
                      <span className="ad-kpi-value">
                        {prochainesVisites && prochainesVisites.length > 0 && prochainesVisites[0]?.date_visite 
                          ? formatDate(prochainesVisites[0].date_visite) 
                          : 'Non programmée'}
                      </span>
                    </div>
                  </div>
                  <div className="ad-kpi-card-v2">
                    <div className="ad-kpi-icon" style={{ background: '#fee2e2', color: '#dc2626' }}><Hospital size={20} /></div>
                    <div className="ad-kpi-info">
                      <span className="ad-kpi-label">Dernière visite</span>
                      <span className="ad-kpi-value">
                        {visites[0]?.date_visite ? formatDate(visites[0].date_visite) : 'Jamais'}
                      </span>
                    </div>
                  </div>
                  <div className="ad-kpi-card-v2">
                    <div className="ad-kpi-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}><BriefcaseMedical size={20} /></div>
                    <div className="ad-kpi-info">
                      <span className="ad-kpi-label">Accidents</span>
                      <span className="ad-kpi-value">{stats.totalAccidents}</span>
                    </div>
                  </div>
                </div>

                {/* SECTION ÉVOLUTION DES CONNEXIONS - SUPPRIMÉE */}

                {/* Alertes */}
                {alerts.length > 0 && (
                  <div className="ad-alerts-section">
                    <h3><AlertTriangle size={16} /> Alertes</h3>
                    {alerts.map((alert, i) => (
                      <div key={i} className={`ad-alert-card ${alert.type}`}>
                        <span className="ad-alert-icon">{alert.icon}</span>
                        <div>
                          <div className="ad-alert-title">{alert.title}</div>
                          <div className="ad-alert-msg">{alert.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Derniers accidents */}
                {accidents.slice(0, 3).length > 0 && (
                  <div className="ad-recent-list">
                    <h3><AlertCircle size={16} /> Derniers accidents</h3>
                    {accidents.slice(0, 3).map(acc => (
                      <div key={acc.id_accident} className="ad-recent-item">
                        <div className="ad-recent-date">{formatDate(acc.date_accident)}</div>
                        <div className="ad-recent-badge" style={{ background: getGraviteColor(acc.gravite) }}>
                          {getGraviteIcon(acc.gravite)} {acc.gravite || 'Non définie'}
                        </div>
                        <div className="ad-recent-info">{acc.lieu_accident || 'Lieu non spécifié'}</div>
                        <div className="ad-recent-duration">{acc.jour_arret || 0} jours</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions rapides */}
                <div className="ad-quick-actions">
                  <h3><ExternalLink size={16} /> Accès rapides</h3>
                  <div className="ad-actions-grid">
                    <button className="ad-action-btn" onClick={() => setActiveTab('medical')}><Stethoscope size={18} /><span>Suivi médical</span></button>
                    <button className="ad-action-btn" onClick={() => setActiveTab('accidents')}><AlertCircle size={18} /><span>Mes accidents</span></button>
                    <button className="ad-action-btn" onClick={() => setActiveTab('profile')}><UserCircle size={18} /><span>Mon profil</span></button>
                  </div>
                </div>
              </div>
            )}

            {/* ========== ONGLET 2 : SUIVI MÉDICAL ========== */}
            {activeTab === 'medical' && (
              <div className="ad-tab-panel">
                <div className="ad-card">
                  <div className="ad-card-header"><CalendarDays size={18} /><h3>Prochaine visite médicale</h3></div>
                  {prochainesVisites && prochainesVisites.length > 0 && prochainesVisites[0] ? (
                    <div className="ad-next-visit">
                      <div className="ad-visit-date-large">{formatDateLong(prochainesVisites[0].date_visite)}</div>
                      <div className="ad-visit-details">
                        <span><strong>Type :</strong> {getTypeVisiteIcon(prochainesVisites[0].type_visite)} {prochainesVisites[0].type_visite || 'Périodique'}</span>
                        <span><strong>Heure :</strong> {prochainesVisites[0].heure_visite?.substring(0,5) || 'À définir'}</span>
                        <span><strong>Délai :</strong> {getDaysLeft(prochainesVisites[0].date_visite) > 0 ? `${getDaysLeft(prochainesVisites[0].date_visite)} jours` : 'Date dépassée'}</span>
                      </div>
                    </div>
                  ) : <p className="ad-empty">Aucune visite programmée</p>}
                </div>

                <div className="ad-card">
                  <div className="ad-card-header"><History size={18} /><h3>Dernière visite effectuée</h3></div>
                  {visites[0] ? (
                    <div className="ad-last-visit">
                      <div className="ad-visit-date">{formatDateLong(visites[0].date_visite)}</div>
                      <div className="ad-visit-details">
                        <span><strong>Type :</strong> {getTypeVisiteIcon(visites[0].type_visite)} {visites[0].type_visite || 'Visite médicale'}</span>
                        <span><strong>Médecin :</strong> {visites[0].medecin || 'Dr. Mahmoud Khelifi'}</span>
                        <span><strong>Résultat :</strong> <span className={visites[0].resultat === 'Apte' ? 'ad-resultat-success' : 'ad-resultat-warning'}>
                          {getResultatIcon(visites[0].resultat)} {visites[0].resultat || 'Non spécifié'}
                        </span></span>
                        {visites[0].observation && <span><strong>Observation :</strong> {visites[0].observation}</span>}
                        {visites[0].type_action && <span><strong>Action :</strong> {visites[0].type_action}</span>}
                        {visites[0].source && <span><strong>Source :</strong> {visites[0].source === 'FORMULAIRE' ? 'Formulaire' : 'Planning automatique'}</span>}
                      </div>
                    </div>
                  ) : <p className="ad-empty">Aucune visite enregistrée</p>}
                </div>

                {visites.length > 0 && (
                  <div className="ad-card">
                    <div className="ad-card-header"><FolderOpen size={18} /><h3>Historique des visites</h3></div>
                    <div className="ad-table">
                      {visites.slice(0, 10).map((v, i) => (
                        <div key={i} className="ad-table-row">
                          <div className="ad-table-cell">{formatDate(v.date_visite)}</div>
                          <div className="ad-table-cell">{getTypeVisiteIcon(v.type_visite)} {v.type_visite || 'Périodique'}</div>
                          <div className="ad-table-cell">{v.medecin || 'Médecin'}</div>
                          <div className={`ad-table-cell ${v.resultat === 'Apte' ? 'success' : 'warning'}`}>
                            {getResultatIcon(v.resultat)} {v.resultat || 'Effectuée'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {agentData?.date_fin_inaptitude && (
                  <div className="ad-card warning">
                    <div className="ad-card-header"><AlertTriangle size={18} /><h3>Période d'inaptitude</h3></div>
                    <div className="ad-inaptitude-info">
                      <span>Du {formatDate(agentData.date_debut_inaptitude)} au {formatDate(agentData.date_fin_inaptitude)}</span>
                      {getDaysLeft(agentData.date_fin_inaptitude) > 0 && <span className="ad-badge-warning">{getDaysLeft(agentData.date_fin_inaptitude)} jours restants</span>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ========== ONGLET 3 : ACCIDENTS ========== */}
            {activeTab === 'accidents' && (
              <div className="ad-tab-panel">
                <div className="ad-stats-row">
                  <div className="ad-stat-card"><div className="ad-stat-value">{stats.totalAccidents}</div><div className="ad-stat-label">Total accidents</div></div>
                  <div className="ad-stat-card"><div className="ad-stat-value">{stats.accidentsCetteAnnee}</div><div className="ad-stat-label">Cette année</div></div>
                  <div className="ad-stat-card"><div className="ad-stat-value">{stats.totalJoursArret}</div><div className="ad-stat-label">Jours d'arrêt</div></div>
                  <div className="ad-stat-card"><div className="ad-stat-value">{stats.joursArretCetteAnnee}</div><div className="ad-stat-label">Jours d'arrêt (année)</div></div>
                </div>

                {accidents.length > 0 ? (
                  <div className="ad-card">
                    <div className="ad-card-header"><AlertCircle size={18} /><h3>Historique des accidents</h3></div>
                    <div className="ad-accidents-list">
                      {accidents.map(acc => (
                        <div key={acc.id_accident} className="ad-accident-card">
                          <div className="ad-accident-header">
                            <span className="ad-accident-date">{formatDate(acc.date_accident)}</span>
                            <span className="ad-accident-badge" style={{ background: getGraviteColor(acc.gravite) }}>
                              {getGraviteIcon(acc.gravite)} {acc.gravite || 'Non définie'}
                            </span>
                            <span className={`ad-accident-status ${acc.statut === 'declare' ? 'declared' : 'draft'}`}>
                              {acc.statut === 'declare' ? '✓ Déclaré' : '📝 Brouillon'}
                            </span>
                          </div>
                          <div className="ad-accident-body">
                            {acc.numero_accident && <div className="ad-accident-detail"><strong>📄 N° accident :</strong> {acc.numero_accident}</div>}
                            {acc.lieu_accident && <div className="ad-accident-detail"><strong>📍 Lieu :</strong> {acc.lieu_accident}</div>}
                            {acc.nature_blessures && <div className="ad-accident-detail"><strong>🩺 Nature des blessures :</strong> {acc.nature_blessures}</div>}
                            {acc.endroit_blessures && <div className="ad-accident-detail"><strong>🎯 Endroit des blessures :</strong> {acc.endroit_blessures}</div>}
                            {acc.facteurs_materiels && <div className="ad-accident-detail"><strong>🔧 Facteurs matériels :</strong> {acc.facteurs_materiels}</div>}
                            {acc.condition_accident && <div className="ad-accident-detail"><strong>📋 Conditions :</strong> {acc.condition_accident}</div>}
                            {acc.mode_survenue && <div className="ad-accident-detail"><strong>⚡ Mode de survenue :</strong> {acc.mode_survenue}</div>}
                            <div className="ad-accident-detail"><strong>⏱️ Jours d'arrêt :</strong> {acc.jour_arret || 0} jours</div>
                            {(acc.temoin1 || acc.temoin2) && <div className="ad-accident-detail"><strong>👥 Témoins :</strong> {acc.temoin1}{acc.temoin2 ? `, ${acc.temoin2}` : ''}</div>}
                            {acc.numero_pv && <div className="ad-accident-detail"><strong>📎 PV n° :</strong> {acc.numero_pv}</div>}
                            {acc.tiers_responsable && <div className="ad-accident-detail"><strong>⚠️ Tiers responsable :</strong> {acc.nom_tiers || 'Oui'}</div>}
                            {acc.heure_accident && <div className="ad-accident-detail"><strong>🕐 Heure :</strong> {acc.heure_accident.substring(0,5)}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="ad-empty-state">
                    <Shield size={48} />
                    <p>Aucun accident de travail déclaré</p>
                    <span>Continuez à travailler en toute sécurité !</span>
                  </div>
                )}
              </div>
            )}

            {/* ========== ONGLET 4 : MON PROFIL ========== */}
            {activeTab === 'profile' && (
              <div className="ad-tab-panel">
                <div className="ad-profile-header">
                  <div className="ad-profile-avatar"><UserCircle size={64} /></div>
                  <div className="ad-profile-info">
                    <h2>{agentData?.prenom || 'Agent'} {agentData?.nom || ''}</h2>
                    <p className="ad-profile-role">
                      {agentData?.code_affectation === 3 ? 'Chauffeur' : 
                       agentData?.code_affectation === 5 ? 'Contrôle' : 
                       agentData?.code_affectation === 1 ? 'Administratif' : 'Agent de sécurité'}
                    </p>
                    <div className={`ad-profile-status ${agentData?.statut || 'actif'}`}>{getStatutTexte(agentData?.statut)}</div>
                  </div>
                </div>

                <div className="ad-profile-grid">
                  <div className="ad-card">
                    <div className="ad-card-header"><User size={16} /><h3>Informations personnelles</h3></div>
                    <div className="ad-info-list">
                      <div><label>Matricule</label><span>{agentData?.matricule_agent || user?.id}</span></div>
                      <div><label>Nom complet</label><span>{agentData?.prenom || ''} {agentData?.nom || ''}</span></div>
                      <div><label>Email</label><span>{user?.email || 'Non renseigné'}</span></div>
                      <div><label>📅 Date de naissance</label><span>{agentData?.date_naissance ? formatDateLong(agentData.date_naissance) : 'Non renseignée'}</span></div>
                    </div>
                  </div>

                  <div className="ad-card">
                    <div className="ad-card-header"><Briefcase size={16} /><h3>Informations professionnelles</h3></div>
                    <div className="ad-info-list">
                      <div><label>Agence</label><span>{agentData?.code_agence || 'Non renseignée'}</span></div>
                      <div><label>Affectation</label><span>
                        {agentData?.code_affectation === 3 ? 'Chauffeur' : 
                         agentData?.code_affectation === 5 ? 'Contrôle' : 
                         agentData?.code_affectation === 1 ? 'Administratif' : 'Agent de sécurité'}
                      </span></div>
                      {agentData?.direction && <div><label>🏢 Direction</label><span>{agentData.direction}</span></div>}
                      {agentData?.periodicite_jours && <div><label>⏱️ Périodicité visites</label><span>{agentData.periodicite_jours} jours</span></div>}
                      {agentData?.date_debut_inaptitude && <div className="warning"><label>⚠️ Inaptitude</label><span>du {formatDate(agentData.date_debut_inaptitude)} au {formatDate(agentData.date_fin_inaptitude)}</span></div>}
                    </div>
                  </div>
                </div>

                <div className="ad-card">
                  <div className="ad-card-header"><BarChart3 size={16} /><h3>Bilan {new Date().getFullYear()}</h3></div>
                  <div className="ad-bilan-grid">
                    <div><span>Visites médicales</span><strong>{stats.visitesCetteAnnee}</strong></div>
                    <div><span>Accidents</span><strong>{stats.accidentsCetteAnnee}</strong></div>
                    <div><span>Jours d'arrêt</span><strong>{stats.joursArretCetteAnnee}</strong></div>
                    <div><span>Taux d'aptitude</span><strong>{stats.tauxAptitude}%</strong></div>
                  </div>
                </div>

                <div className="ad-card">
                  <div className="ad-card-header"><AwardIcon size={16} /><h3>Récompenses</h3></div>
                  <div className="ad-badges">
                    {stats.joursSansAccident > 365 && <div className="ad-badge gold">🏆 Plus d'un an sans accident</div>}
                    {stats.tauxAptitude === 100 && stats.totalVisites > 0 && <div className="ad-badge green">✅ 100% d'aptitude</div>}
                    {stats.scoreSecurite >= 90 && <div className="ad-badge blue">🛡️ Score sécurité excellent</div>}
                    {stats.joursSansAccident === 0 && <div className="ad-badge gray">📋 Nouvel agent</div>}
                  </div>
                </div>

                <button className="ad-support-btn"><LifeBuoy size={16} /> Contacter le support</button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* MODALE NOTIFICATION */}
      <AnimatePresence>
        {showNotificationModal && selectedNotification && (
          <motion.div className="ad-modal-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowNotificationModal(false)}>
            <motion.div className="ad-modal-content" initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} onClick={e => e.stopPropagation()}>
              <div className="ad-modal-header">
                <h2><Bell size={18} /> Notification</h2>
                <button onClick={() => setShowNotificationModal(false)}><X size={18} /></button>
              </div>
              <div className="ad-modal-body">
                <div><label>Date :</label><span>{formatDateTime(selectedNotification.created_at)}</span></div>
                <div><label>Message :</label><span>{selectedNotification.message}</span></div>
              </div>
              <div className="ad-modal-footer">
                <button className="ad-btn-delete" onClick={() => { deleteNotification(selectedNotification.id); setShowNotificationModal(false); }}><Trash2 size={14} /> Supprimer</button>
                <button className="ad-btn-close" onClick={() => setShowNotificationModal(false)}>Fermer</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOUTON CHATBOT - ROBOT 3D */}
      <Robot3DProfessional />
      {isChatbotOpen && <AgentChatbot onClose={() => setIsChatbotOpen(false)} />}
      
    </div>
  );
};

export default AgentDashboard;