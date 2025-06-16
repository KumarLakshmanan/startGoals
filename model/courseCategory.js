// models/category.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Category = sequelize.define(
  "courseCategory",
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
      type: DataTypes.STRING(50), // Increased length to accommodate longer codes
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    parentCategoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'course_categories',
        key: 'category_id'
      }
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    displayOrder: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    ...commonFields, // ✅ shared fields like createdAt, updatedAt, deletedAt
  },
  {
    tableName: "course_categories",
    ...commonOptions, // ✅ shared options: timestamps, paranoid, underscored
  }
);

export default Category;
