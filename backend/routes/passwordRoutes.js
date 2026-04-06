// backend/routes/passwordRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../models');
const User = db.local.User;
const bcrypt = require('bcryptjs');
const { sendResetEmail } = require('../config/emailConfig');

// Stockage temporaire des codes (en mémoire)
const resetCodes = new Map();

// Nettoyage automatique toutes les 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of resetCodes.entries()) {
    if (data.expires < now) {
      resetCodes.delete(email);
      console.log(`🧹 Code expiré supprimé pour: ${email}`);
    }
  }
}, 5 * 60 * 1000);

// Route pour demander un code de réinitialisation
router.post('/forgot-password', async (req, res) => {
  try {
    console.log('=== DÉBUT FORGOT-PASSWORD ===');
    console.log('1. Body reçu:', req.body);
    
    const { email } = req.body;
    
    if (!email) {
      console.log('2. Email manquant');
      return res.status(400).json({ 
        success: false, 
        message: 'Email requis' 
      });
    }
    
    console.log('3. Email reçu:', email);
    console.log('4. Type de User:', typeof User);
    console.log('5. User.findOne existe?', typeof User.findOne);
    
    // Vérifier si l'utilisateur existe
    console.log('6. Recherche utilisateur...');
    const user = await User.findOne({ where: { Login: email } });
    
    console.log('7. Résultat recherche:', user ? 'Utilisateur trouvé' : 'Aucun utilisateur');
    
    if (user) {
      console.log('8. ID utilisateur:', user.id_utilisateur);
      console.log('9. Login:', user.Login);
    }
    
    if (!user) {
      console.log('10. Utilisateur non trouvé - retour 404');
      return res.status(404).json({ 
        success: false, 
        message: 'Aucun compte trouvé avec cet email' 
      });
    }

    // Générer un code à 6 chiffres
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('11. Code généré:', resetCode);
    
    // Stocker le code avec expiration (15 minutes)
    resetCodes.set(email, {
      code: resetCode,
      expires: Date.now() + 15 * 60 * 1000,
      attempts: 0,
      userId: user.id_utilisateur
    });
    console.log('12. Code stocké en mémoire');

    // Préparer l'email
    console.log('13. Import du transporteur...');
    let transporter;
    try {
      const emailConfig = require('../config/emailConfig');
      transporter = emailConfig.transporter;
      console.log('14. Transporteur importé avec succès');
    } catch (err) {
      console.error('14. Erreur import emailConfig:', err.message);
      throw err;
    }
    
    const mailOptions = {
      from: `"SRTB HSE" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🔐 Code de réinitialisation - SRTB HSE',
      text: `Votre code de réinitialisation est: ${resetCode}\nValable 15 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #2563eb;">SRTB HSE</h2>
          <p>Bonjour ${user.Login},</p>
          <p>Votre code de réinitialisation est :</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold;">
            ${resetCode}
          </div>
          <p>Ce code expire dans 15 minutes.</p>
          <hr>
          <p style="color: #6b7280; font-size: 12px;">Email automatique, ne pas répondre</p>
        </div>
      `
    };
    
    console.log('15. Envoi de l\'email...');
    const info = await transporter.sendMail(mailOptions);
    console.log('16. Email envoyé! ID:', info.messageId);
    
    res.json({ 
      success: true, 
      message: 'Code envoyé par email',
      email: email
    });
    
    console.log('=== FIN SUCCÈS ===\n');

  } catch (error) {
    console.error('=== ERREUR DÉTAILLÉE ===');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Stack:', error.stack);
    console.error('========================\n');
    
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'envoi du code',
      error: error.message
    });
  }
});

// Route pour vérifier le code et réinitialiser le mot de passe
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    console.log('🔐 Vérification du code pour:', email);

    // Récupérer les données stockées
    const resetData = resetCodes.get(email);

    if (!resetData) {
      return res.status(400).json({ 
        success: false, 
        message: 'Aucune demande de réinitialisation trouvée' 
      });
    }

    // Vérifier si le code a expiré
    if (resetData.expires < Date.now()) {
      resetCodes.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'Code expiré. Veuillez faire une nouvelle demande.' 
      });
    }

    // Vérifier le nombre de tentatives (max 3)
    if (resetData.attempts >= 3) {
      resetCodes.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'Trop de tentatives. Veuillez faire une nouvelle demande.' 
      });
    }

    // Vérifier le code
    if (resetData.code !== code) {
      resetData.attempts++;
      resetCodes.set(email, resetData);
      
      const remainingAttempts = 3 - resetData.attempts;
      return res.status(400).json({ 
        success: false, 
        message: `Code incorrect. Il vous reste ${remainingAttempts} tentative(s).` 
      });
    }

    // Trouver l'utilisateur
    const user = await User.findOne({ where: { Login: email } });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Hacher le nouveau mot de passe
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Mettre à jour le mot de passe
    user.Mot_de_passe = hashedPassword;
    await user.save();

    // Supprimer le code utilisé
    resetCodes.delete(email);

    console.log('✅ Mot de passe réinitialisé avec succès pour:', email);

    res.json({ 
      success: true, 
      message: 'Mot de passe réinitialisé avec succès' 
    });

  } catch (error) {
    console.error('❌ Erreur reset password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de la réinitialisation' 
    });
  }
});

// Route pour renvoyer un nouveau code
router.post('/resend-code', async (req, res) => {
  try {
    const { email } = req.body;

    // Supprimer l'ancien code
    resetCodes.delete(email);

    // Rediriger vers la route forgot-password pour générer un nouveau code
    const user = await User.findOne({ where: { Login: email } });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Utilisateur non trouvé' 
      });
    }

    // Générer un nouveau code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    resetCodes.set(email, {
      code: resetCode,
      expires: Date.now() + 15 * 60 * 1000,
      attempts: 0,
      userId: user.id_utilisateur
    });

    // Envoyer l'email
    const transporter = require('../config/emailConfig').transporter;
    const mailOptions = {
      from: '"SRTB HSE" <securite@srtb.tn>',
      to: email,
      subject: '🔐 Nouveau code de réinitialisation - SRTB HSE',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #2563eb;">SRTB HSE</h2>
          <p>Bonjour ${user.Login},</p>
          <p>Votre nouveau code de réinitialisation est :</p>
          <div style="background: #f3f4f6; padding: 20px; text-align: center; font-size: 32px; letter-spacing: 5px; font-weight: bold;">
            ${resetCode}
          </div>
          <p>Ce code expire dans 15 minutes.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: 'Nouveau code envoyé' 
    });

  } catch (error) {
    console.error('❌ Erreur renvoi code:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors du renvoi du code' 
    });
  }
});

module.exports = router;