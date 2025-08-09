import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const OrderItem = sequelize.define(
  "OrderItem",
  {
    orderItemId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    orderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "orders",
        key: "order_id",
      },
    },
    itemType: {
      type: DataTypes.STRING(50),
      allowNull: false,
comment: "Type of item purchased",
      validate: {
        isIn: [['course', 'project']]
      },
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "ID of the course or project",
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: "Always 1 for courses/projects",
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Price at the time of purchase",
    },
    discountApplied: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: "Discount amount applied to this item",
    },
    finalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: "Final price after discount",
    },
    ...commonFields,
  },
  {
    ...commonOptions,
    tableName: "order_items",
    indexes: [
      {
        fields: ["order_id"],
      },
      {
        fields: ["item_type", "item_id"],
      },
    ],
  }
);

// No changes needed; model is already correct for normalized order items.

export default OrderItem;
