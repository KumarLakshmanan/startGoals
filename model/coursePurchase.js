// models/coursePurchase.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const CoursePurchase = sequelize.define(
  "course_purchase",
  {
    purchaseId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "courses",
        key: "course_id",
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    batchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "batches",
        key: "batch_id",
      },
      comment: "For live courses with batches",
    },
    paymentType: {
      type: DataTypes.ENUM("one-time", "monthly"),
      allowNull: false,
      defaultValue: "one-time",
    },
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    discountedPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    discountCodeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "discount_codes",
        key: "discount_code_id",
      },
    },
    paymentStatus: {
      type: DataTypes.ENUM("pending", "completed", "failed", "refunded"),
      defaultValue: "pending",
      allowNull: false,
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "External payment gateway ID",
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Payment method used (credit card, PayPal, etc.)",
    },
    purchaseDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    lastRenewalDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "For monthly subscriptions",
    },
    nextRenewalDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "For monthly subscriptions",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    ...commonFields,
  },
  {
    tableName: "course_purchases",
    ...commonOptions,
  },
);

export default CoursePurchase;
