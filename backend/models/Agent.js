// backend/models/Agent.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Agent = sequelize.define('Agent', {
    matricule_agent: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'matricule_agent'
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'nom'
    },
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      field: 'prenom'
    },
    date_naissance: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_naissance'
    },
    code_agence: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'code_agence'
    },
    code_affectation: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'code_affectation'
    },
    direction: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'direction'
    },
    date_derniere_visite: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_derniere_visite'
    },
    date_debut_inaptitude: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_debut_inaptitude'
    },
    date_fin_inaptitude: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_fin_inaptitude'
    },
    date_prochaine_inaptitude: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_prochaine_inaptitude'
    },
    statut: {
      type: DataTypes.ENUM('actif', 'inactif', 'conge', 'maladie'),
      defaultValue: 'actif',
      field: 'statut'
    },
    periodicite_jours: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'periodicite_jours'
    },
    date_prochaine_visite: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'date_prochaine_visite'
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
    tableName: 'agent',
    timestamps: false
  });

  Agent.associate = (models) => {
    Agent.hasMany(models.local.Planning, {
      foreignKey: 'matricule_agent',
      sourceKey: 'matricule_agent',
      as: 'plannings'
    });
    Agent.hasMany(models.local.Accident, {
      foreignKey: 'matricule_agent',
      sourceKey: 'matricule_agent',
      as: 'accidents'
    });
    Agent.hasMany(models.local.Visite, {
      foreignKey: 'matricule_agent',
      sourceKey: 'matricule_agent',
      as: 'visites'
    });
  };

  Agent.prototype.estChauffeur = function() {
    return this.code_affectation === 3;
  };

  Agent.prototype.getPeriodicite = function() {
    if (this.periodicite_jours && this.periodicite_jours > 0) {
      return this.periodicite_jours;
    }
    return this.code_affectation === 3 ? 180 : 365;
  };

  Agent.prototype.getPeriodiciteTexte = function() {
    const jours = this.getPeriodicite();
    if (jours === 180) return '6 mois';
    if (jours === 365) return '1 an';
    return `${Math.floor(jours / 30)} mois`;
  };

  Agent.prototype.estEnInaptitude = function() {
    if (!this.date_fin_inaptitude) return false;
    return new Date(this.date_fin_inaptitude) > new Date();
  };

  return Agent;
};