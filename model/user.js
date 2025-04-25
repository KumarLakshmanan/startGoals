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
    goalId: {
      type: DataTypes.UUID,
      allowNull: true, // Allow null initially
      references: {
        model: "goals",
        key: "goal_id",
      },
    },

    ...commonFields, // ✅ createdAt, updatedAt, deletedAt
  },
  {
    tableName: "users",
    ...commonOptions, // ✅ timestamps, paranoid, underscored
  }
);

export default User;
