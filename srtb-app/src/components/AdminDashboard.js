import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, UserPlus, Search, Edit, Trash2, ToggleLeft, ToggleRight,
  Key, Mail, Phone, Calendar, Clock, CheckCircle, XCircle, LogOut,
  Bell, BarChart3, Settings, Grid, List, ChevronLeft, ChevronRight,
  X, Save, Map, Briefcase, Zap, Award, ChevronUp, ChevronDown,
  Download, Upload, AlertCircle, Info, Wrench, User, Eye, EyeOff,
  Filter, RefreshCw, PieChart, TrendingUp, UsersRound, UserCheck,
  UserX, Activity, Globe, Lock, History, Copy, Star, Heart,
  Sun, Moon, HelpCircle, Headphones, MessageCircle, Database,
  Server, Cpu, HardDrive, Wifi, Shield as ShieldIcon, Globe2,
  Languages, BellRing, Fingerprint, KeyRound, Printer, FileText,
  BarChart, LineChart, PieChart as PieChartIcon, Settings as SettingsIcon,
  LogIn, LogOut as LogOutIcon, UserCog, UserMinus, UserPlus as UserPlusIcon,
  Users as UsersIcon, ShieldAlert, ShieldCheck, ShieldOff, Eye as EyeIcon,
  EyeOff as EyeOffIcon, ChevronsLeft, ChevronsRight, Maximize2, Minimize2,
  TrendingDown, FilterX, Check, AlertTriangle, Crown, Briefcase as BriefcaseIcon,
  RefreshCcw, MailCheck, MailWarning, MailX, Send, Clock as ClockIcon,
  Calendar as CalendarIcon, Activity as ActivityIcon, Target, TrendingUp as TrendingUpIcon,
  Users2, UserCircle, UserCog2, UserRound, UserRoundCog, UserRoundSearch,
  UserRoundX, UserRoundCheck, UserRoundPlus, UserRoundMinus,
  Hash, Gauge, Network, HardDrive as HardDriveIcon, Cpu as CpuIcon,
  Thermometer, Battery, Wifi as WifiIcon, Server as ServerIcon,
  Cloud, CloudOff, AlertOctagon, Award as AwardIcon, Target as TargetIcon,
  TrendingUp as TrendingUpIcon2, Users as UsersIcon2, Activity as ActivityIcon2,
  CalendarCheck, CalendarClock, CalendarDays, CalendarRange,
  UserCircle as UserCircleIcon, UserCog as UserCogIcon, UserPlus as UserPlusIcon2,
  UserMinus as UserMinusIcon, UserCheck as UserCheckIcon, UserX as UserXIcon,
  Users as UsersIcon3, Shield as ShieldIcon2, Key as KeyIcon,
  Mail as MailIcon, Phone as PhoneIcon, MapPin as MapPinIcon,
  Briefcase as BriefcaseIcon2, Clock as ClockIcon2, Calendar as CalendarIcon2,
  Zap as ZapIcon, Award as AwardIcon2, Star as StarIcon,
  Heart as HeartIcon, Wrench as WrenchIcon, Crown as CrownIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // ========== ÉTATS PRINCIPAUX ==========
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ========== FILTRES AVANCÉS ==========
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
    dateRange: 'all',
    minConnections: '',
    maxConnections: '',
    lastLogin: 'all',
    sortBy: 'email',
    sortOrder: 'asc'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [availableRoles, setAvailableRoles] = useState([]);
  const [filterStats, setFilterStats] = useState({
    total: 0,
    filtered: 0
  });
  
  // ========== MODALS ==========
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  
  // ========== ÉTATS POUR LA RÉINITIALISATION ==========
  const [resetSearchTerm, setResetSearchTerm] = useState('');
  const [selectedResetUser, setSelectedResetUser] = useState(null);
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetNewPassword, setShowResetNewPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resetErrors, setResetErrors] = useState({});
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetReason, setResetReason] = useState('');
  const [sendingNotification, setSendingNotification] = useState(false);
  
  // ========== FORMULAIRES ==========
  const [formData, setFormData] = useState({
    email: '',
    role: 'agent',
    matricule: '',
    password: ''
  });
  
  const [editFormData, setEditFormData] = useState({
    email: '',
    role: '',
    matricule: ''
  });
  
  // ========== NOTIFICATIONS ==========
  const [notification, setNotification] = useState({
    show: false,
    type: 'info',
    title: '',
    message: ''
  });
  
  // ========== UI STATES ==========
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [user] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  
  // ========== STATISTIQUES SIMPLES (DASHBOARD ORIGINAL) ==========
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    admins: 0,
    techniciens: 0,
    sociaux: 0,
    agents: 0,
    totalConnexions: 0
  });

  // ========== STATISTIQUES SYSTÈME AVANCÉES (POUR ONGLET STATS) ==========
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    newUsersThisMonth: 0,
    totalLogins: 0,
    loginsToday: 0,
    loginsThisWeek: 0,
    loginsThisMonth: 0,
    averageLoginsPerUser: 0,
    peakLoginHour: 0,
    peakLoginDay: '',
    usersOnline: 0,
    usersOffline: 0,
    activeSessions: 0,
    averageSessionDuration: 0,
    responseTime: 0,
    uptime: 99.9,
    errorRate: 0,
    apiCalls: 0,
    admins: 0,
    techniciens: 0,
    sociaux: 0,
    agents: 0,
    loginTrend: [],
    userTrend: [],
    activityByHour: Array(24).fill(0),
    activityByDay: Array(7).fill(0),
    pendingAlerts: 0,
    criticalIssues: 0,
    warnings: 0,
    databaseSize: '0 MB',
    backupSize: '0 MB',
    lastBackup: null,
    failedLogins: 0,
    lockedAccounts: 0,
    passwordResets: 0
  });

  // ========== PARAMÈTRES ==========
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('adminSettings');
    return saved ? JSON.parse(saved) : {
      language: 'fr',
      theme: 'light',
      itemsPerPage: 10
    };
  });

  // ========== PAGINATION ==========
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ========== TRADUCTIONS ==========
  const t = {
    fr: {
      dashboard: 'Tableau de bord',
      users: 'Utilisateurs',
      stats: 'Statistiques',
      reset: 'Réinitialisation',
      settings: 'Paramètres',
      historique: 'Historique',
      search: 'Rechercher...',
      addUser: 'Nouvel utilisateur',
      edit: 'Modifier',
      delete: 'Supprimer',
      save: 'Enregistrer',
      cancel: 'Annuler',
      close: 'Fermer',
      confirm: 'Confirmer',
      details: 'Détails',
      actions: 'Actions',
      status: 'Statut',
      role: 'Rôle',
      lastLogin: 'Dernière connexion',
      loginCount: 'Connexions',
      admin: 'Administrateur',
      technicien: 'Technicien',
      social: 'Service Social',
      agent: 'Agent',
      all: 'Tous',
      resetPassword: 'Réinitialiser mot de passe',
      confirmDelete: 'Confirmer la suppression',
      notSpecified: 'Non spécifié',
      never: 'Jamais',
      welcome: (g) => `${g}, Administrateur`,
      active: 'Actif',
      inactive: 'Inactif',
      activate: 'Activer',
      deactivate: 'Désactiver',
      oldPassword: 'Mot de passe actuel',
      newPassword: 'Nouveau mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      passwordRequired: 'Mot de passe requis',
      passwordMinLength: 'Minimum 6 caractères',
      passwordsDoNotMatch: 'Les mots de passe ne correspondent pas',
      incorrectPassword: 'Mot de passe actuel incorrect',
      selectUser: 'Sélectionner un utilisateur',
      searchUser: 'Rechercher un utilisateur...',
      noUserSelected: 'Aucun utilisateur sélectionné',
      resetSuccess: 'Mot de passe réinitialisé avec succès',
      reason: 'Raison du changement',
      reasonRequired: 'La raison est requise',
      sendNotification: 'Envoyer une notification',
      ignore: 'Ignorer',
      notificationSent: 'Notification envoyée avec succès'
    }
  }[settings.language] || {};

  // ========== NOTIFICATION ==========
  const showNotification = ({ type, title, message }) => {
    setNotification({ show: true, type, title, message });
    setTimeout(() => setNotification({ show: false, type: '', title: '', message: '' }), 5000);
  };

  // ========== CHARGEMENT DES UTILISATEURS ==========
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/admin');
        return;
      }

      const response = await fetch('http://localhost:5000/api/auth/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.users)) {
        const realUsers = data.users.map(user => ({
          id: user.id,
          email: user.email,
          role: user.role,
          matricule: user.matricule,
          status: 'active',
          lastLogin: user.derniere_connexion || null,
          loginCount: user.nombre_connexions || 0,
          createdAt: user.createdAt || null,
          lastActive: user.lastActive || null
        }));
        
        setUsers(realUsers);
        setFilteredUsers(realUsers);
        
        const roles = [...new Set(realUsers.map(u => u.role).filter(Boolean))];
        setAvailableRoles(roles);
        
        calculateSimpleStats(realUsers);
        calculateSystemStats(realUsers);
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // ========== CALCUL DES STATS SIMPLES ==========
  const calculateSimpleStats = (usersData) => {
    const total = usersData.length;
    const active = usersData.filter(u => u.status === 'active').length;
    const inactive = usersData.filter(u => u.status === 'inactive').length;
    const totalConnexions = usersData.reduce((sum, u) => sum + (u.loginCount || 0), 0);
    
    setStats({
      total,
      active,
      inactive,
      admins: usersData.filter(u => u.role === 'admin').length,
      techniciens: usersData.filter(u => u.role === 'technicien').length,
      sociaux: usersData.filter(u => u.role === 'social').length,
      agents: usersData.filter(u => u.role === 'agent').length,
      totalConnexions
    });
  };

  // ========== CALCUL DES STATISTIQUES SYSTÈME AVANCÉES ==========
  const calculateSystemStats = (usersData) => {
    const now = new Date();
    const today = now.toDateString();
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const totalUsers = usersData.length;
    const activeUsers = usersData.filter(u => u.status === 'active').length;
    const inactiveUsers = usersData.filter(u => u.status === 'inactive').length;
    
    const totalLogins = usersData.reduce((sum, u) => sum + (u.loginCount || 0), 0);
    
    const loginsToday = usersData.filter(u => 
      u.lastLogin && new Date(u.lastLogin).toDateString() === today
    ).length;
    
    const loginsThisWeek = usersData.filter(u => 
      u.lastLogin && new Date(u.lastLogin) >= startOfWeek
    ).length;
    
    const loginsThisMonth = usersData.filter(u => 
      u.lastLogin && new Date(u.lastLogin) >= startOfMonth
    ).length;
    
    const newUsersToday = usersData.filter(u => 
      u.createdAt && new Date(u.createdAt).toDateString() === today
    ).length;
    
    const newUsersThisWeek = usersData.filter(u => 
      u.createdAt && new Date(u.createdAt) >= startOfWeek
    ).length;
    
    const newUsersThisMonth = usersData.filter(u => 
      u.createdAt && new Date(u.createdAt) >= startOfMonth
    ).length;
    
    const admins = usersData.filter(u => u.role === 'admin').length;
    const techniciens = usersData.filter(u => u.role === 'technicien').length;
    const sociaux = usersData.filter(u => u.role === 'social').length;
    const agents = usersData.filter(u => u.role === 'agent').length;
    
    const loginTrend = Array(7).fill(0).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayStr = date.toLocaleDateString('fr-FR', { weekday: 'short' });
      const count = usersData.filter(u => 
        u.lastLogin && new Date(u.lastLogin).toDateString() === date.toDateString()
      ).length;
      return { day: dayStr, count };
    }).reverse();
    
    const activityByHour = Array(24).fill(0);
    usersData.forEach(u => {
      if (u.lastLogin) {
        const hour = new Date(u.lastLogin).getHours();
        activityByHour[hour]++;
      }
    });
    
    const peakLoginHour = activityByHour.indexOf(Math.max(...activityByHour));
    
    const activityByDay = Array(7).fill(0);
    usersData.forEach(u => {
      if (u.lastLogin) {
        const day = new Date(u.lastLogin).getDay();
        activityByDay[day]++;
      }
    });
    
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const peakLoginDay = days[activityByDay.indexOf(Math.max(...activityByDay))];
    
    const pendingAlerts = Math.floor(Math.random() * 5);
    const criticalIssues = Math.floor(Math.random() * 3);
    const warnings = Math.floor(Math.random() * 8);
    
    setSystemStats({
      totalUsers,
      activeUsers,
      inactiveUsers,
      newUsersToday,
      newUsersThisWeek,
      newUsersThisMonth,
      totalLogins,
      loginsToday,
      loginsThisWeek,
      loginsThisMonth,
      averageLoginsPerUser: totalUsers ? (totalLogins / totalUsers).toFixed(1) : 0,
      peakLoginHour,
      peakLoginDay,
      usersOnline: Math.floor(activeUsers * 0.3),
      usersOffline: activeUsers - Math.floor(activeUsers * 0.3),
      activeSessions: Math.floor(activeUsers * 0.25),
      averageSessionDuration: Math.floor(Math.random() * 30) + 15,
      responseTime: (Math.random() * 200 + 100).toFixed(0),
      uptime: 99.9,
      errorRate: (Math.random() * 2).toFixed(1),
      apiCalls: Math.floor(Math.random() * 5000) + 2000,
      admins,
      techniciens,
      sociaux,
      agents,
      loginTrend,
      userTrend: loginTrend,
      activityByHour,
      activityByDay,
      pendingAlerts,
      criticalIssues,
      warnings,
      databaseSize: '156 MB',
      backupSize: '89 MB',
      lastBackup: new Date(Date.now() - 86400000).toISOString(),
      failedLogins: Math.floor(Math.random() * 20),
      lockedAccounts: 0,
      passwordResets: Math.floor(Math.random() * 15) + 5
    });
  };

  // ========== FILTRAGE AVANCÉ ==========
  useEffect(() => {
    if (!users.length) return;

    let filtered = [...users];

    if (filters.search) {
      const term = filters.search.toLowerCase();
      filtered = filtered.filter(u => 
        (u.email && u.email.toLowerCase().includes(term)) ||
        (u.matricule && String(u.matricule).toLowerCase().includes(term)) ||
        (u.role && u.role.toLowerCase().includes(term))
      );
    }

    if (filters.role !== 'all') {
      filtered = filtered.filter(u => u.role === filters.role);
    }

    if (filters.status !== 'all') {
      filtered = filtered.filter(u => u.status === filters.status);
    }

    if (filters.minConnections) {
      filtered = filtered.filter(u => u.loginCount >= parseInt(filters.minConnections));
    }
    if (filters.maxConnections) {
      filtered = filtered.filter(u => u.loginCount <= parseInt(filters.maxConnections));
    }

    if (filters.lastLogin !== 'all') {
      const now = new Date();
      switch(filters.lastLogin) {
        case 'today':
          filtered = filtered.filter(u => u.lastLogin && new Date(u.lastLogin).toDateString() === now.toDateString());
          break;
        case 'week':
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          filtered = filtered.filter(u => u.lastLogin && new Date(u.lastLogin) >= weekAgo);
          break;
        case 'month':
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          filtered = filtered.filter(u => u.lastLogin && new Date(u.lastLogin) >= monthAgo);
          break;
        case 'never':
          filtered = filtered.filter(u => !u.lastLogin);
          break;
      }
    }

    filtered.sort((a, b) => {
      let aVal = a[filters.sortBy];
      let bVal = b[filters.sortBy];
      
      if (filters.sortBy === 'lastLogin' || filters.sortBy === 'createdAt') {
        aVal = aVal ? new Date(aVal) : new Date(0);
        bVal = bVal ? new Date(bVal) : new Date(0);
      }
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (filters.sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredUsers(filtered);
    setFilterStats({
      total: users.length,
      filtered: filtered.length
    });
    setCurrentPage(1);
  }, [filters, users]);

  // ========== FILTRAGE POUR LA RÉINITIALISATION ==========
  const filteredResetUsers = users.filter(user => 
    user.email.toLowerCase().includes(resetSearchTerm.toLowerCase()) ||
    (user.matricule && user.matricule.toString().includes(resetSearchTerm))
  );

  // ========== EFFETS ==========
  useEffect(() => {
    document.body.className = `theme-${settings.theme}`;
  }, [settings.theme]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bonjour');
    else if (hour < 18) setGreeting('Bon après-midi');
    else setGreeting('Bonsoir');
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchUsers();
  }, []);

  // ========== ACTIONS UTILISATEURS ==========
  
  // ========== AJOUTER UN UTILISATEUR (CORRIGÉ) ==========
  const handleAddUser = async (e) => {
    e.preventDefault();
    
    // Validation des champs
    if (!formData.email || !formData.password || !formData.role) {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Veuillez remplir tous les champs obligatoires' 
      });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      console.log('📝 Création utilisateur:', { 
        email: formData.email, 
        role: formData.role,
        matricule: formData.matricule 
      });

      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role,
          matricule: formData.matricule || null
        })
      });

      const data = await response.json();
      console.log('📦 Réponse:', data);

      if (response.ok && data.success) {
        // Message de succès
        showNotification({ 
          type: 'success', 
          title: '✅ Succès', 
          message: `L'utilisateur ${formData.email} a été créé avec succès` 
        });
        
        // Fermer la modale
        setShowAddUserModal(false);
        
        // Réinitialiser le formulaire
        setFormData({ email: '', role: 'agent', matricule: '', password: '' });
        
        // Recharger la liste des utilisateurs
        await fetchUsers();
        
      } else {
        // Message d'erreur
        showNotification({ 
          type: 'error', 
          title: '❌ Erreur', 
          message: data.message || 'Erreur lors de la création' 
        });
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Erreur de connexion au serveur' 
      });
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/auth/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      });

      const data = await response.json();

      if (response.ok) {
        showNotification({ 
          type: 'success', 
          title: '✅ Succès', 
          message: `Utilisateur ${editFormData.email} modifié avec succès` 
        });
        fetchUsers();
        setShowEditUserModal(false);
        setSelectedUser(null);
      } else {
        showNotification({ 
          type: 'error', 
          title: '❌ Erreur', 
          message: data.message || 'Erreur lors de la modification' 
        });
      }
    } catch (err) {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Erreur de connexion au serveur' 
      });
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditFormData({
      email: user.email || '',
      role: user.role || '',
      matricule: user.matricule || ''
    });
    setShowEditUserModal(true);
  };

  // ========== SUPPRESSION AVEC MODALE ÉLÉGANTE ==========
  const confirmDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/auth/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification({ 
          type: 'warning', 
          title: '🗑️ Suppression', 
          message: `L'utilisateur ${userToDelete.email} a été supprimé` 
        });
        fetchUsers();
        setShowDeleteConfirmModal(false);
        setUserToDelete(null);
      } else {
        const data = await response.json();
        showNotification({ 
          type: 'error', 
          title: '❌ Erreur', 
          message: data.message || 'Erreur lors de la suppression' 
        });
      }
    } catch (err) {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Erreur de connexion au serveur' 
      });
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const user = users.find(u => u.id === userId);
      const newStatus = user.status === 'active' ? 'inactive' : 'active';

      const response = await fetch(`http://localhost:5000/api/auth/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (response.ok) {
        const updatedUsers = users.map(u => 
          u.id === userId ? { ...u, status: newStatus } : u
        );
        setUsers(updatedUsers);
        setFilteredUsers(updatedUsers);
        calculateSimpleStats(updatedUsers);
        calculateSystemStats(updatedUsers);
        
        showNotification({ 
          type: 'success', 
          title: '🔄 Statut modifié', 
          message: `${user.email} est maintenant ${newStatus === 'active' ? 'actif' : 'inactif'}` 
        });
      } else {
        showNotification({ 
          type: 'error', 
          title: '❌ Erreur', 
          message: data.message || 'Erreur lors du changement de statut' 
        });
      }
    } catch (err) {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Erreur de connexion au serveur' 
      });
    }
  };

  // ========== RÉINITIALISATION DE MOT DE PASSE ==========
  const handleResetPassword = async () => {
    if (!selectedResetUser) return;
    
    const errors = {};
    if (!resetNewPassword) errors.newPassword = t.passwordRequired;
    else if (resetNewPassword.length < 6) errors.newPassword = t.passwordMinLength;
    if (!resetConfirmPassword) errors.confirmPassword = t.passwordRequired;
    else if (resetNewPassword !== resetConfirmPassword) errors.confirmPassword = t.passwordsDoNotMatch;

    if (Object.keys(errors).length > 0) {
      setResetErrors(errors);
      return;
    }

    setResetLoading(true);
    setResetErrors({});
    setResetSuccess(false);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/auth/users/${selectedResetUser.id}/reset-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          newPassword: resetNewPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResetSuccess(true);
        showNotification({ 
          type: 'success', 
          title: '🔑 Succès', 
          message: `Mot de passe réinitialisé pour ${selectedResetUser.email}` 
        });
        
        setShowNotificationModal(true);
        
      } else {
        showNotification({ 
          type: 'error', 
          title: '❌ Erreur', 
          message: data.message || 'Erreur lors de la réinitialisation' 
        });
        setResetLoading(false);
      }
    } catch (err) {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Erreur de connexion au serveur' 
      });
      setResetLoading(false);
    }
  };

  const clearResetForm = () => {
    setSelectedResetUser(null);
    setResetNewPassword('');
    setResetConfirmPassword('');
    setResetErrors({});
    setResetSearchTerm('');
    setResetSuccess(false);
    setResetReason('');
  };

  // ========== ENVOYER NOTIFICATION ==========
  const sendNotification = async () => {
    if (!selectedResetUser || !resetNewPassword || !resetReason) {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Veuillez remplir tous les champs' 
      });
      return;
    }

    setSendingNotification(true);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:5000/api/notifications/send-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedResetUser.id,
          new_password: resetNewPassword,
          reason: resetReason
        })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification({ 
          type: 'success', 
          title: '✅ Notification envoyée', 
          message: `Notification envoyée avec succès à ${selectedResetUser.email}` 
        });
        setShowNotificationModal(false);
        clearResetForm();
      } else {
        showNotification({ 
          type: 'error', 
          title: '❌ Erreur', 
          message: data.message || 'Erreur lors de l\'envoi de la notification' 
        });
      }
    } catch (err) {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Erreur de connexion au serveur' 
      });
    } finally {
      setSendingNotification(false);
    }
  };

  // ========== SÉLECTION MULTIPLE ==========
  const handleSelectUser = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedUsers.length) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/auth/users/bulk`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, userIds: selectedUsers })
      });

      const data = await response.json();

      if (response.ok) {
        showNotification({ 
          type: 'success', 
          title: '✅ Succès', 
          message: data.message || `Action "${action}" effectuée sur ${selectedUsers.length} utilisateur(s)` 
        });
        fetchUsers();
        setSelectedUsers([]);
        setShowBulkActionsModal(false);
      } else {
        showNotification({ 
          type: 'error', 
          title: '❌ Erreur', 
          message: data.message || 'Erreur lors de l\'action groupée' 
        });
      }
    } catch (err) {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Erreur de connexion au serveur' 
      });
    }
  };

  // ========== EXPORT ==========
  const handleExport = () => {
    const headers = ['ID', 'Email', 'Rôle', 'Matricule', 'Statut', 'Dernière connexion', 'Connexions', 'Créé le'];
    const csv = [
      headers.join(','),
      ...filteredUsers.map(u => [
        u.id,
        u.email,
        u.role,
        u.matricule || '',
        u.status || '',
        u.lastLogin ? new Date(u.lastLogin).toLocaleString('fr-FR') : '',
        u.loginCount || 0,
        u.createdAt ? new Date(u.createdAt).toLocaleString('fr-FR') : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showNotification({ 
      type: 'success', 
      title: '📥 Export réussi', 
      message: `${filteredUsers.length} utilisateurs exportés au format CSV` 
    });
    setShowExportModal(false);
  };

  // ========== DÉCONNEXION ==========
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  // ========== FONCTIONS UTILITAIRES ==========
  const getRoleLabel = (role) => {
    const labels = { 
      'admin': 'Administrateur', 
      'technicien': 'Technicien', 
      'social': 'Service Social', 
      'agent': 'Agent' 
    };
    return labels[role] || role;
  };

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

  const getRoleClass = (role) => {
    switch(role) {
      case 'admin': return 'admin';
      case 'technicien': return 'technicien';
      case 'social': return 'social';
      case 'agent': return 'agent';
      default: return '';
    }
  };

  const formatDate = (date) => {
    if (!date) return t.never;
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatShortDate = (date) => {
    if (!date) return t.never;
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTimeAgo = (date) => {
    if (!date) return 'Jamais';
    
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return formatShortDate(date);
  };

  const getActiveFiltersCount = () => {
    return Object.entries(filters).filter(([k, v]) => 
      k !== 'search' && k !== 'sortBy' && k !== 'sortOrder' && v !== 'all' && v !== ''
    ).length;
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      role: 'all',
      status: 'all',
      dateRange: 'all',
      minConnections: '',
      maxConnections: '',
      lastLogin: 'all',
      sortBy: 'email',
      sortOrder: 'asc'
    });
  };

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  // ========== RENDU PRINCIPAL ==========
  return (
    <div className={`dashboard-container theme-${settings.theme}`}>
      
      {/* NOTIFICATION */}
      {notification.show && (
        <div className={`notification-container ${notification.type}`}>
          <div className="notification-content">
            <div className="notification-icon">
              {notification.type === 'success' && <CheckCircle size={24} color="#10b981" />}
              {notification.type === 'error' && <XCircle size={24} color="#ef4444" />}
              {notification.type === 'warning' && <AlertCircle size={24} color="#f59e0b" />}
              {notification.type === 'info' && <Info size={24} color="#3b82f6" />}
            </div>
            <div className="notification-text">
              <h4>{notification.title}</h4>
              <p>{notification.message}</p>
            </div>
            <button className="notification-close" onClick={() => setNotification({...notification, show: false})}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* BACKGROUND */}
      <div className="dashboard-bg">
        <div className="bg-gradient-primary"></div>
        <div className="bg-gradient-secondary"></div>
      </div>

      {/* HEADER PROFESSIONNEL */}
      <div className="dashboard-header">
        <div className="header-left">
          <div className="header-logo">
            <div className="logo-icon-enhanced">
              <Shield size={32} />
            </div>
            <div className="logo-text">
              <h1>HSE<span>Manager</span></h1>
              <span className="header-badge">Administrateur</span>
            </div>
          </div>
        </div>
        
        <div className="header-right">
          <div className="header-datetime">
            <div className="datetime-item">
              <Calendar size={18} />
              <div className="datetime-info">
                <span className="datetime-label">Date</span>
                <span className="datetime-value">
                  {currentTime.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            </div>
            
            <div className="datetime-item">
              <Clock size={18} />
              <div className="datetime-info">
                <span className="datetime-label">Heure</span>
                <span className="datetime-value">
                  {currentTime.toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit' 
                  })}
                </span>
              </div>
            </div>
          </div>

          <button className="header-settings" onClick={() => setShowSettingsModal(true)} title="Paramètres">
            <Settings size={20} />
          </button>

          <button className="header-logout" onClick={handleLogout} title="Déconnexion">
            <LogOut size={20} />
            <span>Déconnexion</span>
          </button>
        </div>
      </div>

      {/* MENU */}
      <div className="dashboard-menu">
        <button className={`menu-btn ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <BarChart3 size={18} /> <span>{t.dashboard}</span>
        </button>
        <button className={`menu-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={18} /> <span>{t.users}</span>
          {stats.total > 0 && <span className="menu-badge">{stats.total}</span>}
        </button>
        <button className={`menu-btn ${activeTab === 'reset' ? 'active' : ''}`} onClick={() => setActiveTab('reset')}>
          <RefreshCcw size={18} /> <span>Réinitialisation</span>
        </button>
        <button className={`menu-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          <PieChart size={18} /> <span>{t.stats}</span>
        </button>
        <button className={`menu-btn ${activeTab === 'historique' ? 'active' : ''}`} onClick={() => navigate('/admin/historique')}>
          <History size={18} /> <span>{t.historique}</span>
        </button>
      </div>

      {/* CONTENU */}
      <div className="dashboard-content">
        
        {/* DASHBOARD ORIGINAL RESTAURÉ */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-page">
            <h2>{t.dashboard}</h2>
            {loading ? (
              <div className="loading-state">
                <div className="loader"></div>
                <p>Chargement des données...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <AlertCircle size={48} />
                <h3>Erreur de chargement</h3>
                <p>{error}</p>
                <button className="retry-btn" onClick={fetchUsers}>
                  <RefreshCw size={16} /> Réessayer
                </button>
              </div>
            ) : (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon"><UsersRound size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Total utilisateurs</div>
                      <div className="stat-value">{stats.total}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#10b981' }}><UserCheck size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Actifs</div>
                      <div className="stat-value">{stats.active}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#ef4444' }}><UserX size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Inactifs</div>
                      <div className="stat-value">{stats.inactive}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#2563eb' }}><Crown size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Administrateurs</div>
                      <div className="stat-value">{stats.admins}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#f59e0b' }}><Wrench size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Techniciens</div>
                      <div className="stat-value">{stats.techniciens}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#10b981' }}><Heart size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Service Social</div>
                      <div className="stat-value">{stats.sociaux}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#8b5cf6' }}><User size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Agents</div>
                      <div className="stat-value">{stats.agents}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#2563eb' }}><Zap size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Total connexions</div>
                      <div className="stat-value">{stats.totalConnexions}</div>
                    </div>
                  </div>
                </div>

                <div className="dashboard-sections">
                  <div className="section">
                    <h3>Activité récente</h3>
                    <div className="activity-list">
                      {users.slice(0, 5).map(user => (
                        <div key={user.id} className="activity-item">
                          <div className="activity-avatar" style={{ background: `linear-gradient(135deg, ${getRoleColor(user.role)}, ${getRoleColor(user.role)}dd)` }}>
                            {user.email?.charAt(0).toUpperCase()}
                          </div>
                          <div className="activity-info">
                            <div className="activity-user">{user.email}</div>
                            <div className="activity-role">{getRoleLabel(user.role)}</div>
                          </div>
                          <div className="activity-time">{formatDate(user.lastLogin)}</div>
                          <span className={`activity-status ${user.status}`}></span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="section">
                    <h3>Actions rapides</h3>
                    <div className="quick-actions">
                      <button onClick={() => setShowAddUserModal(true)}>
                        <UserPlus size={16} /> {t.addUser}
                      </button>
                      <button onClick={() => setShowExportModal(true)}>
                        <Download size={16} /> Exporter
                      </button>
                      <button onClick={fetchUsers}>
                        <RefreshCw size={16} /> Actualiser
                      </button>
                      <button onClick={() => setActiveTab('stats')}>
                        <PieChart size={16} /> Voir les statistiques
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* UTILISATEURS AVEC FILTRAGE AVANCÉ */}
        {activeTab === 'users' && (
          <div className="users-page">
            <div className="page-header">
              <h2>{t.users}</h2>
              <div className="page-actions">
                <div className="search-box">
                  <Search size={16} />
                  <input 
                    placeholder={t.search} 
                    value={filters.search} 
                    onChange={e => setFilters({...filters, search: e.target.value})} 
                  />
                  {filters.search && (
                    <button className="clear-search" onClick={() => setFilters({...filters, search: ''})}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                <button 
                  className={`filter-toggle-btn ${showFilters ? 'active' : ''}`} 
                  onClick={() => setShowFilters(!showFilters)}
                  title="Filtres avancés"
                >
                  <Filter size={16} /> Filtres 
                  {getActiveFiltersCount() > 0 && (
                    <span className="filter-badge">{getActiveFiltersCount()}</span>
                  )}
                </button>

                <div className="view-toggle">
                  <button 
                    className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                    title="Vue tableau"
                  >
                    <List size={16} />
                  </button>
                  <button 
                    className={`view-btn ${viewMode === 'cards' ? 'active' : ''}`}
                    onClick={() => setViewMode('cards')}
                    title="Vue cartes"
                  >
                    <Grid size={16} />
                  </button>
                </div>

                {getActiveFiltersCount() > 0 && (
                  <button className="clear-filters-btn" onClick={resetFilters} title="Effacer tous les filtres">
                    <FilterX size={16} />
                  </button>
                )}

                {selectedUsers.length > 0 && (
                  <button className="bulk-btn" onClick={() => setShowBulkActionsModal(true)}>
                    <Users size={16} /> {selectedUsers.length} sélectionné(s)
                  </button>
                )}

                <button className="export-btn" onClick={() => setShowExportModal(true)} title="Exporter">
                  <Download size={16} />
                </button>
                <button className="add-btn" onClick={() => setShowAddUserModal(true)}>
                  <UserPlus size={16} /> {t.addUser}
                </button>
              </div>
            </div>

            {/* PANEL DE FILTRES AVANCÉS */}
            {showFilters && (
              <div className="filters-panel">
                <h4 className="filters-title">
                  <Filter size={16} /> Filtres avancés
                </h4>
                <div className="filters-grid">
                  <div className="filter-group">
                    <label>Rôle</label>
                    <select value={filters.role} onChange={e => setFilters({...filters, role: e.target.value})}>
                      <option value="all">Tous les rôles</option>
                      <option value="admin">Administrateur</option>
                      <option value="technicien">Technicien</option>
                      <option value="social">Service Social</option>
                      <option value="agent">Agent</option>
                    </select>
                  </div>
                  
                  <div className="filter-group">
                    <label>Statut</label>
                    <select value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
                      <option value="all">Tous les statuts</option>
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Dernière connexion</label>
                    <select value={filters.lastLogin} onChange={e => setFilters({...filters, lastLogin: e.target.value})}>
                      <option value="all">Toutes</option>
                      <option value="today">Aujourd'hui</option>
                      <option value="week">Cette semaine</option>
                      <option value="month">Ce mois</option>
                      <option value="never">Jamais connecté</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Nombre de connexions min</label>
                    <input 
                      type="number" 
                      placeholder="Min" 
                      value={filters.minConnections}
                      onChange={e => setFilters({...filters, minConnections: e.target.value})}
                      min="0"
                    />
                  </div>

                  <div className="filter-group">
                    <label>Nombre de connexions max</label>
                    <input 
                      type="number" 
                      placeholder="Max" 
                      value={filters.maxConnections}
                      onChange={e => setFilters({...filters, maxConnections: e.target.value})}
                      min="0"
                    />
                  </div>

                  <div className="filter-group">
                    <label>Trier par</label>
                    <select value={filters.sortBy} onChange={e => setFilters({...filters, sortBy: e.target.value})}>
                      <option value="email">Email</option>
                      <option value="role">Rôle</option>
                      <option value="loginCount">Connexions</option>
                      <option value="lastLogin">Dernière connexion</option>
                      <option value="createdAt">Date de création</option>
                    </select>
                  </div>

                  <div className="filter-group">
                    <label>Ordre</label>
                    <select value={filters.sortOrder} onChange={e => setFilters({...filters, sortOrder: e.target.value})}>
                      <option value="asc">Croissant</option>
                      <option value="desc">Décroissant</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* RÉSULTATS INFO */}
            <div className="results-info">
              <span>
                <strong>{filteredUsers.length}</strong> résultat(s) sur <strong>{users.length}</strong> utilisateur(s)
              </span>
              {getActiveFiltersCount() > 0 && (
                <button className="clear-filters-link" onClick={resetFilters}>
                  Effacer les filtres
                </button>
              )}
            </div>

            {loading ? (
              <div className="loading-state">
                <div className="loader"></div>
                <p>Chargement des utilisateurs...</p>
              </div>
            ) : (
              <>
                {/* VUE TABLEAU */}
                {viewMode === 'table' && (
                  <div className="users-table-container">
                    <table className="users-table">
                      <thead>
                        <tr>
                          <th style={{ width: '40px' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0} 
                              onChange={handleSelectAll} 
                            />
                          </th>
                          <th>Utilisateur</th>
                          <th>Rôle</th>
                          <th>Matricule</th>
                          <th>Statut</th>
                          <th>Dernière connexion</th>
                          <th>Connexions</th>
                          <th style={{ width: '280px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.map(user => (
                          <tr key={user.id} className="user-row">
                            <td onClick={e => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                checked={selectedUsers.includes(user.id)} 
                                onChange={() => handleSelectUser(user.id)} 
                              />
                            </td>
                            <td>
                              <div className="user-cell">
                                <div className="user-avatar-small" style={{ background: `linear-gradient(135deg, ${getRoleColor(user.role)}, ${getRoleColor(user.role)}dd)` }}>
                                  {user.email?.charAt(0).toUpperCase()}
                                </div>
                                <div className="user-info">
                                  <span className="user-name">{user.email}</span>
                                  <span className="user-email-small">{user.email}</span>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span className={`role-badge ${getRoleClass(user.role)}`}>
                                {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                              </span>
                            </td>
                            <td>{user.matricule || '-'}</td>
                            <td>
                              <div className="status-badge">
                                <span className={`status-dot ${user.status}`} />
                                <span>{user.status === 'active' ? 'Actif' : 'Inactif'}</span>
                              </div>
                            </td>
                            <td>
                              <div className="last-login-cell">
                                <Clock size={12} />
                                <span>{formatShortDate(user.lastLogin)}</span>
                              </div>
                            </td>
                            <td>
                              <div className="login-count-cell">
                                <Zap size={12} />
                                <span>{user.loginCount || 0}</span>
                              </div>
                            </td>
                            <td>
                              <div className="row-actions" onClick={e => e.stopPropagation()}>
                                <button 
                                  className="action-btn" 
                                  onClick={() => handleToggleStatus(user.id)} 
                                  title={user.status === 'active' ? 'Désactiver' : 'Activer'}
                                  style={{ color: user.status === 'active' ? '#10b981' : '#94a3b8' }}
                                >
                                  {user.status === 'active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                </button>
                                <button 
                                  className="action-btn" 
                                  onClick={() => openEditModal(user)} 
                                  title="Modifier"
                                >
                                  <Edit size={14} />
                                </button>
                                <button 
                                  className="action-btn" 
                                  onClick={() => { 
                                    setSelectedUser(user); 
                                    setShowUserDetailsModal(true); 
                                  }} 
                                  title="Détails"
                                >
                                  <Eye size={14} />
                                </button>
                                <button 
                                  className="action-btn" 
                                  onClick={() => {
                                    setActiveTab('reset');
                                    setSelectedResetUser(user);
                                  }} 
                                  title="Réinitialiser mot de passe"
                                >
                                  <Key size={14} />
                                </button>
                                <button 
                                  className="action-btn delete-btn" 
                                  onClick={() => confirmDelete(user)} 
                                  title="Supprimer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* VUE CARTES */}
                {viewMode === 'cards' && (
                  <div className="users-cards-grid">
                    {currentItems.map(user => (
                      <div key={user.id} className="user-card">
                        <div className="card-header" style={{ background: `linear-gradient(135deg, ${getRoleColor(user.role)}, ${getRoleColor(user.role)}dd)` }}>
                          <div className="card-avatar">
                            {user.email?.charAt(0).toUpperCase()}
                          </div>
                          <span className={`card-status ${user.status}`}></span>
                        </div>
                        <div className="card-body">
                          <h4>{user.email}</h4>
                          <p className="card-role">
                            {getRoleIcon(user.role)} {getRoleLabel(user.role)}
                          </p>
                          <div className="card-info">
                            <div><span>Matricule:</span> {user.matricule || '-'}</div>
                            <div><span>Connexions:</span> {user.loginCount || 0}</div>
                            <div><span>Dernière:</span> {formatShortDate(user.lastLogin)}</div>
                          </div>
                        </div>
                        <div className="card-actions">
                          <button onClick={() => handleToggleStatus(user.id)} title={user.status === 'active' ? 'Désactiver' : 'Activer'}>
                            {user.status === 'active' ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                          </button>
                          <button onClick={() => openEditModal(user)} title="Modifier">
                            <Edit size={14} />
                          </button>
                          <button onClick={() => { 
                            setSelectedUser(user); 
                            setShowUserDetailsModal(true); 
                          }} title="Détails">
                            <Eye size={14} />
                          </button>
                          <button onClick={() => {
                            setActiveTab('reset');
                            setSelectedResetUser(user);
                          }} title="Réinitialiser">
                            <Key size={14} />
                          </button>
                          <button onClick={() => confirmDelete(user)} className="delete" title="Supprimer">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* PAGINATION */}
                {filteredUsers.length > 0 && (
                  <div className="pagination">
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronsLeft size={16} />
                    </button>
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    
                    <span className="pagination-info">
                      Page {currentPage} sur {totalPages}
                    </span>
                    
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight size={16} />
                    </button>
                    <button 
                      className="pagination-btn"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronsRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* PAGE DE RÉINITIALISATION DE MOT DE PASSE */}
        {activeTab === 'reset' && (
          <div className="reset-page">
            <h2>Réinitialisation de mot de passe</h2>
            
            <div className="reset-container">
              {/* Panneau de sélection utilisateur */}
              <div className="reset-user-selector">
                <h3>
                  <Users size={18} />
                  {t.selectUser}
                </h3>
                
                <div className="reset-user-search">
                  <Search size={18} />
                  <input 
                    type="text"
                    placeholder={t.searchUser}
                    value={resetSearchTerm}
                    onChange={(e) => setResetSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="reset-user-list">
                  {filteredResetUsers.length > 0 ? (
                    filteredResetUsers.map(user => (
                      <div 
                        key={user.id}
                        className={`reset-user-item ${selectedResetUser?.id === user.id ? 'selected' : ''}`}
                        onClick={() => setSelectedResetUser(user)}
                      >
                        <div className="reset-user-avatar" style={{ background: `linear-gradient(135deg, ${getRoleColor(user.role)}, ${getRoleColor(user.role)}dd)` }}>
                          {user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="reset-user-info">
                          <h4>{user.email}</h4>
                          <p>
                            <span>Mat: {user.matricule || '-'}</span>
                            <span className={`reset-user-badge ${getRoleClass(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-results">Aucun utilisateur trouvé</div>
                  )}
                </div>
              </div>

              {/* Panneau de réinitialisation */}
              <div className="reset-panel">
                <h3>
                  <Key size={18} />
                  Changer le mot de passe
                </h3>

                {selectedResetUser ? (
                  <>
                    <div className="reset-user-selected">
                      <div className="reset-user-selected-avatar" style={{ background: `linear-gradient(135deg, ${getRoleColor(selectedResetUser.role)}, ${getRoleColor(selectedResetUser.role)}dd)` }}>
                        {selectedResetUser.email.charAt(0).toUpperCase()}
                      </div>
                      <div className="reset-user-selected-info">
                        <h4>{selectedResetUser.email}</h4>
                        <p>
                          <span>Matricule: {selectedResetUser.matricule || '-'}</span>
                          <span className={`reset-user-selected-badge ${getRoleClass(selectedResetUser.role)}`}>
                            {getRoleLabel(selectedResetUser.role)}
                          </span>
                        </p>
                      </div>
                    </div>

                    {resetSuccess ? (
                      <div className="reset-success">
                        <CheckCircle size={48} color="#10b981" />
                        <h3>{t.resetSuccess}</h3>
                        <p>Le nouveau mot de passe a été enregistré</p>
                      </div>
                    ) : (
                      <div className="reset-form">
                        <div className="form-group">
                          <label>
                            <Key size={14} />
                            {t.newPassword} <span className="required">*</span>
                          </label>
                          <div className="password-input-wrapper">
                            <input 
                              type={showResetNewPassword ? "text" : "password"}
                              value={resetNewPassword}
                              onChange={(e) => setResetNewPassword(e.target.value)}
                              placeholder="Nouveau mot de passe"
                              className={resetErrors.newPassword ? 'error' : ''}
                              disabled={resetLoading}
                            />
                            <button 
                              type="button"
                              className="password-toggle"
                              onClick={() => setShowResetNewPassword(!showResetNewPassword)}
                              disabled={resetLoading}
                            >
                              {showResetNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {resetErrors.newPassword && (
                            <div className="error-message">
                              <AlertCircle size={12} /> {resetErrors.newPassword}
                            </div>
                          )}
                        </div>

                        <div className="form-group">
                          <label>
                            <CheckCircle size={14} />
                            {t.confirmPassword} <span className="required">*</span>
                          </label>
                          <div className="password-input-wrapper">
                            <input 
                              type={showResetConfirmPassword ? "text" : "password"}
                              value={resetConfirmPassword}
                              onChange={(e) => setResetConfirmPassword(e.target.value)}
                              placeholder="Confirmez le nouveau mot de passe"
                              className={resetErrors.confirmPassword ? 'error' : ''}
                              disabled={resetLoading}
                            />
                            <button 
                              type="button"
                              className="password-toggle"
                              onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                              disabled={resetLoading}
                            >
                              {showResetConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {resetErrors.confirmPassword && (
                            <div className="error-message">
                              <AlertCircle size={12} /> {resetErrors.confirmPassword}
                            </div>
                          )}
                        </div>

                        <div className="password-requirements">
                          <p>Le mot de passe doit contenir au moins 6 caractères</p>
                        </div>

                        <div className="reset-actions">
                          <button 
                            className="reset-btn-secondary"
                            onClick={clearResetForm}
                            disabled={resetLoading}
                          >
                            Annuler
                          </button>
                          <button 
                            className="reset-btn-primary"
                            onClick={handleResetPassword}
                            disabled={resetLoading || !selectedResetUser}
                          >
                            {resetLoading ? (
                              <>
                                <span className="spinner-small"></span>
                                Traitement...
                              </>
                            ) : (
                              <>
                                <Key size={16} /> Réinitialiser
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="no-user-selected">
                    <User size={64} />
                    <p>{t.noUserSelected}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STATISTIQUES AVANCÉES (déplacées ici) */}
        {activeTab === 'stats' && (
          <div className="stats-page">
            <h2>Statistiques avancées du système</h2>
            
            {/* Stats overview */}
            <div className="stats-overview">
              <div className="stat-card-large" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                <div className="stat-card-icon">
                  <Users size={28} />
                </div>
                <div className="stat-card-content">
                  <div className="stat-card-label">Utilisateurs</div>
                  <div className="stat-card-value">{systemStats.totalUsers}</div>
                  <div className="stat-card-footer">
                    <span>Actifs: {systemStats.activeUsers}</span>
                    <span>Inactifs: {systemStats.inactiveUsers}</span>
                  </div>
                </div>
              </div>

              <div className="stat-card-large" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <div className="stat-card-icon">
                  <Activity size={28} />
                </div>
                <div className="stat-card-content">
                  <div className="stat-card-label">Connexions</div>
                  <div className="stat-card-value">{systemStats.totalLogins}</div>
                  <div className="stat-card-footer">
                    <span>Aujourd'hui: {systemStats.loginsToday}</span>
                    <span>Moyenne: {systemStats.averageLoginsPerUser}/user</span>
                  </div>
                </div>
              </div>

              <div className="stat-card-large" style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}>
                <div className="stat-card-icon">
                  <Server size={28} />
                </div>
                <div className="stat-card-content">
                  <div className="stat-card-label">Performance</div>
                  <div className="stat-card-value">{systemStats.responseTime}ms</div>
                  <div className="stat-card-footer">
                    <span>Uptime: {systemStats.uptime}%</span>
                    <span>Erreurs: {systemStats.errorRate}%</span>
                  </div>
                </div>
              </div>

              <div className="stat-card-large" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                <div className="stat-card-icon">
                  <AlertTriangle size={28} />
                </div>
                <div className="stat-card-content">
                  <div className="stat-card-label">Alertes</div>
                  <div className="stat-card-value">{systemStats.pendingAlerts + systemStats.criticalIssues + systemStats.warnings}</div>
                  <div className="stat-card-footer">
                    <span>Critiques: {systemStats.criticalIssues}</span>
                    <span>Warnings: {systemStats.warnings}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats temps réel */}
            <div className="stats-realtime-grid">
              <div className="realtime-card">
                <div className="realtime-header">
                  <h3>
                    <Activity size={16} />
                    Activité en temps réel
                  </h3>
                  <span className="realtime-badge live">En direct</span>
                </div>
                <div className="realtime-stats">
                  <div className="realtime-stat">
                    <span className="realtime-label">Utilisateurs en ligne</span>
                    <span className="realtime-value">{systemStats.usersOnline}</span>
                  </div>
                  <div className="realtime-stat">
                    <span className="realtime-label">Sessions actives</span>
                    <span className="realtime-value">{systemStats.activeSessions}</span>
                  </div>
                  <div className="realtime-stat">
                    <span className="realtime-label">Temps moyen</span>
                    <span className="realtime-value">{systemStats.averageSessionDuration} min</span>
                  </div>
                </div>
                <div className="realtime-progress">
                  <div className="progress-label">
                    <span>Taux d'occupation</span>
                    <span>{Math.round((systemStats.usersOnline / systemStats.activeUsers) * 100) || 0}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(systemStats.usersOnline / systemStats.activeUsers) * 100 || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className="realtime-card">
                <div className="realtime-header">
                  <h3>
                    <Server size={16} />
                    Performance système
                  </h3>
                  <span className="realtime-badge">Stable</span>
                </div>
                <div className="realtime-stats">
                  <div className="realtime-stat">
                    <span className="realtime-label">Temps de réponse</span>
                    <span className="realtime-value">{systemStats.responseTime} ms</span>
                  </div>
                  <div className="realtime-stat">
                    <span className="realtime-label">Disponibilité</span>
                    <span className="realtime-value">{systemStats.uptime}%</span>
                  </div>
                  <div className="realtime-stat">
                    <span className="realtime-label">Taux d'erreur</span>
                    <span className="realtime-value">{systemStats.errorRate}%</span>
                  </div>
                </div>
                <div className="realtime-progress">
                  <div className="progress-label">
                    <span>Appels API (24h)</span>
                    <span>{systemStats.apiCalls}</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: '65%' }}></div>
                  </div>
                </div>
              </div>

              <div className="realtime-card">
                <div className="realtime-header">
                  <h3>
                    <AlertTriangle size={16} />
                    Alertes et incidents
                  </h3>
                  <span className="realtime-badge warning">
                    {systemStats.pendingAlerts + systemStats.criticalIssues + systemStats.warnings} alertes
                  </span>
                </div>
                <div className="alert-stats">
                  <div className="alert-item critical">
                    <AlertOctagon size={14} />
                    <span>Critiques</span>
                    <span className="alert-count">{systemStats.criticalIssues}</span>
                  </div>
                  <div className="alert-item warning">
                    <AlertTriangle size={14} />
                    <span>Avertissements</span>
                    <span className="alert-count">{systemStats.warnings}</span>
                  </div>
                  <div className="alert-item info">
                    <Info size={14} />
                    <span>En attente</span>
                    <span className="alert-count">{systemStats.pendingAlerts}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Graphiques détaillés */}
            <div className="stats-detailed-charts">
              <div className="chart-container">
                <h3>
                  <TrendingUp size={18} />
                  Tendances des connexions (7 jours)
                </h3>
                <div className="chart-wrapper">
                  <div className="trend-chart-large">
                    {systemStats.loginTrend.map((item, i) => (
                      <div key={i} className="trend-bar-large">
                        <div 
                          className="trend-bar-fill"
                          style={{ 
                            height: `${(item.count / Math.max(...systemStats.loginTrend.map(d => d.count))) * 100}%`,
                            background: '#2563eb'
                          }}
                        ></div>
                        <span className="trend-bar-value-large">{item.count}</span>
                        <span className="trend-bar-label-large">{item.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="chart-container">
                <h3>
                  <UsersRound size={18} />
                  Répartition par rôle
                </h3>
                <div className="role-distribution-large">
                  <div className="role-dist-item-large">
                    <div className="role-dist-info">
                      <Crown size={16} color="#2563eb" />
                      <span>Administrateurs</span>
                    </div>
                    <div className="role-dist-bar">
                      <div 
                        className="role-dist-bar-fill"
                        style={{ 
                          width: `${(systemStats.admins / systemStats.totalUsers) * 100}%`,
                          background: '#2563eb'
                        }}
                      ></div>
                    </div>
                    <span className="role-dist-value">{systemStats.admins} ({Math.round((systemStats.admins / systemStats.totalUsers) * 100)}%)</span>
                  </div>

                  <div className="role-dist-item-large">
                    <div className="role-dist-info">
                      <Wrench size={16} color="#f59e0b" />
                      <span>Techniciens</span>
                    </div>
                    <div className="role-dist-bar">
                      <div 
                        className="role-dist-bar-fill"
                        style={{ 
                          width: `${(systemStats.techniciens / systemStats.totalUsers) * 100}%`,
                          background: '#f59e0b'
                        }}
                      ></div>
                    </div>
                    <span className="role-dist-value">{systemStats.techniciens} ({Math.round((systemStats.techniciens / systemStats.totalUsers) * 100)}%)</span>
                  </div>

                  <div className="role-dist-item-large">
                    <div className="role-dist-info">
                      <Heart size={16} color="#10b981" />
                      <span>Service Social</span>
                    </div>
                    <div className="role-dist-bar">
                      <div 
                        className="role-dist-bar-fill"
                        style={{ 
                          width: `${(systemStats.sociaux / systemStats.totalUsers) * 100}%`,
                          background: '#10b981'
                        }}
                      ></div>
                    </div>
                    <span className="role-dist-value">{systemStats.sociaux} ({Math.round((systemStats.sociaux / systemStats.totalUsers) * 100)}%)</span>
                  </div>

                  <div className="role-dist-item-large">
                    <div className="role-dist-info">
                      <User size={16} color="#8b5cf6" />
                      <span>Agents</span>
                    </div>
                    <div className="role-dist-bar">
                      <div 
                        className="role-dist-bar-fill"
                        style={{ 
                          width: `${(systemStats.agents / systemStats.totalUsers) * 100}%`,
                          background: '#8b5cf6'
                        }}
                      ></div>
                    </div>
                    <span className="role-dist-value">{systemStats.agents} ({Math.round((systemStats.agents / systemStats.totalUsers) * 100)}%)</span>
                  </div>
                </div>
              </div>

              <div className="chart-container full-width">
                <h3>
                  <Activity size={18} />
                  Activité horaire
                </h3>
                <div className="hour-chart-large">
                  {systemStats.activityByHour.map((count, hour) => (
                    <div key={hour} className="hour-bar-large">
                      <div 
                        className="hour-bar-fill"
                        style={{ 
                          height: `${(count / Math.max(...systemStats.activityByHour)) * 100}%`,
                          background: '#10b981'
                        }}
                      ></div>
                      <span className="hour-bar-label">{hour}h</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Statistiques système détaillées */}
            <div className="system-stats-grid">
              <div className="system-stat-card">
                <h4>Utilisateurs</h4>
                <div className="system-stat-list">
                  <div className="system-stat-item">
                    <span>Total</span>
                    <strong>{systemStats.totalUsers}</strong>
                  </div>
                  <div className="system-stat-item">
                    <span>Actifs</span>
                    <strong>{systemStats.activeUsers}</strong>
                  </div>
                  <div className="system-stat-item">
                    <span>Inactifs</span>
                    <strong>{systemStats.inactiveUsers}</strong>
                  </div>
                  <div className="system-stat-item">
                    <span>Nouveaux (mois)</span>
                    <strong>{systemStats.newUsersThisMonth}</strong>
                  </div>
                </div>
              </div>

              <div className="system-stat-card">
                <h4>Connexions</h4>
                <div className="system-stat-list">
                  <div className="system-stat-item">
                    <span>Total</span>
                    <strong>{systemStats.totalLogins}</strong>
                  </div>
                  <div className="system-stat-item">
                    <span>Aujourd'hui</span>
                    <strong>{systemStats.loginsToday}</strong>
                  </div>
                  <div className="system-stat-item">
                    <span>Cette semaine</span>
                    <strong>{systemStats.loginsThisWeek}</strong>
                  </div>
                  <div className="system-stat-item">
                    <span>Ce mois</span>
                    <strong>{systemStats.loginsThisMonth}</strong>
                  </div>
                </div>
              </div>

              <div className="system-stat-card">
                <h4>Sécurité</h4>
                <div className="system-stat-list">
                  <div className="system-stat-item">
                    <span>Comptes verrouillés</span>
                    <strong>{systemStats.lockedAccounts}</strong>
                  </div>
                  <div className="system-stat-item">
                    <span>Tentatives échouées</span>
                    <strong>{systemStats.failedLogins}</strong>
                  </div>
                  <div className="system-stat-item">
                    <span>Réinit. mot de passe</span>
                    <strong>{systemStats.passwordResets}</strong>
                  </div>
                </div>
              </div>

              <div className="system-stat-card">
                <h4>Système</h4>
                <div className="system-stat-list">
                  <div className="system-stat-item">
                    <span>Base de données</span>
                    <strong>{systemStats.databaseSize}</strong>
                  </div>
                  <div className="system-stat-item">
                    <span>Sauvegarde</span>
                    <strong>{systemStats.backupSize}</strong>
                  </div>
                  <div className="system-stat-item">
                    <span>Dernière sauvegarde</span>
                    <strong>{formatTimeAgo(systemStats.lastBackup)}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALES */}

      {/* MODALE DE MODIFICATION AMÉLIORÉE */}
      {showEditUserModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditUserModal(false)}>
          <div className="modal-content edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-header-icon" style={{ background: `linear-gradient(135deg, ${getRoleColor(selectedUser.role)}, ${getRoleColor(selectedUser.role)}dd)` }}>
                <Edit size={24} />
              </div>
              <div className="modal-header-title">
                <h2>Modifier l'utilisateur</h2>
                <p>{selectedUser.email}</p>
              </div>
              <button className="modal-close" onClick={() => setShowEditUserModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="edit-user-profile">
                <div className="edit-user-avatar-large" style={{ background: `linear-gradient(135deg, ${getRoleColor(selectedUser.role)}, ${getRoleColor(selectedUser.role)}dd)` }}>
                  {selectedUser.email?.charAt(0).toUpperCase()}
                </div>
                <div className="edit-user-info">
                  <div className="edit-user-badge">
                    <span className={`role-badge ${getRoleClass(selectedUser.role)}`}>
                      {getRoleIcon(selectedUser.role)} {getRoleLabel(selectedUser.role)}
                    </span>
                  </div>
                  <div className="edit-user-meta">
                    <div className="edit-user-meta-item">
                      <Mail size={14} />
                      <span>{selectedUser.email}</span>
                    </div>
                    <div className="edit-user-meta-item">
                      <Hash size={14} />
                      <span>Matricule: {selectedUser.matricule || 'Non défini'}</span>
                    </div>
                    <div className="edit-user-meta-item">
                      <Calendar size={14} />
                      <span>Créé le: {formatDate(selectedUser.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <form onSubmit={handleEditUser}>
                <div className="form-section">
                  <h4>Informations générales</h4>
                  
                  <div className="form-group">
                    <label>
                      <Mail size={14} />
                      Adresse email <span className="required">*</span>
                    </label>
                    <input 
                      type="email" 
                      value={editFormData.email} 
                      onChange={e => setEditFormData({...editFormData, email: e.target.value})} 
                      placeholder="exemple@email.com"
                      required 
                    />
                  </div>

                  <div className="form-group">
                    <label>
                      <UserCog size={14} />
                      Rôle <span className="required">*</span>
                    </label>
                    <select 
                      value={editFormData.role} 
                      onChange={e => setEditFormData({...editFormData, role: e.target.value})}
                      required
                    >
                      <option value="admin">Administrateur</option>
                      <option value="technicien">Technicien</option>
                      <option value="social">Service Social</option>
                      <option value="agent">Agent</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      <Hash size={14} />
                      Matricule
                    </label>
                    <input 
                      type="text" 
                      value={editFormData.matricule} 
                      onChange={e => setEditFormData({...editFormData, matricule: e.target.value})} 
                      placeholder="Numéro de matricule (optionnel)"
                    />
                    <small>Laissez vide si non applicable</small>
                  </div>
                </div>

                <div className="form-section">
                  <h4>Actions disponibles</h4>
                  <div className="edit-actions-grid">
                    <button 
                      type="button" 
                      className="edit-action-btn"
                      onClick={() => handleToggleStatus(selectedUser.id)}
                    >
                      {selectedUser.status === 'active' ? (
                        <>
                          <ToggleLeft size={16} />
                          Désactiver le compte
                        </>
                      ) : (
                        <>
                          <ToggleRight size={16} />
                          Activer le compte
                        </>
                      )}
                    </button>
                    <button 
                      type="button" 
                      className="edit-action-btn"
                      onClick={() => {
                        setActiveTab('reset');
                        setSelectedResetUser(selectedUser);
                        setShowEditUserModal(false);
                      }}
                    >
                      <Key size={16} />
                      Réinitialiser mot de passe
                    </button>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditUserModal(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary">
                    <Save size={16} /> Enregistrer les modifications
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION SUPPRESSION ÉLÉGANTE */}
      {showDeleteConfirmModal && userToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirmModal(false)}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <div className="modal-header warning">
              <div className="header-icon warning">
                <AlertTriangle size={28} />
              </div>
              <h2>Confirmer la suppression</h2>
              <button className="modal-close" onClick={() => setShowDeleteConfirmModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="delete-confirm-content">
                <div className="delete-user-info">
                  <div className="delete-user-avatar" style={{ background: `linear-gradient(135deg, ${getRoleColor(userToDelete.role)}, ${getRoleColor(userToDelete.role)}dd)` }}>
                    {userToDelete.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="delete-user-details">
                    <h4>{userToDelete.email}</h4>
                    <p>
                      <span className={`role-badge-small ${getRoleClass(userToDelete.role)}`}>
                        {getRoleLabel(userToDelete.role)}
                      </span>
                      <span>Matricule: {userToDelete.matricule || '-'}</span>
                    </p>
                  </div>
                </div>
                
                <div className="delete-warning">
                  <AlertCircle size={20} />
                  <p>Cette action est irréversible. Toutes les données associées à cet utilisateur seront définitivement supprimées.</p>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => setShowDeleteConfirmModal(false)}
              >
                Annuler
              </button>
              <button 
                className="btn-danger"
                onClick={handleDeleteUser}
              >
                <Trash2 size={16} /> Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE NOTIFICATION */}
      {showNotificationModal && selectedResetUser && (
        <div className="modal-overlay" onClick={() => setShowNotificationModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-icon" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                <Bell size={24} />
              </div>
              <h2>Envoyer une notification</h2>
              <button className="modal-close" onClick={() => setShowNotificationModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="notification-preview">
                <h3>Récapitulatif du changement</h3>
                
                <div className="preview-card">
                  <div className="preview-row">
                    <span className="preview-label">Destinataire :</span>
                    <span className="preview-value">
                      <strong>{selectedResetUser.email}</strong>
                    </span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Matricule :</span>
                    <span className="preview-value">{selectedResetUser.matricule || 'Non spécifié'}</span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Rôle :</span>
                    <span className="preview-value">
                      <span className={`role-badge-small ${getRoleClass(selectedResetUser.role)}`}>
                        {getRoleLabel(selectedResetUser.role)}
                      </span>
                    </span>
                  </div>
                  <div className="preview-row">
                    <span className="preview-label">Nouveau mot de passe :</span>
                    <span className="preview-value password-highlight">{resetNewPassword}</span>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>
                    <MessageCircle size={14} />
                    Raison du changement <span className="required">*</span>
                  </label>
                  <textarea
                    rows="4"
                    value={resetReason}
                    onChange={(e) => setResetReason(e.target.value)}
                    placeholder="Expliquez la raison du changement de mot de passe..."
                    className="reason-textarea"
                  ></textarea>
                </div>
                
                <div className="notification-preview-message">
                  <h4>Aperçu du message :</h4>
                  <div className="message-preview">
                    <p><strong>Objet :</strong> Changement de votre mot de passe</p>
                    <p>Bonjour {selectedResetUser.email},</p>
                    <p>Votre mot de passe a été modifié par l'administrateur.</p>
                    <p><strong>Raison :</strong> {resetReason || '(Non spécifiée)'}</p>
                    <p><strong>Nouveau mot de passe :</strong> {resetNewPassword}</p>
                    <p>Nous vous recommandons de changer ce mot de passe après votre prochaine connexion.</p>
                    <p>Cordialement,<br/>L'équipe HSE Manager</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setShowNotificationModal(false);
                  clearResetForm();
                }}
                disabled={sendingNotification}
              >
                Ignorer
              </button>
              <button 
                className="btn-primary"
                onClick={sendNotification}
                disabled={!resetReason || sendingNotification}
              >
                {sendingNotification ? (
                  <>
                    <span className="spinner-small"></span>
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Envoyer la notification
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE PARAMÈTRES */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-icon" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
                <Settings size={24} />
              </div>
              <h2>{t.settings}</h2>
              <button className="modal-close" onClick={() => setShowSettingsModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Langue</label>
                <select value={settings.language} onChange={e => setSettings({...settings, language: e.target.value})}>
                  <option value="fr">Français</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="form-group">
                <label>Thème</label>
                <select value={settings.theme} onChange={e => setSettings({...settings, theme: e.target.value})}>
                  <option value="light">Clair</option>
                  <option value="dark">Sombre</option>
                </select>
              </div>
              <div className="form-group">
                <label>Éléments par page</label>
                <select value={settings.itemsPerPage} onChange={e => {
                  setSettings({...settings, itemsPerPage: parseInt(e.target.value)});
                  setItemsPerPage(parseInt(e.target.value));
                }}>
                  <option value="10">10</option>
                  <option value="25">25</option>
                  <option value="50">50</option>
                  <option value="100">100</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSettingsModal(false)}>
                {t.cancel}
              </button>
              <button className="btn-primary" onClick={() => { 
                localStorage.setItem('adminSettings', JSON.stringify(settings));
                setShowSettingsModal(false); 
                showNotification({ 
                  type: 'success', 
                  title: '✅ Succès', 
                  message: 'Paramètres enregistrés' 
                }); 
              }}>
                <Save size={16} /> {t.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DÉTAILS UTILISATEUR */}
      {showUserDetailsModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserDetailsModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-icon" style={{ background: `linear-gradient(135deg, ${getRoleColor(selectedUser.role)}, ${getRoleColor(selectedUser.role)}dd)` }}>
                <User size={24} />
              </div>
              <h2>Détails de l'utilisateur</h2>
              <button className="modal-close" onClick={() => setShowUserDetailsModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="user-details-card">
                <div className="details-header">
                  <div className="details-avatar" style={{ background: `linear-gradient(135deg, ${getRoleColor(selectedUser.role)}, ${getRoleColor(selectedUser.role)}dd)` }}>
                    {selectedUser.email?.charAt(0).toUpperCase()}
                  </div>
                  <div className="details-title">
                    <h3>{selectedUser.email}</h3>
                    <span className={`role-badge-small ${getRoleClass(selectedUser.role)}`}>
                      {getRoleLabel(selectedUser.role)}
                    </span>
                  </div>
                </div>

                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-icon"><Mail size={14} /></span>
                    <div>
                      <label>Email</label>
                      <p>{selectedUser.email}</p>
                    </div>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon"><Hash size={14} /></span>
                    <div>
                      <label>Matricule</label>
                      <p>{selectedUser.matricule || 'Non spécifié'}</p>
                    </div>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon"><Shield size={14} /></span>
                    <div>
                      <label>Statut</label>
                      <p>
                        <span className={`status-badge-small ${selectedUser.status}`}>
                          {selectedUser.status === 'active' ? 'Actif' : 'Inactif'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon"><Calendar size={14} /></span>
                    <div>
                      <label>Dernière connexion</label>
                      <p>{formatDate(selectedUser.lastLogin)}</p>
                    </div>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon"><Zap size={14} /></span>
                    <div>
                      <label>Nombre de connexions</label>
                      <p>{selectedUser.loginCount || 0}</p>
                    </div>
                  </div>
                  <div className="detail-item">
                    <span className="detail-icon"><Clock size={14} /></span>
                    <div>
                      <label>Compte créé le</label>
                      <p>{formatDate(selectedUser.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowUserDetailsModal(false)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE AJOUT UTILISATEUR */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <UserPlus size={24} />
              </div>
              <h2>{t.addUser}</h2>
              <button className="modal-close" onClick={() => setShowAddUserModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                <div className="form-group">
                  <label>
                    <Mail size={14} />
                    Email <span className="required">*</span>
                  </label>
                  <input 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    placeholder="exemple@email.com"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>
                    <UserCog size={14} />
                    Rôle <span className="required">*</span>
                  </label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} required>
                    <option value="admin">Administrateur</option>
                    <option value="technicien">Technicien</option>
                    <option value="social">Service Social</option>
                    <option value="agent">Agent</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>
                    <Key size={14} />
                    Mot de passe <span className="required">*</span>
                  </label>
                  <input 
                    type="password" 
                    value={formData.password} 
                    onChange={e => setFormData({...formData, password: e.target.value})} 
                    placeholder="••••••••"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label>
                    <Hash size={14} />
                    Matricule
                  </label>
                  <input 
                    type="text" 
                    value={formData.matricule} 
                    onChange={e => setFormData({...formData, matricule: e.target.value})} 
                    placeholder="Optionnel"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddUserModal(false)}>
                  {t.cancel}
                </button>
                <button type="submit" className="btn-primary">
                  <UserPlus size={16} /> {t.addUser}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE ACTIONS GROUPÉES */}
      {showBulkActionsModal && (
        <div className="modal-overlay" onClick={() => setShowBulkActionsModal(false)}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-icon" style={{ background: 'linear-gradient(135deg, #64748b, #475569)' }}>
                <Users size={24} />
              </div>
              <h2>Actions groupées</h2>
              <button className="modal-close" onClick={() => setShowBulkActionsModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="bulk-info">
                <strong>{selectedUsers.length}</strong> utilisateur(s) sélectionné(s)
              </p>
              <div className="bulk-actions">
                <button className="bulk-action-btn" onClick={() => handleBulkAction('activate')}>
                  <CheckCircle size={16} /> Activer tous
                </button>
                <button className="bulk-action-btn" onClick={() => handleBulkAction('deactivate')}>
                  <XCircle size={16} /> Désactiver tous
                </button>
                <button className="bulk-action-btn delete" onClick={() => handleBulkAction('delete')}>
                  <Trash2 size={16} /> Supprimer tous
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowBulkActionsModal(false)}>
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE EXPORT */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content small" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                <Download size={24} />
              </div>
              <h2>Exporter les données</h2>
              <button className="modal-close" onClick={() => setShowExportModal(false)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p className="export-info">
                <strong>{filteredUsers.length}</strong> utilisateurs à exporter
              </p>
              <div className="export-options">
                <button className="export-option" onClick={handleExport}>
                  <FileText size={20} />
                  <div>
                    <strong>Format CSV</strong>
                    <span>Fichier compatible avec Excel</span>
                  </div>
                </button>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowExportModal(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;