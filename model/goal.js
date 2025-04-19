// model/goal.js
import { DataTypes, UUIDV4 } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Goal = sequelize.define(
  "goal",
  {
    goalId: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    goalName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "Goal name is required" },
        len: {
          args: [3, 100],
          msg: "Goal name must be between 3 and 100 characters",
        },
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ...commonFields,
  },
  {
    tableName: "goals",
    ...commonOptions,
  }
);

export default Goal;
