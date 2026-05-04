// backend/models/Planning.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Planning = sequelize.define('Planning', {
    id_planning: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'id_planning'
    },
    matricule_agent: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'matricule_agent'
    },
    date_visite: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'date_visite'
    },
    heure_visite: {
      type: DataTypes.TIME,
      allowNull: false,
      field: 'heure_visite'
    },
    type_visite: {
      type: DataTypes.ENUM('Périodique', 'Reprise', 'Reclassement', 'Embauche'),
      defaultValue: 'Périodique',
      field: 'type_visite'
    },
    statut: {
      type: DataTypes.ENUM('Programmé', 'Effectué', 'Annulé', 'Reporté'),
      defaultValue: 'Programmé',
      field: 'statut'
    },
    visite_effectuee: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'visite_effectuee'
    },
    reprogrammee: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'reprogrammee'
    },
    source_reprogrammation: {
      type: DataTypes.ENUM('auto', 'manuel'),
      allowNull: true,
      field: 'source_reprogrammation'
    },
    motif_reprogrammation: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'motif_reprogrammation'
    },
    date_reprogrammation: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'date_reprogrammation'
    },
    visite_originale_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'visite_originale_id'
    },
    creneau_bloque: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'creneau_bloque'
    },
    nouvelle_date_visite: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'nouvelle_date_visite'
    },
    nouvelle_heure_visite: {
      type: DataTypes.TIME,
      allowNull: true,
      field: 'nouvelle_heure_visite'
    },
    priorite: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'priorite'
    },
    semaine: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'semaine'
    },
    annee: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'annee'
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'created_by'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    convocation_envoyee: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'convocation_envoyee'
    },

    date_convocation: {
  type: DataTypes.DATE,
  allowNull: true,
  field: 'date_convocation'
},
convocation_envoyee_par: {
  type: DataTypes.INTEGER,
  allowNull: true,
  field: 'convocation_envoyee_par'
},
convocation_envoyee_nom: {
  type: DataTypes.STRING(100),
  allowNull: true,
  field: 'convocation_envoyee_nom'
},

    motif_annulation: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'motif_annulation'
    },
    source_planification: {
      type: DataTypes.ENUM('auto', 'manuel'),
      defaultValue: 'auto',
      field: 'source_planification'
    },
    accident_lie_id: {
  type: DataTypes.INTEGER,
  allowNull: true,
  field: 'accident_lie_id'
},
source_originale: {
  type: DataTypes.ENUM('auto', 'manuel'),
  defaultValue: 'auto',
  field: 'source_originale'
}
  }, {
    tableName: 'planning',
    timestamps: false
  });

  // ⚠️ SUPPRIMER L'ASSOCIATION CROSS-DATABASE
  // Ne pas utiliser belongsTo avec un modèle d'une autre base
  // On gérera les jointures manuellement dans les services

  return Planning;
};