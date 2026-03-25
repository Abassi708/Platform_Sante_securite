// backend/routes/reprogrammationRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const reprogrammationService = require('../services/reprogrammationService');

// ========== REPROGRAMMER UNE VISITE (CHANGEMENT DE DATE) ==========
router.post('/planning/:id/reprogrammer', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { nouvelle_date, nouvelle_heure, motif } = req.body;

    if (!nouvelle_date || !nouvelle_heure) {
      return res.status(400).json({
        success: false,
        message: 'Nouvelle date et heure requises'
      });
    }

    if (!motif || motif.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Motif de reprogrammation requis'
      });
    }

    const result = await reprogrammationService.reprogrammerVisite(
      id, nouvelle_date, nouvelle_heure, motif, req.user.id
    );

    res.json({
      success: true,
      message: 'Visite reprogrammée avec succès',
      data: result
    });

  } catch (error) {
    console.error('❌ Erreur reprogrammation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la reprogrammation'
    });
  }
});

// ========== VÉRIFIER SI UN CRÉNEAU EST BLOQUÉ ==========
router.get('/planning/creneau-bloque', protect, async (req, res) => {
  try {
    const { date, heure } = req.query;
    
    const estBloque = await reprogrammationService.estCreneauBloque(date, heure);

    res.json({
      success: true,
      estBloque,
      date,
      heure
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== RÉCUPÉRER LES CRÉNEAUX BLOQUÉS ==========
router.get('/planning/creneaux-bloques', protect, async (req, res) => {
  try {
    const { date_debut, date_fin } = req.query;
    const creneaux = await reprogrammationService.getCreneauxBloques(date_debut, date_fin);

    res.json({
      success: true,
      creneaux
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;