// frontend/components/visites/ConvocationsPage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Mail, Send, Calendar, Clock, User, FileText,
  CheckCircle, AlertCircle, Info, Search, X,
  Building, RefreshCw, Eye, Loader, History
} from 'lucide-react';
import AgentSearchInput from '../common/AgentSearchInput';
import '../../styles/ConvocationsPage.css';

// ============================================
// UTILITAIRES
// ============================================

const initials = (nom, prenom) => {
  if (!nom && !prenom) return '?';
  if (nom && prenom) return (nom.charAt(0) + prenom.charAt(0)).toUpperCase();
  if (nom) return nom.substring(0, 2).toUpperCase();
  return '?';
};

const fmtDate = (d) => {
  if (!d) return '';
  const [year, month, day] = d.split('-');
  return `${day}/${month}/${year}`;
};

const getWeekNumber = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
};

const avatarColor = (type) => {
  const map = { Périodique: 'blue', Reprise: 'amber', Reclassement: 'violet', Embauche: 'emerald' };
  return map[type] || 'blue';
};

const typeBadgeClass = (type) => {
  const map = { Périodique: 'periodique', Reprise: 'reprise' };
  return map[type] || 'periodique';
};

const formatLocalDate = (dateStr) => {
  if (!dateStr) return '';
  if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  }
  if (typeof dateStr === 'string' && dateStr.includes('T')) {
    const [year, month, day] = dateStr.split('T')[0].split('-');
    return `${day}/${month}/${year}`;
  }
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toLocaleDateString('fr-FR');
  }
  return dateStr;
};

// ============================================
// COMPOSANT MODAL APERÇU
// ============================================

