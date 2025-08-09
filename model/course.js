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
      comment: "HTML formatted course description",
    },
    shortDescription: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Brief description for listing cards",
    },
    levelId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "course_levels",
        key: "level_id",
      },
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "categories",
        key: "category_id",
      },
    },
    type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['recorded', 'live']]
      }
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    discountEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether discount codes can be applied",
    },
    isMonthlyPayment: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
    registrationOpen: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether course registration is open",
    },
    maxEnrollments: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Maximum number of students allowed to enroll",
    },
    registrationDeadline: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Deadline for course registration",
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
    features: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "HTML formatted course features",
    },
    prerequisites: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "HTML formatted prerequisites or requirements",
    },
    whatYouGet: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "HTML formatted resources included in the course",
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: "draft",
      allowNull: false,
      validate: {
        isIn: [['active', 'draft', 'archived', 'rejected', 'hidden']]
      }
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether course is published and visible to students",
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