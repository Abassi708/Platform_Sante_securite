// frontend/components/visites/ConvocationsPage.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Mail, Send, Calendar, Clock, User, FileText,
  CheckCircle, AlertCircle, Info, Search, X,
  Building, RefreshCw, Eye, Loader, MapPin, Award, Bell, TrendingUp, Users
} from 'lucide-react';
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

const fmtDateLong = (d) => {
  if (!d) return '';
  const [year, month, day] = d.split('-');
  const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const weekdays = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
  return `${weekdays[date.getUTCDay()]} ${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
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
  const map = { Périodique: 'periodique', Reprise: 'reprise', Reclassement: 'reclassement', Embauche: 'embauche' };
  return map[type] || 'periodique';
};

// ============================================
// COMPOSANT MODAL APERÇU (VERSION RÉDUITE)
// ============================================

const PreviewModal = ({ item, open, onClose }) => {
  if (!item) return null;
  const color = avatarColor(item.type_visite);
  const agentName = item.planningAgent?.nom && item.planningAgent?.prenom 
    ? `${item.planningAgent.nom} ${item.planningAgent.prenom}` 
    : (item.nom_complet || `Agent ${item.matricule_agent}`);

  return (
    <div className={`conv-modal-overlay${open ? ' open' : ''}`} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="conv-modal" style={{ maxWidth: 380 }}>
        <div className="conv-modal-head" style={{ padding: '14px 18px' }}>
          <div className="conv-modal-head-icon"><Eye size={16} color="#3b82f6" /></div>
          <h3 style={{ fontSize: 14 }}>Aperçu convocation</h3>
          <button className="conv-modal-close" onClick={onClose}><X size={14} /></button>
        </div>

        <div className="conv-modal-body" style={{ padding: '16px 18px' }}>
          {/* Logo - réduit */}
          <div style={{ textAlign: 'center', marginBottom: 12 }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #10b981, #059669)', 
              width: 36, height: 36, borderRadius: 10, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 8px' 
            }}>
              <Mail size={18} color="white" />
            </div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', margin: 0 }}>SRTB - Service HSE</h4>
          </div>

          {/* Agent - compact */}
          <div className="conv-modal-agent-card" style={{ 
            padding: '8px 10px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10,
            background: '#f8fafc', borderRadius: 10, border: '0.5px solid #e2e8f0'
          }}>
            <div className={`conv-avatar ${color}`} style={{ width: 32, height: 32, fontSize: 12 }}>
              {initials(item.planningAgent?.nom, item.planningAgent?.prenom) || initials(item.nom_complet, null)}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{agentName}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>#{item.matricule_agent} · {item.type_visite}</div>
            </div>
          </div>

          {/* Détails - 2 colonnes compact */}
          <div style={{ 
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12,
            background: '#f8fafc', borderRadius: 10, padding: 10, border: '0.5px solid #e2e8f0'
          }}>
            <div>
              <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Date</div>
              <div style={{ fontSize: 11, fontWeight: 500 }}>{fmtDate(item.date_visite)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Heure</div>
              <div style={{ fontSize: 11, fontWeight: 500 }}>{item.heure_visite?.substring(0, 5)}</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Médecin</div>
              <div style={{ fontSize: 11 }}>Dr. M. Khelifi</div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase' }}>Lieu</div>
              <div style={{ fontSize: 11 }}>Infirmerie SRTB</div>
            </div>
          </div>

          {/* Instructions - compact */}
          <div style={{ 
            background: '#fef3c7', borderRadius: 8, padding: '8px 12px', marginBottom: 12,
            borderLeft: '2px solid #f59e0b'
          }}>
            <strong style={{ fontSize: 10, display: 'block', marginBottom: 4, color: '#92400e' }}>📋 Instructions</strong>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 10, color: '#78350f' }}>
              <li>Présence 15 min avant</li>
              <li>Carte d'identité</li>
              <li>Être à jeun si nécessaire</li>
            </ul>
          </div>

          {/* Signature - compact */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 8 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 100, height: 1, background: '#cbd5e1', margin: '0 auto 4px' }}></div>
              <p style={{ fontSize: 9, color: '#64748b', margin: 0 }}>Dr. Mahmoud Khelifi</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: 36, height: 36, border: '1px solid #cbd5e1', borderRadius: '50%', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                fontSize: 7, fontWeight: 600, color: '#94a3b8'
              }}>
                SRTB<br/>HSE
              </div>
            </div>
          </div>
        </div>

        <div className="conv-modal-foot" style={{ padding: '10px 18px' }}>
          <button className="conv-btn-cancel-modal" onClick={onClose} style={{ padding: '6px 14px', fontSize: 12 }}>Fermer</button>
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
    : (item.nom_complet || `Agent ${item.matricule_agent}`);

  const cardClass = [
    'conv-card',
    isSelected ? 'selected' : '',
    sent ? 'sent' : '',
    urgent && !sent ? 'urgent' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      <div className="conv-card-cb">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onToggleSelect(item.id_planning, e.target.checked)}
          disabled={sent}
        />
      </div>

      <div className={`conv-avatar ${color}`}>
        {initials(item.planningAgent?.nom, item.planningAgent?.prenom) || initials(item.nom_complet, null)}
      </div>

      <div className="conv-card-body">
        <div className="conv-agent-row">
          <span className="conv-agent-name">{agentName}</span>
          <span className="conv-agent-mat">#{item.matricule_agent}</span>
          <span className={`conv-badge ${typeBadgeClass(item.type_visite)}`}>{item.type_visite}</span>
          {urgent && !sent && <span className="conv-badge urgent">🔴 Urgent</span>}
          {sent && <span className="conv-badge sent">✅ Envoyée</span>}
        </div>
        <div className="conv-meta-row">
          <span className="conv-meta-item"><Calendar size={12} /> {fmtDate(item.date_visite)}</span>
          <span className="conv-meta-dot" />
          <span className="conv-meta-item"><Clock size={12} /> {item.heure_visite?.substring(0, 5)}</span>
          <span className="conv-meta-dot" />
          <span className="conv-meta-item"><User size={12} /> Dr. M. Khelifi</span>
          <span className="conv-meta-dot" />
          <span className="conv-meta-item"><Building size={12} /> Infirmerie SRTB</span>
        </div>
      </div>

      <div className="conv-card-actions">
        {sent ? (
          <span className="conv-sent-label"><CheckCircle size={14} /> Convocation envoyée</span>
        ) : (
          <>
            <button className="conv-btn-preview" onClick={() => onPreview(item)}>
              <Eye size={13} /> Aperçu
            </button>
            <button className="conv-btn-send" onClick={() => onSend(item)}>
              <Mail size={13} /> Envoyer
            </button>
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
  const agentName = item?.planningAgent?.nom && item?.planningAgent?.prenom 
    ? `${item.planningAgent.nom} ${item.planningAgent.prenom}` 
    : (item?.nom_complet || `Agent ${item?.matricule_agent}`);

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
                <div className={`conv-avatar ${color}`} style={{ width: 36, height: 36, fontSize: 12 }}>
                  {initials(item.planningAgent?.nom, item.planningAgent?.prenom) || initials(item.nom_complet, null)}
                </div>
                <div>
                  <div className="conv-modal-agent-name">{agentName}</div>
                  <div className="conv-modal-agent-sub">Matricule #{item.matricule_agent} · {item.type_visite}</div>
                </div>
              </div>

              <div className="conv-modal-details-grid">
                <div className="conv-modal-detail-item">
                  <div className="conv-modal-detail-label">Date de visite</div>
                  <div className="conv-modal-detail-value">{fmtDate(item.date_visite)}</div>
                </div>
                <div className="conv-modal-detail-item">
                  <div className="conv-modal-detail-label">Heure</div>
                  <div className="conv-modal-detail-value">{item.heure_visite?.substring(0, 5)}</div>
                </div>
                <div className="conv-modal-detail-item">
                  <div className="conv-modal-detail-label">Médecin</div>
                  <div className="conv-modal-detail-value">Dr. M. Khelifi</div>
                </div>
                <div className="conv-modal-detail-item">
                  <div className="conv-modal-detail-label">Lieu</div>
                  <div className="conv-modal-detail-value">Infirmerie SRTB</div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '10px 0 20px' }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>📬</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>
                {count} convocation{count > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: 13, color: '#64748b' }}>seront envoyées au service GRH</div>
            </div>
          )}

          <div className="conv-modal-info-box">
            <Info size={14} style={{ flexShrink: 0, marginTop: 1 }} />
            La convocation sera transmise au service GRH pour distribution à l'agent.
          </div>
        </div>

        <div className="conv-modal-foot">
          <button className="conv-btn-cancel-modal" onClick={onClose} disabled={loading}>Annuler</button>
          <button className="conv-btn-confirm-modal" onClick={onConfirm} disabled={loading}>
            {loading ? <Loader size={13} className="spinning" style={{ animation: 'conv-spin 0.8s linear infinite' }} /> : <Send size={13} />}
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
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [sendItem, setSendItem] = useState(null);
  const [sendLoading, setSendLoading] = useState(false);
  const [showSendAll, setShowSendAll] = useState(false);
  const [sendAllLoading, setSendAllLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [notification, setNotification] = useState({ show: false, type: 'info', message: '' });

  // ============================================
  // CHARGEMENT
  // ============================================

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
      
      if (convData.success) setConvocations(convData.convocations || []);
      if (statsData.success) {
        // Stocker les stats si nécessaire
      }
    } catch (err) {
      console.error(err);
      showNotif('error', 'Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ============================================
  // NOTIFICATION
  // ============================================

  const showNotif = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 4000);
  };

  // ============================================
  // FILTRES & STATS
  // ============================================

  const pendingTypes = ['Périodique', 'Reprise'];

  const filtered = useMemo(() => convocations.filter((item) => {
    const q = search.toLowerCase();
    const agentName = item.planningAgent?.nom && item.planningAgent?.prenom 
      ? `${item.planningAgent.nom} ${item.planningAgent.prenom}`.toLowerCase()
      : (item.nom_complet?.toLowerCase() || `Agent ${item.matricule_agent}`.toLowerCase());
    
    if (q && !agentName.includes(q) && !String(item.matricule_agent).includes(q)) return false;
    if (activeFilter === 'pending' && item.convocation_envoyee) return false;
    if (activeFilter === 'sent' && !item.convocation_envoyee) return false;
    if (activeFilter === 'urgent' && !item.urgent) return false;
    if (activeType !== 'all' && item.type_visite !== activeType) return false;
    return true;
  }), [convocations, search, activeFilter, activeType]);

  const stats = useMemo(() => ({
    total: convocations.length,
    pending: convocations.filter(p => !p.convocation_envoyee && pendingTypes.includes(p.type_visite)).length,
    sent: convocations.filter(p => p.convocation_envoyee).length,
    urgent: convocations.filter(p => p.urgent && !p.convocation_envoyee).length,
  }), [convocations]);

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
        showNotif('success', `Convocation envoyée pour ${sendItem.planningAgent?.nom || sendItem.nom_complet || sendItem.matricule_agent}`);
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

  const pendingItems = convocations.filter(p => !p.convocation_envoyee && pendingTypes.includes(p.type_visite));

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
        showNotif('success', `${ids.length} convocation${ids.length > 1 ? 's' : ''} envoyée${ids.length > 1 ? 's' : ''} au GRH`);
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
        <button className="conv-notif-close" onClick={() => setNotification(prev => ({ ...prev, show: false }))}>
          <X size={14} />
        </button>
      </div>

      {/* MODAL APERÇU */}
      <PreviewModal
        item={previewItem}
        open={!!previewItem}
        onClose={() => setPreviewItem(null)}
      />

      {/* MODAL ENVOI SIMPLE */}
      <SendModal
        item={sendItem}
        type="single"
        open={!!sendItem}
        onClose={() => setSendItem(null)}
        onConfirm={confirmSend}
        loading={sendLoading}
      />

      {/* MODAL ENVOI GROUPÉ */}
      <SendModal
        item={null}
        type="group"
        count={pendingItems.length}
        open={showSendAll}
        onClose={() => setShowSendAll(false)}
        onConfirm={confirmSendAll}
        loading={sendAllLoading}
      />

      {/* HEADER */}
      <div className="conv-header">
        <div className="conv-header-left">
          <div className="conv-header-icon">
            <Mail size={24} />
          </div>
          <div className="conv-header-text">
            <h1>Convocations médicales</h1>
            <p>Gestion et envoi des convocations · Service HSE</p>
          </div>
        </div>
        <div className="conv-header-right">
          <div className="conv-week-pill">
            <span>Semaine</span>
            <strong>S{getWeekNumber()} · {new Date().getFullYear()}</strong>
          </div>
          <button className="conv-btn conv-btn-ghost-light" onClick={fetchData}>
            <RefreshCw size={14} /> Actualiser
          </button>
          {stats.pending > 0 && (
            <button className="conv-btn conv-btn-emerald" onClick={() => setShowSendAll(true)}>
              <Send size={14} /> Envoyer {stats.pending} convoc.
            </button>
          )}
        </div>
      </div>

      {/* STATISTIQUES */}
      <div className="conv-stats-row">
        {[
          { key: 'all', label: 'Convocations totales', value: stats.total, iconClass: 'blue', icon: <FileText size={20} /> },
          { key: 'pending', label: 'En attente d\'envoi', value: stats.pending, iconClass: 'amber', icon: <Clock size={20} /> },
          { key: 'sent', label: 'Envoyées', value: stats.sent, iconClass: 'emerald', icon: <CheckCircle size={20} /> },
          { key: 'urgent', label: 'Urgentes', value: stats.urgent, iconClass: 'red', icon: <AlertCircle size={20} /> },
        ].map((s) => (
          <div
            key={s.key}
            className={`conv-stat-card${activeFilter === s.key ? ' active-filter' : ''}`}
            onClick={() => setActiveFilter(s.key)}
          >
            <div className={`conv-stat-icon ${s.iconClass}`}>{s.icon}</div>
            <div>
              <div className="conv-stat-value">{s.value}</div>
              <div className="conv-stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="conv-toolbar">
        <div className="conv-search-wrap">
          <span className="conv-search-icon"><Search size={14} /></span>
          <input
            type="text"
            placeholder="Rechercher un agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {[
          { key: 'all', label: 'Tous' },
          { key: 'Périodique', label: 'Périodique' },
          { key: 'Reprise', label: 'Reprise' },
          { key: 'Reclassement', label: 'Reclassement' },
          { key: 'Embauche', label: 'Embauche' },
        ].map((f) => (
          <button
            key={f.key}
            className={`conv-filter-pill${activeType === f.key ? ' active' : ''}`}
            onClick={() => setActiveType(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* SELECT ALL ROW */}
      <div className="conv-select-row">
        <label className="conv-select-all-label">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected; }}
            onChange={toggleSelectAll}
          />
          Sélectionner tout
        </label>
        {selected.size > 0 && (
          <span className="conv-sel-count">{selected.size} sélectionné{selected.size > 1 ? 's' : ''}</span>
        )}
      </div>

      {/* LISTE */}
      {loading ? (
        <div className="conv-loading-state">
          <div className="conv-spinner" />
          <span>Chargement des convocations…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="conv-empty-state">
          <div className="conv-empty-state-icon">📭</div>
          <p>Aucune convocation trouvée</p>
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

      {/* FOOTER */}
      <div className="conv-footer-note">
        SRTB · Service HSE · Infirmerie · Dr. Mahmoud Khelifi · Bizerte
      </div>

    </div>
  );
};

export default ConvocationsPage;
