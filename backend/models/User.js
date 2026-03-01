const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  Id_utilisateur: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'Id_utilisateur'
  },
  Login: {
    type: DataTypes.STRING(50),
    allowNull: false,
    field: 'Login'
  },
  Mot_de_passe: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'Mot_de_passe'
  },
  Role: {
    type: DataTypes.ENUM('rs', 'technicien', 'admin', 'agent'),
    allowNull: true,
    field: 'Role'
  },
  matricule_agent: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'matricule_agent'
  },
  // ========== AJOUTEZ CES 2 LIGNES ICI ==========
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'lastLogin'
  },
  loginCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'loginCount'
  }
  // =============================================
}, {
  tableName: 'utilisateur',
  timestamps: false
});

// Créer un utilisateur
User.createUser = async (email, password, role = 'agent', matricule = 1) => {
  try {
    console.log('📝 Création utilisateur:', { email, role, matricule });
    
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS));
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const user = await User.create({
      Login: email,
      Mot_de_passe: hashedPassword,
      Role: role,
      matricule_agent: parseInt(matricule)
    });
    
    console.log('✅ Utilisateur créé avec ID:', user.Id_utilisateur);
    return user;
    
  } catch (error) {
    console.error('❌ Erreur création utilisateur:', error);
    throw error;
  }
};

User.createAdmin = User.createUser;

User.verifyCredentials = async (email, password) => {
  try {
    const user = await User.findOne({
      where: { Login: email }
    });
    
    if (!user) {
      console.log('❌ Utilisateur non trouvé:', email);
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.Mot_de_passe);
    
    if (!isValid) {
      console.log('❌ Mot de passe incorrect');
      return null;
    }
    
    // ========== AJOUTEZ CES 3 LIGNES ICI ==========
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    await user.save();
    // =============================================
    
    console.log('✅ Authentification réussie pour:', email);
    return user;
    
  } catch (error) {
    console.error('❌ Erreur vérification:', error);
    throw error;
  }
};

User.prototype.toJSON = function() {
  return {
    id: this.Id_utilisateur,
    email: this.Login,
    role: this.Role,
    matricule: this.matricule_agent,
    // ========== AJOUTEZ CES 2 LIGNES ICI ==========
    lastLogin: this.lastLogin,
    loginCount: this.loginCount
    // =============================================
  };
};

module.exports = User;