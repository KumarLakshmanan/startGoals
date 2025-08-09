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
      // comment: "Generated order ID for tracking", // Temporarily commented to avoid Sequelize SQL generation bug
    },
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Original project price",
    },
    discountCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Applied discount code",
    },
    discountId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "discount_codes",
        key: "discount_id", // Fixed: should reference the actual primary key column
      },
      comment: "Foreign key to discount code record",
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
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
      type: DataTypes.STRING(50),
defaultValue: "pending",
      validate: {
        isIn: [['pending', 'processing', 'completed', 'failed', 'refunded', '']]
      },
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
        fields: ["project_id"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["user_id"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["order_id"], // Fixed: use snake_case column name
        type: "BTREE",
        unique: true,
      },
      {
        fields: ["payment_status"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["purchase_date"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        unique: true,
        fields: ["project_id", "user_id"], // Fixed: use snake_case column names
        name: "unique_project_user_purchase",
      },
    ],
  },
);

export default ProjectPurchase;
