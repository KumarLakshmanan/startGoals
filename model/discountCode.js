import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const DiscountCode = sequelize.define(
  "DiscountCode",
  {
    discountId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "Discount code is required" },
        len: [3, 50],
        isUppercase: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Internal description for admin",
    },
    discountType: {
      type: DataTypes.ENUM("percentage", "fixed"),
      allowNull: false,
      defaultValue: "percentage",
    },
    discountValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
      comment: "Percentage (e.g., 10.00) or fixed amount (e.g., 100.00)",
    },
    maxDiscountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Maximum discount cap for percentage codes",
    },
    minimumPurchaseAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Minimum purchase requirement",
    },
    validFrom: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    validUntil: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    usageLimit: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Total usage limit (null = unlimited)",
    },
    usageLimitPerUser: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      comment: "Per-user usage limit",
    },
    currentUsage: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Current total usage count",
    },
    applicableTypes: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of applicable types: ['courses', 'projects', 'all']",
    },
    applicableCategories: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of category IDs (null = all categories)",
    },
    applicableSkillLevels: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of skill levels (null = all levels)",
    },
    excludedItems: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of excluded course/project IDs",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    campaignName: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Marketing campaign name (e.g., 'Diwali Sale 2025')",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Internal admin notes",
    },
    ...commonFields,
  },
  {
    tableName: "discount_codes",
    ...commonOptions,
    indexes: [
      {
        fields: ["code"],
        type: "BTREE",
        unique: true,
      },
      {
        fields: ["validFrom", "validUntil"],
        type: "BTREE",
      },
      {
        fields: ["isActive"],
        type: "BTREE",
      },
      {
        fields: ["discountType"],
        type: "BTREE",
      },
      {
        fields: ["createdBy"],
        type: "BTREE",
      },
      {
        fields: ["campaignName"],
        type: "BTREE",
      },
    ],
  }
);

export default DiscountCode;
