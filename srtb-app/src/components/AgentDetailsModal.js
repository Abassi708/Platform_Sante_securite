// frontend/src/components/AgentDetailsModal.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  X, User, Building2, Briefcase, Calendar, Clock, Heart,
  AlertCircle, CheckCircle, XCircle, Phone, Mail, MapPin, Activity,
  FileText, History, ChevronRight, UserCheck, UserX
} from 'lucide-react';
import '../styles/AgentDetailsModal.css';

const AgentDetailsModal = ({ agent, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [agentDetails, setAgentDetails] = useState(null);

  useEffect(() => {
    fetchAgentDetails();
  }, [agent]);

  const fetchAgentDetails = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/technicien/agents/${agent.matricule_agent}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAgentDetails(data.data);
      }
    } catch (err) {
      console.error('Erreur chargement détails:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatutBadge = (statut) => {
    const badges = {
      actif: { icon: <CheckCircle size={14} />, color: '#10b981', bg: '#10b98120', label: 'Actif' },
      inactif: { icon: <XCircle size={14} />, color: '#ef4444', bg: '#ef444420', label: 'Inactif' },
      conge: { icon: <Clock size={14} />, color: '#f59e0b', bg: '#f59e0b20', label: 'Congé' },
      maladie: { icon: <Heart size={14} />, color: '#8b5cf6', bg: '#8b5cf620', label: 'Maladie' }
    };
    const badge = badges[statut] || badges.actif;
    return (
      <span className="detail-statut-badge" style={{ background: badge.bg, color: badge.color }}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  return (
    <div className="agent-modal-overlay" onClick={onClose}>
      <motion.div 
        className="agent-modal-content"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="agent-modal-header">
          <div className="agent-modal-title">
            <div className="agent-avatar" style={{ background: `linear-gradient(135deg, #f59e0b, #d97706)` }}>
              <User size={28} color="white" />
            </div>
            <div>
              <h2>{agent.nom} {agent.prenom}</h2>
              <p>Matricule: {agent.matricule_agent}</p>
            </div>
          </div>
          <button className="agent-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="agent-modal-body">
          {loading ? (
            <div className="loading-spinner">
              <div className="spinner"></div>
              <p>Chargement des détails...</p>
            </div>
          ) : (
            <>
              {/* Informations personnelles */}
              <div className="detail-section">
                <h3>
                  <User size={18} />
                  Informations personnelles
                </h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Nom complet</span>
                    <span className="detail-value">{agent.nom} {agent.prenom}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Âge</span>
                    <span className="detail-value">{agent.age || '-'} ans</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Date naissance</span>
                    <span className="detail-value">
                      {agent.date_naissance ? new Date(agent.date_naissance).toLocaleDateString('fr-FR') : '-'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Statut</span>
                    <span className="detail-value">{getStatutBadge(agent.statut)}</span>
                  </div>
                </div>
              </div>

              {/* Informations professionnelles */}
              <div className="detail-section">
                <h3>
                  <Briefcase size={18} />
                  Informations professionnelles
                </h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Agence</span>
                    <span className="detail-value">
                      <Building2 size={14} />
                      {agent.agentAgence?.nom_agence || '-'}
                      {agent.agentAgence?.ville && ` (${agent.agentAgence.ville})`}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Affectation</span>
                    <span className="detail-value">
                      <Briefcase size={14} />
                      {agent.agentAffectation?.libelle_affectation || '-'}
                      {agent.estChauffeur && (
                        <span className="chauffeur-tag">Chauffeur</span>
                      )}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Direction</span>
                    <span className="detail-value">{agent.direction || '-'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Périodicité visites</span>
                    <span className="detail-value">
                      <Calendar size={14} />
                      {agent.periodiciteTexte || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* État de santé */}
              <div className="detail-section">
                <h3>
                  <Heart size={18} />
                  État de santé
                </h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">En inaptitude</span>
                    <span className="detail-value">
                      {agent.estEnInaptitude ? (
                        <span className="inaptitude-badge-danger">
                          <AlertCircle size={14} />
                          Oui ({agent.joursRestantsInaptitude} jours restants)
                        </span>
                      ) : (
                        <span className="inaptitude-badge-safe">
                          <CheckCircle size={14} />
                          Non
                        </span>
                      )}
                    </span>
                  </div>
                  {agent.date_debut_inaptitude && (
                    <div className="detail-item">
                      <span className="detail-label">Début inaptitude</span>
                      <span className="detail-value">
                        {new Date(agent.date_debut_inaptitude).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  {agent.date_fin_inaptitude && (
                    <div className="detail-item">
                      <span className="detail-label">Fin inaptitude</span>
                      <span className="detail-value">
                        {new Date(agent.date_fin_inaptitude).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  )}
                  <div className="detail-item">
                    <span className="detail-label">Dernière visite</span>
                    <span className="detail-value">
                      {agent.date_derniere_visite ? new Date(agent.date_derniere_visite).toLocaleDateString('fr-FR') : '-'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Prochaine visite</span>
                    <span className="detail-value">
                      {agent.date_prochaine_visite ? new Date(agent.date_prochaine_visite).toLocaleDateString('fr-FR') : '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistiques des visites */}
              {agentDetails?.statistiques && (
                <div className="detail-section">
                  <h3>
                    <Activity size={18} />
                    Historique des visites
                  </h3>
                  <div className="visites-stats">
                    <div className="stat-circle">
                      <span className="stat-number">{agentDetails.statistiques.totalVisites}</span>
                      <span className="stat-label">Visites totales</span>
                    </div>
                    {agentDetails.statistiques.visitesParAn?.length > 0 && (
                      <div className="visites-par-an">
                        {agentDetails.statistiques.visitesParAn.map((item, idx) => (
                          <div key={idx} className="year-stat">
                            <span className="year">{item.annee}</span>
                            <span className="count">{item.count} visites</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Derniers plannings */}
              {agentDetails?.agent?.agentPlannings?.length > 0 && (
                <div className="detail-section">
                  <h3>
                    <Calendar size={18} />
                    Prochaines visites programmées
                  </h3>
                  <div className="plannings-list">
                    {agentDetails.agent.agentPlannings.map((planning, idx) => (
                      <div key={idx} className="planning-item">
                        <div className="planning-date">
                          <Calendar size={14} />
                          {new Date(planning.date_visite).toLocaleDateString('fr-FR')}
                        </div>
                        <div className="planning-time">
                          <Clock size={14} />
                          {planning.heure_visite}
                        </div>
                        <div className="planning-type">
                          {planning.type_visite}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="agent-modal-footer">
          <button className="btn-close" onClick={onClose}>
            Fermer
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default AgentDetailsModal;