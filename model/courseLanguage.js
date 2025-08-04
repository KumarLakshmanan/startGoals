import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const CourseLanguage = sequelize.define(
  "CourseLanguage",
  {
    courseLanguageId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "courses",
        key: "course_id",
      },
    },
    languageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "languages",
        key: "language_id",
      },
    },
    ...commonFields,
  },
  {
    tableName: "course_languages",
    ...commonOptions,
    indexes: [
      {
        unique: true,
        fields: ["course_id", "language_id"],
        name: "unique_course_language",
      },
    ],
  },
);

export default CourseLanguage;
