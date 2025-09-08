// ===================== WALLET & REDEEM CODE ASSOCIATIONS =====================

import Wallet from "../wallet.js";
import WalletTransaction from "../walletTransaction.js";
import User from "../user.js";
import RedeemCode from "../redeemCode.js";

// Wallet associations
User.hasOne(Wallet, {
  foreignKey: "userId",
  as: "wallet",
  onDelete: "CASCADE",
});

Wallet.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Wallet.hasMany(WalletTransaction, {
  foreignKey: "walletId",
  as: "transactions",
  onDelete: "CASCADE",
});

WalletTransaction.belongsTo(Wallet, {
  foreignKey: "walletId",
  as: "wallet",
});

WalletTransaction.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// RedeemCode associations
User.hasMany(RedeemCode, {
  foreignKey: "createdBy",
  as: "createdRedeemCodes",
  onDelete: "SET NULL",
});

RedeemCode.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

export { Wallet, WalletTransaction, User, RedeemCode };