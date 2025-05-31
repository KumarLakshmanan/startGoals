// models/batchStudents.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const BatchStudents = sequelize.define(
  "batch_students",
  {
    batchStudentId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    batchId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "batches",
        key: "batch_id",
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    enrollmentDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "dropped", "completed"),
      defaultValue: "active",
      allowNull: false,
    },
    ...commonFields,
  },
  {
    tableName: "batch_students",
    ...commonOptions,
  }
);

export default BatchStudents;
