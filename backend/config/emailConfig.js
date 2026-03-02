// backend/config/emailConfig.js
const nodemailer = require('nodemailer');

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // ou votre serveur SMTP
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

// Fonction pour envoyer l'email de réinitialisation
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
    console.log('✅ Email envoyé à:', userEmail);
    return { success: true, messageId: info.messageId };
    
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendResetEmail };