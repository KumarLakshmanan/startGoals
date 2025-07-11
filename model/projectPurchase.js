import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const ProjectPurchase = sequelize.define(
  "ProjectPurchase",
  {
    purchaseId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "projects",
        key: "project_id",
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
      unique: true,
      comment: "Generated order ID for tracking",
    },    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Original project price",
    },
    discountCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Applied discount code",
    },
    discountCodeId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "discount_codes",
        key: "discount_code_id",
      },
      comment: "Foreign key to discount code record",
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      comment: "Discount amount applied",
    },
    finalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Final amount paid",
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Payment gateway used",
    },
    paymentId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Payment gateway transaction ID",
    },
    paymentStatus: {
      type: DataTypes.ENUM("pending", "processing", "completed", "failed", "refunded"),
      defaultValue: "pending",
      allowNull: false,
    },
    purchaseDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of times downloaded",
    },
    firstDownloadAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastDownloadAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    licenseKey: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Generated license key if applicable",
    },
    supportExpiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When support expires",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Internal notes",
    },
    invoiceUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Generated invoice/receipt URL",
    },
    refundReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    refundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
    refundDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ...commonFields,
  },
  {
    tableName: "project_purchases",
    ...commonOptions,
    indexes: [
      {
        fields: ["projectId"],
        type: "BTREE",
      },
      {
        fields: ["userId"],
        type: "BTREE",
      },
      {
        fields: ["orderId"],
        type: "BTREE",
        unique: true,
      },
      {
        fields: ["paymentStatus"],
        type: "BTREE",
      },
      {
        fields: ["purchaseDate"],
        type: "BTREE",
      },
      {
        unique: true,
        fields: ["projectId", "userId"],
        name: "unique_project_user_purchase",
      },
    ],
  }
);

export default ProjectPurchase;
