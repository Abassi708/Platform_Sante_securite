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
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// ========== ROUTES PUBLIQUES ==========
// Routes de login pour chaque rôle
router.post('/admin/login', loginAdmin);
router.post('/technicien/login', loginTechnicien);
router.post('/social/login', loginSocial);
router.post('/agent/login', loginAgent);

// Route d'inscription (pour créer des utilisateurs - à protéger plus tard)
router.post('/register', registerUser);

// ========== ROUTES PROTÉGÉES ==========
// Profil
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

// Gestion des utilisateurs (admin seulement)
router.get('/users', protect, getUsers);
router.get('/users/:id', protect, getUserById);
router.put('/users/:id', protect, updateUser);
router.delete('/users/:id', protect, deleteUser);
router.post('/users/:id/reset-password', protect, resetPassword);

// Historique (admin, technicien, social)
router.get('/historique', protect, getHistorique);
router.get('/historique/stats', protect, getHistoriqueStats);

module.exports = router;