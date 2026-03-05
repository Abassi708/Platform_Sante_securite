const CodeOTP = require('../models/CodeOTP');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sendCodeOTP } = require('../config/emailConfig');

// ========== NETTOYAGE AUTO ==========
setInterval(async () => {
  try {
    const supprimes = await CodeOTP.destroy({
      where: {
        expire_le: { [Op.lt]: new Date() }
      }
    });
    if (supprimes > 0) {
      console.log(`🧹 ${supprimes} code(s) OTP expiré(s) supprimés`);
    }
  } catch (error) {
    console.error('❌ Erreur nettoyage OTP:', error);
  }
}, 300000); // Toutes les 5 minutes

// ========== ÉTAPE 1 : DEMANDER UN CODE (MOT DE PASSE OUBLIÉ) ==========
const demanderCode = async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('📝 Demande de code OTP pour:', email);
    
    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ 
      where: { Login: email } 
    });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aucun compte trouvé avec cet email' 
      });
    }
    
    // Anti-spam : max 2 demandes par minute
    const demandesRecentes = await CodeOTP.count({
      where: {
        Id_utilisateur: user.Id_utilisateur,
        cree_le: { [Op.gt]: new Date(Date.now() - 60 * 1000) }
      }
    });
    
    if (demandesRecentes >= 2) {
      return res.status(429).json({
        success: false,
        message: 'Trop de demandes. Attendez 1 minute.'
      });
    }
    
    // Générer un code à 6 chiffres
    const codeOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Date d'expiration (5 minutes)
    const expireLe = new Date();
    expireLe.setMinutes(expireLe.getMinutes() + 5);
    
    // Invalider les anciens codes
    await CodeOTP.update(
      { utilise: 1 },
      { 
        where: { 
          Id_utilisateur: user.Id_utilisateur,
          utilise: 0
        } 
      }
    );
    
    // Sauvegarder le nouveau code
    await CodeOTP.create({
      Id_utilisateur: user.Id_utilisateur,
      email: user.Login,
      code: codeOTP,
      type: 'connexion',
      expire_le: expireLe,
      tentatives: 0,
      utilise: 0
    });
    
    // Envoyer l'email
    await sendCodeOTP(email, user.Role, codeOTP);
    
    console.log(`✅ Code ${codeOTP} envoyé à ${email}`);
    
    res.json({
      success: true,
      message: 'Code de vérification envoyé par email',
      email: email,
      expireDans: 300 // 5 minutes en secondes
    });
    
  } catch (error) {
    console.error('❌ Erreur demanderCode:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ========== ÉTAPE 2 : VÉRIFIER LE CODE ET CONNEXION ==========
const verifierCodeEtConnecter = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    console.log('📝 Vérification code OTP pour:', email);
    
    // Chercher le code valide
    const codeRecord = await CodeOTP.findOne({
      where: {
        email: email,
        code: code,
        utilise: 0,
        expire_le: { [Op.gt]: new Date() }
      },
      order: [['cree_le', 'DESC']]
    });
    
    if (!codeRecord) {
      return res.status(401).json({ 
        success: false, 
        message: 'Code invalide ou expiré' 
      });
    }
    
    // Vérifier les tentatives
    if (codeRecord.tentatives >= 3) {
      await codeRecord.update({ utilise: 1 });
      return res.status(401).json({ 
        success: false, 
        message: 'Trop de tentatives. Demandez un nouveau code.' 
      });
    }
    
    // Vérifier le code
    if (codeRecord.code !== code) {
      await codeRecord.update({ 
        tentatives: codeRecord.tentatives + 1 
      });
      
      return res.status(401).json({ 
        success: false, 
        message: `Code incorrect (${codeRecord.tentatives + 1}/3 tentatives)` 
      });
    }
    
    // ✅ SUCCÈS - Récupérer l'utilisateur
    const user = await User.findByPk(codeRecord.Id_utilisateur);
    
    // Marquer le code comme utilisé
    await codeRecord.update({ utilise: 1 });
    
    // Générer le token JWT
    const token = jwt.sign(
      { id: user.Id_utilisateur },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Mettre à jour la connexion
    await user.update({
      derniere_connexion: new Date(),
      nombre_connexions: (user.nombre_connexions || 0) + 1
    });
    
    console.log('✅ Connexion OTP réussie pour:', email);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.Id_utilisateur,
        email: user.Login,
        role: user.Role,
        matricule: user.matricule_agent
      }
    });
    
  } catch (error) {
    console.error('❌ Erreur verifierCodeEtConnecter:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ========== RENVOYER UN CODE ==========
const renvoyerCode = async (req, res) => {
  try {
    const { email } = req.body;
    
    console.log('📝 Renvoi code OTP pour:', email);
    
    const user = await User.findOne({ where: { Login: email } });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }
    
    // Vérifier le nombre de renvois (anti-spam)
    const renvoisRecents = await CodeOTP.count({
      where: {
        Id_utilisateur: user.Id_utilisateur,
        cree_le: { [Op.gt]: new Date(Date.now() - 60 * 1000) }
      }
    });
    
    if (renvoisRecents >= 3) {
      return res.status(429).json({
        success: false,
        message: 'Trop de demandes. Attendez 1 minute.'
      });
    }
    
    // Générer un nouveau code
    const codeOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    const expireLe = new Date();
    expireLe.setMinutes(expireLe.getMinutes() + 5);
    
    await CodeOTP.create({
      Id_utilisateur: user.Id_utilisateur,
      email: user.Login,
      code: codeOTP,
      type: 'connexion',
      expire_le: expireLe,
      tentatives: 0,
      utilise: 0
    });
    
    await sendCodeOTP(email, user.Role, codeOTP);
    
    res.json({ 
      success: true, 
      message: 'Nouveau code envoyé',
      expireDans: 300
    });
    
  } catch (error) {
    console.error('❌ Erreur renvoyerCode:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

// ========== VÉRIFIER SI UN CODE EST VALIDE ==========
const verifierStatutCode = async (req, res) => {
  try {
    const { email } = req.params;
    
    const codeRecord = await CodeOTP.findOne({
      where: {
        email: email,
        utilise: 0,
        expire_le: { [Op.gt]: new Date() }
      },
      order: [['cree_le', 'DESC']]
    });
    
    if (!codeRecord) {
      return res.json({
        success: true,
        codeValide: false
      });
    }
    
    res.json({
      success: true,
      codeValide: true,
      expireDans: Math.floor((new Date(codeRecord.expire_le) - new Date()) / 1000),
      tentatives: codeRecord.tentatives
    });
    
  } catch (error) {
    console.error('❌ Erreur verifierStatutCode:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
};

module.exports = {
  demanderCode,
  verifierCodeEtConnecter,
  renvoyerCode,
  verifierStatutCode
};