const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Historique = require('../models/Historique');
const CodeOTP = require('../models/CodeOTP');
const { Op, Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sendOtpEmail } = require('../config/emailConfig');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// ========== STATISTIQUES DE CONNEXIONS RÉELLES ==========
const getConnexionsStats = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
    console.log(`📊 getConnexionsStats appelé avec period: ${period}`);
    
    let startDate = new Date();
    let endDate = new Date();
    
    switch(period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        startDate.setDate(startDate.getDate() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
    }
    
    // Compter les connexions dans la période
    const totalConnexions = await Historique.count({
      where: {
        date_connexion: {
          [Op.between]: [startDate, endDate]
        }
      }
    });
    
    // Connexions réussies
    const totalReussies = await Historique.count({
      where: {
        date_connexion: {
          [Op.between]: [startDate, endDate]
        },
        succes: 1
      }
    });
    
    // Connexions uniques (par utilisateur)
    const uniqueUsers = await Historique.count({
      where: {
        date_connexion: {
          [Op.between]: [startDate, endDate]
        }
      },
      distinct: true,
      col: 'id_utilisateur'
    });
    
    // Connexions par rôle
    const connexionsByRole = await Historique.findAll({
      where: {
        date_connexion: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        'role_utilisateur',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['role_utilisateur']
    });
    
    // Connexions par jour (7 derniers jours)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const connexionsByDay = await Historique.findAll({
      where: {
        date_connexion: {
          [Op.gte]: sevenDaysAgo
        }
      },
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('date_connexion')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('date_connexion'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('date_connexion')), 'ASC']]
    });
    
    // Connexions par heure
    const connexionsByHour = await Historique.findAll({
      where: {
        date_connexion: {
          [Op.between]: [startDate, endDate]
        }
      },
      attributes: [
        [Sequelize.fn('HOUR', Sequelize.col('date_connexion')), 'hour'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: [Sequelize.fn('HOUR', Sequelize.col('date_connexion'))],
      order: [[Sequelize.fn('HOUR', Sequelize.col('date_connexion')), 'ASC']]
    });
    
    // Taux de succès
    const tauxSucces = totalConnexions > 0 
      ? Math.round((totalReussies / totalConnexions) * 100) 
      : 0;
    
    res.json({
      success: true,
      period,
      stats: {
        total: totalConnexions,
        reussies: totalReussies,
        uniqueUsers,
        tauxSucces,
        byRole: connexionsByRole,
        byDay: connexionsByDay,
        byHour: connexionsByHour
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur getConnexionsStats:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ========== STATISTIQUES GLOBALES ==========
const getGlobalStats = async (req, res) => {
  try {
    // Stats utilisateurs
    const totalUsers = await User.count();
    const usersByRole = await User.findAll({
      attributes: [
        'Role',
        [Sequelize.fn('COUNT', Sequelize.col('id_utilisateur')), 'count']
      ],
      group: ['Role']
    });
    
    // Stats connexions (toutes périodes)
    const totalConnexions = await Historique.count({
      where: { succes: 1 }
    });
    
    // Connexions aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayConnexions = await Historique.count({
      where: {
        date_connexion: {
          [Op.between]: [today, tomorrow]
        },
        succes: 1
      }
    });
    
    // Connexions cette semaine
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    const weekConnexions = await Historique.count({
      where: {
        date_connexion: { [Op.gte]: weekAgo },
        succes: 1
      }
    });
    
    // Connexions ce mois
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);
    
    const monthConnexions = await Historique.count({
      where: {
        date_connexion: { [Op.gte]: monthAgo },
        succes: 1
      }
    });
    
    // Nouveaux utilisateurs (30 derniers jours)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const newUsers = await User.count({
      where: {
        date_creation: { [Op.gte]: thirtyDaysAgo }
      }
    });
    
    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          byRole: usersByRole
        },
        connexions: {
          total: totalConnexions,
          today: todayConnexions,
          week: weekConnexions,
          month: monthConnexions
        },
        newUsers
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur getGlobalStats:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== FONCTIONS DE CONNEXION STANDARD ==========
const login = async (req, res, expectedRole = null) => {
  try {
    const { email, Login, password } = req.body;
    
    const loginValue = Login || email;
    
    console.log('📝 Tentative de connexion avec:', loginValue);
    
    if (!loginValue) {
      return res.status(400).json({ 
        success: false,
        message: 'Email requis' 
      });
    }

    if (!password) {
      return res.status(400).json({ 
        success: false,
        message: 'Mot de passe requis' 
      });
    }
    
    const user = await User.verifyCredentials(loginValue, password);
    
    if (!user) {
      await Historique.enregistrerConnexion(
        { email: loginValue, temp: true }, 
        req, 
        false
      );
      return res.status(401).json({ 
        success: false,
        message: 'Email ou mot de passe incorrect' 
      });
    }
    
    if (expectedRole && user.Role !== expectedRole) {
      return res.status(403).json({ 
        success: false,
        message: `Accès non autorisé - Cette page est réservée aux ${expectedRole}s` 
      });
    }
    
    const token = generateToken(user.id_utilisateur);
    
    await user.update({
      derniere_connexion: new Date(),
      nombre_connexions: (user.nombre_connexions || 0) + 1
    });
    
    await Historique.enregistrerConnexion(
      { 
        id: user.id_utilisateur,
        email: user.Login, 
        role: user.Role 
      }, 
      req, 
      true
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id_utilisateur,
        email: user.Login,
        role: user.Role,
        matricule: user.matricule_agent,
        derniere_connexion: user.derniere_connexion,
        nombre_connexions: user.nombre_connexions,
        createdAt: user.date_creation
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur login:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

const loginAdmin = async (req, res) => login(req, res, 'admin');
const loginTechnicien = async (req, res) => login(req, res, 'technicien');
const loginSocial = async (req, res) => login(req, res, 'social');
const loginAgent = async (req, res) => login(req, res, 'agent');

// ========== FONCTIONS OTP ==========

// Générer code à 6 chiffres
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// DEMANDER CODE OTP
const demanderOtp = async (req, res) => {
  try {
    const { email, role } = req.body;
    
    console.log('📧 Demande OTP pour:', email, 'rôle:', role);

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email requis' 
      });
    }

    if (!role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Rôle requis' 
      });
    }

    const user = await User.findOne({ 
      where: { 
        Login: email,
        Role: role 
      } 
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aucun compte trouvé avec cet email et ce rôle' 
      });
    }

    console.log('✅ Utilisateur trouvé ID:', user.id_utilisateur);

    await CodeOTP.destroy({
      where: {
        id_utilisateur: user.id_utilisateur,
        utilise: 0
      }
    });
    console.log('🗑️ Anciens codes supprimés');

    const code = generateCode();
    const expireLe = new Date(Date.now() + 5 * 60 * 1000);
    
    console.log('🔐 Code généré (interne):', code);

    const newCode = await CodeOTP.create({
      id_utilisateur: user.id_utilisateur,
      email: user.Login,
      code: code,
      type: 'connexion',
      expire_le: expireLe,
      tentatives: 0,
      utilise: 0
    });

    console.log('✅ Code sauvegardé ID:', newCode.id);

    try {
      await sendOtpEmail(email, user.Role, code);
      console.log('📧 Email envoyé avec succès');
    } catch (emailError) {
      console.error('❌ Erreur envoi email:', emailError);
    }

    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.json({
      success: true,
      message: 'Un code de vérification a été envoyé à votre adresse email',
      email: email,
      expireDans: 300,
      ...(isDevelopment && { debug_code: code })
    });

  } catch (error) {
    console.error('❌ Erreur demanderOtp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Une erreur est survenue. Veuillez réessayer.' 
    });
  }
};

