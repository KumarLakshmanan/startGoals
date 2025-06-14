import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Project = sequelize.define(
  "Project",
  {
    projectId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Project title is required" },
        len: [3, 200]
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Project description is required" },
      },
    },
    shortDescription: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Brief description for listing cards",
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "course_categories",
        key: "category_id",
      },
    },
    skillLevel: {
      type: DataTypes.ENUM("beginner", "intermediate", "expert"),
      allowNull: false,
      defaultValue: "beginner",
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of technology tags",
    },
    languageId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "languages",
        key: "language_id",
      },
      comment: "Programming/source language if applicable",
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    discountEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether discount codes can be applied",
    },
    coverImage: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Main project thumbnail",
    },
    demoVideo: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Demo video URL",
    },
    demoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Live demo URL",
    },
    screenshots: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of screenshot URLs",
    },
    techStack: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Technologies used in the project",
    },
    features: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "List of project features",
    },
    requirements: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "System requirements or prerequisites",
    },
    whatYouGet: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "List of files/resources included",
    },
    licenseType: {
      type: DataTypes.ENUM("personal", "commercial", "one_time", "unlimited"),
      defaultValue: "personal",
      allowNull: false,
    },
    downloadLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Maximum downloads per purchase (null = unlimited)",
    },
    supportIncluded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether support is included",
    },
    supportDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Support duration in days",
    },
    filesSize: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Total file size (e.g., '25 MB')",
    },
    lastUpdated: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When project files were last updated",
    },
    version: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "1.0",
    },
    status: {
      type: DataTypes.ENUM("draft", "published", "archived", "rejected"),
      defaultValue: "draft",
      allowNull: false,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    totalSales: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Total number of sales",
    },
    totalRevenue: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.00,
      comment: "Total revenue generated",
    },
    averageRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.00,
      validate: {
        min: 0.00,
        max: 5.00,
      },
    },
    totalRatings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Featured project for promotion",
    },
    ...commonFields,
  },
  {
    tableName: "projects",
    ...commonOptions,
    indexes: [
      {
        fields: ["title"],
        type: "BTREE",
      },
      {
        fields: ["categoryId"],
        type: "BTREE",
      },
      {
        fields: ["skillLevel"],
        type: "BTREE",
      },
      {
        fields: ["price"],
        type: "BTREE",
      },
      {
        fields: ["status"],
        type: "BTREE",
      },
      {
        fields: ["featured"],
        type: "BTREE",
      },
      {
        fields: ["averageRating"],
        type: "BTREE",
      },
      {
        fields: ["totalSales"],
        type: "BTREE",
      },
      {
        fields: ["createdAt"],
        type: "BTREE",
      },
      {
        fields: ["publishedAt"],
        type: "BTREE",
      },
    ],
  }
);

export default Project;
