import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const UserSkills = sequelize.define(
  "userSkills",
  {
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: "user_id",
    },
    skillId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: "skill_id",
    },
    proficiencyLevel: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "intermediate",
      validate: {
        isIn: [['beginner', 'intermediate', 'advanced', 'expert']]
      },
      field: "proficiency_level",
    },
    ...commonFields,
  },
  {
    tableName: "user_skills",
    ...commonOptions,
  }
);

export default UserSkills;
