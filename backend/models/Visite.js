// backend/models/Visite.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Visite = sequelize.define('Visite', {
    matricule_visite: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'matricule_visite'
    },
    date_visite: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'date_visite'
    },
    heure_visite: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'heure_visite'
    },
    type_visite: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'type_visite'
    },
    medecin: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'medecin'
    },
    observation: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'observation'
    },
    resultat: {
      type: DataTypes.ENUM('Apte', 'Apte avec réserves', 'Inapte temporaire', 'Inapte définitif'),
      allowNull: true,
      field: 'resultat'
    },
    id_planning: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'id_planning'
    },
    matricule_agent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'matricule_agent'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by'
    },
    type_action: {
      type: DataTypes.ENUM('PROGRAMMATION', 'EFFECTUEE', 'REPROGRAMMEE', 'ANNULEE', 'REAFFECTEE', 'SAISIE_MANUELLE'),
      allowNull: true,
      field: 'type_action'
    },
    source: {
      type: DataTypes.ENUM('PLANNING', 'FORMULAIRE', 'SYSTEME'),
      defaultValue: 'FORMULAIRE',
      field: 'source'
    },
    motif_action: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'motif_action'
    },
    ancien_statut: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'ancien_statut'
    },
    nouveau_statut: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'nouveau_statut'
    },
    details_action: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'details_action'
    },
    visite_originale_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'visite_originale_id'
    }
  }, {
    tableName: 'visite',
    timestamps: false
  });

  Visite.associate = (models) => {
    Visite.belongsTo(models.global.Agent, {
      foreignKey: 'matricule_agent',
      targetKey: 'matricule_agent',
      as: 'visiteAgent'
    });
    Visite.belongsTo(models.local.Planning, {
      foreignKey: 'id_planning',
      targetKey: 'id_planning',
      as: 'visitePlanning'
    });
    Visite.belongsTo(models.local.User, {
      foreignKey: 'created_by',
      targetKey: 'id_utilisateur',
      as: 'createur'
    });
  };

  return Visite;
};