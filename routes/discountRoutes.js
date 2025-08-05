// ===========================================================================================
// DISCOUNT ROUTES - UNIFIED
// Combined user-facing discount functionality with comprehensive admin management features
// Includes both public discount operations and advanced admin analytics
// ===========================================================================================

import express from "express";
import {
  createDiscountCode,
  getDiscountCodeById,
  updateDiscountCode,
  deleteDiscountCode,
  validateDiscountCode,
  getDiscountUsageStatistics,
  getAllDiscountCodesAdmin,
  getDiscountAnalytics,
} from "../controller/discountController.js";
import { isAdmin, authenticateToken } from "../middleware/authMiddleware.js";
import { validateSchema, discountValidation } from "../middleware/fieldValidation.js";

const router = express.Router();

// ===================== DISCOUNT CODE VALIDATION =====================

// Validate discount code for purchase (Authenticated users only)
router.post(
  "/validate",
  authenticateToken,
  validateSchema(discountValidation.validate),
  validateDiscountCode,
);

// ===================== DISCOUNT USAGE ANALYTICS =====================

// Get discount usage statistics (Admin only)
router.get(
  "/analytics/usage",
  isAdmin,
  validateSchema(discountValidation.analytics, "query"),
  getDiscountUsageStatistics,
);

// ===================== COMPREHENSIVE ADMIN MANAGEMENT ROUTES =====================

// Create new discount code (Admin only)
router.post(
  "/",
  isAdmin,
  validateSchema(discountValidation.create),
  createDiscountCode,
);

// Get all discount codes (Admin only) - this should come before /:id route
router.get(
  "/",
  isAdmin,
  validateSchema(discountValidation.filter, "query"),
  getAllDiscountCodesAdmin,
);

// Alternative endpoint for getting all discount codes
router.get(
  "/all",
  isAdmin,
  validateSchema(discountValidation.filter, "query"),
  getAllDiscountCodesAdmin,
);

// Alternative endpoint for creating discount codes (for admin panel)
router.post(
  "/admin",
  isAdmin,
  validateSchema(discountValidation.create),
  createDiscountCode,
);

// ===================== ADMIN DISCOUNT CODE MANAGEMENT =====================

// Get discount analytics for specific discount
router.get(
  "/:discountId/analytics",
  isAdmin,
  validateSchema(discountValidation.analytics, "query"),
  validateSchema(discountValidation.params, "params"),
  getDiscountAnalytics,
);

// Get single discount code by ID (Admin only)
router.get(
  "/:id",
  isAdmin,
  validateSchema(discountValidation.params, "params"),
  getDiscountCodeById,
);

// Update discount code (Admin only)
router.put(
  "/:id",
  isAdmin,
  validateSchema(discountValidation.params, "params"),
  validateSchema(discountValidation.update),
  updateDiscountCode,
);

// Delete discount code (Admin only)
router.delete(
  "/:id",
  isAdmin,
  validateSchema(discountValidation.params, "params"),
  deleteDiscountCode,
);

export default router;
