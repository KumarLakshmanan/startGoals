import { DataTypes, UUIDV4 } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Skill = sequelize.define(
  "skill",
  {
    skillId: {
      type: DataTypes.UUID,
      defaultValue: UUIDV4,
      primaryKey: true,
    },
    skillName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "Skill name is required" },
        len: {
          args: [1, 100],
          msg: "Skill name must be between 1 and 100 characters",
        },
      },
    },    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "category_id",
    },
    levelId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "level_id",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },    goalId: {
      type: DataTypes.UUID,
      allowNull: true, // Made optional
      field: "goal_id",
    },
    ...commonFields,
  },
  {
    tableName: "skills",
    ...commonOptions,
  },
);

export default Skill;
