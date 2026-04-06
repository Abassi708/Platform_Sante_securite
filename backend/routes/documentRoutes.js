// backend/routes/documentRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../models');
const jwt = require('jsonwebtoken');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

// Middleware pour vérifier le token (dans header OU dans URL)
const authMiddleware = async (req, res, next) => {
  let token;
  
  // Vérifier dans le header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Vérifier dans l'URL
  else if (req.query.token) {
    token = req.query.token;
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Non autorisé' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await db.local.User.findByPk(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'Utilisateur non trouvé' });
    }
    
    // 🔥 CORRECTION : Ajouter matricule_agent correctement
    req.user = {
      id: user.id_utilisateur,
      email: user.Login,
      role: user.Role,
      matricule_agent: user.matricule_agent  // ← Cette ligne est CRUCIALE !
    };
    
    console.log('✅ Utilisateur authentifié:', req.user);
    next();
  } catch (error) {
    console.error('Erreur token:', error.message);
    return res.status(401).json({ message: 'Token invalide' });
  }
};

// Route de test
router.get('/test', authMiddleware, (req, res) => {
  res.json({ success: true, message: 'Route fonctionne !', user: req.user });
});

// Route pour générer le certificat
router.get('/certificat', authMiddleware, async (req, res) => {
  try {
    const matricule = req.user.matricule_agent;
    console.log('📄 Génération certificat pour matricule:', matricule);
    
    if (!matricule) {
      return res.status(400).json({ success: false, message: 'Matricule agent non trouvé' });
    }
    
    // Récupérer les données de l'agent
    const agent = await db.global.Agent.findOne({
      where: { matricule_agent: matricule }
    });
    
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent non trouvé' });
    }
    
    // Créer le dossier s'il n'existe pas
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Créer le PDF
    const filename = `certificat_${matricule}_${Date.now()}.pdf`;
    const filepath = path.join(uploadDir, filename);
    
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    // Générer le PDF
    doc.fontSize(20).font('Helvetica-Bold')
      .text('CERTIFICAT MÉDICAL D\'APTITUDE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Agent: ${agent.nom} ${agent.prenom}`);
    doc.text(`Matricule: ${agent.matricule_agent}`);
    doc.text(`Date: ${moment().format('DD/MM/YYYY')}`);
    doc.moveDown();
    doc.fontSize(10).text('Certifié par Dr. Mahmoud Khelifi');
    
    doc.end();
    
    stream.on('finish', () => {
      res.download(filepath, filename);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route pour la déclaration d'accident
router.get('/declaration-accident/:accidentId', authMiddleware, async (req, res) => {
  try {
    const matricule = req.user.matricule_agent;
    const accident = await db.local.Accident.findByPk(req.params.accidentId);
    
    if (!accident) {
      return res.status(404).json({ success: false, message: 'Accident non trouvé' });
    }
    
    const agent = await db.global.Agent.findOne({
      where: { matricule_agent: matricule }
    });
    
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent non trouvé' });
    }
    
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filename = `declaration_${accident.id_accident}_${Date.now()}.pdf`;
    const filepath = path.join(uploadDir, filename);
    
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    doc.fontSize(20).font('Helvetica-Bold')
      .text('DÉCLARATION D\'ACCIDENT DE TRAVAIL', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Agent: ${agent.nom} ${agent.prenom}`);
    doc.text(`Matricule: ${agent.matricule_agent}`);
    doc.text(`Date de l'accident: ${moment(accident.date_accident).format('DD/MM/YYYY')}`);
    doc.text(`Gravité: ${accident.gravite || 'Non définie'}`);
    doc.text(`Jours d'arrêt: ${accident.jour_arret || 0}`);
    
    doc.end();
    
    stream.on('finish', () => {
      res.download(filepath, filename);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route pour la convocation
router.get('/convocation/:planningId', authMiddleware, async (req, res) => {
  try {
    const matricule = req.user.matricule_agent;
    const planning = await db.local.Planning.findByPk(req.params.planningId);
    
    if (!planning) {
      return res.status(404).json({ success: false, message: 'Planning non trouvé' });
    }
    
    const agent = await db.global.Agent.findOne({
      where: { matricule_agent: matricule }
    });
    
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filename = `convocation_${planning.id_planning}_${Date.now()}.pdf`;
    const filepath = path.join(uploadDir, filename);
    
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    doc.fontSize(20).font('Helvetica-Bold')
      .text('CONVOCATION À VISITE MÉDICALE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Agent: ${agent.nom} ${agent.prenom}`);
    doc.text(`Date: ${moment(planning.date_visite).format('dddd DD MMMM YYYY')}`);
    doc.text(`Heure: ${planning.heure_visite?.substring(0,5) || '09:00'}`);
    doc.text(`Type: ${planning.type_visite}`);
    doc.text(`Lieu: Infirmerie SRTB - Bizerte`);
    
    doc.end();
    
    stream.on('finish', () => {
      res.download(filepath, filename);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route pour le bilan annuel
router.get('/bilan-annuel', authMiddleware, async (req, res) => {
  try {
    const matricule = req.user.matricule_agent;
    const agent = await db.global.Agent.findOne({
      where: { matricule_agent: matricule }
    });
    
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filename = `bilan_${matricule}_${new Date().getFullYear()}.xlsx`;
    const filepath = path.join(uploadDir, filename);
    
    // Simple fichier Excel ou PDF
    const doc = new PDFDocument({ margin: 50 });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    doc.fontSize(20).font('Helvetica-Bold')
      .text('BILAN ANNUEL DE SANTÉ', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Agent: ${agent.nom} ${agent.prenom}`);
    doc.text(`Matricule: ${agent.matricule_agent}`);
    doc.text(`Année: ${new Date().getFullYear()}`);
    
    doc.end();
    
    stream.on('finish', () => {
      res.download(filepath, filename);
    });
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route pour l'export complet
router.get('/export-complet', authMiddleware, async (req, res) => {
  try {
    const matricule = req.user.matricule_agent;
    const agent = await db.global.Agent.findOne({
      where: { matricule_agent: matricule }
    });
    
    const uploadDir = path.join(__dirname, '../../uploads/documents');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const JSZip = require('jszip');
    const zip = new JSZip();
    
    // Créer un fichier texte simple pour l'instant
    zip.file('infos_agent.txt', `Agent: ${agent.nom} ${agent.prenom}\nMatricule: ${agent.matricule_agent}`);
    
    const filename = `export_${matricule}_${Date.now()}.zip`;
    const filepath = path.join(uploadDir, filename);
    
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(filepath, zipBuffer);
    
    res.download(filepath, filename);
    
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;