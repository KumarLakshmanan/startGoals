import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const RedeemCode = sequelize.define(
  "RedeemCode",
  {
    redeemCodeId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: { msg: "Redeem code is required" },
        len: [3, 50],
        isUppercase: true,
      },
    },
    value: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
      comment: "Redeem value (e.g., 100.00)",
    },
    maxRedeem: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Maximum number of redemptions (null = unlimited)",
    },
    currentRedeems: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Current number of redemptions",
    },
    expiry: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'expired'),
      defaultValue: 'active',
      allowNull: false,
    },
    ...commonFields,
  },
  {
    tableName: "redeem_codes",
    ...commonOptions,
    indexes: [
      {
        fields: ["code"],
        type: "BTREE",
        unique: true,
      },
      {
        fields: ["expiry"],
        type: "BTREE",
      },
      {
        fields: ["status"],
        type: "BTREE",
      },
      {
        fields: ["created_by"],
        type: "BTREE",
      }
    ],
  },
);

export default RedeemCode;