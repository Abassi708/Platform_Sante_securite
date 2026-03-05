const nodemailer = require('nodemailer');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Vérifier la connexion
transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Erreur configuration email:', error);
  } else {
    console.log('✅ Serveur email prêt');
  }
});

// ========== FONCTION EXISTANTE (réinitialisation) ==========
const sendResetEmail = async (userEmail, userRole, newPassword, reason) => {
  try {
    const mailOptions = {
      from: '"HSE Manager" <securite@hsemanager.com>',
      to: userEmail,
      subject: '🔐 Réinitialisation de votre mot de passe - HSE Manager',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #f4f4f4;
              margin: 0;
              padding: 0;
            }
            .container {
              max-width: 600px;
              margin: 20px auto;
              background: white;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #2563eb, #1e40af);
              color: white;
              padding: 30px;
              text-align: center;
              border-radius: 10px 10px 0 0;
            }
            .header h1 {
              margin: 0;
              font-size: 28px;
            }
            .content {
              padding: 30px;
            }
            .info {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #2563eb;
            }
            .password-box {
              background: linear-gradient(135deg, #f59e0b, #d97706);
              color: white;
              padding: 20px;
              text-align: center;
              border-radius: 8px;
              font-size: 28px;
              font-family: monospace;
              letter-spacing: 3px;
              margin: 20px 0;
            }
            .warning {
              background: #fee2e2;
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
              border-left: 4px solid #ef4444;
            }
            .footer {
              text-align: center;
              padding: 20px;
              color: #666;
              font-size: 12px;
              border-top: 1px solid #eee;
            }
            .role-badge {
              display: inline-block;
              padding: 4px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: bold;
              background: #e2e8f0;
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>HSE Manager</h1>
              <p>Réinitialisation de votre mot de passe</p>
            </div>
            
            <div class="content">
              <p>Bonjour,</p>
              
              <div class="info">
                <p><strong>📋 Rôle :</strong> <span class="role-badge">${userRole}</span></p>
                <p><strong>📧 Email :</strong> ${userEmail}</p>
              </div>
              
              <p>Votre mot de passe a été réinitialisé par l'administrateur.</p>
              
              <p><strong>Raison du changement :</strong></p>
              <p>${reason}</p>
              
              <p><strong>🔑 Votre nouveau mot de passe :</strong></p>
              
              <div class="password-box">
                ${newPassword}
              </div>
              
              <div class="warning">
                <p><strong>⚠️ Important :</strong></p>
                <p>• Ce mot de passe est personnel et confidentiel</p>
                <p>• Changez-le dès votre prochaine connexion</p>
                <p>• Si vous n'êtes pas à l'origine de cette demande, contactez l'administrateur</p>
              </div>
              
              <p><strong>🔗 Lien de connexion :</strong></p>
              <p><a href="http://localhost:3000">http://localhost:3000</a></p>
            </div>
            
            <div class="footer">
              <p>Cet email a été envoyé automatiquement par HSE Manager.</p>
              <p>Merci de ne pas y répondre.</p>
              <p>&copy; ${new Date().getFullYear()} HSE Manager. Tous droits réservés.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de réinitialisation envoyé à:', userEmail);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
};

// ========== NOUVELLE FONCTION POUR OTP ==========
const sendCodeOTP = async (userEmail, userRole, codeOTP) => {
  try {
    const mailOptions = {
      from: '"HSE Manager Sécurité" <securite@hsemanager.com>',
      to: userEmail,
      subject: '🔐 Votre code de connexion HSE Manager',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 400px; margin: 0 auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #2563eb, #1e40af); color: white; padding: 20px; text-align: center; }
            .content { padding: 30px; text-align: center; }
            .code { font-size: 48px; font-weight: bold; color: #2563eb; letter-spacing: 10px; margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 8px; }
            .info { color: #666; margin: 20px 0; }
            .warning { background: #fee2e2; padding: 15px; border-radius: 8px; font-size: 14px; color: #991b1b; }
            .footer { background: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>HSE Manager</h1>
              <p>Connexion sans mot de passe</p>
            </div>
            
            <div class="content">
              <h2>Bonjour ${userRole}</h2>
              
              <p>Vous avez demandé à vous connecter sans mot de passe.</p>
              
              <p>Voici votre code de vérification :</p>
              
              <div class="code">${codeOTP}</div>
              
              <p class="info">Ce code est valable <strong>5 minutes</strong></p>
              
              <div class="warning">
                ⚠️ Si vous n'êtes pas à l'origine de cette demande,<br>
                ignorez cet email.
              </div>
            </div>
            
            <div class="footer">
              <p>HSE Manager - Sécurité des accès</p>
              <p>Email automatique - Ne pas répondre</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email OTP envoyé à:', userEmail);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Erreur envoi email OTP:', error);
    return { success: false, error: error.message };
  }
};

// ========== EXPORTER LES DEUX FONCTIONS ==========
module.exports = { 
  transporter,    // ← AJOUTÉ (utile pour d'autres fichiers)
  sendResetEmail, 
  sendCodeOTP     // ← NOUVELLE FONCTION
};