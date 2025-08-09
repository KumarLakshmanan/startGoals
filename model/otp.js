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
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "email",
      validate: {
        isIn: [['email', 'sms', 'whatsapp', 'app']]
      },
},
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(50),
defaultValue: "active",
      validate: {
        isIn: [['active', 'expired', 'used']]
      },
},
    ...commonFields,
  },
  {
    tableName: "otps",
    ...commonOptions,
  },
);

export default Otp;
