// ===========================================================================================
// PROJECT ROUTES - UNIFIED
// Combined user-facing project functionality with comprehensive admin management features
// Includes both public project operations and advanced admin analytics
// ===========================================================================================

import express from "express";
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  initiateProjectPurchase,
  completeProjectPurchase,
  getUserPurchases,
  getProjectStatistics,
  // Admin management functions
  getAllProjectsAdmin,
  getProjectDetailsAdmin,
  getProjectBuyers,
  getProjectDownloads,
  updateProjectStatus,
  bulkUpdateProjectStatus,
  getProjectReviews,
  updateReviewStatus,
  bulkUpdateReviewStatus,
  getProjectSettings,
  updateProjectSettings,
} from "../controller/projectController.js";
import { isAdmin, verifyToken } from "../middleware/authMiddleware.js";
import { validateInput } from "../middleware/validationMiddleware.js";
import { body, param, query } from "express-validator";

const router = express.Router();

// ===================== PROJECT MANAGEMENT ROUTES =====================

// Create new project (Admin only)
router.post(
  "/create",
  isAdmin,
  [
    body("title").notEmpty().withMessage("Title is required"),
    body("description").notEmpty().withMessage("Description is required"),
    body("price").isFloat({ min: 0 }).withMessage("Valid price is required"),
    body("categoryId").isUUID().withMessage("Valid category ID is required"),
    body("techStack")
      .optional()
      .isArray()
      .withMessage("Tech stack must be an array"),
    body("programmingLanguages")
      .optional()
      .isArray()
      .withMessage("Programming languages must be an array"),
    body("features")
      .optional()
      .isArray()
      .withMessage("Features must be an array"),
    body("requirements")
      .optional()
      .isArray()
      .withMessage("Requirements must be an array"),
    body("compatibility")
      .optional()
      .isArray()
      .withMessage("Compatibility must be an array"),
    body("previewImages")
      .optional()
      .isArray()
      .withMessage("Preview images must be an array"),
    body("difficulty")
      .optional()
      .isIn(["beginner", "intermediate", "advanced"])
      .withMessage("Invalid difficulty level"),
    body("license")
      .optional()
      .isIn(["Regular License", "Extended License"])
      .withMessage("Invalid license type"),
    body("estimatedTime")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Estimated time must be a positive integer"),
  ],
  validateInput,
  createProject,
);

// Get all projects with filtering (Public)
router.get(
  "/getAll",
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("minPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Min price must be non-negative"),
    query("maxPrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Max price must be non-negative"),
    query("sortBy")
      .optional()
      .isIn([
        "createdAt",
        "price",
        "title",
        "views",
        "totalSales",
        "averageRating",
      ])
      .withMessage("Invalid sort field"),
    query("sortOrder")
      .optional()
      .isIn(["ASC", "DESC"])
      .withMessage("Sort order must be ASC or DESC"),
    query("status")
      .optional()
      .isIn(["published", "draft", "inactive", "all"])
      .withMessage("Invalid status"),
    query("difficulty")
      .optional()
      .isIn(["beginner", "intermediate", "advanced"])
      .withMessage("Invalid difficulty level"),
  ],
  validateInput,
  getAllProjects,
);

// Get single project by ID (Public)
router.get(
  "/get/:id",
  [param("id").isUUID().withMessage("Valid project ID is required")],
  validateInput,
  getProjectById,
);

