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
    body("shortDescription").optional().isLength({ max: 500 }).withMessage("Short description cannot exceed 500 characters"),
    body("price").isFloat({ min: 0 }).withMessage("Valid price is required"),
    body("categoryId").isUUID().withMessage("Valid category ID is required"),
    body("levelId").isUUID().withMessage("Valid level ID is required"),
    body("languageId").optional().isUUID().withMessage("Valid language ID is required"),
    body("techStack")
      .optional()
      .custom((value) => {
        if (typeof value === "string") value = JSON.parse(value);
        if (!Array.isArray(value)) throw new Error("Tech stack must be an array");
        return true;
      }),
    body("programmingLanguages")
      .optional()
      .custom((value) => {
        if (typeof value === "string") value = JSON.parse(value);
        if (!Array.isArray(value)) throw new Error("Programming languages must be an array");
        return true;
      }),
    body("goals")
      .optional()
      .custom((value) => {
        if (typeof value === "string") value = JSON.parse(value);
        if (!Array.isArray(value)) throw new Error("Goals must be an array");
        return true;
      }),
    body("requirements")
      .optional()
      .isString()
      .withMessage("Requirements must be a string"),
    body("features")
      .optional()
      .isString()
      .withMessage("Features must be a string"),
    body("whatYouGet")
      .optional()
      .isString()
      .withMessage("What you get must be a string"),
    body("supportIncluded")
      .optional()
      .isBoolean()
      .withMessage("Support included must be a boolean"),
    body("supportDuration")
      .optional()
      .default(0)
      .isInt({ min: 0 })
      .withMessage("Support duration must be a non-negative integer"),
    body("licenseType")
      .optional()
      .isIn(["personal", "commercial", "one_time", "unlimited"])
      .withMessage("Invalid license type"),
    body("status")
      .optional()
      .isIn(["draft", "published", "archived", "hidden", "rejected"])
      .withMessage("Invalid status"),
    body("version")
      .optional()
      .isString()
      .withMessage("Version must be a string"),
    body("discountEnabled")
      .optional()
      .isBoolean()
      .withMessage("Discount enabled must be a boolean"),
    body("demoUrl")
      .optional()
      .isString()
      .withMessage("Demo URL must be a string"),
    body("documentation")
      .optional()
      .isString()
      .withMessage("Documentation must be a string"),
    body("supportEmail")
      .optional()
      .isString()
      .withMessage("Support email must be a string"),
    body("linkedTeacherId")
      .optional()
      .isUUID()
      .withMessage("Linked teacher ID must be a valid UUID"),
    body("previewVideo")
      .optional()
      .isString()
      .withMessage("Preview video must be a string"),
    body("featured")
      .optional()
      .isBoolean()
      .withMessage("Featured must be a boolean"),
  ],
  validateInput,
  createProject,
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
      .custom((value) => {
        if (typeof value === "string") value = JSON.parse(value);
        if (!Array.isArray(value)) throw new Error("Tech stack must be an array");
        return true;
      }),
    body("programmingLanguages")
      .optional()
      .custom((value) => {
        if (typeof value === "string") value = JSON.parse(value);
        if (!Array.isArray(value)) throw new Error("Programming languages must be an array");
        return true;
      }),
    body("features")
      .optional()
      .custom((value) => {
        if (typeof value === "string") value = JSON.parse(value);
        if (!Array.isArray(value)) throw new Error("Features must be an array");
        return true;
      }),
    body("requirements")
      .optional()
      .custom((value) => {
        if (typeof value === "string") value = JSON.parse(value);
        if (!Array.isArray(value)) throw new Error("Requirements must be an array");
        return true;
      }),
    body("compatibility")
      .optional()
      .custom((value) => {
        if (typeof value === "string") value = JSON.parse(value);
        if (!Array.isArray(value)) throw new Error("Compatibility must be an array");
        return true;
      }),
    body("previewImages")
      .optional()
      .custom((value) => {
        if (typeof value === "string") value = JSON.parse(value);
        if (!Array.isArray(value)) throw new Error("Preview images must be an array");
        return true;
      }),
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
    body("version")
      .optional()
      .isString()
      .withMessage("Version must be a string"),
    body("discountEnabled")
      .optional()
      .isBoolean()
      .withMessage("Discount enabled must be a boolean"),
    body("demoUrl")
      .optional()
      .isString()
      .withMessage("Demo URL must be a string"),
    body("documentation")
      .optional()
      .isString()
      .withMessage("Documentation must be a string"),
    body("supportEmail")
      .optional()
      .isString()
      .withMessage("Support email must be a string"),
    body("linkedTeacherId")
      .optional()
      .isUUID()
      .withMessage("Linked teacher ID must be a valid UUID"),
    body("previewVideo")
      .optional()
      .isString()
      .withMessage("Preview video must be a string"),
    body("featured")
      .optional()
      .isBoolean()
      .withMessage("Featured must be a boolean"),
  ],
  validateInput,
  updateProject,
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

export default router;
