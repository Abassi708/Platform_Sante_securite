// frontend/components/visites/GestionVisitesPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, Users, Calendar, Clock, User, FileText, CheckCircle, XCircle,
  AlertCircle, Info, Plus, RefreshCw, ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight, Search, Filter, Eye, Edit,
  Trash2, Save, X, Award, AlertTriangle, MapPin, Briefcase,
  Stethoscope, Activity
} from 'lucide-react';
import '../../styles/GestionVisitesPage.css';

const GestionVisitesPage = () => {
  const [loading, setLoading] = useState(true);
  const [visites, setVisites] = useState([]);
  const [agents, setAgents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    aptes: 0,
    reserves: 0,
    inaptes: 0,
    parType: [],
    parResultat: [],
    planningSemaine: 0,
    parMois: Array(12).fill(0)
  });
  const [notification, setNotification] = useState({ show: false, type: 'info', title: '', message: '' });

  // ========== ÉTATS POUR LE FORMULAIRE ==========
  const [showForm, setShowForm] = useState(false);
  const [selectedVisite, setSelectedVisite] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    matricule_agent: '',
    date_visite: '',
    heure_visite: '09:00:00',
    type_visite: 'Reclassement',
    motif: '',
    medecin: 'Dr. Mahmoud Khelifi'
  });
  
  // ========== ÉTATS POUR LE CALENDRIER INTELLIGENT ==========
  const [joursDisponibles, setJoursDisponibles] = useState([]);
  const [creneauxDisponibles, setCreneauxDisponibles] = useState([]);
  const [loadingCreneaux, setLoadingCreneaux] = useState(false);
  const [isLoadingJours, setIsLoadingJours] = useState(false);
  const [moisActuel, setMoisActuel] = useState(new Date().getMonth());
  const [anneeActuelle, setAnneeActuelle] = useState(new Date().getFullYear());
  
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [checkingSlot, setCheckingSlot] = useState(false);
  const [visiteHasActions, setVisiteHasActions] = useState({});

  // ========== ÉTATS POUR LES FILTRES ==========
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    resultat: 'all',
    dateDebut: '',
    dateFin: '',
    agent: 'all'
  });
  const [showFilters, setShowFilters] = useState(false);

  // ========== PAGINATION ==========
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  // ========== CHARGEMENT DES DONNÉES ==========
  useEffect(() => {
    chargerDonnees();
  }, []);

  useEffect(() => {
    fetchVisites();
  }, [filters]);

  // Effet pour charger les jours disponibles quand l'agent change ou le mois change
  useEffect(() => {
    if (showForm && formData.matricule_agent) {
      chargerJoursDisponibles(moisActuel, anneeActuelle);
    }
  }, [showForm, formData.matricule_agent, moisActuel, anneeActuelle]);

  // Effet pour charger les créneaux disponibles quand la date change
  useEffect(() => {
    if (formData.date_visite) {
      chargerCreneauxDisponibles(formData.date_visite);
    } else {
      setCreneauxDisponibles([]);
    }
  }, [formData.date_visite, formData.matricule_agent, editMode]);

  // ========== FONCTIONS DE CHARGEMENT ==========
  const chargerDonnees = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAgents(),
        fetchVisites(),
        fetchStats()
      ]);
    } catch (error) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setAgents(data.agents);
    } catch (err) {
      console.error('Erreur chargement agents:', err);
    }
  };

  const checkHasActions = async (matricule_visite) => {
    if (!matricule_visite) return false;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/visites/${matricule_visite}/has-actions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      return data.hasActions === true;
    } catch (err) {
      return false;
    }
  };

  const fetchVisites = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_API_URL}/api/visites?limit=1000`;

      if (filters.search) url += `&search=${encodeURIComponent(filters.search)}`;
      if (filters.type !== 'all') url += `&type=${encodeURIComponent(filters.type)}`;
      if (filters.resultat !== 'all') url += `&resultat=${encodeURIComponent(filters.resultat)}`;
      if (filters.dateDebut && filters.dateFin) {
        url += `&dateDebut=${filters.dateDebut}&dateFin=${filters.dateFin}`;
      }
      if (filters.agent !== 'all') url += `&agentId=${filters.agent}`;

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        const visitesAvecActions = await Promise.all(
          (data.visites || []).map(async (visite) => {
            const hasActions = await checkHasActions(visite.matricule_visite);
            return { ...visite, hasActions };
          })
        );
        setVisites(visitesAvecActions);
        setCurrentPage(1);
      }
    } catch (err) {
      console.error('Erreur chargement visites:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/visites/stats?source=FORMULAIRE`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success && data.stats) {
        setStats({
          total: data.stats.total || 0,
          aptes: data.stats.aptes || 0,
          reserves: data.stats.reserves || 0,
          inaptes: data.stats.inaptes || 0,
          parType: data.stats.parType || [],
          parResultat: data.stats.parResultat || [],
          planningSemaine: data.stats.planningSemaine || 0,
          parMois: data.stats.parMois || Array(12).fill(0)
        });
      }
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  };

  // ========== CALENDRIER INTELLIGENT ==========
  const chargerJoursDisponibles = async (mois, annee) => {
    if (!formData.matricule_agent) {
      console.log('⚠️ Aucun agent sélectionné');
      return;
    }
    
    if (isLoadingJours) {
      console.log('⏳ Déjà en chargement...');
      return;
    }
    
    setIsLoadingJours(true);
    
    try {
      const token = localStorage.getItem('token');
      // mois + 1 car l'API attend 1-12
      const url = `${process.env.REACT_APP_API_URL}/api/creneaux/jours-disponibles?mois=${mois + 1}&annee=${annee}&matricule_agent=${formData.matricule_agent}`;
      console.log('📡 URL appelée:', url);
      
      const response = await fetch(url, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const data = await response.json();
      console.log('📥 Réponse reçue:', data);
      
      if (data.success) {
        console.log('✅ Jours disponibles:', data.jours.length);
        setJoursDisponibles(data.jours);
      } else {
        console.error('❌ Erreur API:', data.message);
      }
    } catch (err) {
      console.error('❌ Erreur chargement jours:', err);
    } finally {
      setIsLoadingJours(false);
    }
  };

  const chargerCreneauxDisponibles = async (date) => {
    if (!date) {
      setCreneauxDisponibles([]);
      return;
    }
    
    setLoadingCreneaux(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_API_URL}/api/creneaux/creneaux-disponibles?date=${date}&matricule_agent=${formData.matricule_agent}`;
      if (editMode && selectedVisite) {
        url += `&id_planning_exclu=${selectedVisite.id_planning}`;
      }
      console.log('📡 URL créneaux:', url);
      
      const response = await fetch(url, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const data = await response.json();
      console.log('📥 Créneaux reçus:', data);
      
      if (data.success) {
        setCreneauxDisponibles(data.creneaux);
        
        const premierDispo = data.creneaux.find(c => c.disponible);
        if (premierDispo && !formData.heure_visite) {
          setFormData(prev => ({ ...prev, heure_visite: premierDispo.heure }));
        }
      }
    } catch (err) {
      console.error('❌ Erreur chargement créneaux:', err);
    } finally {
      setLoadingCreneaux(false);
    }
  };

  const handleMoisPrecedent = () => {
    let newMois = moisActuel - 1;
    let newAnnee = anneeActuelle;
    if (newMois < 0) {
      newMois = 11;
      newAnnee--;
    }
    setMoisActuel(newMois);
    setAnneeActuelle(newAnnee);
  };

  const handleMoisSuivant = () => {
    let newMois = moisActuel + 1;
    let newAnnee = anneeActuelle;
    if (newMois > 11) {
      newMois = 0;
      newAnnee++;
    }
    setMoisActuel(newMois);
    setAnneeActuelle(newAnnee);
  };

  const getJourTitle = (jour) => {
    if (jour.creneauxDisponibles === 1) return `${jour.creneauxDisponibles} créneau disponible`;
    return `${jour.creneauxDisponibles} créneaux disponibles`;
  };

  // ========== FONCTIONS DE VALIDATION ==========
  const verifierConflitCreneau = async (date, heure) => {
    try {
      const token = localStorage.getItem('token');
      const heureComplete = heure.includes(':') && heure.length === 8 ? heure : `${heure}:00`;
      const url = `${process.env.REACT_APP_API_URL}/api/planning/verifier-creneau?date=${date}&heure=${heureComplete}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      return data.occupe === true;
    } catch (err) {
      return false;
    }
  };

  const verifierVisiteExistante = async (matricule_agent, date_visite, idPlanningExclu = null) => {
    try {
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_API_URL}/api/planning/verifier-visite-existante?matricule=${matricule_agent}&date=${date_visite}`;
      if (idPlanningExclu) {
        url += `&exclure=${idPlanningExclu}`;
      }
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      return data.existe === true;
    } catch (err) {
      return false;
    }
  };

  const verifierConflitCreneauExclu = async (date, heure, idPlanningExclu) => {
    try {
      const token = localStorage.getItem('token');
      const heureComplete = heure.includes(':') && heure.length === 8 ? heure : `${heure}:00`;
      const url = `${process.env.REACT_APP_API_URL}/api/planning/verifier-disponibilite-creneau?date=${date}&heure=${heureComplete}&id_planning_exclu=${idPlanningExclu}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      return data.disponible === false;
    } catch (err) {
      return false;
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.matricule_agent) errors.matricule_agent = 'Agent requis';
    if (!formData.date_visite) errors.date_visite = 'Date requise';
    if (!formData.heure_visite) errors.heure_visite = 'Heure requise';
    return errors;
  };

  // ========== SOUMISSION ==========
  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Champs obligatoires manquants' });
      return;
    }

    setCheckingSlot(true);
    
    let visiteExistante = false;
    if (editMode && selectedVisite) {
      visiteExistante = await verifierVisiteExistante(formData.matricule_agent, formData.date_visite, selectedVisite.id_planning);
    } else {
      visiteExistante = await verifierVisiteExistante(formData.matricule_agent, formData.date_visite);
    }
    
    if (visiteExistante) {
      setCheckingSlot(false);
      showNotification({ 
        type: 'warning', 
        title: '⚠️ Agent déjà programmé', 
        message: `Cet agent a déjà une visite programmée le ${new Date(formData.date_visite).toLocaleDateString('fr-FR')}.` 
      });
      return;
    }

    let conflit = false;
    if (editMode && selectedVisite) {
      conflit = await verifierConflitCreneauExclu(formData.date_visite, formData.heure_visite, selectedVisite.id_planning);
    } else {
      conflit = await verifierConflitCreneau(formData.date_visite, formData.heure_visite);
    }
    
    setCheckingSlot(false);
    
    if (conflit) {
      showNotification({ 
        type: 'warning', 
        title: '⚠️ Créneau indisponible', 
        message: `Le créneau du ${new Date(formData.date_visite).toLocaleDateString('fr-FR')} à ${formData.heure_visite.substring(0,5)} est déjà occupé.` 
      });
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      let url, method, bodyData;
      
      if (editMode && selectedVisite) {
        url = `${process.env.REACT_APP_API_URL}/api/visites/${selectedVisite.matricule_visite}`;
        method = 'PUT';
        bodyData = {
          date_visite: formData.date_visite,
          heure_visite: formData.heure_visite,
          type_visite: formData.type_visite,
           medecin: formData.medecin
        };
      } else {
        if (formData.type_visite === 'Reclassement') {
          url = `${process.env.REACT_APP_API_URL}/api/planifier-reclassement`;
          method = 'POST';
          bodyData = {
            matricule_agent: formData.matricule_agent,
            date_visite: formData.date_visite,
            heure_visite: formData.heure_visite,
            motif: formData.motif,
             medecin: formData.medecin
          };
        } else {
          url = `${process.env.REACT_APP_API_URL}/api/planifier-embauche`;
          method = 'POST';
          bodyData = {
            matricule_agent: formData.matricule_agent,
            date_visite: formData.date_visite,
            heure_visite: formData.heure_visite,
            motif: formData.motif,
             medecin: formData.medecin
          };
        }
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bodyData)
      });

      const data = await response.json();
      
      if (data.success) {
        showNotification({
          type: 'success',
          title: editMode ? '✅ Modifiée' : '✅ Programmée',
          message: editMode ? 'Visite modifiée avec succès' : 'Visite programmée avec succès'
        });
        setShowForm(false);
        resetForm();
        await chargerDonnees();
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (visite) => {
    setSelectedVisite(visite);
    setEditMode(true);
    setFormData({
      matricule_agent: visite.matricule_agent,
      date_visite: visite.date_visite,
      heure_visite: visite.heure_visite || '09:00:00',
      type_visite: visite.type_visite || 'Reclassement',
      motif: visite.motif_reprogrammation || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      matricule_agent: '',
      date_visite: '',
      heure_visite: '09:00:00',
      type_visite: 'Reclassement',
      motif: ''
    });
    setFormErrors({});
    setSelectedVisite(null);
    setEditMode(false);
    setMoisActuel(new Date().getMonth());
    setAnneeActuelle(new Date().getFullYear());
    setJoursDisponibles([]);
    setCreneauxDisponibles([]);
  };

  const showNotification = ({ type, title, message }) => {
    setNotification({ show: true, type, title, message });
    setTimeout(() => setNotification({ show: false, type: '', title: '', message: '' }), 5000);
  };

  const getAgentNom = (matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    return agent ? `${agent.nom} ${agent.prenom}` : 'Inconnu';
  };

  const getResultatClass = (resultat) => {
    switch(resultat) {
      case 'Apte': return 'apte';
      case 'Apte avec réserves': return 'reserves';
      case 'Inapte temporaire': return 'temporaire';
      case 'Inapte définitif': return 'definitif';
      default: return '';
    }
  };

  const getResultatIcon = (resultat) => {
    switch(resultat) {
      case 'Apte': return <CheckCircle size={14} color="#10b981" />;
      case 'Apte avec réserves': return <AlertCircle size={14} color="#f59e0b" />;
      case 'Inapte temporaire': return <AlertTriangle size={14} color="#f97316" />;
      case 'Inapte définitif': return <XCircle size={14} color="#ef4444" />;
      default: return <Info size={14} />;
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const formatDateTime = (date, time) => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    const heure = time ? time.substring(0,5) : '';
    return `${day}/${month}/${year} ${heure}`;
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentVisites = visites.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(visites.length / itemsPerPage);

  // ========== RENDU ==========
  return (
    <div className="gestion-visites-page">
      {/* NOTIFICATION */}
      {notification.show && (
        <div className={`notification-container ${notification.type}`}>
          <div className="notification-content">
            <div className="notification-icon">
              {notification.type === 'success' && <CheckCircle size={24} />}
              {notification.type === 'error' && <XCircle size={24} />}
              {notification.type === 'warning' && <AlertCircle size={24} />}
              {notification.type === 'info' && <Info size={24} />}
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

      {/* HEADER */}
      <div className="gestion-header">
        <div className="header-left">
          <div className="header-icon">
            <Stethoscope size={28} />
          </div>
          <div className="header-title">
            <h1>Gestion des visites médicales - Reclassement & Embauche</h1>
            <p>Programmation des visites de reclassement et d'embauche</p>
          </div>
        </div>

        <div className="header-right">
          <div className="header-stats">
            <div className="header-stat-item">
              <FileText size={16} />
              <span><strong>{stats.total || 0}</strong> total</span>
            </div>
          </div>

          <button className="btn-icon" onClick={chargerDonnees} title="Actualiser">
            <RefreshCw size={18} />
          </button>

          <button className="btn-primary" onClick={() => {
            resetForm();
            setShowForm(true);
          }}>
            <Plus size={16} /> Programmer une visite
          </button>
        </div>
      </div>

      {/* FILTRES */}
      <div className="filters-section">
        <div className="filters-header">
          <button
            className={`filter-toggle-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} /> Filtres avancés
          </button>

          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Rechercher un agent..."
              value={filters.search}
              onChange={(e) => setFilters({...filters, search: e.target.value})}
            />
          </div>
        </div>

        {showFilters && (
          <div className="filters-panel">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Type de visite</label>
                <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})}>
                  <option value="all">Tous</option>
                  <option value="Reclassement">Reclassement</option>
                  <option value="Embauche">Embauche</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Résultat</label>
                <select value={filters.resultat} onChange={(e) => setFilters({...filters, resultat: e.target.value})}>
                  <option value="all">Tous</option>
                  <option value="Apte">Apte</option>
                  <option value="Apte avec réserves">Apte avec réserves</option>
                  <option value="Inapte temporaire">Inapte temporaire</option>
                  <option value="Inapte définitif">Inapte définitif</option>
                </select>
              </div>

              <div className="filter-group">
                <label>Date début</label>
                <input
                  type="date"
                  value={filters.dateDebut}
                  onChange={(e) => setFilters({...filters, dateDebut: e.target.value})}
                />
              </div>

              <div className="filter-group">
                <label>Date fin</label>
                <input
                  type="date"
                  value={filters.dateFin}
                  onChange={(e) => setFilters({...filters, dateFin: e.target.value})}
                />
              </div>
            </div>

            <div className="filters-actions">
              <button className="btn-secondary" onClick={() => {
                setFilters({
                  search: '', type: 'all', resultat: 'all', dateDebut: '', dateFin: '', agent: 'all'
                });
                fetchVisites();
              }}>
                Réinitialiser
              </button>
              <button className="btn-primary" onClick={fetchVisites}>
                Appliquer les filtres
              </button>
            </div>
          </div>
        )}
      </div>

      {/* STATISTIQUES RAPIDES */}
      <div className="stats-mini-grid">
        <div className="stat-mini-card">
          <div className="stat-mini-icon" style={{ background: '#2563eb20', color: '#2563eb' }}>
            <FileText size={20} />
          </div>
          <div className="stat-mini-content">
            <span className="stat-mini-label">Total visites</span>
            <span className="stat-mini-value">{stats.total}</span>
          </div>
        </div>

        <div className="stat-mini-card">
          <div className="stat-mini-icon" style={{ background: '#10b98120', color: '#10b981' }}>
            <CheckCircle size={20} />
          </div>
          <div className="stat-mini-content">
            <span className="stat-mini-label">Aptes</span>
            <span className="stat-mini-value">{stats.aptes}</span>
          </div>
        </div>

        <div className="stat-mini-card">
          <div className="stat-mini-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}>
            <AlertCircle size={20} />
          </div>
          <div className="stat-mini-content">
            <span className="stat-mini-label">Réserves</span>
            <span className="stat-mini-value">{stats.reserves}</span>
          </div>
        </div>

        <div className="stat-mini-card">
          <div className="stat-mini-icon" style={{ background: '#ef444420', color: '#ef4444' }}>
            <XCircle size={20} />
          </div>
          <div className="stat-mini-content">
            <span className="stat-mini-label">Inaptes</span>
            <span className="stat-mini-value">{stats.inaptes}</span>
          </div>
        </div>
      </div>

      {/* TABLEAU DES VISITES */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des visites...</p>
        </div>
      ) : visites.length === 0 ? (
        <div className="empty-state">
          <Stethoscope size={48} />
          <h3>Aucune visite trouvée</h3>
          <p>Commencez par programmer une visite de reclassement ou d'embauche</p>
          <button className="btn-primary" onClick={() => {
            resetForm();
            setShowForm(true);
          }}>
            <Plus size={16} /> Programmer une visite
          </button>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="visites-table">
              <thead>
                <tr>
                  <th>Date & Heure</th>
                  <th>Agent</th>
                  <th>Type</th>
                  <th>Médecin</th>
                  <th>Résultat</th>
                  <th>Observations</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentVisites.map(visite => (
                  <tr key={visite.matricule_visite}>
                    <td>
                      <div className="date-cell">
                        <Calendar size={12} />
                        {formatDateTime(visite.date_visite, visite.heure_visite)}
                      </div>
                    </td>
                    <td>
                      <div className="agent-cell">
                        <div className="agent-avatar-small">
                          {visite.visiteAgent?.nom?.charAt(0)}{visite.visiteAgent?.prenom?.charAt(0)}
                        </div>
                        <div className="agent-info">
                          <span>{visite.visiteAgent?.nom} {visite.visiteAgent?.prenom}</span>
                          <small>#{visite.matricule_agent}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`type-badge ${visite.type_visite === 'Reclassement' ? 'reclassement' : 'embauche'}`}>
                        {visite.type_visite === 'Reclassement' ? ' Reclassement' : 'Embauche'}
                      </span>
                    </td>
                    <td>
                      <div className="medecin-cell">
                        <User size={12} />
                        {visite.medecin || '-'}
                      </div>
                    </td>
                    <td>
                      <span className={`resultat-badge ${getResultatClass(visite.resultat)}`}>
                        {getResultatIcon(visite.resultat)}
                        {visite.resultat || 'Non défini'}
                      </span>
                    </td>
                    <td>
                      <div className="observation-cell" title={visite.observation}>
                        {visite.observation?.substring(0, 50) || '-'}
                        {visite.observation?.length > 50 && '...'}
                      </div>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className={`action-btn edit ${visite.hasActions ? 'disabled' : ''}`}
                          onClick={() => !visite.hasActions && handleEdit(visite)}
                          title={visite.hasActions ? 'Modification impossible - Une action a déjà été effectuée' : 'Modifier la programmation'}
                          disabled={visite.hasActions}
                        >
                          <Edit size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          {visites.length > 0 && (
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
                Page {currentPage} / {totalPages}
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

      {/* ========== MODAL FORMULAIRE AVEC CALENDRIER INTELLIGENT ========== */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="modal-content large"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="header-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                  <Calendar size={24} />
                </div>
                <h2>{editMode ? 'Modifier la programmation' : 'Programmer une visite'}</h2>
                <button className="modal-close" onClick={() => setShowForm(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
  <div className="modal-body">
    <div className="form-info-banner">
      <Info size={16} />
      <span>Programmation d'une visite de <strong>{formData.type_visite === 'Reclassement' ? 'Reclassement' : 'Embauche'}</strong></span>
    </div>

    <div className="form-grid two-columns">
      {/* Sélection de l'agent */}
      <div className="form-group full-width">
        <label>
          <User size={14} />
          Agent <span className="required">*</span>
        </label>
        <select
          value={formData.matricule_agent}
          onChange={(e) => {
            setFormData({...formData, matricule_agent: e.target.value, date_visite: '', heure_visite: ''});
            setJoursDisponibles([]);
            setCreneauxDisponibles([]);
          }}
          required
        >
          <option value="">Sélectionner un agent</option>
          {agents.map(agent => (
            <option key={agent.matricule_agent} value={agent.matricule_agent}>
              {agent.nom} {agent.prenom} - #{agent.matricule_agent}
            </option>
          ))}
        </select>
      </div>

      {/* Type de visite */}
      <div className="form-group">
        <label>
          <FileText size={14} />
          Type de visite <span className="required">*</span>
        </label>
        <select
          value={formData.type_visite}
          onChange={(e) => setFormData({...formData, type_visite: e.target.value})}
          required
        >
          <option value="Reclassement"> Reclassement</option>
          <option value="Embauche"> Embauche</option>
        </select>
      </div>

<div className="form-group">
  <label>
    <User size={14} />
    Médecin
  </label>
  <div className="medecin-default-box">
    <User size={16} className="medecin-icon" />
    <span className="medecin-name">Dr. Mahmoud Khelifi</span>
    <span className="medecin-badge">Médecin du travail</span>
  </div>
  <input type="hidden" name="medecin" value="Dr. Mahmoud Khelifi" />
  <small className="form-hint">Médecin par défaut - Non modifiable</small>
</div>
                    {/* ========== CALENDRIER INTELLIGENT - JOURS ========== */}
<div className="form-group full-width">
  <label>
    <Calendar size={14} />
    Date <span className="required">*</span>
  </label>
  
  {/* Navigation mois */}
  <div className="mois-navigation">
    <button type="button" onClick={handleMoisPrecedent}>◀</button>
    <span>{new Date(anneeActuelle, moisActuel).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</span>
    <button type="button" onClick={handleMoisSuivant}>▶</button>
  </div>
  
  {/* ✅ Grille des jours - UNIQUEMENT les jours ouvrés avec créneaux > 0 */}
  {!formData.matricule_agent ? (
    <div className="no-jours-disponibles">
      <AlertCircle size={16} />
      <span>Sélectionnez d'abord un agent</span>
    </div>
  ) : joursDisponibles.filter(jour => jour.creneauxDisponibles > 0).length === 0 ? (
    <div className="no-jours-disponibles">
      <AlertCircle size={16} />
      <span>Aucun jour ouvré disponible avec créneaux libres pour ce mois</span>
    </div>
  ) : (
    <div className="calendrier-jours">
      {joursDisponibles
        .filter(jour => jour.creneauxDisponibles > 0) // ✅ Filtrer les jours sans créneaux
        .map(jour => {
          // Parser la date sans décalage horaire
          const [year, month, day] = jour.date.split('-');
          const jourNum = parseInt(day);
          const dateObj = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
          const jourSemaine = dateObj.getUTCDay();
          
          const estSelectionne = formData.date_visite === jour.date;
          const joursSemaine = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
          
          // ✅ Ne pas afficher Dimanche(0), Lundi(1), Samedi(6)
          if (jourSemaine === 0 || jourSemaine === 1 || jourSemaine === 6) {
            return null;
          }
          
          return (
            <button
              key={jour.date}
              type="button"
              className={`jour-cell ${estSelectionne ? 'selected' : ''}`}
              onClick={() => {
                setFormData({...formData, date_visite: jour.date, heure_visite: ''});
              }}
              title={`${jour.creneauxDisponibles} créneau(x) disponible(s)`}
            >
              <span className="jour-num">{jourNum}</span>
              <span className="jour-semaine">{joursSemaine[jourSemaine]}</span>
              <span className="creneaux-count">{jour.creneauxDisponibles} créneau(x)</span>
            </button>
          );
        })}
    </div>
  )}
</div>

                    {/* ========== CALENDRIER INTELLIGENT - CRÉNEAUX ========== */}
                    <div className="form-group">
                      <label>
                        <Clock size={14} />
                        Heure <span className="required">*</span>
                      </label>
                      {!formData.date_visite ? (
                        <div className="info-message">
                          <Info size={14} />
                          <span>Sélectionnez une date d'abord</span>
                        </div>
                      ) : loadingCreneaux ? (
                        <div className="loading-creneaux">Chargement des créneaux...</div>
                      ) : (
                        <div className="creneaux-grid">
                          {creneauxDisponibles.map(creneau => (
                            <button
                              key={creneau.heure}
                              type="button"
                              className={`creneau-cell ${creneau.disponible ? 'disponible' : 'indisponible'} ${formData.heure_visite === creneau.heure ? 'selected' : ''}`}
                              onClick={() => {
                                if (creneau.disponible) {
                                  setFormData({...formData, heure_visite: creneau.heure});
                                }
                              }}
                              disabled={!creneau.disponible}
                              title={creneau.message}
                            >
                              {creneau.heure_affichage}
                              {creneau.disponible && formData.heure_visite === creneau.heure && <span className="check-icon">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      {!loadingCreneaux && formData.date_visite && creneauxDisponibles.filter(c => c.disponible).length === 0 && (
                        <div className="no-creneaux-disponibles">
                          <AlertCircle size={14} />
                          <span>Aucun créneau disponible pour cette date</span>
                        </div>
                      )}
                    </div>

                    {/* Motif (optionnel) */}
                    <div className="form-group full-width">
                      <label>
                        <Info size={14} />
                        Motif (optionnel)
                      </label>
                      <textarea
                        rows="2"
                        value={formData.motif}
                        onChange={(e) => setFormData({...formData, motif: e.target.value})}
                        placeholder="Motif de la programmation..."
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving || checkingSlot || !formData.heure_visite}>
                    {checkingSlot ? (
                      <><span className="spinner-small"></span> Vérification créneau...</>
                    ) : saving ? (
                      <><span className="spinner-small"></span> Enregistrement...</>
                    ) : (
                      <><Save size={16} /> {editMode ? 'Modifier' : 'Programmer'}</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GestionVisitesPage;