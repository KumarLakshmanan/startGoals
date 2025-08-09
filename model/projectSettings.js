import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const ProjectSettings = sequelize.define(
  "ProjectSettings",
  {
    settingId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    globalDownloadLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 5,
      comment: "Global maximum downloads per project (null = unlimited)",
    },
    enableRatings: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether to allow ratings globally",
    },
    enableReviewModeration: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Require admin approval for reviews",
    },
    defaultLicenseType: {
      type: DataTypes.STRING(50),
defaultValue: "personal",
      validate: {
        isIn: [['personal', 'commercial', 'one_time', 'unlimited']]
      },
allowNull: false,
      comment: "Default license type for new projects",
    },
    autoEmailPurchaseConfirmation: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Auto-email purchase confirmation with download link",
    },
    priceBrackets: {
      type: DataTypes.JSON,
      defaultValue: [
        { min: 0, max: 9.99, label: "Under ₹10" },
        { min: 10, max: 49.99, label: "₹10 - ₹49.99" },
        { min: 50, max: 99.99, label: "₹50 - ₹99.99" },
        { min: 100, max: null, label: "₹100+" },
      ],
      comment: "Price brackets for filtering projects",
    },
    projectEmailTemplate: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Email template for project purchase confirmations",
    },
    ...commonFields,
  },
  {
    tableName: "project_settings",
    ...commonOptions,
  }
);

export default ProjectSettings;
