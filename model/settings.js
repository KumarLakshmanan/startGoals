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
      type: DataTypes.STRING(50),
      defaultValue: "string",
      validate: {
        isIn: [['string', 'number', 'boolean', 'json']]
      },
      allowNull: false,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    languageCode: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: "Language code for localized settings (e.g., 'en', 'es', 'hi')",
    },
    callUsNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Call us phone number for specific language",
    },
    whatsappNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "WhatsApp phone number for specific language",
    },
    ...commonFields, // includes createdAt, updatedAt, deletedAt
  },
  {
    tableName: "settings",
    ...commonOptions, // includes timestamps, paranoid, underscored
  },
);

export default Settings;
