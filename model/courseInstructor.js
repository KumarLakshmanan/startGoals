import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const CourseInstructor = sequelize.define(
  "CourseInstructor",
  {
    courseInstructorId: {
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
    instructorId: {
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
      comment: "Indicates if this is the primary instructor for the course",
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
    tableName: "course_instructors",
    ...commonOptions,
    indexes: [
      {
        unique: true,
        fields: ["course_id", "instructor_id"],
        name: "unique_course_instructor",
      },
    ],
  },
);

export default CourseInstructor;
