import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const UserLanguages = sequelize.define(
  "userLanguages",
  {
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: "user_id",
    },
    languageId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: "language_id",
    },
    proficiencyLevel: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "intermediate",
      validate: {
        isIn: [['beginner', 'intermediate', 'advanced', 'native']]
      },
      field: "proficiency_level",
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_primary",
    },
    ...commonFields,
  },
  {
    tableName: "user_languages",
    ...commonOptions,
  }
);

export default UserLanguages;
