// src/components/AgentChatbot.jsx
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, X, Minimize2, Maximize2, Trash2, 
  HelpCircle, Clock, User as UserIcon, 
  Sparkles, MessageSquare, History, ChevronLeft,
  FileText, AlertCircle, Calendar, Activity,
  Download, Shield, TrendingUp, Star, Briefcase,
  Heart, Users, FileSignature, BarChart3, BookOpen,
  Mic, Database, Printer, Share2, Settings, LifeBuoy,
  ChevronRight, Search, Filter, Copy, Edit3, Check, XCircle,
  AlertTriangle, Info
} from 'lucide-react';
import VoiceInput from './VoiceInput';
import '../styles/AgentChatbot.css';

const AgentChatbot = ({ onClose }) => {
  // ========== ÉTATS PRINCIPAUX ==========
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('chat');
  const [quickSearch, setQuickSearch] = useState('');
  const [expandedCategory, setExpandedCategory] = useState(null);
  
  // ========== ÉTATS POUR L'ÉDITION ==========
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  
  // ========== ÉTATS POUR MODALE PROFESSIONNELLE ==========
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger'
  });
  
  // ========== REFS ==========
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const editInputRef = useRef(null);
  
  // ========== SUGGESTIONS ==========
  const suggestionCategories = [
    {
      id: 'visites',
      title: "Visites médicales",
      icon: Calendar,
      color: "#3b82f6",
      items: [
        { text: "Quand est ma prochaine visite ?", icon: "📅", description: "Date et heure de votre prochain rendez-vous", command: "Quand est ma prochaine visite ?" },
        { text: "Historique de mes visites", icon: "📋", description: "Liste de toutes vos visites passées", command: "Historique de mes visites" },
        { text: "Résultat de ma dernière visite", icon: "✓", description: "Aptitude et observations médicales", command: "Résultat de ma dernière visite" }
      ]
    },
    {
      id: 'accidents',
      title: "Accidents de travail",
      icon: AlertCircle,
      color: "#ef4444",
      items: [
        { text: "Liste de mes accidents", icon: "⚠️", description: "Tous vos accidents enregistrés", command: "Liste de mes accidents" },
        { text: "Total jours d'arrêt", icon: "📊", description: "Durée totale de vos arrêts", command: "Combien de jours d'arrêt" },
        { text: "Détails dernier accident", icon: "📝", description: "Circonstances et gravité", command: "Détails de mon dernier accident" }
      ]
    },
    {
      id: 'profil',
      title: "Informations personnelles",
      icon: UserIcon,
      color: "#10b981",
      items: [
        { text: "Mon profil complet", icon: "👤", description: "Nom, matricule, poste, agence", command: "Mes informations personnelles" },
        { text: "Mon poste actuel", icon: "💼", description: "Votre affectation et périodicité", command: "Mon poste" },
        { text: "Mon agence", icon: "🏢", description: "Coordonnées de votre agence", command: "Mon agence" }
      ]
    },
    {
      id: 'sante',
      title: "Santé & Aptitude",
      icon: Heart,
      color: "#f59e0b",
      items: [
        { text: "Statut d'aptitude", icon: "🏥", description: "Apte, inapte temporaire, etc.", command: "Suis-je apte" },
        { text: "Date de reprise", icon: "📅", description: "Quand reprendre le travail", command: "Quand reprends-je le travail" },
        { text: "Jours restants d'inaptitude", icon: "⏱️", description: "Durée restante d'arrêt", command: "Jours restants d'inaptitude" }
      ]
    },
    {
      id: 'statistiques',
      title: "Analyses & Statistiques",
      icon: BarChart3,
      color: "#8b5cf6",
      items: [
        { text: "Mes statistiques globales", icon: "📊", description: "Synthèse de vos données", command: "Mes statistiques" },
        { text: "Comparaison avec collègues", icon: "📈", description: "Moyennes et tendances", command: "Compare mes accidents" },
        { text: "Graphique de mes accidents", icon: "📉", description: "Évolution visuelle", command: "graphique de mes accidents" }
      ]
    },
    {
      id: 'documents',
      title: "Documents officiels",
      icon: FileSignature,
      color: "#6b7280",
      items: [
        { text: "Certificat d'aptitude", icon: "📄", description: "Générer votre certificat officiel", command: "génère mon certificat" },
        { text: "Déclaration d'accident", icon: "📋", description: "Générer une déclaration officielle", command: "génère ma déclaration accident" },
        { text: "Convocation visite", icon: "📅", description: "Générer votre convocation", command: "génère ma convocation" },
        { text: "Bilan annuel", icon: "📊", description: "Bilan de santé annuel", command: "génère mon bilan annuel" },
        { text: "Export complet", icon: "📦", description: "Tous vos documents en ZIP", command: "exporte tous mes documents" }
      ]
    }
  ];

  // Quick actions
  const quickActions = [
    { icon: FileText, label: "Certificat", command: "génère mon certificat", description: "Certificat médical" },
    { icon: AlertCircle, label: "Déclaration", command: "génère ma déclaration accident", description: "Déclaration accident" },
    { icon: Calendar, label: "Convocation", command: "génère ma convocation", description: "Convocation visite" },
    
  ];

  // Documentation sections
  const documentationSections = [
    { title: "🎤 Reconnaissance vocale", icon: Mic, content: "Cliquez sur le microphone et parlez." },
    { title: "📜 Historique", icon: History, content: "Accédez à vos conversations passées." },
    { title: "📄 Documents", icon: FileText, content: "Générez vos documents officiels." },
    { title: "📊 Statistiques", icon: BarChart3, content: "Analysez vos données." },
    { title: "🔍 Recherche", icon: Search, content: "Recherchez par date." },
    { title: "✏️ Gestion", icon: Edit3, content: "Copiez, modifiez ou supprimez vos messages." }
  ];

  const faqItems = [
    { question: "Comment obtenir mon certificat ?", answer: "Demandez 'génère mon certificat'" },
    { question: "Comment déclarer un accident ?", answer: "Demandez 'génère ma déclaration accident'" },
    { question: "Comment modifier un message ?", answer: "Survolez et cliquez sur l'icône crayon" }
  ];

  // ========== EFFETS ==========
  
  useEffect(() => {
    if (isOpen && messages.length === 0 && !showHistory && activeTab === 'chat') {
      loadWelcomeMessage();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !isMinimized && inputRef.current && activeTab === 'chat' && !showHistory) {
      setTimeout(() => inputRef.current.focus(), 200);
    }
  }, [isOpen, isMinimized, activeTab, showHistory]);
  
  useEffect(() => {
    if (editingMessageId && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingMessageId]);

  // ========== FONCTIONS ==========
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleVoiceTranscript = (text) => {
    setInputMessage(text);
  };

  // ========== MODALE DE CONFIRMATION PROFESSIONNELLE ==========
  const showConfirmDialog = (title, message, onConfirm, type = 'danger') => {
    setConfirmConfig({ title, message, onConfirm, type });
    setShowConfirmModal(true);
  };

  const loadWelcomeMessage = () => {
    setMessages([{
      id: 'welcome',
      type: 'bot',
      content: `**Bonjour**, je suis votre assistant santé au travail.

Je vous accompagne dans la gestion de votre suivi médical.

**Domaines :**
• Visites médicales
• Accidents de travail
• Informations personnelles
• Documents officiels

*Survolez vos messages pour les copier, modifier ou supprimer.*`,
      timestamp: new Date().toISOString()
    }]);
    setShowSuggestions(true);
    setShowHistory(false);
    setActiveTab('chat');
  };

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/chatbot/historique`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success && data.historique && data.historique.length > 0) {
        const historyMsgs = [];
        [...data.historique].reverse().forEach(item => {
          historyMsgs.push({
            id: `history-user-${item.id}`,
            type: 'user',
            content: item.message,
            timestamp: item.date
          });
          historyMsgs.push({
            id: `history-bot-${item.id}`,
            type: 'bot',
            content: item.reponse,
            timestamp: item.date
          });
        });
        setMessages(historyMsgs);
        setShowSuggestions(false);
        setShowHistory(true);
        setActiveTab('chat');
      } else {
        setMessages([{
          id: 'no-history',
          type: 'bot',
          content: `**Aucun historique**\n\nPosez votre première question.`,
          timestamp: new Date().toISOString()
        }]);
        setShowSuggestions(false);
        setShowHistory(true);
        setActiveTab('chat');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMessages([{
        id: 'error',
        type: 'bot',
        content: "Erreur chargement historique.",
        timestamp: new Date().toISOString(),
        isError: true
      }]);
      setShowHistory(true);
      setActiveTab('chat');
    } finally {
      setLoadingHistory(false);
    }
  };

  const backToHome = () => {
    loadWelcomeMessage();
    setActiveTab('chat');
    setShowHistory(false);
  };

  // ========== GESTION DES MESSAGES ==========
  
  const copyMessage = async (content) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(Date.now());
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Erreur copie:', err);
    }
  };
  
  const startEditing = (message) => {
    if (message.type !== 'user') return;
    setEditingMessageId(message.id);
    setEditingContent(message.content);
  };
  
  const saveEditedMessage = async () => {
    if (!editingContent.trim()) return;
    
    const messageToEdit = messages.find(m => m.id === editingMessageId);
    if (!messageToEdit) return;
    
    setMessages(prev => prev.map(msg => 
      msg.id === editingMessageId ? { ...msg, content: editingContent } : msg
    ));
    
    setEditingMessageId(null);
    setEditingContent('');
    
    if (messageToEdit.type === 'user') {
      setIsLoading(true);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/chatbot/message`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: editingContent })
        });
        
        const data = await response.json();
        
        if (data.success) {
          const botMessage = {
            id: Date.now(),
            type: 'bot',
            content: data.reponse,
            timestamp: new Date().toISOString()
          };
          setMessages(prev => [...prev, botMessage]);
        }
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  // 🔥 SUPPRESSION DU MESSAGE + RÉPONSE ASSOCIÉE (AVEC MODALE PROFESSIONNELLE)
  const deleteMessage = (messageId, messageType, messageTimestamp) => {
    if (messageType === 'user') {
      showConfirmDialog(
        'Supprimer le message',
        'Cette action supprimera votre message ainsi que la réponse associée. Cette opération est irréversible.',
        () => {
          const userIndex = messages.findIndex(msg => msg.id === messageId);
          if (userIndex !== -1) {
            let botResponseIndex = -1;
            for (let i = userIndex + 1; i < messages.length; i++) {
              if (messages[i].type === 'bot') {
                botResponseIndex = i;
                break;
              }
            }
            
            if (botResponseIndex !== -1) {
              const newMessages = [...messages];
              newMessages.splice(botResponseIndex, 1);
              newMessages.splice(userIndex, 1);
              setMessages(newMessages);
            } else {
              setMessages(prev => prev.filter(msg => msg.id !== messageId));
            }
          }
        },
        'danger'
      );
    } else {
      showConfirmDialog(
        'Supprimer le message',
        'Voulez-vous vraiment supprimer ce message ?',
        () => {
          setMessages(prev => prev.filter(msg => msg.id !== messageId));
        },
        'warning'
      );
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    if (showHistory) setShowHistory(false);
    
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setShowSuggestions(false);
    setActiveTab('chat');
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/chatbot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: inputMessage })
      });
      
      const data = await response.json();
      
      if (data.success) {
        const botMessage = {
          id: Date.now() + 1,
          type: 'bot',
          content: data.reponse,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, botMessage]);
      } else {
        throw new Error(data.message || 'Erreur inconnue');
      }
    } catch (error) {
      console.error('Erreur:', error);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        type: 'bot',
        content: "Une erreur technique est survenue.",
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearHistory = async () => {
    showConfirmDialog(
      'Effacer l\'historique',
      'Toutes vos conversations seront définitivement supprimées. Cette action ne peut pas être annulée.',
      async () => {
        try {
          const token = localStorage.getItem('token');
          await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/chatbot/historique`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          });
          loadWelcomeMessage();
        } catch (error) {
          console.error('Erreur:', error);
        }
      },
      'danger'
    );
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Aujourd'hui ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Hier ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
  };

  const renderMarkdown = (content) => {
    let formatted = content;
    formatted = formatted.replace(/^\*\*(.*)\*\*$/gm, '<h3>$1</h3>');
    formatted = formatted.replace(/^• (.*$)/gm, '<div class="list-item">• $1</div>');
    formatted = formatted.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="markdown-link">$1</a>');
    formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="markdown-link">$1</a>');
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formatted = formatted.replace(/\n/g, '<br/>');
    return <div className="markdown-content" dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const filteredCategories = suggestionCategories.filter(category =>
    category.title.toLowerCase().includes(quickSearch.toLowerCase()) ||
    category.items.some(item => item.text.toLowerCase().includes(quickSearch.toLowerCase()))
  );

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  return (
    <>
      <motion.button
        className={`chatbot-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {isOpen ? <X size={22} /> : <div className="fab-content"><MessageSquare size={20} /></div>}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`chatbot-window ${isMinimized ? 'minimized' : ''}`}
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className="chatbot-header">
              <div className="header-info">
                <div className="header-icon"><Briefcase size={18} /></div>
                <div><h3>Assistant Santé</h3><div className="header-status"><span className="status-dot"></span><span>Connecté</span></div></div>
              </div>
              <div className="header-actions">
                {!showHistory ? (
                  <button className="header-btn" onClick={loadHistory} title="Historique"><History size={16} /></button>
                ) : (
                  <button className="header-btn" onClick={backToHome} title="Accueil"><ChevronLeft size={16} /></button>
                )}
                <button className="header-btn" onClick={() => setIsMinimized(!isMinimized)}>
                  {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
                </button>
                <button className="header-btn" onClick={clearHistory} title="Effacer"><Trash2 size={16} /></button>
                <button className="header-btn close" onClick={handleClose}><X size={16} /></button>
              </div>
            </div>

            {/* Onglets */}
            {!isMinimized && (
              <div className="chatbot-tabs">
                <button className={`tab ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => { setActiveTab('chat'); if (showHistory) backToHome(); }}><MessageSquare size={14} /><span>Discussion</span></button>
                <button className={`tab ${activeTab === 'quick' ? 'active' : ''}`} onClick={() => setActiveTab('quick')}><Star size={14} /><span>Raccourcis</span></button>
                <button className={`tab ${activeTab === 'help' ? 'active' : ''}`} onClick={() => setActiveTab('help')}><BookOpen size={14} /><span>Aide</span></button>
              </div>
            )}

            {!isMinimized && (
              <>
                {activeTab === 'chat' && (
                  <>
                    <div className="chatbot-messages">
                      {loadingHistory ? (
                        <div className="loading-history"><div className="spinner"></div><p>Chargement...</p></div>
                      ) : (
                        messages.map((msg) => (
                          <div key={msg.id} className={`message ${msg.type} ${editingMessageId === msg.id ? 'editing' : ''}`}>
                            <div className="message-avatar">{msg.type === 'bot' ? <Briefcase size={14} /> : <UserIcon size={14} />}</div>
                            <div className="message-wrapper">
                              {editingMessageId === msg.id ? (
                                <div className="message-edit-mode">
                                  <textarea ref={editInputRef} className="message-edit-input" value={editingContent} onChange={(e) => setEditingContent(e.target.value)} rows={3} />
                                  <div className="message-edit-actions">
                                    <button className="edit-save" onClick={saveEditedMessage}><Check size={14} /> Envoyer</button>
                                    <button className="edit-cancel" onClick={() => { setEditingMessageId(null); setEditingContent(''); }}><XCircle size={14} /> Annuler</button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className={`message-bubble ${msg.isError ? 'error' : ''}`}>
                                    <div className="message-text">{renderMarkdown(msg.content)}</div>
                                    <div className="message-time">{formatDate(msg.timestamp)}</div>
                                  </div>
                                  
                                  {msg.type === 'user' && !msg.isError && (
                                    <div className="message-actions">
                                      <button className="message-action-btn" onClick={() => copyMessage(msg.content)} title="Copier"><Copy size={12} /></button>
                                      <button className="message-action-btn" onClick={() => startEditing(msg)} title="Modifier"><Edit3 size={12} /></button>
                                      <button className="message-action-btn delete" onClick={() => deleteMessage(msg.id, msg.type, msg.timestamp)} title="Supprimer"><Trash2 size={12} /></button>
                                    </div>
                                  )}
                                  
                                  {copiedMessageId === msg.id && (<div className="copy-indicator"><Check size={12} /> Copié !</div>)}
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {isLoading && (
                        <div className="message bot">
                          <div className="message-avatar"><Briefcase size={14} /></div>
                          <div className="message-wrapper"><div className="message-bubble loading"><div className="typing-indicator"><span></span><span></span><span></span></div></div></div>
                        </div>
                      )}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="quick-actions-bar">
                      {quickActions.map((action, idx) => (<button key={idx} className="quick-action" onClick={() => setInputMessage(action.command)}><action.icon size={14} /><span>{action.label}</span></button>))}
                    </div>

                    <div className="chatbot-input-area">
                      <VoiceInput onTranscript={handleVoiceTranscript} disabled={isLoading} language="fr-FR" />
                      <textarea ref={inputRef} className="chatbot-input" placeholder="Posez votre question..." value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyPress={handleKeyPress} rows={1} disabled={isLoading} />
                      <button className={`send-btn ${inputMessage.trim() && !isLoading ? 'active' : ''}`} onClick={sendMessage} disabled={!inputMessage.trim() || isLoading}><Send size={18} /></button>
                    </div>
                  </>
                )}

                {activeTab === 'quick' && (
                  <div className="quick-actions-panel">
                    <div className="panel-header"><Star size={18} /><h4>Raccourcis</h4><div className="search-bar"><Search size={14} /><input type="text" placeholder="Rechercher..." value={quickSearch} onChange={(e) => setQuickSearch(e.target.value)} /></div></div>
                    <div className="quick-categories">
                      {filteredCategories.map((category) => (
                        <div key={category.id} className="quick-category">
                          <div className="category-header" style={{ borderLeftColor: category.color }} onClick={() => setExpandedCategory(expandedCategory === category.id ? null : category.id)}>
                            <category.icon size={16} style={{ color: category.color }} /><span>{category.title}</span>
                            <ChevronRight size={14} className={`category-chevron ${expandedCategory === category.id ? 'expanded' : ''}`} />
                            <span className="category-count">{category.items.length}</span>
                          </div>
                          <div className={`category-items ${expandedCategory === category.id ? 'expanded' : ''}`}>
                            {category.items.map((item, i) => (<button key={i} className="quick-item" onClick={() => { setInputMessage(item.command); setActiveTab('chat'); }}><span className="item-icon">{item.icon}</span><div className="item-content"><span className="item-text">{item.text}</span><span className="item-description">{item.description}</span></div><ChevronRight size={12} className="item-arrow" /></button>))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'help' && (
                  <div className="help-panel">
                    <div className="panel-header"><BookOpen size={18} /><h4>Aide</h4></div>
                    <div className="help-sections">
                      {documentationSections.map((section, idx) => (<div key={idx} className="help-section"><div className="help-section-header"><section.icon size={16} /><h5>{section.title}</h5></div><p>{section.content}</p></div>))}
                    </div>
                    <div className="help-faq"><div className="faq-header"><HelpCircle size={16} /><h5>FAQ</h5></div><div className="faq-list">{faqItems.map((item, idx) => (<div key={idx} className="faq-item"><div className="faq-question"><span className="faq-icon">❓</span><span>{item.question}</span></div><div className="faq-answer"><span className="faq-answer-icon">💡</span><span>{item.answer}</span></div></div>))}</div></div>
                    <div className="help-tips"><div className="tips-header"><Sparkles size={16} /><h5>Astuces</h5></div><ul><li>🎤 Utilisez le microphone</li><li>📜 Consultez l'historique</li><li>✏️ Survolez vos messages</li></ul></div>
                  </div>
                )}

                <div className="chatbot-footer"><span>Service Santé au Travail</span></div>
              </>
            )}

            {isMinimized && (
              <div className="minimized-content" onClick={() => setIsMinimized(false)}>
                <Briefcase size={18} /><span>Assistant Santé</span>
                {messages.filter(m => m.type === 'bot').length > 0 && (<span className="last-message-preview">{messages.filter(m => m.type === 'bot').slice(-1)[0]?.content.substring(0, 35)}...</span>)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* MODALE DE CONFIRMATION PROFESSIONNELLE */}
      {showConfirmModal && (
        <div className="chatbot-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="chatbot-modal-container" onClick={e => e.stopPropagation()}>
            <div className={`chatbot-modal-header ${confirmConfig.type}`}>
              <div className="chatbot-modal-icon">
                {confirmConfig.type === 'danger' && <AlertCircle size={24} />}
                {confirmConfig.type === 'warning' && <AlertTriangle size={24} />}
                {confirmConfig.type === 'info' && <Info size={24} />}
              </div>
              <h3>{confirmConfig.title}</h3>
              <button className="chatbot-modal-close" onClick={() => setShowConfirmModal(false)}>
                <X size={18} />
              </button>
            </div>
            
            <div className="chatbot-modal-body">
              <p>{confirmConfig.message}</p>
            </div>
            
            <div className="chatbot-modal-footer">
              <button className="chatbot-modal-btn cancel" onClick={() => setShowConfirmModal(false)}>
                Annuler
              </button>
              <button 
                className={`chatbot-modal-btn confirm ${confirmConfig.type}`} 
                onClick={() => {
                  if (confirmConfig.onConfirm) confirmConfig.onConfirm();
                  setShowConfirmModal(false);
                }}
              >
                {confirmConfig.type === 'danger' && <Trash2 size={14} />}
                {confirmConfig.type === 'warning' && <AlertCircle size={14} />}
                {confirmConfig.type === 'info' && <Info size={14} />}
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AgentChatbot;