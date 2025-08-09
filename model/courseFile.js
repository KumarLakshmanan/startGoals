import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const CourseFile = sequelize.define(
  "CourseFile",
  {
    fileId: {
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
      comment: "Course this file belongs to",
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
      type: DataTypes.STRING(50),
defaultValue: "other",
      validate: {
        isIn: [['video', 'document', 'assignment', 'image', 'audio', 'archive', 'source_code', 'presentation', 'spreadsheet', 'resource', 'documentation', 'assets', 'demo', 'other', '']]
      },
allowNull: false,
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "File size in bytes",
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sectionId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "sections",
        key: "section_id",
      },
      comment: "Section this file belongs to (optional)",
    },
    lessonId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "lessons",
        key: "lesson_id",
      },
      comment: "Lesson this file belongs to (optional)",
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
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Display order within a section or lesson",
    },
    ...commonFields,
  },
  {
    tableName: "course_files",
    ...commonOptions,
    indexes: [
      {
        fields: ["course_id"],
        type: "BTREE",
      },
      {
        fields: ["section_id"],
        type: "BTREE",
      },
      {
        fields: ["lesson_id"],
        type: "BTREE",
      },
      {
        fields: ["uploaded_by"],
        type: "BTREE",
      },
      {
        fields: ["file_type"],
        type: "BTREE",
      },
    ],
  },
);

export default CourseFile;
