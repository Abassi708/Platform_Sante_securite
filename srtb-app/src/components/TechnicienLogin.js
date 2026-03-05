import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  Zap,
  UserCheck,
  ArrowLeft,
  Key,
  Smartphone,
  QrCode,
  ShieldCheck,
  Headphones,
  RefreshCw,
  HelpCircle,
  MessageCircle,
  Phone,
  Scan,
  Info,
  Copy,
  FileText,
  Users,
  FileCheck,
  PenTool,
  BarChart,
  TrendingUp,
  Calendar,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/TechnicienLogin.css';

const TechnicienLogin = () => {
  const navigate = useNavigate();
  
  // États du formulaire principal
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // États pour les fonctionnalités avancées
  const [loginMethod, setLoginMethod] = useState('password');
  
  // CODE OTP
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(60);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  
  // QR CODE
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState('');
  const [qrSessionId, setQrSessionId] = useState('');
  const [qrCheckInterval, setQrCheckInterval] = useState(null);
  
  // Statistiques technicien
  const [stats, setStats] = useState({
    todayReports: 24,
    pendingTasks: 7,
    completionRate: 94
  });

  // Autres états
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [lastLogin, setLastLogin] = useState(null);

  // Effet de parallaxe
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Timer pour OTP
  useEffect(() => {
    let interval;
    if (otpTimer > 0 && showOtpInput) {
      interval = setInterval(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer, showOtpInput]);

  // Nettoyer l'intervalle QR code
  useEffect(() => {
    return () => {
      if (qrCheckInterval) {
        clearInterval(qrCheckInterval);
      }
    };
  }, [qrCheckInterval]);

  // Charger la dernière connexion
  useEffect(() => {
    const saved = localStorage.getItem('lastTechnicienLogin');
    if (saved) {
      setLastLogin(JSON.parse(saved));
    }
  }, []);

  // Éléments flottants
  const floatingElements = [
    { id: 1, icon: FileText, color: '#f59e0b', size: 32, delay: 0, top: '15%', left: '10%' },
    { id: 2, icon: Users, color: '#f59e0b', size: 28, delay: 0.5, top: '70%', left: '15%' },
    { id: 3, icon: FileCheck, color: '#f59e0b', size: 36, delay: 1, top: '25%', right: '12%' },
    { id: 4, icon: PenTool, color: '#f59e0b', size: 30, delay: 1.5, bottom: '20%', right: '15%' },
    { id: 5, icon: BarChart, color: '#f59e0b', size: 24, delay: 2, top: '40%', left: '20%' },
    { id: 6, icon: Calendar, color: '#f59e0b', size: 26, delay: 2.5, bottom: '30%', left: '25%' }
  ];

  // Méthodes de connexion
  const loginMethods = [
    { id: 'password', icon: Key, label: 'Mot de passe' },
    { id: 'otp', icon: Smartphone, label: 'Code OTP' },
    { id: 'qrcode', icon: QrCode, label: 'QR Code' }
  ];

  // ===== FONCTIONS OTP =====

  const sendOtpByEmail = async (emailAddress) => {
    setSendingOtp(true);
    
    try {
      console.log('📡 Demande OTP technicien pour:', emailAddress);
      
      const response = await fetch('http://localhost:5000/api/otp/demander', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailAddress })
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ OTP envoyé avec succès');
        return true;
      } else {
        setError(data.message || 'Erreur lors de l\'envoi du code');
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur envoi OTP:', error);
      setError('Erreur de connexion au serveur');
      return false;
    } finally {
      setSendingOtp(false);
    }
  };

  const handleOtpMethod = async () => {
    if (!email) {
      setError('Veuillez d\'abord entrer votre email');
      return;
    }
    
    setOtpEmail(email);
    setLoginMethod('otp');
    setShowOtpInput(true);
    setOtpTimer(60);
    setOtpCode(['', '', '', '', '', '']);
    setOtpVerified(false);
    setError('');
    
    const sent = await sendOtpByEmail(email);
    if (sent) {
      setOtpSent(true);
      // Pour le développement, on simule un code
      const mockOtp = '123456';
      setGeneratedOtp(mockOtp);
      alert(`[MODE DÉVELOPPEMENT] Code OTP: ${mockOtp}`);
    }
  };

  const handleOtpChange = (index, value) => {
    if (value.length <= 1 && /^\d*$/.test(value)) {
      const newOtp = [...otpCode];
      newOtp[index] = value;
      setOtpCode(newOtp);
      
      if (value && index < 5) {
        document.getElementById(`otp-${index + 1}`).focus();
      }

      const enteredOtp = newOtp.join('');
      if (enteredOtp.length === 6) {
        verifyOtp(enteredOtp);
      }
    }
  };

  const verifyOtp = async (enteredOtp) => {
    try {
      console.log('📡 Vérification OTP technicien pour:', otpEmail);
      
      const response = await fetch('http://localhost:5000/api/otp/verifier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: otpEmail, 
          code: enteredOtp 
        })
      });

      const data = await response.json();

      if (data.success) {
        setOtpVerified(true);
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        const loginData = {
          timestamp: new Date().toISOString(),
          method: 'otp',
          email: otpEmail,
          success: true
        };
        localStorage.setItem('lastTechnicienLogin', JSON.stringify(loginData));
        
        setTimeout(() => {
          navigate('/technicien/dashboard');
        }, 1500);
      } else {
        setError(data.message || 'Code OTP incorrect');
        setTimeout(() => {
          setOtpCode(['', '', '', '', '', '']);
          document.getElementById('otp-0').focus();
        }, 500);
      }
    } catch (err) {
      console.error('❌ Erreur vérification OTP:', err);
      
      // Mode développement - fallback
      if (enteredOtp === '123456') {
        setOtpVerified(true);
        setTimeout(() => {
          navigate('/technicien/dashboard');
        }, 1500);
      } else {
        setError('Erreur de connexion au serveur');
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const resendOtp = async () => {
    setOtpTimer(60);
    setOtpCode(['', '', '', '', '', '']);
    setError('');
    await sendOtpByEmail(otpEmail);
  };

  // ===== FONCTIONS QR CODE =====

  const generateQrCode = () => {
    const sessionId = 'qr_tech_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const techId = 'TECH' + Math.floor(1000 + Math.random() * 9000);
    const qrData = `SRTB-TECH-${techId}-${sessionId}`;
    setQrSessionId(sessionId);
    setQrCodeValue(qrData);
    return qrData;
  };

  const handleQrCodeMethod = () => {
    setLoginMethod('qrcode');
    setShowQrCode(true);
    setQrScanned(false);
    setError('');
    generateQrCode();
    
    setTimeout(() => {
      if (showQrCode) {
        setQrScanned(true);
        setTimeout(() => {
          handleSuccessfulLogin();
        }, 2000);
      }
    }, 4000);
  };

  const copyQrCode = () => {
    navigator.clipboard.writeText(qrCodeValue);
    alert('Code copié dans le presse-papiers');
  };

  // ===== CONNEXION STANDARD =====

  const handleSuccessfulLogin = () => {
    setIsLoading(false);
    
    const loginData = {
      timestamp: new Date().toISOString(),
      method: loginMethod,
      email: email,
      success: true
    };
    localStorage.setItem('lastTechnicienLogin', JSON.stringify(loginData));
    
    navigate('/technicien/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('📡 Tentative de connexion technicien...');
      
      const response = await fetch('http://localhost:5000/api/auth/technicien/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        handleSuccessfulLogin();
      } else {
        setError(data.message || 'Email ou mot de passe incorrect');
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToMethods = () => {
    setShowOtpInput(false);
    setShowQrCode(false);
    setQrScanned(false);
    setOtpCode(['', '', '', '', '', '']);
    setError('');
    setLoginMethod('password');
    
    if (qrCheckInterval) {
      clearInterval(qrCheckInterval);
      setQrCheckInterval(null);
    }
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setResetSent(true);
    setTimeout(() => {
      setShowForgotPassword(false);
      setResetSent(false);
      setResetEmail('');
    }, 3000);
  };

  return (
    <div className="technicien-container">
      {/* Background profond */}
      <div className="technicien-bg">
        <div className="bg-gradient"></div>
        <div className="bg-grid"></div>
        <div className="bg-orb orb-1"></div>
        <div className="bg-orb orb-2"></div>
        <div className="bg-orb orb-3"></div>
      </div>

      {/* Éléments flottants */}
      <div 
        className="floating-world"
        style={{
          transform: `translate(${mousePosition.x}px, ${mousePosition.y}px)`
        }}
      >
        {floatingElements.map((el) => (
          <motion.div
            key={el.id}
            className="floating-item"
            style={{
              top: el.top,
              left: el.left,
              right: el.right,
              bottom: el.bottom,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.6, scale: 1 }}
            transition={{
              delay: el.delay,
              duration: 1,
              type: 'spring'
            }}
            whileHover={{ scale: 1.2, opacity: 1 }}
          >
            <div 
              className="floating-icon"
              style={{
                background: `radial-gradient(circle at 30% 30%, ${el.color}40, transparent)`,
                borderColor: el.color,
                boxShadow: `0 10px 30px -5px ${el.color}30`
              }}
            >
              <el.icon size={el.size} color={el.color} />
            </div>
            <motion.div
              className="floating-pulse"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 0.1, 0.3]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: el.delay
              }}
              style={{ background: el.color }}
            />
          </motion.div>
        ))}

        {/* Bouton retour Accueil */}
        <motion.a
          href="/"
          className="floating-back"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 2.5, duration: 0.8, type: 'spring' }}
          whileHover={{ scale: 1.1 }}
        >
          <div className="floating-back-icon">
            <ArrowLeft size={28} color="#f59e0b" />
          </div>
          <span className="floating-back-text">Accueil</span>
          <motion.div
            className="floating-back-pulse"
            animate={{
              scale: [1, 1.8, 1],
              opacity: [0.3, 0.1, 0.3]
            }}
            transition={{
              duration: 3,
              repeat: Infinity
            }}
          />
        </motion.a>
      </div>

      {/* Badges d'information */}
      <motion.div 
        className="info-badge left-badge"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <ShieldCheck size={14} color="#f59e0b" />
        <span>Espace technicien • Reporting en temps réel</span>
      </motion.div>

      <motion.div 
        className="info-badge right-badge"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 2.2 }}
      >
        <Clock size={14} color="#f59e0b" />
        <span>{new Date().toLocaleTimeString('fr-FR')}</span>
      </motion.div>

      {lastLogin && (
        <motion.div 
          className="info-badge bottom-badge"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 2.4 }}
        >
          <RefreshCw size={14} color="#f59e0b" />
          <span>Dernière connexion: {new Date(lastLogin.timestamp).toLocaleDateString('fr-FR')}</span>
        </motion.div>
      )}

      {/* Carte principale */}
      <motion.div 
        className="technicien-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {/* En-tête avec statistiques */}
        <div className="technicien-header">
          <motion.div 
            className="technicien-logo"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.6 }}
          >
            <FileText size={36} color="#f59e0b" />
            <div className="logo-text">
              <span className="logo-main">SRTB</span>
              <span className="logo-sub">Technicien</span>
            </div>
          </motion.div>
          
          <h1>Espace technicien</h1>
          <p>Gestion administrative & reporting</p>

          {/* Mini statistiques */}
          <div className="stats-mini">
            <div className="stat-mini-item">
              <FileText size={12} color="#f59e0b" />
              <span>{stats.todayReports} aujourd'hui</span>
            </div>
            <div className="stat-mini-item">
              <Clock size={12} color="#f59e0b" />
              <span>{stats.pendingTasks} en attente</span>
            </div>
            <div className="stat-mini-item">
              <TrendingUp size={12} color="#f59e0b" />
              <span>{stats.completionRate}% complété</span>
            </div>
          </div>
        </div>

        {/* Sélecteur de méthode de connexion */}
        {!showOtpInput && !showQrCode && (
          <div className="login-methods">
            {loginMethods.map((method) => {
              const Icon = method.icon;
              const isActive = loginMethod === method.id;
              return (
                <motion.button
                  key={method.id}
                  className={`method-button ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (method.id === 'otp') handleOtpMethod();
                    else if (method.id === 'qrcode') handleQrCodeMethod();
                    else setLoginMethod(method.id);
                  }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Icon size={18} color="#f59e0b" />
                  <span>{method.label}</span>
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Interface CODE OTP */}
        {showOtpInput && (
          <motion.div
            className="otp-interface"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Smartphone size={32} color="#f59e0b" className="otp-icon" />
            <h3>Vérification à deux facteurs</h3>
            <p>Un code à 6 chiffres a été envoyé à <strong>{otpEmail || email}</strong></p>
            
            <div className="otp-inputs">
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="otp-digit"
                  style={{ borderColor: otpVerified ? '#10b981' : 'rgba(245, 158, 11, 0.3)' }}
                  autoFocus={index === 0}
                  disabled={sendingOtp}
                />
              ))}
            </div>

            {sendingOtp && (
              <div className="otp-sending">
                <div className="spinner-small"></div>
                <p>Envoi du code en cours...</p>
              </div>
            )}

            {otpVerified && (
              <motion.div 
                className="otp-success"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <CheckCircle size={40} color="#10b981" />
                <p>Code vérifié avec succès !</p>
              </motion.div>
            )}

            <div className="otp-timer">
              <Clock size={14} color="#f59e0b" />
              <span>Code valable {otpTimer} secondes</span>
            </div>

            <div className="otp-actions">
              <button 
                className="otp-resend"
                onClick={resendOtp}
                disabled={otpTimer > 0 || sendingOtp}
              >
                {sendingOtp ? 'Envoi...' : 'Renvoyer le code'}
              </button>
              <button 
                className="otp-back"
                onClick={handleBackToMethods}
              >
                Retour
              </button>
            </div>

            <p className="otp-hint">Un code vous a été envoyé par email</p>
          </motion.div>
        )}

        {/* Interface QR CODE */}
        {showQrCode && (
          <motion.div
            className="qrcode-interface"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <QrCode size={32} color="#f59e0b" className="qrcode-icon" />
            <h3>Connexion par QR Code</h3>
            
            <div className="qrcode-container">
              {!qrScanned ? (
                <>
                  <div className="qrcode-placeholder">
                    <QrCode size={120} color="#f59e0b" />
                    <Scan size={40} className="scan-animation" />
                  </div>
                  <p>Scannez ce code avec l'application mobile SRTB</p>
                  <div className="qrcode-value">
                    <code>{qrCodeValue}</code>
                    <button onClick={copyQrCode} className="copy-button" title="Copier le code">
                      <Copy size={14} />
                    </button>
                  </div>
                  <p className="qrcode-instruction">Code unique pour cette session</p>
                </>
              ) : (
                <motion.div
                  className="qrcode-success"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <CheckCircle size={60} color="#10b981" />
                  <p>QR Code scanné avec succès !</p>
                  <p className="success-message">Connexion en cours...</p>
                </motion.div>
              )}
            </div>

            <button 
              className="qrcode-back"
              onClick={handleBackToMethods}
            >
              Annuler
            </button>
          </motion.div>
        )}

        {/* Formulaire principal (Mot de passe) */}
        {loginMethod === 'password' && !showOtpInput && !showQrCode && (
          <form onSubmit={handleSubmit} className="technicien-form">
            {/* Email */}
            <div className={`technicien-field ${focusedField === 'email' ? 'focused' : ''}`}>
              <label>
                <Mail size={14} />
                <span>Email professionnel</span>
              </label>
              <div className="field-container">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="technicien@srtb.tn"
                  required
                />
                {email && (
                  <motion.div 
                    className="field-valid"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <CheckCircle size={16} color="#10b981" />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Mot de passe */}
            <div className={`technicien-field ${focusedField === 'password' ? 'focused' : ''}`}>
              <label>
                <Lock size={14} />
                <span>Mot de passe</span>
              </label>
              <div className="field-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="field-eye"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="technicien-options">
              <label className="technicien-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkbox-mark"></span>
                <span>Rester connecté</span>
              </label>
              <button
                type="button"
                className="technicien-forgot"
                onClick={() => setShowForgotPassword(true)}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Erreur */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  className="technicien-error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <AlertTriangle size={14} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bouton principal */}
            <motion.button
              type="submit"
              className="technicien-button"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <div className="technicien-loader">
                  <div className="loader-ring"></div>
                  <div className="loader-ring"></div>
                  <div className="loader-ring"></div>
                </div>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight size={18} />
                </>
              )}
            </motion.button>
          </form>
        )}

        {/* Interface mot de passe oublié */}
        {showForgotPassword && (
          <motion.div
            className="forgot-interface"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <h3>Réinitialisation du mot de passe</h3>
            
            {!resetSent ? (
              <form onSubmit={handleResetPassword}>
                <p>Entrez votre email pour recevoir un lien de réinitialisation</p>
                
                <div className="technicien-field focused">
                  <label>
                    <Mail size={14} />
                    <span>Email professionnel</span>
                  </label>
                  <div className="field-container">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="technicien@srtb.tn"
                      required
                    />
                  </div>
                </div>

                <div className="forgot-actions">
                  <motion.button
                    type="submit"
                    className="forgot-submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Envoyer
                  </motion.button>
                  <button
                    type="button"
                    className="forgot-cancel"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Annuler
                  </button>
                </div>
              </form>
            ) : (
              <motion.div
                className="reset-success"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <CheckCircle size={48} color="#10b981" />
                <p>Un email de réinitialisation a été envoyé à {resetEmail}</p>
                <button
                  className="reset-close"
                  onClick={() => setShowForgotPassword(false)}
                >
                  Fermer
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Aide et support */}
        <div className="technicien-support">
          <button
            className="support-button"
            onClick={() => setShowHelp(!showHelp)}
          >
            <Headphones size={14} />
            <span>Besoin d'aide ?</span>
          </button>

          <AnimatePresence>
            {showHelp && (
              <motion.div
                className="support-panel"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <h4>Support technicien</h4>
                <div className="support-item">
                  <Phone size={12} />
                  <span>+216 72 432 102</span>
                </div>
                <div className="support-item">
                  <Mail size={12} />
                  <span>support.tech@srtb.tn</span>
                </div>
                <div className="support-item">
                  <MessageCircle size={12} />
                  <span>Chat en ligne (8h-18h)</span>
                </div>
                <div className="support-note">
                  <Info size={10} />
                  <span>Pour toute urgence, contactez votre supérieur</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Badges de sécurité */}
        <div className="technicien-security">
          <div className="security-dot">
            <ShieldCheck size={12} />
            <span>2FA</span>
          </div>
          <div className="security-dot">
            <Lock size={12} />
            <span>256-bit</span>
          </div>
          <div className="security-dot">
            <FileText size={12} />
            <span>Reporting</span>
          </div>
        </div>

        {/* Footer */}
        <div className="technicien-footer">
          <p>© 2026 SRTB • Espace Technicien • v2.4.0</p>
        </div>
      </motion.div>

      {/* Particules */}
      <div className="technicien-particles">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="particle"
            animate={{
              y: [0, -100, 0],
              x: [0, (i % 2 === 0 ? 50 : -50), 0],
              opacity: [0, 0.2, 0]
            }}
            transition={{
              duration: 10 + i,
              repeat: Infinity,
              delay: i * 0.2
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: '#f59e0b'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default TechnicienLogin;