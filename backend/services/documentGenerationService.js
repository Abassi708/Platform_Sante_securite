// backend/services/documentGenerationService.js
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel } = require('docx');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { sendEmailWithAttachment } = require('../config/emailConfig');

class DocumentGenerationService {
  
  // ========== CERTIFICAT MÉDICAL D'APTITUDE ==========
  static async genererCertificatAptitude(agentData, visiteData) {
    const filename = `certificat_aptitude_${agentData.agent.matricule_agent}_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../../uploads/documents', filename);
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    // En-tête
    doc.fontSize(24).font('Helvetica-Bold')
      .text('SRTB - Société Régionale de Transport de Bizerte', { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(18).font('Helvetica-Bold')
      .text('CERTIFICAT MÉDICAL D\'APTITUDE', { align: 'center' });
    doc.moveDown();
    
    // Numéro et date
    doc.fontSize(10).font('Helvetica')
      .text(`N°: CERT-${new Date().getFullYear()}-${agentData.agent.matricule_agent}`, { align: 'right' });
    doc.text(`Date: ${moment().format('DD/MM/YYYY')}`, { align: 'right' });
    doc.moveDown(2);
    
    // Informations agent
    doc.fontSize(12).font('Helvetica-Bold').text('INFORMATIONS DE L\'AGENT', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica')
      .text(`Nom et prénom: ${agentData.agent.nom} ${agentData.agent.prenom}`)
      .text(`Matricule: ${agentData.agent.matricule_agent}`)
      .text(`Date de naissance: ${moment(agentData.agent.date_naissance).format('DD/MM/YYYY') || 'Non renseignée'}`)
      .text(`Poste: ${agentData.affectation?.libelle_affectation || 'Non défini'}`)
      .text(`Agence: ${agentData.agence?.nom_agence || 'Non définie'}`);
    doc.moveDown();
    
    // Informations visite
    if (visiteData) {
      doc.fontSize(12).font('Helvetica-Bold').text('DÉTAILS DE LA VISITE', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica')
        .text(`Date de la visite: ${moment(visiteData.date_visite).format('DD/MM/YYYY')}`)
        .text(`Type de visite: ${visiteData.type_visite}`)
        .text(`Médecin: ${visiteData.medecin || 'Dr. Mahmoud Khelifi'}`);
      doc.moveDown();
    }
    
    // Résultat
    doc.fontSize(12).font('Helvetica-Bold').text('RÉSULTAT DE LA VISITE', { underline: true });
    doc.moveDown(0.5);
    
    const resultat = visiteData?.resultat || 'Apte';
    const resultatStyle = resultat === 'Apte' ? { color: 'green' } : resultat === 'Inapte' ? { color: 'red' } : { color: 'orange' };
    
    doc.fontSize(14).font('Helvetica-Bold').fillColor(resultatStyle.color)
      .text(resultat, { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(10).font('Helvetica')
      .text('Observations:', { underline: true })
      .text(visiteData?.observation || 'Aucune observation particulière');
    doc.moveDown(2);
    
    // Signatures
    doc.fontSize(10).font('Helvetica')
      .text('Le médecin du travail', { align: 'left', continued: true })
      .text('Cachet de l\'établissement', { align: 'right' });
    doc.moveDown(2);
    doc.text('Dr. Mahmoud Khelifi', { align: 'left' });
    
    doc.end();
    
    return new Promise((resolve) => {
      stream.on('finish', () => resolve({ filename, filepath }));
    });
  }
  
  // ========== DÉCLARATION D'ACCIDENT DE TRAVAIL ==========
  static async genererDeclarationAccident(accidentData, agentData) {
    const filename = `declaration_accident_${accidentData.numero_accident}_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../../uploads/documents', filename);
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    // En-tête
    doc.fontSize(20).font('Helvetica-Bold')
      .text('DÉCLARATION D\'ACCIDENT DE TRAVAIL', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('Helvetica')
      .text(`N°: ${accidentData.numero_accident}`, { align: 'right' });
    doc.moveDown();
    
    // Section 1 - Agent
    doc.fontSize(12).font('Helvetica-Bold').text('1. AGENT CONCERNÉ', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica')
      .text(`Nom: ${agentData.agent.nom}`)
      .text(`Prénom: ${agentData.agent.prenom}`)
      .text(`Matricule: ${agentData.agent.matricule_agent}`)
      .text(`Poste: ${agentData.affectation?.libelle_affectation || 'Non défini'}`);
    doc.moveDown();
    
    // Section 2 - Accident
    doc.fontSize(12).font('Helvetica-Bold').text('2. CIRCONSTANCES DE L\'ACCIDENT', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica')
      .text(`Date: ${moment(accidentData.date_accident).format('DD/MM/YYYY')}`)
      .text(`Heure: ${accidentData.heure_accident || 'Non précisée'}`)
      .text(`Lieu: ${accidentData.lieu_accident || 'Non précisé'}`);
    doc.moveDown();
    
    // Section 3 - Blessures
    if (accidentData.endroit_blessures) {
      doc.fontSize(12).font('Helvetica-Bold').text('3. BLESSURES', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica')
        .text(`Localisation: ${accidentData.endroit_blessures}`)
        .text(`Nature: ${accidentData.nature_blessures || 'Non précisée'}`);
      doc.moveDown();
    }
    
    // Section 4 - Arrêt
    if (accidentData.jour_arret > 0) {
      doc.fontSize(12).font('Helvetica-Bold').text('4. ARRÊT DE TRAVAIL', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica')
        .text(`Durée: ${accidentData.jour_arret} jours`)
        .text(`Début: ${moment(accidentData.date_accident).format('DD/MM/YYYY')}`)
        .text(`Fin prévue: ${moment(accidentData.date_accident).add(accidentData.jour_arret, 'days').format('DD/MM/YYYY')}`);
      doc.moveDown();
    }
    
    // Section 5 - Témoins
    if (accidentData.temoin1 || accidentData.temoin2) {
      doc.fontSize(12).font('Helvetica-Bold').text('5. TÉMOINS', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica');
      if (accidentData.temoin1) doc.text(`Témoin 1: ${accidentData.temoin1}`);
      if (accidentData.temoin2) doc.text(`Témoin 2: ${accidentData.temoin2}`);
      doc.moveDown();
    }
    
    // Signature
    doc.moveDown(3);
    doc.fontSize(10).font('Helvetica')
      .text('Signature de l\'agent:', { align: 'left' })
      .text('Signature du responsable:', { align: 'right' });
    
    doc.end();
    
    return new Promise((resolve) => {
      stream.on('finish', () => resolve({ filename, filepath }));
    });
  }
  
  // ========== CONVOCATION VISITE MÉDICALE ==========
  static async genererConvocationVisite(planningData, agentData) {
    const filename = `convocation_${planningData.id_planning}_${Date.now()}.pdf`;
    const filepath = path.join(__dirname, '../../uploads/documents', filename);
    
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const stream = fs.createWriteStream(filepath);
    doc.pipe(stream);
    
    // Logo et en-tête
    doc.fontSize(20).font('Helvetica-Bold')
      .text('SRTB - Service HSE', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).font('Helvetica-Bold')
      .text('CONVOCATION À VISITE MÉDICALE', { align: 'center' });
    doc.moveDown(2);
    
    // Informations agent
    doc.fontSize(10).font('Helvetica')
      .text(`Agent: ${agentData.agent.nom} ${agentData.agent.prenom}`, { continued: true })
      .text(`Matricule: ${agentData.agent.matricule_agent}`, { align: 'right' });
    doc.moveDown();
    
    // Détails convocation
    doc.fontSize(12).font('Helvetica-Bold').text('Vous êtes convoqué(e) le :', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(14).font('Helvetica-Bold')
      .text(moment(planningData.date_visite).format('dddd DD MMMM YYYY'), { align: 'center' });
    doc.fontSize(12)
      .text(`à ${planningData.heure_visite?.substring(0,5) || '09:00'}`, { align: 'center' });
    doc.moveDown();
    
    doc.fontSize(10).font('Helvetica')
      .text(`Type de visite: ${planningData.type_visite}`)
      .text(`Lieu: Infirmerie SRTB - Bizerte`)
      .text(`Médecin: Dr. Mahmoud Khelifi`);
    doc.moveDown();
    
    // Instructions
    doc.fontSize(10).font('Helvetica-Bold').text('INSTRUCTIONS :');
    doc.moveDown(0.5);
    doc.fontSize(9).font('Helvetica')
      .text('• Présentez-vous 15 minutes avant l\'heure prévue')
      .text('• Munissez-vous de votre carte d\'identité')
      .text('• Apportez vos lunettes si vous en portez')
      .text('• En cas d\'impossibilité, contactez le service HSE au moins 48h avant');
    doc.moveDown(2);
    
    // Mentions légales
    doc.fontSize(8).font('Helvetica')
      .text('La non-présentation sans motif valable entraîne une sanction disciplinaire.', { align: 'center', color: 'red' });
    
    doc.end();
    
    return new Promise((resolve) => {
      stream.on('finish', () => resolve({ filename, filepath }));
    });
  }
  
  // ========== BILAN ANNUEL DE SANTÉ (EXCEL) ==========
  static async genererBilanAnnuel(agentData, statistiques) {
    const filename = `bilan_sante_${agentData.agent.matricule_agent}_${new Date().getFullYear()}.xlsx`;
    const filepath = path.join(__dirname, '../../uploads/documents', filename);
    
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bilan de santé');
    
    // Style
    const titleStyle = { font: { bold: true, size: 14 }, alignment: { horizontal: 'center' } };
    const headerStyle = { font: { bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F81BD' } } };
    
    // Titre
    worksheet.mergeCells('A1:D1');
    worksheet.getCell('A1').value = `BILAN DE SANTÉ ${new Date().getFullYear()}`;
    worksheet.getCell('A1').style = titleStyle;
    
    // Informations agent
    worksheet.addRow([]);
    worksheet.addRow(['Agent', `${agentData.agent.nom} ${agentData.agent.prenom}`]);
    worksheet.addRow(['Matricule', agentData.agent.matricule_agent]);
    worksheet.addRow(['Poste', agentData.affectation?.libelle_affectation || 'Non défini']);
    worksheet.addRow(['Agence', agentData.agence?.nom_agence || 'Non définie']);
    worksheet.addRow([]);
    
    // Statistiques visites
    worksheet.addRow(['STATISTIQUES DES VISITES']);
    worksheet.getCell(`A${worksheet.rowCount}`).style = headerStyle;
    worksheet.addRow(['Total visites', statistiques.totalVisites || 0]);
    worksheet.addRow(['Visites périodiques', statistiques.visitesPeriodiques || 0]);
    worksheet.addRow(['Visites de reprise', statistiques.visitesReprise || 0]);
    worksheet.addRow(['Dernière visite', statistiques.derniereVisite || 'Aucune']);
    worksheet.addRow(['Prochaine visite', statistiques.prochaineVisite || 'Non programmée']);
    worksheet.addRow([]);
    
    // Statistiques accidents
    worksheet.addRow(['STATISTIQUES DES ACCIDENTS']);
    worksheet.getCell(`A${worksheet.rowCount}`).style = headerStyle;
    worksheet.addRow(['Total accidents', statistiques.totalAccidents || 0]);
    worksheet.addRow(['Total jours d\'arrêt', statistiques.totalJoursArret || 0]);
    worksheet.addRow(['Accidents faible gravité', statistiques.accidentsFaible || 0]);
    worksheet.addRow(['Accidents moyenne gravité', statistiques.accidentsMoyenne || 0]);
    worksheet.addRow(['Accidents élevée gravité', statistiques.accidentsElevee || 0]);
    worksheet.addRow([]);
    
    // Ajuster les colonnes
    worksheet.columns.forEach(column => {
      column.width = 30;
    });
    
    await workbook.xlsx.writeFile(filepath);
    
    return { filename, filepath };
  }
  
  // ========== EXPORT COMPLET (ZIP) ==========
  static async genererExportComplet(agentData, statistiques) {
    const JSZip = require('jszip');
    const zip = new JSZip();
    
    // Générer tous les documents
    const certificat = await this.genererCertificatAptitude(agentData, statistiques.derniereVisiteData);
    const bilan = await this.genererBilanAnnuel(agentData, statistiques);
    
    // Ajouter au ZIP
    const certificatBuffer = fs.readFileSync(certificat.filepath);
    const bilanBuffer = fs.readFileSync(bilan.filepath);
    
    zip.file('certificat_aptitude.pdf', certificatBuffer);
    zip.file('bilan_sante.xlsx', bilanBuffer);
    
    const filename = `export_complet_${agentData.agent.matricule_agent}_${Date.now()}.zip`;
    const filepath = path.join(__dirname, '../../uploads/documents', filename);
    
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(filepath, zipBuffer);
    
    return { filename, filepath };
  }
}

module.exports = DocumentGenerationService;