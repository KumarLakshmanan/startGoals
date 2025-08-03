// models/courseGoal.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const ProjectGoal = sequelize.define(
  "projectGoal",
  {
    goalId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    projectId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "projects",
        key: "project_id",
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
