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
import AgentSearchInput from '../common/AgentSearchInput';
import '../../styles/GestionVisitesPage.css';

const GestionVisitesPage = () => {
  const [gvp_loading, setGvp_loading] = useState(true);
  const [gvp_visites, setGvp_visites] = useState([]);
  const [gvp_agents, setGvp_agents] = useState([]);
  const [gvp_stats, setGvp_stats] = useState({
    total: 0,
    aptes: 0,
    reserves: 0,
    inaptes: 0,
    modifications: 0,
    parType: [],
    parResultat: [],
    planningSemaine: 0,
    parMois: Array(12).fill(0)
  });
  const [gvp_notification, setGvp_notification] = useState({ show: false, type: 'info', title: '', message: '' });

  // ========== ÉTATS POUR LE FORMULAIRE ==========
  const [gvp_showForm, setGvp_showForm] = useState(false);
  const [gvp_selectedVisite, setGvp_selectedVisite] = useState(null);
  const [gvp_editMode, setGvp_editMode] = useState(false);
  const [gvp_formData, setGvp_formData] = useState({
    matricule_agent: '',
    date_visite: '',
    heure_visite: '09:00:00',
    type_visite: 'Reclassement',
    motif: '',
    medecin: 'Dr. Mahmoud Khelifi'
  });
  
  // ========== ÉTATS POUR LE CALENDRIER INTELLIGENT ==========
  const [gvp_joursDisponibles, setGvp_joursDisponibles] = useState([]);
  const [gvp_creneauxDisponibles, setGvp_creneauxDisponibles] = useState([]);
  const [gvp_loadingCreneaux, setGvp_loadingCreneaux] = useState(false);
  const [gvp_isLoadingJours, setGvp_isLoadingJours] = useState(false);
  const [gvp_moisActuel, setGvp_moisActuel] = useState(new Date().getMonth());
  const [gvp_anneeActuelle, setGvp_anneeActuelle] = useState(new Date().getFullYear());
  
  const [gvp_formErrors, setGvp_formErrors] = useState({});
  const [gvp_saving, setGvp_saving] = useState(false);
  const [gvp_checkingSlot, setGvp_checkingSlot] = useState(false);
  const [gvp_visiteHasActions, setGvp_visiteHasActions] = useState({});

  const [gvp_nouvelleDate, setGvp_nouvelleDate] = useState('');
  const [gvp_nouvelleHeure, setGvp_nouvelleHeure] = useState('');

  // ========== ÉTATS POUR LES FILTRES ==========
  const [gvp_filters, setGvp_filters] = useState({
    search: '',
    type: 'all',
    resultat: 'all',
    dateDebut: '',
    dateFin: '',
    agent: 'all'
  });
  const [gvp_moisFiltre, setGvp_moisFiltre] = useState('all');
  const [gvp_anneeFiltre, setGvp_anneeFiltre] = useState(new Date().getFullYear());
  const [gvp_showFilters, setGvp_showFilters] = useState(false);

  // ========== PAGINATION ==========
  const [gvp_currentPage, setGvp_currentPage] = useState(1);
  const [gvp_itemsPerPage] = useState(15);

  // ========== CHARGEMENT DES DONNÉES ==========
  useEffect(() => {
    gvp_chargerDonnees();
  }, []);

  useEffect(() => {
    gvp_fetchVisites();
  }, [gvp_filters, gvp_moisFiltre, gvp_anneeFiltre]);

  // Effet pour charger les jours disponibles quand l'agent change ou le mois change
  useEffect(() => {
    if (gvp_showForm && gvp_formData.matricule_agent) {
      gvp_chargerJoursDisponibles(gvp_moisActuel, gvp_anneeActuelle);
    }
  }, [gvp_showForm, gvp_formData.matricule_agent, gvp_moisActuel, gvp_anneeActuelle]);

  // Effet pour charger les créneaux disponibles quand la date change
  useEffect(() => {
    if (gvp_formData.date_visite) {
      gvp_chargerCreneauxDisponibles(gvp_formData.date_visite);
    } else {
      setGvp_creneauxDisponibles([]);
    }
  }, [gvp_formData.date_visite, gvp_formData.matricule_agent, gvp_editMode]);

    useEffect(() => {
    const handleRefreshVisites = () => {
      console.log('🔄 Rafraîchissement des visites manuelles');
      gvp_fetchVisites();
    };
    
    window.addEventListener('refresh-visites-manuelles', handleRefreshVisites);
    return () => window.removeEventListener('refresh-visites-manuelles', handleRefreshVisites);
  }, []);

  // ========== FONCTIONS DE CHARGEMENT ==========
  const gvp_chargerDonnees = async () => {
    setGvp_loading(true);
    try {
      await Promise.all([
        gvp_fetchAgents(),
      ]);
    } catch (error) {
      gvp_showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur de chargement' });
    } finally {
      setGvp_loading(false);
    }
  };

  const gvp_fetchAgents = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setGvp_agents(data.agents);
    } catch (err) {
      console.error('Erreur chargement agents:', err);
    }
  };

  const gvp_checkHasActions = async (matricule_visite) => {
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

const gvp_fetchVisites = async () => {
  try {
    const token = localStorage.getItem('token');
    let url = `${process.env.REACT_APP_API_URL}/api/visites?limit=2000&onlyManual=true`;

    if (gvp_filters.search) url += `&search=${encodeURIComponent(gvp_filters.search)}`;
    if (gvp_filters.type !== 'all') url += `&type=${encodeURIComponent(gvp_filters.type)}`;
    if (gvp_filters.resultat !== 'all') url += `&resultat=${encodeURIComponent(gvp_filters.resultat)}`;
    
    if (gvp_moisFiltre !== 'all' && gvp_anneeFiltre) {
      const dateDebut = `${gvp_anneeFiltre}-${String(gvp_moisFiltre).padStart(2, '0')}-01`;
      const dernierJour = new Date(gvp_anneeFiltre, gvp_moisFiltre, 0).getDate();
      const dateFin = `${gvp_anneeFiltre}-${String(gvp_moisFiltre).padStart(2, '0')}-${dernierJour}`;
      url += `&dateDebut=${dateDebut}&dateFin=${dateFin}`;
    }
    
    if (gvp_filters.agent && gvp_filters.agent !== 'all' && gvp_filters.agent !== '') {
  url += `&agentId=${gvp_filters.agent}`;
}

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    
    if (data.success) {
      let visitesData = data.visites || [];
      
      // ✅ PRIORISER les lignes avec type_action = 'EFFECTUEE'
      const visitesMap = new Map();
      
      for (const visite of visitesData) {
        const id = visite.id_planning || visite.matricule_visite;
        const existing = visitesMap.get(id);
        
        // Si pas d'existant, on ajoute
        if (!existing) {
          visitesMap.set(id, visite);
        } 
        // Si l'existant n'a PAS de résultat mais la nouvelle SI, on remplace
        else if ((!existing.resultat || existing.resultat === '') && visite.resultat && visite.resultat !== '') {
          visitesMap.set(id, visite);
        }
        // Si l'existant n'est pas EFFECTUEE mais la nouvelle OUI, on remplace
        else if (existing.type_action !== 'EFFECTUEE' && visite.type_action === 'EFFECTUEE') {
          visitesMap.set(id, visite);
        }
      }
      
      const visitesUniques = Array.from(visitesMap.values());
      
      visitesUniques.sort((a, b) => new Date(b.date_visite) - new Date(a.date_visite));
      
      console.log('🔍 Visites finales (après déduplication):', visitesUniques.map(v => ({
        id: v.id_planning,
        resultat: v.resultat,
        type_action: v.type_action,
        date_visite: v.date_visite
      })));
      
      setGvp_visites(visitesUniques);
      
      // Calculer les stats
      const visitesEffectuees = visitesUniques.filter(v => v.type_action === 'EFFECTUEE' || (v.resultat && v.resultat !== ''));
      const aptes = visitesEffectuees.filter(v => v.resultat === 'Apte').length;
      const inaptes = visitesEffectuees.filter(v => 
        v.resultat === 'Inapte temporaire' || v.resultat === 'Inapte définitif'
      ).length;
      const modifications = visitesUniques.filter(v => v.type_action === 'MODIFICATION').length;
      
      setGvp_stats({
        total: visitesUniques.length,
        aptes: aptes,
        inaptes: inaptes,
        modifications: modifications
      });
      
      setGvp_currentPage(1);
    }
  } catch (err) {
    console.error('Erreur chargement visites:', err);
  }
};

  // ========== CALENDRIER INTELLIGENT ==========
  const gvp_chargerJoursDisponibles = async (mois, annee) => {
    if (!gvp_formData.matricule_agent) {
      console.log('⚠️ Aucun agent sélectionné');
      return;
    }
    
    if (gvp_isLoadingJours) {
      console.log('⏳ Déjà en chargement...');
      return;
    }
    
    setGvp_isLoadingJours(true);
    
    try {
      const token = localStorage.getItem('token');
      const url = `${process.env.REACT_APP_API_URL}/api/creneaux/jours-disponibles?mois=${mois + 1}&annee=${annee}&matricule_agent=${gvp_formData.matricule_agent}`;
      console.log('📡 URL appelée:', url);
      
      const response = await fetch(url, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const data = await response.json();
      console.log('📥 Réponse reçue:', data);
      
      if (data.success) {
        console.log('✅ Jours disponibles:', data.jours.length);
        setGvp_joursDisponibles(data.jours);
      } else {
        console.error('❌ Erreur API:', data.message);
      }
    } catch (err) {
      console.error('❌ Erreur chargement jours:', err);
    } finally {
      setGvp_isLoadingJours(false);
    }
  };

  const gvp_chargerCreneauxDisponibles = async (date) => {
    if (!date) {
      setGvp_creneauxDisponibles([]);
      return;
    }
    
    setGvp_loadingCreneaux(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_API_URL}/api/creneaux/creneaux-disponibles?date=${date}&matricule_agent=${gvp_formData.matricule_agent}`;
      if (gvp_editMode && gvp_selectedVisite) {
        url += `&id_planning_exclu=${gvp_selectedVisite.id_planning}`;
      }
      console.log('📡 URL créneaux:', url);
      
      const response = await fetch(url, { 
        headers: { 'Authorization': `Bearer ${token}` } 
      });
      const data = await response.json();
      console.log('📥 Créneaux reçus:', data);
      
      if (data.success) {
        setGvp_creneauxDisponibles(data.creneaux);
        
        const premierDispo = data.creneaux.find(c => c.disponible);
        if (premierDispo && !gvp_formData.heure_visite) {
          setGvp_formData(prev => ({ ...prev, heure_visite: premierDispo.heure }));
        }
      }
    } catch (err) {
      console.error('❌ Erreur chargement créneaux:', err);
    } finally {
      setGvp_loadingCreneaux(false);
    }
  };

  const gvp_handleMoisPrecedent = () => {
    let newMois = gvp_moisActuel - 1;
    let newAnnee = gvp_anneeActuelle;
    if (newMois < 0) {
      newMois = 11;
      newAnnee--;
    }
    setGvp_moisActuel(newMois);
    setGvp_anneeActuelle(newAnnee);
  };

  const gvp_handleMoisSuivant = () => {
    let newMois = gvp_moisActuel + 1;
    let newAnnee = gvp_anneeActuelle;
    if (newMois > 11) {
      newMois = 0;
      newAnnee++;
    }
    setGvp_moisActuel(newMois);
    setGvp_anneeActuelle(newAnnee);
  };

  const gvp_getJourTitle = (jour) => {
    if (jour.creneauxDisponibles === 1) return `${jour.creneauxDisponibles} créneau disponible`;
    return `${jour.creneauxDisponibles} créneaux disponibles`;
  };

  // ========== FONCTIONS DE VALIDATION ==========
  const gvp_verifierConflitCreneau = async (date, heure) => {
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

  const gvp_verifierVisiteExistante = async (matricule_agent, date_visite, idPlanningExclu = null) => {
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

  const gvp_verifierConflitCreneauExclu = async (date, heure, idPlanningExclu) => {
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

  const gvp_validateForm = () => {
    const errors = {};
    if (!gvp_formData.matricule_agent) errors.matricule_agent = 'Agent requis';
    if (!gvp_formData.date_visite) errors.date_visite = 'Date requise';
    if (!gvp_formData.heure_visite) errors.heure_visite = 'Heure requise';
    return errors;
  };

  // ========== MODIFIER UNE VISITE ==========
const gvp_handleEdit = async (visite) => {
  console.log('📝 Tentative de modification de la visite:', visite);
  
  // ✅ VÉRIFIER SI UNE ACTION A DÉJÀ ÉTÉ EFFECTUÉE
  if (visite.type_action === 'EFFECTUEE') {
    gvp_showNotification({ 
      type: 'warning', 
      title: '⚠️ Modification impossible', 
      message: 'Cette visite a déjà été EFFECTUÉE et ne peut plus être modifiée.',
      duration: 5000
    });
    return;
  }
  
  if (visite.type_action === 'REPROGRAMMEE') {
    gvp_showNotification({ 
      type: 'warning', 
      title: '⚠️ Modification impossible', 
      message: 'Cette visite a déjà été REPROGRAMMÉE et ne peut plus être modifiée.',
      duration: 5000
    });
    return;
  }
  
  if (visite.type_action === 'ANNULEE') {
    gvp_showNotification({ 
      type: 'warning', 
      title: '⚠️ Modification impossible', 
      message: 'Cette visite a déjà été ANNULÉE et ne peut plus être modifiée.',
      duration: 5000
    });
    return;
  }
  
  if (visite.type_action === 'REAFFECTEE') {
    gvp_showNotification({ 
      type: 'warning', 
      title: '⚠️ Modification impossible', 
      message: 'Cette visite a déjà été RÉAFFECTÉE et ne peut plus être modifiée.',
      duration: 5000
    });
    return;
  }
  
  // Vérifier si la visite a un résultat (donc effectuée)
  if (visite.resultat && visite.resultat !== '' && visite.type_action !== 'MODIFICATION') {
    gvp_showNotification({ 
      type: 'warning', 
      title: '⚠️ Modification impossible', 
      message: `Cette visite a déjà été effectuée avec le résultat "${visite.resultat}" et ne peut plus être modifiée.`,
      duration: 5000
    });
    return;
  }
  
  if (visite.source !== 'FORMULAIRE' && visite.type_action !== 'SAISIE_MANUELLE' && visite.source_originale !== 'manuel') {
    gvp_showNotification({ 
      type: 'warning', 
      title: '⚠️ Modification impossible', 
      message: 'Cette visite provient du planning automatique et ne peut pas être modifiée.',
      duration: 5000
    });
    return;
  }
  
  // Vérifier si la visite a déjà une action (via historique)
  const hasActions = await gvp_checkHasActions(visite.matricule_visite);
  if (hasActions) {
    gvp_showNotification({ 
      type: 'warning', 
      title: '⚠️ Modification impossible', 
      message: 'Cette visite a déjà une action associée et ne peut plus être modifiée.',
      duration: 5000
    });
    return;
  }
  
  // Si tout est OK, on continue
  setGvp_selectedVisite(visite);
  setGvp_editMode(true);
  
  setGvp_formData({
    matricule_agent: visite.matricule_agent,
    date_visite: visite.date_visite,
    heure_visite: visite.heure_visite || '09:00:00',
    type_visite: visite.type_visite || 'Périodique',
    motif: visite.motif_reprogrammation || visite.motif_action || '',
    medecin: visite.medecin || 'Dr. Mahmoud Khelifi',
    observation: visite.observation || ''
  });
  
  setGvp_showForm(true);
  
  if (visite.date_visite) {
    gvp_chargerCreneauxDisponibles(visite.date_visite);
  }
};
  
  // ========== SOUMISSION ==========
  const gvp_handleSubmit = async (e) => {
    e.preventDefault();

    const errors = gvp_validateForm();
    if (Object.keys(errors).length > 0) {
      setGvp_formErrors(errors);
      gvp_showNotification({ type: 'error', title: '❌ Erreur', message: 'Champs obligatoires manquants' });
      return;
    }

    setGvp_checkingSlot(true);
    
    let visiteExistante = false;
    if (gvp_editMode && gvp_selectedVisite) {
      visiteExistante = await gvp_verifierVisiteExistante(gvp_formData.matricule_agent, gvp_formData.date_visite, gvp_selectedVisite.id_planning);
    } else {
      visiteExistante = await gvp_verifierVisiteExistante(gvp_formData.matricule_agent, gvp_formData.date_visite);
    }
    
    if (visiteExistante) {
      setGvp_checkingSlot(false);
      gvp_showNotification({ 
        type: 'warning', 
        title: '⚠️ Agent déjà programmé', 
        message: `Cet agent a déjà une visite programmée le ${new Date(gvp_formData.date_visite).toLocaleDateString('fr-FR')}.` 
      });
      return;
    }

    let conflit = false;
    if (gvp_editMode && gvp_selectedVisite) {
      conflit = await gvp_verifierConflitCreneauExclu(gvp_formData.date_visite, gvp_formData.heure_visite, gvp_selectedVisite.id_planning);
    } else {
      conflit = await gvp_verifierConflitCreneau(gvp_formData.date_visite, gvp_formData.heure_visite);
    }
    
    setGvp_checkingSlot(false);
    
    if (conflit) {
      gvp_showNotification({ 
        type: 'warning', 
        title: '⚠️ Créneau indisponible', 
        message: `Le créneau du ${new Date(gvp_formData.date_visite).toLocaleDateString('fr-FR')} à ${gvp_formData.heure_visite.substring(0,5)} est déjà occupé.` 
      });
      return;
    }

    setGvp_saving(true);
    try {
      const token = localStorage.getItem('token');
      let url, method, bodyData;
      
      if (gvp_editMode && gvp_selectedVisite) {
        url = `${process.env.REACT_APP_API_URL}/api/visites/${gvp_selectedVisite.matricule_visite}`;
        method = 'PUT';
        bodyData = {
          date_visite: gvp_formData.date_visite,
          heure_visite: gvp_formData.heure_visite,
          type_visite: gvp_formData.type_visite,
          medecin: gvp_formData.medecin
        };
      } else {
        if (gvp_formData.type_visite === 'Reclassement') {
          url = `${process.env.REACT_APP_API_URL}/api/planifier-reclassement`;
          method = 'POST';
          bodyData = {
            matricule_agent: gvp_formData.matricule_agent,
            date_visite: gvp_formData.date_visite,
            heure_visite: gvp_formData.heure_visite,
            motif: gvp_formData.motif,
            medecin: gvp_formData.medecin
          };
        } else if (gvp_formData.type_visite === 'Embauche') {
          url = `${process.env.REACT_APP_API_URL}/api/planifier-embauche`;
          method = 'POST';
          bodyData = {
            matricule_agent: gvp_formData.matricule_agent,
            date_visite: gvp_formData.date_visite,
            heure_visite: gvp_formData.heure_visite,
            motif: gvp_formData.motif,
            medecin: gvp_formData.medecin
          };
        } else {
          url = `${process.env.REACT_APP_API_URL}/api/visites`;
          method = 'POST';
          bodyData = {
            matricule_agent: gvp_formData.matricule_agent,
            date_visite: gvp_formData.date_visite,
            heure_visite: gvp_formData.heure_visite,
            type_visite: gvp_formData.type_visite || 'Périodique',
            motif: gvp_formData.motif,
            medecin: gvp_formData.medecin
          };
        }
      }

      console.log('📤 Envoi requête:', { url, method, bodyData });

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
        gvp_showNotification({
          type: 'success',
          title: gvp_selectedVisite ? '✅ Modifiée' : '✅ Programmée',
          message: gvp_selectedVisite ? 'Visite modifiée avec succès' : 'Visite programmée avec succès'
        });
        setGvp_showForm(false);
        gvp_resetForm();
        await gvp_chargerDonnees();
        await gvp_fetchVisites();
        await gvp_fetchAgents();
        window.dispatchEvent(new CustomEvent('refresh-planning'));
        window.dispatchEvent(new CustomEvent('refresh-visites-manuelles'));
        setTimeout(() => {
        gvp_fetchVisites();
      }, 500);
      } else {
        gvp_showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      console.error('Erreur:', err);
      gvp_showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'enregistrement' });
    } finally {
      setGvp_saving(false);
    }
  };

  const gvp_resetForm = () => {
    setGvp_formData({
      matricule_agent: '',
      date_visite: '',
      heure_visite: '09:00:00',
      type_visite: 'Périodique',
      motif: '',
      medecin: 'Dr. Mahmoud Khelifi'
    });
    setGvp_formErrors({});
    setGvp_selectedVisite(null);
    setGvp_editMode(false);
    setGvp_moisActuel(new Date().getMonth());
    setGvp_anneeActuelle(new Date().getFullYear());
    setGvp_joursDisponibles([]);
    setGvp_creneauxDisponibles([]);
  };

  const gvp_showNotification = ({ type, title, message, duration = 5000 }) => {
  // Fermer toute notification existante
  setGvp_notification({ show: false, type: '', title: '', message: '' });
  
  // Petit délai pour s'assurer que l'ancienne est fermée
  setTimeout(() => {
    setGvp_notification({ show: true, type, title, message });
  }, 10);
  
  // Auto-fermeture
  setTimeout(() => {
    setGvp_notification(prev => {
      if (prev.show && prev.message === message) {
        return { show: false, type: '', title: '', message: '' };
      }
      return prev;
    });
  }, duration);
};

  const gvp_getAgentNom = (matricule) => {
    const agent = gvp_agents.find(a => a.matricule_agent === matricule);
    return agent ? `${agent.nom} ${agent.prenom}` : `Agent ${matricule}`;
  };

const gvp_getResultatClass = (resultat) => {
  if (!resultat) return '';
  switch(resultat) {
    case 'Apte': return 'apte';
    case 'Inapte temporaire': return 'temporaire';
    case 'Inapte définitif': return 'definitif';
    default: return '';
  }
};

const gvp_getResultatIcon = (resultat) => {
  if (!resultat) return <Info size={14} />;
  switch(resultat) {
    case 'Apte': return <CheckCircle size={14} color="#10b981" />;
    case 'Inapte temporaire': return <AlertTriangle size={14} color="#f97316" />;
    case 'Inapte définitif': return <XCircle size={14} color="#ef4444" />;
    default: return <Info size={14} />;
  }
};

  const gvp_formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  const gvp_formatDateTime = (date, time) => {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    const heure = time ? time.substring(0,5) : '';
    return `${day}/${month}/${year} ${heure}`;
  };

  const gvp_indexOfLastItem = gvp_currentPage * gvp_itemsPerPage;
  const gvp_indexOfFirstItem = gvp_indexOfLastItem - gvp_itemsPerPage;
  const gvp_currentVisites = gvp_visites.slice(gvp_indexOfFirstItem, gvp_indexOfLastItem);
  const gvp_totalPages = Math.ceil(gvp_visites.length / gvp_itemsPerPage);

  // ========== RENDU ==========
  return (
    <div className="gvp_gestion-visites-page">
{/* NOTIFICATION AVEC STYLE INLINE POUR SÉCURITÉ */}
{gvp_notification.show && (
  <div 
    className={`gvp_notification-container ${gvp_notification.type}`}
    style={{
      position: 'fixed',
      top: '80px',
      right: '20px',
      zIndex: 99999,
      backgroundColor: gvp_notification.type === 'warning' ? '#fffbeb' : 
                      gvp_notification.type === 'error' ? '#fef2f2' : 
                      gvp_notification.type === 'success' ? '#f0fdf4' : '#eff6ff',
      borderLeft: `4px solid ${gvp_notification.type === 'warning' ? '#f59e0b' : 
                                 gvp_notification.type === 'error' ? '#ef4444' : 
                                 gvp_notification.type === 'success' ? '#22c55e' : '#3b82f6'}`,
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      minWidth: '350px',
      maxWidth: '450px',
      padding: '16px'
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ 
        color: gvp_notification.type === 'warning' ? '#f59e0b' : 
               gvp_notification.type === 'error' ? '#ef4444' : 
               gvp_notification.type === 'success' ? '#22c55e' : '#3b82f6'
      }}>
        {gvp_notification.type === 'success' && <CheckCircle size={24} />}
        {gvp_notification.type === 'error' && <XCircle size={24} />}
        {gvp_notification.type === 'warning' && <AlertCircle size={24} />}
        {gvp_notification.type === 'info' && <Info size={24} />}
      </div>
      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 'bold' }}>{gvp_notification.title}</h4>
        <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>{gvp_notification.message}</p>
      </div>
      <button 
        onClick={() => setGvp_notification({ show: false, type: '', title: '', message: '' })}
        style={{ 
          background: 'none', 
          border: 'none', 
          cursor: 'pointer',
          padding: '4px',
          borderRadius: '4px',
          color: '#94a3b8'
        }}
      >
        <X size={16} />
      </button>
    </div>
  </div>
)}

      {/* HEADER */}
      <div className="gvp_gestion-header">
        <div className="gvp_header-left">
          <div className="gvp_header-icon">
            <Stethoscope size={28} />
          </div>
          <div className="gvp_header-title">
            <h1>Gestion des visites médicales - Reclassement &amp; Embauche</h1>
            <p>Programmation des visites de reclassement et d'embauche (périodique pour les cas particulières)</p>
          </div>
        </div>

        <div className="gvp_header-right">
          <div className="gvp_header-stats">
            <div className="gvp_header-stat-item">
              <FileText size={16} />
              <span><strong>{gvp_stats.total || 0}</strong> total</span>
            </div>
          </div>

          <button className="gvp_btn-icon" onClick={gvp_chargerDonnees} title="Actualiser">
            <RefreshCw size={18} />
          </button>

          <button className="gvp_btn-primary" onClick={() => {
            gvp_resetForm();
            setGvp_showForm(true);
          }}>
            <Plus size={16} /> Programmer une visite
          </button>
        </div>
      </div>

      {/* FILTRES */}
      <div className="gvp_filters-section">
          <div className="gvp_filter-agent" style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
    <User size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', zIndex: 1, color: '#94a3b8' }} />
    <AgentSearchInput
      value={gvp_filters.agent}
      onChange={(matricule) => {
        setGvp_filters({...gvp_filters, agent: matricule || 'all'});
        setGvp_currentPage(1);
      }}
      onSelect={(agent) => {
        setGvp_filters({...gvp_filters, agent: agent?.matricule_agent || 'all'});
        setGvp_currentPage(1);
      }}
      placeholder="Rechercher un agent par nom, prénom ou matricule..."
      style={{ paddingLeft: '32px' }}
    />
  </div>


        <div className="gvp_filters-header">
          <button
            className={`gvp_filter-toggle-btn ${gvp_showFilters ? 'active' : ''}`}
            onClick={() => setGvp_showFilters(!gvp_showFilters)}
          >
            <Filter size={16} /> Filtres avancés
          </button>
        </div>

        {gvp_showFilters && (
          <div className="gvp_filters-panel">
            <div className="gvp_filters-grid">
              <div className="gvp_filter-group">
                <label>Type de visite</label>
                <select value={gvp_filters.type} onChange={(e) => setGvp_filters({...gvp_filters, type: e.target.value})}>
                  <option value="all">Tous</option>
                  <option value="Périodique">Périodique</option>
                  <option value="Reclassement">Reclassement</option>
                  <option value="Embauche">Embauche</option>
                </select>
              </div>

              <div className="gvp_filter-group">
                <label>Résultat</label>
                <select value={gvp_filters.resultat} onChange={(e) => setGvp_filters({...gvp_filters, resultat: e.target.value})}>
                  <option value="all">Tous</option>
                  <option value="Apte">Apte</option>
                  <option value="Inapte temporaire">Inapte temporaire</option>
                  <option value="Inapte définitif">Inapte définitif</option>
                </select>
              </div>

              <div className="gvp_filter-group">
                <label>Période</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    value={gvp_moisFiltre} 
                    onChange={(e) => {
                      const value = e.target.value;
                      setGvp_moisFiltre(value === 'all' ? 'all' : parseInt(value));
                    }}
                    style={{ flex: 1, padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  >
                    <option value="all">Tous les mois</option>
                    <option value={1}>Janvier</option>
                    <option value={2}>Février</option>
                    <option value={3}>Mars</option>
                    <option value={4}>Avril</option>
                    <option value={5}>Mai</option>
                    <option value={6}>Juin</option>
                    <option value={7}>Juillet</option>
                    <option value={8}>Août</option>
                    <option value={9}>Septembre</option>
                    <option value={10}>Octobre</option>
                    <option value={11}>Novembre</option>
                    <option value={12}>Décembre</option>
                  </select>
                  <input 
                    type="number" 
                    value={gvp_anneeFiltre} 
                    onChange={(e) => setGvp_anneeFiltre(parseInt(e.target.value))}
                    style={{ width: '80px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                    min="2020"
                    max="2030"
                  />
                </div>
              </div>
            </div>

            <div className="gvp_filters-actions">
              <button className="gvp_btn-secondary" onClick={() => {
                setGvp_filters({
                  search: '', 
                  type: 'all', 
                  resultat: 'all', 
                  agent: 'all'
                });
                setGvp_moisFiltre('all');      
                setGvp_anneeFiltre(new Date().getFullYear());  
                gvp_fetchVisites(); 
              }}>
                Réinitialiser
              </button>
              <button className="gvp_btn-primary" onClick={gvp_fetchVisites}>
                Appliquer les filtres
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="gvp_stats-mini-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="gvp_stat-mini-card">
          <div className="gvp_stat-mini-icon" style={{ background: '#2563eb20', color: '#2563eb' }}>
            <FileText size={20} />
          </div>
          <div className="gvp_stat-mini-content">
            <span className="gvp_stat-mini-label">Total visites manuelles</span>
            <span className="gvp_stat-mini-value">{gvp_stats.total || 0}</span>
          </div>
        </div>

        <div className="gvp_stat-mini-card">
          <div className="gvp_stat-mini-icon" style={{ background: '#10b98120', color: '#10b981' }}>
            <CheckCircle size={20} />
          </div>
          <div className="gvp_stat-mini-content">
            <span className="gvp_stat-mini-label">Aptes</span>
            <span className="gvp_stat-mini-value">{gvp_stats.aptes || 0}</span>
          </div>
        </div>

        <div className="gvp_stat-mini-card">
          <div className="gvp_stat-mini-icon" style={{ background: '#ef444420', color: '#ef4444' }}>
            <XCircle size={20} />
          </div>
          <div className="gvp_stat-mini-content">
            <span className="gvp_stat-mini-label">Inaptes</span>
            <span className="gvp_stat-mini-value">{gvp_stats.inaptes || 0}</span>
          </div>
        </div>
      </div>
      
      {/* TABLEAU DES VISITES */}
      {gvp_loading ? (
        <div className="gvp_loading-state">
          <div className="gvp_spinner"></div>
          <p>Chargement des visites...</p>
        </div>
      ) : gvp_visites.length === 0 ? (
        <div className="gvp_empty-state">
          <Stethoscope size={48} />
          <h3>Aucune visite trouvée</h3>
          <p>Commencez par programmer une visite de reclassement ou d'embauche</p>
          <button className="gvp_btn-primary" onClick={() => {
            gvp_resetForm();
            setGvp_showForm(true);
          }}>
            <Plus size={16} /> Programmer une visite
          </button>
        </div>
      ) : (
        <>
        
{/* TABLEAU DES VISITES */}
<div className="gvp_table-container">
  <table className="gvp_visites-table">
    <thead>
      <tr>
        <th>Date & Heure</th>
        <th>Agent</th>
        <th>Type</th>
        <th>Médecin</th>
        <th>Résultat</th>
        <th>Observations</th>
        <th>Modifications</th>
      </tr>
    </thead>
    <tbody>
      {gvp_currentVisites.map((visite) => (
        <tr key={visite.matricule_visite}>
          {/* Date & Heure */}
          <td>{gvp_formatDateTime(visite.date_visite, visite.heure_visite)}</td>
          
          {/* Agent */}
          <td>
            <strong>{visite.visiteAgent?.nom || visite.agent_nom} {visite.visiteAgent?.prenom || visite.agent_prenom}</strong>
            <br/>
            <small>#{visite.matricule_agent}</small>
          </td>
          
          {/* Type */}
          <td>
            {visite.type_visite === 'Périodique' && '📋 Périodique'}
            {visite.type_visite === 'Reclassement' && '📝 Reclassement'}
            {visite.type_visite === 'Embauche' && '👔 Embauche'}
            {!visite.type_visite && '📋 Périodique'}
          </td>
          
          {/* Médecin */}
          <td>{visite.medecin || 'Dr. Mahmoud Khelifi'}</td>
          
          {/* ✅ RÉSULTAT - CORRIGÉ POUR AFFICHER LE RÉSULTAT */}
          <td className="gvp_resultat-cell">
  {visite.type_action === 'EFFECTUEE' || (visite.resultat && visite.resultat !== '') ? (
    <span className={`gvp_resultat-badge ${gvp_getResultatClass(visite.resultat)}`}>
      {gvp_getResultatIcon(visite.resultat)}
      {visite.resultat || 'Non défini'}
    </span>
  ) : (
    <span className="gvp_resultat-badge non-effectue">
      <Clock size={12} /> En attente
    </span>
  )}
</td>
          
          {/* Observations */}
          <td>{visite.observation?.substring(0, 50) || '-'}</td>
          
          {/* ✅ MODIFICATIONS - BOUTON TOUJOURS VISIBLE */}
          <td className="gvp_modifications-cell">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
              {/* Bouton Modifier TOUJOURS VISIBLE */}
              <button 
                className="gvp_action-btn edit" 
                onClick={() => gvp_handleEdit(visite)}
                style={{ 
                  opacity: (visite.resultat && visite.resultat !== '') ? 0.6 : 1,
                  cursor: 'pointer'
                }}
                title={(visite.resultat && visite.resultat !== '') ? `Cette visite a déjà été effectuée avec le résultat "${visite.resultat}"` : 'Modifier la visite'}
              >
                <Edit size={14} /> Modifier
              </button>
              {visite.modifications_count > 0 && (
                <span className="gvp_modifications-badge">📝 {visite.modifications_count} modif(s)</span>
              )}
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>

          {/* PAGINATION */}
          {gvp_visites.length > 0 && (
            <div className="gvp_pagination">
              <button
                className="gvp_pagination-btn"
                onClick={() => setGvp_currentPage(1)}
                disabled={gvp_currentPage === 1}
              >
                <ChevronsLeft size={16} />
              </button>
              <button
                className="gvp_pagination-btn"
                onClick={() => setGvp_currentPage(prev => Math.max(1, prev - 1))}
                disabled={gvp_currentPage === 1}
              >
                <ChevronLeft size={16} />
              </button>

              <span className="gvp_pagination-info">
                Page {gvp_currentPage} / {gvp_totalPages}
              </span>

              <button
                className="gvp_pagination-btn"
                onClick={() => setGvp_currentPage(prev => Math.min(gvp_totalPages, prev + 1))}
                disabled={gvp_currentPage === gvp_totalPages}
              >
                <ChevronRight size={16} />
              </button>
              <button
                className="gvp_pagination-btn"
                onClick={() => setGvp_currentPage(gvp_totalPages)}
                disabled={gvp_currentPage === gvp_totalPages}
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ========== MODAL FORMULAIRE AVEC CALENDRIER INTELLIGENT ========== */}
      <AnimatePresence>
        {gvp_showForm && (
          <motion.div
            className="gvp_modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setGvp_showForm(false)}
          >
            <motion.div
              className="gvp_modal-content large"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="gvp_modal-header">
                <div className="gvp_header-icon" style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                  <Calendar size={24} />
                </div>
                <h2>{gvp_editMode ? 'Modifier la programmation' : 'Programmer une visite'}</h2>
                <button className="gvp_modal-close" onClick={() => setGvp_showForm(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={gvp_handleSubmit}>
                <div className="gvp_modal-body">
                  <div className="gvp_form-info-banner">
                    <Info size={16} />
                    <span>Programmation d'une visite de <strong>{gvp_formData.type_visite === 'Reclassement' ? 'Reclassement' : 'Embauche'}</strong></span>
                  </div>

                  <div className="gvp_form-grid two-columns">
                    {/* Sélection de l'agent */}
                    <div className="gvp_form-group full-width">
                      <label>
                        <User size={14} />
                        Agent <span className="required">*</span>
                      </label>
                      
                      {gvp_editMode ? (
                        <div style={{
                          background: '#f1f5f9',
                          padding: '12px 15px',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0'
                        }}>
                          <strong>{gvp_getAgentNom(gvp_formData.matricule_agent)}</strong>
                          <span style={{ marginLeft: '10px', fontSize: '12px', color: '#64748b' }}>
                            #{gvp_formData.matricule_agent}
                          </span>
                          <input type="hidden" name="matricule_agent" value={gvp_formData.matricule_agent} />
                        </div>
                      ) : (
                        <AgentSearchInput
                          value={gvp_formData.matricule_agent}
  onChange={(matricule) => {
                            setGvp_formData({...gvp_formData, matricule_agent: matricule, date_visite: '', heure_visite: ''});
                            setGvp_joursDisponibles([]);
                            setGvp_creneauxDisponibles([]);
  }}
                          onSelect={(agent) => console.log('Agent sélectionné:', agent)}
                          placeholder="Tapez le nom, prénom ou matricule..."
/>
                      )}
                      {gvp_formErrors.matricule_agent && (
                        <div className="gvp_error-message">{gvp_formErrors.matricule_agent}</div>
                      )}
                    </div>

                    {/* Type de visite */}
                    <div className="gvp_form-group">
                      <label>
                        <FileText size={14} />
                        Type de visite <span className="required">*</span>
                      </label>
                      <select
                        value={gvp_formData.type_visite}
                        onChange={(e) => setGvp_formData({...gvp_formData, type_visite: e.target.value})}
                        required
                      >
                        <option value="Périodique">Périodique</option>
                        <option value="Reclassement">Reclassement</option>
                        <option value="Embauche">Embauche</option>
                      </select>
                    </div>

                    <div className="gvp_form-group">
                      <label>
                        <User size={14} />
                        Médecin
                      </label>
                      <div className="gvp_medecin-default-box">
                        <User size={16} className="gvp_medecin-icon" />
                        <span className="gvp_medecin-name">Dr. Mahmoud Khelifi</span>
                        <span className="gvp_medecin-badge">Médecin du travail</span>
                      </div>
                      <input type="hidden" name="medecin" value="Dr. Mahmoud Khelifi" />
                      <small className="gvp_form-hint">Médecin par défaut - Non modifiable</small>
                    </div>
                    
                    {/* ========== CALENDRIER INTELLIGENT - JOURS ========== */}
                    <div className="gvp_form-group full-width">
                      <label>
                        <Calendar size={14} />
                        Date <span className="required">*</span>
                      </label>
                      
                      {/* Navigation mois */}
                      <div className="gvp_mois-navigation">
                        <button type="button" onClick={gvp_handleMoisPrecedent}>◀</button>
                        <span>{new Date(gvp_anneeActuelle, gvp_moisActuel).toLocaleString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                        <button type="button" onClick={gvp_handleMoisSuivant}>▶</button>
                      </div>
                      
                      {!gvp_formData.matricule_agent ? (
                        <div className="gvp_no-jours-disponibles">
                          <AlertCircle size={16} />
                          <span>Sélectionnez d'abord un agent</span>
                        </div>
                      ) : gvp_joursDisponibles.filter(jour => jour.creneauxDisponibles > 0).length === 0 ? (
                        <div className="gvp_no-jours-disponibles">
                          <AlertCircle size={16} />
                          <span>Aucun jour ouvré disponible avec créneaux libres pour ce mois</span>
                        </div>
                      ) : (
                        <div className="gvp_calendrier-jours">
                          {gvp_joursDisponibles
                            .filter(jour => jour.creneauxDisponibles > 0)
                            .map(jour => {
                              const [year, month, day] = jour.date.split('-');
                              const jourNum = parseInt(day);
                              const dateObj = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
                              const jourSemaine = dateObj.getUTCDay();
                              
                              const estSelectionne = gvp_formData.date_visite === jour.date;
                              const joursSemaine = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
                              
                              if (jourSemaine === 0 || jourSemaine === 1 || jourSemaine === 6) {
                                return null;
                              }
                              
                              return (
                                <button
                                  key={jour.date}
                                  type="button"
                                  className={`gvp_jour-cell ${estSelectionne ? 'selected' : ''}`}
                                  onClick={() => {
                                    setGvp_formData({...gvp_formData, date_visite: jour.date, heure_visite: ''});
                                  }}
                                  title={`${jour.creneauxDisponibles} créneau(x) disponible(s)`}
                                >
                                  <span className="gvp_jour-num">{jourNum}</span>
                                  <span className="gvp_jour-semaine">{joursSemaine[jourSemaine]}</span>
                                  <span className="gvp_creneaux-count">{jour.creneauxDisponibles} créneau(x)</span>
                                </button>
                              );
                            })}
                        </div>
                      )}
                    </div>

                    {/* ========== CALENDRIER INTELLIGENT - CRÉNEAUX ========== */}
                    <div className="gvp_form-group">
                      <label>
                        <Clock size={14} />
                        Heure <span className="required">*</span>
                      </label>
                      {!gvp_formData.date_visite ? (
                        <div className="gvp_info-message">
                          <Info size={14} />
                          <span>Sélectionnez une date d'abord</span>
                        </div>
                      ) : gvp_loadingCreneaux ? (
                        <div className="gvp_loading-creneaux">Chargement des créneaux...</div>
                      ) : (
                        <div className="gvp_creneaux-grid">
                          {gvp_creneauxDisponibles.map(creneau => (
                            <button
                              key={creneau.heure}
                              type="button"
                              className={`gvp_creneau-cell ${creneau.disponible ? 'disponible' : 'indisponible'} ${gvp_formData.heure_visite === creneau.heure ? 'selected' : ''}`}
                              onClick={() => {
                                if (creneau.disponible) {
                                  setGvp_formData({...gvp_formData, heure_visite: creneau.heure});
                                }
                              }}
                              disabled={!creneau.disponible}
                              title={creneau.message}
                            >
                              {creneau.heure_affichage}
                              {creneau.disponible && gvp_formData.heure_visite === creneau.heure && <span className="gvp_check-icon">✓</span>}
                            </button>
                          ))}
                        </div>
                      )}
                      {!gvp_loadingCreneaux && gvp_formData.date_visite && gvp_creneauxDisponibles.filter(c => c.disponible).length === 0 && (
                        <div className="gvp_no-creneaux-disponibles">
                          <AlertCircle size={14} />
                          <span>Aucun créneau disponible pour cette date</span>
                        </div>
                      )}
                    </div>

                    {/* Motif (optionnel) */}
                    <div className="gvp_form-group full-width">
                      <label>
                        <Info size={14} />
                        Motif (optionnel)
                      </label>
                      <textarea
                        rows="2"
                        value={gvp_formData.motif}
                        onChange={(e) => setGvp_formData({...gvp_formData, motif: e.target.value})}
                        placeholder="Motif de la programmation..."
                      />
                    </div>
                  </div>
                </div>

                <div className="gvp_modal-footer">
                  <button type="button" className="gvp_btn-secondary" onClick={() => setGvp_showForm(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="gvp_btn-primary" disabled={gvp_saving || gvp_checkingSlot || !gvp_formData.heure_visite}>
                    {gvp_checkingSlot ? (
                      <><span className="gvp_spinner-small"></span> Vérification créneau...</>
                    ) : gvp_saving ? (
                      <><span className="gvp_spinner-small"></span> Enregistrement...</>
                    ) : (
                      <><Save size={16} /> {gvp_editMode ? 'Modifier' : 'Programmer'}</>
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