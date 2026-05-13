import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Users, Shield, UserPlus, Search, Edit, Trash2, ToggleLeft, ToggleRight,
  Key, Mail, Calendar, Clock, CheckCircle, XCircle, LogOut,
  Bell, BarChart3, Settings, Grid, List, ChevronLeft, ChevronRight,
  X, Save, Briefcase, Zap, Award, ChevronUp, ChevronDown,
  Download, Upload, AlertCircle, Info, Wrench, User, Eye, EyeOff,
  Filter, RefreshCw, PieChart, TrendingUp, UsersRound, UserCheck,
  UserX, Activity, Lock, History, Copy, Star, Heart,
  Fingerprint, FileText, ChevronsLeft, ChevronsRight, Check,
  AlertTriangle, Crown, RefreshCcw, Send, CalendarDays, CalendarRange,
  ArrowUp, ArrowDown, SlidersHorizontal, ArrowRight, CheckCircle2,
  FilterX, Calendar as CalendarIcon, FileText as FileTextIcon,
  ArrowUp as ArrowUpIcon, ArrowDown as ArrowDownIcon, BarChart, MessageCircle,
  UserCog, Hash, Briefcase as BriefcaseIcon, Phone, MapPin, Globe, Server, Cpu, HardDrive, Wifi
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboard.css';
import AuditLog from './AuditLog';

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // ========== ÉTATS PRINCIPAUX ==========
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // ========== OPTIMISATION CACHE ==========
  const [cachedUsers, setCachedUsers] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState(null);
  const statsCache = useRef(new Map());
  
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
  const [showComparisonModal, setShowComparisonModal] = useState(false);
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
  
  // ========== STATISTIQUES SIMPLES ==========
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

  // ========== STATISTIQUES OTP ==========
  const [otpStats, setOtpStats] = useState({
    total: 0,
    used: 0,
    expired: 0,
    pending: 0,
    successRate: 0,
    averageAttempts: 0,
    byRole: {
      admin: { total: 0, used: 0 },
      technicien: { total: 0, used: 0 },
      social: { total: 0, used: 0 },
      agent: { total: 0, used: 0 }
    }
  });

  // ========== STATISTIQUES PÉRIODE ACTUELLE ==========
  const [currentPeriodStats, setCurrentPeriodStats] = useState({
    today: { totalLogins: 0, uniqueUsers: 0, newUsers: 0, admins: 0, techniciens: 0, sociaux: 0, agents: 0, otpUsage: 0, totalConnexions: 0 },
    week: { totalLogins: 0, uniqueUsers: 0, newUsers: 0, admins: 0, techniciens: 0, sociaux: 0, agents: 0, otpUsage: 0, totalConnexions: 0 },
    month: { totalLogins: 0, uniqueUsers: 0, newUsers: 0, admins: 0, techniciens: 0, sociaux: 0, agents: 0, otpUsage: 0, totalConnexions: 0 },
    year: { totalLogins: 0, uniqueUsers: 0, newUsers: 0, admins: 0, techniciens: 0, sociaux: 0, agents: 0, otpUsage: 0, totalConnexions: 0 },
    custom: { totalLogins: 0, uniqueUsers: 0, newUsers: 0, admins: 0, techniciens: 0, sociaux: 0, agents: 0, otpUsage: 0, totalConnexions: 0 }
  });

  // ========== STATISTIQUES POUR LES TENDANCES ==========
  const [trendStats, setTrendStats] = useState({
    logins: 0,
    users: 0,
    newUsers: 0,
    otp: 0
  });

  // ========== STATISTIQUES POUR GRAPHIQUES ==========
  const [trendData, setTrendData] = useState({
    labels: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    values: [0, 0, 0, 0, 0, 0, 0],
    variations: []
  });

  const [hourlyData, setHourlyData] = useState({
    labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
    values: Array(24).fill(0)
  });

  // ========== ÉTATS POUR LE SÉLECTEUR DE PÉRIODE ==========
  const [periodType, setPeriodType] = useState('today');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // ========== ÉTATS POUR LA COMPARAISON ==========
  const [comparisonResult, setComparisonResult] = useState(null);
  const [period1, setPeriod1] = useState({
    type: 'today',
    startDate: '',
    endDate: '',
    label: "Aujourd'hui"
  });
  const [period2, setPeriod2] = useState({
    type: 'yesterday',
    startDate: '',
    endDate: '',
    label: 'Hier'
  });
  const [loadingStats, setLoadingStats] = useState(false);
  
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
      dashboard: 'Accueil',
      users: 'Utilisateurs',
      stats: 'Tableau de bord',
      reset: 'Réinitialisation',
      settings: 'Paramètres',
      historique: 'Historique',
      audit: "Journal d'audit",
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

  // ========== STATS SIMPLES OPTIMISÉES AVEC USEMEMO ==========
  const memoizedStats = useMemo(() => {
    if (!users.length) return stats;
    
    const total = users.length;
    const active = users.filter(u => u.status === 'active').length;
    const inactive = users.filter(u => u.status === 'inactive').length;
    const totalConnexions = users.reduce((sum, u) => sum + (u.loginCount || 0), 0);
    
    const admins = users.filter(u => u.role === 'admin').length;
    const techniciens = users.filter(u => u.role === 'technicien').length;
    const sociaux = users.filter(u => u.role === 'social').length;
    const agents = users.filter(u => u.role === 'agent').length;
    
    return { total, active, inactive, admins, techniciens, sociaux, agents, totalConnexions };
  }, [users]);

  // Mettre à jour stats quand memoizedStats change
  useEffect(() => {
    setStats(memoizedStats);
  }, [memoizedStats]);

  // ========== FONCTION POUR OBTENIR LES DATES D'UNE PÉRIODE ==========
  const getDateRangeForPeriod = useCallback((periodType, customStartDate = null, customEndDate = null) => {
    const now = new Date();
    let startDate, endDate = new Date(now);

    if (periodType === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(customEndDate);
      endDate.setHours(23, 59, 59, 999);
      return { startDate, endDate };
    }

    switch(periodType) {
      case 'today':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setDate(now.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(now);
        const day = now.getDay();
        const diff = day === 0 ? 6 : day - 1;
        startDate.setDate(now.getDate() - diff);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'lastWeek':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        const lastWeekDay = startDate.getDay();
        const lastWeekDiff = lastWeekDay === 0 ? 6 : lastWeekDay - 1;
        startDate.setDate(startDate.getDate() - lastWeekDiff);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'lastYear':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear() - 1, 11, 31);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }, []);

  // ========== METTRE À JOUR LES STATS - VERSION OPTIMISÉE ==========
  const updateStatsForPeriod = useCallback(async (period, startDateParam = null, endDateParam = null) => {
    if (!users.length) return;
    
    const startTime = Date.now();
    setIsRefreshingStats(true);
    
    try {
      const token = localStorage.getItem('token');
      let startDate, endDate;
      
      if (period === 'custom' && startDateParam) {
        startDate = new Date(startDateParam);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDateParam);
        endDate.setHours(23, 59, 59, 999);
      } else {
        const now = new Date();
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        
        switch(period) {
          case 'today':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            startDate = new Date(now);
            const day = now.getDay();
            const diff = day === 0 ? 6 : day - 1;
            startDate.setDate(now.getDate() - diff);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            startDate.setHours(0, 0, 0, 0);
            break;
          default:
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
        }
      }
      
      const usersInPeriod = users.filter(u => 
        u.lastLogin && new Date(u.lastLogin) >= startDate && new Date(u.lastLogin) <= endDate
      );
      
      const newUsersInPeriod = users.filter(u => 
        u.createdAt && new Date(u.createdAt) >= startDate && new Date(u.createdAt) <= endDate
      ).length;
      
      const adminsCount = usersInPeriod.filter(u => u.role === 'admin').length;
      const techniciensCount = usersInPeriod.filter(u => u.role === 'technicien').length;
      const sociauxCount = usersInPeriod.filter(u => u.role === 'social').length;
      const agentsCount = usersInPeriod.filter(u => u.role === 'agent').length;
      const currentUniqueUsers = new Set(usersInPeriod.map(u => u.id)).size;
      
      const duration = endDate - startDate;
      const prevEndDate = new Date(startDate);
      prevEndDate.setMilliseconds(prevEndDate.getMilliseconds() - 1);
      const prevStartDate = new Date(prevEndDate);
      prevStartDate.setTime(prevStartDate.getTime() - duration);
      
      const usersInPrevPeriod = users.filter(u => 
        u.lastLogin && new Date(u.lastLogin) >= prevStartDate && new Date(u.lastLogin) <= prevEndDate
      );
      
      const prevTotalLogins = usersInPrevPeriod.length;
      const trendLogins = prevTotalLogins > 0 
        ? Math.round(((usersInPeriod.length - prevTotalLogins) / prevTotalLogins) * 100) 
        : (usersInPeriod.length > 0 ? 100 : 0);
      
      const prevUniqueUsers = new Set(usersInPrevPeriod.map(u => u.id)).size;
      const trendUsers = prevUniqueUsers > 0 
        ? Math.round(((currentUniqueUsers - prevUniqueUsers) / prevUniqueUsers) * 100)
        : (currentUniqueUsers > 0 ? 100 : 0);
      
      const newUsersInPrevPeriod = users.filter(u => 
        u.createdAt && new Date(u.createdAt) >= prevStartDate && new Date(u.createdAt) <= prevEndDate
      ).length;
      const trendNewUsers = newUsersInPrevPeriod > 0 
        ? Math.round(((newUsersInPeriod - newUsersInPrevPeriod) / newUsersInPrevPeriod) * 100)
        : (newUsersInPeriod > 0 ? 100 : 0);
      
      const currentStats = {
        totalLogins: usersInPeriod.length,
        totalConnexions: usersInPeriod.length,
        uniqueUsers: currentUniqueUsers,
        newUsers: newUsersInPeriod,
        admins: adminsCount,
        techniciens: techniciensCount,
        sociaux: sociauxCount,
        agents: agentsCount,
        otpUsage: 65
      };
      
      const periodKey = period === 'custom' ? 'custom' : period;
      setCurrentPeriodStats(prev => ({ ...prev, [periodKey]: currentStats }));
      setTrendStats({ logins: trendLogins, users: trendUsers, newUsers: trendNewUsers, otp: 0 });
      
      Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/api/auth/stats/connexions?period=${period === 'custom' ? 'today' : period}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => null),
        fetch(`${process.env.REACT_APP_API_URL}/api/otp/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }).catch(() => null)
      ]).then(async ([apiRes, otpRes]) => {
        let newTotalLogins = usersInPeriod.length;
        let newOtpUsage = 65;
        
        if (apiRes && apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData.success && apiData.stats) {
            newTotalLogins = apiData.stats.total || usersInPeriod.length;
          }
        }
        
        if (otpRes && otpRes.ok) {
          const otpData = await otpRes.json();
          if (otpData.success) {
            newOtpUsage = otpData.successRate || 65;
          }
        }
        
        setCurrentPeriodStats(prev => ({
          ...prev,
          [periodKey]: { ...prev[periodKey], totalLogins: newTotalLogins, totalConnexions: newTotalLogins, otpUsage: newOtpUsage }
        }));
      });
      
      console.log(`✅ Stats mises à jour pour ${period} en ${Date.now() - startTime}ms`);
      
    } catch (error) {
      console.error('❌ Erreur updateStatsForPeriod:', error);
    } finally {
      setIsRefreshingStats(false);
    }
  }, [users]);

  // ========== CHANGEMENT DE PÉRIODE ==========
  const handlePeriodChange = useCallback((period) => {
    setPeriodType(period);
    
    if (period === 'custom') {
      setShowDatePicker(true);
      const today = new Date();
      setSelectedDate(today.toISOString().split('T')[0]);
    } else {
      setShowDatePicker(false);
      updateStatsForPeriod(period);
    }
  }, [updateStatsForPeriod]);

  // ========== APPLIQUER LA DATE PERSONNALISÉE ==========
  const applyCustomDateRange = useCallback(() => {
    if (!selectedDate) {
      showNotification({
        type: 'error',
        title: '❌ Erreur',
        message: 'Veuillez sélectionner une date'
      });
      return;
    }
    
    updateStatsForPeriod('custom', selectedDate, selectedDate);
    setShowDatePicker(false);
    
    showNotification({
      type: 'success',
      title: '✅ Date appliquée',
      message: `Statistiques pour le ${new Date(selectedDate).toLocaleDateString('fr-FR')}`
    });
  }, [selectedDate, updateStatsForPeriod]);

  // ========== ANNULER LE SÉLECTEUR DE DATES ==========
  const cancelDatePicker = useCallback(() => {
    setShowDatePicker(false);
    setSelectedDate('');
    setPeriodType('today');
    updateStatsForPeriod('today');
  }, [updateStatsForPeriod]);

  // ========== CHARGEMENT OPTIMISÉ DES UTILISATEURS ==========
  const fetchUsers = useCallback(async (forceRefresh = false) => {
    const CACHE_DURATION = 5 * 60 * 1000;
    const now = Date.now();
    
    if (!forceRefresh && cachedUsers && lastFetchTime && (now - lastFetchTime < CACHE_DURATION)) {
      console.log('📦 Utilisation du cache utilisateurs');
      setUsers(cachedUsers);
      setFilteredUsers(cachedUsers);
      calculateHourlyData(cachedUsers);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/admin');
        return;
      }

      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success && Array.isArray(data.users)) {
        const realUsers = data.users.map(user => ({
  id: user.id_utilisateur || user.id,
  email: user.Login || user.email,                    
  role: (user.Role || user.role || '').toLowerCase(), 
  matricule: user.matricule_agent || user.matricule,  
  status: 'active',
  lastLogin: user.derniere_connexion || null,         
  loginCount: user.nombre_connexions || 0,            
  createdAt: user.date_creation || user.createdAt || null, 
  lastActive: user.lastActive || null
}));
        
        setCachedUsers(realUsers);
        setLastFetchTime(now);
        setUsers(realUsers);
        setFilteredUsers(realUsers);
        
        const roles = [...new Set(realUsers.map(u => u.role).filter(Boolean))];
        setAvailableRoles(roles);
        
        calculateHourlyData(realUsers);
        await updateStatsForPeriod(periodType);
        await fetchOtpStats();
        await fetchTrendData();
      }
    } catch (err) {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }, [cachedUsers, lastFetchTime, navigate, periodType, updateStatsForPeriod]);

  // ========== RECHERCHE AVEC DEBOUNCE ==========
  const handleSearchDebounced = useCallback((value) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    const timer = setTimeout(() => {
      setFilters(prev => ({...prev, search: value}));
    }, 300);
    setSearchDebounceTimer(timer);
  }, [searchDebounceTimer]);

  // ========== CHARGEMENT DES STATISTIQUES OTP ==========
  const fetchOtpStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/otp/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setOtpStats({
          total: data.total || 0,
          used: data.used || 0,
          expired: data.expired || 0,
          pending: data.pending || 0,
          successRate: data.successRate || 0,
          averageAttempts: data.averageAttempts || 0,
          byRole: {
            admin: { total: 0, used: 0 },
            technicien: { total: 0, used: 0 },
            social: { total: 0, used: 0 },
            agent: { total: 0, used: 0 }
          }
        });
      }
    } catch (err) {
      console.error('Erreur chargement stats OTP:', err);
    }
  }, []);

  // ========== CHARGEMENT DES DONNÉES DE TENDANCE ==========
  const fetchTrendData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/stats/connexions?period=week`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success && data.stats.byDay) {
        const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        const dayValues = Array(7).fill(0);
        const variations = Array(7).fill(0);
        
        data.stats.byDay.forEach(item => {
          const date = new Date(item.date);
          const dayIndex = date.getDay();
          dayValues[dayIndex] = parseInt(item.count);
        });
        
        const reorderedValues = [
          dayValues[1] || 0,
          dayValues[2] || 0,
          dayValues[3] || 0,
          dayValues[4] || 0,
          dayValues[5] || 0,
          dayValues[6] || 0,
          dayValues[0] || 0
        ];
        
        for (let i = 1; i < reorderedValues.length; i++) {
          if (reorderedValues[i-1] > 0) {
            const change = ((reorderedValues[i] - reorderedValues[i-1]) / reorderedValues[i-1]) * 100;
            variations[i] = Math.round(change);
          }
        }
        
        setTrendData({
          labels: days,
          values: reorderedValues,
          variations
        });
      }
    } catch (err) {
      console.error('❌ Erreur chargement tendance:', err);
    }
  }, []);

  // ========== CALCUL DES DONNÉES HORAIRES ==========
  const calculateHourlyData = useCallback((usersData) => {
    const values = Array(24).fill(0);
    
    usersData.forEach(user => {
      if (user.lastLogin) {
        const hour = new Date(user.lastLogin).getHours();
        values[hour]++;
      }
    });

    setHourlyData({ 
      labels: Array.from({ length: 24 }, (_, i) => `${i}h`), 
      values 
    });
  }, []);

  // ========== CHANGEMENT PÉRIODE 1 ==========
  const handlePeriod1Change = useCallback((e) => {
    const type = e.target.value;
    let label = "";
    
    switch(type) {
      case 'today': label = "Aujourd'hui"; break;
      case 'yesterday': label = "Hier"; break;
      case 'week': label = "Cette semaine"; break;
      case 'lastWeek': label = "Semaine dernière"; break;
      case 'month': label = "Ce mois"; break;
      case 'lastMonth': label = "Mois dernier"; break;
      case 'year': label = "Cette année"; break;
      case 'lastYear': label = "Année dernière"; break;
      case 'custom': label = "Dates personnalisées"; break;
      default: label = type;
    }
    
    setPeriod1(prev => ({ ...prev, type, label }));
  }, []);

  // ========== CHANGEMENT PÉRIODE 2 ==========
  const handlePeriod2Change = useCallback((e) => {
    const type = e.target.value;
    let label = "";
    
    switch(type) {
      case 'today': label = "Aujourd'hui"; break;
      case 'yesterday': label = "Hier"; break;
      case 'week': label = "Cette semaine"; break;
      case 'lastWeek': label = "Semaine dernière"; break;
      case 'month': label = "Ce mois"; break;
      case 'lastMonth': label = "Mois dernier"; break;
      case 'year': label = "Cette année"; break;
      case 'lastYear': label = "Année dernière"; break;
      case 'custom': label = "Dates personnalisées"; break;
      default: label = type;
    }
    
    setPeriod2(prev => ({ ...prev, type, label }));
  }, []);

  // ========== METTRE À JOUR LA DATE PERSONNALISÉE PÉRIODE 1 ==========
  const updateCustomDatePeriod1 = useCallback((field, value) => {
    setPeriod1(prev => ({ ...prev, [field]: value }));
  }, []);

  // ========== METTRE À JOUR LA DATE PERSONNALISÉE PÉRIODE 2 ==========
  const updateCustomDatePeriod2 = useCallback((field, value) => {
    setPeriod2(prev => ({ ...prev, [field]: value }));
  }, []);

  // ========== EFFECTUER LA COMPARAISON (VERSION CORRIGÉE) ==========
  const performComparison = useCallback(async () => {
    setLoadingStats(true);
    
    try {
      const token = localStorage.getItem('token');
      
      let startDate1, endDate1;
      if (period1.type === 'custom' && period1.startDate && period1.endDate) {
        startDate1 = new Date(period1.startDate);
        startDate1.setHours(0, 0, 0, 0);
        endDate1 = new Date(period1.endDate);
        endDate1.setHours(23, 59, 59, 999);
      } else {
        const range1 = getDateRangeForPeriod(period1.type);
        startDate1 = range1.startDate;
        endDate1 = range1.endDate;
      }
      
      let startDate2, endDate2;
      if (period2.type === 'custom' && period2.startDate && period2.endDate) {
        startDate2 = new Date(period2.startDate);
        startDate2.setHours(0, 0, 0, 0);
        endDate2 = new Date(period2.endDate);
        endDate2.setHours(23, 59, 59, 999);
      } else {
        const range2 = getDateRangeForPeriod(period2.type);
        startDate2 = range2.startDate;
        endDate2 = range2.endDate;
      }
      
      const usersInPeriod1 = users.filter(u => 
        u.lastLogin && new Date(u.lastLogin) >= startDate1 && new Date(u.lastLogin) <= endDate1
      );
      
      const usersInPeriod2 = users.filter(u => 
        u.lastLogin && new Date(u.lastLogin) >= startDate2 && new Date(u.lastLogin) <= endDate2
      );
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const inactiveUsersCount = users.filter(u => 
        !u.lastLogin || new Date(u.lastLogin) < thirtyDaysAgo
      ).length;
      
      const loyalUsersCount = users.filter(u => (u.loginCount || 0) >= 5).length;
      
      let peakHour1 = 0;
      let maxCount1 = 0;
      const hourCounts1 = Array(24).fill(0);
      usersInPeriod1.forEach(user => {
        if (user.lastLogin) {
          const hour = new Date(user.lastLogin).getHours();
          hourCounts1[hour]++;
          if (hourCounts1[hour] > maxCount1) {
            maxCount1 = hourCounts1[hour];
            peakHour1 = hour;
          }
        }
      });
      
      let peakHour2 = 0;
      let maxCount2 = 0;
      const hourCounts2 = Array(24).fill(0);
      usersInPeriod2.forEach(user => {
        if (user.lastLogin) {
          const hour = new Date(user.lastLogin).getHours();
          hourCounts2[hour]++;
          if (hourCounts2[hour] > maxCount2) {
            maxCount2 = hourCounts2[hour];
            peakHour2 = hour;
          }
        }
      });
      
      const calculateActivityScore = (usersInPeriod, totalUsers) => {
        const uniqueUsers = new Set(usersInPeriod.map(u => u.id)).size;
        const avgConnections = uniqueUsers > 0 ? usersInPeriod.length / uniqueUsers : 0;
        const connectionRate = totalUsers > 0 ? (uniqueUsers / totalUsers) * 100 : 0;
        const otpScore = 65;
        
        let score = 0;
        score += Math.min(connectionRate / 10, 40);
        score += Math.min(avgConnections * 10, 30);
        score += Math.min(otpScore / 10, 30);
        return Math.round(score);
      };
      
      const activityScore1 = calculateActivityScore(usersInPeriod1, users.length);
      const activityScore2 = calculateActivityScore(usersInPeriod2, users.length);
      
      const uniqueUsers1 = new Set(usersInPeriod1.map(u => u.id)).size;
      const uniqueUsers2 = new Set(usersInPeriod2.map(u => u.id)).size;
      
      const newUsers1 = users.filter(u => 
        u.createdAt && new Date(u.createdAt) >= startDate1 && new Date(u.createdAt) <= endDate1
      ).length;
      
      const newUsers2 = users.filter(u => 
        u.createdAt && new Date(u.createdAt) >= startDate2 && new Date(u.createdAt) <= endDate2
      ).length;
      
      const avgConnections1 = uniqueUsers1 > 0 ? (usersInPeriod1.length / uniqueUsers1).toFixed(1) : 0;
      const avgConnections2 = uniqueUsers2 > 0 ? (usersInPeriod2.length / uniqueUsers2).toFixed(1) : 0;
      
      const conversionRate1 = usersInPeriod1.length > 0 ? Math.round((newUsers1 / usersInPeriod1.length) * 100) : 0;
      const conversionRate2 = usersInPeriod2.length > 0 ? Math.round((newUsers2 / usersInPeriod2.length) * 100) : 0;
      
      const metrics = [
        { name: ' Connexions totales', key1: usersInPeriod1.length, key2: usersInPeriod2.length, unit: '', description: 'Volume total d\'activité' },
        { name: ' Utilisateurs uniques', key1: uniqueUsers1, key2: uniqueUsers2, unit: '', description: 'Personnes différentes connectées' },
        { name: ' Moy. connexions/utilisateur', key1: parseFloat(avgConnections1), key2: parseFloat(avgConnections2), unit: '', description: 'Engagement moyen' },
        { name: ' Nouveaux utilisateurs', key1: newUsers1, key2: newUsers2, unit: '', description: 'Nouvelles inscriptions' },
        { name: ' Taux de conversion', key1: conversionRate1, key2: conversionRate2, unit: '%', description: 'Nouveaux / Total connexions' },
        { name: ' Utilisateurs inactifs', key1: inactiveUsersCount, key2: inactiveUsersCount, unit: '', description: 'Sans connexion récente (30j)' },
        { name: ' Utilisateurs fidélisés', key1: loyalUsersCount, key2: loyalUsersCount, unit: '', description: '+5 connexions' },
        { name: ' Heure de pointe', key1: `${peakHour1}h`, key2: `${peakHour2}h`, unit: '', description: 'Moment d\'activité max' },
        { name: ' Utilisation OTP', key1: 65, key2: 65, unit: '%', description: 'Adoption de l\'authentification' },
        { name: ' Score d\'activité', key1: activityScore1, key2: activityScore2, unit: '/100', description: 'Performance globale' }
      ];

      const result = metrics.map(metric => {
        const val1 = metric.key1;
        const val2 = metric.key2;
        
        let evolution = 0;
        let evolutionFormatted = '0';
        
        if (typeof val1 === 'number' && typeof val2 === 'number') {
          if (val2 === 0 && val1 === 0) {
            evolution = 0;
          } else if (val2 === 0 && val1 > 0) {
            evolution = 100;
          } else if (val2 > 0) {
            const rawEvolution = ((val1 - val2) / val2) * 100;
            evolution = Math.round(rawEvolution * 10) / 10;
          }
          evolutionFormatted = evolution > 0 ? `+${evolution}%` : `${evolution}%`;
        } else if (val1 !== val2) {
          evolutionFormatted = 'Différent';
        } else {
          evolutionFormatted = 'Identique';
        }
        
        let trend = 'stable';
        if (typeof evolution === 'number') {
          if (evolution > 5) trend = 'up';
          else if (evolution < -5) trend = 'down';
        }
        
        let analysis = '';
        if (metric.name.includes('Connexions')) {
          if (trend === 'up') analysis = `📈 Augmentation de l'activité avec ${Math.abs(val1 - val2)} connexion(s) supplémentaire(s)`;
          else if (trend === 'down') analysis = `📉 Baisse d'activité avec ${Math.abs(val1 - val2)} connexion(s) en moins`;
          else analysis = `📊 Volume de connexions similaire (${val1} vs ${val2})`;
        } else if (metric.name.includes('Utilisateurs uniques')) {
          if (trend === 'up') analysis = `👥 Élargissement de la base d'utilisateurs (+${Math.abs(val1 - val2)})`;
          else if (trend === 'down') analysis = `📉 Diminution du nombre d'utilisateurs (-${Math.abs(val1 - val2)})`;
          else analysis = `👤 Base d'utilisateurs stable (${val1} vs ${val2})`;
        } else if (metric.name.includes('Nouveaux')) {
          if (trend === 'up') analysis = `🌱 Croissance des inscriptions (+${Math.abs(val1 - val2)})`;
          else if (trend === 'down') analysis = `🍂 Ralentissement des inscriptions (-${Math.abs(val1 - val2)})`;
          else analysis = `📝 Rythme d'inscriptions constant (${val1} vs ${val2})`;
        } else if (metric.name.includes('Moy.')) {
          if (trend === 'up') analysis = `⚡ Engagement utilisateur en hausse (+${Math.abs(val1 - val2)} connexions/utilisateur)`;
          else if (trend === 'down') analysis = `⚠️ Baisse de l'engagement (-${Math.abs(val1 - val2)} connexions/utilisateur)`;
          else analysis = `📊 Engagement stable à ${val1} connexions/utilisateur`;
        } else if (metric.name.includes('Taux de conversion')) {
          if (trend === 'up') analysis = `🎯 Meilleure conversion des visiteurs (+${Math.abs(evolution)} points)`;
          else if (trend === 'down') analysis = `📉 Taux de conversion en baisse (${Math.abs(evolution)} points)`;
          else analysis = `🔄 Taux de conversion stable à ${val1}%`;
        } else if (metric.name.includes('Inactifs')) {
          analysis = `💤 ${val1} utilisateur(s) sans activité récente (30j)`;
        } else if (metric.name.includes('Fidélisés')) {
          analysis = `⭐ ${val1} utilisateur(s) avec ${val1 >= 5 ? 'forte' : 'faible'} activité (5+ connexions)`;
        } else if (metric.name.includes('Heure')) {
          analysis = `⏰ Pic d'activité à ${val1} vs ${val2}`;
        } else if (metric.name.includes('OTP')) {
          if (trend === 'up') analysis = `🔐 Adoption de l'authentification renforcée en hausse`;
          else if (trend === 'down') analysis = `⚠️ Baisse d'utilisation de l'authentification renforcée`;
          else analysis = `🔐 Taux d'utilisation OTP stable à ${val1}%`;
        } else if (metric.name.includes('Score')) {
          if (trend === 'up') analysis = `🏆 Performance globale en amélioration (+${Math.abs(evolution)} points)`;
          else if (trend === 'down') analysis = `📉 Performance globale en baisse (${Math.abs(evolution)} points)`;
          else analysis = `🎯 Performance globale stable (${val1}/100)`;
        }
        
        return {
          metric: metric.name,
          period1: val1,
          period2: val2,
          evolution: evolutionFormatted,
          trend: trend,
          analysis: analysis,
          unit: metric.unit,
          description: metric.description
        };
      });
      
      setComparisonResult({
        period1Label: period1.type === 'custom' 
          ? `${period1.startDate} → ${period1.endDate}` 
          : period1.label,
        period2Label: period2.type === 'custom' 
          ? `${period2.startDate} → ${period2.endDate}` 
          : period2.label,
        period1Dates: { start: startDate1, end: endDate1 },
        period2Dates: { start: startDate2, end: endDate2 },
        data: result
      });
      
      setShowComparisonModal(false);
      
      showNotification({
        type: 'success',
        title: '✅ Comparaison terminée',
        message: 'Les résultats de la comparaison sont affichés ci-dessous'
      });
      
    } catch (err) {
      console.error('❌ Erreur comparaison:', err);
      showNotification({
        type: 'error',
        title: '❌ Erreur',
        message: 'Erreur lors de la comparaison'
      });
    } finally {
      setLoadingStats(false);
    }
  }, [users, period1, period2, getDateRangeForPeriod]);

  // ========== OUVERTURE MODALE COMPARAISON ==========
  const openComparisonModal = useCallback(() => {
    setShowComparisonModal(true);
  }, []);

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
  }, [fetchUsers]);
  
  useEffect(() => {
    window.debugUsers = users;
    window.debugSelectedUser = selectedResetUser;
    console.log('✅ Mode débogage activé - Tapez window.debugUsers dans la console');
  }, [users, selectedResetUser]);

  // ========== ACTIONS UTILISATEURS ==========
  
  const handleAddUser = async (e) => {
    e.preventDefault();
    
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
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/register`, {
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

      if (response.ok && data.success) {
        showNotification({ 
          type: 'success', 
          title: '✅ Succès', 
          message: `L'utilisateur ${formData.email} a été créé avec succès` 
        });
        
        setShowAddUserModal(false);
        setFormData({ email: '', role: 'agent', matricule: '', password: '' });
        await fetchUsers(true);
        
      } else {
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
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/users/${selectedUser.id}`, {
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
        fetchUsers(true);
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

  const confirmDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        showNotification({ 
          type: 'warning', 
          title: '🗑️ Suppression', 
          message: `L'utilisateur ${userToDelete.email} a été supprimé` 
        });
        fetchUsers(true);
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

  const handleToggleStatus = (userId) => {
    try {
      const user = users.find(u => u.id === userId);
      
      if (!user) {
        showNotification({ 
          type: 'error', 
          title: '❌ Erreur', 
          message: 'Utilisateur non trouvé' 
        });
        return;
      }
      
      const newStatus = user.status === 'active' ? 'inactive' : 'active';
      const actionText = newStatus === 'active' ? 'activé' : 'désactivé';
      
      const updatedUsers = users.map(u => 
        u.id === userId ? { ...u, status: newStatus } : u
      );
      
      setUsers(updatedUsers);
      setFilteredUsers(updatedUsers);
      setCachedUsers(updatedUsers);
      
      showNotification({ 
        type: 'success', 
        title: '🔄 Statut modifié (affichage uniquement)', 
        message: `${user.email} est maintenant ${actionText} - Changement local, non persistant` 
      });
      
      console.log(`✅ Changement visuel : ${user.email} -> ${newStatus}`);
      
    } catch (err) {
      console.error('❌ Erreur:', err);
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Erreur lors du changement de statut' 
      });
    }
  };

  const handleResetPassword = async () => {
    if (!selectedResetUser) {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Veuillez sélectionner un utilisateur' 
      });
      return;
    }

    let userId = selectedResetUser.id || selectedResetUser.Id_utilisateur || selectedResetUser.userId || selectedResetUser._id;

    if (!userId && window.debugUsers) {
      const foundUser = window.debugUsers.find(u => u.email === selectedResetUser.email);
      if (foundUser) {
        userId = foundUser.id;
      }
    }

    if (!userId) {
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'ID utilisateur introuvable' 
      });
      return;
    }

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
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/users/${userId}/reset-password`, {
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
      console.error('❌ Erreur:', err);
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
      
      const userId = selectedResetUser.id || selectedResetUser.Id_utilisateur;
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/notifications/send-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: userId,
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
      console.error('❌ Erreur:', err);
      showNotification({ 
        type: 'error', 
        title: '❌ Erreur', 
        message: 'Erreur de connexion au serveur' 
      });
    } finally {
      setSendingNotification(false);
    }
  };

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
      
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/users/bulk`, {
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
        fetchUsers(true);
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

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
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

      {/* HEADER */}
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
        <button className={`menu-btn ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')}>
          <FileTextIcon size={18} /> <span>Journal d'audit</span>
        </button>
      </div>

      {/* CONTENU */}
      <div className="dashboard-content">
        
        {/* ACCUEIL */}
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
                <button className="retry-btn" onClick={() => fetchUsers(true)}>
                  <RefreshCw size={16} /> Réessayer
                </button>
              </div>
            ) : (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon"><UsersRound size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Nombre Total des utilisateurs</div>
                      <div className="stat-value">{stats.total}</div>
                    </div>
                  </div>
                  
                  <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#2563eb' }}><Crown size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Nombre des Administrateurs</div>
                      <div className="stat-value">{stats.admins}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#f59e0b' }}><Wrench size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Nombre des Techniciens</div>
                      <div className="stat-value">{stats.techniciens}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#10b981' }}><Heart size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Nombre des responsables sociales</div>
                      <div className="stat-value">{stats.sociaux}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#8b5cf6' }}><User size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Nombre des Agents</div>
                      <div className="stat-value">{stats.agents}</div>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon" style={{ color: '#2563eb' }}><Zap size={24} /></div>
                    <div className="stat-content">
                      <div className="stat-label">Nombre Total des connexions</div>
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
                      <button onClick={() => fetchUsers(true)}>
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

        {/* UTILISATEURS */}
        {activeTab === 'users' && (
          <div className="users-page">
            <div className="page-header">
              <h2>{t.users}</h2>
              <div className="page-actions">
                <div className="search-box">
                  <Search size={16} />
                  <input 
                    placeholder={t.search} 
                    defaultValue={filters.search}
                    onChange={e => handleSearchDebounced(e.target.value)} 
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
          <tr key={user.id}>
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

        {/* RÉINITIALISATION */}
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
                        onClick={() => {
                          setSelectedResetUser(user);
                        }}
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

        {/* TABLEAU DE BORD (STATISTIQUES) */}
        {activeTab === 'stats' && (
          <div className="stats-page">
            <div className="stats-header">
              <div className="stats-title-section">
                <h2>Analytics Dashboard</h2>
                <p className="stats-subtitle">Visualisez, analysez et optimisez vos performances</p>
              </div>
              
              {/* SÉLECTEUR DE PÉRIODE AVEC DATE UNIQUE */}
              <div className="period-selector-premium-v2">
                <div className="period-slider-container">
                  <button 
                    className={`period-slide-btn ${periodType === 'today' ? 'active' : ''}`}
                    onClick={() => handlePeriodChange('today')}
                  >
                    <CalendarIcon size={14} />
                    <span>Aujourd'hui</span>
                  </button>
                  <button 
                    className={`period-slide-btn ${periodType === 'week' ? 'active' : ''}`}
                    onClick={() => handlePeriodChange('week')}
                  >
                    <CalendarDays size={14} />
                    <span>Cette semaine</span>
                  </button>
                  <button 
                    className={`period-slide-btn ${periodType === 'month' ? 'active' : ''}`}
                    onClick={() => handlePeriodChange('month')}
                  >
                    <CalendarRange size={14} />
                    <span>Ce mois</span>
                  </button>
                  <button 
                    className={`period-slide-btn ${periodType === 'year' ? 'active' : ''}`}
                    onClick={() => handlePeriodChange('year')}
                  >
                    <CalendarIcon size={14} />
                    <span>Cette année</span>
                  </button>
                  <button 
                    className={`period-slide-btn ${periodType === 'custom' ? 'active' : ''}`}
                    onClick={() => handlePeriodChange('custom')}
                  >
                    <SlidersHorizontal size={14} />
                    <span>Date personnalisée</span>
                  </button>
                </div>
                
                {/* DATE PICKER - UNIQUEMENT DATE UNIQUE */}
                {showDatePicker && (
                  <div className="custom-date-panel-simple">
                    <div className="single-date-input">
                      <label>📅 Sélectionnez une date</label>
                      <input 
                        type="date" 
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="date-input-simple"
                      />
                    </div>
                    
                    <div className="custom-date-actions">
                      <button className="cancel-date-btn" onClick={cancelDatePicker}>
                        <XCircle size={14} />
                        Annuler
                      </button>
                      <button className="apply-date-btn-simple" onClick={applyCustomDateRange} disabled={isRefreshingStats}>
                        {isRefreshingStats ? (
                          <span className="spinner-small"></span>
                        ) : (
                          <>
                            <Check size={14} />
                            Appliquer
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Indicateur de chargement non bloquant */}
            {isRefreshingStats && (
              <div className="stats-loading-toast">
                <div className="loading-spinner-small"></div>
                <span>Mise à jour...</span>
              </div>
            )}

            {/* KPI CARDS */}
            <div className="kpi-premium-grid">
              <div className="kpi-premium-card blue">
                <div className="kpi-premium-icon">
                  <Activity size={24} />
                </div>
                <div className="kpi-premium-content">
                  <span className="kpi-premium-label">Connexions</span>
                  <span className="kpi-premium-value">
                    {currentPeriodStats[periodType === 'custom' ? 'custom' : periodType]?.totalConnexions || 
                     currentPeriodStats[periodType === 'custom' ? 'custom' : periodType]?.totalLogins || 0}
                  </span>
                  <span className={`kpi-premium-trend ${trendStats.logins >= 0 ? 'positive' : 'negative'}`}>
                    {trendStats.logins >= 0 ? '+' : ''}{trendStats.logins}%
                  </span>
                </div>
              </div>

              <div className="kpi-premium-card green">
                <div className="kpi-premium-icon">
                  <Users size={24} />
                </div>
                <div className="kpi-premium-content">
                  <span className="kpi-premium-label">Utilisateurs actifs</span>
                  <span className="kpi-premium-value">
                    {currentPeriodStats[periodType === 'custom' ? 'custom' : periodType]?.uniqueUsers || 0}
                  </span>
                  <span className={`kpi-premium-trend ${trendStats.users >= 0 ? 'positive' : 'negative'}`}>
                    {trendStats.users >= 0 ? '+' : ''}{trendStats.users}%
                  </span>
                </div>
              </div>

              <div className="kpi-premium-card purple">
                <div className="kpi-premium-icon">
                  <UserPlus size={24} />
                </div>
                <div className="kpi-premium-content">
                  <span className="kpi-premium-label">Nouveaux utilisateurs</span>
                  <span className="kpi-premium-value">
                    {currentPeriodStats[periodType === 'custom' ? 'custom' : periodType]?.newUsers || 0}
                  </span>
                  <span className={`kpi-premium-trend ${trendStats.newUsers >= 0 ? 'positive' : 'negative'}`}>
                    {trendStats.newUsers >= 0 ? '+' : ''}{trendStats.newUsers}%
                  </span>
                </div>
              </div>

              <div className="kpi-premium-card orange">
                <div className="kpi-premium-icon">
                  <Fingerprint size={24} />
                </div>
                <div className="kpi-premium-content">
                  <span className="kpi-premium-label">Taux OTP</span>
                  <span className="kpi-premium-value">
                    {currentPeriodStats[periodType === 'custom' ? 'custom' : periodType]?.otpUsage || 0}%
                  </span>
                  <span className={`kpi-premium-trend ${trendStats.otp >= 0 ? 'positive' : 'negative'}`}>
                    {trendStats.otp >= 0 ? '+' : ''}{trendStats.otp}%
                  </span>
                </div>
              </div>
            </div>

            <div className="charts-premium-grid">
              {/* Graphique 1: Répartition par rôle */}
              <div className="chart-premium-card">
                <div className="chart-premium-header">
                  <h3>Répartition par rôle</h3>
                  <span className="chart-premium-badge">Total: {stats.total} utilisateurs</span>
                </div>
                <div className="chart-premium-content donut-container">
                  <div className="donut-chart">
                    <svg viewBox="0 0 100 100" className="donut-svg">
                      {stats.total > 0 ? (
                        <>
                          {(() => {
                            const total = stats.total;
                            const circumference = 2 * Math.PI * 40;
                            
                            const adminPercent = stats.admins / total;
                            const technicienPercent = stats.techniciens / total;
                            const socialPercent = stats.sociaux / total;
                            const agentPercent = stats.agents / total;
                            
                            let adminOffset = 0;
                            let technicienOffset = adminPercent * circumference;
                            let socialOffset = technicienOffset + (technicienPercent * circumference);
                            let agentOffset = socialOffset + (socialPercent * circumference);
                            
                            return (
                              <>
                                {adminPercent > 0 && (
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="transparent"
                                    stroke="#2563eb"
                                    strokeWidth="15"
                                    strokeDasharray={`${circumference * adminPercent} ${circumference}`}
                                    strokeDashoffset={-adminOffset}
                                    strokeLinecap="butt"
                                  />
                                )}
                                
                                {technicienPercent > 0 && (
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="transparent"
                                    stroke="#f59e0b"
                                    strokeWidth="15"
                                    strokeDasharray={`${circumference * technicienPercent} ${circumference}`}
                                    strokeDashoffset={-technicienOffset}
                                    strokeLinecap="butt"
                                  />
                                )}
                                
                                {socialPercent > 0 && (
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="transparent"
                                    stroke="#10b981"
                                    strokeWidth="15"
                                    strokeDasharray={`${circumference * socialPercent} ${circumference}`}
                                    strokeDashoffset={-socialOffset}
                                    strokeLinecap="butt"
                                  />
                                )}
                                
                                {agentPercent > 0 && (
                                  <circle
                                    cx="50"
                                    cy="50"
                                    r="40"
                                    fill="transparent"
                                    stroke="#8b5cf6"
                                    strokeWidth="15"
                                    strokeDasharray={`${circumference * agentPercent} ${circumference}`}
                                    strokeDashoffset={-agentOffset}
                                    strokeLinecap="butt"
                                  />
                                )}
                              </>
                            );
                          })()}
                        </>
                      ) : (
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke="#e2e8f0"
                          strokeWidth="15"
                          strokeDasharray={`${2 * Math.PI * 40} ${2 * Math.PI * 40}`}
                          strokeDashoffset="0"
                          strokeLinecap="round"
                        />
                      )}
                      <circle cx="50" cy="50" r="25" fill="var(--bg-card)" />
                    </svg>
                    <div className="donut-center">
                      <span className="donut-total">{stats.total}</span>
                      <span className="donut-label">total</span>
                    </div>
                  </div>
                  
                  <div className="donut-legend">
                    <div className="legend-item">
                      <span className="legend-color admin"></span>
                      <span className="legend-label">Administrateurs</span>
                      <span className="legend-value">
                        {stats.admins} 
                        {stats.total > 0 && (
                          <span className="legend-percent">
                            ({Math.round((stats.admins / stats.total) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <div className="legend-item">
                      <span className="legend-color technicien"></span>
                      <span className="legend-label">Techniciens</span>
                      <span className="legend-value">
                        {stats.techniciens}
                        {stats.total > 0 && (
                          <span className="legend-percent">
                            ({Math.round((stats.techniciens / stats.total) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <div className="legend-item">
                      <span className="legend-color social"></span>
                      <span className="legend-label">Service Social</span>
                      <span className="legend-value">
                        {stats.sociaux}
                        {stats.total > 0 && (
                          <span className="legend-percent">
                            ({Math.round((stats.sociaux / stats.total) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                    
                    <div className="legend-item">
                      <span className="legend-color agent"></span>
                      <span className="legend-label">Agents</span>
                      <span className="legend-value">
                        {stats.agents}
                        {stats.total > 0 && (
                          <span className="legend-percent">
                            ({Math.round((stats.agents / stats.total) * 100)}%)
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Graphique 2: Évolution des connexions */}
              <div className="chart-premium-card">
                <div className="chart-premium-header">
                  <h3>Évolution des connexions</h3>
                  <span className="chart-premium-badge">7 derniers jours</span>
                </div>
                <div className="chart-premium-content">
                  <div className="evolution-chart">
                    {trendData.values.map((value, index) => {
                      const maxValue = Math.max(...trendData.values, 1);
                      const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                      const prevValue = index > 0 ? trendData.values[index - 1] : value;
                      const trend = index > 0 ? (value > prevValue ? 'up' : value < prevValue ? 'down' : 'stable') : 'stable';
                      const variation = trendData.variations[index] || 0;
                      
                      return (
                        <div key={index} className="evolution-bar-container">
                          <div className="evolution-bar-wrapper">
                            <div 
                              className={`evolution-bar ${trend}`}
                              style={{ height: `${height}%` }}
                            >
                              <span className="evolution-bar-value">{value}</span>
                            </div>
                          </div>
                          <div className="evolution-bar-footer">
                            <span className="evolution-bar-label">{trendData.labels[index]}</span>
                            {index > 0 && variation !== 0 && (
                              <span className={`evolution-trend ${trend}`}>
                                {trend === 'up' && <ArrowUpIcon size={12} />}
                                {trend === 'down' && <ArrowDownIcon size={12} />}
                                {Math.abs(variation)}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Graphique 3: Activité horaire */}
              <div className="chart-premium-card">
                <div className="chart-premium-header">
                  <h3>Activité horaire</h3>
                  <span className="chart-premium-badge">Aujourd'hui</span>
                </div>
                <div className="chart-premium-content">
                  <div className="hour-chart">
                    {hourlyData.values.slice(0, 12).map((value, index) => {
                      const maxValue = Math.max(...hourlyData.values, 1);
                      const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                      return (
                        <div key={index} className="hour-bar-container">
                          <div 
                            className="hour-bar"
                            style={{ 
                              height: `${height}%`,
                              backgroundColor: value > 0 ? '#10b981' : '#e2e8f0'
                            }}
                          >
                            <span className="hour-value">{value}</span>
                          </div>
                          <span className="hour-label">{index}h</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="hour-chart">
                    {hourlyData.values.slice(12, 24).map((value, index) => {
                      const maxValue = Math.max(...hourlyData.values, 1);
                      const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
                      return (
                        <div key={index + 12} className="hour-bar-container">
                          <div 
                            className="hour-bar"
                            style={{ 
                              height: `${height}%`,
                              backgroundColor: value > 0 ? '#10b981' : '#e2e8f0'
                            }}
                          >
                            <span className="hour-value">{value}</span>
                          </div>
                          <span className="hour-label">{index + 12}h</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Bouton de comparaison */}
            <div className="comparison-action">
              <button className="compare-btn-large" onClick={openComparisonModal}>
                <BarChart size={20} />
                Comparer deux périodes
              </button>
            </div>

            {/* Résultats de comparaison */}
            {comparisonResult && (
              <div className="comparison-results-modern">
                <div className="comparison-header">
                  <h3>📊 Résultats de la comparaison</h3>
                  <div className="comparison-periods">
                    <div className="comparison-period-badge period1">
                      <Calendar size={14} />
                      <span>{comparisonResult.period1Label}</span>
                    </div>
                    <span className="comparison-vs">VS</span>
                    <div className="comparison-period-badge period2">
                      <Calendar size={14} />
                      <span>{comparisonResult.period2Label}</span>
                    </div>
                  </div>
                </div>

                <div className="comparison-table-wrapper">
                  <table className="comparison-table-modern">
                    <thead>
                      <tr>
                        <th>Indicateur</th>
                      
                        <th>{comparisonResult.period1Label}</th>
                        <th>{comparisonResult.period2Label}</th>
                        <th>Évolution</th>
                        <th>Analyse</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonResult.data.map((item, index) => (
                        <tr key={index}>
                          <td className="metric-name">
                            {item.metric}
                            {item.unit && <span className="metric-unit">({item.unit})</span>}
                          </td>
                          <td className="metric-description">{item.description}</td>
                          <td className="metric-value">
                            {item.period1}
                            {item.metric === ' Score d\'activité' && (
                              <div className="activity-score">
                                <div className="score-bar">
                                  <div 
                                    className={`score-fill ${item.period1 >= 70 ? 'high' : item.period1 >= 40 ? 'medium' : 'low'}`}
                                    style={{ width: `${item.period1}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="metric-value">
                            {item.period2}
                            {item.metric === ' Score d\'activité' && (
                              <div className="activity-score">
                                <div className="score-bar">
                                  <div 
                                    className={`score-fill ${item.period2 >= 70 ? 'high' : item.period2 >= 40 ? 'medium' : 'low'}`}
                                    style={{ width: `${item.period2}%` }}
                                  ></div>
                                </div>
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`trend-badge-modern ${item.trend}`}>
                              {item.trend === 'up' && '↑'}
                              {item.trend === 'down' && '↓'}
                              {item.trend === 'stable' && '→'}
                              {item.evolution}
                            </span>
                          </td>
                          <td className="analysis-text">{item.analysis}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* JOURNAL D'AUDIT */}
        {activeTab === 'audit' && <AuditLog />}

      </div>

      {/* ========== MODALES ========== */}
      
      {/* MODALE DE COMPARAISON AVEC DATES PERSONNALISÉES */}
      {showComparisonModal && (
        <div className="modal-overlay" onClick={() => setShowComparisonModal(false)}>
          <div className="modal-content comparison-modal-enhanced" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-icon" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)' }}>
                <BarChart size={24} />
              </div>
              <h2>Comparer deux périodes</h2>
              <button className="modal-close" onClick={() => setShowComparisonModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="modal-body">
              {/* Période 1 */}
              <div className="comparison-period-section">
                <div className="period-header">
                  <span className="period-number">01</span>
                  <h3>Première période</h3>
                </div>
                
                <div className="period-type-selector">
                  <select 
                    value={period1.type}
                    onChange={handlePeriod1Change}
                    className="period-select-simple"
                  >
                    <option value="today"> Aujourd'hui</option>
                    <option value="yesterday"> Hier</option>
                    <option value="week"> Cette semaine</option>
                    <option value="lastWeek"> Semaine dernière</option>
                    <option value="month"> Ce mois</option>
                    <option value="lastMonth"> Mois dernier</option>
                    <option value="year"> Cette année</option>
                    <option value="lastYear"> Année dernière</option>
                    <option value="custom"> Dates personnalisées</option>
                  </select>
                </div>
                
                {period1.type === 'custom' && (
                  <div className="custom-date-inputs">
                    <div className="date-input-group">
                      <label>Date de début</label>
                      <input 
                        type="date" 
                        value={period1.startDate}
                        onChange={(e) => updateCustomDatePeriod1('startDate', e.target.value)}
                        className="date-input-custom"
                      />
                    </div>
                    <span className="date-arrow">→</span>
                    <div className="date-input-group">
                      <label>Date de fin</label>
                      <input 
                        type="date" 
                        value={period1.endDate}
                        onChange={(e) => updateCustomDatePeriod1('endDate', e.target.value)}
                        className="date-input-custom"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="comparison-vs-divider">
                <span>VS</span>
              </div>
              
              {/* Période 2 */}
              <div className="comparison-period-section">
                <div className="period-header">
                  <span className="period-number">02</span>
                  <h3>Deuxième période</h3>
                </div>
                
                <div className="period-type-selector">
                  <select 
                    value={period2.type}
                    onChange={handlePeriod2Change}
                    className="period-select-simple"
                  >
                    <option value="today"> Aujourd'hui</option>
                    <option value="yesterday"> Hier</option>
                    <option value="week"> Cette semaine</option>
                    <option value="lastWeek"> Semaine dernière</option>
                    <option value="month"> Ce mois</option>
                    <option value="lastMonth"> Mois dernier</option>
                    <option value="year"> Cette année</option>
                    <option value="lastYear"> Année dernière</option>
                    <option value="custom"> Dates personnalisées</option>
                  </select>
                </div>
                
                {period2.type === 'custom' && (
                  <div className="custom-date-inputs">
                    <div className="date-input-group">
                      <label>Date de début</label>
                      <input 
                        type="date" 
                        value={period2.startDate}
                        onChange={(e) => updateCustomDatePeriod2('startDate', e.target.value)}
                        className="date-input-custom"
                      />
                    </div>
                    <span className="date-arrow">→</span>
                    <div className="date-input-group">
                      <label>Date de fin</label>
                      <input 
                        type="date" 
                        value={period2.endDate}
                        onChange={(e) => updateCustomDatePeriod2('endDate', e.target.value)}
                        className="date-input-custom"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowComparisonModal(false)}>
                Annuler
              </button>
              <button 
                className="btn-primary" 
                onClick={performComparison}
                disabled={loadingStats || (period1.type === 'custom' && (!period1.startDate || !period1.endDate)) || (period2.type === 'custom' && (!period2.startDate || !period2.endDate))}
              >
                {loadingStats ? (
                  <>
                    <span className="spinner-small"></span>
                    Comparaison en cours...
                  </>
                ) : (
                  <>
                    <BarChart size={16} />
                    Comparer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE MODIFICATION - AVEC CHAMPS GRISÉS */}
      {showEditUserModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowEditUserModal(false)}>
          <div className="modal-content edit-modal-pro" onClick={e => e.stopPropagation()}>
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon-pro" style={{ background: `linear-gradient(135deg, ${getRoleColor(selectedUser.role)}, ${getRoleColor(selectedUser.role)}dd)` }}>
                  <Edit size={20} />
                </div>
                <div className="header-title-pro">
                  <h2>Modifier l'utilisateur</h2>
                  <span>ID: {selectedUser.id}</span>
                </div>
              </div>
              <button className="modal-close-pro" onClick={() => setShowEditUserModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-pro">
              <div className="user-identity-card">
                <div className="user-avatar-pro" style={{ background: `linear-gradient(135deg, ${getRoleColor(selectedUser.role)}, ${getRoleColor(selectedUser.role)}dd)` }}>
                  {selectedUser.email?.charAt(0).toUpperCase()}
                </div>
                <div className="user-info-pro">
                  <div className="user-name-pro">{selectedUser.email}</div>
                  <div className="user-badge-pro">
                    <span className={`role-tag ${getRoleClass(selectedUser.role)}`}>
                      {getRoleLabel(selectedUser.role)}
                    </span>
                    <span className={`status-tag ${selectedUser.status}`}>
                      {selectedUser.status === 'active' ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleEditUser}>
                <div className="form-grid">
                  <div className="form-field">
                    <label>Adresse email</label>
                    <div className="input-group">
                      <Mail size={16} className="field-icon" />
                      <input 
                        type="email" 
                        value={editFormData.email} 
                        onChange={e => setEditFormData({...editFormData, email: e.target.value})} 
                        placeholder="exemple@email.com"
                        required 
                      />
                    </div>
                  </div>

                  {/* CHAMP RÔLE - GRISÉ ET DÉSACTIVÉ */}
                  <div className="form-field">
                    <label>Rôle <span className="field-disabled-note">(Non modifiable)</span></label>
                    <div className="input-group disabled-group">
                      <UserCog size={16} className="field-icon" />
                      <select 
                        value={editFormData.role} 
                        disabled
                        className="disabled-input"
                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', opacity: 0.7 }}
                      >
                        <option value="admin">Administrateur</option>
                        <option value="technicien">Technicien</option>
                        <option value="social">Service Social</option>
                        <option value="agent">Agent</option>
                      </select>
                      <div className="disabled-overlay">
                        <Lock size={14} />
                        <span>Verrouillé</span>
                      </div>
                    </div>
                  </div>

                  {/* CHAMP MATRICULE - GRISÉ ET DÉSACTIVÉ */}
                  <div className="form-field">
                    <label>Matricule <span className="field-disabled-note">(Non modifiable)</span></label>
                    <div className="input-group disabled-group">
                      <Hash size={16} className="field-icon" />
                      <input 
                        type="text" 
                        value={editFormData.matricule} 
                        disabled
                        className="disabled-input"
                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed', opacity: 0.7 }}
                        placeholder="Numéro de matricule"
                      />
                      <div className="disabled-overlay">
                        <Lock size={14} />
                        <span>Verrouillé</span>
                      </div>
                    </div>
                  </div>

                  <div className="form-field">
                    <label>Date de création</label>
                    <div className="input-group readonly">
                      <Calendar size={16} className="field-icon" />
                      <input 
                        type="text" 
                        value={formatDate(selectedUser.createdAt)} 
                        readOnly 
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="actions-section">
                  <h3>Actions sur le compte</h3>
                  <div className="action-buttons">
                    <button 
                      type="button" 
                      className={`action-pro ${selectedUser.status === 'active' ? 'warning' : 'success'}`}
                      onClick={() => {
                        handleToggleStatus(selectedUser.id);
                        setShowEditUserModal(false);
                      }}
                    >
                      {selectedUser.status === 'active' ? (
                        <>
                          <ToggleLeft size={16} />
                          <span>Désactiver le compte</span>
                        </>
                      ) : (
                        <>
                          <ToggleRight size={16} />
                          <span>Activer le compte</span>
                        </>
                      )}
                    </button>
                    
                    <button 
                      type="button" 
                      className="action-pro reset"
                      onClick={() => {
                        setActiveTab('reset');
                        setSelectedResetUser(selectedUser);
                        setShowEditUserModal(false);
                      }}
                    >
                      <Key size={16} />
                      <span>Réinitialiser le mot de passe</span>
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="modal-footer-pro">
              <button type="button" className="btn-secondary-pro" onClick={() => setShowEditUserModal(false)}>
                Annuler
              </button>
              <button type="submit" className="btn-primary-pro" onClick={handleEditUser}>
                <Save size={16} />
                <span>Enregistrer les modifications</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE CONFIRMATION SUPPRESSION */}
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
      
      {/* MODALE EXPORT */}
      {showExportModal && (
        <div className="modal-overlay" onClick={() => setShowExportModal(false)}>
          <div className="modal-content export-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header-pro">
              <div className="header-left">
                <div className="header-icon-pro" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  <Download size={20} />
                </div>
                <div className="header-title-pro">
                  <h2>Exporter les données</h2>
                  <span>{filteredUsers.length} utilisateurs sélectionnés</span>
                </div>
              </div>
              <button className="modal-close-pro" onClick={() => setShowExportModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body-pro">
              <div className="export-options-grid">
                <div className="export-option-card" onClick={handleExport}>
                  <div className="option-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                    <FileText size={24} color="#10b981" />
                  </div>
                  <div className="option-content">
                    <h3>Format CSV</h3>
                    <p>Fichier compatible avec Excel, Google Sheets et la plupart des outils</p>
                    <div className="option-meta">
                      <span className="badge">Recommandé</span>
                      <span className="file-size">~{Math.ceil(filteredUsers.length * 0.5)} Ko</span>
                    </div>
                  </div>
                </div>

                <div className="export-option-card disabled">
                  <div className="option-icon" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                    <FileText size={24} color="#ef4444" />
                  </div>
                  <div className="option-content">
                    <h3>Format PDF</h3>
                    <p>Export PDF avec mise en page professionnelle</p>
                    <div className="option-meta">
                      <span className="badge disabled">Bientôt disponible</span>
                    </div>
                  </div>
                </div>

                <div className="export-option-card disabled">
                  <div className="option-icon" style={{ background: 'rgba(37, 99, 235, 0.1)' }}>
                    <FileText size={24} color="#2563eb" />
                  </div>
                  <div className="option-content">
                    <h3>Format Excel</h3>
                    <p>Fichier .xlsx avec formules et mise en forme</p>
                    <div className="option-meta">
                      <span className="badge disabled">Bientôt disponible</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="export-summary">
                <div className="summary-row">
                  <span>Utilisateurs à exporter :</span>
                  <strong>{filteredUsers.length}</strong>
                </div>
                <div className="summary-row">
                  <span>Colonnes incluses :</span>
                  <strong>8</strong>
                </div>
                <div className="summary-row">
                  <span>Date d'export :</span>
                  <strong>{new Date().toLocaleDateString('fr-FR')}</strong>
                </div>
              </div>
            </div>

            <div className="modal-footer-pro">
              <button type="button" className="btn-secondary-pro" onClick={() => setShowExportModal(false)}>
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE AJOUT UTILISATEUR - VERSION PROFESSIONNELLE */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content modal-add-user enhanced" onClick={e => e.stopPropagation()}>
            <div className="modal-header enhanced">
              <div className="header-icon enhanced">
                <UserPlus size={28} />
              </div>
              <div className="header-content">
                <h2>Créer un nouvel utilisateur</h2>
                <p>Remplissez les informations ci-dessous pour ajouter un compte</p>
              </div>
              <button className="modal-close enhanced" onClick={() => setShowAddUserModal(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser}>
              <div className="modal-body enhanced">
                {/* Section 1: Informations de connexion */}
                <div className="form-section enhanced">
                  <div className="section-title">
                    <div className="title-icon">
                      <Key size={18} />
                    </div>
                    <div>
                      <h3>Informations de connexion</h3>
                      <p>Identifiants permettant à l'utilisateur d'accéder à la plateforme</p>
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-field full-width">
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
                  </div>

                  <div className="form-row">
                    <div className="form-field full-width">
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
                      {formData.password && (
                        <div className="password-strength-mini">
                          <div className="strength-bar-mini">
                            <div 
                              className="strength-bar-fill-mini" 
                              style={{ 
                                width: `${Math.min(100, formData.password.length * 16)}%`,
                                background: formData.password.length < 4 ? '#ef4444' : 
                                           formData.password.length < 6 ? '#f59e0b' : '#10b981'
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 2: Informations professionnelles */}
                <div className="form-section enhanced">
                  <div className="section-title">
                    <div className="title-icon">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <h3>Informations professionnelles</h3>
                      <p>Définissez le rôle et les informations de l'utilisateur</p>
                    </div>
                  </div>

                  <div className="form-row two-cols">
                    <div className="form-field">
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

                    <div className="form-field">
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
                </div>

                {/* Section 3: Note */}
                <div className="form-note">
                  <Info size={14} />
                  <span>Email de confirmation envoyé après création</span>
                </div>
              </div>

              <div className="modal-footer enhanced">
                <button type="button" className="btn-cancel" onClick={() => setShowAddUserModal(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn-submit">
                  <UserPlus size={16} />
                  Créer l'utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;                                                           