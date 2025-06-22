import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const UserExams = sequelize.define(
  "userExams",
  {
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: "user_id",
    },
    examId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: "exam_id",
    },
    ...commonFields,
  },
  {
    tableName: "user_exams",
    ...commonOptions,
  }
);

export default UserExams;
