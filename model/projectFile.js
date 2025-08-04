import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const ProjectFile = sequelize.define(
  "ProjectFile",
  {
    fileId: {
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
    fileName: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Original file name",
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: "Secure download URL",
    },
    fileType: {
      type: DataTypes.ENUM(
        "video",
        "document",
        "image",
        "audio",
        "archive",
        "source_code",
        "presentation",
        "spreadsheet",
        "resource",
        "documentation",
        "assets",
        "demo",
        "other",
      ),
      allowNull: false,
      defaultValue: "source_code",
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "File size in bytes",
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isMain: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Main downloadable file (e.g., source code ZIP)",
    },
    downloadOrder: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Display order in download list",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "File description",
    },
    version: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "1.0",
    },
    uploadedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    ...commonFields,
  },
  {
    tableName: "project_files",
    ...commonOptions,
    indexes: [
      {
        fields: ["project_id"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["file_type"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["is_main"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["download_order"], // Fixed: use snake_case column name
        type: "BTREE",
      },
    ],
  },
);

export default ProjectFile;
