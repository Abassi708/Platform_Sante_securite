// frontend/components/visites/PlanningPage.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, User, Heart, FileText, CheckCircle, XCircle,
  AlertCircle, Info, RefreshCw, ChevronLeft, ChevronRight,
  AlertTriangle, X, Save, MapPin, Award, Filter, TrendingUp
} from 'lucide-react';
import '../../styles/PlanningPage.css';

const PlanningPage = () => {
  const [loading, setLoading] = useState(true);
  const [planning, setPlanning] = useState([]);
  const [agents, setAgents] = useState([]);
  const [notification, setNotification] = useState({ show: false, type: 'info', title: '', message: '' });

  // ========== UNIQUEMENT LA SEMAINE PROCHAINE ==========
  const [semaineProchaine, setSemaineProchaine] = useState({
    numero: getNumeroSemaine(new Date()) + 1,
    annee: new Date().getFullYear(),
    dateDebut: getLundiSemaine(getNumeroSemaine(new Date()) + 1, new Date().getFullYear())
  });
  const [generationLoading, setGenerationLoading] = useState(false);

  // ========== ÉTATS POUR LE FORMULAIRE D'ENREGISTREMENT ==========
  const [showForm, setShowForm] = useState(false);
  const [selectedPlanning, setSelectedPlanning] = useState(null);
  const [formData, setFormData] = useState({
    matricule_agent: '',
    date_visite: '',
    heure_visite: '',
    type_visite: 'Périodique',
    medecin: '',
    observation: '',
    resultat: 'Apte',
    id_planning: null
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // ========== ÉTATS POUR LA RÉAFFECTATION ==========
  const [showReaffectModal, setShowReaffectModal] = useState(false);
  const [planningToReaffect, setPlanningToReaffect] = useState(null);
  const [reaffectMotif, setReaffectMotif] = useState('');
  const [reaffectLoading, setReaffectLoading] = useState(false);

  // ========== ÉTATS POUR L'ANNULATION ==========
  const [showAnnulationModal, setShowAnnulationModal] = useState(false);
  const [planningToAnnuler, setPlanningToAnnuler] = useState(null);
  const [annulationMotif, setAnnulationMotif] = useState('');
  const [annulationLoading, setAnnulationLoading] = useState(false);

  // ========== CHARGEMENT DES DONNÉES ==========
  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAgents(),
        fetchPlanningSemaineProchaine()
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
      const response = await fetch('http://localhost:5000/api/agents', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setAgents(data.agents);
    } catch (err) {
      console.error('Erreur chargement agents:', err);
    }
  };

  // Vers la ligne 80, après fetchPlanningSemaineProchaine()
const fetchPlanningSemaineProchaine = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch(
      `http://localhost:5000/api/planning/${semaineProchaine.numero}/${semaineProchaine.annee}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    const data = await response.json();
    console.log('📦 Données reçues:', data); // AJOUTEZ CETTE LIGNE
    if (data.success) {
      setPlanning(data.planning || []);
    }
  } catch (err) {
    console.error('Erreur chargement planning:', err);
  }
};

  // ========== GÉNÉRATION DU PLANNING POUR LA SEMAINE PROCHAINE ==========
  const genererPlanning = async () => {
    if (!window.confirm('Générer le planning pour la semaine prochaine ?')) return;

    setGenerationLoading(true);
    try {
      const token = localStorage.getItem('token');

      const response = await fetch('http://localhost:5000/api/planning/generer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ dateDebut: semaineProchaine.dateDebut })
      });

      const data = await response.json();
      if (data.success) {
        showNotification({
          type: 'success',
          title: '✅ Planning généré',
          message: data.message
        });
        fetchPlanningSemaineProchaine();
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message || 'Erreur inconnue' });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de la génération' });
    } finally {
      setGenerationLoading(false);
    }
  };

  // ========== FONCTIONS POUR LES AGENTS ==========
  const getAgentNom = (matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    return agent ? `${agent.nom} ${agent.prenom}` : `Agent ${matricule}`;
  };

  const getAgentDetails = (matricule) => {
    return agents.find(a => a.matricule_agent === matricule);
  };

  const getDerniereVisite = (matricule) => {
    const agent = agents.find(a => a.matricule_agent === matricule);
    if (!agent || !agent.date_derniere_visite) return 'Jamais';
    return new Date(agent.date_derniere_visite).toLocaleDateString('fr-FR');
  };

  // ========== FONCTION POUR LE STATUT ==========
  const getStatutClass = (statut, effectuee) => {
    if (effectuee) return 'effectue';
    switch(statut) {
      case 'Programmé': return 'programme';
      case 'Reporté': return 'reporte';
      case 'Annulé': return 'annule';
      default: return '';
    }
  };

  // ========== FONCTIONS POUR LE FORMULAIRE ==========
  const handleEnregistrerVisite = (planningItem) => {
    setSelectedPlanning(planningItem);
    setFormData({
      matricule_agent: planningItem.matricule_agent,
      date_visite: planningItem.date_visite,
      heure_visite: planningItem.heure_visite,
      type_visite: planningItem.type_visite,
      medecin: '',
      observation: '',
      resultat: 'Apte',
      id_planning: planningItem.id_planning
    });
    setShowForm(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.medecin) errors.medecin = 'Médecin requis';
    return errors;
  };

  const handleSubmitVisite = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:5000/api/planning/${formData.id_planning}/effectuer`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medecin: formData.medecin,
          observation: formData.observation,
          resultat: formData.resultat
        })
      });

      const data = await response.json();
      if (data.success) {
        showNotification({
          type: 'success',
          title: '✅ Visite enregistrée',
          message: `Visite pour ${getAgentNom(formData.matricule_agent)} enregistrée`
        });
        setShowForm(false);
        resetForm();
        fetchPlanningSemaineProchaine();
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'enregistrement' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      matricule_agent: '',
      date_visite: '',
      heure_visite: '',
      type_visite: 'Périodique',
      medecin: '',
      observation: '',
      resultat: 'Apte',
      id_planning: null
    });
    setFormErrors({});
    setSelectedPlanning(null);
  };

  // ========== FONCTIONS POUR LA RÉAFFECTATION ==========
  const handleReaffecter = (planningItem) => {
    setPlanningToReaffect(planningItem);
    setShowReaffectModal(true);
  };

  const confirmerReaffectation = async () => {
    if (!planningToReaffect || !reaffectMotif) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Motif requis' });
      return;
    }

    setReaffectLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/planning/${planningToReaffect.id_planning}/reaffecter`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motif: reaffectMotif })
      });

      const data = await response.json();
      if (data.success) {
        showNotification({
          type: 'success',
          title: '✅ Réaffecté',
          message: 'Visite réaffectée avec succès'
        });
        setShowReaffectModal(false);
        setReaffectMotif('');
        setPlanningToReaffect(null);
        fetchPlanningSemaineProchaine();
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de la réaffectation' });
    } finally {
      setReaffectLoading(false);
    }
  };

  // ========== FONCTIONS POUR L'ANNULATION ==========
  const handleAnnulerVisite = (planningItem) => {
    setPlanningToAnnuler(planningItem);
    setShowAnnulationModal(true);
  };

  const confirmerAnnulation = async () => {
    if (!planningToAnnuler || !annulationMotif) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Motif requis' });
      return;
    }

    setAnnulationLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/planning/${planningToAnnuler.id_planning}/annuler`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ motif: annulationMotif })
      });

      const data = await response.json();
      if (data.success) {
        showNotification({
          type: 'success',
          title: '✅ Annulée',
          message: 'Visite annulée avec succès'
        });
        setShowAnnulationModal(false);
        setAnnulationMotif('');
        setPlanningToAnnuler(null);
        fetchPlanningSemaineProchaine();
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'annulation' });
    } finally {
      setAnnulationLoading(false);
    }
  };

  // ========== NOTIFICATION ==========
  const showNotification = ({ type, title, message }) => {
    setNotification({ show: true, type, title, message });
    setTimeout(() => setNotification({ show: false, type: '', title: '', message: '' }), 5000);
  };

  // ========== FONCTIONS DE DATE ==========
  function getNumeroSemaine(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  function getLundiSemaine(numeroSemaine, annee) {
    const simple = new Date(annee, 0, 1 + (numeroSemaine - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart.toISOString().split('T')[0];
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    });
  };

  // ========== CONSTANTES ==========
  const joursSemaine = ['Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const creneaux = ['08:00', '08:30', '09:00', '09:30'];

  // ========== RENDU ==========
  return (
    <div className="planning-page">

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

      {/* HEADER - SANS FLECHES DE NAVIGATION */}
      <div className="planning-header">
        <div className="header-left">
          <div className="header-icon">
            <Calendar size={28} />
          </div>
          <div className="header-title">
            <h1>Planning semaine prochaine</h1>
            <p>Semaine {semaineProchaine.numero} / {semaineProchaine.annee}</p>
          </div>
        </div>

        <div className="header-right">
          <button
            className="btn-primary"
            onClick={genererPlanning}
            disabled={generationLoading}
          >
            {generationLoading ? (
              <><span className="spinner-small"></span> Génération...</>
            ) : (
              <><RefreshCw size={16} /> Générer semaine prochaine</>
            )}
          </button>
        </div>
      </div>

      {/* ========== LÉGENDE DES STATUTS ========== */}
<div className="planning-legend">
  <div className="legend-item" data-tooltip="Visite programmée en attente">
    <span className="legend-dot programme"></span>
    <span>Programmé</span>
  </div>
  <div className="legend-item" data-tooltip="Visite effectuée avec succès">
    <span className="legend-dot effectue"></span>
    <span>Effectué</span>
  </div>
  <div className="legend-item" data-tooltip="Visite reportée à une date ultérieure">
    <span className="legend-dot reporte"></span>
    <span>Reporté</span>
  </div>
  <div className="legend-item" data-tooltip="Visite annulée">
    <span className="legend-dot annule"></span>
    <span>Annulé</span>
  </div>
</div>

      {/* PLANNING */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement du planning...</p>
        </div>
      ) : (
        <div className="planning-grid">
          {/* En-tête */}
          <div className="planning-row header">
            <div className="planning-cell time-cell">Horaire</div>
            {joursSemaine.map((jour, index) => {
              const date = new Date(semaineProchaine.dateDebut);
              date.setDate(date.getDate() + index + 1);
              return (
                <div key={jour} className="planning-cell day-cell">
                  <div className="jour-label">{jour}</div>
                  <div className="date-label">{formatDate(date)}</div>
                </div>
              );
            })}
          </div>

          {/* Lignes par créneau */}
          {creneaux.map((creneau, index) => (
            <div key={index} className="planning-row">
              <div className="planning-cell time-cell">{creneau}</div>

              {joursSemaine.map((jour, jIndex) => {
                const date = new Date(semaineProchaine.dateDebut);
                date.setDate(date.getDate() + jIndex + 1);
                const dateStr = date.toISOString().split('T')[0];

                const visite = planning.find(p =>
                  p.date_visite === dateStr &&
                  p.heure_visite === creneau + ':00'
                );

                return (
                  <div key={jIndex} className="planning-cell">
                    {visite ? (
                      <div className={`visite-card ${getStatutClass(visite.statut, visite.visite_effectuee)}`}>
                        <div className="visite-card-header">
                          <span className="agent-matricule">#{visite.matricule_agent}</span>
                          <span className={`badge-statut ${visite.visite_effectuee ? 'effectue' : ''}`}>
                            {visite.visite_effectuee ? 'Effectué' : visite.statut}
                          </span>
                        </div>

                        <div className="agent-nom">
                          {getAgentNom(visite.matricule_agent)}
                        </div>

                        {getAgentDetails(visite.matricule_agent) && (
                          <div className="agent-infos">
                            <span className="agent-agence">
                              <MapPin size={10} /> Agence {getAgentDetails(visite.matricule_agent).code_agence}
                            </span>
                            <span className="agent-derniere">
                              <Clock size={10} /> Dernière: {getDerniereVisite(visite.matricule_agent)}
                            </span>
                          </div>
                        )}

                        {visite.priorite > 0 && !visite.visite_effectuee && (
                          <div className="agent-priorite" title={`Priorité: ${visite.priorite}`}>
                            <TrendingUp size={10} color="#f59e0b" />
                            <span>Priorité {visite.priorite}</span>
                          </div>
                        )}

                        <div className="visite-type">{visite.type_visite}</div>

                        {!visite.visite_effectuee && visite.statut === 'Programmé' && (
                          <div className="visite-card-actions">
                            <button
                              className="action-btn success"
                              onClick={() => handleEnregistrerVisite(visite)}
                              title="Marquer comme effectuée"
                            >
                              <CheckCircle size={12} /> Effectué
                            </button>
                            <button
                              className="action-btn warning"
                              onClick={() => handleReaffecter(visite)}
                              title="Reprogrammer"
                            >
                              <RefreshCw size={12} /> Reprogrammer
                            </button>
                            <button
                              className="action-btn danger"
                              onClick={() => handleAnnulerVisite(visite)}
                              title="Annuler"
                            >
                              <XCircle size={12} /> Annuler
                            </button>
                          </div>
                        )}

                        {visite.visite_effectuee && (
                          <div className="visite-effectuee-info">
                            <CheckCircle size={12} color="#10b981" />
                            <small>Effectuée</small>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="visite-card empty">
                        <span>Disponible</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* MODALE D'ENREGISTREMENT DE VISITE */}
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
              className="modal-content"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="header-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                  <Heart size={24} />
                </div>
                <h2>Enregistrer la visite</h2>
                <button className="modal-close" onClick={() => setShowForm(false)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmitVisite}>
                <div className="modal-body">
                  <div className="form-group readonly">
                    <label>Agent</label>
                    <div className="readonly-value">
                      {getAgentNom(formData.matricule_agent)} (#{formData.matricule_agent})
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group readonly">
                      <label>Date</label>
                      <div className="readonly-value">{formatDate(formData.date_visite)}</div>
                    </div>
                    <div className="form-group readonly">
                      <label>Heure</label>
                      <div className="readonly-value">{formData.heure_visite}</div>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>
                      <User size={14} />
                      Médecin <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.medecin}
                      onChange={(e) => setFormData({...formData, medecin: e.target.value})}
                      placeholder="Dr. ..."
                      className={formErrors.medecin ? 'error' : ''}
                    />
                    {formErrors.medecin && <div className="error-message">{formErrors.medecin}</div>}
                  </div>

                  <div className="form-group">
                    <label>
                      <Award size={14} />
                      Résultat
                    </label>
                    <select
                      value={formData.resultat}
                      onChange={(e) => setFormData({...formData, resultat: e.target.value})}
                    >
                      <option value="Apte">Apte</option>
                      <option value="Apte avec réserves">Apte avec réserves</option>
                      <option value="Inapte temporaire">Inapte temporaire</option>
                      <option value="Inapte définitif">Inapte définitif</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>
                      <FileText size={14} />
                      Observations
                    </label>
                    <textarea
                      rows="3"
                      value={formData.observation}
                      onChange={(e) => setFormData({...formData, observation: e.target.value})}
                      placeholder="Observations médicales..."
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? (
                      <><span className="spinner-small"></span> Enregistrement...</>
                    ) : (
                      <><Save size={16} /> Enregistrer la visite</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE DE RÉAFFECTATION */}
      <AnimatePresence>
        {showReaffectModal && planningToReaffect && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReaffectModal(false)}
          >
            <motion.div
              className="modal-content small"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header warning">
                <div className="header-icon warning">
                  <RefreshCw size={24} />
                </div>
                <h2>Reprogrammer la visite</h2>
                <button className="modal-close" onClick={() => setShowReaffectModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="reaffect-info">
                  <p><strong>Agent :</strong> {getAgentNom(planningToReaffect.matricule_agent)}</p>
                  <p><strong>Date :</strong> {formatDate(planningToReaffect.date_visite)} à {planningToReaffect.heure_visite}</p>
                </div>

                <div className="form-group">
                  <label>Motif de la reprogrammation</label>
                  <textarea
                    rows="3"
                    value={reaffectMotif}
                    onChange={(e) => setReaffectMotif(e.target.value)}
                    placeholder="Absence, indisponibilité, etc."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowReaffectModal(false)}>
                  Annuler
                </button>
                <button
                  className="btn-primary"
                  onClick={confirmerReaffectation}
                  disabled={!reaffectMotif || reaffectLoading}
                >
                  {reaffectLoading ? (
                    <><span className="spinner-small"></span> Traitement...</>
                  ) : (
                    <><RefreshCw size={16} /> Confirmer la reprogrammation</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE D'ANNULATION */}
      <AnimatePresence>
        {showAnnulationModal && planningToAnnuler && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAnnulationModal(false)}
          >
            <motion.div
              className="modal-content small"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="modal-header danger">
                <div className="header-icon danger">
                  <XCircle size={24} />
                </div>
                <h2>Annuler la visite</h2>
                <button className="modal-close" onClick={() => setShowAnnulationModal(false)}>
                  <X size={18} />
                </button>
              </div>

              <div className="modal-body">
                <div className="reaffect-info">
                  <p><strong>Agent :</strong> {getAgentNom(planningToAnnuler.matricule_agent)}</p>
                  <p><strong>Date :</strong> {formatDate(planningToAnnuler.date_visite)} à {planningToAnnuler.heure_visite}</p>
                </div>

                <div className="form-group">
                  <label>Motif de l'annulation</label>
                  <textarea
                    rows="3"
                    value={annulationMotif}
                    onChange={(e) => setAnnulationMotif(e.target.value)}
                    placeholder="Raison de l'annulation"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowAnnulationModal(false)}>
                  Annuler
                </button>
                <button
                  className="btn-danger"
                  onClick={confirmerAnnulation}
                  disabled={!annulationMotif || annulationLoading}
                >
                  {annulationLoading ? (
                    <><span className="spinner-small"></span> Traitement...</>
                  ) : (
                    <><XCircle size={16} /> Confirmer l'annulation</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlanningPage;