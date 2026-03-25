// backend/services/pdfConvocationService.js
const PDFDocument = require('pdfkit');

class PdfConvocationService {
  
  // ========== GÉNÉRER LE PDF DE CONVOCATION ==========
  async genererConvocationPDF(plannings, dateReference) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        
        // En-tête
        doc.fontSize(20)
          .font('Helvetica-Bold')
          .fillColor('#1e3a8a')
          .text('SOCIÉTÉ RÉGIONALE DE TRANSPORT DE BIZERTE', { align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(14)
          .font('Helvetica')
          .fillColor('#2563eb')
          .text('Service HSE - Convocations aux visites médicales', { align: 'center' });
        
        doc.moveDown(0.5);
        doc.fontSize(10)
          .fillColor('#64748b')
          .text(`Document généré le ${new Date().toLocaleDateString('fr-FR')}`, { align: 'center' });
        
        doc.moveDown(1);
        
        // Ligne de séparation
        doc.strokeColor('#e2e8f0')
          .lineWidth(1)
          .moveTo(50, doc.y)
          .lineTo(550, doc.y)
          .stroke();
        
        doc.moveDown(0.5);
        
        // Regrouper par date
        const visitesParJour = {};
        for (const v of plannings) {
          const dateKey = v.date_visite;
          if (!visitesParJour[dateKey]) visitesParJour[dateKey] = [];
          visitesParJour[dateKey].push(v);
        }
        
        const datesTriees = Object.keys(visitesParJour).sort();
        
        datesTriees.forEach((dateKey, index) => {
          if (index > 0) {
            doc.addPage();
          }
          
          const visites = visitesParJour[dateKey];
          const dateVisite = new Date(dateKey);
          
          doc.fontSize(16)
            .font('Helvetica-Bold')
            .fillColor('#1e293b')
            .text(`CONVOCATION - ${dateVisite.toLocaleDateString('fr-FR', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            }).toUpperCase()}`, { align: 'center' });
          
          doc.moveDown(0.5);
          doc.fontSize(10)
            .fillColor('#475569')
            .text(`Médecin du travail: Dr. Mahmoud Khelifi`, { align: 'center' });
          doc.text(`Lieu: Infirmerie SRTB - Bizerte`, { align: 'center' });
          
          doc.moveDown(1);
          
          const startY = doc.y;
          const colWidths = [60, 120, 100, 80, 60, 70];
          const headers = ['Matricule', 'Nom & Prénom', 'Agence', 'Poste', 'Type', 'Heure'];
          
          doc.fontSize(9).font('Helvetica-Bold');
          let currentY = startY;
          let currentX = 50;
          
          doc.rect(50, currentY - 5, 500, 25).fill('#f1f5f9');
          doc.fillColor('#1e293b');
          
          headers.forEach((header, i) => {
            doc.text(header, currentX, currentY, { width: colWidths[i], align: 'left' });
            currentX += colWidths[i];
          });
          
          currentY += 20;
          doc.fillColor('#334155');
          doc.font('Helvetica');
          
          let ligneNum = 0;
          for (const visite of visites) {
            const agent = visite.planningAgent || {};
            const nomComplet = `${agent.nom || '—'} ${agent.prenom || '—'}`;
            const poste = agent.code_affectation === 3 ? 'Chauffeur' : 'Autre';
            const typeVisite = this.getTypeLabel(visite.type_visite);
            const heure = (visite.heure_visite || '').substring(0, 5);
            
            currentX = 50;
            
            if (ligneNum % 2 === 0) {
              doc.rect(50, currentY - 5, 500, 25).fill('#f8fafc');
            }
            
            doc.fillColor('#334155');
            doc.text(visite.matricule_agent.toString(), currentX, currentY, { width: colWidths[0] });
            currentX += colWidths[0];
            doc.text(nomComplet, currentX, currentY, { width: colWidths[1] });
            currentX += colWidths[1];
            doc.text(agent.code_agence || '—', currentX, currentY, { width: colWidths[2] });
            currentX += colWidths[2];
            doc.text(poste, currentX, currentY, { width: colWidths[3] });
            currentX += colWidths[3];
            doc.text(typeVisite, currentX, currentY, { width: colWidths[4] });
            currentX += colWidths[4];
            doc.text(heure, currentX, currentY, { width: colWidths[5] });
            
            currentY += 25;
            ligneNum++;
            
            if (currentY > 750 && index < datesTriees.length - 1) {
              doc.addPage();
              currentY = 50;
            }
          }
          
          doc.moveDown(1);
          
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#d97706');
          doc.text('INSTRUCTIONS IMPORTANTES :', 50, currentY + 10);
          doc.moveDown(0.3);
          doc.fontSize(8).font('Helvetica').fillColor('#92400e');
          doc.text('• Se présenter 15 minutes avant l\'heure du rendez-vous', 70);
          doc.text('• Apporter la carte d\'identité nationale', 70);
          doc.text('• Être à jeun si nécessaire (sauf indication contraire du médecin)', 70);
          doc.text('• En cas d\'empêchement, contacter le service HSE au moins 48h avant', 70);
          
          doc.moveDown(1.5);
          doc.fontSize(8).fillColor('#64748b');
          doc.text('Cachet et signature du médecin du travail :', 50);
          doc.text('_________________________________________', 50);
          doc.text('Dr. Mahmoud Khelifi', 50);
        });
        
        doc.end();
        
      } catch (error) {
        console.error('❌ Erreur génération PDF:', error);
        reject(error);
      }
    });
  }
  
  getTypeLabel(type) {
    const labels = {
      'Périodique': '📋 Périodique',
      'Reprise': '🔄 Reprise',
      'Reclassement': '📝 Reclassement'
    };
    return labels[type] || type;
  }
}

module.exports = new PdfConvocationService();