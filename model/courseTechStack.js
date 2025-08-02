import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const CourseTechStack = sequelize.define(
  "course_tech_stack",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "courses",
        key: "course_id",
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
    tableName: "course_tech_stacks",
    ...commonOptions,
    indexes: [
      {
        fields: ["course_id"],
        type: "BTREE",
      },
      {
        fields: ["skill_id"],
        type: "BTREE",
      },
    ],
  }
);

export default CourseTechStack;
