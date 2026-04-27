// backend/controllers/authController.js

const jwt = require('jsonwebtoken');
const db = require('../models');
const { Op, Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sendOtpEmail } = require('../config/emailConfig');
const AuditService = require('../services/auditService'); // ← AJOUTÉ

// Récupérer les modèles depuis db
const User = db.local.User;
const Historique = db.local.Historique;
const CodeOTP = db.local.CodeOTP;
const Agent = db.global.Agent;

// ========== FONCTIONS UTILITAIRES ==========

// Fonction utilitaire pour extraire l'email (accepte email ou Login)
const extractEmail = (body) => {
  return body.email || body.Login;
};

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id_utilisateur,
      matricule_agent: user.matricule_agent,
      email: user.email,
      role: user.role 
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: process.env.JWT_EXPIRE
    }
  );
};

const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ========== LOGIN AGENT ==========

const loginAgent = async (req, res) => {
  try {
    const email = extractEmail(req.body);
    const { password } = req.body;
    
    console.log('🔐 Tentative login agent:', email);
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email et mot de passe requis' 
      });
    }
    
    // 1. Chercher l'utilisateur
    const user = await User.findOne({
      where: { 
        Login: email,
        Role: 'agent'
      }
    });
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé:', email);
      await Historique.enregistrerConnexion(
        { email: email, temp: true }, 
        req, 
        false
      );
      return res.status(401).json({ 
        success: false,
        message: 'Email ou mot de passe incorrect' 
      });
    }
    
    // 2. Vérifier le mot de passe
    const isValidPassword = await bcrypt.compare(password, user.Mot_de_passe);
    if (!isValidPassword) {
      console.log('❌ Mot de passe incorrect pour:', email);
      await Historique.enregistrerConnexion(
        { email: email, temp: true }, 
        req, 
        false
      );
      return res.status(401).json({ 
        success: false,
        message: 'Email ou mot de passe incorrect' 
      });
    }
    
    // 3. Récupérer le matricule_agent
    let matriculeAgent = user.matricule_agent;
    let nom = '';
    let prenom = '';
    let code_agence = null;
    let code_affectation = null;
    let statut = 'actif';
    
    // 4. Si l'utilisateur a déjà un matricule, chercher l'agent
    if (matriculeAgent) {
      const agent = await Agent.findOne({
        where: { matricule_agent: matriculeAgent },
        attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation', 'statut']
      });
      
      if (agent) {
        nom = agent.nom || '';
        prenom = agent.prenom || '';
        code_agence = agent.code_agence;
        code_affectation = agent.code_affectation;
        statut = agent.statut || 'actif';
        console.log('✅ Agent trouvé par matricule existant:', matriculeAgent, prenom, nom);
      }
    }
    
    // 5. Si pas de matricule, chercher l'agent par nom/prénom extrait de l'email
    if (!matriculeAgent || !nom) {
      const emailLocal = email.split('@')[0];
      const emailParts = emailLocal.split('.');
      
      if (emailParts.length >= 2) {
        const possiblePrenom = emailParts[0];
        const possibleNom = emailParts[1];
        
        const agentByName = await Agent.findOne({
          where: { 
            [Op.and]: [
              { prenom: { [Op.like]: `%${possiblePrenom}%` } },
              { nom: { [Op.like]: `%${possibleNom}%` } }
            ]
          },
          attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation', 'statut']
        });
        
        if (agentByName) {
          matriculeAgent = agentByName.matricule_agent;
          nom = agentByName.nom || '';
          prenom = agentByName.prenom || '';
          code_agence = agentByName.code_agence;
          code_affectation = agentByName.code_affectation;
          statut = agentByName.statut || 'actif';
          
          await user.update({ matricule_agent: matriculeAgent });
          console.log('✅ Agent trouvé par nom/prénom:', matriculeAgent, prenom, nom);
        }
      }
    }
    
    // 6. Si toujours pas de matricule, chercher l'agent par ID utilisateur
    if (!matriculeAgent) {
      const agentById = await Agent.findOne({
        where: { matricule_agent: user.id_utilisateur },
        attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation', 'statut']
      });
      
      if (agentById) {
        matriculeAgent = agentById.matricule_agent;
        nom = agentById.nom || '';
        prenom = agentById.prenom || '';
        code_agence = agentById.code_agence;
        code_affectation = agentById.code_affectation;
        statut = agentById.statut || 'actif';
        
        await user.update({ matricule_agent: matriculeAgent });
        console.log('✅ Agent trouvé par ID utilisateur:', matriculeAgent);
      }
    }
    
    // 7. Fallback: utiliser l'ID utilisateur
    if (!matriculeAgent) {
      matriculeAgent = user.id_utilisateur;
      console.log('⚠️ Fallback: utilisation ID comme matricule:', matriculeAgent);
    }
    
    console.log('✅ Login final - Matricule:', matriculeAgent, 'Agent:', prenom, nom);
    
    // 8. Mettre à jour la connexion
    await user.update({
      derniere_connexion: new Date(),
      nombre_connexions: (user.nombre_connexions || 0) + 1
    });
    
    // 9. Enregistrer dans l'historique
    await Historique.enregistrerConnexion(
      { id: user.id_utilisateur, email: user.Login, role: user.Role }, 
      req, 
      true
    );
    
    // 10. Générer le token
    const token = generateToken({
      id_utilisateur: user.id_utilisateur,
      matricule_agent: matriculeAgent,
      email: user.Login,
      role: user.Role
    });
    
    // 11. Retourner les informations
    res.json({
      success: true,
      token,
      user: {
        id: user.id_utilisateur,
        matricule_agent: matriculeAgent,
        email: user.Login,
        nom: nom,
        prenom: prenom,
        role: user.Role,
        code_agence: code_agence,
        code_affectation: code_affectation,
        statut: statut,
        derniere_connexion: user.derniere_connexion,
        nombre_connexions: user.nombre_connexions
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur login agent:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la connexion',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ========== LOGIN ADMIN ==========

const loginAdmin = async (req, res) => {
  try {
    const email = extractEmail(req.body);
    const { password } = req.body;
    
    console.log('🔐 Tentative login admin:', email);
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email et mot de passe requis' 
      });
    }
    
    const user = await User.findOne({
      where: { 
        Login: email,
        Role: 'admin'
      }
    });
    
    if (!user) {
      await Historique.enregistrerConnexion({ email, temp: true }, req, false);
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.Mot_de_passe);
    if (!isValidPassword) {
      await Historique.enregistrerConnexion({ email, temp: true }, req, false);
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }
    
    await user.update({
      derniere_connexion: new Date(),
      nombre_connexions: (user.nombre_connexions || 0) + 1
    });
    
    await Historique.enregistrerConnexion(
      { id: user.id_utilisateur, email: user.Login, role: user.Role }, 
      req, 
      true
    );
    
    const token = generateToken({
      id_utilisateur: user.id_utilisateur,
      matricule_agent: user.matricule_agent || user.id_utilisateur,
      email: user.Login,
      role: user.Role
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id_utilisateur,
        matricule_agent: user.matricule_agent || user.id_utilisateur,
        email: user.Login,
        role: user.Role,
        derniere_connexion: user.derniere_connexion,
        nombre_connexions: user.nombre_connexions
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur login admin:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== LOGIN TECHNICIEN ==========

const loginTechnicien = async (req, res) => {
  try {
    const email = extractEmail(req.body);
    const { password } = req.body;
    
    console.log('🔐 Tentative login technicien:', email);
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email et mot de passe requis' 
      });
    }
    
    const user = await User.findOne({
      where: { 
        Login: email,
        Role: 'technicien'
      }
    });
    
    if (!user) {
      await Historique.enregistrerConnexion({ email, temp: true }, req, false);
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.Mot_de_passe);
    if (!isValidPassword) {
      await Historique.enregistrerConnexion({ email, temp: true }, req, false);
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }
    
    await user.update({
      derniere_connexion: new Date(),
      nombre_connexions: (user.nombre_connexions || 0) + 1
    });
    
    await Historique.enregistrerConnexion(
      { id: user.id_utilisateur, email: user.Login, role: user.Role }, 
      req, 
      true
    );
    
    const token = generateToken({
      id_utilisateur: user.id_utilisateur,
      matricule_agent: user.matricule_agent || user.id_utilisateur,
      email: user.Login,
      role: user.Role
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id_utilisateur,
        matricule_agent: user.matricule_agent || user.id_utilisateur,
        email: user.Login,
        role: user.Role,
        derniere_connexion: user.derniere_connexion,
        nombre_connexions: user.nombre_connexions
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur login technicien:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== LOGIN SOCIAL ==========

const loginSocial = async (req, res) => {
  try {
    const email = extractEmail(req.body);
    const { password } = req.body;
    
    console.log('🔐 Tentative login social:', email);
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Email et mot de passe requis' 
      });
    }
    
    const user = await User.findOne({
      where: { 
        Login: email,
        Role: 'social'
      }
    });
    
    if (!user) {
      await Historique.enregistrerConnexion({ email, temp: true }, req, false);
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }
    
    const isValidPassword = await bcrypt.compare(password, user.Mot_de_passe);
    if (!isValidPassword) {
      await Historique.enregistrerConnexion({ email, temp: true }, req, false);
      return res.status(401).json({ success: false, message: 'Email ou mot de passe incorrect' });
    }
    
    await user.update({
      derniere_connexion: new Date(),
      nombre_connexions: (user.nombre_connexions || 0) + 1
    });
    
    await Historique.enregistrerConnexion(
      { id: user.id_utilisateur, email: user.Login, role: user.Role }, 
      req, 
      true
    );
    
    const token = generateToken({
      id_utilisateur: user.id_utilisateur,
      matricule_agent: user.matricule_agent || user.id_utilisateur,
      email: user.Login,
      role: user.Role
    });
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id_utilisateur,
        matricule_agent: user.matricule_agent || user.id_utilisateur,
        email: user.Login,
        role: user.Role,
        derniere_connexion: user.derniere_connexion,
        nombre_connexions: user.nombre_connexions
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur login social:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ========== GET ME ==========

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }
    
    let agentInfo = null;
    let matriculeAgent = user.matricule_agent || req.user.matricule_agent;
    let nom = '';
    let prenom = '';
    let code_agence = null;
    let code_affectation = null;
    let statut = 'actif';
    
    if (matriculeAgent) {
      agentInfo = await Agent.findOne({
        where: { matricule_agent: matriculeAgent },
        attributes: ['matricule_agent', 'nom', 'prenom', 'code_agence', 'code_affectation', 'statut']
      });
      
      if (agentInfo) {
        nom = agentInfo.nom || '';
        prenom = agentInfo.prenom || '';
        code_agence = agentInfo.code_agence;
        code_affectation = agentInfo.code_affectation;
        statut = agentInfo.statut || 'actif';
      }
    }
    
    res.json({ 
      success: true, 
      user: {
        id: user.id_utilisateur,
        matricule_agent: matriculeAgent || user.id_utilisateur,
        email: user.Login,
        nom: nom,
        prenom: prenom,
        role: user.Role,
        code_agence: code_agence,
        code_affectation: code_affectation,
        statut: statut,
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

// ========== STATISTIQUES ==========

const getConnexionsStats = async (req, res) => {
  try {
    const { period = 'today' } = req.query;
    
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
    
    const totalConnexions = await Historique.count({
      where: {
        date_connexion: { [Op.between]: [startDate, endDate] }
      }
    });
    
    const totalReussies = await Historique.count({
      where: {
        date_connexion: { [Op.between]: [startDate, endDate] },
        succes: 1
      }
    });
    
    const uniqueUsers = await Historique.count({
      where: {
        date_connexion: { [Op.between]: [startDate, endDate] }
      },
      distinct: true,
      col: 'id_utilisateur'
    });
    
    const connexionsByRole = await Historique.findAll({
      where: {
        date_connexion: { [Op.between]: [startDate, endDate] }
      },
      attributes: [
        'role_utilisateur',
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: ['role_utilisateur']
    });
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    
    const connexionsByDay = await Historique.findAll({
      where: {
        date_connexion: { [Op.gte]: sevenDaysAgo }
      },
      attributes: [
        [Sequelize.fn('DATE', Sequelize.col('date_connexion')), 'date'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: [Sequelize.fn('DATE', Sequelize.col('date_connexion'))],
      order: [[Sequelize.fn('DATE', Sequelize.col('date_connexion')), 'ASC']]
    });
    
    const connexionsByHour = await Historique.findAll({
      where: {
        date_connexion: { [Op.between]: [startDate, endDate] }
      },
      attributes: [
        [Sequelize.fn('HOUR', Sequelize.col('date_connexion')), 'hour'],
        [Sequelize.fn('COUNT', Sequelize.col('id')), 'count']
      ],
      group: [Sequelize.fn('HOUR', Sequelize.col('date_connexion'))],
      order: [[Sequelize.fn('HOUR', Sequelize.col('date_connexion')), 'ASC']]
    });
    
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
    res.status(500).json({ success: false, message: error.message });
  }
};

const getGlobalStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const usersByRole = await User.findAll({
      attributes: [
        'Role',
        [Sequelize.fn('COUNT', Sequelize.col('id_utilisateur')), 'count']
      ],
      group: ['Role']
    });
    
    const totalConnexions = await Historique.count({
      where: { succes: 1 }
    });
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayConnexions = await Historique.count({
      where: {
        date_connexion: { [Op.between]: [today, tomorrow] },
        succes: 1
      }
    });
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);
    
    const weekConnexions = await Historique.count({
      where: {
        date_connexion: { [Op.gte]: weekAgo },
        succes: 1
      }
    });
    
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    monthAgo.setHours(0, 0, 0, 0);
    
    const monthConnexions = await Historique.count({
      where: {
        date_connexion: { [Op.gte]: monthAgo },
        succes: 1
      }
    });
    
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

// ========== GESTION DES UTILISATEURS ==========

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
    
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = await User.create({
      Login: email,
      Mot_de_passe: hashedPassword,
      Role: role || 'agent',
      matricule_agent: matricule || null,
      date_creation: new Date(),
      nombre_connexions: 0
    });
    
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

// ========== RESET PASSWORD AVEC AUDIT ==========
const resetPassword = async (req, res) => {
  const startTime = Date.now();
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
    
    // ✅ AJOUT DE L'AUDIT POUR LA RÉINITIALISATION
    await AuditService.enregistrer({
      utilisateur: req.user,
      requete: req,
      typeAction: 'REINITIALISATION_MDP',
      module: 'UTILISATEUR',
      idCible: id,
      identifiantCible: user.Login,
      description: `${req.user.email} a réinitialisé le mot de passe de l'utilisateur ${user.Login}`,
      nouvellesValeurs: { mot_de_passe: '[MODIFIÉ]' },
      statut: 'SUCCES',
      dureeMs: Date.now() - startTime
    });
    
    res.json({ 
      success: true, 
      message: 'Mot de passe réinitialisé avec succès' 
    });
    
  } catch (error) {
    console.error('❌ Erreur réinitialisation mot de passe:', error);
    
    // Enregistrement de l'échec dans l'audit
    try {
      await AuditService.enregistrer({
        utilisateur: req.user,
        requete: req,
        typeAction: 'REINITIALISATION_MDP',
        module: 'UTILISATEUR',
        idCible: req.params.id,
        description: `Échec de réinitialisation du mot de passe par ${req.user?.email}`,
        statut: 'ECHEC',
        erreur: error.message,
        dureeMs: Date.now() - startTime
      });
    } catch (auditError) {
      console.error('Erreur enregistrement audit:', auditError);
    }
    
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur lors de la réinitialisation' 
    });
  }
};

// ========== HISTORIQUE ==========

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

// ========== OTP FUNCTIONS ==========

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

    await CodeOTP.destroy({
      where: {
        id_utilisateur: user.id_utilisateur,
        utilise: 0
      }
    });

    const code = generateCode();
    const expireLe = new Date(Date.now() + 5 * 60 * 1000);

    await CodeOTP.create({
      id_utilisateur: user.id_utilisateur,
      email: user.Login,
      code: code,
      type: 'connexion',
      expire_le: expireLe,
      tentatives: 0,
      utilise: 0
    });

    try {
      await sendOtpEmail(email, user.Role, code);
      console.log('📧 Email OTP envoyé avec succès');
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

const verifierOtp = async (req, res) => {
  try {
    const { email, code, role } = req.body;

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

    if (otpRecord.tentatives >= 3) {
      await otpRecord.update({ utilise: 1 });
      return res.status(401).json({ 
        success: false, 
        message: 'Trop de tentatives. Demandez un nouveau code.' 
      });
    }

    await otpRecord.update({ utilise: 1 });

    const token = generateToken({
      id_utilisateur: user.id_utilisateur,
      matricule_agent: user.matricule_agent || user.id_utilisateur,
      email: user.Login,
      role: user.Role
    });

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
        matricule_agent: user.matricule_agent || user.id_utilisateur,
        email: user.Login,
        role: user.Role,
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

const renvoyerOtp = async (req, res) => {
  try {
    const { email, role } = req.body;
    
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

// ========== LOGOUT ==========

const logout = (req, res) => {
  res.json({ 
    success: true, 
    message: 'Déconnexion réussie' 
  });
};

// ========== EXPORTS ==========

module.exports = {
  loginAdmin,
  loginTechnicien,
  loginSocial,
  loginAgent,
  demanderOtpAdmin,
  demanderOtpTechnicien,
  demanderOtpSocial,
  demanderOtpAgent,
  verifierOtpAdmin,
  verifierOtpTechnicien,
  verifierOtpSocial,
  verifierOtpAgent,
  renvoyerOtp,
  getConnexionsStats,
  getGlobalStats,
  registerUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetPassword,
  getHistorique,
  getHistoriqueStats,
  getMe,
  logout
};