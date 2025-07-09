import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const ProjectTechStack = sequelize.define(
  "project_tech_stack",
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
    skillId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "skills",
        key: "skill_id",
      },
      comment: "Reference to the skill ID that represents a tech stack item",
    },
    ...commonFields,
  },
  {
    tableName: "project_tech_stacks",
    ...commonOptions,
    indexes: [
      {
        fields: ["project_id"],
        type: "BTREE",
      },
      {
        fields: ["skill_id"],
        type: "BTREE",
      },
    ],
  }
);

export default ProjectTechStack;
