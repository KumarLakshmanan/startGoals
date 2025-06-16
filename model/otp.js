import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Otp = sequelize.define(
  "otp",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    identifier: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    deliveryMethod: {
      type: DataTypes.ENUM("email", "sms", "whatsapp", "app"),
      allowNull: false,
      defaultValue: "email",
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM("active", "expired", "used"),
      defaultValue: "active",
    },
    ...commonFields,
  },
  {
    tableName: "otps",
    ...commonOptions,
  },
);

export default Otp;
