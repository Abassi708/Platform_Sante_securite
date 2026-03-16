const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Import du contrôleur entier
const otpController = require('../controllers/otpController');

// Vérification des imports
console.log('🔍 VÉRIFICATION CONTROLLER OTP:');
console.log('Fonctions disponibles:', Object.keys(otpController));
console.log('================================');

// Routes publiques
router.post('/demander', otpController.demanderCode);
router.post('/verifier', otpController.verifierCode);
router.post('/renvoyer', otpController.renvoyerCode);
router.get('/statut/:email', otpController.verifierStatutCode);

// Route protégée pour les stats OTP (admin seulement)
if (typeof otpController.getOtpStats === 'function') {
  router.get('/stats', protect, otpController.getOtpStats);
  console.log('✅ Route /api/otp/stats ajoutée');
} else {
  console.warn('⚠️ Route /api/otp/stats non disponible');
}

module.exports = router;