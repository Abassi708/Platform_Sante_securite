// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { 
  sendPasswordNotification,
  getUserNotifications,
  getNotificationById,
  markAsRead,
  deleteNotification
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// Routes protégées
router.post('/send-password', protect, sendPasswordNotification);
router.get('/user/:userId', protect, getUserNotifications);
router.get('/:id', protect, getNotificationById); // NOUVELLE ROUTE
router.put('/:id/read', protect, markAsRead);
router.delete('/:id', protect, deleteNotification);

module.exports = router;