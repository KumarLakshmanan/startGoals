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
    moderationStatus: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "hidden"),
      defaultValue: "approved",
      comment: "Auto-approve for purchased users",
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
        fields: ["projectId"],
        type: "BTREE",
      },
      {
        fields: ["userId"],
        type: "BTREE",
      },
      {
        fields: ["rating"],
        type: "BTREE",
      },
      {
        fields: ["moderationStatus"],
        type: "BTREE",
      },
      {
        fields: ["createdAt"],
        type: "BTREE",
      },
      {
        unique: true,
        fields: ["projectId", "userId"],
        name: "unique_project_user_rating",
      },
    ],
  }
);

export default ProjectRating;
