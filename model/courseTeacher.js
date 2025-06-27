// models/courseTeacher.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const CourseTeacher = sequelize.define(
  "CourseTeacher",
  {
    courseTeacherId: {
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
    teacherId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Indicates if this is the primary teacher for the course",
    },
    assignedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    ...commonFields,
  },
  {
    tableName: "course_teachers",
    ...commonOptions,
    indexes: [
      {
        unique: true,
        fields: ["course_id", "teacher_id"],
        name: "unique_course_teacher",
      },
    ],
  },
);

export default CourseTeacher;
