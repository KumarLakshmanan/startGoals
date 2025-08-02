// models/category.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Category = sequelize.define(
  "category",
  {
    categoryId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    categoryName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    categoryCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    ...commonFields,
  },
  {
    tableName: "categories",
    ...commonOptions,
  },
);

export default Category;
