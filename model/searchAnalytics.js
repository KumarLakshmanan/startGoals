import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const SearchAnalytics = sequelize.define(
  "SearchAnalytics",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true, // Allow anonymous searches
      references: {
        model: "users",
        key: "user_id",
      },
    },
    searchQuery: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "Search query is required" },
      },
    },
    searchType: {
      type: DataTypes.ENUM("courses", "instructors", "projects", "global"),
      allowNull: false,
      defaultValue: "courses",
    },
    filters: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Applied filters in JSON format",
    },
    resultCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    clickedResultId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "ID of the result that was clicked (course, instructor, etc.)",
    },
    clickedResultType: {
      type: DataTypes.ENUM("course", "instructor", "project"),
      allowNull: true,
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Browser session ID for tracking user journey",
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    searchDuration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Time spent on search results page in seconds",
    },
    conversionType: {
      type: DataTypes.ENUM("enrollment", "inquiry", "view", "none"),
      allowNull: false,
      defaultValue: "none",
      // comment: "Type of conversion after search", // Temporarily commented to avoid Sequelize SQL generation bug
    },
    conversionValue: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: "Value of conversion (e.g., course price if enrolled)",
    },
    ...commonFields,
  },
  {
    tableName: "search_analytics",
    ...commonOptions,
    indexes: [
      {
        fields: ["search_query"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["user_id"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["search_type"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["created_at"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["conversion_type"], // Fixed: use snake_case column name
        type: "BTREE",
      },
    ],
  },
);

export default SearchAnalytics;
