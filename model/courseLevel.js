// models/courseLevel.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const CourseLevel = sequelize.define(
  "courseLevel",
  {
    levelId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    level: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ...commonFields,
  },
  {
    tableName: "course_levels",
    ...commonOptions,
  }
);

export default CourseLevel;
