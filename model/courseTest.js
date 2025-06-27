// models/courseTest.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const CourseTest = sequelize.define(
  "course_test",
  {
    testId: {
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
    batchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "batches",
        key: "batch_id",
      },
      comment: "For live courses, can be associated with a specific batch",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    startDateTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "For live courses, when the test will be available",
    },
    endDateTime: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "For live courses, when the test will close",
    },
    durationMinutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 60,
      comment: "Duration of the test in minutes",
    },
    passingPercentage: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 70,
      comment: "Minimum percentage to pass the test",
    },
    totalQuestions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalMarks: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: "Whether passing this test is required for course completion",
    },
    createdBy: {
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
    tableName: "course_tests",
    ...commonOptions,
  },
);

export default CourseTest;
