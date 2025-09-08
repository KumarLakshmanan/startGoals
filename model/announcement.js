import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Announcement = sequelize.define(
  "Announcement",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Full content of the announcement",
    },
    imageUrl: {
      type: DataTypes.STRING(10000),
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    priority: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
      allowNull: false,
      defaultValue: 'medium',
      comment: "Priority level of the announcement",
    },
    announcementType: {
      type: DataTypes.ENUM('general', 'maintenance', 'feature', 'update', 'important'),
      allowNull: false,
      defaultValue: 'general',
      comment: "Type of announcement",
    },
    targetAudience: {
      type: DataTypes.ENUM('all', 'students', 'teachers', 'admins'),
      allowNull: false,
      defaultValue: 'all',
      comment: "Target audience for the announcement",
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the announcement should start being displayed",
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the announcement should stop being displayed",
    },
    isSticky: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "Whether the announcement should be sticky/pinned",
    },
    viewCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Number of times the announcement has been viewed",
    },
    clickCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: "Number of times the announcement has been clicked",
    },
    navigationUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "URL to navigate to when announcement is clicked",
    },
    navigationType: {
      type: DataTypes.ENUM('external', 'internal', 'none'),
      allowNull: false,
      defaultValue: 'none',
      comment: "Type of navigation when clicked",
    },
    ...commonFields,
  },
  {
    tableName: "announcements",
    ...commonOptions,
  },
);

export default Announcement;