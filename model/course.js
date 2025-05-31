import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Course = sequelize.define(
  "Course", // Internal Sequelize model name
  {
    courseId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    levelId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    categoryId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    type: {
      type: DataTypes.ENUM("recorded", "live", "hybrid"),
      allowNull: false,
    },
    isPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    price: {
      type: DataTypes.DECIMAL,
      allowNull: true,
    },
    liveStartDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    liveEndDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    wasLive: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    recordedFromId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("active", "inactive", "draft", "deleted"),
      defaultValue: "draft",
      allowNull: false,
    },
    ...commonFields, // includes createdAt, updatedAt, deletedAt
  },
  {
    tableName: "courses",
    ...commonOptions, // includes timestamps, paranoid, underscored
  }
);

export default Course;
