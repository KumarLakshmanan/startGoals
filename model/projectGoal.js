// models/courseGoal.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const ProjectGoal = sequelize.define(
  "projectGoal",
  {
    projectGoalId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    goalId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "goals",
        key: "goal_id",
      },
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "projects",
        key: "project_id",
      },
    },
    goalName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Goal name is required" },
        len: {
          args: [3, 100],
          msg: "Goal name must be between 3 and 100 characters",
        },
      },
    },
    ...commonFields,
  },
  {
    tableName: "project_goals",
    ...commonOptions,
  },
);

export default ProjectGoal;
