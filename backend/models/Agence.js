// backend/models/Agence.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Agence = sequelize.define('Agence', {
    code_agence: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'code_agence'
    },
    nom_agence: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'nom_agence'
    },
    ville: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'ville'
    },
    adresse: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'adresse'
    },
    telephone: {
      type: DataTypes.STRING(20),
      allowNull: true,
      field: 'telephone'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'agence',
    timestamps: false
  });

  return Agence;
};