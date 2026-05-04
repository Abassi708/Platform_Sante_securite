// backend/services/pdfConvocationService.js
const PDFDocument = require('pdfkit');

class PdfConvocationService {
  
  // ✅ Fonction pour formater la date sans décalage horaire
  formatDateSansDecalage(dateStr) {
    if (!dateStr) return '';
    // Si la date est au format YYYY-MM-DD
    if (typeof dateStr === 'string' && dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateStr.split('-');
      // Créer la date en UTC pour éviter le décalage horaire
      const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC'
      });
    }
    // Fallback
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  async genererConvocationPDF(plannings) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        
        // Styles NOIR et blanc uniquement
        const noir = '#000000';
        
        // ========== EN-TÊTE ==========
        // Ligne 1: Société à gauche, Date à droite
        doc.fontSize(11)
           .font('Helvetica-Bold')
           .fillColor(noir)
           .text('SOCIÉTÉ RÉGIONALE DE TRANSPORT DE BIZERTE', 50, 50, { align: 'left' });
        
        // Date à droite
        const aujourdhui = new Date();
        const dateStr = aujourdhui.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        doc.fontSize(10)
           .font('Helvetica')
           .text(`BIZERTE, le ${dateStr}`, { align: 'right' });
        
        // Ligne 2: SERVICE MEDICO SOCIAL
        doc.moveDown(0.5);
        doc.fontSize(10)
           .font('Helvetica-Bold')
           .text('SERVICE MEDICO SOCIAL', 50, doc.y, { align: 'left' });
        
        // ========== TITRE ==========
        doc.moveDown(1.5);
        doc.fontSize(16)
           .font('Helvetica-Bold')
           .text('CONVOCATION', { align: 'center' });
        
        // Ligne séparatrice
        doc.moveDown(0.5);
        doc.strokeColor(noir)
           .lineWidth(0.5)
           .moveTo(50, doc.y)
           .lineTo(550, doc.y)
           .stroke();
        
        doc.moveDown(1);
        
        // ========== POUR CHAQUE PLANNING ==========
        for (let i = 0; i < plannings.length; i++) {
          const p = plannings[i];
          const agent = p.planningAgent || {};
          
          // Année de la visite
          const anneeVisite = p.date_visite.split('-')[0];
          
          // Civilité
          const civilite = 'MME / MLLE / MR :';
          
          // ========== RÉFÉRENCE ==========
          doc.fontSize(9)
             .font('Helvetica')
             .fillColor(noir)
             .text(` Convocation:  / ${anneeVisite} / ${agent.matricule_agent || p.matricule_agent}`, { align: 'right' });
          
          doc.moveDown(1);
          
          // ========== DESTINATAIRE ==========
          doc.fontSize(11)
             .font('Helvetica-Bold')
             .text(`${civilite} ${agent.nom || ''} ${agent.prenom || ''}`, { align: 'left' });
          
          doc.fontSize(10)
             .font('Helvetica')
             .text(`Matricule : ${agent.matricule_agent || p.matricule_agent}`, { align: 'left' })
             .text(`Service : ${agent.code_agence ? `Agence ${agent.code_agence}` : 'Transport'}`, { align: 'left' });
          
          doc.moveDown(1);
          
          // ========== CORPS DU TEXTE ==========
          doc.fontSize(10)
             .font('Helvetica')
             .text(`Vous êtes invité(e) à vous présenter à la visite médicale de ${p.type_visite} qui aura lieu le :`, { align: 'left' });
          
          doc.moveDown(0.5);
          
          // ✅ Date et heure CORRIGÉE (sans décalage)
          const dateFormatee = this.formatDateSansDecalage(p.date_visite);
          const heureVisite = p.heure_visite ? p.heure_visite.substring(0,5) : '';
          
          doc.fontSize(12)
             .font('Helvetica-Bold')
             .text(`${dateFormatee} à ${heureVisite}`, { align: 'center', underline: true });
          
          doc.moveDown(0.5);
          
          doc.fontSize(10)
             .font('Helvetica')
             .text(`au bureau du médecin du travail, situé au service de médecine du travail - Centre de formation SRTB.`, { align: 'left' });
          
          doc.moveDown(0.5);
          
          doc.fontSize(10)
             .font('Helvetica-Bold')
             .text(`NB : La présence est obligatoire.`, { align: 'left' });
          
          doc.moveDown(1.5);
          
          // ========== SIGNATURE ==========
          doc.fontSize(10)
             .font('Helvetica')
             .text('Le Chef du Service Social', 350, doc.y, { align: 'right' });
          
          doc.moveDown(1.5);
          
          // Ligne de signature
          doc.moveTo(350, doc.y)
             .lineTo(550, doc.y)
             .stroke();
          
          doc.fontSize(9)
             .font('Helvetica')
             .text('(Signature et cachet)', 450, doc.y + 5, { align: 'right' });
          
          // Saut de page si plusieurs convocations
          if (i < plannings.length - 1) {
            doc.addPage();
          }
        }
        
        doc.end();
        
      } catch (error) {
        console.error('❌ Erreur génération PDF:', error);
        reject(error);
      }
    });
  }
}

module.exports = new PdfConvocationService();