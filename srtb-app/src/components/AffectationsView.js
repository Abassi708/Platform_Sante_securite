// frontend/src/components/AffectationsView.js
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Briefcase, Building2, Users, UserCheck, UserX, Clock, Heart,
  ChevronRight, TrendingUp, AlertCircle, BarChart, PieChart,
  Activity, Truck, Shield
} from 'lucide-react';
import '../styles/AffectationsView.css';

const AffectationsView = () => {
  const [affectations, setAffectations] = useState([]);
  const [agences, setAgences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('affectations');
  const [selectedAffectation, setSelectedAffectation] = useState(null);
  const [selectedAgence, setSelectedAgence] = useState(null);

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
    if (libelle === 'Conducteur') return '#f59e0b';
    if (libelle === 'Contrôleur') return '#10b981';
    return '#2563eb';
  };

  if (loading) {
    return (
      <div className="affectations-loading">
        <div className="spinner"></div>
        <p>Chargement des données...</p>
      </div>
    );
  }

  return (
    <div className="affectations-container">
      <div className="affectations-header">
        <div className="header-left">
          <h2>
            <BarChart size={24} />
            Distribution des Agents
          </h2>
          <p>Consultez la répartition des agents par affectation et par agence</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'affectations' ? 'active' : ''}`}
          onClick={() => setActiveTab('affectations')}
        >
          <Briefcase size={18} />
          Par affectation
        </button>
        <button
          className={`tab-btn ${activeTab === 'agences' ? 'active' : ''}`}
          onClick={() => setActiveTab('agences')}
        >
          <Building2 size={18} />
          Par agence
        </button>
      </div>

      {/* Vue par affectation */}
      {activeTab === 'affectations' && (
        <div className="affectations-grid">
          {affectations.map(affectation => (
            <motion.div
              key={affectation.code_affectation}
              className="affectation-card"
              whileHover={{ y: -4 }}
              onClick={() => setSelectedAffectation(affectation)}
            >
              <div
                className="card-icon"
                style={{ background: `${getAffectationColor(affectation.libelle_affectation)}20`, color: getAffectationColor(affectation.libelle_affectation) }}
              >
                {getAffectationIcon(affectation.libelle_affectation)}
              </div>
              <div className="card-content">
                <h3>{affectation.libelle_affectation}</h3>
                <p className="description">{affectation.description || 'Aucune description'}</p>
                <div className="periodicite-info">
                  <Clock size={14} />
                  <span>Périodicité: {affectation.periodiciteTexte}</span>
                </div>
              </div>
              <div className="card-stats">
                <div className="stat-item">
                  <Users size={16} />
                  <strong>{affectation.stats.total}</strong>
                  <span>agents</span>
                </div>
                <div className="stat-details">
                  <span className="actif"><UserCheck size={12} /> {affectation.stats.actifs}</span>
                  <span className="maladie"><Heart size={12} /> {affectation.stats.maladies}</span>
                  <span className="conge"><Clock size={12} /> {affectation.stats.conges}</span>
                </div>
              </div>
              <ChevronRight size={18} className="card-arrow" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Vue par agence */}
      {activeTab === 'agences' && (
        <div className="agences-grid">
          {agences.map(agence => (
            <motion.div
              key={agence.code_agence}
              className="agence-card"
              whileHover={{ y: -4 }}
              onClick={() => setSelectedAgence(agence)}
            >
              <div className="card-header-agence">
                <div className="agence-icon" style={{ background: '#2563eb20', color: '#2563eb' }}>
                  <Building2 size={24} />
                </div>
                <div className="agence-info">
                  <h3>{agence.nom_agence}</h3>
                  <p>{agence.ville}</p>
                  {agence.telephone && <small>{agence.telephone}</small>}
                </div>
              </div>
              <div className="agence-stats">
                <div className="stat-main">
                  <Users size={20} />
                  <span className="stat-number">{agence.stats.total}</span>
                  <span className="stat-label">agents</span>
                </div>
                <div className="stat-breakdown">
                  <span className="actif">Actifs: {agence.stats.actifs}</span>
                  <span className="inactif">Inactifs: {agence.stats.inactifs}</span>
                </div>
              </div>
              <div className="affectation-breakdown">
                <p className="breakdown-title">Répartition par affectation:</p>
                <div className="breakdown-list">
                  {Object.entries(agence.stats.parAffectation).map(([affectation, count]) => (
                    <span key={affectation} className="breakdown-item">
                      <Briefcase size={12} />
                      {affectation}: {count}
                    </span>
                  ))}
                </div>
              </div>
              <ChevronRight size={18} className="card-arrow" />
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal détails affectation */}
      {selectedAffectation && (
        <div className="modal-overlay" onClick={() => setSelectedAffectation(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header" style={{ background: `${getAffectationColor(selectedAffectation.libelle_affectation)}20` }}>
              <div className="header-icon" style={{ background: getAffectationColor(selectedAffectation.libelle_affectation), color: 'white' }}>
                {getAffectationIcon(selectedAffectation.libelle_affectation)}
              </div>
              <h2>{selectedAffectation.libelle_affectation}</h2>
              <button className="modal-close" onClick={() => setSelectedAffectation(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-section">
                <p className="description-full">{selectedAffectation.description || 'Aucune description disponible'}</p>
                <div className="info-row">
                  <Clock size={16} />
                  <span>Périodicité des visites: <strong>{selectedAffectation.periodiciteTexte}</strong></span>
                </div>
              </div>
              
              <div className="stats-section">
                <h3>Statistiques des agents</h3>
                <div className="stats-grid-modal">
                  <div className="stat-box">
                    <Users size={24} />
                    <strong>{selectedAffectation.stats.total}</strong>
                    <span>Total agents</span>
                  </div>
                  <div className="stat-box">
                    <UserCheck size={24} />
                    <strong>{selectedAffectation.stats.actifs}</strong>
                    <span>Actifs</span>
                  </div>
                  <div className="stat-box">
                    <Heart size={24} />
                    <strong>{selectedAffectation.stats.maladies}</strong>
                    <span>Maladie</span>
                  </div>
                  <div className="stat-box">
                    <Clock size={24} />
                    <strong>{selectedAffectation.stats.conges}</strong>
                    <span>Congé</span>
                  </div>
                </div>
              </div>
              
              <div className="agents-list-modal">
                <h3>Liste des agents ({selectedAffectation.stats.total})</h3>
                <div className="agents-table-mini">
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
                      {selectedAffectation.agents.map(agent => (
                        <tr key={agent.matricule}>
                          <td>{agent.matricule}</td>
                          <td>{agent.nom}</td>
                          <td>{agent.prenom}</td>
                          <td>
                            <span className={`status-badge ${agent.statut}`}>
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
          </div>
        </div>
      )}

      {/* Modal détails agence */}
      {selectedAgence && (
        <div className="modal-overlay" onClick={() => setSelectedAgence(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="header-icon" style={{ background: '#2563eb20', color: '#2563eb' }}>
                <Building2 size={24} />
              </div>
              <div>
                <h2>{selectedAgence.nom_agence}</h2>
                <p>{selectedAgence.ville}</p>
              </div>
              <button className="modal-close" onClick={() => setSelectedAgence(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="info-section">
                <div className="info-row">
                  <span>Adresse:</span>
                  <span>{selectedAgence.adresse || 'Non renseignée'}</span>
                </div>
                <div className="info-row">
                  <span>Téléphone:</span>
                  <span>{selectedAgence.telephone || 'Non renseigné'}</span>
                </div>
              </div>
              
              <div className="stats-section">
                <h3>Statistiques</h3>
                <div className="stats-grid-modal">
                  <div className="stat-box">
                    <Users size={24} />
                    <strong>{selectedAgence.stats.total}</strong>
                    <span>Agents</span>
                  </div>
                  <div className="stat-box">
                    <UserCheck size={24} />
                    <strong>{selectedAgence.stats.actifs}</strong>
                    <span>Actifs</span>
                  </div>
                  <div className="stat-box">
                    <UserX size={24} />
                    <strong>{selectedAgence.stats.inactifs}</strong>
                    <span>Inactifs</span>
                  </div>
                </div>
              </div>
              
              <div className="affectation-distribution">
                <h3>Distribution par affectation</h3>
                <div className="distribution-list">
                  {Object.entries(selectedAgence.stats.parAffectation).map(([affectation, count]) => (
                    <div key={affectation} className="distribution-item">
                      <span className="dist-label">{affectation}</span>
                      <div className="dist-bar">
                        <div
                          className="dist-fill"
                          style={{ width: `${(count / selectedAgence.stats.total) * 100}%`, background: getAffectationColor(affectation) }}
                        />
                      </div>
                      <span className="dist-count">{count} agents</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="agents-list-modal">
                <h3>Liste des agents ({selectedAgence.stats.total})</h3>
                <div className="agents-table-mini">
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
                      {selectedAgence.agents.map(agent => (
                        <tr key={agent.matricule}>
                          <td>{agent.matricule}</td>
                          <td>{agent.nom}</td>
                          <td>{agent.prenom}</td>
                          <td>{agent.affectation}</td>
                          <td>
                            <span className={`status-badge ${agent.statut}`}>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default AffectationsView;