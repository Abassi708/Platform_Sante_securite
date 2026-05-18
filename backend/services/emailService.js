// backend/services/emailService.js
const nodemailer = require('nodemailer');

// ========== CONFIGURATION TRANSPORTEUR ==========
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  debug: true,
  logger: true
});

transporter.verify((error, success) => {
  if (error) {
    console.log('❌ Erreur configuration email:', error.message);
  } else {
    console.log('✅ Serveur email prêt - Connexion SMTP établie');
  }
});

// ========== ENVOI EMAIL DE SUPPORT DEPUIS L'AGENT ==========
const sendAgentSupportEmail = async (data) => {
  try {
    const { 
      to, 
      toName, 
      subject, 
      message, 
      agentName, 
      agentMatricule, 
      agentEmail, 
      agentTelephone,
      type,
      urgence
    } = data;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
            background-color: #f5f5f5;
            margin: 0;
            padding: 20px;
            line-height: 1.5;
          }
          .container {
            max-width: 650px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
          }
          .header {
            background-color: #2c3e50;
            padding: 24px 30px;
            border-bottom: 2px solid #c4a962;
          }
          .header h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 600;
            color: #ffffff;
            letter-spacing: 0.5px;
          }
          .header p {
            margin: 6px 0 0;
            font-size: 13px;
            color: #bdc3c7;
          }
          .content {
            padding: 30px;
          }
          .section {
            margin-bottom: 24px;
            border-bottom: 1px solid #e0e0e0;
            padding-bottom: 20px;
          }
          .section:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .section-title {
            font-size: 14px;
            font-weight: 600;
            color: #2c3e50;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .info-row {
            display: flex;
            margin-bottom: 10px;
            font-size: 14px;
          }
          .info-label {
            width: 130px;
            font-weight: 600;
            color: #4a5568;
          }
          .info-value {
            flex: 1;
            color: #2d3748;
          }
          .message-box {
            background-color: #f8f9fa;
            padding: 16px;
            border-left: 3px solid #2c3e50;
            margin-top: 10px;
            font-size: 14px;
            color: #2d3748;
            white-space: pre-wrap;
            line-height: 1.6;
          }
          .footer {
            background-color: #f8f9fa;
            padding: 16px 30px;
            text-align: center;
            font-size: 11px;
            color: #7f8c8d;
            border-top: 1px solid #e0e0e0;
          }
          .footer a {
            color: #2c3e50;
            text-decoration: none;
          }
          .badge {
            display: inline-block;
            padding: 2px 10px;
            font-size: 11px;
            font-weight: normal;
            border-radius: 3px;
          }
          .badge-normale {
            background-color: #e8f5e9;
            color: #2e7d32;
          }
          .badge-importante {
            background-color: #fff3e0;
            color: #e65100;
          }
          .badge-urgente {
            background-color: #ffebee;
            color: #c62828;
          }
          a {
            color: #2c3e50;
            text-decoration: none;
          }
          a:hover {
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>SRTB - Plateforme Santé & Sécurité</h1>
            <p>Demande de support - Espace Agent</p>
          </div>
          
          <div class="content">
            <!-- Section 1 : Informations du demandeur -->
            <div class="section">
              <div class="section-title">Informations du demandeur</div>
              <div class="info-row">
                <div class="info-label">Nom complet :</div>
                <div class="info-value">${agentName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Matricule :</div>
                <div class="info-value">${agentMatricule}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Email :</div>
                <div class="info-value"><a href="mailto:${agentEmail}">${agentEmail}</a></div>
              </div>
              ${agentTelephone ? `
              <div class="info-row">
                <div class="info-label">Téléphone :</div>
                <div class="info-value">${agentTelephone}</div>
              </div>
              ` : ''}
              <div class="info-row">
                <div class="info-label">Date d'envoi :</div>
                <div class="info-value">${new Date().toLocaleString('fr-FR')}</div>
              </div>
            </div>
            
            <!-- Section 2 : Détails de la demande -->
            <div class="section">
              <div class="section-title">Détails de la demande</div>
              <div class="info-row">
                <div class="info-label">Service destinataire :</div>
                <div class="info-value">${toName}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Type de demande :</div>
                <div class="info-value">${type}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Niveau d'urgence :</div>
                <div class="info-value">
                  <span class="badge badge-${urgence === 'Normale' ? 'normale' : (urgence === 'Importante' ? 'importante' : 'urgente')}">${urgence}</span>
                </div>
              </div>
              <div class="info-row">
                <div class="info-label">Objet :</div>
                <div class="info-value"><strong>${subject}</strong></div>
              </div>
            </div>
            
            <!-- Section 3 : Message -->
            <div class="section">
              <div class="section-title">Message</div>
              <div class="message-box">${message.replace(/\n/g, '<br>')}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>Société Régionale de Transport de Bizerte - Service Santé & Sécurité au Travail</p>
            <p>Ce message a été envoyé depuis l'espace agent. Pour répondre, veuillez utiliser l'adresse email du demandeur.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"SRTB - Plateforme Sante Securite" <${process.env.EMAIL_USER}>`,
      to: to,
      subject: `[SRTB] Demande de support - ${agentName} - ${subject}`,
      html: html,
      replyTo: agentEmail
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email support envoyé à ${to}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Erreur envoi email support:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendAgentSupportEmail
};