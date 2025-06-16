// models/courseTag.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const CourseTag = sequelize.define(
  "courseTag",
  {
    courseTagId: {
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
    tag: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ...commonFields, // ✅ shared timestamps and soft delete
  },
  {
    tableName: "course_tags",
    ...commonOptions, // ✅ timestamps, paranoid, underscored
  },
);

export default CourseTag;
