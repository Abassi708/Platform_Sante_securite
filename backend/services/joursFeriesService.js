// backend/services/joursFeriesService.js
const axios = require('axios');

class JoursFeriesService {
  constructor() {
    this.joursFeries = new Map(); // Map année -> [dates]
    this.pays = 'tn'; // Tunisie
  }

  // ========== CHARGER LES JOURS FÉRIÉS POUR UNE ANNÉE ==========
  async chargerJoursFeries(annee) {
    if (this.joursFeries.has(annee)) {
      return this.joursFeries.get(annee);
    }

    try {
      const response = await axios.get(
        `https://date.nager.at/api/v3/publicholidays/${annee}/${this.pays}`
      );
      
      const dates = response.data.map(holiday => holiday.date);
      this.joursFeries.set(annee, dates);
      
      console.log(`📅 ${dates.length} jours fériés chargés pour ${annee}`);
      return dates;
      
    } catch (error) {
      console.error(`❌ Erreur chargement jours fériés ${annee}:`, error.message);
      
      const datesFixes = this.getJoursFeriesFixes(annee);
      this.joursFeries.set(annee, datesFixes);
      return datesFixes;
    }
  }

  // ========== JOURS FÉRIÉS FIXES (FALLBACK) ==========
  getJoursFeriesFixes(annee) {
    return [
      `${annee}-01-01`, // Jour de l'an
      `${annee}-01-14`, // Fête de la Révolution
      `${annee}-03-20`, // Fête de l'Indépendance
      `${annee}-04-09`, // Fête des Martyrs
      `${annee}-05-01`, // Fête du Travail
      `${annee}-07-25`, // Fête de la République
      `${annee}-08-13`, // Fête de la Femme
      `${annee}-10-15`, // Fête de l'Évacuation
      `${annee}-03-31`, // Aïd el-Fitr (approx)
      `${annee}-04-01`, // Aïd el-Fitr (approx)
      `${annee}-06-07`, // Aïd el-Adha (approx)
      `${annee}-06-08`, // Aïd el-Adha (approx)
      `${annee}-06-28`, // Ras el-Am el-Hijri (approx)
      `${annee}-09-05`, // Mouled (approx)
    ];
  }

  // ========== VÉRIFIER SI UN JOUR EST FÉRIÉ ==========
  async estJourFerie(date) {
    const annee = date.getFullYear();
    const dateStr = date.toISOString().split('T')[0];
    
    if (!this.joursFeries.has(annee)) {
      await this.chargerJoursFeries(annee);
    }
    
    const joursFeriesAnnee = this.joursFeries.get(annee) || [];
    return joursFeriesAnnee.includes(dateStr);
  }

  // ========== CHARGER PROACTIVEMENT LES ANNÉES ==========
  async prechargerAnnees() {
    const anneeCourante = new Date().getFullYear();
    const annees = [anneeCourante - 1, anneeCourante, anneeCourante + 1];
    
    for (const annee of annees) {
      await this.chargerJoursFeries(annee);
    }
    console.log('✅ Jours fériés préchargés pour', annees.join(', '));
  }
}

module.exports = new JoursFeriesService();