const PreviewModal = ({ item, open, onClose }) => {
  if (!item) return null;
  const color = avatarColor(item.type_visite);
  const agentName = item.planningAgent?.nom && item.planningAgent?.prenom 
    ? `${item.planningAgent.nom} ${item.planningAgent.prenom}` 
    : `Agent ${item.matricule_agent}`;

  return (
    <div className={`conv-modal-overlay${open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="conv-modal" style={{ maxWidth: 380 }}>
        <div className="conv-modal-head">
          <div className="conv-modal-head-icon"><Eye size={16} color="#3b82f6" /></div>
          <h3>Aperçu convocation</h3>
          <button className="conv-modal-close" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="conv-modal-body">
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div className="conv-modal-logo"><Mail size={18} color="white" /></div>
            <h4>SRTB - Service HSE</h4>
          </div>
          <div className="conv-modal-agent-card">
            <div className={`conv-avatar ${color}`}>{initials(item.planningAgent?.nom, item.planningAgent?.prenom)}</div>
            <div>
              <div className="conv-modal-agent-name">{agentName}</div>
              <div className="conv-modal-agent-sub">#{item.matricule_agent} · {item.type_visite}</div>
            </div>
          </div>
          <div className="conv-modal-details">
            <div><label>Date</label><span>{fmtDate(item.date_visite)}</span></div>
            <div><label>Heure</label><span>{item.heure_visite?.substring(0, 5)}</span></div>
            <div><label>Médecin</label><span>Dr. M. Khelifi</span></div>
            <div><label>Lieu</label><span>Infirmerie SRTB</span></div>
          </div>
          <div className="conv-modal-instructions">
            <strong>📋 Instructions</strong>
            <ul><li>Présence 15 min avant</li><li>Carte d'identité</li><li>Être à jeun si nécessaire</li></ul>
          </div>
        </div>
        <div className="conv-modal-foot">
          <button className="conv-btn-cancel-modal" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT CARTE CONVOCATION
// ============================================

const ConvCard = ({ item, isSelected, onToggleSelect, onSend, onPreview }) => {
  const sent = item.convocation_envoyee;
  const urgent = item.urgent;
  const color = avatarColor(item.type_visite);
  const agentName = item.planningAgent?.nom && item.planningAgent?.prenom 
    ? `${item.planningAgent.nom} ${item.planningAgent.prenom}` 
    : `Agent ${item.matricule_agent}`;

  const cardClass = ['conv-card', isSelected ? 'selected' : '', sent ? 'sent' : '', urgent && !sent ? 'urgent' : ''].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      <div className="conv-card-cb">
        <input type="checkbox" checked={isSelected} onChange={(e) => onToggleSelect(item.id_planning, e.target.checked)} disabled={sent} />
      </div>
      <div className={`conv-avatar ${color}`}>{initials(item.planningAgent?.nom, item.planningAgent?.prenom)}</div>
      <div className="conv-card-body">
        <div className="conv-agent-row">
          <span className="conv-agent-name">{agentName}</span>
          <span className="conv-agent-mat">#{item.matricule_agent}</span>
          <span className={`conv-badge ${typeBadgeClass(item.type_visite)}`}>{item.type_visite}</span>
          {urgent && !sent && <span className="conv-badge urgent">🔴 Urgent</span>}
          {sent && <span className="conv-badge sent">✅ Envoyée</span>}
        </div>
        <div className="conv-meta-row">
          <span><Calendar size={12} /> {fmtDate(item.date_visite)}</span>
          <span><Clock size={12} /> {item.heure_visite?.substring(0, 5)}</span>
          <span><User size={12} /> Dr. M. Khelifi</span>
          <span><Building size={12} /> Infirmerie SRTB</span>
        </div>
      </div>
      <div className="conv-card-actions">
        {sent ? (
          <span className="conv-sent-label"><CheckCircle size={14} /> Convocation envoyée</span>
        ) : (
          <>
            <button className="conv-btn-preview" onClick={() => onPreview(item)}><Eye size={13} /> Aperçu</button>
            <button className="conv-btn-send" onClick={() => onSend(item)}><Mail size={13} /> Envoyer</button>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT MODAL ENVOI
// ============================================

const SendModal = ({ item, count, type, open, onClose, onConfirm, loading }) => {
  const isSingle = type === 'single';
  const color = item ? avatarColor(item.type_visite) : 'blue';
  const agentName = item?.planningAgent?.nom && item?.planningAgent?.prenom ? `${item.planningAgent.nom} ${item.planningAgent.prenom}` : `Agent ${item?.matricule_agent}`;

  return (
    <div className={`conv-modal-overlay${open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="conv-modal">
        <div className="conv-modal-head">
          <div className="conv-modal-head-icon"><Send size={18} color="#34d399" /></div>
          <h3>{isSingle ? 'Envoyer la convocation' : `Envoi groupé (${count})`}</h3>
          {!loading && <button className="conv-modal-close" onClick={onClose}><X size={15} /></button>}
        </div>
        <div className="conv-modal-body">
          {isSingle && item ? (
            <>
              <div className="conv-modal-agent-card">
                <div className={`conv-avatar ${color}`}>{initials(item.planningAgent?.nom, item.planningAgent?.prenom)}</div>
                <div><div className="conv-modal-agent-name">{agentName}</div><div className="conv-modal-agent-sub">#{item.matricule_agent} · {item.type_visite}</div></div>
              </div>
              <div className="conv-modal-details-grid">
                <div><label>Date</label><div>{fmtDate(item.date_visite)}</div></div>
                <div><label>Heure</label><div>{item.heure_visite?.substring(0, 5)}</div></div>
                <div><label>Médecin</label><div>Dr. M. Khelifi</div></div>
                <div><label>Lieu</label><div>Infirmerie SRTB</div></div>
              </div>
            </>
          ) : (
            <div className="conv-modal-group-content">
              <div>📬</div>
              <div className="conv-modal-group-count">{count} convocation{count > 1 ? 's' : ''}</div>
              <div>seront envoyées au service GRH</div>
            </div>
          )}
          <div className="conv-modal-info-box"><Info size={14} /> La convocation sera transmise au service GRH pour distribution à l'agent.</div>
        </div>
        <div className="conv-modal-foot">
          <button className="conv-btn-cancel-modal" onClick={onClose} disabled={loading}>Annuler</button>
          <button className="conv-btn-confirm-modal" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader size={13} className="spinning" /> : <Send size={13} />}
            {isSingle ? 'Envoyer' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const ConvocationsPage = () => {
  const [convocations, setConvocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('a_envoyer');
  const [activeType, setActiveType] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [sendItem, setSendItem] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [showSendAll, setShowSendAll] = useState(false);
  const [sendAllLoading, setSendAllLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [notification, setNotification] = useState({ show: false, type: 'info', message: '' });
  
  // États pour l'historique
  const [historiqueConvocations, setHistoriqueConvocations] = useState([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  
  // FILTRES HISTORIQUE
  const [filtreDateConvocation, setFiltreDateConvocation] = useState('');
  const [filtreDateVisite, setFiltreDateVisite] = useState('');
  const [filtreTypeVisite, setFiltreTypeVisite] = useState('all');
  const [filtreAgent, setFiltreAgent] = useState('all');
  
  // FILTRES ONGLET "À ENVOYER" (avec AgentSearchInput qui fonctionne)
  const [filtreDateVisiteEnvoyer, setFiltreDateVisiteEnvoyer] = useState('');
  const [filtreAgentEnvoyer, setFiltreAgentEnvoyer] = useState('');
  
  // États pour le PDF
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [selectedConvocation, setSelectedConvocation] = useState(null);
  
  const [stats, setStats] = useState({
    pending: 0,
    sent: 0,
    urgent: 0,
    total_envoyees: 0
  });

  // ============================================
  // CHARGEMENT
  // ============================================

  const fetchHistoriqueConvocations = async () => {
    console.log('🔍 Appel fetchHistoriqueConvocations');
    setLoadingHistorique(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_API_URL}/api/convocations/historique?limit=100`;
      
      if (filtreDateConvocation && filtreDateConvocation !== '') {
        url += `&date_convocation=${filtreDateConvocation}`;
      }
      if (filtreDateVisite && filtreDateVisite !== '') {
        url += `&date_visite=${filtreDateVisite}`;
      }
      if (filtreTypeVisite && filtreTypeVisite !== 'all') {
        url += `&type_visite=${encodeURIComponent(filtreTypeVisite)}`;
      }
      if (filtreAgent && filtreAgent !== 'all' && filtreAgent !== '') {
        url += `&matricule_agent=${filtreAgent}`;
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setHistoriqueConvocations(data.historique || []);
        setStats(prev => ({ ...prev, total_envoyees: data.total || data.historique?.length || 0 }));
      }
    } catch (err) {
      console.error('Erreur:', err);
      showNotif('error', 'Erreur lors du chargement de l\'historique');
    } finally {
      setLoadingHistorique(false);
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const [convRes, statsRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_URL}/api/planning/convocations-a-envoyer`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${process.env.REACT_APP_API_URL}/api/planning/convocations-stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      
      const convData = await convRes.json();
      const statsData = await statsRes.json();
      
      if (convData.success) {
        const convocationsFiltrees = (convData.convocations || []).filter(item => 
          item.type_visite === 'Périodique' || item.type_visite === 'Reprise'
        );
        setConvocations(convocationsFiltrees);
      }
      
      if (statsData.success) {
        setStats({
          pending: statsData.stats?.total_a_envoyer || 0,
          sent: statsData.stats?.total_envoyees_semaine || 0,
          urgent: statsData.stats?.a_envoyer_j7 || 0,
          total_envoyees: statsData.stats?.total_envoyees || 0
        });
      }
      
      await fetchHistoriqueConvocations();
      
    } catch (err) {
      console.error(err);
      showNotif('error', 'Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  // Recharger l'historique quand les filtres changent
  useEffect(() => {
    if (activeTab === 'historique') {
      fetchHistoriqueConvocations();
    }
  }, [filtreDateConvocation, filtreDateVisite, filtreTypeVisite, filtreAgent, activeTab]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ============================================
  // NOTIFICATION
  // ============================================

  const showNotif = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 4000);
  };

  // ============================================
  // PDF
  // ============================================

  const viewPdf = async (id_planning, agentNom, agentPrenom) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/${id_planning}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
      setSelectedConvocation({ id_planning, agentNom, agentPrenom });
      setShowPdfModal(true);
    } catch (err) {
      console.error('Erreur chargement PDF:', err);
      showNotif('error', 'Erreur lors du chargement du PDF');
    }
  };

  // ============================================
  // FILTRES POUR L'ONGLET "À ENVOYER" (CORRIGÉS)
  // ============================================

  const resetFiltresEnvoyer = () => {
    setActiveType('all');
    setFiltreDateVisiteEnvoyer('');
    setFiltreAgentEnvoyer('');
  };

  // FILTRES AVEC AgentSearchInput (qui fonctionne)
  const filtered = useMemo(() => {
    return convocations.filter((item) => {
      // 1. Filtrer par agent (recherche exacte par matricule via AgentSearchInput)
      if (filtreAgentEnvoyer && item.matricule_agent !== parseInt(filtreAgentEnvoyer)) return false;
      
      // 2. Filtrer par type (Périodique/Reprise)
      if (activeType !== 'all' && item.type_visite !== activeType) return false;
      
      // 3. Filtrer par date de visite
      if (filtreDateVisiteEnvoyer && item.date_visite !== filtreDateVisiteEnvoyer) return false;
      
      return true;
    });
  }, [convocations, filtreAgentEnvoyer, activeType, filtreDateVisiteEnvoyer]);

  // ============================================
  // SÉLECTION
  // ============================================

  const toggleSelect = (id, checked) => {
    setSelected(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(new Set(filtered.map(d => d.id_planning)));
    } else {
      setSelected(new Set());
    }
  };

  const allSelected = filtered.length > 0 && filtered.every(d => selected.has(d.id_planning));
  const someSelected = filtered.some(d => selected.has(d.id_planning)) && !allSelected;

  // ============================================
  // ENVOI INDIVIDUEL
  // ============================================

  const confirmSend = async () => {
    if (!sendItem) return;
    setSendLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/envoyer-convocation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_planning: sendItem.id_planning }),
      });
      const data = await res.json();
      if (data.success) {
        showNotif('success', `Convocation envoyée pour ${sendItem.planningAgent?.nom || sendItem.matricule_agent}`);
        setSendItem(null);
        fetchData();
      } else {
        showNotif('error', data.message || 'Erreur lors de l\'envoi');
      }
    } catch {
      showNotif('error', 'Erreur de connexion');
    } finally {
      setSendLoading(false);
    }
  };

  // ============================================
  // ENVOI GROUPÉ
  // ============================================

  const pendingItems = convocations.filter(p => !p.convocation_envoyee && (p.type_visite === 'Périodique' || p.type_visite === 'Reprise'));

  const confirmSendAll = async () => {
    setSendAllLoading(true);
    try {
      const token = localStorage.getItem('token');
      const ids = pendingItems.map(p => p.id_planning);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/envoyer-convocations-groupees`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids_planning: ids }),
      });
      const data = await res.json();
      if (data.success) {
        showNotif('success', `${ids.length} convocation${ids.length > 1 ? 's' : ''} envoyée${ids.length > 1 ? 's' : ''}`);
        setShowSendAll(false);
        setSelected(new Set());
        fetchData();
      } else {
        showNotif('error', data.message || 'Erreur lors de l\'envoi groupé');
      }
    } catch {
      showNotif('error', 'Erreur de connexion');
    } finally {
      setSendAllLoading(false);
    }
  };

  // ============================================
  // RENDU
  // ============================================

  return (
    <div className="conv-page">

      {/* NOTIFICATION */}
      <div className={`conv-notif${notification.show ? ' show' : ''}`}>
        {notification.type === 'success' && <CheckCircle size={16} color="#10b981" />}
        {notification.type === 'error' && <AlertCircle size={16} color="#ef4444" />}
        <span>{notification.message}</span>
        <button className="conv-notif-close" onClick={() => setNotification(prev => ({ ...prev, show: false }))}><X size={14} /></button>
      </div>

      {/* MODALS */}
      <PreviewModal item={previewItem} open={!!previewItem} onClose={() => setPreviewItem(null)} />
      <SendModal item={sendItem} type="single" open={!!sendItem} onClose={() => setSendItem(null)} onConfirm={confirmSend} loading={sendLoading} />
      <SendModal item={null} type="group" count={pendingItems.length} open={showSendAll} onClose={() => setShowSendAll(false)} onConfirm={confirmSendAll} loading={sendAllLoading} />

      {/* MODAL PDF */}
      {showPdfModal && pdfUrl && (
        <div className="conv-modal-overlay open" onClick={() => setShowPdfModal(false)}>
          <div className="conv-modal-content large" onClick={e => e.stopPropagation()}>
            <div className="conv-modal-header">
              <div className="conv-modal-header-icon"><FileText size={20} /></div>
              <h3>Convocation PDF</h3>
              <button className="conv-modal-close" onClick={() => setShowPdfModal(false)}><X size={18} /></button>
            </div>
            <div className="conv-modal-body" style={{ padding: 0 }}>
              <iframe 
                src={pdfUrl} 
                width="100%" 
                height="500px" 
                title="PDF Convocation"
                style={{ border: 'none' }}
              />
            </div>
            <div className="conv-modal-footer">
              <a href={pdfUrl} download={`convocation_${selectedConvocation?.id_planning}.pdf`} className="conv-btn-download">
                Télécharger PDF
              </a>
              <button className="conv-btn-secondary" onClick={() => setShowPdfModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="conv-header">
        <div className="conv-header-left">
          <div className="conv-header-icon"><Mail size={24} /></div>
          <div><h1>Convocations médicales</h1><p>Gestion et envoi des convocations · Service HSE</p></div>
        </div>
        <div className="conv-header-right">
          <div className="conv-week-pill"><span>Semaine</span><strong>S{getWeekNumber()}</strong></div>
          <button className="conv-btn conv-btn-ghost-light" onClick={fetchData}><RefreshCw size={14} /> Actualiser</button>
          {pendingItems.length > 0 && (
            <button className="conv-btn conv-btn-emerald" onClick={() => setShowSendAll(true)}><Send size={14} /> Envoyer {pendingItems.length} convoc.</button>
          )}
        </div>
      </div>

      {/* STATISTIQUES */}
      <div className="conv-stats-row">
        <div className="conv-stat-card">
          <div className="conv-stat-icon amber"><Clock size={20} /></div>
          <div><div className="conv-stat-value">{stats.pending}</div><div className="conv-stat-label">En attente</div></div>
        </div>
        <div className="conv-stat-card">
          <div className="conv-stat-icon emerald"><CheckCircle size={20} /></div>
          <div><div className="conv-stat-value">{stats.sent}</div><div className="conv-stat-label">Envoyées (semaine)</div></div>
        </div>
        <div className="conv-stat-card">
          <div className="conv-stat-icon red"><AlertCircle size={20} /></div>
          <div><div className="conv-stat-value">{stats.urgent}</div><div className="conv-stat-label">Urgentes</div></div>
        </div>
        <div className="conv-stat-card">
          <div className="conv-stat-icon purple"><History size={20} /></div>
          <div><div className="conv-stat-value">{stats.total_envoyees || 0}</div><div className="conv-stat-label">Total envoyées</div></div>
        </div>
      </div>

      {/* ONGLETS */}
      <div className="conv-tabs">
        <button 
          className={`conv-tab ${activeTab === 'a_envoyer' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('a_envoyer');
            resetFiltresEnvoyer();
          }}
        >
          <Send size={16} /> Convocations à envoyer
          <span className="conv-tab-badge">{pendingItems.length}</span>
        </button>
        <button 
          className={`conv-tab ${activeTab === 'historique' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('historique');
            fetchHistoriqueConvocations();
          }}
        >
          <History size={16} /> Historique des envois
          <span className="conv-tab-badge">{stats.total_envoyees}</span>
        </button>
      </div>

      {/* ========== ONGLET 1 : CONVOCATIONS À ENVOYER ========== */}
      {activeTab === 'a_envoyer' && (
        <>
          {/* TOOLBAR AVEC TOUS LES FILTRES */}
          <div className="conv-toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
            {/* Filtre par agent avec AgentSearchInput (fonctionnel) */}
            <div className="conv-filter-agent">
              <User size={14} />
              <AgentSearchInput
                value={filtreAgentEnvoyer}
                onChange={(matricule) => setFiltreAgentEnvoyer(matricule || '')}
                onSelect={(agent) => setFiltreAgentEnvoyer(agent?.matricule_agent || '')}
                placeholder="Filtrer par agent..."
              />
              {filtreAgentEnvoyer && (
                <button onClick={() => setFiltreAgentEnvoyer('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={12} />
                </button>
              )}
            </div>
            
            {/* Filtre par date de visite */}
            <div className="conv-filter-date">
              <Calendar size={14} />
              <input 
                type="date" 
                value={filtreDateVisiteEnvoyer} 
                onChange={(e) => setFiltreDateVisiteEnvoyer(e.target.value)}
                placeholder="Filtrer par date"
              />
              {filtreDateVisiteEnvoyer && (
                <button onClick={() => setFiltreDateVisiteEnvoyer('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={12} />
                </button>
              )}
            </div>
            
            {/* Boutons de filtre par type */}
            <div className="conv-filter-types">
              <button 
                className={`conv-filter-pill ${activeType === 'all' ? 'active' : ''}`} 
                onClick={() => setActiveType('all')}
              >
                Tous
              </button>
              <button 
                className={`conv-filter-pill ${activeType === 'Périodique' ? 'active' : ''}`} 
                onClick={() => setActiveType('Périodique')}
              >
                Périodique
              </button>
              <button 
                className={`conv-filter-pill ${activeType === 'Reprise' ? 'active' : ''}`} 
                onClick={() => setActiveType('Reprise')}
              >
                Reprise
              </button>
            </div>
            
            {/* Bouton reset filters */}
            {(filtreAgentEnvoyer || filtreDateVisiteEnvoyer || activeType !== 'all') && (
              <button className="conv-btn-reset-filters" onClick={resetFiltresEnvoyer}>
                <X size={14} /> Réinitialiser
              </button>
            )}
          </div>

          {/* SELECT ALL */}
          {filtered.length > 0 && (
            <div className="conv-select-row">
              <label>
                <input 
                  type="checkbox" 
                  checked={allSelected} 
                  ref={(el) => { if (el) el.indeterminate = someSelected; }} 
                  onChange={toggleSelectAll} 
                /> 
                Sélectionner tout ({filtered.length})
              </label>
              {selected.size > 0 && (
                <span className="conv-selected-count">
                  {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* LISTE DES CONVOCATIONS */}
          {loading ? (
            <div className="conv-loading-state">
              <div className="conv-spinner" />
              <span>Chargement des convocations…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="conv-empty-state">
              <div></div>
              <p>
                {(filtreAgentEnvoyer || filtreDateVisiteEnvoyer || activeType !== 'all') 
                  ? 'Aucune convocation ne correspond aux filtres sélectionnés'
                  : 'Aucune convocation à envoyer'}
              </p>
              {(filtreAgentEnvoyer || filtreDateVisiteEnvoyer || activeType !== 'all') && (
                <button className="conv-btn-ghost" onClick={resetFiltresEnvoyer}>
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="conv-list">
              {filtered.map((item) => (
                <ConvCard 
                  key={item.id_planning} 
                  item={item} 
                  isSelected={selected.has(item.id_planning)} 
                  onToggleSelect={toggleSelect} 
                  onSend={(i) => setSendItem(i)} 
                  onPreview={(i) => setPreviewItem(i)} 
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ========== ONGLET 2 : HISTORIQUE DES CONVOCATIONS ========== */}
      {activeTab === 'historique' && (
        <>
          {/* FILTRES AVEC DEUX DATES */}
          <div className="conv-historique-filters">
            <div className="conv-filter-group">
              <label>Date d'envoi</label>
              <input 
                type="date" 
                value={filtreDateConvocation} 
                onChange={(e) => setFiltreDateConvocation(e.target.value)} 
              />
            </div>
            <div className="conv-filter-group">
              <label> Date de visite</label>
              <input 
                type="date" 
                value={filtreDateVisite} 
                onChange={(e) => setFiltreDateVisite(e.target.value)} 
              />
            </div>
            <div className="conv-filter-group">
              <label> Type de visite</label>
              <select value={filtreTypeVisite} onChange={(e) => setFiltreTypeVisite(e.target.value)}>
                <option value="all">Tous</option>
                <option value="Périodique">Périodique</option>
                <option value="Reprise">Reprise</option>
              </select>
            </div>
            <div className="conv-filter-group">
              <label>Agent</label>
              <AgentSearchInput
                value={filtreAgent}
                onChange={(matricule) => setFiltreAgent(matricule || 'all')}
                onSelect={(agent) => setFiltreAgent(agent?.matricule_agent || 'all')}
                placeholder="Rechercher un agent..."
              />
            </div>
            <button className="conv-btn-reset" onClick={() => {
              setFiltreDateConvocation('');
              setFiltreDateVisite('');
              setFiltreTypeVisite('all');
              setFiltreAgent('all');
              fetchHistoriqueConvocations();
            }}>
              <X size={14} /> Réinitialiser
            </button>
            <button className="conv-btn-apply" onClick={fetchHistoriqueConvocations}>
              <Search size={14} /> Appliquer
            </button>
          </div>

          {/* LISTE DE L'HISTORIQUE */}
          <div className="conv-historique-section">
            <div className="conv-historique-header">
              <h3><History size={18} /> Historique des envois</h3>
              <span className="conv-historique-count">{historiqueConvocations.length} envoi(s)</span>
            </div>
            
            {loadingHistorique ? (
              <div className="conv-loading-state">Chargement...</div>
            ) : historiqueConvocations.length === 0 ? (
              <div className="conv-empty-state">Aucune convocation envoyée</div>
            ) : (
              <div className="conv-historique-list">
                {historiqueConvocations.map((conv, idx) => (
                  <div key={idx} className="conv-historique-item">
                    <div className="conv-historique-date">
                      <Calendar size={14} />
                      <div>
                        <div>{formatLocalDate(conv.date_visite)}</div>
                        <div>{conv.heure_visite?.substring(0,5)}</div>
                      </div>
                    </div>
                    <div className="conv-historique-info">
                      <div className="conv-agent-name">{conv.agent_nom} {conv.agent_prenom}</div>
                      <div className="conv-agent-mat">#{conv.matricule_agent}</div>
                      <span className="conv-type-badge">{conv.type_visite}</span>
                    </div>
                    <div className="conv-historique-meta">
                      <div>Envoyée le {formatLocalDate(conv.date_convocation)}</div>
                      <div>Par: {conv.envoyee_par_nom || 'Inconnu'}</div>
                      <button 
                        className="conv-btn-pdf" 
                        onClick={() => viewPdf(conv.id_planning, conv.agent_nom, conv.agent_prenom)}
                      >
                         Voir PDF
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* FOOTER */}
      <div className="conv-footer-note">SRTB · Service HSE · Infirmerie · Dr. Mahmoud Khelifi · Bizerte</div>

    </div>
  );
};

export default ConvocationsPage;