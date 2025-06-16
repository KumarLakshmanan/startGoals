import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Enrollment = sequelize.define(
  "enrollment",
  {
    enrollmentId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users", // Reference to User model
        key: "user_id", // Foreign key in User model
      },
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "courses", // Reference to Course model
        key: "course_id", // Foreign key in Course model
      },
    },
    enrollmentDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    enrolledAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    validTill: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    batchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "batches",
        key: "batch_id",
      },
    },
    // Payment related fields
    paymentStatus: {
      type: DataTypes.ENUM("pending", "completed", "failed", "refunded"),
      defaultValue: "pending",
      allowNull: false,
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Razorpay payment ID",
    },
    orderId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Razorpay order ID",
    },
    amountPaid: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Amount paid for the course",
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "razorpay",
    },
    // Course progress fields
    completionStatus: {
      type: DataTypes.ENUM(
        "not_started",
        "in_progress",
        "completed",
        "dropped",
      ),
      defaultValue: "not_started",
      allowNull: false,
    },
    progressPercentage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      validate: {
        min: 0,
        max: 100,
      },
    },
    enrollmentType: {
      type: DataTypes.ENUM("live", "recorded"),
      allowNull: true,
      comment: "Type of course enrolled in",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastAccessedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ...commonFields, // Include shared fields like createdAt, updatedAt, deletedAt
  },
  {
    tableName: "enrollments",
    ...commonOptions, // Include shared options like timestamps, paranoid, and underscored
  },
);

export default Enrollment;
