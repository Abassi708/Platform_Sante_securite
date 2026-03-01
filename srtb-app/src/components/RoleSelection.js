import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Server, 
  FileText, 
  Heart, 
  UserCheck,
  Shield,
  Sparkles,
  Lock,
  Clock,
  Globe,
  Bell,
  History,
  Key
} from 'lucide-react';
import '../styles/RoleSelection.css';

const RoleSelection = () => {
  const navigate = useNavigate();
  const [hoveredRole, setHoveredRole] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [lastLogin, setLastLogin] = useState(null);
  const [greeting, setGreeting] = useState('');

  // Effet de parallaxe léger
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 10,
        y: (e.clientY / window.innerHeight - 0.5) * 10
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Mise à jour de l'heure
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Message de bienvenue selon l'heure
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Bonjour');
    else if (hour < 18) setGreeting('Bon après-midi');
    else setGreeting('Bonsoir');
  }, []);

  // Simuler une dernière connexion
  useEffect(() => {
    const saved = localStorage.getItem('lastVisit');
    if (saved) {
      setLastLogin(new Date(JSON.parse(saved)));
    } else {
      const now = new Date();
      localStorage.setItem('lastVisit', JSON.stringify(now));
      setLastLogin(now);
    }
  }, []);

  const roles = [
    {
      id: 'admin',
      nom: 'Service informatique',
      description: 'Gestion technique & sécurité',
      icon: Server,
      color: '#3B82F6',
      route: '/admin',
      badge: 'IT',
      keyType: 'Clé maître'
    },
    {
      id: 'technicien',
      nom: 'Technicien administratif',
      description: 'Suivi & reporting',
      icon: FileText,
      color: '#F59E0B',
      route: '/technicien',
      badge: 'TA',
      keyType: 'Clé de gestion'
    },
    {
      id: 'social',
      nom: 'Service social',
      description: 'Accompagnement & écoute',
      icon: Heart,
      color: '#10B981',
      route: '/social',
      badge: 'SS',
      keyType: 'Clé sociale'
    },
    {
      id: 'agent',
      nom: 'Agent',
      description: 'Espace personnel',
      icon: UserCheck,
      color: '#8B5CF6',
      route: '/agent',
      badge: 'AG',
      keyType: 'Clé personnelle'
    }
  ];

  return (
    <div className="role-selection-container">
      {/* Background avec gradient */}
      <div className="bg-gradient">
        <div className="gradient-1"></div>
        <div className="gradient-2"></div>
        <div className="gradient-3"></div>
      </div>

      {/* Éléments flottants légers */}
      <div 
        className="floating-elements"
        style={{
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`
        }}
      >
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="floating-dot"
            style={{
              top: `${Math.random() * 90 + 5}%`,
              left: `${Math.random() * 90 + 5}%`,
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              backgroundColor: i % 4 === 0 ? '#3B82F6' : 
                             i % 4 === 1 ? '#F59E0B' : 
                             i % 4 === 2 ? '#10B981' : '#8B5CF6',
              animationDelay: `${i * 0.2}s`
            }}
          />
        ))}
      </div>

      {/* Status de connexion */}
      <div className="connection-status">
        <div className="status-dot online"></div>
        <span>Connexion sécurisée • TLS 1.3</span>
      </div>

      {/* Message de bienvenue */}
      <div className="greeting-badge">
        <Bell size={12} color="#C4A962" />
        <span>{greeting}, invité</span>
      </div>

      {/* Badge d'information avec heure et dernier accès */}
      <div className="top-badge left-badge time-badge">
        <Clock size={12} color="#C4A962" />
        <div className="time-info">
          <span className="current-time">{currentTime.toLocaleTimeString('fr-FR')}</span>
          {lastLogin && (
            <span className="last-access">
              <History size={8} color="#C4A962" />
              Dernier: {lastLogin.toLocaleDateString('fr-FR')} à {lastLogin.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      <div className="top-badge right-badge">
        <Shield size={12} color="#C4A962" />
        <span>Plateforme sécurisée</span>
      </div>

      {/* Badge de localisation */}
      <div className="location-badge">
        <Globe size={10} color="#C4A962" />
        <span>Tunisie • Bizerte</span>
      </div>

      {/* Carte principale avec clés */}
      <motion.div 
        className="keys-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* En-tête */}
        <div className="keys-header">
          <div className="header-icon">
            <Key size={24} color="#C4A962" />
          </div>
          <h1>Plateforme HSE</h1>
          <p>Choisissez votre clé d'accès</p>
        </div>

        {/* Liste des clés - MÊME TAILLE QUE LA LISTE ORIGINALE */}
        <div className="keys-list">
          {roles.map((role, index) => {
            const Icon = role.icon;
            const isHovered = hoveredRole === role.id;

            return (
              <motion.div
                key={role.id}
                className="key-item"
                onClick={() => navigate(role.route)}
                onHoverStart={() => setHoveredRole(role.id)}
                onHoverEnd={() => setHoveredRole(null)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -2 }}
                style={{
                  borderColor: isHovered ? role.color : 'rgba(255,255,255,0.1)',
                  backgroundColor: isHovered ? `${role.color}08` : 'transparent'
                }}
              >
                <div className="key-icon-wrapper">
                  <div className="key-symbol" style={{ color: role.color }}>🗝️</div>
                  <div className="key-icon" style={{ backgroundColor: `${role.color}15` }}>
                    <Icon size={20} color={role.color} />
                  </div>
                </div>
                
                <div className="key-content">
                  <h3>{role.nom}</h3>
                  <p className="key-description">{role.description}</p>
                  <span className="key-type" style={{ color: role.color }}>{role.keyType}</span>
                </div>

                <div className="key-badge" style={{ backgroundColor: role.color }}>
                  {role.badge}
                </div>

                <Key size={16} color={role.color} className="key-arrow" />
              </motion.div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="keys-footer">
          <div className="footer-left">
            <Lock size={12} color="#64748b" />
            <span>© 2026 SRTB</span>
          </div>
          <div className="footer-right">
            <span>Version 2.0</span>
            <span className="footer-date">
              {currentTime.toLocaleDateString('fr-FR')}
            </span>
          </div>
        </div>

        {/* Barre de chargement subtile */}
        <motion.div 
          className="loading-bar"
          animate={{ width: ['0%', '100%', '0%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>
    </div>
  );
};

export default RoleSelection;