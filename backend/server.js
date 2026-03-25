// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { sequelizeGlobal, sequelizeLocal, testConnections } = require('./config/database');

// ========== IMPORT DES MODÈLES ==========
const db = require('./models');

// ========== IMPORT DES ROUTES ==========
const authRoutes = require('./routes/authRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const otpRoutes = require('./routes/otpRoutes');
const accidentRoutes = require('./routes/accidentRoutes');
const visiteRoutes = require('./routes/visiteRoutes');
const passwordRoutes = require('./routes/passwordRoutes');
const notificationIntelligenteRoutes = require('./routes/notificationIntelligenteRoutes');
const previsionsRoutes = require('./routes/previsionsRoutes');
const planningRoutes = require('./routes/planningRoutes');
const technicienRoutes = require('./routes/technicienRoutes');

// ========== IMPORT DES CRONS ==========
require('./cron/planningCron');
require('./cron/notificationIntelligenteCron');
require('./cron/convocationCron');
require('./cron/autoPlanningCron');

const app = express();

// ========== CONFIGURATION CORS ==========
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://server680404.ddns.net:2500',  // Votre serveur
  'http://server680404.ddns.net:3000'   // Si le frontend est sur le même serveur
];

app.use(cors({
  origin: function(origin, callback) {
    // Autoriser les requêtes sans origin (comme Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('server680404.ddns.net')) {
      callback(null, true);
    } else {
      console.log('❌ CORS bloqué pour:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ========== MIDDLEWARES ==========
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url} - ${new Date().toLocaleTimeString()}`);
  next();
});

// ========== MONTAGE DES ROUTES ==========
try {
  app.use('/api/auth', authRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/otp', otpRoutes);
  app.use('/api', accidentRoutes);
  app.use('/api', visiteRoutes);
  app.use('/api/password', passwordRoutes);
  app.use('/api/notifications-intelligentes', notificationIntelligenteRoutes);
  app.use('/api/previsions', previsionsRoutes);
  app.use('/api', planningRoutes);
  app.use('/api/technicien', technicienRoutes);
  console.log('✅ Routes montées avec succès');
} catch (error) {
  console.error('❌ Erreur lors du montage des routes:', error.message);
}

// ========== ROUTE DE SANTÉ ==========
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    message: 'Backend opérationnel',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV
  });
});

// ========== DÉMARRAGE DU SERVEUR ==========
const PORT = process.env.PORT || 5000;

testConnections().then(() => {
  // Écouter sur toutes les interfaces réseau
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Serveur démarré sur http://localhost:${PORT}`);
    console.log(`   Accessible sur le réseau: http://${getLocalIp()}:${PORT}`);
    console.log(`   API publique: http://server680404.ddns.net:${PORT}/api/health`);
    console.log('\n✅ Backend prêt !\n');
  });
}).catch(error => {
  console.error('\n❌ Erreur de connexion aux bases de données:');
  console.error(error);
  console.log('\n💡 Vérifications:');
  console.log('   1. Le serveur MySQL est-il accessible depuis cette machine ?');
  console.log('   2. Le port 3368 est-il ouvert sur le serveur distant ?');
  console.log('   3. Les identifiants sont-ils corrects ?');
  process.exit(1);
});

function getLocalIp() {
  const { networkInterfaces } = require('os');
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'votre-ip';
}