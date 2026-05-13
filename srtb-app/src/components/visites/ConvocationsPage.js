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

const conv_initials = (nom, prenom) => {
  if (!nom && !prenom) return '?';
  if (nom && prenom) return (nom.charAt(0) + prenom.charAt(0)).toUpperCase();
  if (nom) return nom.substring(0, 2).toUpperCase();
  return '?';
};

const conv_fmtDate = (d) => {
  if (!d) return '';
  const [year, month, day] = d.split('-');
  return `${day}/${month}/${year}`;
};

const conv_getWeekNumber = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
};

const conv_avatarColor = (type) => {
  const map = { Périodique: 'blue', Reprise: 'amber', Reclassement: 'violet', Embauche: 'emerald' };
  return map[type] || 'blue';
};

const conv_typeBadgeClass = (type) => {
  const map = { Périodique: 'periodique', Reprise: 'reprise' };
  return map[type] || 'periodique';
};

const conv_formatLocalDate = (dateStr) => {
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

const ConvPreviewModal = ({ item, open, conv_onClose }) => {
  if (!item) return null;
  const color = conv_avatarColor(item.type_visite);
  const agentName = item.planningAgent?.nom && item.planningAgent?.prenom 
    ? `${item.planningAgent.nom} ${item.planningAgent.prenom}` 
    : `Agent ${item.matricule_agent}`;

  return (
    <div className={`conv-modal-overlay${open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && conv_onClose()}>
      <div className="conv-modal" style={{ maxWidth: 380 }}>
        <div className="conv-modal-head">
          <div className="conv-modal-head-icon"><Eye size={16} color="#3b82f6" /></div>
          <h3>Aperçu convocation</h3>
          <button className="conv-modal-close" onClick={conv_onClose}><X size={14} /></button>
        </div>
        <div className="conv-modal-body">
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div className="conv-modal-logo"><Mail size={18} color="white" /></div>
            <h4>SRTB - Service HSE</h4>
          </div>
          <div className="conv-modal-agent-card">
            <div className={`conv-avatar ${color}`}>{conv_initials(item.planningAgent?.nom, item.planningAgent?.prenom)}</div>
            <div>
              <div className="conv-modal-agent-name">{agentName}</div>
              <div className="conv-modal-agent-sub">#{item.matricule_agent} · {item.type_visite}</div>
            </div>
          </div>
          <div className="conv-modal-details">
            <div><label>Date</label><span>{conv_fmtDate(item.date_visite)}</span></div>
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
          <button className="conv-btn-cancel-modal" onClick={conv_onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT CARTE CONVOCATION
// ============================================

const ConvCard = ({ item, isSelected, conv_onToggleSelect, conv_onSend, conv_onPreview }) => {
  const sent = item.convocation_envoyee;
  const urgent = item.urgent;
  const color = conv_avatarColor(item.type_visite);
  const agentName = item.planningAgent?.nom && item.planningAgent?.prenom 
    ? `${item.planningAgent.nom} ${item.planningAgent.prenom}` 
    : `Agent ${item.matricule_agent}`;

  const cardClass = ['conv-card', isSelected ? 'selected' : '', sent ? 'sent' : '', urgent && !sent ? 'urgent' : ''].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      <div className="conv-card-cb">
        <input type="checkbox" checked={isSelected} onChange={(e) => conv_onToggleSelect(item.id_planning, e.target.checked)} disabled={sent} />
      </div>
      <div className={`conv-avatar ${color}`}>{conv_initials(item.planningAgent?.nom, item.planningAgent?.prenom)}</div>
      <div className="conv-card-body">
        <div className="conv-agent-row">
          <span className="conv-agent-name">{agentName}</span>
          <span className="conv-agent-mat">#{item.matricule_agent}</span>
          <span className={`conv-badge ${conv_typeBadgeClass(item.type_visite)}`}>{item.type_visite}</span>
          {urgent && !sent && <span className="conv-badge urgent">🔴 Urgent</span>}
          {sent && <span className="conv-badge sent">✅ Envoyée</span>}
        </div>
        <div className="conv-meta-row">
          <span><Calendar size={12} /> {conv_fmtDate(item.date_visite)}</span>
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
            <button className="conv-btn-preview" onClick={() => conv_onPreview(item)}><Eye size={13} /> Aperçu</button>
            <button className="conv-btn-send" onClick={() => conv_onSend(item)}><Mail size={13} /> Envoyer</button>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================
// COMPOSANT MODAL ENVOI
// ============================================

const ConvSendModal = ({ item, count, type, open, conv_onClose, conv_onConfirm, loading }) => {
  const isSingle = type === 'single';
  const color = item ? conv_avatarColor(item.type_visite) : 'blue';
  const agentName = item?.planningAgent?.nom && item?.planningAgent?.prenom ? `${item.planningAgent.nom} ${item.planningAgent.prenom}` : `Agent ${item?.matricule_agent}`;

  return (
    <div className={`conv-modal-overlay${open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && conv_onClose()}>
      <div className="conv-modal">
        <div className="conv-modal-head">
          <div className="conv-modal-head-icon"><Send size={18} color="#34d399" /></div>
          <h3>{isSingle ? 'Envoyer la convocation' : `Envoi groupé (${count})`}</h3>
          {!loading && <button className="conv-modal-close" onClick={conv_onClose}><X size={15} /></button>}
        </div>
        <div className="conv-modal-body">
          {isSingle && item ? (
            <>
              <div className="conv-modal-agent-card">
                <div className={`conv-avatar ${color}`}>{conv_initials(item.planningAgent?.nom, item.planningAgent?.prenom)}</div>
                <div><div className="conv-modal-agent-name">{agentName}</div><div className="conv-modal-agent-sub">#{item.matricule_agent} · {item.type_visite}</div></div>
              </div>
              <div className="conv-modal-details-grid">
                <div><label>Date</label><div>{conv_fmtDate(item.date_visite)}</div></div>
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
          <button className="conv-btn-cancel-modal" onClick={conv_onClose} disabled={loading}>Annuler</button>
          <button className="conv-btn-confirm-modal" onClick={conv_onConfirm} disabled={loading}>
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
  const [conv_convocations, setConv_convocations] = useState([]);
  const [conv_loading, setConv_loading] = useState(true);
  const [conv_activeTab, setConv_activeTab] = useState('a_envoyer');
  const [conv_activeType, setConv_activeType] = useState('all');
  const [conv_selected, setConv_selected] = useState(new Set());
  const [conv_sendItem, setConv_sendItem] = useState(null);
  const [conv_sendLoading, setConv_sendLoading] = useState(false);
  const [conv_showSendAll, setConv_showSendAll] = useState(false);
  const [conv_sendAllLoading, setConv_sendAllLoading] = useState(false);
  const [conv_previewItem, setConv_previewItem] = useState(null);
  const [conv_notification, setConv_notification] = useState({ show: false, type: 'info', message: '' });
  
  // États pour l'historique
  const [conv_historiqueConvocations, setConv_historiqueConvocations] = useState([]);
  const [conv_loadingHistorique, setConv_loadingHistorique] = useState(false);
  
  // FILTRES HISTORIQUE
  const [conv_filtreDateConvocation, setConv_filtreDateConvocation] = useState('');
  const [conv_filtreDateVisite, setConv_filtreDateVisite] = useState('');
  const [conv_filtreTypeVisite, setConv_filtreTypeVisite] = useState('all');
  const [conv_filtreAgent, setConv_filtreAgent] = useState('all');
  
  // FILTRES ONGLET "À ENVOYER"
  const [conv_filtreDateVisiteEnvoyer, setConv_filtreDateVisiteEnvoyer] = useState('');
  const [conv_filtreAgentEnvoyer, setConv_filtreAgentEnvoyer] = useState('');
  
  // États pour le PDF
  const [conv_showPdfModal, setConv_showPdfModal] = useState(false);
  const [conv_pdfUrl, setConv_pdfUrl] = useState('');
  const [conv_selectedConvocation, setConv_selectedConvocation] = useState(null);
  
  const [conv_stats, setConv_stats] = useState({
    pending: 0,
    sent: 0,
    urgent: 0,
    total_envoyees: 0
  });

  // ============================================
  // CHARGEMENT
  // ============================================

  const conv_fetchHistoriqueConvocations = async () => {
    console.log('🔍 Appel fetchHistoriqueConvocations');
    setConv_loadingHistorique(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${process.env.REACT_APP_API_URL}/api/convocations/historique?limit=100`;
      
      if (conv_filtreDateConvocation && conv_filtreDateConvocation !== '') {
        url += `&date_convocation=${conv_filtreDateConvocation}`;
      }
      if (conv_filtreDateVisite && conv_filtreDateVisite !== '') {
        url += `&date_visite=${conv_filtreDateVisite}`;
      }
      if (conv_filtreTypeVisite && conv_filtreTypeVisite !== 'all') {
        url += `&type_visite=${encodeURIComponent(conv_filtreTypeVisite)}`;
      }
      if (conv_filtreAgent && conv_filtreAgent !== 'all' && conv_filtreAgent !== '') {
        url += `&matricule_agent=${conv_filtreAgent}`;
      }
      
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setConv_historiqueConvocations(data.historique || []);
        setConv_stats(prev => ({ ...prev, total_envoyees: data.total || data.historique?.length || 0 }));
      }
    } catch (err) {
      console.error('Erreur:', err);
      conv_showNotif('error', 'Erreur lors du chargement de l\'historique');
    } finally {
      setConv_loadingHistorique(false);
    }
  };

  const conv_fetchData = useCallback(async () => {
    setConv_loading(true);
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
        setConv_convocations(convocationsFiltrees);
      }
      
      if (statsData.success) {
        setConv_stats({
          pending: statsData.stats?.total_a_envoyer || 0,
          sent: statsData.stats?.total_envoyees_semaine || 0,
          urgent: statsData.stats?.a_envoyer_j7 || 0,
          total_envoyees: statsData.stats?.total_envoyees || 0
        });
      }
      
      await conv_fetchHistoriqueConvocations();
      
    } catch (err) {
      console.error(err);
      conv_showNotif('error', 'Erreur de chargement des données');
    } finally {
      setConv_loading(false);
    }
  }, []);

  // Recharger l'historique quand les filtres changent
  useEffect(() => {
    if (conv_activeTab === 'historique') {
      conv_fetchHistoriqueConvocations();
    }
  }, [conv_filtreDateConvocation, conv_filtreDateVisite, conv_filtreTypeVisite, conv_filtreAgent, conv_activeTab]);

  useEffect(() => { conv_fetchData(); }, [conv_fetchData]);

  // ============================================
  // NOTIFICATION
  // ============================================

  const conv_showNotif = (type, message) => {
    setConv_notification({ show: true, type, message });
    setTimeout(() => setConv_notification(prev => ({ ...prev, show: false })), 4000);
  };

  // ============================================
  // PDF
  // ============================================

  const conv_viewPdf = async (id_planning, agentNom, agentPrenom) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/${id_planning}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setConv_pdfUrl(url);
      setConv_selectedConvocation({ id_planning, agentNom, agentPrenom });
      setConv_showPdfModal(true);
    } catch (err) {
      console.error('Erreur chargement PDF:', err);
      conv_showNotif('error', 'Erreur lors du chargement du PDF');
    }
  };

  // ============================================
  // FILTRES POUR L'ONGLET "À ENVOYER"
  // ============================================

  const conv_resetFiltresEnvoyer = () => {
    setConv_activeType('all');
    setConv_filtreDateVisiteEnvoyer('');
    setConv_filtreAgentEnvoyer('');
  };

  const conv_filtered = useMemo(() => {
    return conv_convocations.filter((item) => {
      if (conv_filtreAgentEnvoyer && item.matricule_agent !== parseInt(conv_filtreAgentEnvoyer)) return false;
      if (conv_activeType !== 'all' && item.type_visite !== conv_activeType) return false;
      if (conv_filtreDateVisiteEnvoyer && item.date_visite !== conv_filtreDateVisiteEnvoyer) return false;
      return true;
    });
  }, [conv_convocations, conv_filtreAgentEnvoyer, conv_activeType, conv_filtreDateVisiteEnvoyer]);

  // ============================================
  // SÉLECTION
  // ============================================

  const conv_toggleSelect = (id, checked) => {
    setConv_selected(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  };

  const conv_toggleSelectAll = (e) => {
    if (e.target.checked) {
      setConv_selected(new Set(conv_filtered.map(d => d.id_planning)));
    } else {
      setConv_selected(new Set());
    }
  };

  const conv_allSelected = conv_filtered.length > 0 && conv_filtered.every(d => conv_selected.has(d.id_planning));
  const conv_someSelected = conv_filtered.some(d => conv_selected.has(d.id_planning)) && !conv_allSelected;
  const conv_pendingItems = conv_convocations.filter(p => !p.convocation_envoyee && (p.type_visite === 'Périodique' || p.type_visite === 'Reprise'));

  // ============================================
  // ENVOI INDIVIDUEL
  // ============================================

  const conv_confirmSend = async () => {
    if (!conv_sendItem) return;
    setConv_sendLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/envoyer-convocation`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_planning: conv_sendItem.id_planning }),
      });
      const data = await res.json();
      if (data.success) {
        conv_showNotif('success', `Convocation envoyée pour ${conv_sendItem.planningAgent?.nom || conv_sendItem.matricule_agent}`);
        setConv_sendItem(null);
        conv_fetchData();
      } else {
        conv_showNotif('error', data.message || 'Erreur lors de l\'envoi');
      }
    } catch {
      conv_showNotif('error', 'Erreur de connexion');
    } finally {
      setConv_sendLoading(false);
    }
  };

  // ============================================
  // ENVOI GROUPÉ
  // ============================================

  const conv_confirmSendAll = async () => {
    setConv_sendAllLoading(true);
    try {
      const token = localStorage.getItem('token');
      const ids = conv_pendingItems.map(p => p.id_planning);
      const res = await fetch(`${process.env.REACT_APP_API_URL}/api/planning/envoyer-convocations-groupees`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids_planning: ids }),
      });
      const data = await res.json();
      if (data.success) {
        conv_showNotif('success', `${ids.length} convocation${ids.length > 1 ? 's' : ''} envoyée${ids.length > 1 ? 's' : ''}`);
        setConv_showSendAll(false);
        setConv_selected(new Set());
        conv_fetchData();
      } else {
        conv_showNotif('error', data.message || 'Erreur lors de l\'envoi groupé');
      }
    } catch {
      conv_showNotif('error', 'Erreur de connexion');
    } finally {
      setConv_sendAllLoading(false);
    }
  };

  // ============================================
  // RENDU
  // ============================================

  return (
    <div className="conv-page">

      {/* NOTIFICATION */}
      <div className={`conv-notif${conv_notification.show ? ' show' : ''}`}>
        {conv_notification.type === 'success' && <CheckCircle size={16} color="#10b981" />}
        {conv_notification.type === 'error' && <AlertCircle size={16} color="#ef4444" />}
        <span>{conv_notification.message}</span>
        <button className="conv-notif-close" onClick={() => setConv_notification(prev => ({ ...prev, show: false }))}><X size={14} /></button>
      </div>

      {/* MODALS */}
      <ConvPreviewModal item={conv_previewItem} open={!!conv_previewItem} conv_onClose={() => setConv_previewItem(null)} />
      <ConvSendModal item={conv_sendItem} type="single" open={!!conv_sendItem} conv_onClose={() => setConv_sendItem(null)} conv_onConfirm={conv_confirmSend} loading={conv_sendLoading} />
      <ConvSendModal item={null} type="group" count={conv_pendingItems.length} open={conv_showSendAll} conv_onClose={() => setConv_showSendAll(false)} conv_onConfirm={conv_confirmSendAll} loading={conv_sendAllLoading} />

      {/* MODAL PDF */}
      {conv_showPdfModal && conv_pdfUrl && (
        <div className="conv-modal-overlay open" onClick={() => setConv_showPdfModal(false)}>
          <div className="conv-modal-content large" onClick={e => e.stopPropagation()}>
            <div className="conv-modal-header">
              <div className="conv-modal-header-icon"><FileText size={20} /></div>
              <h3>Convocation PDF</h3>
              <button className="conv-modal-close" onClick={() => setConv_showPdfModal(false)}><X size={18} /></button>
            </div>
            <div className="conv-modal-body" style={{ padding: 0 }}>
              <iframe 
                src={conv_pdfUrl} 
                width="100%" 
                height="500px" 
                title="PDF Convocation"
                style={{ border: 'none' }}
              />
            </div>
            <div className="conv-modal-footer">
              <a href={conv_pdfUrl} download={`convocation_${conv_selectedConvocation?.id_planning}.pdf`} className="conv-btn-download">
                Télécharger PDF
              </a>
              <button className="conv-btn-secondary" onClick={() => setConv_showPdfModal(false)}>Fermer</button>
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
          <div className="conv-week-pill"><span>Semaine</span><strong>S{conv_getWeekNumber()}</strong></div>
          <button className="conv-btn conv-btn-ghost-light" onClick={conv_fetchData}><RefreshCw size={14} /> Actualiser</button>
          {conv_pendingItems.length > 0 && (
            <button className="conv-btn conv-btn-emerald" onClick={() => setConv_showSendAll(true)}><Send size={14} /> Envoyer {conv_pendingItems.length} convoc.</button>
          )}
        </div>
      </div>

      {/* STATISTIQUES */}
      <div className="conv-stats-row">
        <div className="conv-stat-card">
          <div className="conv-stat-icon amber"><Clock size={20} /></div>
          <div><div className="conv-stat-value">{conv_stats.pending}</div><div className="conv-stat-label">En attente</div></div>
        </div>
        <div className="conv-stat-card">
          <div className="conv-stat-icon emerald"><CheckCircle size={20} /></div>
          <div><div className="conv-stat-value">{conv_stats.sent}</div><div className="conv-stat-label">Envoyées (semaine)</div></div>
        </div>
        <div className="conv-stat-card">
          <div className="conv-stat-icon red"><AlertCircle size={20} /></div>
          <div><div className="conv-stat-value">{conv_stats.urgent}</div><div className="conv-stat-label">Urgentes</div></div>
        </div>
        <div className="conv-stat-card">
          <div className="conv-stat-icon purple"><History size={20} /></div>
          <div><div className="conv-stat-value">{conv_stats.total_envoyees || 0}</div><div className="conv-stat-label">Total envoyées</div></div>
        </div>
      </div>

      {/* ONGLETS */}
      <div className="conv-tabs">
        <button 
          className={`conv-tab ${conv_activeTab === 'a_envoyer' ? 'active' : ''}`}
          onClick={() => {
            setConv_activeTab('a_envoyer');
            conv_resetFiltresEnvoyer();
          }}
        >
          <Send size={16} /> Convocations à envoyer
          <span className="conv-tab-badge">{conv_pendingItems.length}</span>
        </button>
        <button 
          className={`conv-tab ${conv_activeTab === 'historique' ? 'active' : ''}`}
          onClick={() => {
            setConv_activeTab('historique');
            conv_fetchHistoriqueConvocations();
          }}
        >
          <History size={16} /> Historique des envois
          <span className="conv-tab-badge">{conv_stats.total_envoyees}</span>
        </button>
      </div>

      {/* ========== ONGLET 1 : CONVOCATIONS À ENVOYER ========== */}
      {conv_activeTab === 'a_envoyer' && (
        <>
          {/* TOOLBAR AVEC TOUS LES FILTRES */}
          <div className="conv-toolbar" style={{ flexWrap: 'wrap', gap: '10px' }}>
            {/* Filtre par agent avec AgentSearchInput */}
            <div className="conv-filter-agent">
              <User size={14} />
              <AgentSearchInput
                value={conv_filtreAgentEnvoyer}
                onChange={(matricule) => setConv_filtreAgentEnvoyer(matricule || '')}
                onSelect={(agent) => setConv_filtreAgentEnvoyer(agent?.matricule_agent || '')}
                placeholder="Filtrer par agent..."
              />
              {conv_filtreAgentEnvoyer && (
                <button onClick={() => setConv_filtreAgentEnvoyer('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={12} />
                </button>
              )}
            </div>
            
            {/* Filtre par date de visite */}
            <div className="conv-filter-date">
              <Calendar size={14} />
              <input 
                type="date" 
                value={conv_filtreDateVisiteEnvoyer} 
                onChange={(e) => setConv_filtreDateVisiteEnvoyer(e.target.value)}
                placeholder="Filtrer par date"
              />
              {conv_filtreDateVisiteEnvoyer && (
                <button onClick={() => setConv_filtreDateVisiteEnvoyer('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={12} />
                </button>
              )}
            </div>
            
            {/* Boutons de filtre par type */}
            <div className="conv-filter-types">
              <button 
                className={`conv-filter-pill ${conv_activeType === 'all' ? 'active' : ''}`} 
                onClick={() => setConv_activeType('all')}
              >
                Tous
              </button>
              <button 
                className={`conv-filter-pill ${conv_activeType === 'Périodique' ? 'active' : ''}`} 
                onClick={() => setConv_activeType('Périodique')}
              >
                Périodique
              </button>
              <button 
                className={`conv-filter-pill ${conv_activeType === 'Reprise' ? 'active' : ''}`} 
                onClick={() => setConv_activeType('Reprise')}
              >
                Reprise
              </button>
            </div>
            
            {/* Bouton reset filters */}
            {(conv_filtreAgentEnvoyer || conv_filtreDateVisiteEnvoyer || conv_activeType !== 'all') && (
              <button className="conv-btn-reset-filters" onClick={conv_resetFiltresEnvoyer}>
                <X size={14} /> Réinitialiser
              </button>
            )}
          </div>

          {/* SELECT ALL */}
          {conv_filtered.length > 0 && (
            <div className="conv-select-row">
              <label>
                <input 
                  type="checkbox" 
                  checked={conv_allSelected} 
                  ref={(el) => { if (el) el.indeterminate = conv_someSelected; }} 
                  onChange={conv_toggleSelectAll} 
                /> 
                Sélectionner tout ({conv_filtered.length})
              </label>
              {conv_selected.size > 0 && (
                <span className="conv-selected-count">
                  {conv_selected.size} sélectionné{conv_selected.size > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}

          {/* LISTE DES CONVOCATIONS */}
          {conv_loading ? (
            <div className="conv-loading-state">
              <div className="conv-spinner" />
              <span>Chargement des convocations…</span>
            </div>
          ) : conv_filtered.length === 0 ? (
            <div className="conv-empty-state">
              <div></div>
              <p>
                {(conv_filtreAgentEnvoyer || conv_filtreDateVisiteEnvoyer || conv_activeType !== 'all') 
                  ? 'Aucune convocation ne correspond aux filtres sélectionnés'
                  : 'Aucune convocation à envoyer'}
              </p>
              {(conv_filtreAgentEnvoyer || conv_filtreDateVisiteEnvoyer || conv_activeType !== 'all') && (
                <button className="conv-btn-ghost" onClick={conv_resetFiltresEnvoyer}>
                  Réinitialiser les filtres
                </button>
              )}
            </div>
          ) : (
            <div className="conv-list">
              {conv_filtered.map((item) => (
                <ConvCard 
                  key={item.id_planning} 
                  item={item} 
                  isSelected={conv_selected.has(item.id_planning)} 
                  conv_onToggleSelect={conv_toggleSelect} 
                  conv_onSend={(i) => setConv_sendItem(i)} 
                  conv_onPreview={(i) => setConv_previewItem(i)} 
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ========== ONGLET 2 : HISTORIQUE DES CONVOCATIONS ========== */}
      {conv_activeTab === 'historique' && (
        <>
          {/* FILTRES AVEC DEUX DATES */}
          <div className="conv-historique-filters">
            <div className="conv-filter-group">
              <label>Date d'envoi</label>
              <input 
                type="date" 
                value={conv_filtreDateConvocation} 
                onChange={(e) => setConv_filtreDateConvocation(e.target.value)} 
              />
            </div>
            <div className="conv-filter-group">
              <label>Date de visite</label>
              <input 
                type="date" 
                value={conv_filtreDateVisite} 
                onChange={(e) => setConv_filtreDateVisite(e.target.value)} 
              />
            </div>
            <div className="conv-filter-group">
              <label>Type de visite</label>
              <select value={conv_filtreTypeVisite} onChange={(e) => setConv_filtreTypeVisite(e.target.value)}>
                <option value="all">Tous</option>
                <option value="Périodique">Périodique</option>
                <option value="Reprise">Reprise</option>
              </select>
            </div>
            <div className="conv-filter-group">
              <label>Agent</label>
              <AgentSearchInput
                value={conv_filtreAgent}
                onChange={(matricule) => setConv_filtreAgent(matricule || 'all')}
                onSelect={(agent) => setConv_filtreAgent(agent?.matricule_agent || 'all')}
                placeholder="Rechercher un agent..."
              />
            </div>
            <button className="conv-btn-reset" onClick={() => {
              setConv_filtreDateConvocation('');
              setConv_filtreDateVisite('');
              setConv_filtreTypeVisite('all');
              setConv_filtreAgent('all');
              conv_fetchHistoriqueConvocations();
            }}>
              <X size={14} /> Réinitialiser
            </button>
            <button className="conv-btn-apply" onClick={conv_fetchHistoriqueConvocations}>
              <Search size={14} /> Appliquer
            </button>
          </div>

          {/* LISTE DE L'HISTORIQUE */}
          <div className="conv-historique-section">
            <div className="conv-historique-header">
              <h3><History size={18} /> Historique des envois</h3>
              <span className="conv-historique-count">{conv_historiqueConvocations.length} envoi(s)</span>
            </div>
            
            {conv_loadingHistorique ? (
              <div className="conv-loading-state">Chargement...</div>
            ) : conv_historiqueConvocations.length === 0 ? (
              <div className="conv-empty-state">Aucune convocation envoyée</div>
            ) : (
              <div className="conv-historique-list">
                {conv_historiqueConvocations.map((conv, idx) => (
                  <div key={idx} className="conv-historique-item">
                    <div className="conv-historique-date">
                      <Calendar size={14} />
                      <div>
                        <div>{conv_formatLocalDate(conv.date_visite)}</div>
                        <div>{conv.heure_visite?.substring(0,5)}</div>
                      </div>
                    </div>
                    <div className="conv-historique-info">
                      <div className="conv-agent-name">{conv.agent_nom} {conv.agent_prenom}</div>
                      <div className="conv-agent-mat">#{conv.matricule_agent}</div>
                      <span className="conv-type-badge">{conv.type_visite}</span>
                    </div>
                    <div className="conv-historique-meta">
                      <div>Envoyée le {conv_formatLocalDate(conv.date_convocation)}</div>
                      <div>Par: {conv.envoyee_par_nom || 'Inconnu'}</div>
                      <button 
                        className="conv-btn-pdf" 
                        onClick={() => conv_viewPdf(conv.id_planning, conv.agent_nom, conv.agent_prenom)}
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