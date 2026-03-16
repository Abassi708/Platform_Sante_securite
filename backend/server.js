const express = require('express');
const cors = require('cors');
require('dotenv').config();
const sequelize = require('./config/database');

// Import des routes
const authRoutes = require('./routes/authRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const otpRoutes = require('./routes/otpRoutes');
const accidentRoutes = require('./routes/accidentRoutes');
const visiteRoutes = require('./routes/visiteRoutes');
const passwordRoutes = require('./routes/passwordRoutes');

require('./models');

const app = express();

// ✅ DIAGNOSTIC DES IMPORTS
console.log('🔍 DIAGNOSTIC DES IMPORTS:');
console.log('authRoutes est un router:', typeof authRoutes === 'function');
console.log('notificationRoutes est un router:', typeof notificationRoutes === 'function');
console.log('otpRoutes est un router:', typeof otpRoutes === 'function');
console.log('accidentRoutes est un router:', typeof accidentRoutes === 'function');
console.log('visiteRoutes est un router:', typeof visiteRoutes === 'function');
console.log('passwordRoutes est un router:', typeof passwordRoutes === 'function');
console.log('====================================');

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005'
];

// Configuration CORS
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Middleware de logging
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url} - ${new Date().toLocaleTimeString()}`);
  next();
});

// ✅ MONTAGE DES ROUTES AVEC VÉRIFICATION
try {
  if (typeof authRoutes === 'function') {
    app.use('/api/auth', authRoutes);
    console.log('✅ Route /api/auth montée');
  } else {
    console.error('❌ authRoutes n\'est pas un router valide');
  }

  if (typeof notificationRoutes === 'function') {
    app.use('/api/notifications', notificationRoutes);
    console.log('✅ Route /api/notifications montée');
  } else {
    console.error('❌ notificationRoutes n\'est pas un router valide');
  }

  if (typeof otpRoutes === 'function') {
    app.use('/api/otp', otpRoutes);
    console.log('✅ Route /api/otp montée');
  } else {
    console.error('❌ otpRoutes n\'est pas un router valide');
  }

  if (typeof accidentRoutes === 'function') {
    app.use('/api', accidentRoutes);
    console.log('✅ Route /api/accident montée');
  } else {
    console.error('❌ accidentRoutes n\'est pas un router valide');
  }

  if (typeof visiteRoutes === 'function') {
    app.use('/api', visiteRoutes);
    console.log('✅ Route /api/visite montée');
  } else {
    console.error('❌ visiteRoutes n\'est pas un router valide');
  }

  if (typeof passwordRoutes === 'function') {
    app.use('/api/password', passwordRoutes);
    console.log('✅ Route /api/password montée');
  } else {
    console.error('❌ passwordRoutes n\'est pas un router valide');
  }
} catch (error) {
  console.error('❌ Erreur lors du montage des routes:', error.message);
}

// Route de santé (toujours accessible même si les autres routes échouent)
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    message: 'Backend opérationnel',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

// Connexion à la base de données et démarrage du serveur
sequelize.authenticate()
  .then(() => {
    console.log('✅ Connecté à MySQL');
    console.log('✅ Connexion à la base de données établie');
    
    app.listen(PORT, () => {
      console.log(`✅ Backend démarré sur http://localhost:${PORT}`);
      console.log(`✅ Test: http://localhost:${PORT}/api/health`);
    });
  })
  .catch(error => {
    console.error('❌ Erreur de connexion à la base de données:', error);
    process.exit(1); // Arrêter le processus si la DB ne répond pas
  });

console.log('✅ Serveur email configuré');