import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Order = sequelize.define(
  "Order",
  {
    orderId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    addressId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "addresses",
        key: "address_id",
      },
      comment: "Delivery address for the order",
    },
    razorpayOrderId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: "Razorpay order ID",
    },
    razorpayPaymentId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Razorpay payment ID after successful payment",
    },
    razorpaySignature: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Razorpay signature for verification",
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Total order amount",
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "INR",
    },
    status: {
      type: DataTypes.ENUM("created", "pending", "paid", "failed", "cancelled", "refunded"),
      allowNull: false,
      defaultValue: "created",
    },
    paymentMethod: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Payment method used",
    },
    finalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Final amount after discount",
      defaultValue: 0,
    },
    discountCode: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Applied discount code",
    },
    discountAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: "Total discount amount",
    },
    notes: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Additional order notes",
    },
    receipt: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Order receipt number",
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Date when payment was completed",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Order expiry time",
    },
    ...commonFields,
  },
  {
    tableName: "orders",
    ...commonOptions,
    indexes: [
      {
        fields: ["user_id"],
      },
      {
        fields: ["razorpay_order_id"],
      },
      {
        fields: ["status"],
      },
    ],
  },
);

export default Order;
