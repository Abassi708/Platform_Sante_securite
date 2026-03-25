// src/components/UnifiedLogin.js
import React, { useState, useRef, useEffect } from 'react';
import { motion, useDragControls, useMotionValue, AnimatePresence } from 'framer-motion';
import { 
  LogIn, Mail, Lock, Shield, UserCheck, Server, FileText, Heart,
  ArrowRight, Eye, EyeOff, Loader, AlertCircle, AtSign, KeyRound,
  Info, ArrowLeft, Clock, Calendar, Send, Key, CheckCircle,
  Smartphone, MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/UnifiedLogin.css';

const UnifiedLogin = () => {
  const navigate = useNavigate();
  const dragControls = useDragControls();
  const constraintsRef = useRef(null);
  
  const [selectedRole, setSelectedRole] = useState(null);
  const [hoveredRole, setHoveredRole] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // États pour l'authentification OTP
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpLoading, setOtpLoading] = useState(false);
  
  // États pour "Mot de passe oublié"
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1); // 1: email, 2: code + nouveau mot de passe
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [timer, setTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Timer pour OTP
  useEffect(() => {
    let interval;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer(t => t - 1);
      }, 1000);
    } else if (otpTimer === 0 && otpSent) {
      setOtpSent(false);
      setOtpCode('');
      setError('Le code a expiré. Veuillez en demander un nouveau.');
    }
    return () => clearInterval(interval);
  }, [otpTimer, otpSent]);

  // Timer pour renvoi de code (mot de passe oublié)
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer(t => t - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Mise à jour de l'horloge chaque seconde
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  const roles = [
    { 
      id: 'admin',
      nom: 'Admin', 
      nomComplet: 'Service informatique',
      icon: Server, 
      color: '#F9A826',
      lightColor: '#FFFFFF',
      dashboard: '/admin/dashboard'
    },
    { 
      id: 'technicien',
      nom: 'Technicien', 
      nomComplet: 'Technicien administratif',
      icon: FileText, 
      color: '#F9A826',
      lightColor: '#FFFFFF',
      dashboard: '/technicien/dashboard'
    },
    { 
      id: 'social',
      nom: 'Social', 
      nomComplet: 'Service social',
      icon: Heart, 
      color: '#F9A826',
      lightColor: '#FFFFFF',
      dashboard: '/social/dashboard'
    },
    { 
      id: 'agent',
      nom: 'Agent', 
      nomComplet: 'Agent de terrain',
      icon: UserCheck, 
      color: '#F9A826',
      lightColor: '#FFFFFF',
      dashboard: '/agent/dashboard'
    }
  ];

  // ========== CONNEXION TRADITIONNELLE (MOT DE PASSE) ==========
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedRole) {
      setError('Veuillez sélectionner un rôle');
      return;
    }
    
    if (!email || !password) {
      setError('Email et mot de passe requis');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // CORRECTION: Utiliser "Login" au lieu de "email" pour correspondre au backend
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/auth/${selectedRole.id}/login`, {
        Login: email,  // ← Changé de "email" à "Login"
        password
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setSuccess('Connexion réussie ! Redirection...');
        setTimeout(() => {
          navigate(selectedRole.dashboard);
        }, 1500);
      }
    } catch (err) {
      console.error('Erreur détaillée:', err);
      setError(err.response?.data?.message || 'Identifiants incorrects');
    } finally {
      setLoading(false);
    }
  };

  // ========== DEMANDER CODE OTP ==========
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    
    if (!selectedRole) {
      setError('Veuillez sélectionner un rôle');
      return;
    }
    
    if (!email) {
      setError('Email requis');
      return;
    }

    setOtpLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/otp/demander`, {
        email,
        role: selectedRole.id
      });

      if (response.data.success) {
        setOtpSent(true);
        setOtpTimer(300); // 5 minutes
        setSuccess('Code OTP envoyé à votre adresse email');
        
        // En développement, afficher le code dans la console
        if (response.data.debug_code) {
          console.log('🔐 Code OTP (debug):', response.data.debug_code);
        }
      }
    } catch (err) {
      console.error('Erreur détaillée:', err);
      setError(err.response?.data?.message || 'Erreur lors de la demande de code');
    } finally {
      setOtpLoading(false);
    }
  };

  // ========== VÉRIFIER CODE OTP ==========
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    
    if (!otpCode || otpCode.length !== 6) {
      setError('Veuillez entrer un code valide à 6 chiffres');
      return;
    }

    setOtpLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/otp/verifier`, {
        email,
        role: selectedRole.id,
        code: otpCode
      });

      if (response.data.success) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        setSuccess('Connexion réussie ! Redirection...');
        setTimeout(() => {
          navigate(selectedRole.dashboard);
        }, 1500);
      }
    } catch (err) {
      console.error('Erreur détaillée:', err);
      setError(err.response?.data?.message || 'Code invalide ou expiré');
    } finally {
      setOtpLoading(false);
    }
  };

  // ========== ANNULER MODE OTP ==========
  const handleCancelOtp = () => {
    setOtpMode(false);
    setOtpSent(false);
    setOtpCode('');
    setOtpTimer(0);
    setError('');
    setSuccess('');
  };

  // ========== MOT DE PASSE OUBLIÉ ==========
  const handleRequestCode = async (e) => {
    e.preventDefault();
    
    if (!forgotEmail) {
      setError('Veuillez entrer votre email');
      return;
    }

    setForgotLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/password/forgot-password`, {
        email: forgotEmail
      });

      if (response.data.success) {
        setStep(2);
        setTimer(900); // 15 minutes en secondes
        setCanResend(false);
        setSuccess('Code envoyé ! Vérifiez votre boîte email.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'envoi du code');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (!canResend) return;

    setForgotLoading(true);
    setError('');

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/password/resend-code`, {
        email: forgotEmail
      });

      if (response.data.success) {
        setTimer(900);
        setCanResend(false);
        setSuccess('Nouveau code envoyé !');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors du renvoi du code');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!forgotCode || forgotCode.length !== 6) {
      setError('Veuillez entrer un code valide à 6 chiffres');
      return;
    }

    if (!newPassword) {
      setError('Veuillez entrer un nouveau mot de passe');
      return;
    }

    if (newPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setForgotLoading(true);
    setError('');

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/password/reset-password`, {
        email: forgotEmail,
        code: forgotCode,
        newPassword: newPassword
      });

      if (response.data.success) {
        setForgotSuccess(true);
        setSuccess('Mot de passe réinitialisé avec succès !');
        setTimeout(() => {
          setShowForgotPassword(false);
          setStep(1);
          setForgotCode('');
          setNewPassword('');
          setConfirmPassword('');
          setForgotSuccess(false);
        }, 2000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Code invalide ou expiré');
    } finally {
      setForgotLoading(false);
    }
  };

  // Formatage de la date
  const formattedDate = currentTime.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Formatage de l'heure
  const formattedTime = currentTime.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });

  // Formatage du timer
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="auth-minimal">
      {/* Flèche de retour vers homepage */}
      <motion.button 
        className="back-home-btn"
        onClick={() => navigate('/home')}
        whileHover={{ scale: 1.1, x: -3 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        <ArrowLeft size={20} />
        <span>Accueil</span>
      </motion.button>

      {/* Horloge et Date */}
      <motion.div 
        className="datetime-display"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="datetime-item">
          <Calendar size={16} />
          <span className="date-text">{formattedDate}</span>
        </div>
        <div className="datetime-item time">
          <Clock size={16} />
          <span className="time-text">{formattedTime}</span>
        </div>
      </motion.div>

      <div className="auth-bg">
        <div className="bg-grid"></div>
        <div className="bg-glow"></div>
        <div className="gradient-orb orb1"></div>
        <div className="gradient-orb orb2"></div>
        <div className="gradient-orb orb3"></div>
      </div>

      <div className="auth-card-wrapper" ref={constraintsRef}>
        <motion.div 
          className="auth-card-minimal"
          drag
          dragControls={dragControls}
          dragConstraints={constraintsRef}
          dragElastic={0.1}
          dragMomentum={false}
          whileDrag={{ scale: 1.02 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="auth-header-minimal">
            <div className="auth-logo-minimal">
              <Shield size={24} color="#F9A826" />
              <span>SRTB</span>
            </div>
            <h2>
              {showForgotPassword 
                ? step === 1 
                  ? 'Mot de passe oublié' 
                  : 'Réinitialisation'
                : otpMode
                  ? otpSent ? 'Vérification OTP' : 'Connexion sans mot de passe'
                  : 'Connexion'
              }
            </h2>
            <p>
              {showForgotPassword 
                ? step === 1 
                  ? 'Entrez votre email pour recevoir un code' 
                  : 'Entrez le code et votre nouveau mot de passe'
                : otpMode
                  ? otpSent 
                    ? 'Entrez le code reçu par email' 
                    : 'Un code vous sera envoyé par email'
                  : 'Accédez à votre espace'
              }
            </p>
          </div>

          {error && (
            <div className="auth-error-minimal">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="auth-success-minimal">
              <CheckCircle size={14} />
              <span>{success}</span>
            </div>
          )}

          {!showForgotPassword ? (
            // Formulaire de connexion (standard ou OTP)
            <>
              {/* Icônes des rôles - toujours visibles */}
              <div className="roles-icons-container">
                {roles.map((role) => (
                  <div 
                    key={role.id}
                    className={`role-icon-wrapper ${selectedRole?.id === role.id ? 'active' : ''}`}
                    onClick={() => !otpLoading && setSelectedRole(role)}
                    onMouseEnter={() => setHoveredRole(role)}
                    onMouseLeave={() => setHoveredRole(null)}
                    style={{
                      backgroundColor: selectedRole?.id === role.id ? role.lightColor : 'transparent',
                      borderColor: '#FFFFFF',
                      opacity: otpLoading ? 0.5 : 1,
                      pointerEvents: otpLoading ? 'none' : 'auto'
                    }}
                  >
                    <role.icon 
                      size={20} 
                      color={selectedRole?.id === role.id ? '#0A0A0A' : '#F9A826'}
                    />
                    
                    {/* Tooltip au survol */}
                    <AnimatePresence>
                      {hoveredRole?.id === role.id && !otpLoading && (
                        <motion.div 
                          className="role-icon-tooltip"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Info size={10} />
                          <span>{role.nomComplet}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {!otpMode ? (
                // MODE CONNEXION STANDARD (mot de passe)
                <form onSubmit={handleSubmit} className="auth-form-minimal" autoComplete="off">
                  {/* Email */}
                  <div className="auth-field">
                    <label className="auth-label">
                      <AtSign size={14} />
                      <span>Email</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <Mail size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nom@entreprise.tn"
                        disabled={loading}
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="auth-field">
                    <label className="auth-label">
                      <KeyRound size={14} />
                      <span>Mot de passe</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <Lock size={16} className="auth-input-icon" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={loading}
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Options et liens */}
                  <div className="auth-options">
                    <label className="auth-checkbox">
                      <input type="checkbox" />
                      <span>Se souvenir</span>
                    </label>
                    <div style={{ display: 'flex', gap: '15px' }}>
                      <button 
                        type="button" 
                        className="auth-link"
                        onClick={() => setOtpMode(true)}
                      >
                        <Smartphone size={14} style={{ marginRight: '4px' }} />
                        Code OTP
                      </button>
                      <button 
                        type="button" 
                        className="auth-link"
                        onClick={() => {
                          setShowForgotPassword(true);
                          setForgotEmail(email);
                          setError('');
                          setSuccess('');
                          setStep(1);
                        }}
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                  </div>

                  {/* Bouton submit */}
                  <motion.button
                    type="submit"
                    className="auth-submit"
                    disabled={loading || !selectedRole}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <Loader size={16} className="spinner" />
                    ) : (
                      <>
                        <LogIn size={16} />
                        <span>Se connecter</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </motion.button>
                </form>
              ) : (
                // MODE OTP
                <form onSubmit={otpSent ? handleVerifyOtp : handleRequestOtp} className="auth-form-minimal">
                  
                  {/* Bouton retour */}
                  <button 
                    type="button"
                    className="back-to-login"
                    onClick={handleCancelOtp}
                    disabled={otpLoading}
                  >
                    <ArrowLeft size={14} />
                    <span>Retour</span>
                  </button>

                  {/* Email (toujours affiché) */}
                  <div className="auth-field">
                    <label className="auth-label">
                      <Mail size={14} />
                      <span>Email</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <AtSign size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="nom@entreprise.tn"
                        disabled={otpLoading || otpSent}
                      />
                    </div>
                  </div>

                  {!otpSent ? (
                    // Étape 1: Demander le code
                    <>
                      <div className="forgot-info">
                        <MessageSquare size={14} />
                        <p>Un code à 6 chiffres vous sera envoyé par email.</p>
                      </div>

                      <motion.button
                        type="submit"
                        className="auth-submit"
                        disabled={otpLoading || !selectedRole || !email}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {otpLoading ? (
                          <Loader size={16} className="spinner" />
                        ) : (
                          <>
                            <Send size={16} />
                            <span>Envoyer le code</span>
                          </>
                        )}
                      </motion.button>
                    </>
                  ) : (
                    // Étape 2: Saisir le code
                    <>
                      {/* Timer */}
                      <div className="reset-timer">
                        <Clock size={14} />
                        <span>Code valable : {formatTimer(otpTimer)}</span>
                      </div>

                      {/* Code OTP */}
                      <div className="auth-field">
                        <label className="auth-label">
                          <Key size={14} />
                          <span>Code de vérification</span>
                        </label>
                        <div className="auth-input-wrapper">
                          <input
                            type="text"
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength="6"
                            disabled={otpLoading}
                            autoFocus
                          />
                        </div>
                      </div>

                      {/* Lien renvoyer */}
                      {otpTimer === 0 && (
                        <button
                          type="button"
                          className="resend-link"
                          onClick={() => {
                            setOtpSent(false);
                            setOtpCode('');
                          }}
                        >
                          Renvoyer un nouveau code
                        </button>
                      )}

                      {/* Bouton vérifier */}
                      <motion.button
                        type="submit"
                        className="auth-submit"
                        disabled={otpLoading || otpCode.length !== 6}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {otpLoading ? (
                          <Loader size={16} className="spinner" />
                        ) : (
                          <>
                            <CheckCircle size={16} />
                            <span>Vérifier et se connecter</span>
                          </>
                        )}
                      </motion.button>
                    </>
                  )}
                </form>
              )}
            </>
          ) : (
            // Formulaire "Mot de passe oublié"
            <form onSubmit={step === 1 ? handleRequestCode : handleResetPassword} className="auth-form-minimal">
              
              {/* Bouton retour */}
              <button 
                type="button"
                className="back-to-login"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setSuccess('');
                  setStep(1);
                  setForgotCode('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
              >
                <ArrowLeft size={14} />
                <span>Retour à la connexion</span>
              </button>

              {step === 1 ? (
                // Étape 1: Email
                <>
                  <div className="auth-field">
                    <label className="auth-label">
                      <Mail size={14} />
                      <span>Votre email</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <AtSign size={16} className="auth-input-icon" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="nom@entreprise.tn"
                        disabled={forgotLoading}
                      />
                    </div>
                  </div>

                  <div className="forgot-info">
                    <p>Un code à 6 chiffres vous sera envoyé par email.</p>
                  </div>

                  <motion.button
                    type="submit"
                    className="auth-submit"
                    disabled={forgotLoading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {forgotLoading ? (
                      <Loader size={16} className="spinner" />
                    ) : (
                      <>
                        <Send size={16} />
                        <span>Envoyer le code</span>
                      </>
                    )}
                  </motion.button>
                </>
              ) : (
                // Étape 2: Code + Nouveau mot de passe
                <>
                  {/* Timer */}
                  <div className="reset-timer">
                    <Clock size={14} />
                    <span>Code valable : {formatTimer(timer)}</span>
                  </div>

                  {/* Code */}
                  <div className="auth-field">
                    <label className="auth-label">
                      <Key size={14} />
                      <span>Code de réinitialisation</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <input
                        type="text"
                        value={forgotCode}
                        onChange={(e) => setForgotCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength="6"
                        disabled={forgotLoading || forgotSuccess}
                      />
                    </div>
                  </div>

                  {/* Nouveau mot de passe */}
                  <div className="auth-field">
                    <label className="auth-label">
                      <Lock size={14} />
                      <span>Nouveau mot de passe</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <Lock size={16} className="auth-input-icon" />
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={forgotLoading || forgotSuccess}
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirmation mot de passe */}
                  <div className="auth-field">
                    <label className="auth-label">
                      <CheckCircle size={14} />
                      <span>Confirmer le mot de passe</span>
                    </label>
                    <div className="auth-input-wrapper">
                      <Lock size={16} className="auth-input-icon" />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={forgotLoading || forgotSuccess}
                      />
                      <button
                        type="button"
                        className="auth-password-toggle"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Lien renvoyer */}
                  {canResend && !forgotSuccess && (
                    <button
                      type="button"
                      className="resend-link"
                      onClick={handleResendCode}
                      disabled={forgotLoading}
                    >
                      Renvoyer un nouveau code
                    </button>
                  )}

                  {/* Bouton réinitialiser */}
                  <motion.button
                    type="submit"
                    className="auth-submit"
                    disabled={forgotLoading || forgotSuccess}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {forgotLoading ? (
                      <Loader size={16} className="spinner" />
                    ) : forgotSuccess ? (
                      <>
                        <CheckCircle size={16} />
                        <span>Réinitialisé !</span>
                      </>
                    ) : (
                      <>
                        <Key size={16} />
                        <span>Réinitialiser</span>
                      </>
                    )}
                  </motion.button>
                </>
              )}
            </form>
          )}

          <div className="auth-footer-minimal">
            <p>© 2026 SRTB - Tous droits réservés</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default UnifiedLogin;