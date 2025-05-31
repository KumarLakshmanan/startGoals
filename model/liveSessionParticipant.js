import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";
import LiveSession from "./liveSession.js"; // Assuming LiveSession model exists
// import User from './user.js'; // Assuming User model exists and you want to link to it

const LiveSessionParticipant = sequelize.define(
  "liveSessionParticipant",
  {
    participantId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('instructor', 'student', 'moderator'),
      allowNull: false,
      defaultValue: 'student',
    },
    joinedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    leftAt: {
      type: DataTypes.DATE,
      allowNull: true, // Null if the participant is still in the session
    },
    isMuted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    isCameraOn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    ...commonFields,
  },
  {
    tableName: "live_session_participants",
    ...commonOptions,
    timestamps: true, // Enabling Sequelize's default timestamps (createdAt, updatedAt)
  }
);

// Define associations if necessary
// LiveSessionParticipant.belongsTo(LiveSession, { foreignKey: 'sessionId' });
// LiveSessionParticipant.belongsTo(User, { foreignKey: 'userId' });

export default LiveSessionParticipant;