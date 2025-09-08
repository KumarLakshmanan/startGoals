// ===========================================================================================
// REDEEM CODE ROUTES
// Admin management for redeem codes with basic CRUD operations
// ===========================================================================================

import express from "express";
import {
  createRedeemCode,
  getRedeemCodeById,
  updateRedeemCode,
  deleteRedeemCode,
  getAllRedeemCodes,
  validateRedeemCode,
} from "../controller/redeemCodeController.js";
import { isAdmin, authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ===================== REDEEM CODE VALIDATION =====================

// Validate redeem code for redemption (Authenticated users)
router.post(
  "/validate",
  authenticateToken,
  validateRedeemCode,
);

// ===================== ADMIN REDEEM CODE MANAGEMENT =====================

// Create new redeem code (Admin only)
router.post(
  "/",
  isAdmin,
  createRedeemCode,
);

// Get all redeem codes (Admin only)
router.get(
  "/",
  isAdmin,
  getAllRedeemCodes,
);

// Get single redeem code by ID (Admin only)
router.get(
  "/:id",
  isAdmin,
  getRedeemCodeById,
);

// Update redeem code (Admin only)
router.put(
  "/:id",
  isAdmin,
  updateRedeemCode,
);

// Delete redeem code (Admin only)
router.delete(
  "/:id",
  isAdmin,
  deleteRedeemCode,
);

export default router;