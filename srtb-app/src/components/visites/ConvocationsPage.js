// frontend/components/visites/ConvocationsPage.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Mail, Calendar, Clock, User, FileText, CheckCircle, XCircle,
  AlertCircle, Info, RefreshCw, Download, Eye, X, ChevronRight,
  Users, MapPin, Award, Bell, TrendingUp, Loader
} from 'lucide-react';
import '../../styles/ConvocationsPage.css';

const ConvocationsPage = () => {
  const [loading, setLoading] = useState(false);
  const [convocations, setConvocations] = useState([]);
  const [stats, setStats] = useState({ total_envoyees: 0, total_a_envoyer: 0, a_envoyer_j7: 0 });
  const [notification, setNotification] = useState({ show: false, type: 'info', title: '', message: '' });
  const [selectedConvocations, setSelectedConvocations] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  
  // ✅ ÉTATS POUR LE MODAL
  const [modal, setModal] = useState({ show: false, type: '', id: null, ids: [], loading: false });

  useEffect(() => {
    chargerDonnees();
  }, []);

  const chargerDonnees = async () => {
    setLoading(true);
    try {
      await Promise.all([fetchConvocations(), fetchStats()]);
    } catch (error) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur de chargement' });
    } finally {
      setLoading(false);
    }
  };

  const fetchConvocations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/convocations-a-envoyer`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setConvocations(data.convocations || []);
    } catch (err) {
      console.error('Erreur chargement convocations:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/convocations-stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error('Erreur chargement stats:', err);
    }
  };

  // ✅ MODAL DE CONFIRMATION POUR UNE CONVOCATION
  const openConfirmModal = (id_planning) => {
    setModal({ show: true, type: 'single', id: id_planning, ids: [], loading: false });
  };

  // ✅ MODAL DE CONFIRMATION POUR PLUSIEURS CONVOCATIONS
  const openConfirmGroupModal = () => {
    if (selectedConvocations.length === 0) {
      showNotification({ type: 'warning', title: '⚠️ Aucune sélection', message: 'Sélectionnez au moins une convocation' });
      return;
    }
    setModal({ show: true, type: 'group', id: null, ids: [...selectedConvocations], loading: false });
  };

  // ✅ ENVOI D'UNE CONVOCATION
  const confirmEnvoyer = async () => {
    setModal(prev => ({ ...prev, loading: true }));
    
    try {
      const token = localStorage.getItem('token');
      let response;
      
      if (modal.type === 'single') {
        response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/envoyer-convocation`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ id_planning: modal.id })
        });
      } else {
        response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/envoyer-convocations-groupees`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ ids_planning: modal.ids })
        });
      }
      
      const data = await response.json();
      
      if (data.success) {
        setModal({ show: false, type: '', id: null, ids: [], loading: false });
        setSelectedConvocations([]);
        setSelectAll(false);
        chargerDonnees();
        
        const message = modal.type === 'single' 
          ? 'Convocation envoyée avec succès au service GRH'
          : `${modal.ids.length} convocations envoyées avec succès`;
        
        showNotification({ type: 'success', title: '✅ Envoi réussi', message });
      } else {
        setModal(prev => ({ ...prev, loading: false }));
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      setModal(prev => ({ ...prev, loading: false }));
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'envoi' });
    }
  };

  const closeModal = () => {
    if (!modal.loading) {
      setModal({ show: false, type: '', id: null, ids: [], loading: false });
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedConvocations([]);
    } else {
      setSelectedConvocations(convocations.map(c => c.id_planning));
    }
    setSelectAll(!selectAll);
  };

  const handleSelectOne = (id) => {
    if (selectedConvocations.includes(id)) {
      setSelectedConvocations(selectedConvocations.filter(i => i !== id));
    } else {
      setSelectedConvocations([...selectedConvocations, id]);
    }
  };

  const showNotification = ({ type, title, message }) => {
    setNotification({ show: true, type, title, message });
    setTimeout(() => setNotification({ show: false, type: '', title: '', message: '' }), 5000);
  };

  // ✅ FONCTIONS DE FORMATAGE CORRIGÉES
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const formatDateLong = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const weekdays = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    const weekday = weekdays[date.getUTCDay()];
    const monthName = months[parseInt(month) - 1];
    return `${weekday} ${parseInt(day)} ${monthName} ${year}`;
  };

  const getTypeBadge = (type) => {
    switch(type) {
      case 'Périodique': return <span className="type-badge periodique">📋 Périodique</span>;
      case 'Reprise': return <span className="type-badge reprise">🔄 Reprise</span>;
      case 'Reclassement': return <span className="type-badge reclassement">📝 Reclassement</span>;
      default: return <span className="type-badge">{type}</span>;
    }
  };

  const getPosteBadge = (code_affectation) => {
    if (code_affectation === 3) {
      return <span className="poste-badge chauffeur">🚌 Chauffeur</span>;
    }
    return <span className="poste-badge autre">👤 Contrôleur</span>;
  };

  return (
    <div className="convocations-page">
      
      {/* MODAL DE CONFIRMATION MODERNE */}
      <AnimatePresence>
        {modal.show && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
          >
            <motion.div 
              className="modal-container"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-icon">
                  <Send size={24} />
                </div>
                <h3>Confirmer l'envoi</h3>
                {!modal.loading && (
                  <button className="modal-close" onClick={closeModal}>
                    <X size={20} />
                  </button>
                )}
              </div>
              
              <div className="modal-body">
                <p>
                  {modal.type === 'single' 
                    ? 'Voulez-vous vraiment envoyer cette convocation au service GRH ?'
                    : `Voulez-vous vraiment envoyer ${modal.ids.length} convocation(s) au service GRH ?`
                  }
                </p>
                <div className="modal-info">
                  <Info size={16} />
                  <span>Un email avec PDF sera envoyé au service GRH</span>
                </div>
              </div>
              
              <div className="modal-footer">
                <button 
                  className="btn-cancel" 
                  onClick={closeModal}
                  disabled={modal.loading}
                >
                  Annuler
                </button>
                <button 
                  className="btn-confirm" 
                  onClick={confirmEnvoyer}
                  disabled={modal.loading}
                >
                  {modal.loading ? (
                    <>
                      <Loader size={16} className="spinning" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Confirmer l'envoi
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* NOTIFICATION FLUIDE */}
      <AnimatePresence>
        {notification.show && (
          <motion.div 
            className={`notification-toast ${notification.type}`}
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ type: 'spring', damping: 20 }}
          >
            <div className="notification-icon">
              {notification.type === 'success' && <CheckCircle size={20} />}
              {notification.type === 'error' && <XCircle size={20} />}
              {notification.type === 'warning' && <AlertCircle size={20} />}
              {notification.type === 'info' && <Info size={20} />}
            </div>
            <div className="notification-content">
              <strong>{notification.title}</strong>
              <p>{notification.message}</p>
            </div>
            <button className="notification-close-btn" onClick={() => setNotification({...notification, show: false})}>
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="convocations-header">
        <div className="header-left">
          <div className="header-icon" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
            <Send size={28} />
          </div>
          <div className="header-title">
            <h1>Convocations GRH</h1>
            <p>Envoyez les convocations au service GRH pour distribution aux agents</p>
          </div>
        </div>
        <div className="header-right">
          <button className="btn-icon" onClick={chargerDonnees} title="Actualiser">
            <RefreshCw size={18} />
          </button>
          {selectedConvocations.length > 0 && (
            <motion.button 
              className="btn-primary"
              onClick={openConfirmGroupModal}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Send size={16} /> Envoyer ({selectedConvocations.length})
            </motion.button>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <motion.div className="stat-card" whileHover={{ y: -2 }}>
          <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}><Mail size={24} /></div>
          <div className="stat-content">
            <span className="stat-label">Convocations envoyées</span>
            <span className="stat-value">{stats.total_envoyees}</span>
          </div>
        </motion.div>
        <motion.div className="stat-card" whileHover={{ y: -2 }}>
          <div className="stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}><Clock size={24} /></div>
          <div className="stat-content">
            <span className="stat-label">À envoyer (total)</span>
            <span className="stat-value">{stats.total_a_envoyer}</span>
          </div>
        </motion.div>
        <motion.div className="stat-card warning" whileHover={{ y: -2 }}>
          <div className="stat-icon" style={{ background: '#ef444420', color: '#ef4444' }}><Bell size={24} /></div>
          <div className="stat-content">
            <span className="stat-label">À envoyer (J+7)</span>
            <span className="stat-value">{stats.a_envoyer_j7}</span>
          </div>
        </motion.div>
      </div>

      {/* INFO BANNER */}
      <div className="info-banner">
        <Info size={20} />
        <div>
          <strong>Convocation J+7</strong>
          <p>Les convocations sont envoyées 7 jours avant la date de visite pour permettre au GRH de contacter les agents.</p>
        </div>
      </div>

      {/* LISTE DES CONVOCATIONS */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Chargement des convocations...</p>
        </div>
      ) : convocations.length === 0 ? (
        <motion.div className="empty-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Send size={48} />
          <h3>Aucune convocation à envoyer</h3>
          <p>Toutes les convocations ont été envoyées pour les 7 prochains jours</p>
        </motion.div>
      ) : (
        <>
          <div className="convocations-actions">
            <label className="select-all">
              <input type="checkbox" checked={selectAll} onChange={handleSelectAll} />
              <span>Tout sélectionner</span>
            </label>
            <span className="selection-count">{selectedConvocations.length} sélectionnée(s)</span>
          </div>

          <div className="convocations-list">
            <AnimatePresence>
              {convocations.map(conv => (
                <motion.div 
                  key={conv.id_planning} 
                  className="convocation-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  whileHover={{ scale: 1.01 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="card-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedConvocations.includes(conv.id_planning)}
                      onChange={() => handleSelectOne(conv.id_planning)}
                    />
                  </div>
                  <div className="card-content">
                    <div className="card-header">
                      <div className="agent-info">
                        <div className="agent-avatar">
                          {conv.planningAgent?.nom?.charAt(0)}{conv.planningAgent?.prenom?.charAt(0)}
                        </div>
                        <div>
                          <h3>{conv.planningAgent?.nom} {conv.planningAgent?.prenom}</h3>
                          <span className="agent-matricule">#{conv.matricule_agent}</span>
                          {getPosteBadge(conv.planningAgent?.code_affectation)}
                        </div>
                      </div>
                      {getTypeBadge(conv.type_visite)}
                    </div>
                    
                    <div className="card-details">
                      <div className="detail-item">
                        <Calendar size={14} />
                        <span>{formatDateLong(conv.date_visite)}</span>
                      </div>
                      <div className="detail-item">
                        <Clock size={14} />
                        <span>{conv.heure_visite?.substring(0,5)}</span>
                      </div>
                      <div className="detail-item">
                        <MapPin size={14} />
                        <span>Infirmerie SRTB</span>
                      </div>
                      <div className="detail-item">
                        <Award size={14} />
                        <span>Dr. Mahmoud Khelifi</span>
                      </div>
                    </div>
                  </div>
                  <div className="card-actions">
                    <motion.button 
                      className="btn-small primary"
                      onClick={() => openConfirmModal(conv.id_planning)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Send size={14} /> Envoyer
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}

      {/* FOOTER */}
      <div className="convocations-footer">
        <p>📧 Les convocations sont envoyées au format PDF au service GRH</p>
        <p>Le GRH se charge de contacter les agents et de distribuer les convocations</p>
      </div>
    </div>
  );
};

export default ConvocationsPage;