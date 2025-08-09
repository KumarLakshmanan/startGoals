import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const DiscountUsage = sequelize.define(
  "DiscountUsage",
  {
    usageId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    discountId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "discount_codes",
        key: "discount_id",
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
    orderId: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Order ID where discount was applied",
    },
    itemType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['course', 'project']]
      },
},
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "Course ID or Project ID",
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "courses",
        key: "course_id",
      },
      comment: "Course ID if itemType is course",
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "projects",
        key: "project_id",
      },
      comment: "Project ID if itemType is project",
    },
    enrollmentId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "enrollments",
        key: "enrollment_id",
      },
      comment: "Enrollment ID if applicable",
    },
    originalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    finalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    usedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ...commonFields,
  },
  {
    tableName: "discount_usage",
    ...commonOptions,
    indexes: [
      {
        fields: ["discount_id"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["user_id"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["order_id"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["item_type", "item_id"], // Fixed: use snake_case column names
        type: "BTREE",
      },
      {
        fields: ["used_at"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["discount_id", "user_id"], // Fixed: use snake_case column names
        type: "BTREE",
      },
    ],
  },
);

export default DiscountUsage;
