const CodeOTP = require('../models/CodeOTP');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { Op, sequelize } = require('sequelize');
const { sendOtpEmail } = require('../config/emailConfig');

// Nettoyage automatique toutes les 5 minutes
setInterval(async () => {
  try {
    const deleted = await CodeOTP.destroy({
      where: {
        expire_le: { [Op.lt]: new Date() }
      }
    });
    if (deleted > 0) {
      console.log(`🧹 Nettoyage: ${deleted} code(s) OTP expiré(s) supprimés`);
    }
  } catch (error) {
    console.error('❌ Erreur nettoyage OTP:', error);
  }
}, 300000);

// Générer code à 6 chiffres
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ========== ÉTAPE 1: DEMANDER UN CODE ==========
const demanderCode = async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('📧 Demande OTP pour:', email);

    // 1. Vérifier utilisateur
    const user = await User.findOne({ 
      where: { Login: email } 
    });

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aucun compte trouvé avec cet email' 
      });
    }

    console.log('✅ Utilisateur ID:', user.id_utilisateur);

    // 2. ✅ SOLUTION ANTI-DUPLICATION : Supprimer les anciens codes non utilisés
    await CodeOTP.destroy({
      where: {
        id_utilisateur: user.id_utilisateur,
        utilise: 0
      }
    });
    console.log('🗑️ Anciens codes supprimés');

    // 3. Générer un nouveau code
    const code = generateCode();
    const expireLe = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    console.log('🔐 Code généré (interne):', code);

    // 4. Sauvegarder le nouveau code
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

    // 5. Envoyer l'email
    try {
      await sendOtpEmail(email, user.Role, code);
      console.log('📧 Email envoyé avec succès');
    } catch (emailError) {
      console.error('❌ Erreur envoi email:', emailError);
      // On continue même si l'email échoue
    }

    // 6. ✅ RÉPONSE AVEC CODE POUR LE DÉVELOPPEMENT
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.json({
      success: true,
      message: 'Un code de vérification a été envoyé à votre adresse email',
      email: email,
      expireDans: 300, // 5 minutes en secondes
      ...(isDevelopment && { debug_code: code }) // ← Affiche le code en développement
    });

  } catch (error) {
    console.error('❌ Erreur demanderCode:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Une erreur est survenue. Veuillez réessayer.' 
    });
  }
};

// ========== ÉTAPE 2: VÉRIFIER LE CODE ==========
const verifierCode = async (req, res) => {
  try {
    const { email, code } = req.body;

    console.log('🔐 Vérification code pour:', email);

    // 1. Chercher le code valide
    const otpRecord = await CodeOTP.findOne({
      where: {
        email: email,
        code: code,
        utilise: 0,
        expire_le: { [Op.gt]: new Date() }
      },
      order: [['cree_le', 'DESC']]
    });

    if (!otpRecord) {
      return res.status(401).json({ 
        success: false, 
        message: 'Code invalide ou expiré' 
      });
    }

    console.log('✅ Code valide trouvé');

    // 2. Vérifier les tentatives
    if (otpRecord.tentatives >= 3) {
      await otpRecord.update({ utilise: 1 });
      return res.status(401).json({ 
        success: false, 
        message: 'Trop de tentatives. Demandez un nouveau code.' 
      });
    }

    // 3. Incrémenter les tentatives (si code incorrect)
    if (otpRecord.code !== code) {
      await otpRecord.update({ 
        tentatives: otpRecord.tentatives + 1 
      });
      
      const restantes = 3 - (otpRecord.tentatives + 1);
      return res.status(401).json({ 
        success: false, 
        message: `Code incorrect. Il vous reste ${restantes} tentative(s).` 
      });
    }

    // 4. Marquer comme utilisé
    await otpRecord.update({ utilise: 1 });

    // 5. Récupérer l'utilisateur
    const user = await User.findByPk(otpRecord.id_utilisateur);

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // 6. Générer le token JWT
    const token = jwt.sign(
      { id: user.id_utilisateur },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // 7. Mettre à jour les statistiques de connexion
    await user.update({
      derniere_connexion: new Date(),
      nombre_connexions: (user.nombre_connexions || 0) + 1
    });

    console.log('✅ Connexion réussie pour:', email);

    // 8. Réponse avec token
    res.json({
      success: true,
      token,
      user: {
        id: user.id_utilisateur,
        email: user.Login,
        role: user.Role,
        matricule: user.matricule_agent
      }
    });

  } catch (error) {
    console.error('❌ Erreur verifierCode:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Une erreur est survenue. Veuillez réessayer.' 
    });
  }
};

