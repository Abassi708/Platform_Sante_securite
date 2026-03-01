// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      const user = await User.findByPk(decoded.id);
      
      if (!user) {
        return res.status(401).json({ message: 'Utilisateur non trouvé' });
      }
      
      req.user = user.toJSON();
      next();
      
    } catch (error) {
      return res.status(401).json({ message: 'Token invalide' });
    }
  }

  if (!token) {
    return res.status(401).json({ message: 'Non autorisé' });
  }
};

module.exports = { protect };