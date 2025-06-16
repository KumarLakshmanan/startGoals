import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const UserSkill = sequelize.define(
  "userSkill",
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
    },    skillId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: "skill_id",
      references: {
        model: "skills",
        key: "skillId",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
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

export default UserSkill;
