import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const UserGoal = sequelize.define(
  "userGoal",
  {
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: "user_id",
      references: {
        model: "users",
        key: "userId",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    goalId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: "goal_id",
      references: {
        model: "goals",
        key: "goalId",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    ...commonFields,
  },
  {
    tableName: "user_goals",
    ...commonOptions,
  }
);

export default UserGoal;
