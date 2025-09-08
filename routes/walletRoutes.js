import express from "express";
import {
  getWalletBalance,
  addWalletBalance,
  applyRedeemCodeToWallet,
  adminCreditUserWallet,
  adminDebitUserWallet,
  getWalletTransactions,
} from "../controller/walletController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// All wallet routes require authentication
router.get("/balance", authenticateToken, getWalletBalance);
router.post("/add-balance", authenticateToken, addWalletBalance);
router.post("/apply-redeem-code", authenticateToken, applyRedeemCodeToWallet);
// Admin routes for managing user wallets
router.post("/admin/user/:userId/credit", authenticateToken, adminCreditUserWallet);
router.post("/admin/user/:userId/debit", authenticateToken, adminDebitUserWallet);
router.get("/transactions", authenticateToken, getWalletTransactions);

export default router;
