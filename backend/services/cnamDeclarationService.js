// backend/services/cnamDeclarationService.js
const { Document, Packer, Paragraph, TextRun, AlignmentType } = require('docx');

class CnamDeclarationService {
  
  genererDeclarationCNAM(accident, agent, responsableInfo) {
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
    
    const accidentDate = accident.date_accident ? 
      accident.date_accident.split('-').reverse().join('/') : '________';
    
    const responsableNom = responsableInfo?.nom?.toUpperCase() || '_________________________';
    const responsablePrenom = responsableInfo?.prenom || '_________________________';
    
    return new Document({
      sections: [{
        children: [
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "REPUBLIQUE TUNISIENNE", bold: true, size: 28 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "MINISTERE DES AFFAIRES SOCIALES", bold: true, size: 24 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "ET DE LA SOLIDARITE", bold: true, size: 24 })] }),
          new Paragraph({ text: "", spacing: { after: 200 } }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CAISSE NATIONALE DE SECURITE SOCIALE", bold: true, size: 26 })] }),
          new Paragraph({ text: "", spacing: { after: 300 } }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "DECLARATION D'ACCIDENT DE TRAVAIL", bold: true, size: 32 })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "(Loi n°94-28 du 21 février 1994)", italics: true, size: 20 })] }),
          new Paragraph({ text: "", spacing: { after: 400 } }),
          new Paragraph({ children: [new TextRun({ text: "Je soussigné (nom et prénoms): ", bold: true, size: 24 }), new TextRun({ text: `${responsableNom} ${responsablePrenom}`, bold: true, size: 24 })] }),
          new Paragraph({ text: "", spacing: { after: 100 } }),
          new Paragraph({ children: [new TextRun({ text: "déclare sur l'honneur,", size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "en ma qualité de ", size: 24 }), new TextRun({ text: "détaché au Service Social de la SRTB", italics: true, size: 24 }), new TextRun({ text: " que les renseignements ci-dessous sont sincères et véridiques.", size: 24 })] }),
          new Paragraph({ text: "", spacing: { after: 400 } }),
          new Paragraph({ children: [new TextRun({ text: "Date de l'accident : ", bold: true, size: 24 }), new TextRun({ text: accidentDate, size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "Lieu de l'accident : ", bold: true, size: 24 }), new TextRun({ text: accident.lieu_accident || '_________________________', size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "Nature des blessures : ", bold: true, size: 24 }), new TextRun({ text: accident.nature_blessures || '_________________________', size: 24 })] }),
          new Paragraph({ children: [new TextRun({ text: "Jours d'arrêt : ", bold: true, size: 24 }), new TextRun({ text: String(accident.jour_arret || 0), size: 24 })] }),
          new Paragraph({ text: "", spacing: { after: 400 } }),
          new Paragraph({ children: [new TextRun({ text: "Fait à Bizerte, le ", size: 24 }), new TextRun({ text: formattedDate, bold: true, size: 24 })] }),
          new Paragraph({ text: "", spacing: { after: 400 } }),
          new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Signature et cachet de l'entreprise", bold: true, size: 22 })] }),
          new Paragraph({ text: "", spacing: { after: 300 } }),
          new Paragraph({ children: [new TextRun({ text: "Remarque: Cette déclaration doit être établie en trois exemplaires et transmise:", bold: true, size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: "- A la Caisse Nationale de Sécurité Sociale.", size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: "- Au poste de police ou de la garde nationale le plus proche du lieu de travail de la victime.", size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: "- A l'inspection du travail territorialement compétente.", size: 18 })] }),
        ],
      }],
    });
  }
}

module.exports = new CnamDeclarationService();