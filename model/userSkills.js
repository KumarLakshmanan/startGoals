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
      type: DataTypes.ENUM("beginner", "intermediate", "advanced", "expert"),
      allowNull: true,
      defaultValue: "intermediate",
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
