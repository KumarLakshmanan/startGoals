// models/recordedSession.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const RecordedSession = sequelize.define(
  "recordedSession",
  {
    recordedId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    sessionId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "live_sessions",
        key: "session_id",
      },
    },
    videoUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    transcriptUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    isDownloadable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    ...commonFields,
  },
  {
    tableName: "recorded_sessions",
    ...commonOptions,
  },
);

export default RecordedSession;
