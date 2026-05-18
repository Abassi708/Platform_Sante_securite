const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { sendAgentSupportEmail } = require('../services/emailService');

router.post('/support/agent-send', protect, async (req, res) => {
  try {
    const { destinataireEmail, destinataireNom, objet, message, agent_nom, agent_prenom, agent_matricule, agent_email } = req.body;
    
    const result = await sendAgentSupportEmail({
      to: destinataireEmail,
      toName: destinataireNom,
      subject: objet,
      message: message,
      agentName: `${agent_nom} ${agent_prenom}`,
      agentMatricule: agent_matricule,
      agentEmail: agent_email
    });
    
    if (result.success) {
      res.json({ success: true, message: 'Email envoyé' });
    } else {
      res.status(500).json({ success: false, message: result.error });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;