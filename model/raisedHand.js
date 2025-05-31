import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";
import LiveSession from "./liveSession.js";
import LiveSessionParticipant from "./liveSessionParticipant.js";

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
      type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'addressed'),
      defaultValue: 'pending',
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
  }
);

// Define associations
RaisedHand.belongsTo(LiveSession, { foreignKey: 'sessionId' });
RaisedHand.belongsTo(LiveSessionParticipant, { foreignKey: 'participantId' });

LiveSession.hasMany(RaisedHand, { foreignKey: 'sessionId' });
LiveSessionParticipant.hasMany(RaisedHand, { foreignKey: 'participantId' });

export default RaisedHand;