// frontend/components/visites/ConvocationsPage.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Mail, Calendar, Clock, User, FileText, CheckCircle, XCircle,
  AlertCircle, Info, RefreshCw, Download, Eye, X, ChevronRight,
  Users, MapPin, Award, Bell, TrendingUp
} from 'lucide-react';
import '../../styles/ConvocationsPage.css';

const ConvocationsPage = () => {
  const [loading, setLoading] = useState(false);
  const [convocations, setConvocations] = useState([]);
  const [stats, setStats] = useState({ total_envoyees: 0, total_a_envoyer: 0, a_envoyer_j7: 0 });
  const [notification, setNotification] = useState({ show: false, type: 'info', title: '', message: '' });
  const [selectedConvocations, setSelectedConvocations] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

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

  const handleEnvoyerConvocation = async (id_planning) => {
    if (!window.confirm('Envoyer cette convocation ?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/envoyer-convocation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id_planning })
      });
      
      const data = await response.json();
      if (data.success) {
        showNotification({ type: 'success', title: '✅ Convocation envoyée', message: 'La convocation a été envoyée au GRH' });
        chargerDonnees();
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'envoi' });
    }
  };

  const handleEnvoyerGroupe = async () => {
    if (selectedConvocations.length === 0) {
      showNotification({ type: 'warning', title: '⚠️ Aucune sélection', message: 'Sélectionnez au moins une convocation' });
      return;
    }
    
    if (!window.confirm(`Envoyer ${selectedConvocations.length} convocation(s) ?`)) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/envoyer-convocations-groupees`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids_planning: selectedConvocations })
      });
      
      const data = await response.json();
      if (data.success) {
        showNotification({ type: 'success', title: '✅ Convocations envoyées', message: data.message });
        setSelectedConvocations([]);
        setSelectAll(false);
        chargerDonnees();
      } else {
        showNotification({ type: 'error', title: '❌ Erreur', message: data.message });
      }
    } catch (err) {
      showNotification({ type: 'error', title: '❌ Erreur', message: 'Erreur lors de l\'envoi' });
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

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    return <span className="poste-badge autre">👤 Autre</span>;
  };

  return (
    <div className="convocations-page">
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
            <button className="btn-primary" onClick={handleEnvoyerGroupe}>
              <Send size={16} /> Envoyer ({selectedConvocations.length})
            </button>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#10b98120', color: '#10b981' }}><Mail size={24} /></div>
          <div className="stat-content">
            <span className="stat-label">Convocations envoyées</span>
            <span className="stat-value">{stats.total_envoyees}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f59e0b20', color: '#f59e0b' }}><Clock size={24} /></div>
          <div className="stat-content">
            <span className="stat-label">À envoyer (total)</span>
            <span className="stat-value">{stats.total_a_envoyer}</span>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon" style={{ background: '#ef444420', color: '#ef4444' }}><Bell size={24} /></div>
          <div className="stat-content">
            <span className="stat-label">À envoyer (J+7)</span>
            <span className="stat-value">{stats.a_envoyer_j7}</span>
          </div>
        </div>
      </div>

      {/* INFO CONVOCATION */}
      <div className="info-banner">
        <Info size={20} />
        <div>
          <strong>Convocation J+7</strong>
          <p>Les convocations sont envoyées 7 jours avant la date de visite pour permettre au GRH de contacter les agents.</p>
        </div>
      </div>

      {/* LISTE DES CONVOCATIONS */}
      {loading ? (
        <div className="loading-state"><div className="spinner"></div><p>Chargement des convocations...</p></div>
      ) : convocations.length === 0 ? (
        <div className="empty-state">
          <Send size={48} />
          <h3>Aucune convocation à envoyer</h3>
          <p>Toutes les convocations ont été envoyées pour les 7 prochains jours</p>
        </div>
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
            {convocations.map(conv => (
              <div key={conv.id_planning} className="convocation-card">
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
                      <span>{formatDate(conv.date_visite)}</span>
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
                  <button className="btn-small primary" onClick={() => handleEnvoyerConvocation(conv.id_planning)}>
                    <Send size={14} /> Envoyer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* PIED DE PAGE */}
      <div className="convocations-footer">
        <p>📧 Les convocations sont envoyées au format PDF au service GRH</p>
        <p>Le GRH se charge de contacter les agents et de distribuer les convocations</p>
      </div>
    </div>
  );
};

export default ConvocationsPage;