import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const RaisedHand = sequelize.define(
  "raisedHand",
  {
    raisedHandId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    participantId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    raisedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(50),
defaultValue: "pending",
      validate: {
        isIn: [['pending', 'accepted', 'rejected', 'addressed']]
      },
allowNull: false,
    },
    respondedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ...commonFields,
  },
  {
    tableName: "raised_hands",
    ...commonOptions,
    timestamps: true, // createdAt, updatedAt
  },
);

// Associations are defined in systemAssociations.js

export default RaisedHand;
