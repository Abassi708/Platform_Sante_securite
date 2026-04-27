// backend/routes/authRoutes.js
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
  getConnexionsStats,
  getGlobalStats
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { auditMiddleware } = require('../middleware/auditMiddleware');  // ← AJOUTER CETTE LIGNE

// ========== ROUTES PUBLIQUES ==========
router.post('/admin/login', loginAdmin);
router.post('/technicien/login', loginTechnicien);
router.post('/social/login', loginSocial);
router.post('/agent/login', loginAgent);

// ========== ROUTES PROTÉGÉES AVEC AUDIT ==========
router.post('/register', protect, auditMiddleware, registerUser);  // ← AUDIT AJOUTÉ
router.get('/users', protect, auditMiddleware, getUsers);
router.get('/users/:id', protect, auditMiddleware, getUserById);
router.put('/users/:id', protect, auditMiddleware, updateUser);
router.delete('/users/:id', protect, auditMiddleware, deleteUser);
router.post('/users/:id/reset-password', protect, auditMiddleware, resetPassword);

// ========== AUTRES ROUTES ==========
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.get('/historique', protect, getHistorique);
router.get('/historique/stats', protect, getHistoriqueStats);
router.get('/stats/connexions', protect, getConnexionsStats);
router.get('/stats/global', protect, getGlobalStats);

module.exports = router;