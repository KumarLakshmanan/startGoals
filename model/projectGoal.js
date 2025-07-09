import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const ProjectGoal = sequelize.define(
  "project_goal",
  {
    id: {
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
    goalId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "goals",
        key: "goal_id",
      },
    },
    ...commonFields,
  },
  {
    tableName: "project_goals",
    ...commonOptions,
    indexes: [
      {
        fields: ["project_id"],
        type: "BTREE",
      },
      {
        fields: ["goal_id"],
        type: "BTREE",
      },
    ],
  }
);

export default ProjectGoal;
