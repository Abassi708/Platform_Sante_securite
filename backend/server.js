const express = require('express');
const cors = require('cors');
require('dotenv').config();
const sequelize = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const otpRoutes = require('./routes/otpRoutes');
const accidentRoutes = require('./routes/accidentRoutes');
const visiteRoutes = require('./routes/visiteRoutes');

require('./models');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005'
];

// Configuration CORS simplifiée
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

// Pas besoin de app.options('*', cors()) - cors() gère déjà OPTIONS

app.use(express.json());

app.use((req, res, next) => {
  console.log(`📡 ${req.method} ${req.url} - ${new Date().toLocaleTimeString()}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api', accidentRoutes);
app.use('/api', visiteRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend opérationnel' });
});

const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => {
    console.log('✅ Connecté à MySQL');
    console.log('✅ Connexion à la base de données établie');
    app.listen(PORT, () => {
      console.log(`✅ Backend démarré sur http://localhost:${PORT}`);
    });
  })
  .catch(error => {
    console.error('❌ Erreur de connexion à la base de données:', error);
  });
console.log('✅ Serveur email prêt');