const demanderOtpAdmin = async (req, res) => {
  req.body.role = 'admin';
  return demanderOtp(req, res);
};

const demanderOtpTechnicien = async (req, res) => {
  req.body.role = 'technicien';
  return demanderOtp(req, res);
};

const demanderOtpSocial = async (req, res) => {
  req.body.role = 'social';
  return demanderOtp(req, res);
};

const demanderOtpAgent = async (req, res) => {
  req.body.role = 'agent';
  return demanderOtp(req, res);
};

// VÉRIFIER CODE OTP
const verifierOtp = async (req, res) => {
  try {
    const { email, code, role } = req.body;

    console.log('🔐 Vérification OTP pour:', email, 'rôle:', role);

    if (!email || !code || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email, code et rôle requis' 
      });
    }

    const user = await User.findOne({ 
      where: { 
        Login: email,
        Role: role 
      } 
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    const otpRecord = await CodeOTP.findOne({
      where: {
        id_utilisateur: user.id_utilisateur,
        code: code,
        utilise: 0,
        expire_le: { [Op.gt]: new Date() }
      },
      order: [['cree_le', 'DESC']]
    });

    if (!otpRecord) {
      await Historique.enregistrerConnexion(
        { email: email, temp: true }, 
        req, 
        false
      );
      
      return res.status(401).json({ 
        success: false, 
        message: 'Code invalide ou expiré' 
      });
    }

    console.log('✅ Code valide trouvé');

    if (otpRecord.tentatives >= 3) {
      await otpRecord.update({ utilise: 1 });
      return res.status(401).json({ 
        success: false, 
        message: 'Trop de tentatives. Demandez un nouveau code.' 
      });
    }

    await otpRecord.update({ utilise: 1 });

    const token = generateToken(user.id_utilisateur);

    await user.update({
      derniere_connexion: new Date(),
      nombre_connexions: (user.nombre_connexions || 0) + 1
    });

    await Historique.enregistrerConnexion(
      { 
        id: user.id_utilisateur,
        email: user.Login, 
        role: user.Role 
      }, 
      req, 
      true
    );

    console.log('✅ Connexion OTP réussie pour:', email);

    res.json({
      success: true,
      token,
      user: {
        id: user.id_utilisateur,
        email: user.Login,
        role: user.Role,
        matricule: user.matricule_agent,
        derniere_connexion: user.derniere_connexion,
        nombre_connexions: user.nombre_connexions
      }
    });

  } catch (error) {
    console.error('❌ Erreur verifierOtp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Une erreur est survenue. Veuillez réessayer.' 
    });
  }
};

