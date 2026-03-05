const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CodeOTP = sequelize.define('CodeOTP', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  Id_utilisateur: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'Id_utilisateur',
    references: {
      model: 'utilisateur',
      key: 'Id_utilisateur'
    }
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  code: {
    type: DataTypes.STRING(6),
    allowNull: false
  },
  type: {
    type: DataTypes.STRING(20),
    defaultValue: 'connexion'
  },
  expire_le: {
    type: DataTypes.DATE,
    allowNull: false
  },
  tentatives: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  utilise: {
    type: DataTypes.TINYINT,
    defaultValue: 0
  },
  cree_le: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'codes_otp',
  timestamps: false
});

module.exports = CodeOTP;