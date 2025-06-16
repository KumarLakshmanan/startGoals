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
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "category_id",
      references: {
        model: "course_categories",
        key: "categoryId",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    levelId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "level_id",
      references: {
        model: "course_levels",
        key: "levelId",
      },
      onDelete: "SET NULL",
      onUpdate: "CASCADE",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    goalId: {
      type: DataTypes.UUID,
      allowNull: true, // Made optional
      field: "goal_id",
      references: {
        model: "goals",
        key: "goalId",
      },
      onDelete: "SET NULL", // Changed from CASCADE to SET NULL
      onUpdate: "CASCADE",
    },
    ...commonFields,
  },
  {
    tableName: "skills",
    ...commonOptions,
  },
);

export default Skill;
