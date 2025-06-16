import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Settings = sequelize.define(
  "Settings",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "Setting key is required" },
      },
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    dataType: {
      type: DataTypes.ENUM("string", "number", "boolean", "json"),
      defaultValue: "string",
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    ...commonFields, // includes createdAt, updatedAt, deletedAt
  },
  {
    tableName: "settings",
    ...commonOptions, // includes timestamps, paranoid, underscored
  },
);

export default Settings;
