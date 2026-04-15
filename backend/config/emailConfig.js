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
    console.log('🔑 Vérifiez EMAIL_USER et EMAIL_PASS dans votre .env');
  } else {
    console.log('✅ Serveur email prêt - Connexion SMTP établie');
    console.log('📧 Envoi possible depuis:', process.env.EMAIL_USER);
  }
});

// ========== FONCTIONS DE FORMATAGE DE DATES (CORRIGÉES) ==========
function formatDateFR(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

function formatDateFRShort(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// ========== HELPER : BADGE TYPE DE VISITE ==========
function badgeTypeVisite(type) {
  const map = {
    'Périodique':  { bg: '#2563eb', label: 'Périodique' },
    'Reprise':     { bg: '#16a34a', label: 'Reprise'    },
    'Reclassement':{ bg: '#d97706', label: 'Reclassement'}
  };
  const cfg = map[type] || { bg: '#64748b', label: type };
  return `<span style="background:${cfg.bg};color:white;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:bold;">${cfg.label}</span>`;
}

// ========== HELPER : BADGE POSTE ==========
function badgePoste(codeAffectation) {
  return codeAffectation === 3
    ? `<span style="background:#7c3aed;color:white;padding:2px 8px;border-radius:12px;font-size:11px;">🚌 Chauffeur</span>`
    : `<span style="background:#0891b2;color:white;padding:2px 8px;border-radius:12px;font-size:11px;">👤 Contrôleur</span>`;
}

// ========== FONCTION RÉINITIALISATION MOT DE PASSE ==========
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
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #2563eb, #1e40af); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { padding: 30px; }
            .info { background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb; }
            .password-box { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 20px; text-align: center; border-radius: 8px; font-size: 28px; font-family: monospace; letter-spacing: 3px; margin: 20px 0; }
            .warning { background: #fee2e2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>HSE Manager</h1><p>Réinitialisation de votre mot de passe</p></div>
            <div class="content">
              <p>Bonjour,</p>
              <div class="info">
                <p><strong>📋 Rôle :</strong> ${userRole}</p>
                <p><strong>📧 Email :</strong> ${userEmail}</p>
              </div>
              <p>Votre mot de passe a été réinitialisé par l'administrateur.</p>
              <p><strong>Raison :</strong> ${reason}</p>
              <p><strong>🔑 Votre nouveau mot de passe :</strong></p>
              <div class="password-box">${newPassword}</div>
              <div class="warning">
                <p><strong>⚠️ Important :</strong></p>
                <p>• Ce mot de passe est personnel et confidentiel</p>
                <p>• Changez-le dès votre prochaine connexion</p>
                <p>• Si vous n'êtes pas à l'origine de cette demande, contactez l'administrateur</p>
              </div>
              <p><strong>🔗 Lien de connexion :</strong> <a href="${process.env.APP_URL || 'http://localhost:3000'}">${process.env.APP_URL || 'http://localhost:3000'}</a></p>
            </div>
            <div class="footer">
              <p>Email automatique - Merci de ne pas répondre</p>
              <p>&copy; ${new Date().getFullYear()} SRTB - Société Régionale de Transport de Bizerte</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email réinitialisation envoyé à:', userEmail);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi email réinitialisation:', error);
    return { success: false, error: error.message };
  }
};

