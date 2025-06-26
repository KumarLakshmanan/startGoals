// ===========================================================================================
// NOTIFICATION MODEL
// Defines the structure for user notifications in the database
// ===========================================================================================

import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./user.js";

const Notification = sequelize.define(
  "notification",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: "userId",
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("info", "success", "warning", "error", "system"),
      defaultValue: "info",
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    priority: {
      type: DataTypes.ENUM("low", "medium", "high", "urgent"),
      defaultValue: "medium",
    },
    link: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    }
  },
  {
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ["userId"],
      },
      {
        fields: ["type"],
      },
      {
        fields: ["isRead"],
      },
      {
        fields: ["priority"],
      },
      {
        fields: ["createdAt"],
      },
    ],
  }
);

// Set up the relationship with User model
Notification.belongsTo(User, { foreignKey: "userId" });
User.hasMany(Notification, { foreignKey: "userId" });

export default Notification;
