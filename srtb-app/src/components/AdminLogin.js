import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Shield,
  Heart,
  Activity,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  Zap,
  Briefcase,
  Globe,
  Compass,
  Star,
  Moon,
  Sun,
  Cloud,
  Wind,
  Droplets,
  ArrowLeft,
  Fingerprint,
  Key,
  Smartphone,
  QrCode,
  Fingerprint as FingerprintIcon,
  ShieldCheck,
  Headphones,
  RefreshCw,
  HelpCircle,
  MessageCircle,
  Phone,
  Scan,
  Info,
  Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminLogin.css';

const AdminLogin = () => {
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
  
  // BIOMÉTRIE
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricScanning, setBiometricScanning] = useState(false);
  const [biometricSuccess, setBiometricSuccess] = useState(false);
  
  // QR CODE
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrScanned, setQrScanned] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState('');
  
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

  // Vérifier le support biométrique
  useEffect(() => {
    if (window.PublicKeyCredential) {
      setBiometricSupported(true);
    }
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

  // Charger la dernière connexion
  useEffect(() => {
    const saved = localStorage.getItem('lastAdminLogin');
    if (saved) {
      setLastLogin(JSON.parse(saved));
    }

    // Rediriger si déjà connecté (optionnel - à décommenter si besoin)
    // const token = localStorage.getItem('token');
    // if (token) {
    //   navigate('/admin/dashboard');
    // }
  }, [navigate]);

  // Éléments flottants
  const floatingElements = [
    { id: 1, icon: Shield, color: '#C4A962', size: 32, delay: 0, top: '15%', left: '10%' },
    { id: 2, icon: Heart, color: '#2E7D73', size: 28, delay: 0.5, top: '70%', left: '15%' },
    { id: 3, icon: Award, color: '#1E3A8A', size: 36, delay: 1, top: '25%', right: '12%' },
    { id: 4, icon: Compass, color: '#C4A962', size: 30, delay: 1.5, bottom: '20%', right: '15%' },
    { id: 5, icon: Star, color: '#2E7D73', size: 24, delay: 2, top: '40%', left: '20%' },
    { id: 6, icon: Moon, color: '#1E3A8A', size: 26, delay: 2.5, bottom: '30%', left: '25%' },
    { id: 7, icon: Sun, color: '#C4A962', size: 34, delay: 3, top: '60%', right: '20%' },
    { id: 8, icon: Cloud, color: '#F1F5F9', size: 40, delay: 3.5, bottom: '40%', right: '25%' },
    { id: 9, icon: Wind, color: '#1E3A8A', size: 22, delay: 4, top: '80%', left: '30%' },
    { id: 10, icon: Droplets, color: '#2E7D73', size: 20, delay: 4.5, bottom: '15%', right: '30%' }
  ];

  // Méthodes de connexion
  const loginMethods = [
    { id: 'password', icon: Key, label: 'Mot de passe' },
    { id: 'otp', icon: Smartphone, label: 'Code OTP' },
    { id: 'biometric', icon: FingerprintIcon, label: 'Biométrie', disabled: !biometricSupported },
    { id: 'qrcode', icon: QrCode, label: 'QR Code' }
  ];

  // ===== FONCTIONNALITÉS AVANCÉES =====

  const generateOtp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    console.log(`[SIMULATION] Code OTP envoyé: ${otp}`);
    return otp;
  };

  const handleOtpMethod = () => {
    setLoginMethod('otp');
    setShowOtpInput(true);
    setOtpSent(true);
    setOtpTimer(60);
    setOtpCode(['', '', '', '', '', '']);
    setOtpVerified(false);
    setError('');
    
    const newOtp = generateOtp();
    alert(`[SIMULATION] Code OTP envoyé: ${newOtp}`);
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
        if (enteredOtp === generatedOtp) {
          setOtpVerified(true);
          setTimeout(() => {
            navigate('/admin/dashboard');
          }, 1500);
        } else {
          setError('Code OTP incorrect. Veuillez réessayer.');
          setTimeout(() => {
            setOtpCode(['', '', '', '', '', '']);
            document.getElementById('otp-0').focus();
          }, 500);
        }
      }
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`).focus();
    }
  };

  const resendOtp = () => {
    setOtpTimer(60);
    setOtpCode(['', '', '', '', '', '']);
    setError('');
    const newOtp = generateOtp();
    alert(`[SIMULATION] Nouveau code OTP envoyé: ${newOtp}`);
  };

  const handleBiometricMethod = () => {
    setLoginMethod('biometric');
    setBiometricScanning(true);
    setError('');
    
    setTimeout(() => {
      setBiometricScanning(false);
      const success = Math.random() < 0.9;
      
      if (success) {
        setBiometricSuccess(true);
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 1500);
      } else {
        setError('Empreinte non reconnue. Veuillez réessayer.');
        setBiometricScanning(false);
        setLoginMethod('password');
      }
    }, 3000);
  };

  const generateQrCode = () => {
    const sessionId = Math.random().toString(36).substring(2, 15).toUpperCase();
    const adminId = 'AD' + Math.floor(1000 + Math.random() * 9000);
    const timestamp = Date.now().toString(36).substring(0, 4).toUpperCase();
    const qrData = `SRTB-ADMIN-${adminId}-${sessionId}-${timestamp}`;
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
          navigate('/admin/dashboard');
        }, 2000);
      }
    }, 4000);
  };

  const copyQrCode = () => {
    navigator.clipboard.writeText(qrCodeValue);
    alert('Code copié dans le presse-papiers');
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

  // ===== CONNEXION RÉELLE AVEC BACKEND =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('📡 Tentative de connexion vers le backend...');
      
      const response = await fetch('http://localhost:5000/api/auth/admin/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      console.log('📊 Status:', response.status);
      const data = await response.json();
      console.log('📦 Réponse:', data);

      if (response.ok && data.success) {
        // Sauvegarder le token
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Sauvegarder la dernière connexion
        const loginEntry = {
          timestamp: new Date().toISOString(),
          email: email,
          success: true
        };
        localStorage.setItem('lastAdminLogin', JSON.stringify(loginEntry));
        
        // Redirection vers le dashboard
        navigate('/admin/dashboard');
        
      } else {
        setError(data.message || 'Email ou mot de passe incorrect');
      }
    } catch (err) {
      console.error('❌ Erreur:', err);
      setError('Impossible de contacter le serveur. Vérifiez que le backend tourne sur http://localhost:5000');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToMethods = () => {
    setShowOtpInput(false);
    setShowQrCode(false);
    setBiometricScanning(false);
    setBiometricSuccess(false);
    setQrScanned(false);
    setOtpCode(['', '', '', '', '', '']);
    setError('');
    setLoginMethod('password');
  };

  return (
    <div className="prestige-container">
      {/* Background profond */}
      <div className="prestige-bg">
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
            <ArrowLeft size={28} color="#C4A962" />
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

      {/* Badge de confiance flottant */}
      <motion.div 
        className="trust-orb"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <Shield size={14} color="#C4A962" />
        <span>ISO 45001 • Sécurité certifiée</span>
      </motion.div>

      {/* Horloge cosmique */}
      <motion.div 
        className="cosmic-time"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 2.2 }}
      >
        <Clock size={14} color="#C4A962" />
        <span>{new Date().toLocaleTimeString('fr-FR')}</span>
      </motion.div>

      {lastLogin && (
        <motion.div 
          className="last-login-badge"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 2.4 }}
        >
          <RefreshCw size={14} color="#C4A962" />
          <span>Dernière connexion: {new Date(lastLogin.timestamp).toLocaleDateString('fr-FR')} à {new Date(lastLogin.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        </motion.div>
      )}

      {/* Carte de login */}
      <motion.div 
        className="prestige-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {/* En-tête */}
        <div className="prestige-header">
          <motion.div 
            className="prestige-logo"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.6 }}
          >
            <Briefcase size={32} color="#C4A962" />
            <span>HSE<span>Manager</span></span>
          </motion.div>
          <h1>Accès administrateur</h1>
          <p>Plateforme de gestion santé-sécurité</p>
        </div>

        {/* Sélecteur de méthode de connexion */}
        {!showOtpInput && !showQrCode && !biometricScanning && !biometricSuccess && (
          <div className="login-methods">
            {loginMethods.map((method) => {
              const Icon = method.icon;
              const isActive = loginMethod === method.id;
              return (
                <motion.button
                  key={method.id}
                  className={`method-button ${isActive ? 'active' : ''} ${method.disabled ? 'disabled' : ''}`}
                  onClick={() => {
                    if (method.id === 'otp') handleOtpMethod();
                    else if (method.id === 'biometric' && !method.disabled) handleBiometricMethod();
                    else if (method.id === 'qrcode') handleQrCodeMethod();
                    else setLoginMethod(method.id);
                  }}
                  whileHover={!method.disabled ? { y: -2 } : {}}
                  whileTap={!method.disabled ? { scale: 0.98 } : {}}
                  disabled={method.disabled}
                >
                  <Icon size={18} color="#C4A962" />
                  <span>{method.label}</span>
                  {method.disabled && <span className="method-soon">(Non supporté)</span>}
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
            <Smartphone size={32} color="#C4A962" className="otp-icon" />
            <h3>Vérification à deux facteurs</h3>
            <p>Un code à 6 chiffres a été envoyé à <strong>{email || 'votre téléphone'}</strong></p>
            
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
                  style={{
                    borderColor: otpVerified ? '#2E7D73' : 'rgba(196, 169, 98, 0.3)',
                    color: otpVerified ? '#2E7D73' : '#F1F5F9'
                  }}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {otpVerified && (
              <motion.div 
                className="otp-success"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <CheckCircle size={40} color="#2E7D73" />
                <p style={{ color: '#2E7D73' }}>Code vérifié avec succès !</p>
              </motion.div>
            )}

            <div className="otp-timer">
              <Clock size={14} color="#C4A962" />
              <span>Code valable {otpTimer} secondes</span>
            </div>

            <div className="otp-actions">
              <button 
                className="otp-resend"
                onClick={resendOtp}
                disabled={otpTimer > 0}
                style={{ color: otpTimer > 0 ? '#94a3b8' : '#C4A962' }}
              >
                Renvoyer le code
              </button>
              <button 
                className="otp-back"
                onClick={handleBackToMethods}
                style={{ color: '#C4A962' }}
              >
                Retour
              </button>
            </div>

            <p className="otp-hint">Un code vous a été envoyé (voir alerte)</p>
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
            <QrCode size={32} color="#C4A962" className="qrcode-icon" />
            <h3>Connexion par QR Code</h3>
            
            <div className="qrcode-container">
              {!qrScanned ? (
                <>
                  <div className="qrcode-placeholder">
                    <QrCode size={90} color="#C4A962" />
                    <Scan size={30} className="scan-animation" style={{ color: '#C4A962' }} />
                  </div>
                  <p>Scannez ce code avec l'application mobile</p>
                  <div className="qrcode-value">
                    <code style={{ color: '#C4A962' }}>{qrCodeValue}</code>
                    <button onClick={copyQrCode} className="copy-button">
                      <Copy size={14} color="#C4A962" />
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
                  <CheckCircle size={50} color="#2E7D73" />
                  <p style={{ color: '#2E7D73' }}>QR Code scanné avec succès !</p>
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

        {/* Interface BIOMÉTRIE */}
        {biometricScanning && (
          <motion.div
            className="biometric-interface"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <FingerprintIcon size={48} color="#C4A962" className="biometric-icon" />
            <h3>Authentification biométrique</h3>
            
            <div className="biometric-scanner">
              <FingerprintIcon size={60} color="#C4A962" />
              <motion.div
                className="scan-ripple"
                style={{ borderColor: '#C4A962' }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity
                }}
              />
              <motion.div
                className="scan-ripple delay-1"
                style={{ borderColor: '#C4A962' }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{
                  duration: 2,
                  delay: 0.5,
                  repeat: Infinity
                }}
              />
            </div>
            
            <p>Placez votre doigt sur le capteur</p>
            <p className="biometric-hint">Taux de réussite simulé: 90%</p>
            
            <button 
              className="biometric-back"
              onClick={handleBackToMethods}
            >
              Annuler
            </button>
          </motion.div>
        )}

        {biometricSuccess && (
          <motion.div
            className="biometric-success"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
          >
            <CheckCircle size={60} color="#2E7D73" />
            <p style={{ color: '#2E7D73' }}>Empreinte reconnue !</p>
            <p>Connexion en cours...</p>
          </motion.div>
        )}

        {/* Formulaire principal (Mot de passe) */}
        {loginMethod === 'password' && !showOtpInput && !showQrCode && !biometricScanning && !biometricSuccess && (
          <form onSubmit={handleSubmit} className="prestige-form">
            {/* Email */}
            <div className={`prestige-field ${focusedField === 'email' ? 'focused' : ''}`}>
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
                  placeholder="admin@hse.tn"
                  required
                />
                {email && (
                  <motion.div 
                    className="field-valid"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <CheckCircle size={16} color="#2E7D73" />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Mot de passe */}
            <div className={`prestige-field ${focusedField === 'password' ? 'focused' : ''}`}>
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
            <div className="prestige-options">
              <label className="prestige-checkbox">
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
                className="prestige-forgot"
                onClick={() => setShowForgotPassword(true)}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Erreur */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  className="prestige-error"
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
              className="prestige-button"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <div className="prestige-loader">
                  <div className="loader-ring"></div>
                  <div className="loader-ring"></div>
                  <div className="loader-ring"></div>
                </div>
              ) : (
                <>
                  <span>Accéder à la plateforme</span>
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
                <p>Entrez votre email pour recevoir un lien</p>
                
                <div className="prestige-field focused">
                  <label>
                    <Mail size={14} />
                    <span>Email professionnel</span>
                  </label>
                  <div className="field-container">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@hse.tn"
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
                <CheckCircle size={45} color="#2E7D73" />
                <p>Un email a été envoyé à {resetEmail}</p>
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
        <div className="agent-support">
          <button
            className="support-button"
            onClick={() => setShowHelp(!showHelp)}
          >
            <Headphones size={14} color="#C4A962" />
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
                <h4>Support administrateur</h4>
                <div className="support-item">
                  <Phone size={12} color="#C4A962" />
                  <span>+216 72 432 100</span>
                </div>
                <div className="support-item">
                  <Mail size={12} color="#C4A962" />
                  <span>support.admin@hse.tn</span>
                </div>
                <div className="support-item">
                  <MessageCircle size={12} color="#C4A962" />
                  <span>Chat en ligne (8h-18h)</span>
                </div>
                <div className="support-note">
                  <Info size={10} color="#C4A962" />
                  <span>Pour toute urgence, contactez votre supérieur</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sécurité */}
        <div className="prestige-security">
          <div className="security-dot">
            <Zap size={12} color="#C4A962" />
            <span>JWT</span>
          </div>
          <div className="security-dot">
            <Shield size={12} color="#C4A962" />
            <span>256-bit</span>
          </div>
          <div className="security-dot">
            <Award size={12} color="#C4A962" />
            <span>2FA</span>
          </div>
        </div>

        {/* Footer */}
        <div className="prestige-footer">
          <p>© 2026 HSE Manager • Excellence & Sécurité</p>
        </div>
      </motion.div>

      {/* Particules fines */}
      <div className="prestige-particles">
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="particle"
            animate={{
              y: [0, -100, 0],
              x: [0, (i % 2 === 0 ? 50 : -50), 0],
              opacity: [0, 0.3, 0]
            }}
            transition={{
              duration: 10 + i,
              repeat: Infinity,
              delay: i * 0.3
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 3 === 0 ? '#C4A962' : i % 3 === 1 ? '#1E3A8A' : '#2E7D73'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AdminLogin;