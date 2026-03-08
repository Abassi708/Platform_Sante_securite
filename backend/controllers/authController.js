// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Historique = require('../models/Historique');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

const login = async (req, res, expectedRole = null) => {
  try {
    const { email, password } = req.body;
    
    console.log('📝 Tentative de connexion:', email);
    
    const user = await User.verifyCredentials(email, password);
    
    if (!user) {
      await Historique.enregistrerConnexion(
        { email: email }, 
        req, 
        false
      );
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }
    
    if (expectedRole && user.Role !== expectedRole) {
      return res.status(403).json({ 
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
        id: user.Id_utilisateur,
        email: user.Login,
        role: user.Role,
        matricule: user.matricule_agent,
        derniere_connexion: user.derniere_connexion,
        nombre_connexions: user.nombre_connexions
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur login:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const loginAdmin = async (req, res) => login(req, res, 'admin');
const loginTechnicien = async (req, res) => login(req, res, 'technicien');
const loginSocial = async (req, res) => login(req, res, 'social');
const loginAgent = async (req, res) => login(req, res, 'agent');

const registerUser = async (req, res) => {
  try {
    const { email, password, role, matricule } = req.body;
    
    console.log('📝 Tentative de création utilisateur:', { email, role });
    
    const existingUser = await User.findOne({
      where: { Login: email }
    });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Email déjà utilisé' });
    }
    
    const user = await User.createUser(email, password, role, matricule);
    
    res.status(201).json({ 
      success: true, 
      message: 'Utilisateur créé',
      user: {
        id: user.Id_utilisateur,
        email: user.Login,
        role: user.Role,
        matricule: user.matricule_agent
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur création utilisateur:', error);
    res.status(500).json({ message: 'Erreur création' });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id_utilisateur', 'Login', 'Role', 'matricule_agent', 'derniere_connexion', 'nombre_connexions']
    });
    
    res.json({
      success: true,
      users: users.map(u => ({
        id: u.id_utilisateur,
        email: u.Login,
        role: u.Role,
        matricule: u.matricule_agent,
        derniere_connexion: u.derniere_connexion,
        nombre_connexions: u.nombre_connexions
      }))
    });
  } catch (error) {
    console.error('❌ Erreur récupération utilisateurs:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    
    res.json({ 
      success: true, 
      user: {
        id: user.Id_utilisateur,
        email: user.Login,
        role: user.Role,
        matricule: user.matricule_agent
      }
    });
  } catch (error) {
    console.error('❌ Erreur récupération utilisateur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    
    const { email, role, matricule } = req.body;
    
    if (email) user.Login = email;
    if (role) user.Role = role;
    if (matricule) user.matricule_agent = matricule;
    
    await user.save();
    
    res.json({ 
      success: true, 
      message: 'Utilisateur modifié', 
      user: {
        id: user.Id_utilisateur,
        email: user.Login,
        role: user.Role,
        matricule: user.matricule_agent
      }
    });
  } catch (error) {
    console.error('❌ Erreur modification utilisateur:', error);
    res.status(500).json({ message: 'Erreur modification' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Utilisateur non trouvé' });
    
    await user.destroy();
    res.json({ success: true, message: 'Utilisateur supprimé' });
  } catch (error) {
    console.error('❌ Erreur suppression utilisateur:', error);
    res.status(500).json({ message: 'Erreur suppression' });
  }
};

// ========== RÉINITIALISER MOT DE PASSE ==========
const resetPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    console.log('🔄 Réinitialisation mot de passe pour user:', id);
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
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
    res.status(500).json({ message: 'Erreur serveur lors de la réinitialisation' });
  }
};

// ========== RÉCUPÉRER L'HISTORIQUE (AVEC FORMATAGE) ==========
const getHistorique = async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'technicien' && req.user.role !== 'social') {
      return res.status(403).json({ message: 'Accès non autorisé' });
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
    
    // 🔴 FORMATAGE POUR LE FRONTEND
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
    res.status(500).json({ message: 'Erreur serveur' });
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
    
    res.json({ success: true, stats: { today: todayCount, week: weekCount, total } });
  } catch (error) {
    console.error('❌ Erreur stats historique:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    
    res.json({ 
      success: true, 
      user: {
        id: user.Id_utilisateur,
        email: user.Login,
        role: user.Role,
        matricule: user.matricule_agent,
        derniere_connexion: user.derniere_connexion,
        nombre_connexions: user.nombre_connexions
      }
    });
  } catch (error) {
    console.error('❌ Erreur getMe:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

const logout = (req, res) => {
  res.json({ success: true, message: 'Déconnexion réussie' });
};
// Vérification des exports
console.log('=== EXPORTS authController ===');
console.log('loginAdmin:', typeof loginAdmin);
console.log('loginTechnicien:', typeof loginTechnicien);
console.log('loginSocial:', typeof loginSocial);
console.log('loginAgent:', typeof loginAgent);
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
  registerUser, getUsers, getUserById, updateUser, deleteUser,
  resetPassword, getHistorique, getHistoriqueStats, getMe, logout
};