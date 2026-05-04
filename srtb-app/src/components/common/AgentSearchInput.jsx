// frontend/src/components/common/AgentSearchInput.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700&family=Figtree:wght@400;500;600;700&display=swap');

  /* ── CONTAINER ─────────────────────────────────────── */
  .agent-search-container {
    position: relative;
    width: 100%;
    overflow: visible !important;
    z-index: 100;
  }

  /* ── INPUT WRAPPER ─────────────────────────────────── */
  .agent-search-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;
    background: #ffffff;
    border: 1.5px solid rgba(22, 52, 86, 0.18);
    border-radius: 12px;
    transition: all 200ms cubic-bezier(.4,0,.2,1);
    box-shadow: 0 1px 3px rgba(5,16,31,0.06);
  }

  .agent-search-input-wrapper:hover {
    border-color: rgba(37, 99, 168, 0.38);
    box-shadow: 0 2px 8px rgba(5,16,31,0.09);
  }

  .agent-search-input-wrapper:focus-within {
    border-color: #2562a8;
    box-shadow: 0 0 0 3px rgba(29,78,216,0.13), 0 2px 8px rgba(5,16,31,0.08);
    background: #ffffff;
  }

  /* ── SEARCH ICON ───────────────────────────────────── */
  .agent-search-input-wrapper .search-icon {
    position: absolute;
    left: 13px;
    color: #8fadc8;
    pointer-events: none;
    transition: color 200ms ease;
    flex-shrink: 0;
  }

  .agent-search-input-wrapper:focus-within .search-icon {
    color: #2562a8;
  }

  /* ── INPUT FIELD ───────────────────────────────────── */
  .agent-search-input {
    width: 100%;
    padding: 10px 40px 10px 38px;
    border: none;
    background: transparent;
    outline: none;
    font-family: 'Figtree', 'DM Sans', -apple-system, sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    color: #0b1929;
    line-height: 1.4;
    border-radius: 12px;
  }

  .agent-search-input::placeholder {
    color: #8fadc8;
    font-weight: 400;
  }

  /* ── CLEAR BUTTON ──────────────────────────────────── */
  .clear-btn {
    position: absolute;
    right: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: #edf1f9;
    border: 1px solid rgba(22,52,86,0.14);
    border-radius: 6px;
    cursor: pointer;
    color: #5a7490;
    transition: all 200ms cubic-bezier(.4,0,.2,1);
    flex-shrink: 0;
    padding: 0;
  }

  .clear-btn:hover {
    background: rgba(225, 29, 72, 0.09);
    border-color: rgba(225, 29, 72, 0.22);
    color: #e11d48;
    transform: scale(1.1);
  }

  /* ── DROPDOWN ──────────────────────────────────────── */
  .agent-search-dropdown {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    right: 0;
    background: #ffffff;
    border: 1.5px solid rgba(22, 52, 86, 0.14);
    border-radius: 16px;
    max-height: 300px;
    overflow-y: auto;
    z-index: 9999 !important;
    box-shadow:
      0 16px 48px rgba(5,16,31,0.14),
      0 4px 12px rgba(5,16,31,0.07),
      0 0 0 1px rgba(29,78,216,0.04);
    animation: dropdownOpen 0.2s cubic-bezier(.34,1.56,.64,1);
  }

  @keyframes dropdownOpen {
    from { opacity: 0; transform: translateY(-8px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0)    scale(1);    }
  }

  .agent-search-dropdown::-webkit-scrollbar { width: 5px; }
  .agent-search-dropdown::-webkit-scrollbar-track { background: transparent; }
  .agent-search-dropdown::-webkit-scrollbar-thumb {
    background: #d1dced;
    border-radius: 99px;
  }
  .agent-search-dropdown::-webkit-scrollbar-thumb:hover { background: #96c5ee; }

  /* ── DROPDOWN ITEM ─────────────────────────────────── */
  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    cursor: pointer;
    border-bottom: 1px solid #f4f7fc;
    transition: all 180ms ease;
    position: relative;
  }

  .dropdown-item:last-child  { border-bottom: none; }

  .dropdown-item::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 0;
    background: linear-gradient(180deg, #2562a8, #163456);
    border-radius: 0 2px 2px 0;
    transition: width 180ms ease;
  }

  .dropdown-item:hover { background: #eff6ff; }
  .dropdown-item:hover::before { width: 3px; }

  .dropdown-item:first-child { border-radius: 14px 14px 0 0; }
  .dropdown-item:last-child  { border-radius: 0 0 14px 14px; }
  .dropdown-item:only-child  { border-radius: 14px; }

  /* ── AGENT AVATAR ──────────────────────────────────── */
  .agent-avatar {
    width: 38px;
    height: 38px;
    background: linear-gradient(135deg, #163456 0%, #2562a8 100%);
    color: #ffffff;
    border-radius: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Syne', sans-serif;
    font-weight: 700;
    font-size: 0.82rem;
    letter-spacing: -0.02em;
    flex-shrink: 0;
    box-shadow: 0 3px 10px rgba(22,52,86,0.22);
    transition: transform 180ms ease, box-shadow 180ms ease;
  }

  .dropdown-item:hover .agent-avatar {
    transform: scale(1.08);
    box-shadow: 0 5px 14px rgba(22,52,86,0.30);
  }

  /* ── AGENT INFO ────────────────────────────────────── */
  .agent-info {
    flex: 1;
    min-width: 0;
  }

  .agent-name {
    font-family: 'Figtree', sans-serif;
    font-weight: 700;
    font-size: 0.875rem;
    color: #0b1929;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    letter-spacing: -0.01em;
  }

  .agent-details {
    display: flex;
    gap: 6px;
    font-size: 0.72rem;
    color: #5a7490;
    margin-top: 3px;
    flex-wrap: wrap;
    align-items: center;
  }

  .agent-matricule {
    font-weight: 700;
    color: #1e4876;
    font-variant-numeric: tabular-nums;
    background: #eff6ff;
    border: 1px solid #dbeafe;
    padding: 1px 7px;
    border-radius: 99px;
    font-size: 0.68rem;
  }

  .agent-post {
    background: rgba(13,148,136,0.09);
    border: 1px solid rgba(13,148,136,0.18);
    color: #0d7068;
    padding: 1px 7px;
    border-radius: 99px;
    font-size: 0.68rem;
    font-weight: 600;
  }

  .agent-agence {
    background: rgba(124,58,237,0.08);
    border: 1px solid rgba(124,58,237,0.16);
    color: #6d28d9;
    padding: 1px 7px;
    border-radius: 99px;
    font-size: 0.68rem;
    font-weight: 600;
  }

  /* ── LOADING ───────────────────────────────────────── */
  .dropdown-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 22px 16px;
    color: #5a7490;
    font-family: 'Figtree', sans-serif;
    font-size: 0.82rem;
    font-weight: 500;
  }

  .spinner-small {
    width: 18px;
    height: 18px;
    border: 2px solid #e2e9f5;
    border-top-color: #2562a8;
    border-radius: 50%;
    animation: agentSpin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes agentSpin { to { transform: rotate(360deg); } }

  /* ── EMPTY ─────────────────────────────────────────── */
  .dropdown-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    padding: 22px 16px;
    color: #8fadc8;
    font-family: 'Figtree', sans-serif;
    font-size: 0.82rem;
    font-weight: 500;
  }

  .dropdown-empty svg { color: #96c5ee; }

  /* ── CONTEXT OVERRIDES ─────────────────────────────── */
  .sp-filters-body .agent-search-container,
  .conv-historique-filters .agent-search-container,
  .ha-filters .agent-search-container,
  .conv-toolbar .agent-search-container,
  .conv-filter-agent .agent-search-container {
    overflow: visible !important;
    z-index: 200;
  }

  .sp-filters-body .agent-search-dropdown,
  .conv-historique-filters .agent-search-dropdown,
  .ha-filters .agent-search-dropdown,
  .conv-toolbar .agent-search-dropdown,
  .conv-filter-agent .agent-search-dropdown {
    z-index: 10000 !important;
  }

  .sp-history-group .agent-search-container { overflow: visible !important; z-index: 200; }
  .sp-history-group .agent-search-dropdown  { z-index: 10000 !important; }

  .conv-filter-agent .agent-search-input-wrapper {
    border: none;
    background: transparent;
    box-shadow: none;
  }
  .conv-filter-agent .agent-search-input-wrapper:focus-within {
    border: none;
    box-shadow: none;
  }
  .conv-filter-agent .agent-search-input { padding-left: 32px; font-size: 0.84rem; }

  /* ── RESPONSIVE ────────────────────────────────────── */
  @media (max-width: 768px) {
    .agent-search-input { font-size: 0.84rem; padding: 9px 36px; }
    .agent-search-dropdown { max-height: 240px; }
    .agent-avatar { width: 34px; height: 34px; border-radius: 9px; font-size: 0.76rem; }
    .agent-name { font-size: 0.84rem; }
  }
`;

const AgentSearchInput = ({ value, onChange, onSelect, placeholder = "Rechercher un agent...", className = "" }) => {
  const [searchTerm, setSearchTerm]   = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const debounceRef  = useRef();
  const inputRef     = useRef();
  const dropdownRef  = useRef();

  const loadAllAgents = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/agents`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      const data = await response.json();
      if (data.success) setSuggestions(data.agents);
    } catch (err) {
      console.error('Erreur chargement agents:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const filterAgents = useCallback((query) => {
    if (!query || query.length < 2) { loadAllAgents(); return; }
    const token = localStorage.getItem('token');
    fetch(
      `${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/agents`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const filtered = data.agents.filter(agent =>
            String(agent.matricule_agent).includes(query) ||
            agent.nom?.toLowerCase().includes(query.toLowerCase()) ||
            agent.prenom?.toLowerCase().includes(query.toLowerCase()) ||
            `${agent.nom} ${agent.prenom}`.toLowerCase().includes(query.toLowerCase())
          );
          setSuggestions(filtered.slice(0, 15));
        }
      })
      .catch(err => console.error('Erreur:', err));
  }, [loadAllAgents]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchTerm.length >= 2 ? filterAgents(searchTerm) : loadAllAgents();
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchTerm, filterAgents, loadAllAgents]);

  useEffect(() => { loadAllAgents(); }, [loadAllAgents]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current    && !inputRef.current.contains(e.target)
      ) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (agent) => {
    setSelectedAgent(agent);
    setSearchTerm(`${agent.nom} ${agent.prenom} (${agent.matricule_agent})`);
    setShowDropdown(false);
    if (onSelect) onSelect(agent);
    if (onChange) onChange(agent.matricule_agent);
  };

  const handleClear = () => {
    setSelectedAgent(null);
    setSearchTerm('');
    setSuggestions([]);
    if (onSelect) onSelect(null);
    if (onChange) onChange('');
    loadAllAgents();
  };

  return (
    <>
      <style>{styles}</style>

      <div className={`agent-search-container ${className}`}>

        {/* ── INPUT ── */}
        <div className="agent-search-input-wrapper">
          <Search size={16} className="search-icon" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setShowDropdown(true);
              if (selectedAgent) setSelectedAgent(null);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder={placeholder}
            className="agent-search-input"
          />
          {searchTerm && (
            <button className="clear-btn" onClick={handleClear}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* ── DROPDOWN ── */}
        {showDropdown && (
          <div ref={dropdownRef} className="agent-search-dropdown">
            {loading ? (
              <div className="dropdown-loading">
                <div className="spinner-small" />
                <span>Chargement...</span>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="dropdown-empty">
                <AlertCircle size={16} />
                <span>Aucun agent trouvé</span>
              </div>
            ) : (
              suggestions.map(agent => (
                <div
                  key={agent.matricule_agent}
                  className="dropdown-item"
                  onClick={() => handleSelect(agent)}
                >
                  <div className="agent-avatar">
                    {agent.nom?.charAt(0)}{agent.prenom?.charAt(0)}
                  </div>
                  <div className="agent-info">
                    <div className="agent-name">{agent.nom} {agent.prenom}</div>
                    <div className="agent-details">
                      <span className="agent-matricule">#{agent.matricule_agent}</span>
                      <span className="agent-post">
                        {agent.code_affectation === 3 ? 'Chauffeur' : 'Contrôleur'}
                      </span>
                      {agent.code_agence && (
                        <span className="agent-agence">Agence {agent.code_agence}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>
    </>
  );
};

export default AgentSearchInput;