import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import User from "./user.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

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
        key: "user_id",
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
      type: DataTypes.STRING(50),
defaultValue: "info",
      validate: {
        isIn: [['info', 'success', 'warning', 'error', 'system']]
      },
},
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    priority: {
      type: DataTypes.STRING(50),
defaultValue: "medium",
      validate: {
        isIn: [['low', 'medium', 'high', 'urgent']]
      },
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
    },
    ...commonFields,
  },
  {
    tableName: "notifications",
    ...commonOptions,
  },
);


export default Notification;
