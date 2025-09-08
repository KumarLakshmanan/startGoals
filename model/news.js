import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const News = sequelize.define(
  "News",
  {
    newsId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: { msg: "News title is required" },
        len: [3, 200],
      },
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: { msg: "News content is required" },
      },
      comment: "HTML formatted news content",
    },
    shortDescription: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "Brief description for listing cards",
    },
    thumbnailUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "News thumbnail image",
    },
    coverImage: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Large cover image for the news article",
    },
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: "draft",
      allowNull: false,
      validate: {
        isIn: [['active', 'draft', 'archived', 'rejected', 'hidden']]
      }
    },
    isPublished: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether news is published and visible to users",
    },
    publishedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    tags: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Array of tags for categorization",
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether news is featured on homepage",
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of views",
    },
    likeCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of likes",
    },
    ...commonFields,
  },
  {
    tableName: "news",
    ...commonOptions,
  },
);

export default News;
