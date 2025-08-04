import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const ProjectLanguage = sequelize.define(
  "ProjectLanguage",
  {
    projectLanguageId: {
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
    languageId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "languages",
        key: "language_id",
      },
    },
    ...commonFields,
  },
  {
    tableName: "project_languages",
    ...commonOptions,
    indexes: [
      {
        unique: true,
        fields: ["project_id", "language_id"],
        name: "unique_project_language",
      },
    ],
  },
);

export default ProjectLanguage;