// Update project (Creator only)
router.put(
  "/update/:id",
  isAdmin, // Add authentication
  [
    param("id").isUUID().withMessage("Valid project ID is required"),
    body("title").optional().notEmpty().withMessage("Title cannot be empty"),
    body("description")
      .optional()
      .notEmpty()
      .withMessage("Description cannot be empty"),
    body("price")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Valid price is required"),
    body("salePrice")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Valid sale price is required"),
    body("categoryId")
      .optional()
      .isUUID()
      .withMessage("Valid category ID is required"),
    body("techStack")
      .optional()
      .isArray()
      .withMessage("Tech stack must be an array"),
    body("programmingLanguages")
      .optional()
      .isArray()
      .withMessage("Programming languages must be an array"),
    body("features")
      .optional()
      .isArray()
      .withMessage("Features must be an array"),
    body("requirements")
      .optional()
      .isArray()
      .withMessage("Requirements must be an array"),
    body("compatibility")
      .optional()
      .isArray()
      .withMessage("Compatibility must be an array"),
    body("previewImages")
      .optional()
      .isArray()
      .withMessage("Preview images must be an array"),
    body("difficulty")
      .optional()
      .isIn(["beginner", "intermediate", "advanced"])
      .withMessage("Invalid difficulty level"),
    body("license")
      .optional()
      .isIn(["Regular License", "Extended License"])
      .withMessage("Invalid license type"),
    body("status")
      .optional()
      .isIn(["draft", "published", "inactive"])
      .withMessage("Invalid status"),
    body("estimatedTime")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Estimated time must be a positive integer"),
  ],
  validateInput,
  updateProject,
);

// Delete project (Creator only)
router.delete(
  "/delete/:id",
  isAdmin, // Add authentication
  [param("id").isUUID().withMessage("Valid project ID is required")],
  validateInput,
  deleteProject,
);

// ===================== PROJECT PURCHASE ROUTES =====================

// Initiate project purchase (Authenticated users only)
router.post(
  "/purchase",
  verifyToken, // Add authentication for purchase
  [
    body("projectId").isUUID().withMessage("Valid project ID is required"),
    body("discountCode")
      .optional()
      .isString()
      .withMessage("Discount code must be a string"),
  ],
  validateInput,
  initiateProjectPurchase,
);

// Complete project purchase (webhook endpoint)
router.post(
  "/purchase/complete",
  [
    body("purchaseId").isUUID().withMessage("Valid purchase ID is required"),
    body("paymentId").notEmpty().withMessage("Payment ID is required"),
    body("paymentStatus")
      .isIn(["completed", "failed", "cancelled"])
      .withMessage("Invalid payment status"),
  ],
  validateInput,
  completeProjectPurchase,
);

// Get user's purchased projects (Authenticated users only)
router.get(
  "/purchases/my",
  verifyToken, // Add authentication for user purchases
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("status")
      .optional()
      .isIn(["pending", "completed", "failed", "cancelled"])
      .withMessage("Invalid status"),
  ],
  validateInput,
  getUserPurchases,
);

// ===================== ADMIN STATISTICS ROUTES =====================

// Get project statistics (Admin only)
router.get(
  "/statistics",
  isAdmin,
  [
    query("period")
      .optional()
      .isIn(["7d", "30d", "90d", "1y"])
      .withMessage("Invalid period"),
  ],
  validateInput,
  getProjectStatistics,
);

// ===================== ADMIN PANEL PROJECT MANAGEMENT ROUTES =====================

/**
 * @route GET /admin/projects
 * @desc Get all projects for admin panel with detailed information
 * @access Private (Admin)
 */
router.get(
  "/admin/all",
  verifyToken,
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
      .isString()
      .withMessage("Status must be a string"),
    query("sortBy")
      .optional()
      .isString()
      .withMessage("SortBy must be a string"),
    query("sortOrder")
      .optional()
      .isIn(["ASC", "DESC"])
      .withMessage("SortOrder must be ASC or DESC"),
  ],
  validateInput,
  getAllProjectsAdmin,
);

/**
 * @route GET /admin/projects/:id
 * @desc Get detailed project information for admin panel
 * @access Private (Admin)
 */
router.get(
  "/admin/:id",
  verifyToken,
  isAdmin,
  param("id").isUUID().withMessage("Invalid project ID"),
  validateInput,
  getProjectDetailsAdmin,
);

/**
 * @route GET /admin/projects/:id/buyers
 * @desc Get all buyers of a specific project
 * @access Private (Admin)
 */
router.get(
  "/admin/:id/buyers",
  verifyToken,
  isAdmin,
  param("id").isUUID().withMessage("Invalid project ID"),
  validateInput,
  getProjectBuyers,
);

