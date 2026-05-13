// frontend/src/components/AffectationsView.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Building2, Users, UserCheck, UserX, Clock, Heart,
  ChevronRight, TrendingUp, AlertCircle, BarChart, PieChart,
  Activity, Truck, Shield, X, Eye, Download, Filter, Search
} from 'lucide-react';
import '../styles/AffectationsView.css'; 

const AffectationsView = () => {
  const [affectations, setAffectations] = useState([]);
  const [agences, setAgences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('affectations');
  const [selectedAffectation, setSelectedAffectation] = useState(null);
  const [selectedAgence, setSelectedAgence] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Couleurs professionnelles harmonisées avec le thème
  const colors = {
    primary: '#2563eb',
    primaryLight: '#3b82f6',
    primarySoft: '#eff6ff',
    primaryDark: '#1d4ed8',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#06b6d4',
    purple: '#8b5cf6'
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      const [affectationsRes, agencesRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/api/technicien/affectations`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_API_URL}/api/technicien/agences`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      const affectationsData = await affectationsRes.json();
      const agencesData = await agencesRes.json();
      
      if (affectationsData.success) {
        setAffectations(affectationsData.data);
      }
      if (agencesData.success) {
        setAgences(agencesData.data);
      }
    } catch (err) {
      console.error('Erreur chargement données:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAffectationIcon = (libelle) => {
    if (libelle === 'Conducteur') return <Truck size={20} />;
    if (libelle === 'Contrôleur') return <Shield size={20} />;
    return <Briefcase size={20} />;
  };

  const getAffectationColor = (libelle) => {
    if (libelle === 'Conducteur') return colors.warning;
    if (libelle === 'Contrôleur') return colors.success;
    return colors.primary;
  };

  if (loading) {
    return (
      <div className="hse-affectations-loading">
        <div className="hse-spinner"></div>
        <p>Chargement des données...</p>
      </div>
    );
  }

  return (
    <div className="hse-affectations-container">
      {/* En-tête */}
      <div className="hse-affectations-header">
        <div className="hse-header-left">
          <div className="hse-header-icon" style={{ background: colors.primarySoft, color: colors.primary }}>
            <BarChart size={24} />
          </div>
          <div>
            <h2>Distribution des Agents</h2>
            <p>Consultez la répartition des agents par affectation et par agence</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="hse-tabs">
        <button
          className={`hse-tab-btn ${activeTab === 'affectations' ? 'active' : ''}`}
          onClick={() => setActiveTab('affectations')}
        >
          <Briefcase size={18} />
          <span>Par affectation</span>
        </button>
        <button
          className={`hse-tab-btn ${activeTab === 'agences' ? 'active' : ''}`}
          onClick={() => setActiveTab('agences')}
        >
          <Building2 size={18} />
          <span>Par agence</span>
        </button>
      </div>

      {/* Vue par affectation */}
      <AnimatePresence mode="wait">
        {activeTab === 'affectations' && (
          <motion.div
            key="affectations"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="hse-affectations-grid"
          >
            {affectations.map((affectation, index) => (
              <motion.div
                key={affectation.code_affectation}
                className="hse-affectation-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedAffectation(affectation)}
              >
                <div
                  className="hse-card-icon"
                  style={{ background: `${getAffectationColor(affectation.libelle_affectation)}15`, color: getAffectationColor(affectation.libelle_affectation) }}
                >
                  {getAffectationIcon(affectation.libelle_affectation)}
                </div>
                <div className="hse-card-content">
                  <h3>{affectation.libelle_affectation}</h3>
                  <p className="hse-description">{affectation.description || 'Aucune description'}</p>
                  <div className="hse-periodicite-info">
                    <Clock size={14} style={{ color: colors.primary }} />
                    <span>Périodicité: {affectation.periodiciteTexte || 'Variable'}</span>
                  </div>
                </div>
                <div className="hse-card-stats">
                  <div className="hse-stat-item">
                    <Users size={16} />
                    <strong style={{ color: colors.primary }}>{affectation.stats?.total || 0}</strong>
                    <span>agents</span>
                  </div>
                  <div className="hse-stat-details">
                    <span className="actif"><UserCheck size={12} /> {affectation.stats?.actifs || 0}</span>
                    <span className="maladie"><Heart size={12} /> {affectation.stats?.maladies || 0}</span>
                    <span className="conge"><Clock size={12} /> {affectation.stats?.conges || 0}</span>
                  </div>
                </div>
                <ChevronRight size={18} className="hse-card-arrow" style={{ color: colors.primary }} />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Vue par agence */}
        {activeTab === 'agences' && (
          <motion.div
            key="agences"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="hse-agences-grid"
          >
            {agences.map((agence, index) => (
              <motion.div
                key={agence.code_agence}
                className="hse-agence-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelectedAgence(agence)}
              >
                <div className="hse-card-header-agence">
                  <div className="hse-agence-icon" style={{ background: colors.primarySoft, color: colors.primary }}>
                    <Building2 size={24} />
                  </div>
                  <div className="hse-agence-info">
                    <h3>{agence.nom_agence}</h3>
                    <p>{agence.ville}</p>
                    {agence.telephone && <small>{agence.telephone}</small>}
                  </div>
                </div>
                <div className="hse-agence-stats" style={{ background: '#f8fafc' }}>
                  <div className="hse-stat-main">
                    <Users size={20} style={{ color: colors.primary }} />
                    <span className="hse-stat-number" style={{ color: colors.primary }}>{agence.stats?.total || 0}</span>
                    <span className="hse-stat-label">agents</span>
                  </div>
                  <div className="hse-stat-breakdown">
                    <span className="actif">Actifs: {agence.stats?.actifs || 0}</span>
                    <span className="inactif">Inactifs: {agence.stats?.inactifs || 0}</span>
                  </div>
                </div>
                <div className="hse-affectation-breakdown">
                  <p className="hse-breakdown-title">Répartition par affectation:</p>
                  <div className="hse-breakdown-list">
                    {Object.entries(agence.stats?.parAffectation || {}).map(([affectation, count]) => (
                      <span key={affectation} className="hse-breakdown-item" style={{ background: colors.primarySoft, color: colors.primary }}>
                        <Briefcase size={12} />
                        {affectation}: {count}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight size={18} className="hse-card-arrow" style={{ color: colors.primary }} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal détails affectation */}
      <AnimatePresence>
        {selectedAffectation && (
          <motion.div 
            className="hse-modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAffectation(null)}
          >
            <motion.div 
              className="hse-modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="hse-modal-header" style={{ background: `${getAffectationColor(selectedAffectation.libelle_affectation)}10` }}>
                <div className="hse-header-icon" style={{ background: getAffectationColor(selectedAffectation.libelle_affectation), color: 'white' }}>
                  {getAffectationIcon(selectedAffectation.libelle_affectation)}
                </div>
                <h2>{selectedAffectation.libelle_affectation}</h2>
                <button className="hse-modal-close" onClick={() => setSelectedAffectation(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="hse-modal-body">
                <div className="hse-info-section" style={{ background: colors.primarySoft }}>
                  <p className="hse-description-full">{selectedAffectation.description || 'Aucune description disponible'}</p>
                  <div className="hse-info-row">
                    <Clock size={16} style={{ color: colors.primary }} />
                    <span>Périodicité des visites: <strong>{selectedAffectation.periodiciteTexte || 'Variable'}</strong></span>
                  </div>
                </div>
                
                <div className="hse-stats-section">
                  <h3>Statistiques des agents</h3>
                  <div className="hse-stats-grid-modal">
                    <div className="hse-stat-box" style={{ borderTop: `3px solid ${colors.primary}` }}>
                      <Users size={24} style={{ color: colors.primary }} />
                      <strong>{selectedAffectation.stats?.total || 0}</strong>
                      <span>Total agents</span>
                    </div>
                    <div className="hse-stat-box" style={{ borderTop: `3px solid ${colors.success}` }}>
                      <UserCheck size={24} style={{ color: colors.success }} />
                      <strong>{selectedAffectation.stats?.actifs || 0}</strong>
                      <span>Actifs</span>
                    </div>
                    <div className="hse-stat-box" style={{ borderTop: `3px solid ${colors.danger}` }}>
                      <Heart size={24} style={{ color: colors.danger }} />
                      <strong>{selectedAffectation.stats?.maladies || 0}</strong>
                      <span>Maladie</span>
                    </div>
                    <div className="hse-stat-box" style={{ borderTop: `3px solid ${colors.warning}` }}>
                      <Clock size={24} style={{ color: colors.warning }} />
                      <strong>{selectedAffectation.stats?.conges || 0}</strong>
                      <span>Congé</span>
                    </div>
                  </div>
                </div>
                
                <div className="hse-agents-list-modal">
                  <h3>Liste des agents ({selectedAffectation.stats?.total || 0})</h3>
                  <div className="hse-agents-table-mini">
                    <table>
                      <thead>
                        <tr>
                          <th>Matricule</th>
                          <th>Nom</th>
                          <th>Prénom</th>
                          <th>Statut</th>
                          <th>Agence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedAffectation.agents || []).map(agent => (
                          <tr key={agent.matricule}>
                            <td>{agent.matricule}</td>
                            <td>{agent.nom}</td>
                            <td>{agent.prenom}</td>
                            <td>
                              <span className={`hse-status-badge ${agent.statut}`}>
                                {agent.statut}
                              </span>
                            </td>
                            <td>{agent.code_agence || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal détails agence */}
      <AnimatePresence>
        {selectedAgence && (
          <motion.div 
            className="hse-modal-overlay" 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedAgence(null)}
          >
            <motion.div 
              className="hse-modal-content"
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="hse-modal-header" style={{ background: colors.primarySoft }}>
                <div className="hse-header-icon" style={{ background: colors.primary, color: 'white' }}>
                  <Building2 size={24} />
                </div>
                <div>
                  <h2>{selectedAgence.nom_agence}</h2>
                  <p style={{ color: colors.primary }}>{selectedAgence.ville}</p>
                </div>
                <button className="hse-modal-close" onClick={() => setSelectedAgence(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="hse-modal-body">
                <div className="hse-info-section" style={{ background: '#f8fafc' }}>
                  <div className="hse-info-row">
                    <span className="hse-info-label">Adresse:</span>
                    <span>{selectedAgence.adresse || 'Non renseignée'}</span>
                  </div>
                  <div className="hse-info-row">
                    <span className="hse-info-label">Téléphone:</span>
                    <span>{selectedAgence.telephone || 'Non renseigné'}</span>
                  </div>
                </div>
                
                <div className="hse-stats-section">
                  <h3>Statistiques</h3>
                  <div className="hse-stats-grid-modal">
                    <div className="hse-stat-box" style={{ borderTop: `3px solid ${colors.primary}` }}>
                      <Users size={24} style={{ color: colors.primary }} />
                      <strong>{selectedAgence.stats?.total || 0}</strong>
                      <span>Agents</span>
                    </div>
                    <div className="hse-stat-box" style={{ borderTop: `3px solid ${colors.success}` }}>
                      <UserCheck size={24} style={{ color: colors.success }} />
                      <strong>{selectedAgence.stats?.actifs || 0}</strong>
                      <span>Actifs</span>
                    </div>
                    <div className="hse-stat-box" style={{ borderTop: `3px solid ${colors.danger}` }}>
                      <UserX size={24} style={{ color: colors.danger }} />
                      <strong>{selectedAgence.stats?.inactifs || 0}</strong>
                      <span>Inactifs</span>
                    </div>
                  </div>
                </div>
                
                <div className="hse-affectation-distribution">
                  <h3>Distribution par affectation</h3>
                  <div className="hse-distribution-list">
                    {Object.entries(selectedAgence.stats?.parAffectation || {}).map(([affectation, count]) => (
                      <div key={affectation} className="hse-distribution-item">
                        <span className="hse-dist-label">{affectation}</span>
                        <div className="hse-dist-bar">
                          <div
                            className="hse-dist-fill"
                            style={{ width: `${(count / selectedAgence.stats?.total) * 100}%`, background: colors.primary }}
                          />
                        </div>
                        <span className="hse-dist-count">{count} agents</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="hse-agents-list-modal">
                  <h3>Liste des agents ({selectedAgence.stats?.total || 0})</h3>
                  <div className="hse-agents-table-mini">
                    <table>
                      <thead>
                        <tr>
                          <th>Matricule</th>
                          <th>Nom</th>
                          <th>Prénom</th>
                          <th>Affectation</th>
                          <th>Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(selectedAgence.agents || []).map(agent => (
                          <tr key={agent.matricule}>
                            <td>{agent.matricule}</td>
                            <td>{agent.nom}</td>
                            <td>{agent.prenom}</td>
                            <td>{agent.affectation}</td>
                            <td>
                              <span className={`hse-status-badge ${agent.statut}`}>
                                {agent.statut}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AffectationsView;