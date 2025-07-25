import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Cart = sequelize.define(
  "Cart",
  {
    cartId: {
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
    itemType: {
      type: DataTypes.ENUM("course", "project"),
      allowNull: false,
      comment: "Type of item in cart",
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
      comment: "Price at the time of adding to cart",
    },
    addedDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ...commonFields,
  },
  {
    tableName: "carts",
    ...commonOptions,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "item_type", "item_id"],
        name: "unique_user_item_cart",
      },
    ],
  },
);

export default Cart;
