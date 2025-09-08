import Wallet from "../model/wallet.js";
import WalletTransaction from "../model/walletTransaction.js";
import RedeemCode from "../model/redeemCode.js";
import sequelize from "../config/db.js";

export const getOrCreateWallet = async (userId) => {
  let wallet = await Wallet.findOne({ where: { userId } });
  if (!wallet) {
    wallet = await Wallet.create({ userId });
  }
  return wallet;
};

export const getWalletBalance = async (req, res) => {
  try {
    const userId = req.user.userId;

    const wallet = await getOrCreateWallet(userId);

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
      },
    });
  } catch (error) {
    console.error("Error fetching wallet balance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wallet balance",
      error: error.message,
    });
  }
};

export const addWalletBalance = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, description, type = "credit" } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const wallet = await getOrCreateWallet(userId);
    const balanceBefore = wallet.balance;

    let newBalance;
    if (type === "credit") {
      newBalance = parseFloat(balanceBefore) + parseFloat(amount);
    } else {
      newBalance = parseFloat(balanceBefore) - parseFloat(amount);
      if (newBalance < 0) {
        return res.status(400).json({
          success: false,
          message: "Insufficient wallet balance",
        });
      }
    }

    await wallet.update({ balance: newBalance });

    // Create transaction record
    await WalletTransaction.create({
      walletId: wallet.walletId,
      userId,
      type,
      amount,
      description: description || `${type === "credit" ? "Added" : "Deducted"} ${amount} to wallet`,
      balanceBefore,
      balanceAfter: newBalance,
      referenceType: "manual",
    });

    res.json({
      success: true,
      message: `Wallet ${type === "credit" ? "credited" : "debited"} successfully`,
      data: {
        balance: newBalance,
        currency: wallet.currency,
      },
    });
  } catch (error) {
    console.error("Error updating wallet balance:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update wallet balance",
      error: error.message,
    });
  }
};

export const applyRedeemCodeToWallet = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const userId = req.user.userId;
    const { redeemCode: code } = req.body;

    if (!code) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Redeem code is required",
      });
    }

    // Find and validate redeem code
    const redeemCode = await RedeemCode.findOne({
      where: {
        code: code.toUpperCase(),
        status: 'active',
        expiry: { [sequelize.Op.gte]: new Date() },
      },
      transaction,
    });

    if (!redeemCode) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid or expired redeem code",
      });
    }

    // Check usage limits
    if (redeemCode.maxRedeem && redeemCode.currentRedeems >= redeemCode.maxRedeem) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Redeem code usage limit exceeded",
      });
    }

    // Get or create wallet
    const wallet = await getOrCreateWallet(userId);
    const balanceBefore = wallet.balance;
    const newBalance = parseFloat(balanceBefore) + parseFloat(redeemCode.value);

    // Update wallet balance
    await wallet.update({ balance: newBalance }, { transaction });

    // Update redeem code usage count
    await redeemCode.update(
      { currentRedeems: redeemCode.currentRedeems + 1 },
      { transaction }
    );

    // Create transaction record
    await WalletTransaction.create({
      walletId: wallet.walletId,
      userId,
      type: "redeem_code",
      amount: redeemCode.value,
      description: `Redeem code ${code} applied`,
      balanceBefore,
      balanceAfter: newBalance,
      referenceType: "redeem_code",
      referenceId: redeemCode.redeemCodeId,
    }, { transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: `Redeem code applied successfully. ₹${redeemCode.value} added to wallet.`,
      data: {
        balance: newBalance,
        currency: wallet.currency,
        redeemValue: redeemCode.value,
        redeemCode: code,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error applying redeem code:", error);
    res.status(500).json({
      success: false,
      message: "Failed to apply redeem code",
      error: error.message,
    });
  }
};

export const getWalletTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      page = 1,
      limit = 10,
      type,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { userId };

    if (type) {
      whereClause.type = type;
    }

    const wallet = await getOrCreateWallet(userId);

    const { count, rows } = await WalletTransaction.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    res.json({
      success: true,
      data: {
        wallet: {
          balance: wallet.balance,
          currency: wallet.currency,
        },
        transactions: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching wallet transactions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch wallet transactions",
      error: error.message,
    });
  }
};

export const deductFromWallet = async (userId, amount, description, referenceType, referenceId) => {
  const wallet = await getOrCreateWallet(userId);
  const balanceBefore = wallet.balance;

  if (parseFloat(balanceBefore) < parseFloat(amount)) {
    throw new Error("Insufficient wallet balance");
  }

  const newBalance = parseFloat(balanceBefore) - parseFloat(amount);

  await wallet.update({ balance: newBalance });

  // Create transaction record
  await WalletTransaction.create({
    walletId: wallet.walletId,
    userId,
    type: "debit",
    amount,
    description: description || `Deducted ${amount} from wallet`,
    balanceBefore,
    balanceAfter: newBalance,
    referenceType,
    referenceId,
  });

  return { newBalance, wallet };
};

// Admin functions for managing user wallets
export const adminCreditUserWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const wallet = await getOrCreateWallet(userId);
    const balanceBefore = wallet.balance;
    const newBalance = parseFloat(balanceBefore) + parseFloat(amount);

    await wallet.update({ balance: newBalance });

    // Create transaction record
    await WalletTransaction.create({
      walletId: wallet.walletId,
      userId,
      type: "credit",
      amount,
      description: description || `Admin credited ${amount} to wallet`,
      balanceBefore,
      balanceAfter: newBalance,
      referenceType: "admin_credit",
    });

    res.json({
      success: true,
      message: `Successfully credited ₹${amount} to user wallet`,
      data: {
        balance: newBalance,
        currency: wallet.currency,
        creditedAmount: amount,
      },
    });
  } catch (error) {
    console.error("Error crediting user wallet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to credit user wallet",
      error: error.message,
    });
  }
};

export const adminDebitUserWallet = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amount, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
      });
    }

    const wallet = await getOrCreateWallet(userId);
    const balanceBefore = wallet.balance;

    if (parseFloat(balanceBefore) < parseFloat(amount)) {
      return res.status(400).json({
        success: false,
        message: "Insufficient wallet balance",
      });
    }

    const newBalance = parseFloat(balanceBefore) - parseFloat(amount);

    await wallet.update({ balance: newBalance });

    // Create transaction record
    await WalletTransaction.create({
      walletId: wallet.walletId,
      userId,
      type: "debit",
      amount,
      description: description || `Admin debited ${amount} from wallet`,
      balanceBefore,
      balanceAfter: newBalance,
      referenceType: "admin_debit",
    });

    res.json({
      success: true,
      message: `Successfully debited ₹${amount} from user wallet`,
      data: {
        balance: newBalance,
        currency: wallet.currency,
        debitedAmount: amount,
      },
    });
  } catch (error) {
    console.error("Error debiting user wallet:", error);
    res.status(500).json({
      success: false,
      message: "Failed to debit user wallet",
      error: error.message,
    });
  }
};
