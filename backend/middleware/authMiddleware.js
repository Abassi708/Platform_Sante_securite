// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// backend/middleware/authMiddleware.js
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log('🔑 Token reçu:', token.substring(0, 20) + '...'); // Log pour déboguer
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token décodé:', decoded);
      
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        console.log('❌ Utilisateur non trouvé');
        return res.status(401).json({ message: 'Utilisateur non trouvé' });
      }
      
      req.user = user.toJSON();
      next();
      
    } catch (error) {
      console.error('❌ Erreur token:', error.message);
      return res.status(401).json({ message: 'Token invalide' });
    }
  } else {
    console.log('❌ Pas de token dans la requête');
    return res.status(401).json({ message: 'Non autorisé' });
  }
};
module.exports = { protect }; 