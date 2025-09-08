import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const WalletTransaction = sequelize.define(
  "WalletTransaction",
  {
    transactionId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    walletId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "wallets",
        key: "wallet_id",
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
    type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['credit', 'debit', 'coupon', 'refund', 'purchase']]
      }
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        min: 0.0,
      },
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    referenceId: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: "Reference to related entity (coupon, order, etc.)",
    },
    referenceType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      validate: {
        isIn: [['coupon', 'order', 'refund', 'bonus']]
      }
    },
    balanceBefore: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    ...commonFields,
  },
  {
    tableName: "wallet_transactions",
    ...commonOptions,
  },
);

export default WalletTransaction;
