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
        len: [3, 200],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Project description is required" },
      },
      comment: "HTML formatted project description",
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
        model: "categories",
        key: "category_id",
      },
    },
    levelId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "course_levels",
        key: "level_id",
      },
      comment: "Level of difficulty (beginner, intermediate, advanced)",
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    previewVideo: {
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
    features: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "HTML formatted project features",
    },
    requirements: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "HTML formatted system requirements or prerequisites",
    },
    whatYouGet: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "HTML formatted files/resources included",
    },
    licenseType: {
      type: DataTypes.STRING(50),
      defaultValue: "personal",
      validate: {
        isIn: [['personal', 'commercial', 'one_time', 'unlimited']]
      },
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
      type: DataTypes.STRING(50),
      defaultValue: "draft",
      validate: {
        isIn: [['active', 'draft', 'archived', 'rejected', 'hidden']]
      },
      allowNull: false,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    totalEnrollments: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Total number of enrollments",
    },
    totalRevenue: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0.0,
      comment: "Total revenue generated",
    },
    averageRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.0,
      validate: {
        min: 0.0,
        max: 5.0,
      },
    },
    totalRatings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: "Total number of ratings received",
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Featured project for promotion",
    },
    supportEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Support contact email",
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
        fields: ["category_id"],
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
        fields: ["average_rating"],
        type: "BTREE",
      },
      {
        fields: ["total_enrollments"],
        type: "BTREE",
      },
      {
        fields: ["created_at"],
        type: "BTREE",
      },
      {
        fields: ["published_at"],
        type: "BTREE",
      },
    ],
  }
);

export default Project;
