// model/exam.js
import { DataTypes, UUIDV4 } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Exam = sequelize.define(
  "exam",
  {
    examId: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    examName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "Exam name is required" },
        len: {
          args: [3, 100],
          msg: "Exam name must be between 3 and 100 characters",
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    levelId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "level_id",
    },
    ...commonFields,
  },
  {
    tableName: "exams",
    ...commonOptions,
  },
);

export default Exam;
