import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Course = sequelize.define(
  "Course", // Internal Sequelize model name
  {
    courseId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    levelId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    type: {
      type: DataTypes.ENUM("recorded", "live"),
      allowNull: false,
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    salePrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Discounted price for the course",
    },
    // For live courses - monthly payment
    isMonthlyPayment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    durationDays: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Duration in days for live courses",
    },
    liveStartDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    liveEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    hasIntroVideo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    introVideoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    hasCertificate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    certificateTemplateUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "draft", "archived"),
      defaultValue: "draft",
      allowNull: false,
    },
    averageRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.0,
      validate: {
        min: 0.0,
        max: 5.0,
      },
      comment: "Average rating from 0.00 to 5.00",
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
    ...commonFields, // includes createdAt, updatedAt, deletedAt
  },
  {
    tableName: "courses",
    ...commonOptions, // includes timestamps, paranoid, underscored
  },
);

export default Course;
