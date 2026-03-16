const express = require('express');
const router = express.Router();
const { 
  loginAdmin, 
  loginTechnicien,
  loginSocial,
  loginAgent,
  registerUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  resetPassword,
  getHistorique,
  getHistoriqueStats,
  getMe,
  logout,
  getConnexionsStats,  // ← AJOUTEZ CETTE LIGNE
  getGlobalStats        // ← AJOUTEZ CETTE LIGNE
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// ========== ROUTES PUBLIQUES ==========
router.post('/admin/login', loginAdmin);
router.post('/technicien/login', loginTechnicien);
router.post('/social/login', loginSocial);
router.post('/agent/login', loginAgent);
router.post('/register', registerUser);

// ========== ROUTES PROTÉGÉES ==========
// Profil
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Gestion des utilisateurs
router.get('/users', protect, getUsers);
router.get('/users/:id', protect, getUserById);
router.put('/users/:id', protect, updateUser);
router.delete('/users/:id', protect, deleteUser);
router.post('/users/:id/reset-password', protect, resetPassword);

// Historique
router.get('/historique', protect, getHistorique);
router.get('/historique/stats', protect, getHistoriqueStats);

// ========== ROUTES DE STATISTIQUES ==========
router.get('/stats/connexions', protect, getConnexionsStats);
router.get('/stats/global', protect, getGlobalStats);

module.exports = router;