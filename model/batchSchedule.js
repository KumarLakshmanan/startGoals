// models/batchSchedule.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const BatchSchedule = sequelize.define(
  "batch_schedule",
  {
    scheduleId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    batchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "batches",
        key: "batch_id",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDateTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    teacherId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
      comment: "Teacher assigned for this specific class session",
    },
    meetingUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "URL for virtual meeting (Zoom, Google Meet, etc.)",
    },
    meetingId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Meeting ID for virtual platforms",
    },
    meetingPassword: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Password for virtual meeting",
    },
    isRecorded: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether this session will be recorded",
    },
    recordingUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "URL to the recording after class is completed",
    },
    status: {
      type: DataTypes.ENUM("scheduled", "ongoing", "completed", "cancelled"),
      defaultValue: "scheduled",
      allowNull: false,
    },
    ...commonFields,
  },
  {
    tableName: "batch_schedules",
    ...commonOptions,
  },
);

export default BatchSchedule;
