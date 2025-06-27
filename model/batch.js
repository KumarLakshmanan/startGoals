// models/batch.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Batch = sequelize.define(
  "batch",
  {
    batchId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "courses",
        key: "course_id",
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
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "Start date of the batch",
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      comment: "End date of the batch",
    },
    enrollmentCapacity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30,
      comment: "Maximum number of students allowed in the batch",
    },
    currentEnrollment: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Current number of enrolled students",
    },
    status: {
      type: DataTypes.ENUM("upcoming", "ongoing", "completed", "cancelled"),
      allowNull: false,
      defaultValue: "upcoming",
    },
    hasChatEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether batch-level chat is enabled",
    },
    chatChannelId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "External chat channel identifier",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    ...commonFields,
  },
  {
    tableName: "batches",
    ...commonOptions,
  },
);

export default Batch;
