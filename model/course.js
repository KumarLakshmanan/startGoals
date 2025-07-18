import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const CourseEnhanced = sequelize.define(
  "Course", // Internal Sequelize model name (same as original)
  {
    courseId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Course title is required" },
        len: [3, 200],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Course description is required" },
      },
    },
    shortDescription: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Brief description for listing cards",
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
    discountEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether discount codes can be applied",
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
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Total duration in minutes for recorded courses",
    },
    liveStartDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    liveEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Main course thumbnail",
    },
    coverImage: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Large cover image for the course landing page",
    },
    hasIntroVideo: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    introVideoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    demoUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Live demo URL for course preview",
    },
    screenshots: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of screenshot URLs",
    },
    hasCertificate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    certificateTemplateUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    techStack: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Technologies taught in the course (JSON array)",
    },
    programmingLanguages: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Programming languages used (JSON array)",
    },
    features: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Rich text of course features",
    },
    prerequisites: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Rich text of prerequisites or requirements",
    },
    whatYouGet: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Rich text of resources included in the course",
    },
    status: {
      type: DataTypes.ENUM("active", "draft", "archived", "rejected", "hidden"),
      defaultValue: "draft",
      allowNull: false,
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastUpdated: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When course content was last updated",
    },
    version: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "1.0",
    },
    totalSections: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Total number of sections",
    },
    totalLessons: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Total number of lessons",
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
    supportIncluded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether instructor support is included",
    },
    supportDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Support duration in days",
    },
    supportEmail: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Email for course support inquiries",
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
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether course is featured on homepage or category pages",
    },
    ...commonFields, // includes createdAt, updatedAt, deletedAt
  },
  {
    tableName: "courses",
    ...commonOptions, // includes timestamps, paranoid, underscored
  },
);

export default CourseEnhanced;
