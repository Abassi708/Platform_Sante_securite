import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { 
  Shield, TrendingUp, Brain, MessageSquare, Calendar, Award, 
  ArrowRight, Phone, Mail, MapPin, LogIn, Menu, X, 
  Activity, CheckCircle, Users, Clock, 
  Facebook, Twitter, Linkedin, Youtube, Sparkles, 
  Rocket, Star, Heart, Bell, 
  Target, ShieldCheck, 
  Settings, FileText, UserCheck, ChevronDown,
  Server, Wrench, Users2, UserCog, Briefcase, 
  Stethoscope, HeartPulse, Zap, Fingerprint,
  Globe, Layers, Cpu, Network, ChevronRight,
  Grid, List, Menu as MenuIcon,
  BarChart3, PieChart, TrendingUp as TrendingUpIcon, AlertTriangle,
  Building2, Bus, Truck, Home, CheckCircle2, Award as AwardIcon,
  LineChart, Activity as ActivityIcon, Thermometer, Droplet,
  Wind, Sun, Moon, Cloud, Umbrella, Leaf, TreePine,
  FlaskRound, Beaker, Microscope, Dna, Atom,
  Code, Database, Cloud as CloudIcon, Lock, Key,
  Radio, Satellite, Wifi, Cable, CircuitBoard
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/HomePage.css';

const HomePage = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('accueil');
  const [hoveredActor, setHoveredActor] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [counts, setCounts] = useState({
    agents: 0,
    jours: 0,
    visites: 0,
    agences: 0,
    satisfaction: 0,
    prevention: 0,
    alertes: 0
  });
  const containerRef = useRef(null);
  
  // Mouse position for 3D effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { stiffness: 100, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 100, damping: 30 });

  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10]);

  // Animation des compteurs
  useEffect(() => {
    const interval = setInterval(() => {
      setCounts(prev => ({
        agents: prev.agents < 1247 ? prev.agents + 7 : 1247,
        jours: prev.jours < 127 ? prev.jours + 1 : 127,
        visites: prev.visites < 342 ? prev.visites + 2 : 342,
        agences: prev.agences < 12 ? prev.agences + 1 : 12,
        satisfaction: prev.satisfaction < 98 ? prev.satisfaction + 1 : 98,
        prevention: prev.prevention < 94 ? prev.prevention + 1 : 94,
        alertes: prev.alertes < 3 ? prev.alertes + 1 : 3
      }));
    }, 30);
    return () => clearInterval(interval);
  }, []);

  // Rotation automatique des tabs
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % 4);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
      const scrollPosition = window.scrollY + 100;
      const sections = ['accueil', 'solutions', 'innovation', 'contact', 'impact'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    const handleMouseMove = (e) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [mouseX, mouseY]);

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMenuOpen(false);
    setActiveDropdown(null);
  };

  // ===== FONCTION DE REDIRECTION POUR TOUS LES ACTEURS =====
  const handleActorClick = (actorId) => {
    console.log('Actor clicked:', actorId); // Pour déboguer
    
    if (actorId === 'informatique') {
      navigate('/admin'); // Redirection vers AdminLogin
    } else if (actorId === 'technicien') {
      navigate('/technicien'); // Redirection vers TechnicienLogin
    } else if (actorId === 'social') {
      navigate('/social'); // Redirection vers SocialLogin
    } else if (actorId === 'agent') {
      navigate('/agent'); // Redirection vers AgentLogin
    } else {
      scrollToSection(actorId); // Pour les autres, scroll normal
    }
  };

  // ===== LOGO SRTB OFFICIEL =====
  const SRTBOfficialLogo = () => (
    <motion.svg 
      width="60" 
      height="60" 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      animate={{
        filter: [
          'drop-shadow(0 0 5px rgba(249,168,38,0.3))',
          'drop-shadow(0 0 15px rgba(249,168,38,0.6))',
          'drop-shadow(0 0 5px rgba(249,168,38,0.3))'
        ]
      }}
      transition={{ duration: 2, repeat: Infinity }}
    >
      <defs>
        <linearGradient id="srtbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1A3B5D" />
          <stop offset="50%" stopColor="#F9A826" />
          <stop offset="100%" stopColor="#2C7DA0" />
        </linearGradient>
        <filter id="srtbGlow">
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      
      <circle cx="100" cy="100" r="90" stroke="url(#srtbGradient)" strokeWidth="3" fill="none" strokeDasharray="10 5">
        <animate attributeName="strokeDashoffset" values="0;300" dur="30s" repeatCount="indefinite" />
      </circle>
      
      <path 
        d="M100 25 L150 50 L150 100 L100 130 L50 100 L50 50 L100 25Z" 
        fill="url(#srtbGradient)" 
        fillOpacity="0.15" 
        stroke="#F9A826" 
        strokeWidth="3"
      />
      
      <text x="55" y="115" fontFamily="Arial Black" fontSize="36" fill="white" filter="url(#srtbGlow)">S</text>
      <text x="88" y="115" fontFamily="Arial Black" fontSize="36" fill="white" filter="url(#srtbGlow)">R</text>
      <text x="121" y="115" fontFamily="Arial Black" fontSize="36" fill="white" filter="url(#srtbGlow)">T</text>
      <text x="154" y="115" fontFamily="Arial Black" fontSize="36" fill="white" filter="url(#srtbGlow)">B</text>
      
      <circle cx="40" cy="40" r="5" fill="#F9A826" filter="url(#srtbGlow)">
        <animate attributeName="r" values="4;7;4" dur="3s" repeatCount="indefinite" />
      </circle>
      <circle cx="160" cy="160" r="5" fill="#2C7DA0" filter="url(#srtbGlow)">
        <animate attributeName="r" values="4;7;4" dur="3.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="50" cy="150" r="3" fill="#1A3B5D" filter="url(#srtbGlow)">
        <animate attributeName="r" values="3;5;3" dur="2.5s" repeatCount="indefinite" />
      </circle>
    </motion.svg>
  );

  // ===== ACTEURS POUR LA NAVBAR =====
  const acteurs = [
    { 
      id: 'informatique',
      nom: 'Service informatique', 
      icon: Server, 
      color: '#3B82F6',
      description: 'Gestion technique & sécurité',
      gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
      badge: 'IT'
    },
    { 
      id: 'technicien',
      nom: 'Technicien administratif', 
      icon: FileText, 
      color: '#F59E0B',
      description: 'Suivi & reporting',
      gradient: 'linear-gradient(135deg, #F59E0B, #D97706)',
      badge: 'TA'
    },
    { 
      id: 'social',
      nom: 'Service social', 
      icon: Heart, 
      color: '#10B981',
      description: 'Accompagnement social',
      gradient: 'linear-gradient(135deg, #10B981, #059669)',
      badge: 'SS'
    },
    { 
      id: 'agent',
      nom: 'Agent', 
      icon: UserCheck, 
      color: '#8B5CF6',
      description: 'Espace personnel',
      gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
      badge: 'AG'
    }
  ];

  // Solutions pour le dropdown
  const solutions = [
    { id: 'analyse', label: 'Analyse décisionnelle', icon: TrendingUp, desc: 'Tableaux de bord & KPIs', color: '#1A3B5D' },
    { id: 'prediction', label: 'Prédiction des risques', icon: Brain, desc: 'IA & analyse prédictive', color: '#F9A826' },
    { id: 'assistant', label: 'Assistant IA', icon: MessageSquare, desc: 'Chatbot intelligent', color: '#2C7DA0' },
    { id: 'medical', label: 'Suivi médical', icon: Calendar, desc: 'Planning automatisé', color: '#1A3B5D' }
  ];

  // Données pour la section Impact
  const impactData = [
    {
      icon: Users,
      value: counts.agents,
      label: 'Agents protégés',
      color: '#3B82F6',
      chart: [65, 70, 75, 80, 85, 90, 95, 100],
      trend: '+12%'
    },
    {
      icon: Heart,
      value: counts.jours,
      label: 'Jours sans accident',
      color: '#10B981',
      chart: [20, 40, 60, 80, 100, 120, 127, 127],
      trend: 'Record'
    },
    {
      icon: Calendar,
      value: counts.visites,
      label: 'Visites/mois',
      color: '#F59E0B',
      chart: [200, 250, 280, 300, 320, 340, 342, 342],
      trend: '+8%'
    },
    {
      icon: Brain,
      value: counts.prevention + '%',
      label: 'Prévention des risques',
      color: '#8B5CF6',
      chart: [70, 75, 80, 85, 90, 92, 94, 94],
      trend: '+15%'
    }
  ];

  // Technologies innovantes
  const technologies = [
    { icon: Cpu, name: 'IA Prédictive', desc: 'Algorithmes de machine learning', color: '#F9A826' },
    { icon: Database, name: 'Big Data', desc: 'Analyse en temps réel', color: '#1A3B5D' },
    { icon: Lock, name: 'Blockchain', desc: 'Sécurité des données', color: '#2C7DA0' },
    { icon: Radio, name: 'IoT', desc: 'Capteurs connectés', color: '#10B981' },
    { icon: Atom, name: 'Quantum', desc: 'Calcul avancé', color: '#8B5CF6' },
    { icon: Microscope, name: 'R&D', desc: 'Innovation continue', color: '#F59E0B' }
  ];

  // Objets 3D
  const objects3D = [
    { 
      Icon: Shield, 
      color: '#1A3B5D', 
      size: 40, 
      position: { top: '15%', left: '5%' },
      rotationSpeed: 10,
      floatSpeed: 3,
      delay: 0,
    },
    { 
      Icon: Target, 
      color: '#F9A826', 
      size: 45, 
      position: { top: '70%', right: '8%' },
      rotationSpeed: 8,
      floatSpeed: 4,
      delay: 0.5,
    },
    { 
      Icon: Atom, 
      color: '#2C7DA0', 
      size: 42, 
      position: { bottom: '20%', left: '12%' },
      rotationSpeed: 12,
      floatSpeed: 3.5,
      delay: 1,
    },
    { 
      Icon: Cpu, 
      color: '#F9A826', 
      size: 48, 
      position: { top: '40%', right: '15%' },
      rotationSpeed: 15,
      floatSpeed: 5,
      delay: 1.5,
    },
    { 
      Icon: Database, 
      color: '#1A3B5D', 
      size: 44, 
      position: { bottom: '40%', right: '10%' },
      rotationSpeed: 9,
      floatSpeed: 4,
      delay: 2,
    },
    { 
      Icon: Brain, 
      color: '#F9A826', 
      size: 50, 
      position: { top: '80%', left: '8%' },
      rotationSpeed: 11,
      floatSpeed: 4.5,
      delay: 2.5,
    }
  ];

  return (
    <div className="srtb-premium" ref={containerRef}>
      {/* Background cosmique */}
      <div className="bg-cosmic">
        <div className="gradient-orb orb1"></div>
        <div className="gradient-orb orb2"></div>
        <div className="gradient-orb orb3"></div>
        <div className="grid-pattern"></div>
        <div className="stars-3d"></div>
        <div className="nebula-effect"></div>
      </div>

      {/* Objets 3D flottants */}
      <div className="objects-3d-container">
        {objects3D.map((obj, index) => (
          <motion.div
            key={index}
            className="object-3d"
            style={{
              top: obj.position.top,
              left: obj.position.left,
              right: obj.position.right,
              bottom: obj.position.bottom,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.7, scale: 1 }}
            transition={{ delay: obj.delay, duration: 1.5 }}
          >
            <motion.div
              className="object-inner"
              animate={{
                rotate: [0, 360],
                y: [-5, 5, -5]
              }}
              transition={{
                rotate: { duration: obj.rotationSpeed, repeat: Infinity, ease: "linear" },
                y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
              }}
            >
              <div 
                className="object-icon-wrapper"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${obj.color}30, transparent)`,
                  borderColor: obj.color,
                  boxShadow: `0 20px 40px -10px ${obj.color}`
                }}
              >
                <obj.Icon size={obj.size} color={obj.color} />
              </div>
            </motion.div>

            <motion.div 
              className="orbital-ring"
              style={{ borderColor: obj.color }}
              animate={{
                rotate: [0, 360],
                scale: [1, 1.3, 1]
              }}
              transition={{
                duration: obj.floatSpeed * 2,
                repeat: Infinity,
                ease: "linear"
              }}
            />
          </motion.div>
        ))}
      </div>

      {/* Badge 3D gauche */}
      <motion.div 
        className="badge-3d left-badge-3d"
        style={{
          rotateX: useTransform(springY, [-0.5, 0.5], [5, -5]),
          rotateY: useTransform(springX, [-0.5, 0.5], [-5, 5]),
        }}
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <ShieldCheck size={16} color="#F9A826" />
        <span>Certifié ISO 45001</span>
        <div className="badge-glow-3d"></div>
      </motion.div>

      {/* Navbar */}
      <motion.nav 
        className={`navbar-smart ${scrolled ? 'scrolled' : ''}`}
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 100 }}
      >
        <div className="nav-container-smart">
          {/* Background glassmorphism */}
          <div className="nav-backdrop-smart">
            <div className="nav-shine"></div>
          </div>
          
          {/* LOGO SRTB OFFICIEL */}
          <motion.div 
            className="nav-logo-smart"
            onClick={() => scrollToSection('accueil')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="logo-3d-container">
              <SRTBOfficialLogo />
              <motion.div 
                className="logo-glow"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            
            <div className="logo-text-container">
              <motion.div 
                className="logo-title"
                animate={{
                  textShadow: [
                    '0 0 5px rgba(249,168,38,0.5)',
                    '0 0 15px rgba(249,168,38,0.8)',
                    '0 0 5px rgba(249,168,38,0.5)'
                  ]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                SRTB
              </motion.div>
              <div className="logo-subtitle">
                <HeartPulse size={12} color="#F9A826" />
                <span>MÉDECINE · SANTÉ · SÉCURITÉ</span>
                <Shield size={12} color="#2C7DA0" />
              </div>
            </div>
          </motion.div>

          {/* Acteurs */}
          <div className="nav-actors-smart">
            {acteurs.map((actor) => {
              const Icon = actor.icon;
              const isHovered = hoveredActor === actor.id;
              
              return (
                <motion.div
                  key={actor.id}
                  className="actor-wrapper-smart"
                  onHoverStart={() => setHoveredActor(actor.id)}
                  onHoverEnd={() => setHoveredActor(null)}
                >
                  <motion.button
                    className="actor-btn-smart"
                    onClick={() => handleActorClick(actor.id)}
                    whileHover={{ y: -3, scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      background: isHovered ? `${actor.color}15` : 'rgba(255,255,255,0.02)',
                      borderColor: isHovered ? actor.color : 'rgba(255,255,255,0.1)'
                    }}
                  >
                    <Icon size={18} color={isHovered ? actor.color : '#94A3B8'} />
                    
                    <div className="actor-dot" style={{ background: actor.color }} />
                    
                    <motion.div 
                      className="actor-pulse-smart"
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [0.2, 0, 0.2]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{ background: `radial-gradient(circle, ${actor.color}40, transparent)` }}
                    />
                  </motion.button>
                  
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div 
                        className="actor-tooltip-smart"
                        initial={{ opacity: 0, y: 10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      >
                        <span className="tooltip-name">{actor.nom}</span>
                        <span className="tooltip-desc">{actor.description}</span>
                        <div className="tooltip-arrow" style={{ borderTopColor: actor.color }} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>

          {/* Bouton Solutions */}
          <div className="nav-solutions-wrapper">
            <motion.button
              className={`solutions-btn-smart ${activeDropdown === 'solutions' ? 'active' : ''}`}
              onClick={() => setActiveDropdown(activeDropdown === 'solutions' ? null : 'solutions')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="solutions-btn-content">
                <Layers size={16} className="solutions-icon" />
                <span>Solutions</span>
                <motion.div
                  animate={{ rotate: activeDropdown === 'solutions' ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="solutions-arrow"
                >
                  <ChevronDown size={14} />
                </motion.div>
              </div>
              
              <div className="solutions-glow"></div>
            </motion.button>

            <AnimatePresence>
              {activeDropdown === 'solutions' && (
                <motion.div 
                  className="solutions-dropdown-smart"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                >
                  <div className="dropdown-header">
                    <Grid size={14} color="#F9A826" />
                    <span>Nos solutions</span>
                  </div>
                  
                  <div className="dropdown-items">
                    {solutions.map((sol, index) => {
                      const Icon = sol.icon;
                      return (
                        <motion.div
                          key={sol.id}
                          className="dropdown-item-smart"
                          onClick={() => {
                            scrollToSection(sol.id);
                            setActiveDropdown(null);
                          }}
                          whileHover={{ x: 5 }}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="dropdown-item-icon" style={{ background: `${sol.color}15` }}>
                            <Icon size={16} color={sol.color} />
                          </div>
                          <div className="dropdown-item-content">
                            <span className="dropdown-item-title">{sol.label}</span>
                            <span className="dropdown-item-desc">{sol.desc}</span>
                          </div>
                          <ChevronRight size={12} color="#F9A826" className="dropdown-item-arrow" />
                        </motion.div>
                      );
                    })}
                  </div>
                  
                  <div className="dropdown-footer">
                    <Zap size={12} color="#F9A826" />
                    <span>4 solutions innovantes</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bouton Contact */}
          <motion.button 
            className="contact-btn-smart"
            onClick={() => scrollToSection('contact')}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="contact-icon-wrapper">
              <Phone size={16} />
            </div>
            <span>Contact</span>
            <div className="contact-ripple"></div>
          </motion.button>

          {/* Bouton Espace pro */}
          <Link to="/login" className="login-link-smart">
            <motion.button 
              className="login-btn-smart"
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="login-icon-wrapper">
                <LogIn size={16} />
              </div>
              <span>Espace pro</span>
              <div className="login-particles">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="login-particle" style={{ animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </motion.button>
          </Link>

          {/* Bouton mobile */}
          <motion.button 
            className="mobile-btn-smart"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={isMenuOpen ? { rotate: 90 } : { rotate: 0 }}
              transition={{ duration: 0.3 }}
            >
              {isMenuOpen ? <X size={20} /> : <MenuIcon size={20} />}
            </motion.div>
          </motion.button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              className="mobile-menu-smart"
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            >
              <div className="mobile-actors-smart">
                <div className="mobile-section-title">
                  <Users size={14} color="#F9A826" />
                  <span>Acteurs</span>
                </div>
                {acteurs.map((actor) => (
                  <motion.button
                    key={actor.id}
                    className="mobile-actor-item"
                    onClick={() => handleActorClick(actor.id)}
                    whileHover={{ x: 5 }}
                    style={{ borderLeftColor: actor.color }}
                  >
                    <div className="mobile-actor-icon" style={{ background: `${actor.color}20` }}>
                      <actor.icon size={16} color={actor.color} />
                    </div>
                    <span className="mobile-actor-name">{actor.nom}</span>
                    <span className="mobile-actor-badge" style={{ background: actor.color }}>
                      {actor.badge}
                    </span>
                  </motion.button>
                ))}
              </div>

              <div className="mobile-solutions-smart">
                <div className="mobile-section-title">
                  <Layers size={14} color="#F9A826" />
                  <span>Solutions</span>
                </div>
                {solutions.map((sol) => (
                  <motion.button
                    key={sol.id}
                    className="mobile-solution-item"
                    onClick={() => {
                      scrollToSection(sol.id);
                      setIsMenuOpen(false);
                    }}
                    whileHover={{ x: 5 }}
                  >
                    <div className="mobile-solution-icon" style={{ background: `${sol.color}15` }}>
                      <sol.icon size={14} color={sol.color} />
                    </div>
                    <div className="mobile-solution-info">
                      <span className="mobile-solution-title">{sol.label}</span>
                      <span className="mobile-solution-desc">{sol.desc}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              <motion.button
                className="mobile-contact-item"
                onClick={() => {
                  scrollToSection('contact');
                  setIsMenuOpen(false);
                }}
                whileHover={{ x: 5 }}
              >
                <Phone size={16} color="#F9A826" />
                <span>Contact</span>
              </motion.button>

              <Link to="/login" className="mobile-login-link">
                <motion.div 
                  className="mobile-login-btn"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <LogIn size={18} />
                  <span>Espace professionnel</span>
                  <ArrowRight size={16} />
                </motion.div>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <section id="accueil" className="hero">
        <div className="hero-container">
          <motion.div 
            className="hero-content"
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="hero-badge">
              <Building2 size={14} color="#F9A826" />
              <span>SOCIÉTÉ RÉGIONALE DE TRANSPORT DE BIZERTE</span>
            </div>

            <h1 className="hero-title">
              Plateforme <span className="gradient-text">Santé-Sécurité</span>
            </h1>

            <p className="hero-description">
              Solution complète de gestion des risques professionnels, suivi médical 
              et prévention des accidents pour vos 1 247 agents.
            </p>

            <div className="stats-row">
              <div className="stat-item">
                <div className="stat-icon">
                  <Users size={20} color="#F9A826" />
                </div>
                <div>
                  <span className="stat-number">{counts.agents}</span>
                  <span className="stat-label">Agents protégés</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">
                  <Heart size={20} color="#F9A826" />
                </div>
                <div>
                  <span className="stat-number">{counts.jours}</span>
                  <span className="stat-label">Jours sans accident</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">
                  <Calendar size={20} color="#F9A826" />
                </div>
                <div>
                  <span className="stat-number">{counts.visites}</span>
                  <span className="stat-label">Visites/mois</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon">
                  <Star size={20} color="#F9A826" />
                </div>
                <div>
                  <span className="stat-number">{counts.satisfaction}%</span>
                  <span className="stat-label">Satisfaction</span>
                </div>
              </div>
            </div>

            <div className="hero-actions">
              <motion.button 
                className="btn-primary"
                onClick={() => window.location.href = '/login'}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>Accéder à la plateforme</span>
                <ArrowRight size={18} />
              </motion.button>
              <motion.button 
                className="btn-outline"
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <span>Découvrir</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Cube 3D */}
          <motion.div 
            className="hero-cube-3d"
            style={{
              rotateX: useTransform(springY, [-0.5, 0.5], [15, -15]),
              rotateY: useTransform(springX, [-0.5, 0.5], [-15, 15]),
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 1 }}
          >
            <div className="cube-3d-container">
              <div className="cube-3d">
                <div className="cube-face front">
                  <Shield size={45} color="#1A3B5D" />
                </div>
                <div className="cube-face back">
                  <Brain size={45} color="#F9A826" />
                </div>
                <div className="cube-face right">
                  <Heart size={45} color="#2C7DA0" />
                </div>
                <div className="cube-face left">
                  <Activity size={45} color="#1A3B5D" />
                </div>
                <div className="cube-face top">
                  <Target size={45} color="#F9A826" />
                </div>
                <div className="cube-face bottom">
                  <Calendar size={45} color="#2C7DA0" />
                </div>
              </div>
            </div>

            <motion.div 
              className="orbital-ring-1"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="ring-particle"
                  style={{
                    background: i % 3 === 0 ? '#1A3B5D' : i % 3 === 1 ? '#F9A826' : '#2C7DA0',
                    transform: `rotate(${i * 30}deg) translateX(90px)`
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.1
                  }}
                />
              ))}
            </motion.div>

            <motion.div 
              className="orbital-ring-2"
              animate={{ rotate: -360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            >
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  className="ring-particle"
                  style={{
                    background: i % 2 === 0 ? '#F9A826' : '#2C7DA0',
                    transform: `rotate(${i * 45}deg) translateX(120px)`
                  }}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: i * 0.15
                  }}
                />
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Section Impact */}
      <section id="impact" className="impact-section-innovative">
        <div className="impact-header">
          <div className="section-badge">
            <Sparkles size={18} color="#F9A826" />
            <span>PERFORMANCE & INNOVATION</span>
          </div>
          <h2>Notre <span className="gradient-text">impact</span> en temps réel</h2>
          <p>Des résultats mesurables grâce à nos technologies avancées</p>
        </div>

        <div className="impact-dashboard">
          {impactData.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeTab === index;
            
            return (
              <motion.div
                key={index}
                className={`impact-card-advanced ${isActive ? 'active' : ''}`}
                onHoverStart={() => setActiveTab(index)}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -10, scale: 1.02 }}
              >
                <div className="card-header" style={{ borderBottomColor: item.color }}>
                  <div className="card-icon-large" style={{ background: `${item.color}15` }}>
                    <Icon size={32} color={item.color} />
                  </div>
                  <div className="card-title">
                    <span className="card-value" style={{ color: item.color }}>{item.value}</span>
                    <span className="card-label">{item.label}</span>
                  </div>
                  <div className="card-trend" style={{ color: item.color }}>
                    {item.trend}
                  </div>
                </div>

                <div className="card-chart">
                  {item.chart.map((val, i) => (
                    <motion.div
                      key={i}
                      className="chart-bar"
                      initial={{ height: 0 }}
                      whileInView={{ height: `${val * 0.5}%` }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 + i * 0.05, duration: 1 }}
                      style={{
                        background: item.color,
                        opacity: 0.3 + (i / 10)
                      }}
                    />
                  ))}
                </div>

                <div className="card-particles">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="particle"
                      style={{ background: item.color }}
                      animate={{
                        y: [0, -20, 0],
                        x: [0, (i % 2 === 0 ? 10 : -10), 0],
                        opacity: [0, 0.5, 0]
                      }}
                      transition={{
                        duration: 3 + i,
                        repeat: Infinity,
                        delay: i * 0.2
                      }}
                    />
                  ))}
                </div>

                <div className="card-progress">
                  <div className="progress-track">
                    <motion.div
                      className="progress-fill-advanced"
                      initial={{ width: 0 }}
                      whileInView={{ width: '100%' }}
                      viewport={{ once: true }}
                      transition={{ delay: 1, duration: 1.5 }}
                      style={{ background: `linear-gradient(90deg, ${item.color}, ${item.color}80)` }}
                    />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="tech-showcase">
          <h3>Technologies de pointe</h3>
          <div className="tech-grid">
            {technologies.map((tech, index) => {
              const Icon = tech.icon;
              return (
                <motion.div
                  key={index}
                  className="tech-card"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.05 }}
                >
                  <div className="tech-icon" style={{ background: `${tech.color}15` }}>
                    <Icon size={24} color={tech.color} />
                  </div>
                  <div className="tech-info">
                    <span className="tech-name">{tech.name}</span>
                    <span className="tech-desc">{tech.desc}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="advanced-metrics">
          <motion.div 
            className="metric-circle"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100 }}
          >
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(249,168,38,0.1)" strokeWidth="4" />
              <motion.circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#F9A826"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 0.94 }}
                viewport={{ once: true }}
                transition={{ duration: 2 }}
                style={{
                  rotate: -90,
                  transformOrigin: "center"
                }}
              />
            </svg>
            <div className="metric-content">
              <span className="metric-value">94%</span>
              <span className="metric-label">Prévention</span>
            </div>
          </motion.div>

          <motion.div 
            className="metric-circle"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
          >
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(16,185,129,0.1)" strokeWidth="4" />
              <motion.circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#10B981"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 0.98 }}
                viewport={{ once: true }}
                transition={{ duration: 2 }}
                style={{
                  rotate: -90,
                  transformOrigin: "center"
                }}
              />
            </svg>
            <div className="metric-content">
              <span className="metric-value">98%</span>
              <span className="metric-label">Satisfaction</span>
            </div>
          </motion.div>

          <motion.div 
            className="metric-circle"
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 100, delay: 0.4 }}
          >
            <svg width="120" height="120" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="rgba(59,130,246,0.1)" strokeWidth="4" />
              <motion.circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="#3B82F6"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 0.86 }}
                viewport={{ once: true }}
                transition={{ duration: 2 }}
                style={{
                  rotate: -90,
                  transformOrigin: "center"
                }}
              />
            </svg>
            <div className="metric-content">
              <span className="metric-value">86%</span>
              <span className="metric-label">Efficacité</span>
            </div>
          </motion.div>
        </div>

        <div className="innovation-timeline">
          <div className="timeline-header">
            <Rocket size={20} color="#F9A826" />
            <span>Notre feuille de route innovation</span>
          </div>
          <div className="timeline-steps">
            {[
              { year: '2024', title: 'IA Prédictive', desc: 'Algorithmes de prévision', color: '#3B82F6' },
              { year: '2025', title: 'IoT Médical', desc: 'Capteurs connectés', color: '#F59E0B' },
              { year: '2026', title: 'Blockchain Santé', desc: 'Sécurité des données', color: '#10B981' },
              { year: '2027', title: 'Quantum Computing', desc: 'Calcul avancé', color: '#8B5CF6' }
            ].map((step, index) => (
              <motion.div
                key={index}
                className="timeline-step"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2 }}
              >
                <div className="step-marker" style={{ background: step.color }}>
                  <div className="step-pulse"></div>
                </div>
                <div className="step-content">
                  <span className="step-year">{step.year}</span>
                  <span className="step-title">{step.title}</span>
                  <span className="step-desc">{step.desc}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Solutions Section */}
      <section id="solutions" className="solutions">
        <div className="section-header">
          <div className="section-badge">
            <Layers size={18} color="#F9A826" />
            <span>SOLUTIONS</span>
          </div>
          <h2>Solutions <span className="gradient-text">intégrées</span></h2>
          <p>Une approche globale pour une protection optimale</p>
        </div>

        <div className="solutions-grid">
          {[
            { 
              Icon: TrendingUp, 
              title: 'Analyse décisionnelle', 
              desc: 'Tableaux de bord interactifs et KPIs en temps réel',
              color: '#1A3B5D'
            },
            { 
              Icon: Brain, 
              title: 'Prédiction des risques', 
              desc: 'Algorithmes d\'IA pour anticiper les accidents',
              color: '#F9A826'
            },
            { 
              Icon: MessageSquare, 
              title: 'Assistant conversationnel', 
              desc: 'Interrogez vos données en langage naturel',
              color: '#2C7DA0'
            },
            { 
              Icon: Calendar, 
              title: 'Suivi médical', 
              desc: 'Planification automatique des visites',
              color: '#1A3B5D'
            }
          ].map((sol, i) => (
            <motion.div 
              key={i}
              className="solution-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -10 }}
            >
              <div className="card-icon" style={{ background: `${sol.color}15` }}>
                <sol.Icon size={32} color={sol.color} />
              </div>
              <h3>{sol.title}</h3>
              <p>{sol.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Innovation Section */}
      <section id="innovation" className="innovation">
        <div className="innovation-container">
          <motion.div 
            className="innovation-content"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="section-badge">
              <Rocket size={18} color="#F9A826" />
              <span>INNOVATION 2026</span>
            </div>
            <h2>L'excellence technologique au service de la SRTB</h2>
            <p>
              Notre plateforme intègre les dernières avancées en matière d'intelligence 
              artificielle pour offrir une protection optimale à vos agents.
            </p>

            <div className="innovation-stats">
              <div className="innovation-stat">
                <span className="stat-number">{counts.agents}</span>
                <span className="stat-label">Agents protégés</span>
              </div>
              <div className="innovation-stat">
                <span className="stat-number">156</span>
                <span className="stat-label">Véhicules</span>
              </div>
              <div className="innovation-stat">
                <span className="stat-number">12</span>
                <span className="stat-label">Agences</span>
              </div>
            </div>

            <ul className="innovation-list">
              {[
                'Analyse prédictive des risques',
                'Suivi médical automatisé',
                'Alertes intelligentes en temps réel',
                'Conformité ISO 45001'
              ].map((item, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <CheckCircle size={18} color="#F9A826" />
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div 
            className="innovation-3d"
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="cube-container">
              <div className="cube">
                <div className="cube-face front"></div>
                <div className="cube-face back"></div>
                <div className="cube-face right"></div>
                <div className="cube-face left"></div>
                <div className="cube-face top"></div>
                <div className="cube-face bottom"></div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="cta-container">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2>Prêt à moderniser votre gestion HSE ?</h2>
            <p>Rejoignez les {counts.agents} agents déjà protégés par notre plateforme</p>
            <motion.button 
              className="btn-cta"
              onClick={() => window.location.href = '/login'}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <span>Accéder à la plateforme</span>
              <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo">
                <Shield size={24} color="#fff" />
                <span>SRTB <span>HSE</span></span>
              </div>
              <p>
                Société Régionale de Transport de Bizerte<br />
                Gouvernorat de Bizerte, Tunisie
              </p>
            </div>

            <div className="footer-links">
              <h4>Navigation</h4>
              <ul>
                <li><a href="#accueil">Accueil</a></li>
                <li><a href="#impact">Impact</a></li>
                <li><a href="#solutions">Solutions</a></li>
                <li><a href="#innovation">Innovation</a></li>
                <li><a href="#contact">Contact</a></li>
              </ul>
            </div>

            <div className="footer-contact">
              <h4>Contact</h4>
              <ul>
                <li><Phone size={14} /> +216 72 432 100</li>
                <li><Mail size={14} /> contact@srtb.tn</li>
                <li><MapPin size={14} /> Bizerte, Tunisie</li>
              </ul>
            </div>

            <div className="footer-social">
              <h4>Suivez-nous</h4>
              <div className="social-icons">
                {[Facebook, Twitter, Linkedin, Youtube].map((Icon, i) => (
                  <motion.a 
                    key={i} 
                    href="#" 
                    whileHover={{ y: -5 }}
                  >
                    <Icon size={16} />
                  </motion.a>
                ))}
              </div>
            </div>
          </div>

          <div className="footer-bottom">
            <p>© 2026 SRTB - Tous droits réservés</p>
            <div className="footer-legal">
              <a href="#">Mentions légales</a>
              <a href="#">Confidentialité</a>
              <a href="#">CGU</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;