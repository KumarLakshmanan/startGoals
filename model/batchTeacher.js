// models/batchTeacher.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const BatchTeacher = sequelize.define(
  "batch_teacher",
  {
    batchTeacherId: {
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
      comment: "Indicates if this is the primary teacher for the batch",
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
    tableName: "batch_teachers",
    ...commonOptions,
    indexes: [
      {
        unique: true,
        fields: ["batch_id", "teacher_id"],
        name: "unique_batch_teacher",
      },
    ],
  },
);

export default BatchTeacher;
