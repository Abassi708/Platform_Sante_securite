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
  ArrowLeft,
  Users,
  User,
  HeartPulse,
  HandHeart,
  MessageCircle,
  Phone,
  Headphones,
  RefreshCw,
  HelpCircle,
  Info,
  Smartphone,
  Fingerprint,
  QrCode,
  Scan,
  Copy,
  ShieldCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import '../styles/SocialLogin.css';

const SocialLogin = () => {
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

  // États pour les fonctionnalités avancées (gardés pour l'UI mais non fonctionnels)
  const [loginMethod, setLoginMethod] = useState('password');
  
  // CODE OTP
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpTimer, setOtpTimer] = useState(60);
  const [showOtpInput, setShowOtpInput] = useState(false);
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
    const saved = localStorage.getItem('lastSocialLogin');
    if (saved) {
      setLastLogin(JSON.parse(saved));
    }
  }, []);

  // Éléments flottants
  const floatingElements = [
    { id: 1, icon: Heart, color: '#C4A962', size: 32, delay: 0, top: '15%', left: '10%' },
    { id: 2, icon: Users, color: '#C4A962', size: 28, delay: 0.5, top: '70%', left: '15%' },
    { id: 3, icon: Award, color: '#C4A962', size: 36, delay: 1, top: '25%', right: '12%' },
    { id: 4, icon: HandHeart, color: '#C4A962', size: 30, delay: 1.5, bottom: '20%', right: '15%' },
    { id: 5, icon: HeartPulse, color: '#C4A962', size: 24, delay: 2, top: '40%', left: '20%' },
    { id: 6, icon: Calendar, color: '#C4A962', size: 26, delay: 2.5, bottom: '30%', left: '25%' },
    { id: 7, icon: User, color: '#C4A962', size: 34, delay: 3, top: '60%', right: '20%' },
    { id: 8, icon: MessageCircle, color: '#C4A962', size: 40, delay: 3.5, bottom: '40%', right: '25%' }
  ];

  // Méthodes de connexion
  const loginMethods = [
    { id: 'password', icon: Lock, label: 'Mot de passe' },
    { id: 'otp', icon: Smartphone, label: 'Code OTP' },
    { id: 'biometric', icon: Fingerprint, label: 'Biométrie', disabled: !biometricSupported },
    { id: 'qrcode', icon: QrCode, label: 'QR Code' }
  ];

  // ===== FONCTIONNALITÉS AVANCÉES (GARDÉES POUR L'UI) =====

  const generateOtp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    console.log(`[SIMULATION] Code OTP envoyé: ${otp}`);
    return otp;
  };

  const handleOtpMethod = () => {
    setLoginMethod('otp');
    setShowOtpInput(true);
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
            handleSuccessfulLogin();
          }, 1500);
        } else {
          setError('Code OTP incorrect');
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
          handleSuccessfulLogin();
        }, 1500);
      } else {
        setError('Empreinte non reconnue');
        setBiometricScanning(false);
        setLoginMethod('password');
      }
    }, 3000);
  };

  const generateQrCode = () => {
    const sessionId = Math.random().toString(36).substring(2, 15).toUpperCase();
    const socialId = 'SOC' + Math.floor(1000 + Math.random() * 9000);
    const qrData = `SRTB-SOCIAL-${socialId}-${sessionId}`;
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

  const handleResetPassword = (e) => {
    e.preventDefault();
    setResetSent(true);
    setTimeout(() => {
      setShowForgotPassword(false);
      setResetSent(false);
      setResetEmail('');
    }, 3000);
  };

  // ===== CONNEXION RÉELLE AU BACKEND =====
  const handleSuccessfulLogin = () => {
    setIsLoading(false);
    navigate('/social/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      console.log('📡 Tentative de connexion social...');
      
      const response = await fetch('http://localhost:5000/api/auth/social/login', {
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
      console.log('📦 Réponse:', data);

      if (response.ok && data.success) {
        // Sauvegarder le token JWT
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Sauvegarder la dernière connexion
        const loginData = {
          timestamp: new Date().toISOString(),
          method: loginMethod,
          email: email,
          success: true
        };
        localStorage.setItem('lastSocialLogin', JSON.stringify(loginData));
        
        // Redirection vers le dashboard
        navigate('/social/dashboard');
        
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
    setBiometricScanning(false);
    setBiometricSuccess(false);
    setQrScanned(false);
    setOtpCode(['', '', '', '', '', '']);
    setError('');
    setLoginMethod('password');
  };

  return (
    <div className="social-container">
      {/* Background profond */}
      <div className="social-bg">
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

      {/* Badges d'information */}
      <motion.div 
        className="info-badge left-badge"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 2 }}
      >
        <Shield size={14} color="#C4A962" />
        <span>Service social • Accompagnement</span>
      </motion.div>

      <motion.div 
        className="info-badge right-badge"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 2.2 }}
      >
        <Clock size={14} color="#C4A962" />
        <span>{new Date().toLocaleTimeString('fr-FR')}</span>
      </motion.div>

      {lastLogin && (
        <motion.div 
          className="info-badge bottom-badge"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 2.4 }}
        >
          <RefreshCw size={14} color="#C4A962" />
          <span>Dernière connexion: {new Date(lastLogin.timestamp).toLocaleDateString('fr-FR')}</span>
        </motion.div>
      )}

      {/* Carte principale */}
      <motion.div 
        className="social-card"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        {/* En-tête */}
        <div className="social-header">
          <motion.div 
            className="social-logo"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.6 }}
          >
            <Heart size={32} color="#C4A962" />
            <span>SRTB<span>Social</span></span>
          </motion.div>
          <h1>Service social</h1>
          <p>Accompagnement & écoute</p>
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
                  whileHover={!method.disabled ? { y: -2, scale: 1.02 } : {}}
                  whileTap={!method.disabled ? { scale: 0.98 } : {}}
                  disabled={method.disabled}
                >
                  <Icon size={16} color="#C4A962" />
                  <span>{method.label}</span>
                  {method.disabled && <span className="method-soon">Bientôt</span>}
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
            <h3>Vérification</h3>
            <p>Code envoyé à <strong>{email || 'votre téléphone'}</strong></p>
            
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
                  style={{ borderColor: otpVerified ? '#C4A962' : 'rgba(196, 169, 98, 0.3)' }}
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
                <CheckCircle size={40} color="#C4A962" />
                <p>Code vérifié !</p>
              </motion.div>
            )}

            <div className="otp-timer">
              <Clock size={14} color="#C4A962" />
              <span>{otpTimer}s</span>
            </div>

            <div className="otp-actions">
              <button 
                className="otp-resend"
                onClick={resendOtp}
                disabled={otpTimer > 0}
              >
                Renvoyer
              </button>
              <button 
                className="otp-back"
                onClick={handleBackToMethods}
              >
                Retour
              </button>
            </div>
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
            <h3>QR Code</h3>
            
            <div className="qrcode-container">
              {!qrScanned ? (
                <>
                  <div className="qrcode-placeholder">
                    <QrCode size={90} color="#C4A962" />
                    <Scan size={30} className="scan-animation" style={{ color: '#C4A962' }} />
                  </div>
                  <div className="qrcode-value">
                    <code style={{ color: '#C4A962' }}>{qrCodeValue}</code>
                    <button onClick={copyQrCode} className="copy-button">
                      <Copy size={14} color="#C4A962" />
                    </button>
                  </div>
                </>
              ) : (
                <motion.div
                  className="qrcode-success"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <CheckCircle size={50} color="#C4A962" />
                  <p>Scan réussi !</p>
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
            <Fingerprint size={48} color="#C4A962" className="biometric-icon" />
            <h3>Biométrie</h3>
            
            <div className="biometric-scanner">
              <Fingerprint size={60} color="#C4A962" />
              <motion.div
                className="scan-ripple"
                style={{ borderColor: '#C4A962' }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <motion.div
                className="scan-ripple delay-1"
                style={{ borderColor: '#C4A962' }}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.5, 0, 0.5]
                }}
                transition={{ duration: 2, delay: 0.5, repeat: Infinity }}
              />
            </div>
            
            <p>Placez votre doigt</p>
            
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
            <CheckCircle size={60} color="#C4A962" />
            <p>Empreinte reconnue !</p>
          </motion.div>
        )}

        {/* Formulaire principal */}
        {loginMethod === 'password' && !showOtpInput && !showQrCode && !biometricScanning && !biometricSuccess && (
          <form onSubmit={handleSubmit} className="social-form">
            {/* Email */}
            <div className={`social-field ${focusedField === 'email' ? 'focused' : ''}`}>
              <label>
                <Mail size={14} color="#C4A962" />
                <span>Email professionnel</span>
              </label>
              <div className="field-container">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="social@srtb.tn"
                  required
                />
                {email && (
                  <motion.div 
                    className="field-valid"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <CheckCircle size={16} color="#C4A962" />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Mot de passe */}
            <div className={`social-field ${focusedField === 'password' ? 'focused' : ''}`}>
              <label>
                <Lock size={14} color="#C4A962" />
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
                  {showPassword ? <EyeOff size={16} color="#C4A962" /> : <Eye size={16} color="#C4A962" />}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="social-options">
              <label className="social-checkbox">
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
                className="social-forgot"
                onClick={() => setShowForgotPassword(true)}
              >
                Mot de passe oublié ?
              </button>
            </div>

            {/* Erreur */}
            <AnimatePresence>
              {error && (
                <motion.div 
                  className="social-error"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <AlertTriangle size={14} color="#ef4444" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bouton principal */}
            <motion.button
              type="submit"
              className="social-button"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isLoading ? (
                <div className="social-loader">
                  <div className="loader-ring"></div>
                  <div className="loader-ring"></div>
                  <div className="loader-ring"></div>
                </div>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight size={18} color="#C4A962" />
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
            <h3>Réinitialisation</h3>
            
            {!resetSent ? (
              <form onSubmit={handleResetPassword}>
                <p>Entrez votre email</p>
                
                <div className="social-field focused">
                  <div className="field-container">
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="social@srtb.tn"
                      required
                    />
                  </div>
                </div>

                <div className="forgot-actions">
                  <motion.button
                    type="submit"
                    className="forgot-submit"
                    whileHover={{ scale: 1.02 }}
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
                <CheckCircle size={45} color="#C4A962" />
                <p>Email envoyé !</p>
                <button
                  className="reset-close"
                  onClick={() => setShowForgotPassword(false)}
                >
                  OK
                </button>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Support */}
        <div className="social-support">
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
                <h4>Support social</h4>
                <div className="support-item">
                  <Phone size={12} color="#C4A962" />
                  <span>+216 72 432 103</span>
                </div>
                <div className="support-item">
                  <Mail size={12} color="#C4A962" />
                  <span>support.social@srtb.tn</span>
                </div>
                <div className="support-note">
                  <Info size={10} color="#C4A962" />
                  <span>Écoute et accompagnement</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sécurité */}
        <div className="social-security">
          <div className="security-dot">
            <ShieldCheck size={12} color="#C4A962" />
            <span>Confidentiel</span>
          </div>
          <div className="security-dot">
            <Lock size={12} color="#C4A962" />
            <span>RGPD</span>
          </div>
          <div className="security-dot">
            <Heart size={12} color="#C4A962" />
            <span>Bien-être</span>
          </div>
        </div>

        {/* Footer */}
        <div className="social-footer">
          <p>© 2026 SRTB • Service Social</p>
        </div>
      </motion.div>

      {/* Particules */}
      <div className="social-particles">
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
              delay: i * 0.3
            }}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: '#C4A962'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SocialLogin;