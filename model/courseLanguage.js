import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const CourseLanguage = sequelize.define(
  "courseLanguage",
  {
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: "course_id",
      references: {
        model: "courses",
        key: "courseId",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    languageId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: "language_id",
      references: {
        model: "languages",
        key: "languageId",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_primary",
    },
    ...commonFields,
  },
  {
    tableName: "course_languages",
    ...commonOptions,
  }
);

export default CourseLanguage;
