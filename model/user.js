// models/user.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const User = sequelize.define(
  "user",
  {
    userId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 30],
        isAlphanumeric: true,
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: { isEmail: true },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    profileImage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [["admin", "owner", "teacher", "student"]],
      },
      defaultValue: "student",
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "local", // local | google | facebook | etc.
    },
    googleId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    mobile: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        is: /^\+?[1-9]\d{1,14}$/, // E.164 format
      },
    },
    isVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    androidRegId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Android device registration ID for push notifications",
    },
    iosRegId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "iOS device registration ID for push notifications",
    },
    firstLogin: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    passwordResetVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isOnboarded: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    averageRating: {
      type: DataTypes.DECIMAL(3, 2),
      allowNull: true,
      defaultValue: 0.0,
      validate: {
        min: 0.0,
        max: 5.0,
      },
      comment: "Average instructor rating from 0.00 to 5.00",
    },
    totalRatings: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
      comment: "Total number of instructor ratings received",
    },
    ...commonFields, // ✅ createdAt, updatedAt, deletedAt
  },
  {
    tableName: "users",
    ...commonOptions, // ✅ timestamps, paranoid, underscored
  },
);

export default User;
