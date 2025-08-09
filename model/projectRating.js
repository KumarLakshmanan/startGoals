import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const ProjectRating = sequelize.define(
  "ProjectRating",
  {
    ratingId: {
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    purchaseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "project_purchases",
        key: "purchase_id",
      },
      comment: "Must have purchased to rate",
    },
    rating: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: false,
      validate: {
        min: 1.0,
        max: 5.0,
      },
    },
    review: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    criteria: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Detailed rating criteria like quality, documentation, value",
    },
    isRecommended: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      comment: "Would recommend to others",
    },
    helpfulVotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of users who found review helpful",
    },
    notHelpfulVotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of users who found review not helpful",
    },
    moderationStatus: {
      type: DataTypes.STRING(20),
      defaultValue: "approved",
      comment: "Auto-approve for purchased users",
      validate: {
        isIn: [['pending', 'approved', 'rejected', 'hidden']]
      }
    },
    moderatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    moderatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    ...commonFields,
  },
  {
    tableName: "project_ratings",
    ...commonOptions,
    indexes: [
      {
        fields: ["project_id"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["user_id"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["rating"],
        type: "BTREE",
      },
      {
        fields: ["moderation_status"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["created_at"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        unique: true,
        fields: ["project_id", "user_id"], // Fixed: use snake_case column names
        name: "unique_project_user_rating",
      },
    ],
  },
);

export default ProjectRating;
