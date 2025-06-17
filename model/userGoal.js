import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const UserGoal = sequelize.define(
  "userGoal",
  {    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: "user_id",
    },
    goalId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: "goal_id",
    },
    ...commonFields,
  },
  {
    tableName: "user_goals",
    ...commonOptions,
  }
);

export default UserGoal;
