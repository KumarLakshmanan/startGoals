import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const InstructorRating = sequelize.define(
  "InstructorRating",
  {
    ratingId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    instructorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
      comment: "The instructor being rated",
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
      comment: "The user giving the rating",
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "courses",
        key: "course_id",
      },
      comment: "Optional: specific course this rating is for",
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
    criteria: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: "Detailed rating criteria like teaching_quality, communication, etc.",
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: "Whether the user was actually taught by this instructor",
    },
    moderationStatus: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "hidden"),
      defaultValue: "pending",
      // comment: "Review moderation status", // Temporarily commented to avoid Sequelize SQL generation bug
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
    tableName: "instructor_ratings",
    ...commonOptions,
    indexes: [
      {
        fields: ["instructor_id"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["user_id"], // Fixed: use snake_case column name
        type: "BTREE",
      },
      {
        fields: ["course_id"], // Fixed: use snake_case column name
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
        // Ensure one rating per user per instructor per course
        unique: true,
        fields: ["instructor_id", "user_id", "course_id"], // Fixed: use snake_case column names
        name: "unique_instructor_user_course_rating",
      },
    ],
  }
);

export default InstructorRating;
