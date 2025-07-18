import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Wishlist = sequelize.define(
  "Wishlist",
  {
    wishlistId: {
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
      comment: "Type of item in wishlist",
    },
    itemId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: "ID of the course or project",
    },
    addedDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ...commonFields,
  },
  {
    tableName: "wishlists",
    ...commonOptions,
    indexes: [
      {
        unique: true,
        fields: ["user_id", "item_type", "item_id"],
        name: "unique_user_item_wishlist",
      },
    ],
  },
);

export default Wishlist;