const verifierOtpAdmin = async (req, res) => {
  req.body.role = 'admin';
  return verifierOtp(req, res);
};

const verifierOtpTechnicien = async (req, res) => {
  req.body.role = 'technicien';
  return verifierOtp(req, res);
};

const verifierOtpSocial = async (req, res) => {
  req.body.role = 'social';
  return verifierOtp(req, res);
};

const verifierOtpAgent = async (req, res) => {
  req.body.role = 'agent';
  return verifierOtp(req, res);
};

// RENVOYER CODE OTP
const renvoyerOtp = async (req, res) => {
  try {
    const { email, role } = req.body;
    
    console.log('🔄 Renvoi OTP pour:', email, 'rôle:', role);
    
    if (!email || !role) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email et rôle requis' 
      });
    }
    
    req.body.role = role;
    return demanderOtp(req, res);
    
  } catch (error) {
    console.error('❌ Erreur renvoyerOtp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Une erreur est survenue. Veuillez réessayer.' 
    });
  }
};

// ========== FONCTIONS EXISTANTES ==========
const registerUser = async (req, res) => {
  try {
    const { email, password, role, matricule } = req.body;
    
    console.log('📝 Tentative de création utilisateur:', { email, role });
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email et mot de passe requis' 
      });
    }
    
    const existingUser = await User.findOne({
      where: { Login: email }
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false,
        message: 'Email déjà utilisé' 
      });
    }
    
    const user = await User.createUser(email, password, role, matricule);
    
    res.status(201).json({ 
      success: true, 
      message: 'Utilisateur créé',
      user: {
        id: user.id_utilisateur,
        email: user.Login,
        role: user.Role,
        matricule: user.matricule_agent,
        createdAt: user.date_creation
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur création utilisateur:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur création' 
    });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id_utilisateur', 'Login', 'Role', 'matricule_agent', 'derniere_connexion', 'nombre_connexions', 'date_creation']
    });
    
    res.json({
      success: true,
      users: users.map(u => ({
        id: u.id_utilisateur,
        email: u.Login,
        role: u.Role,
        matricule: u.matricule_agent,
        derniere_connexion: u.derniere_connexion,
        nombre_connexions: u.nombre_connexions,
        createdAt: u.date_creation
      }))
    });
  } catch (error) {
    console.error('❌ Erreur récupération utilisateurs:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user.id_utilisateur,
        email: user.Login,
        role: user.Role,
        matricule: user.matricule_agent,
        createdAt: user.date_creation
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération utilisateur:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    const { email, role, matricule } = req.body;
    
    if (email) user.Login = email;
    if (role) user.Role = role;
    if (matricule) user.matricule_agent = matricule;
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Utilisateur modifié', 
      user: {
        id: user.id_utilisateur,
        email: user.Login,
        role: user.Role,
        matricule: user.matricule_agent
      }
    });
  } catch (error) {
    console.error('❌ Erreur modification utilisateur:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur modification' 
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    await user.destroy();
    res.json({ 
      success: true, 
      message: 'Utilisateur supprimé' 
    });
  } catch (error) {
    console.error('❌ Erreur suppression utilisateur:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur suppression' 
    });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    console.log('🔄 Réinitialisation mot de passe pour user:', id);
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Le mot de passe doit contenir au moins 6 caractères' 
      });
    }
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    user.Mot_de_passe = hashedPassword;
    await user.save();
    
    console.log('✅ Mot de passe réinitialisé avec succès pour user:', id);
    
    res.json({ 
      success: true, 
      message: 'Mot de passe réinitialisé avec succès' 
    });
    
  } catch (error) {
    console.error('❌ Erreur réinitialisation mot de passe:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de la réinitialisation' 
    });
  }
};

