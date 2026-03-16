// backend/routes/passwordRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
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
    const { email } = req.body;
    
    console.log('📧 Demande de code de réinitialisation pour:', email);
    
    // Vérifier si l'utilisateur existe
    const user = await User.findOne({ where: { Login: email } });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aucun compte trouvé avec cet email' 
      });
    }

    // Générer un code à 6 chiffres
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Stocker le code avec expiration (15 minutes)
    resetCodes.set(email, {
      code: resetCode,
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      attempts: 0,
      userId: user.id_utilisateur
    });

    console.log(`🔐 Code généré pour ${email}: ${resetCode}`);

    // Envoyer l'email avec le code en utilisant ta fonction existante
    // Ou envoyer directement
    const mailOptions = {
      from: '"SRTB HSE" <securite@srtb.tn>',
      to: email,
      subject: '🔐 Code de réinitialisation - SRTB HSE',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 500px;
              margin: 30px auto;
              background: white;
              border-radius: 16px;
              box-shadow: 0 10px 30px rgba(0,0,0,0.1);
              overflow: hidden;
            }
            .header {
              background: linear-gradient(135deg, #2563eb, #1e40af);
              color: white;
              padding: 30px;
              text-align: center;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .header p {
              margin: 10px 0 0;
              opacity: 0.9;
            }
            .content {
              padding: 40px 30px;
              text-align: center;
            }
            .code-label {
              color: #64748b;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 10px;
            }
            .code-box {
              background: linear-gradient(135deg, #f8fafc, #f1f5f9);
              border: 2px dashed #2563eb;
              border-radius: 20px;
              padding: 20px;
              margin: 20px 0;
            }
            .code {
              font-size: 48px;
              font-weight: bold;
              color: #2563eb;
              letter-spacing: 8px;
              font-family: monospace;
            }
            .info {
              background: #e0f2fe;
              padding: 15px;
              border-radius: 12px;
              margin: 20px 0;
              color: #0369a1;
              font-size: 14px;
            }
            .warning {
              background: #fee2e2;
              padding: 15px;
              border-radius: 12px;
              margin: 20px 0;
              color: #991b1b;
              font-size: 13px;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #64748b;
              font-size: 12px;
              border-top: 1px solid #e2e8f0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SRTB HSE</h1>
              <p>Réinitialisation de mot de passe</p>
            </div>
            
            <div class="content">
              <p>Bonjour <strong>${user.Login}</strong>,</p>
              
              <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
              
              <div class="code-label">Votre code de réinitialisation</div>
              
              <div class="code-box">
                <div class="code">${resetCode}</div>
              </div>
              
              <div class="info">
                ⏰ Ce code est valable pendant <strong>15 minutes</strong>
              </div>
              
              <p>Utilisez ce code pour réinitialiser votre mot de passe.</p>
              
              <div class="warning">
                ⚠️ Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
              </div>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} SRTB - Société Régionale de Transport de Bizerte</p>
              <p>Email automatique - Merci de ne pas répondre</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Utiliser ton transporteur existant
    const transporter = require('../config/emailConfig').transporter;
    await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      message: 'Code de réinitialisation envoyé par email',
      email: email
    });

  } catch (error) {
    console.error('❌ Erreur forgot password:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur lors de l\'envoi du code' 
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
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            /* Mêmes styles que ci-dessus */
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>SRTB HSE</h1>
              <p>Nouveau code de réinitialisation</p>
            </div>
            <div class="content">
              <p>Voici votre nouveau code de réinitialisation :</p>
              <div class="code-box">
                <div class="code">${resetCode}</div>
              </div>
              <div class="info">
                ⏰ Valable 15 minutes
              </div>
            </div>
          </div>
        </body>
        </html>
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