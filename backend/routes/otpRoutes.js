const express = require('express');
const router = express.Router();
const { 
  demanderCode,
  verifierCodeEtConnecter,
  renvoyerCode,
  verifierStatutCode
} = require('../controllers/otpController');

// Routes publiques (pas besoin de token)
router.post('/demander', demanderCode);                 // Étape 1 : Demander un code
router.post('/verifier', verifierCodeEtConnecter);      // Étape 2 : Vérifier et connecter
router.post('/renvoyer', renvoyerCode);                  // Renvoyer un code
router.get('/statut/:email', verifierStatutCode);        // Vérifier statut

module.exports = router;