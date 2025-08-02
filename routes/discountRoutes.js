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
import validateInput from "../middleware/validateInput.js";
import { body, param, query } from "express-validator";
import { isAdmin, authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ===================== ADMIN DISCOUNT CODE MANAGEMENT =====================

// Get single discount code by ID (Admin only)
router.get(
  "/:id",
  isAdmin,
  [param("id").isInt().withMessage("Valid discount code ID is required")],
  getDiscountCodeById,
);

// Update discount code (Admin only)
router.put(
  "/:id",
  isAdmin,
  [
    param("id").isInt().withMessage("Valid discount code ID is required"),
    body("code")
      .optional()
      .isLength({ min: 3, max: 20 })
      .withMessage("Code must be 3-20 characters"),
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description must be under 500 characters"),
    body("discountType")
      .optional()
      .isIn(["percentage", "fixed"])
      .withMessage("Discount type must be 'percentage' or 'fixed'"),
    body("discountValue")
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage("Discount value must be greater than 0"),
    body("applicableType")
      .optional()
      .isIn(["course", "project", "both"])
      .withMessage("Applicable type must be 'course', 'project', or 'both'"),
    body("minPurchaseAmount")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Min purchase amount must be non-negative"),
    body("maxUses")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Max uses must be a positive integer"),
    body("maxUsesPerUser")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Max uses per user must be a positive integer"),
    body("validFrom")
      .optional()
      .isISO8601()
      .withMessage("Valid from date must be a valid ISO 8601 date"),
    body("validUntil")
      .optional()
      .isISO8601()
      .withMessage("Valid until date must be a valid ISO 8601 date"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Is active must be a boolean"),
  ],
  updateDiscountCode,
);

// Delete discount code (Admin only)
router.delete(
  "/:id",
  isAdmin,
  [param("id").isInt().withMessage("Valid discount code ID is required")],
  deleteDiscountCode,
);

// ===================== DISCOUNT CODE VALIDATION =====================

// Validate discount code for purchase (Authenticated users only)
router.post(
  "/validate",
  authenticateToken, // Add authentication
  [
    body("code").notEmpty().withMessage("Discount code is required"),
    body("amount")
      .isFloat({ min: 0.01 })
      .withMessage("Valid amount is required"),
  ],
  validateDiscountCode,
);

// ===================== DISCOUNT USAGE ANALYTICS =====================

// Get discount usage statistics (Admin only)
router.get(
  "/analytics/usage",
  isAdmin,
  [
    query("period")
      .optional()
      .isIn(["7d", "30d", "90d", "1y"])
      .withMessage("Invalid period"),
    query("discountCodeId")
      .optional()
      .isInt()
      .withMessage("Valid discount code ID is required"),
  ],
  getDiscountUsageStatistics,
);

// ===================== COMPREHENSIVE ADMIN MANAGEMENT ROUTES =====================

/**
 * @route GET /api/admin/discounts
 * @desc Get all discount codes with advanced filtering and analytics
 * @access Private (Super Admin, Payment Manager)
 */
router.get(
  "/all",
  isAdmin,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("status")
      .optional()
      .isIn(["active", "inactive", "expired", "scheduled", "usage_exhausted"])
      .withMessage("Invalid status"),
    query("discountType")
      .optional()
      .isIn(["percentage", "fixed"])
      .withMessage("Invalid discount type"),
    query("search")
      .optional()
      .isLength({ max: 100 })
      .withMessage("Search query too long"),
    query("dateRange")
      .optional()
      .isJSON()
      .withMessage("Date range must be valid JSON"),
  ],
  getAllDiscountCodesAdmin,
);

/**
 * @route GET /api/admin/discounts/:discountId/analytics
 * @desc Get detailed discount analytics
 * @access Private (Super Admin, Payment Manager)
 */
router.get(
  "/:discountId/analytics",
  isAdmin,
  [
    param("discountId").isInt().withMessage("Valid discount ID is required"),
    query("period")
      .optional()
      .isIn(["7d", "30d", "90d", "1y"])
      .withMessage("Invalid period"),
    query("groupBy")
      .optional()
      .isIn(["day", "week", "month"])
      .withMessage("Invalid groupBy value"),
  ],
  getDiscountAnalytics,
);


// Create new discount code (Admin only)
router.post(
  "/",
  isAdmin,
  [
    body("code")
      .notEmpty()
      .isLength({ min: 3, max: 20 })
      .withMessage("Code must be 3-20 characters"),
    body("description")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Description must be under 500 characters"),
    body("discountType")
      .isIn(["percentage", "fixed"])
      .withMessage("Discount type must be 'percentage' or 'fixed'"),
    body("discountValue")
      .isFloat({ min: 0.01 })
      .withMessage("Discount value must be greater than 0"),
    body("applicableType")
      .isIn(["course", "project", "both"])
      .withMessage("Applicable type must be 'course', 'project', or 'both'"),
    body("minPurchaseAmount")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Min purchase amount must be non-negative"),
    body("maxUses")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Max uses must be a positive integer"),
    body("maxUsesPerUser")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Max uses per user must be a positive integer"),
    body("validFrom")
      .isISO8601()
      .withMessage("Valid from date must be a valid ISO 8601 date"),
    body("validUntil")
      .isISO8601()
      .withMessage("Valid until date must be a valid ISO 8601 date"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("Is active must be a boolean"),
  ],
  createDiscountCode,
);

// Get all discount codes (Admin only)
router.get(
  "/",
  isAdmin,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),
    query("status")
      .optional()
      .isIn(["active", "inactive", "expired", "scheduled"])
      .withMessage("Invalid status"),
    query("applicableType")
      .optional()
      .isIn(["course", "project", "both"])
      .withMessage("Invalid applicable type"),
    query("sortBy")
      .optional()
      .isIn(["createdAt", "code", "validFrom", "validUntil", "currentUses"])
      .withMessage("Invalid sort field"),
    query("sortOrder")
      .optional()
      .isIn(["ASC", "DESC"])
      .withMessage("Sort order must be ASC or DESC"),
  ],
  getAllDiscountCodesAdmin,
);

export default router;
