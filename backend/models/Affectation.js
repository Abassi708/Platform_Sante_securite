// backend/models/Affectation.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Affectation = sequelize.define('Affectation', {
    code_affectation: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'code_affectation'
    },
    libelle_affectation: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'libelle_affectation'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description'
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
    tableName: 'affectation',
    timestamps: false
  });

  Affectation.prototype.getPeriodicite = function() {
    return this.code_affectation === 3 ? 180 : 365;
  };

  Affectation.prototype.getPeriodiciteTexte = function() {
    const jours = this.getPeriodicite();
    if (jours === 180) return '6 mois';
    if (jours === 365) return '1 an';
    return `${Math.floor(jours / 30)} mois`;
  };

  return Affectation;
};