// ========== FONCTION ENVOI CODE OTP ==========
const sendOtpEmail = async (userEmail, userRole, otpCode) => {
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
            .warning { background: #fee2e2; padding: 15px; border-radius: 8px; font-size: 14px; color: #991b1b; }
            .footer { background: #f8fafc; padding: 15px; text-align: center; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>HSE Manager</h1><p>Connexion sans mot de passe</p></div>
            <div class="content">
              <h2>Bonjour ${userRole}</h2>
              <p>Voici votre code de vérification :</p>
              <div class="code">${otpCode}</div>
              <p>Ce code est valable <strong>5 minutes</strong></p>
              <div class="warning">⚠️ Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</div>
            </div>
            <div class="footer"><p>HSE Manager - Sécurité des accès</p><p>Email automatique - Ne pas répondre</p></div>
          </div>
        </body>
        </html>
      `
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email OTP envoyé à:', userEmail, '| ID:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi OTP:', error.message);
    return { success: false, error: error.message };
  }
};

// ========== ENVOYER CONVOCATION AU SERVICE GRH AVEC PDF ==========
const sendConvocationEmail = async (grhEmail, sujet, planning, pdfBuffer = null) => {
  try {
    if (!planning || planning.length === 0) {
      console.log('⚠️ Aucune visite à convoquer');
      return { success: false, error: 'Planning vide' };
    }

    const MEDECIN = 'Dr. Mahmoud Khelifi';
    const LIEU    = 'Infirmerie SRTB - Bizerte';

    // Groupement par date
    const visitesParJour = {};
    for (const v of planning) {
      const dateKey = v.date_visite;
      if (!visitesParJour[dateKey]) visitesParJour[dateKey] = [];
      visitesParJour[dateKey].push(v);
    }

    const nbTotal = planning.length;
    const nbChauffeurs = planning.filter(v => v.planningAgent?.code_affectation === 3).length;
    const nbAutres = nbTotal - nbChauffeurs;

    const dateMin = new Date(Object.keys(visitesParJour).sort()[0]);
    const dateMax = new Date(Object.keys(visitesParJour).sort().reverse()[0]);

    // Génération des lignes par jour
    let blocsJours = '';
    let numeroLigne = 1;

    for (const [dateKey, visites] of Object.entries(visitesParJour).sort()) {
      // ✅ UTILISER LA FONCTION CORRIGÉE
      const dateFormatee = formatDateFR(dateKey);

      const lignesAgents = visites.map(v => {
        const agent = v.planningAgent || {};
        const nom = agent.nom || '—';
        const prenom = agent.prenom || '—';
        const matricule = v.matricule_agent || '—';
        const agence = agent.code_agence || '—';
        const heure = (v.heure_visite || '').substring(0, 5);
        const bg = numeroLigne++ % 2 === 0 ? '#f8fafc' : '#ffffff';

        return `
          <tr style="background:${bg};">
            <td style="padding:10px 12px;font-weight:bold;color:#1e293b;border-bottom:1px solid #e2e8f0;">${matricule}</td>
            <td style="padding:10px 12px;color:#1e293b;border-bottom:1px solid #e2e8f0;">${nom} ${prenom}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${agence}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${badgePoste(agent.code_affectation)}</td>
            <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;">${badgeTypeVisite(v.type_visite)}</td>
            <td style="padding:10px 12px;font-weight:bold;color:#2563eb;border-bottom:1px solid #e2e8f0;">${heure}</td>
          </tr>
        `;
      }).join('');

      blocsJours += `
        <div style="margin:24px 0;background:#ffffff;border-radius:10px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06);">
          <div style="background:linear-gradient(135deg,#1e40af,#2563eb);color:white;padding:14px 20px;display:flex;align-items:center;">
            <span style="font-size:18px;margin-right:10px;">📅</span>
            <div>
              <div style="font-size:15px;font-weight:bold;text-transform:capitalize;">${dateFormatee}</div>
              <div style="font-size:12px;opacity:0.85;margin-top:2px;">${visites.length} visite(s) — ${LIEU} — ${MEDECIN}</div>
            </div>
          </div>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;font-family:'Segoe UI',sans-serif;">
            <thead>
              <tr style="background:#f1f5f9;">
                <th style="padding:9px 12px;text-align:left;color:#475569;font-weight:600;border-bottom:2px solid #cbd5e1;">Matricule</th>
                <th style="padding:9px 12px;text-align:left;color:#475569;font-weight:600;border-bottom:2px solid #cbd5e1;">Nom & Prénom</th>
                <th style="padding:9px 12px;text-align:left;color:#475569;font-weight:600;border-bottom:2px solid #cbd5e1;">Agence</th>
                <th style="padding:9px 12px;text-align:left;color:#475569;font-weight:600;border-bottom:2px solid #cbd5e1;">Poste</th>
                <th style="padding:9px 12px;text-align:left;color:#475569;font-weight:600;border-bottom:2px solid #cbd5e1;">Type de visite</th>
                <th style="padding:9px 12px;text-align:left;color:#475569;font-weight:600;border-bottom:2px solid #cbd5e1;">Heure</th>
              </tr>
            </thead>
            <tbody>
              ${lignesAgents}
            </tbody>
           </table>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
      </head>
      <body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
        <div style="max-width:680px;margin:24px auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.10);">
          <div style="background:linear-gradient(135deg,#1e3a8a,#2563eb,#3b82f6);padding:36px 30px;text-align:center;">
            <div style="font-size:32px;margin-bottom:8px;">🏥</div>
            <h1 style="margin:0;color:white;font-size:24px;letter-spacing:1px;">SRTB — Service HSE</h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.88);font-size:14px;">Demande de convocations pour visites médicales</p>
          </div>
          <div style="padding:30px;">
            <p style="margin:0 0 16px;font-size:15px;color:#1e293b;">Bonjour,</p>
            <p style="margin:0 0 20px;font-size:15px;color:#334155;line-height:1.6;">
              Le Service HSE vous informe qu'un planning de visites médicales a été établi.<br>
              Nous vous remercions de bien vouloir préparer et distribuer les <strong>convocations individuelles</strong>
              aux agents concernés <strong>avant la date de leur visite</strong>.
            </p>
            <div style="background:#eff6ff;border-left:4px solid #2563eb;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
              <div style="font-size:13px;color:#1e40af;font-weight:600;margin-bottom:10px;">📋 INFORMATIONS DE LA CONVOCATION</div>
              <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#334155;">
                <tr><td style="padding:4px 0;width:40%;"><strong>🩺 Médecin du travail</strong></td><td style="padding:4px 0;">${MEDECIN}</td></tr>
                <tr><td style="padding:4px 0;"><strong>📍 Lieu</strong></td><td style="padding:4px 0;">${LIEU}</td></tr>
                <tr><td style="padding:4px 0;"><strong>📅 Période</strong></td><td style="padding:4px 0;">Du ${formatDateFR(dateMin.toISOString().split('T')[0])} au ${formatDateFR(dateMax.toISOString().split('T')[0])}</td></tr>
                <tr><td style="padding:4px 0;"><strong>👥 Nombre d'agents</strong></td><td style="padding:4px 0;">${nbTotal} agent(s)</td></tr>
              </table>
            </div>
            <div style="display:flex;gap:10px;margin:0 0 28px;flex-wrap:wrap;">
              <div style="flex:1;min-width:130px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:bold;color:#16a34a;">${nbTotal}</div>
                <div style="font-size:12px;color:#15803d;margin-top:4px;">Total visites</div>
              </div>
              <div style="flex:1;min-width:130px;background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:bold;color:#7c3aed;">${nbChauffeurs}</div>
                <div style="font-size:12px;color:#6d28d9;margin-top:4px;">🚌 Chauffeurs</div>
              </div>
              <div style="flex:1;min-width:130px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;text-align:center;">
                <div style="font-size:22px;font-weight:bold;color:#2563eb;">${nbAutres}</div>
                <div style="font-size:12px;color:#1d4ed8;margin-top:4px;">👤 Autres postes</div>
              </div>
            </div>
            <div style="font-size:16px;font-weight:700;color:#1e293b;margin:0 0 8px;padding-bottom:8px;border-bottom:2px solid #e2e8f0;">📋 Liste des agents à convoquer</div>
            ${blocsJours}
            <div style="background:#fefce8;border-left:4px solid #eab308;border-radius:8px;padding:16px 20px;margin:24px 0;">
              <div style="font-size:13px;color:#a16207;font-weight:600;margin-bottom:10px;">⚠️ INSTRUCTIONS IMPORTANTES</div>
              <ul style="margin:0;padding-left:18px;font-size:13px;color:#92400e;line-height:1.8;">
                <li>Distribuer les convocations aux agents <strong>au moins 48h avant</strong> leur visite</li>
                <li>Préciser à chaque agent l'heure exacte de son rendez-vous</li>
                <li>S'assurer que l'agent se présente <strong>à jeun si nécessaire</strong></li>
                <li>En cas d'absence ou d'empêchement, contacter immédiatement le service HSE</li>
                <li>Conserver une copie signée de chaque convocation remise</li>
              </ul>
            </div>
            <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;margin:0 0 20px;font-size:13px;color:#475569;">
              <div style="font-weight:600;color:#1e293b;margin-bottom:6px;">📞 Contact Service HSE</div>
              Pour toute question ou signalement d'absence, contactez le service HSE avant la date de visite.
            </div>
            <p style="font-size:14px;color:#334155;margin:0;">
              Cordialement,<br>
              <strong>Le Service HSE — SRTB Bizerte</strong>
            </p>
          </div>
          <div style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 30px;text-align:center;">
            <p style="margin:0 0 6px;font-size:12px;color:#64748b;">&copy; ${new Date().getFullYear()} SRTB — Société Régionale de Transport de Bizerte</p>
            <p style="margin:0;font-size:11px;color:#94a3b8;">Cet email a été généré automatiquement par le système HSE Manager. Merci de ne pas y répondre directement.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: `"SRTB — Service HSE" <${process.env.EMAIL_USER}>`,
      to: grhEmail,
      subject: `📋 Convocations à distribuer — ${sujet}`,
      html: html
    };

    if (pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: `convocations_${new Date().toISOString().split('T')[0]}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ];
      console.log(`📎 Pièce jointe PDF ajoutée (${pdfBuffer.length} bytes)`);
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ Email de convocation envoyé à ${grhEmail} | ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ Erreur envoi convocation GRH:', error.message);
    return { success: false, error: error.message };
  }
};

module.exports = {
  transporter,
  sendResetEmail,
  sendOtpEmail,
  sendConvocationEmail
};