import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const Wallet = sequelize.define(
  "Wallet",
  {
    walletId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.0,
      validate: {
        min: 0.0,
      },
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: "USD",
      validate: {
        isIn: [['USD', 'EUR', 'INR', 'GBP']]
      }
    },
    ...commonFields,
  },
  {
    tableName: "wallets",
    ...commonOptions,
  },
);

export default Wallet;