/**
 * @route GET /admin/projects/:id/downloads
 * @desc Get download statistics for a specific project
 * @access Private (Admin)
 */
router.get(
  "/admin/:id/downloads",
  verifyToken,
  isAdmin,
  param("id").isUUID().withMessage("Invalid project ID"),
  validateInput,
  getProjectDownloads,
);

/**
 * @route PATCH /admin/projects/:id/status
 * @desc Update project status (publish/hide/archive)
 * @access Private (Admin)
 */
router.patch(
  "/admin/:id/status",
  verifyToken,
  isAdmin,
  [
    param("id").isUUID().withMessage("Invalid project ID"),
    body("status")
      .isIn(["draft", "published", "archived", "hidden", "rejected"])
      .withMessage("Invalid status"),
  ],
  validateInput,
  updateProjectStatus,
);

/**
 * @route POST /admin/projects/bulk-status
 * @desc Bulk update project statuses
 * @access Private (Admin)
 */
router.post(
  "/admin/bulk-status",
  verifyToken,
  isAdmin,
  [
    body("projectIds").isArray().withMessage("Project IDs must be an array"),
    body("status")
      .isIn(["draft", "published", "archived", "hidden", "rejected"])
      .withMessage("Invalid status"),
  ],
  validateInput,
  bulkUpdateProjectStatus,
);

/**
 * @route GET /admin/projects/reviews
 * @desc Get project reviews for admin moderation
 * @access Private (Admin)
 */
router.get(
  "/admin/reviews",
  verifyToken,
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
      .isString()
      .withMessage("Status must be a string"),
    query("sortBy")
      .optional()
      .isString()
      .withMessage("SortBy must be a string"),
    query("sortOrder")
      .optional()
      .isIn(["ASC", "DESC"])
      .withMessage("SortOrder must be ASC or DESC"),
  ],
  validateInput,
  getProjectReviews,
);

/**
 * @route PATCH /admin/projects/reviews/:id/status
 * @desc Update review moderation status
 * @access Private (Admin)
 */
router.patch(
  "/admin/reviews/:id/status",
  verifyToken,
  isAdmin,
  [
    param("id").isUUID().withMessage("Invalid review ID"),
    body("status")
      .isIn(["pending", "approved", "rejected", "hidden"])
      .withMessage("Invalid status"),
  ],
  validateInput,
  updateReviewStatus,
);

/**
 * @route POST /admin/projects/reviews/bulk-status
 * @desc Bulk update review statuses
 * @access Private (Admin)
 */
router.post(
  "/admin/reviews/bulk-status",
  verifyToken,
  isAdmin,
  [
    body("reviewIds").isArray().withMessage("Review IDs must be an array"),
    body("status")
      .isIn(["pending", "approved", "rejected", "hidden"])
      .withMessage("Invalid status"),
  ],
  validateInput,
  bulkUpdateReviewStatus,
);

/**
 * @route GET /admin/projects/settings
 * @desc Get project settings
 * @access Private (Admin)
 */
router.get(
  "/admin/settings",
  verifyToken,
  isAdmin,
  getProjectSettings,
);

/**
 * @route PUT /admin/projects/settings
 * @desc Update project settings
 * @access Private (Admin)
 */
router.put(
  "/admin/settings",
  verifyToken,
  isAdmin,
  [
    body("globalDownloadLimit")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Global download limit must be a positive integer"),
    body("enableRatings")
      .optional()
      .isBoolean()
      .withMessage("Enable ratings must be a boolean"),
    body("enableReviewModeration")
      .optional()
      .isBoolean()
      .withMessage("Enable review moderation must be a boolean"),
    body("defaultLicenseType")
      .optional()
      .isIn(["personal", "commercial", "one_time", "unlimited"])
      .withMessage("Invalid license type"),
    body("autoEmailPurchaseConfirmation")
      .optional()
      .isBoolean()
      .withMessage("Auto email purchase confirmation must be a boolean"),
    body("priceBrackets")
      .optional()
      .isArray()
      .withMessage("Price brackets must be an array"),
  ],
  validateInput,
  updateProjectSettings,
);

export default router;
