// backend/services/chartService.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

class ChartService {
  
  static async genererGraphiqueAccidents(accidentsParMois, matricule) {
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Fond blanc
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Titre
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px "Segoe UI"';
    ctx.fillText('Évolution de vos accidents', 30, 40);
    
    // Sous-titre
    ctx.font = '12px "Segoe UI"';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Nombre d\'accidents par mois', 30, 65);
    
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const maxValue = Math.max(...accidentsParMois, 1);
    const graphHeight = 250;
    const startX = 80;
    const startY = 320;
    const barWidth = 45;
    const spacing = 20;
    
    // Grille
    ctx.beginPath();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = startY - (i * graphHeight / 5);
      ctx.beginPath();
      ctx.moveTo(startX - 10, y);
      ctx.lineTo(startX + 12 * (barWidth + spacing), y);
      ctx.stroke();
      
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "Segoe UI"';
      ctx.fillText(Math.round(maxValue * i / 5), startX - 30, y + 3);
    }
    
    // Barres
    for (let i = 0; i < 12; i++) {
      const x = startX + i * (barWidth + spacing);
      const barHeight = (accidentsParMois[i] / maxValue) * graphHeight;
      const y = startY - barHeight;
      
      // Dégradé
      const gradient = ctx.createLinearGradient(x, y, x, startY);
      gradient.addColorStop(0, '#2563eb');
      gradient.addColorStop(1, '#3b82f6');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Bordure arrondie en haut
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(x, y, barWidth, 3);
      
      // Valeur
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 11px "Segoe UI"';
      ctx.fillText(accidentsParMois[i], x + barWidth/2 - 8, y - 5);
      
      // Mois
      ctx.fillStyle = '#64748b';
      ctx.font = '10px "Segoe UI"';
      ctx.fillText(mois[i], x + barWidth/2 - 8, startY + 15);
    }
    
    // Pied de page
    ctx.fillStyle = '#94a3b8';
    ctx.font = '9px "Segoe UI"';
    ctx.fillText(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, width - 150, height - 10);
    
    const filename = `graphique_accidents_${matricule}_${Date.now()}.png`;
    const filepath = path.join(__dirname, '../../uploads/charts', filename);
    
    // Créer le dossier s'il n'existe pas
    const chartsDir = path.join(__dirname, '../../uploads/charts');
    if (!fs.existsSync(chartsDir)) {
      fs.mkdirSync(chartsDir, { recursive: true });
    }
    
    fs.writeFileSync(filepath, canvas.toBuffer());
    
    return { filename, filepath };
  }
  
  static async genererGraphiqueComparaison(agentData, moyennePoste, matricule) {
    const width = 800;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Titre
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px "Segoe UI"';
    ctx.fillText('Comparaison avec vos collègues', 30, 40);
    
    ctx.font = '12px "Segoe UI"';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Nombre d\'accidents par agent', 30, 65);
    
    const categories = ['Vous', 'Moyenne poste'];
    const values = [agentData.accidents.length, moyennePoste];
    const colors = ['#2563eb', '#10b981'];
    
    const graphHeight = 250;
    const startX = 150;
    const startY = 320;
    const barWidth = 150;
    const spacing = 80;
    
    for (let i = 0; i < 2; i++) {
      const x = startX + i * (barWidth + spacing);
      const barHeight = (values[i] / Math.max(...values, 1)) * graphHeight;
      const y = startY - barHeight;
      
      const gradient = ctx.createLinearGradient(x, y, x, startY);
      gradient.addColorStop(0, colors[i]);
      gradient.addColorStop(1, colors[i] + 'aa');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth, barHeight);
      
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 14px "Segoe UI"';
      ctx.fillText(values[i], x + barWidth/2 - 10, y - 10);
      
      ctx.fillStyle = '#1e293b';
      ctx.font = '12px "Segoe UI"';
      ctx.fillText(categories[i], x + barWidth/2 - 30, startY + 25);
    }
    
    const filename = `graphique_comparaison_${matricule}_${Date.now()}.png`;
    const filepath = path.join(__dirname, '../../uploads/charts', filename);
    
    fs.writeFileSync(filepath, canvas.toBuffer());
    
    return { filename, filepath };
  }
  
  static async genererGraphiqueTendance(visitesParMois, matricule) {
    const width = 800;
    const height = 400;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px "Segoe UI"';
    ctx.fillText('Tendance de vos visites médicales', 30, 40);
    
    const mois = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const startX = 80;
    const startY = 320;
    const pointRadius = 6;
    const stepX = (width - 150) / 11;
    
    // Axe
    ctx.beginPath();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 2;
    ctx.moveTo(startX, 50);
    ctx.lineTo(startX, startY);
    ctx.lineTo(width - 40, startY);
    ctx.stroke();
    
    // Courbe
    ctx.beginPath();
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    
    for (let i = 0; i < 12; i++) {
      const x = startX + i * stepX;
      const y = startY - (visitesParMois[i] / Math.max(...visitesParMois, 1)) * 250;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    
    // Points
    for (let i = 0; i < 12; i++) {
      const x = startX + i * stepX;
      const y = startY - (visitesParMois[i] / Math.max(...visitesParMois, 1)) * 250;
      
      ctx.beginPath();
      ctx.fillStyle = '#3b82f6';
      ctx.arc(x, y, pointRadius, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.beginPath();
      ctx.fillStyle = 'white';
      ctx.arc(x, y, pointRadius - 2, 0, 2 * Math.PI);
      ctx.fill();
      
      ctx.fillStyle = '#1e293b';
      ctx.font = '10px "Segoe UI"';
      ctx.fillText(mois[i], x - 8, startY + 15);
      
      ctx.fillStyle = '#2563eb';
      ctx.font = 'bold 10px "Segoe UI"';
      ctx.fillText(visitesParMois[i], x - 5, y - 8);
    }
    
    const filename = `graphique_tendance_${matricule}_${Date.now()}.png`;
    const filepath = path.join(__dirname, '../../uploads/charts', filename);
    
    fs.writeFileSync(filepath, canvas.toBuffer());
    
    return { filename, filepath };
  }
}

module.exports = ChartService;