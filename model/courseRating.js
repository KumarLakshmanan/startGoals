import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const CourseRating = sequelize.define(
  "CourseRating",
  {
    ratingId: {
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
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    rating: {
      type: DataTypes.DECIMAL(2, 1),
      allowNull: false,
      validate: {
        min: 1.0,
        max: 5.0,
      },
      comment: "Rating from 1.0 to 5.0",
    },
    review: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Optional written review",
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether the user has completed/enrolled in the course",
    },
    isHelpful: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Number of users who found this review helpful",
    },
    isReported: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether the review has been reported for inappropriate content",
    },
    moderationStatus: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "hidden"),
      defaultValue: "pending",
      comment: "Review moderation status",
    },
    moderatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "users",
        key: "user_id",
      },
      comment: "Admin who moderated this review",
    },
    moderatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "When the review was moderated",
    },
    ...commonFields,
  },
  {
    tableName: "course_ratings",
    ...commonOptions,
    indexes: [
      {
        fields: ["courseId"],
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
        // Ensure one rating per user per course
        unique: true,
        fields: ["courseId", "userId"],
        name: "unique_course_user_rating",
      },
    ],
  }
);

export default CourseRating;
