// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { sequelizeGlobal, sequelizeLocal, testConnections } = require('./config/database');

// ========== IMPORT DES MODÈLES ==========
const db = require('./models');

// ========== IMPORT DES MIDDLEWARES ==========
const { protect } = require('./middleware/authMiddleware');
const { auditMiddleware } = require('./middleware/auditMiddleware');

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
const documentRoutes = require('./routes/documentRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const creneauxRoutes = require('./routes/creneauxRoutes');
const auditRoutes = require('./routes/auditRoutes');

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
  'http://server680404.ddns.net:2500',
  'http://server680404.ddns.net:3000'
];

app.use(cors({
  origin: function(origin, callback) {
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

// ========== MIDDLEWARES DE BASE ==========
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========== ROUTES PUBLIQUES (SANS AUTHENTIFICATION) ==========
app.use('/api/auth', authRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/password', passwordRoutes);  // ✅ DÉPLACÉ ICI (route publique)
app.use('/api/health', (req, res) => {
  res.json({ 
    success: true,
    status: 'OK', 
    message: 'Backend opérationnel',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: process.env.NODE_ENV
  });
});

// ========== ROUTES PROTÉGÉES AVEC AUDIT ==========
// L'ordre est important: protect d'abord, puis auditMiddleware
app.use('/api/notifications', protect, auditMiddleware, notificationRoutes);
app.use('/api', protect, auditMiddleware, accidentRoutes);
app.use('/api', protect, auditMiddleware, visiteRoutes);
// app.use('/api/password', protect, auditMiddleware, passwordRoutes); // ❌ SUPPRIMÉ (déplacé en public)
app.use('/api/notifications-intelligentes', protect, auditMiddleware, notificationIntelligenteRoutes);
app.use('/api/previsions', protect, auditMiddleware, previsionsRoutes);
app.use('/api', protect, auditMiddleware, planningRoutes);
app.use('/api/technicien', protect, auditMiddleware, technicienRoutes);
app.use('/api/creneaux', protect, auditMiddleware, creneauxRoutes);
app.use('/api/chatbot', protect, auditMiddleware, chatbotRoutes);
app.use('/api/documents', protect, auditMiddleware, documentRoutes);

// Route d'audit (protégée)
app.use('/api/audit', protect, auditRoutes);

// ========== LOG DE DÉBOGAGE ==========
app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url} - ${new Date().toLocaleTimeString()}`);
  next();
});

// ========== DÉMARRAGE DU SERVEUR ==========
const PORT = process.env.PORT || 5000;

testConnections().then(() => {
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