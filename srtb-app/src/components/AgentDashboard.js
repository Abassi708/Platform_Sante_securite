// src/components/AgentDashboard.js
import React, { useState, useEffect, useCallback } from 'react';
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
  FileText as FileIcon, Scale, Bone, Brain, Footprints, Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AgentChatbot from './AgentChatbot';
import '../styles/AgentDashboard.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ========== FONCTIONS UTILITAIRES ==========

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
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
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

  // ========== ÉTATS POUR LE SUPPORT ==========
  const [supportType, setSupportType] = useState('reclamation');
  const [supportUrgence, setSupportUrgence] = useState('normale');
  const [supportObjet, setSupportObjet] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportNom, setSupportNom] = useState('');
  const [supportPrenom, setSupportPrenom] = useState('');
  const [supportTelephone, setSupportTelephone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);
  const [supportSuccess, setSupportSuccess] = useState('');
  const [supportError, setSupportError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // ========== HORLOGE ==========
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bonjour');
    else if (hour < 18) setGreeting('Bon après-midi');
    else setGreeting('Bonsoir');
    return () => clearInterval(timer);
  }, []);

  // ========== INITIALISATION DONNÉES UTILISATEUR ==========
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user'));
    if (userData) {
      setSupportNom(userData.nom || '');
      setSupportPrenom(userData.prenom || '');
      setSupportEmail(userData.email || '');
    }
  }, []);

  // ========== CALCUL DES STATISTIQUES ==========
  const stats = {
    totalVisites: visites.length,
    visitesCetteAnnee: visites.filter(v => new Date(v.date_visite).getFullYear() === new Date().getFullYear()).length,
    totalAccidents: accidents.length,
    totalJoursArret: accidents.reduce((sum, a) => sum + (a.jour_arret || 0), 0),
    accidentsCetteAnnee: accidents.filter(a => new Date(a.date_accident).getFullYear() === new Date().getFullYear()).length,
    joursArretCetteAnnee: accidents.filter(a => new Date(a.date_accident).getFullYear() === new Date().getFullYear()).reduce((sum, a) => sum + (a.jour_arret || 0), 0),
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

  // ========== ENVOI DE LA DEMANDE DE SUPPORT ==========
  const sendSupportRequest = async () => {
    if (!supportObjet.trim()) {
      setSupportError('Veuillez saisir un objet');
      setTimeout(() => setSupportError(''), 5000);
      return;
    }
    if (!supportMessage.trim()) {
      setSupportError('Veuillez saisir un message');
      setTimeout(() => setSupportError(''), 5000);
      return;
    }
    if (!supportNom.trim() || !supportPrenom.trim()) {
      setSupportError('Veuillez renseigner vos nom et prénom');
      setTimeout(() => setSupportError(''), 5000);
      return;
    }

    setSendingSupport(true);
    setSupportSuccess('');
    setSupportError('');

    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user'));

    const typeLabels = {
      reclamation: 'Réclamation',
      demande: 'Demande d\'information',
      suggestion: 'Suggestion',
      signalement: 'Signalement'
    };

    const urgenceLabels = {
      normale: 'Normale',
      importante: 'Importante',
      urgente: 'Urgente'
    };

    try {
      const response = await fetch(`${API_URL}/api/support/agent-send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          destinataire: 'support',
          destinataireEmail: 'kawther.abassi@isgb.ucar.tn',
          destinataireNom: 'Service Support',
          type: typeLabels[supportType],
          urgence: urgenceLabels[supportUrgence],
          objet: supportObjet,
          message: supportMessage,
          agent_nom: supportNom,
          agent_prenom: supportPrenom,
          agent_matricule: userData.matricule_agent || userData.id,
          agent_email: supportEmail,
          agent_telephone: supportTelephone
        })
      });

      const data = await response.json();

      if (data.success) {
        setSupportSuccess('✓ Votre demande a été envoyée avec succès. Vous recevrez une réponse sous 48h.');
        setSupportObjet('');
        setSupportMessage('');
        setShowPreview(false);
        setTimeout(() => setSupportSuccess(''), 5000);
      } else {
        setSupportError('❌ Une erreur est survenue. Veuillez réessayer.');
        setTimeout(() => setSupportError(''), 5000);
      }
    } catch (error) {
      console.error('Erreur:', error);
      setSupportError('❌ Erreur de connexion. Vérifiez votre réseau.');
      setTimeout(() => setSupportError(''), 5000);
    } finally {
      setSendingSupport(false);
    }
  };

  // ========== FONCTION DE CHARGEMENT DES DONNÉES OPTIMISÉE ==========
  const loadData = useCallback(async () => {
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
      
      // ✅ TOUS LES APPELS EN PARALLÈLE
      const [agentDetailsRes, visitesRes, accidentsRes] = await Promise.all([
        fetch(`${API_URL}/api/technicien/agents/${matricule}`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        }),
        fetch(`${API_URL}/api/historique/formulaire?matricule=${matricule}&limit=50`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        }),
        fetch(`${API_URL}/api/accidents`, { 
          headers: { 'Authorization': `Bearer ${token}` } 
        })
      ]);
      
      // Traitement agent
      if (agentDetailsRes.ok) {
        const data = await agentDetailsRes.json();
        if (data.success && data.data?.agent) {
          const agent = data.data.agent;
          
          if (!agent.date_prochaine_visite && agent.date_derniere_visite) {
            const periodicite = agent.periodicite_jours || (agent.code_affectation === 3 ? 180 : 365);
            const dateDerniere = new Date(agent.date_derniere_visite);
            const dateProchaine = new Date(dateDerniere);
            dateProchaine.setDate(dateDerniere.getDate() + periodicite);
            agent.date_prochaine_visite = dateProchaine.toISOString().split('T')[0];
          }
          
          console.log('✅ Agent chargé:', agent);
          setAgentData(agent);
          
          const updatedUser = { ...userData, ...agent };
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setUser(updatedUser);
        } else {
          console.warn('⚠️ Agent non trouvé');
          setAgentData({
            matricule_agent: parseInt(matricule),
            nom: userData.nom || 'Agent',
            prenom: userData.prenom || '',
            statut: userData.statut || 'actif',
            date_derniere_visite: userData.date_derniere_visite || null,
            date_prochaine_visite: userData.date_prochaine_visite || null
          });
        }
      }
      
      // Traitement visites
      if (visitesRes.ok) {
        const data = await visitesRes.json();
        if (data.success) setVisites(data.historique || []);
      }
      
      // Traitement accidents
      if (accidentsRes.ok) {
        const data = await accidentsRes.json();
        if (data.success) {
          setAccidents(data.accidents.filter(a => String(a.matricule_agent) === String(matricule)));
        }
      }
      
      // ✅ RECHERCHE OPTIMISÉE DES VISITES FUTURES (Promise.all au lieu de boucle séquentielle)
      const aujourdhui = new Date().toISOString().split('T')[0];
      
      // Préparer les 27 semaines
      const semaines = [];
      for(let i = 0; i <= 26; i++) {
        const dateTemp = new Date();
        dateTemp.setDate(dateTemp.getDate() + (i * 7));
        semaines.push({
          semaine: getNumeroSemaine(dateTemp),
          annee: dateTemp.getFullYear()
        });
      }
      
      // ✅ TOUS LES APPELS EN PARALLÈLE (Promise.all)
      const planningPromises = semaines.map(async ({ semaine, annee }) => {
        try {
          const response = await fetch(`${API_URL}/api/planning/${semaine}/${annee}`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.planning) {
              return data.planning.filter(p => 
                String(p.matricule_agent) === String(matricule) && 
                p.statut === 'Programmé'
              );
            }
          }
        } catch(e) {}
        return [];
      });
      
      // Attendre tous les résultats
      const results = await Promise.all(planningPromises);
      const toutesVisitesTemp = [];
      for (const visites of results) {
        toutesVisitesTemp.push(...visites);
      }
      
      // Enlever les doublons
      const visitesUniques = [];
      const idsVus = new Set();
      for (const v of toutesVisitesTemp) {
        if (!idsVus.has(v.id_planning)) {
          idsVus.add(v.id_planning);
          visitesUniques.push(v);
        }
      }
      
      const visitesFutures = visitesUniques
        .filter(v => v.date_visite >= aujourdhui)
        .sort((a, b) => new Date(a.date_visite) - new Date(b.date_visite));
      
      setProchainesVisites(visitesFutures);
      console.log('✅ Visites futures trouvées:', visitesFutures.length);
      
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  // ========== CHARGEMENT INITIAL ==========
  useEffect(() => {
    if (localStorage.getItem('token')) {
      loadData();
    }
  }, [loadData]);

  useEffect(() => {
    if (user?.id) fetchNotifications(user.id);
  }, [user]);

  // ========== ONGLETS ==========
  const tabs = [
    { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard, color: '#c4a962' },
    { id: 'medical', label: 'Suivi médical', icon: Stethoscope, color: '#10b981' },
    { id: 'accidents', label: 'Accidents', icon: AlertCircle, color: '#ef4444' },
    { id: 'profile', label: 'Mon profil', icon: UserCircle, color: '#3b82f6' },
    { id: 'support', label: 'Support & Assistance', icon: LifeBuoy, color: '#c4a962'}  
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
      animate={{ y: [0, -3, 0], transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } }}
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
              <div className="ad-robot-3d-visor"><div className="ad-visor-glow"></div></div>
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
            <div className="ad-torso-panel center"><div className="ad-power-core"><div className="ad-core-inner"></div></div></div>
            <div className="ad-torso-panel bottom"></div>
            <div className="ad-robot-3d-badge"><Shield size={14} /></div>
          </div>
          <div className="ad-robot-3d-arm left"><div className="ad-arm-shoulder"></div><div className="ad-arm-forearm"></div><div className="ad-arm-hand"></div></div>
          <div className="ad-robot-3d-arm right"><div className="ad-arm-shoulder"></div><div className="ad-arm-forearm"></div><div className="ad-arm-hand"></div></div>
          <div className="ad-robot-3d-legs">
            <div className="ad-leg left"><div className="ad-leg-upper"></div><div className="ad-leg-lower"></div><div className="ad-leg-foot"></div></div>
            <div className="ad-leg right"><div className="ad-leg-upper"></div><div className="ad-leg-lower"></div><div className="ad-leg-foot"></div></div>
          </div>
        </div>
        <div className="ad-robot-3d-glow"></div>
        <AnimatePresence>
          {isRobotHovered && !isChatbotOpen && (
            <motion.div className="ad-robot-3d-bubble" initial={{ opacity: 0, scale: 0.9, x: -20 }} animate={{ opacity: 1, scale: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9, x: -20 }} transition={{ duration: 0.2 }}>
              <div className="ad-bubble-icon"><Bot size={16} /></div>
              <div className="ad-bubble-content"><span className="ad-bubble-title">Assistant SRTB</span><span className="ad-bubble-desc">Bonjour ! Comment puis-je vous aider ? 👋</span></div>
              <div className="ad-bubble-tail"></div>
            </motion.div>
          )}
        </AnimatePresence>
        {!isChatbotOpen && unreadCount > 0 && (<div className="ad-robot-3d-badge-notification"><span>{unreadCount}</span></div>)}
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
            <div><h1>Espace Agent</h1><p>{greeting}, {agentData?.prenom || user?.prenom || 'Agent'} {agentData?.nom || user?.nom || ''}</p></div>
          </div>
        </div>
        
        <div className="ad-header-right">
          <div className="ad-datetime">
            <Clock size={14} /><span>{currentTime.toLocaleTimeString('fr-FR')}</span>
            <Calendar size={14} /><span>{currentTime.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          
          <div className="ad-notifications-wrapper">
            <button className={`ad-notif-btn ${unreadCount > 0 ? 'has-notif' : ''}`} onClick={() => setShowNotifications(!showNotifications)}>
              <Bell size={18} />
              {unreadCount > 0 && <span className="ad-notif-badge">{unreadCount}</span>}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div className="ad-notif-dropdown" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="ad-notif-header"><h3>Notifications</h3><button onClick={() => setShowNotifications(false)}><X size={16} /></button></div>
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
          
          <button className="ad-logout-btn" onClick={handleLogout}><LogOut size={18} /><span>Déconnexion</span></button>
        </div>
      </header>

      {/* ONGLETS DE NAVIGATION */}
      <nav className="ad-tabs-nav">
        {tabs.map(tab => (
          <button key={tab.id} className={`ad-tab-btn-v2 ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
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
            
            {/* ONGLET 1 : VUE D'ENSEMBLE */}
            {activeTab === 'overview' && (
              <div className="ad-tab-panel">
                <div className="ad-kpi-grid-v2">
                  <div className="ad-kpi-card-v2">
                    <div className="ad-kpi-icon" style={{ background: '#fef3c7', color: '#d97706' }}><User size={20} /></div>
                    <div className="ad-kpi-info"><span className="ad-kpi-label">Statut</span><span className="ad-kpi-value">{getStatutTexte(agentData?.statut || user?.statut || 'actif')}</span></div>
                  </div>
                  <div className="ad-kpi-card-v2">
                    <div className="ad-kpi-icon" style={{ background: '#d1fae5', color: '#059669' }}><CalendarDays size={20} /></div>
                    <div className="ad-kpi-info"><span className="ad-kpi-label">Prochaine visite</span><span className="ad-kpi-value">{prochainesVisites[0]?.date_visite ? formatDate(prochainesVisites[0].date_visite) : (agentData?.date_prochaine_visite ? formatDate(agentData.date_prochaine_visite) : 'Non programmée')}</span></div>
                  </div>
                  <div className="ad-kpi-card-v2">
                    <div className="ad-kpi-icon" style={{ background: '#fee2e2', color: '#dc2626' }}><Hospital size={20} /></div>
                    <div className="ad-kpi-info">
                      <span className="ad-kpi-label">Dernière visite</span>
                      <span className="ad-kpi-value">
                        {agentData?.date_derniere_visite ? formatDate(agentData.date_derniere_visite) : 
                         (visites[0]?.date_visite ? formatDate(visites[0].date_visite) : 
                         (user?.date_derniere_visite ? formatDate(user.date_derniere_visite) : 'Jamais'))}
                      </span>
                    </div>
                  </div>
                  <div className="ad-kpi-card-v2">
                    <div className="ad-kpi-icon" style={{ background: '#e0e7ff', color: '#4f46e5' }}><BriefcaseMedical size={20} /></div>
                    <div className="ad-kpi-info"><span className="ad-kpi-label">Accidents</span><span className="ad-kpi-value">{stats.totalAccidents}</span></div>
                  </div>
                </div>

                {alerts.length > 0 && (
                  <div className="ad-alerts-section"><h3><AlertTriangle size={16} /> Alertes</h3>
                    {alerts.map((alert, i) => (<div key={i} className={`ad-alert-card ${alert.type}`}><span className="ad-alert-icon">{alert.icon}</span><div><div className="ad-alert-title">{alert.title}</div><div className="ad-alert-msg">{alert.message}</div></div></div>))}
                  </div>
                )}

                {accidents.slice(0, 3).length > 0 && (
                  <div className="ad-recent-list"><h3><AlertCircle size={16} /> Derniers accidents</h3>
                    {accidents.slice(0, 3).map(acc => (
                      <div key={acc.id_accident} className="ad-recent-item">
                        <div className="ad-recent-date">{formatDate(acc.date_accident)}</div>
                        <div className="ad-recent-badge" style={{ background: getGraviteColor(acc.gravite) }}>{getGraviteIcon(acc.gravite)} {acc.gravite || 'Non définie'}</div>
                        <div className="ad-recent-info">{acc.lieu_accident || 'Lieu non spécifié'}</div>
                        <div className="ad-recent-duration">{acc.jour_arret || 0} jours</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="ad-quick-actions"><h3><ExternalLink size={16} /> Accès rapides</h3>
                  <div className="ad-actions-grid">
                    <button className="ad-action-btn" onClick={() => setActiveTab('medical')}><Stethoscope size={18} /><span>Suivi médical</span></button>
                    <button className="ad-action-btn" onClick={() => setActiveTab('accidents')}><AlertCircle size={18} /><span>Mes accidents</span></button>
                    <button className="ad-action-btn" onClick={() => setActiveTab('profile')}><UserCircle size={18} /><span>Mon profil</span></button>
                  </div>
                </div>
              </div>
            )}

            {/* ONGLET 2 : SUIVI MÉDICAL */}
            {activeTab === 'medical' && (
              <div className="ad-tab-panel">
                <div className="ad-card">
                  <div className="ad-card-header"><CalendarDays size={18} /><h3>Prochaine visite médicale</h3></div>
                  {prochainesVisites[0] ? (
                    <div className="ad-next-visit">
                      <div className="ad-visit-date-large">{formatDateLong(prochainesVisites[0].date_visite)}</div>
                      <div className="ad-visit-details">
                        <span><strong>Type :</strong> {getTypeVisiteIcon(prochainesVisites[0].type_visite)} {prochainesVisites[0].type_visite || 'Périodique'}</span>
                        <span><strong>Heure :</strong> {prochainesVisites[0].heure_visite?.substring(0,5) || 'À définir'}</span>
                        <span><strong>Délai :</strong> {getDaysLeft(prochainesVisites[0].date_visite) > 0 ? `${getDaysLeft(prochainesVisites[0].date_visite)} jours` : 'Date dépassée'}</span>
                      </div>
                    </div>
                  ) : agentData?.date_prochaine_visite ? (
                    <div className="ad-next-visit">
                      <div className="ad-visit-date-large">{formatDateLong(agentData.date_prochaine_visite)}</div>
                      <div className="ad-visit-details">
                        <span><strong>Type :</strong> 📅 Périodique</span>
                        <span><strong>Heure :</strong> À définir</span>
                        <span><strong>Délai :</strong> {getDaysLeft(agentData.date_prochaine_visite) > 0 ? `${getDaysLeft(agentData.date_prochaine_visite)} jours` : 'Date dépassée'}</span>
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
                        <span><strong>Résultat :</strong> <span className={visites[0].resultat === 'Apte' ? 'ad-resultat-success' : 'ad-resultat-warning'}>{getResultatIcon(visites[0].resultat)} {visites[0].resultat || 'Non spécifié'}</span></span>
                        {visites[0].observation && <span><strong>Observation :</strong> {visites[0].observation}</span>}
                      </div>
                    </div>
                  ) : (agentData?.date_derniere_visite || user?.date_derniere_visite) ? (
                    <div className="ad-last-visit">
                      <div className="ad-visit-date">{formatDateLong(agentData?.date_derniere_visite || user?.date_derniere_visite)}</div>
                      <div className="ad-visit-details"><span><strong>Type :</strong> Non spécifié</span><span><strong>Médecin :</strong> Non renseigné</span><span><strong>Résultat :</strong> Non renseigné</span></div>
                    </div>
                  ) : <p className="ad-empty">Aucune visite enregistrée</p>}
                </div>

                {visites.length > 0 && (
                  <div className="ad-card">
                    <div className="ad-card-header"><FolderOpen size={18} /><h3>Historique des visites</h3></div>
                    <div className="ad-table">
                      {visites.slice(0, 5).map((v, i) => (
                        <div key={i} className="ad-table-row">
                          <div className="ad-table-cell">{formatDate(v.date_visite)}</div>
                          <div className="ad-table-cell">{getTypeVisiteIcon(v.type_visite)} {v.type_visite || 'Périodique'}</div>
                          <div className="ad-table-cell">{v.medecin || 'Médecin'}</div>
                          <div className={`ad-table-cell ${v.resultat === 'Apte' ? 'success' : 'warning'}`}>{getResultatIcon(v.resultat)} {v.resultat || 'Effectuée'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ONGLET 3 : ACCIDENTS */}
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
                            <span className="ad-accident-badge" style={{ background: getGraviteColor(acc.gravite) }}>{getGraviteIcon(acc.gravite)} {acc.gravite || 'Non définie'}</span>
                            <span className={`ad-accident-status ${acc.statut === 'declare' ? 'declared' : 'draft'}`}>{acc.statut === 'declare' ? '✓ Déclaré' : '📝 Brouillon'}</span>
                          </div>
                          <div className="ad-accident-body">
                            {acc.numero_accident && <div className="ad-accident-detail"><strong>📄 N° accident :</strong> {acc.numero_accident}</div>}
                            {acc.lieu_accident && <div className="ad-accident-detail"><strong>📍 Lieu :</strong> {acc.lieu_accident}</div>}
                            {acc.nature_blessures && <div className="ad-accident-detail"><strong>🩺 Nature des blessures :</strong> {acc.nature_blessures}</div>}
                            <div className="ad-accident-detail"><strong>⏱️ Jours d'arrêt :</strong> {acc.jour_arret || 0} jours</div>
                            {acc.heure_accident && <div className="ad-accident-detail"><strong>🕐 Heure :</strong> {acc.heure_accident.substring(0,5)}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="ad-empty-state"><Shield size={48} /><p>Aucun accident de travail déclaré</p><span>Continuez à travailler en toute sécurité !</span></div>
                )}
              </div>
            )}

            {/* ONGLET 4 : MON PROFIL */}
            {activeTab === 'profile' && (
              <div className="ad-tab-panel">
                <div className="ad-profile-header">
                  <div className="ad-profile-avatar"><UserCircle size={64} /></div>
                  <div className="ad-profile-info">
                    <h2>{agentData?.prenom || user?.prenom || 'Agent'} {agentData?.nom || user?.nom || ''}</h2>
                    <p className="ad-profile-role">{agentData?.code_affectation === 3 ? 'Chauffeur' : agentData?.code_affectation === 5 ? 'Contrôle' : 'Agent de sécurité'}</p>
                    <div className={`ad-profile-status ${agentData?.statut || user?.statut || 'actif'}`}>{getStatutTexte(agentData?.statut || user?.statut || 'actif')}</div>
                  </div>
                </div>

                <div className="ad-profile-grid">
                  <div className="ad-card"><div className="ad-card-header"><User size={16} /><h3>Informations personnelles</h3></div>
                    <div className="ad-info-list">
                      <div><label>Matricule</label><span>{agentData?.matricule_agent || user?.id}</span></div>
                      <div><label>Nom complet</label><span>{agentData?.prenom || user?.prenom || ''} {agentData?.nom || user?.nom || ''}</span></div>
                      <div><label>Email</label><span>{user?.email || 'Non renseigné'}</span></div>
                      <div><label> Date de naissance</label><span>{agentData?.date_naissance ? formatDateLong(agentData.date_naissance) : (user?.date_naissance ? formatDateLong(user.date_naissance) : 'Non renseignée')}</span></div>
                    </div>
                  </div>

                  <div className="ad-card"><div className="ad-card-header"><Briefcase size={16} /><h3>Informations professionnelles</h3></div>
                    <div className="ad-info-list">
                      <div><label>Agence</label><span>{agentData?.code_agence || user?.code_agence || 'Non renseignée'}</span></div>
                      <div><label>Affectation</label><span>{agentData?.code_affectation === 3 ? 'Chauffeur' : agentData?.code_affectation === 5 ? 'Contrôle' : 'Agent de sécurité'}</span></div>
                      {agentData?.direction && <div><label> Direction</label><span>{agentData.direction}</span></div>}
                      {agentData?.periodicite_jours && <div><label> Périodicité visites</label><span>{agentData.periodicite_jours} jours</span></div>}
                    </div>
                  </div>
                </div>

                <div className="ad-card"><div className="ad-card-header"><BarChart3 size={16} /><h3>Bilan {new Date().getFullYear()}</h3></div>
                  <div className="ad-bilan-grid">
                    <div><span>Visites médicales</span><strong>{stats.visitesCetteAnnee}</strong></div>
                    <div><span>Accidents</span><strong>{stats.accidentsCetteAnnee}</strong></div>
                    <div><span>Jours d'arrêt</span><strong>{stats.joursArretCetteAnnee}</strong></div>
                    <div><span>Taux d'aptitude</span><strong>{stats.tauxAptitude}%</strong></div>
                  </div>
                </div>

                <div className="ad-card"><div className="ad-card-header"><AwardIcon size={16} /><h3>Récompenses</h3></div>
                  <div className="ad-badges">
                    {stats.joursSansAccident > 365 && <div className="ad-badge gold">🏆 Plus d'un an sans accident</div>}
                    {stats.tauxAptitude === 100 && stats.totalVisites > 0 && <div className="ad-badge green">✅ 100% d'aptitude</div>}
                    {stats.scoreSecurite >= 90 && <div className="ad-badge blue">🛡️ Score sécurité excellent</div>}
                  </div>
                </div>

                <button className="ad-support-btn"><LifeBuoy size={16} /> Contacter le support</button>
              </div>
            )}

            {/* ONGLET 5 : SUPPORT & ASSISTANCE */}
            {activeTab === 'support' && (
              <div className="ad-support-professional">
                
                {/* En-tête */}
                <div className="ad-professional-header">
                  <div className="ad-professional-badge">
                    <LifeBuoy size={24} />
                  </div>
                  <div className="ad-professional-title">
                    <h1>Support & Assistance</h1>
                    <p>Formulaire de contact officiel - Service Relations Agents</p>
                  </div>
                </div>

                {/* Formulaire */}
                <div className="ad-professional-form">
                  
                  {/* Section 1 : Informations du demandeur */}
                  <div className="ad-form-section">
                    <div className="ad-section-title">
                      <div className="ad-section-icon">👤</div>
                      <h3>Informations du demandeur</h3>
                      <span>Tous les champs sont obligatoires</span>
                    </div>
                    
                    <div className="ad-form-row-2cols">
                      <div className="ad-form-field">
                        <label>Nom *</label>
                        <input type="text" value={supportNom} onChange={(e) => setSupportNom(e.target.value)} placeholder="Votre nom" />
                      </div>
                      <div className="ad-form-field">
                        <label>Prénom *</label>
                        <input type="text" value={supportPrenom} onChange={(e) => setSupportPrenom(e.target.value)} placeholder="Votre prénom" />
                      </div>
                    </div>

                    <div className="ad-form-row-2cols">
                      <div className="ad-form-field">
                        <label>Email professionnel *</label>
                        <input type="email" value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} placeholder="email@domaine.com" />
                      </div>
                      <div className="ad-form-field">
                        <label>Téléphone (optionnel)</label>
                        <input type="tel" value={supportTelephone} onChange={(e) => setSupportTelephone(e.target.value)} placeholder="Votre numéro" />
                      </div>
                    </div>
                  </div>

                  {/* Section 2 : Détails de la demande */}
                  <div className="ad-form-section">
                    <div className="ad-section-title">
                      <div className="ad-section-icon">📋</div>
                      <h3>Détails de la demande</h3>
                      <span>Précisez votre requête</span>
                    </div>

                    <div className="ad-form-row-2cols">
                      <div className="ad-form-field">
                        <label>Type de demande *</label>
                        <select value={supportType} onChange={(e) => setSupportType(e.target.value)}>
                          <option value="reclamation"> Réclamation</option>
                          <option value="demande"> Demande d'information</option>
                          <option value="suggestion"> Suggestion</option>
                          <option value="signalement"> Signalement</option>
                        </select>
                      </div>
                      <div className="ad-form-field">
                        <label>Niveau d'urgence *</label>
                        <select value={supportUrgence} onChange={(e) => setSupportUrgence(e.target.value)}>
                          <option value="normale"> Normale - 48h</option>
                          <option value="importante"> Importante - 24h</option>
                          <option value="urgente"> Urgente - 8h</option>
                        </select>
                      </div>
                    </div>

                    <div className="ad-form-field">
                      <label>Objet de la demande *</label>
                      <input type="text" value={supportObjet} onChange={(e) => setSupportObjet(e.target.value)} placeholder="Ex: Problème administratif, demande de document, signalement..." />
                    </div>

                    <div className="ad-form-field">
                      <label>Description détaillée *</label>
                      <textarea rows={6} value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="Décrivez votre situation de manière précise et complète..." />
                    </div>
                  </div>

                  {/* Aperçu */}
                  {(supportObjet || supportMessage) && (
                    <div className="ad-professional-preview">
                      <div className="ad-preview-header">
                        <FileText size={16} />
                        <span>Aperçu de votre demande</span>
                        <button className="ad-preview-toggle" onClick={() => setShowPreview(!showPreview)}>
                          {showPreview ? 'Masquer' : 'Voir l\'aperçu'}
                        </button>
                      </div>
                      
                      {showPreview && (
                        <div className="ad-preview-body">
                          <div className="ad-preview-field">
                            <strong>Type :</strong> 
                            <span>{supportType === 'reclamation' ? '📝 Réclamation' : supportType === 'demande' ? ' Demande' : supportType === 'suggestion' ? ' Suggestion' : ' Signalement'}</span>
                            <span className={`ad-urgence-badge ${supportUrgence}`}>
                              {supportUrgence === 'normale' ? ' Normale' : supportUrgence === 'importante' ? ' Importante' : ' Urgente'}
                            </span>
                          </div>
                          <div className="ad-preview-field"><strong>Objet :</strong> <span>{supportObjet || '—'}</span></div>
                          <div className="ad-preview-field"><strong>Message :</strong> <div className="ad-preview-message">{supportMessage || '—'}</div></div>
                          <div className="ad-preview-field"><strong>Demandeur :</strong> <span>{supportNom} {supportPrenom}</span></div>
                          <div className="ad-preview-field"><strong>Email :</strong> <span>{supportEmail}</span></div>
                          <div className="ad-preview-note">
                            📌 Une copie de cette demande vous sera envoyée par email
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Messages */}
                  {supportSuccess && (
                    <div className="ad-support-message success">
                      <CheckCircle size={18} />
                      <div>
                        <strong>Demande envoyée</strong>
                        <p>{supportSuccess}</p>
                      </div>
                    </div>
                  )}
                  
                  {supportError && (
                    <div className="ad-support-message error">
                      <AlertCircle size={18} />
                      <div>
                        <strong>Erreur</strong>
                        <p>{supportError}</p>
                      </div>
                    </div>
                  )}

                  {/* Bouton d'envoi */}
                  <div className="ad-form-actions">
                    <button 
                      className="ad-submit-button"
                      onClick={sendSupportRequest}
                      disabled={!supportObjet.trim() || !supportMessage.trim() || !supportNom.trim() || !supportPrenom.trim() || sendingSupport}
                    >
                      {sendingSupport ? (
                        <>
                          <div className="ad-loading-spinner"></div>
                          Envoi en cours...
                        </>
                      ) : (
                        <>
                          <Send size={18} />
                          Envoyer la demande
                        </>
                      )}
                    </button>
                    <p className="ad-form-note">
                      🔒 Toutes les informations sont confidentielles et protégées
                    </p>
                  </div>

                </div>

                {/* Contacts rapides */}
                <div className="ad-professional-contacts">
                  <div className="ad-contact-card">
                    <div className="ad-contact-icon"></div>
                    <div className="ad-contact-info">
                      <strong>Service Support</strong>
                      <a href="tel:+21671234570">71 234 570</a>
                      <span>Lun-Ven: 8h-16h</span>
                    </div>
                  </div>
                  <div className="ad-contact-card">
                    <div className="ad-contact-icon"></div>
                    <div className="ad-contact-info">
                      <strong>Support technique</strong>
                      <a href="mailto:support@srtb.tn">support@srtb.tn</a>
                      <span>Délai de réponse: 24h</span>
                    </div>
                  </div>
                  <div className="ad-contact-card">
                    <div className="ad-contact-icon"></div>
                    <div className="ad-contact-info">
                      <strong>Service Social</strong>
                      <span>Bâtiment A - 1er étage</span>
                      <span>Sur rendez-vous</span>
                    </div>
                  </div>
                </div>

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
              <div className="ad-modal-header"><h2><Bell size={18} /> Notification</h2><button onClick={() => setShowNotificationModal(false)}><X size={18} /></button></div>
              <div className="ad-modal-body"><div><label>Date :</label><span>{formatDateTime(selectedNotification.created_at)}</span></div><div><label>Message :</label><span>{selectedNotification.message}</span></div></div>
              <div className="ad-modal-footer"><button className="ad-btn-delete" onClick={() => { deleteNotification(selectedNotification.id); setShowNotificationModal(false); }}><Trash2 size={14} /> Supprimer</button><button className="ad-btn-close" onClick={() => setShowNotificationModal(false)}>Fermer</button></div>
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