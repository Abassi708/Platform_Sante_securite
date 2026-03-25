// backend/models/User.js
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id_utilisateur: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id_utilisateur'
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
      type: DataTypes.ENUM('social', 'technicien', 'admin', 'agent'),
      allowNull: true,
      field: 'Role'
    },
    matricule_agent: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'matricule_agent'
    },
    derniere_connexion: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'derniere_connexion'
    },
    nombre_connexions: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'nombre_connexions'
    },
    date_creation: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'date_creation'
    }
  }, {
    tableName: 'utilisateur',
    timestamps: false
  });

  // ✅ AJOUTER LA MÉTHODE STATIQUE verifyCredentials
  User.verifyCredentials = async (email, password) => {
    try {
      const user = await User.findOne({ where: { Login: email } });
      if (!user) return null;

      const isValid = await bcrypt.compare(password, user.Mot_de_passe);
      if (!isValid) return null;

      user.derniere_connexion = new Date();
      user.nombre_connexions = (user.nombre_connexions || 0) + 1;
      await user.save();

      return user;
    } catch (error) {
      console.error('❌ Erreur vérification:', error);
      throw error;
    }
  };

  // ✅ AJOUTER LA MÉTHODE STATIQUE createUser
  User.createUser = async (email, password, role = 'agent', matricule = null) => {
    try {
      const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS) || 10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        Login: email,
        Mot_de_passe: hashedPassword,
        Role: role,
        matricule_agent: matricule || null,
        nombre_connexions: 0,
        date_creation: new Date()
      });

      return user;
    } catch (error) {
      console.error('❌ Erreur création utilisateur:', error);
      throw error;
    }
  };

  User.prototype.toJSON = function() {
    return {
      id: this.id_utilisateur,
      email: this.Login,
      role: this.Role,
      matricule: this.matricule_agent,
      derniere_connexion: this.derniere_connexion,
      nombre_connexions: this.nombre_connexions,
      createdAt: this.date_creation
    };
  };

  return User;
};