import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const RecordedSessionResource = sequelize.define(
  "RecordedSessionResource",
  {
    resourceId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    recordedId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "recorded_sessions",
        key: "recorded_id",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fileType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["pdf", "doc", "zip", "ppt", "xls", "csv", "jpg", "png"]],
      },
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    ...commonFields,
  },
  {
    tableName: "recorded_session_resources",
    ...commonOptions,
  },
);

export default RecordedSessionResource;