const getHistorique = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'technicien' && req.user.role !== 'social') {
      return res.status(403).json({ 
        success: false,
        message: 'Accès non autorisé' 
      });
    }
    
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    if (search) {
      whereClause = {
        [Op.or]: [
          { email_utilisateur: { [Op.like]: `%${search}%` } }
        ]
      };
    }
    
    const total = await Historique.count({ where: whereClause });
    const historique = await Historique.findAll({
      where: whereClause,
      order: [['date_connexion', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    const formattedData = historique.map(item => ({
      id: item.id,
      user_id: item.id_utilisateur,
      user_email: item.email_utilisateur,
      user_role: item.role_utilisateur,
      timestamp: item.date_connexion,
      ip_address: item.adresse_ip,
      user_agent: item.navigateur,
      success: item.succes
    }));
    
    res.json({ 
      success: true, 
      data: formattedData, 
      total, 
      page: parseInt(page), 
      totalPages: Math.ceil(total / limit) 
    });
  } catch (error) {
    console.error('❌ Erreur récupération historique:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

const getHistoriqueStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayCount = await Historique.count({
      where: { date_connexion: { [Op.gte]: today, [Op.lt]: tomorrow } }
    });
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekCount = await Historique.count({
      where: { date_connexion: { [Op.gte]: weekAgo } }
    });
    
    const total = await Historique.count();
    
    res.json({ 
      success: true, 
      stats: { 
        today: todayCount, 
        week: weekCount, 
        total 
      } 
    });
  } catch (error) {
    console.error('❌ Erreur stats historique:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user.id_utilisateur,
        email: user.Login,
        role: user.Role,
        matricule: user.matricule_agent,
        derniere_connexion: user.derniere_connexion,
        nombre_connexions: user.nombre_connexions,
        createdAt: user.date_creation
      }
    });
  } catch (error) {
    console.error('❌ Erreur getMe:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur' 
    });
  }
};

const logout = (req, res) => {
  res.json({ 
    success: true, 
    message: 'Déconnexion réussie' 
  });
};

console.log('=== EXPORTS authController ===');
console.log('loginAdmin:', typeof loginAdmin);
console.log('loginTechnicien:', typeof loginTechnicien);
console.log('loginSocial:', typeof loginSocial);
console.log('loginAgent:', typeof loginAgent);
console.log('demanderOtpAdmin:', typeof demanderOtpAdmin);
console.log('demanderOtpTechnicien:', typeof demanderOtpTechnicien);
console.log('demanderOtpSocial:', typeof demanderOtpSocial);
console.log('demanderOtpAgent:', typeof demanderOtpAgent);
console.log('verifierOtpAdmin:', typeof verifierOtpAdmin);
console.log('verifierOtpTechnicien:', typeof verifierOtpTechnicien);
console.log('verifierOtpSocial:', typeof verifierOtpSocial);
console.log('verifierOtpAgent:', typeof verifierOtpAgent);
console.log('renvoyerOtp:', typeof renvoyerOtp);
console.log('getConnexionsStats:', typeof getConnexionsStats);
console.log('getGlobalStats:', typeof getGlobalStats);
console.log('registerUser:', typeof registerUser);
console.log('getUsers:', typeof getUsers);
console.log('getUserById:', typeof getUserById);
console.log('updateUser:', typeof updateUser);
console.log('deleteUser:', typeof deleteUser);
console.log('resetPassword:', typeof resetPassword);
console.log('getHistorique:', typeof getHistorique);
console.log('getHistoriqueStats:', typeof getHistoriqueStats);
console.log('getMe:', typeof getMe);
console.log('logout:', typeof logout);
console.log('==============================');

module.exports = {
  loginAdmin, loginTechnicien, loginSocial, loginAgent,
  demanderOtpAdmin, demanderOtpTechnicien, demanderOtpSocial, demanderOtpAgent,
  verifierOtpAdmin, verifierOtpTechnicien, verifierOtpSocial, verifierOtpAgent,
  renvoyerOtp,
  getConnexionsStats,
  getGlobalStats,
  registerUser, getUsers, getUserById, updateUser, deleteUser,
  resetPassword, getHistorique, getHistoriqueStats, getMe, logout
};