// ========== RENVOYER UN CODE ==========
const renvoyerCode = async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('🔄 Renvoi code pour:', email);
    
    // Réutiliser la même logique que demanderCode
    return demanderCode(req, res);
    
  } catch (error) {
    console.error('❌ Erreur renvoyerCode:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Une erreur est survenue. Veuillez réessayer.' 
    });
  }
};

// ========== VÉRIFIER STATUT CODE ==========
const verifierStatutCode = async (req, res) => {
  try {
    const { email } = req.params;

    const validCode = await CodeOTP.findOne({
      where: {
        email: email,
        utilise: 0,
        expire_le: { [Op.gt]: new Date() }
      },
      order: [['cree_le', 'DESC']],
      attributes: ['expire_le', 'tentatives']
    });

    if (!validCode) {
      return res.json({
        success: true,
        codeValide: false
      });
    }

    const timeLeft = Math.max(0, Math.floor((validCode.expire_le - new Date()) / 1000));

    res.json({
      success: true,
      codeValide: true,
      expireDans: timeLeft,
      tentatives: validCode.tentatives
    });

  } catch (error) {
    console.error('❌ Erreur verifierStatutCode:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
};

// ========== STATISTIQUES OTP ==========
const getOtpStats = async (req, res) => {
  try {
    console.log('📊 Récupération des stats OTP...');
    
    // Vérifier les permissions (admin seulement)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé' 
      });
    }
    
    // Compter tous les OTP
    const total = await CodeOTP.count();
    
    // Compter les OTP utilisés (utilise = 1)
    const used = await CodeOTP.count({ 
      where: { utilise: 1 } 
    });
    
    // Compter les OTP expirés (non utilisés et date dépassée)
    const expired = await CodeOTP.count({ 
      where: { 
        utilise: 0,
        expire_le: { [Op.lt]: new Date() } 
      } 
    });
    
    // Compter les OTP en attente (non utilisés et pas expirés)
    const pending = await CodeOTP.count({ 
      where: { 
        utilise: 0,
        expire_le: { [Op.gt]: new Date() } 
      } 
    });

    // Calculer la moyenne des tentatives
    const allOtps = await CodeOTP.findAll({ 
      attributes: ['tentatives'] 
    });
    
    const totalAttempts = allOtps.reduce((sum, otp) => sum + (otp.tentatives || 0), 0);
    const avgAttempts = allOtps.length ? (totalAttempts / allOtps.length).toFixed(1) : 0;

    console.log('✅ Stats OTP calculées:', { total, used, expired, pending });

    res.json({
      success: true,
      total,
      used,
      expired,
      pending,
      successRate: total ? Math.round((used / total) * 100) : 0,
      averageAttempts: parseFloat(avgAttempts)
    });
    
  } catch (error) {
    console.error('❌ Erreur getOtpStats:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ========== NOUVELLES FONCTIONS POUR STATISTIQUES RÉELLES ==========

// ========== STATISTIQUES OTP PAR RÔLE ==========
const getOtpStatsByRole = async (req, res) => {
  try {
    console.log('📊 Récupération des stats OTP par rôle...');
    
    // Vérifier les permissions (admin seulement)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Accès non autorisé' 
      });
    }
    
    // Récupérer tous les utilisateurs avec leurs rôles
    const users = await User.findAll({
      attributes: ['id_utilisateur', 'Role']
    });
    
    // Récupérer tous les codes OTP utilisés avec succès
    const usedOtps = await CodeOTP.findAll({
      where: {
        utilise: 1,
        type: 'connexion'
      },
      attributes: ['id_utilisateur']
    });
    
    // Créer un Set des IDs d'utilisateurs qui ont utilisé OTP
    const usersWithOtp = new Set(usedOtps.map(otp => otp.id_utilisateur));
    
    // Compter par rôle
    const stats = {
      admin: { total: 0, used: 0 },
      technicien: { total: 0, used: 0 },
      social: { total: 0, used: 0 },
      agent: { total: 0, used: 0 }
    };
    
    users.forEach(user => {
      const role = user.Role?.toLowerCase() || 'agent';
      if (stats[role]) {
        stats[role].total++;
        if (usersWithOtp.has(user.id_utilisateur)) {
          stats[role].used++;
        }
      } else {
        // Si le rôle n'est pas dans notre objet, le compter comme agent
        stats.agent.total++;
        if (usersWithOtp.has(user.id_utilisateur)) {
          stats.agent.used++;
        }
      }
    });
    
    console.log('✅ Stats OTP par rôle calculées:', stats);
    
    res.json({
      success: true,
      admin: stats.admin.used,
      technicien: stats.technicien.used,
      social: stats.social.used,
      agent: stats.agent.used,
      totals: {
        admin: stats.admin.total,
        technicien: stats.technicien.total,
        social: stats.social.total,
        agent: stats.agent.total
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur getOtpStatsByRole:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ========== UTILISATION OTP PAR JOUR ==========
const getOtpDailyUsage = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    const otps = await CodeOTP.findAll({
      where: {
        cree_le: { [Op.gte]: startDate },
        type: 'connexion'
      },
      attributes: [
        [sequelize.fn('DATE', sequelize.col('cree_le')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN utilise = 1 THEN 1 ELSE 0 END')), 'success']
      ],
      group: [sequelize.fn('DATE', sequelize.col('cree_le'))],
      order: [[sequelize.fn('DATE', sequelize.col('cree_le')), 'ASC']]
    });
    
    res.json({
      success: true,
      data: otps
    });
    
  } catch (error) {
    console.error('❌ Erreur getOtpDailyUsage:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ========== TAUX DE RÉUSSITE OTP ==========
const getOtpSuccessRate = async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    let startDate = new Date();
    switch(period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
    }
    
    const total = await CodeOTP.count({
      where: {
        cree_le: { [Op.gte]: startDate },
        type: 'connexion'
      }
    });
    
    const success = await CodeOTP.count({
      where: {
        cree_le: { [Op.gte]: startDate },
        type: 'connexion',
        utilise: 1
      }
    });
    
    const rate = total > 0 ? Math.round((success / total) * 100) : 0;
    
    res.json({
      success: true,
      period,
      total,
      success,
      rate
    });
    
  } catch (error) {
    console.error('❌ Erreur getOtpSuccessRate:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ========== UTILISATION OTP PAR UTILISATEUR ==========
const getOtpUserStats = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const stats = await CodeOTP.findAll({
      where: {
        id_utilisateur: userId,
        type: 'connexion'
      },
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        [sequelize.fn('SUM', sequelize.literal('CASE WHEN utilise = 1 THEN 1 ELSE 0 END')), 'success'],
        [sequelize.fn('AVG', sequelize.col('tentatives')), 'avgAttempts']
      ]
    });
    
    res.json({
      success: true,
      data: stats[0]
    });
    
  } catch (error) {
    console.error('❌ Erreur getOtpUserStats:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// ========== EXPORTER LES FONCTIONS ==========
module.exports = {
  demanderCode,
  verifierCode,
  renvoyerCode,
  verifierStatutCode,
  getOtpStats,
  // Nouvelles fonctions exportées
  getOtpStatsByRole,
  getOtpDailyUsage,
  getOtpSuccessRate,
  getOtpUserStats
};