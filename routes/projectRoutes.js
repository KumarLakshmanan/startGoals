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
    applyDiscountToProject
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
        body("categoryId").isInt().withMessage("Valid category ID is required"),
        body("techStack").optional().isArray().withMessage("Tech stack must be an array"),
        body("programmingLanguages").optional().isArray().withMessage("Programming languages must be an array"),
        body("features").optional().isArray().withMessage("Features must be an array"),
        body("requirements").optional().isArray().withMessage("Requirements must be an array"),
        body("compatibility").optional().isArray().withMessage("Compatibility must be an array"),
        body("previewImages").optional().isArray().withMessage("Preview images must be an array"),
        body("difficulty").optional().isIn(["beginner", "intermediate", "advanced"]).withMessage("Invalid difficulty level"),
        body("license").optional().isIn(["Regular License", "Extended License"]).withMessage("Invalid license type"),
        body("estimatedTime").optional().isInt({ min: 1 }).withMessage("Estimated time must be a positive integer")
    ],
    validateInput,
    createProject
);

// Get all projects with filtering (Public)
router.get(
    "/getAll",
    [
        query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
        query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
        query("minPrice").optional().isFloat({ min: 0 }).withMessage("Min price must be non-negative"),
        query("maxPrice").optional().isFloat({ min: 0 }).withMessage("Max price must be non-negative"),
        query("sortBy").optional().isIn(["createdAt", "price", "title", "views", "totalSales", "averageRating"]).withMessage("Invalid sort field"),
        query("sortOrder").optional().isIn(["ASC", "DESC"]).withMessage("Sort order must be ASC or DESC"),
        query("status").optional().isIn(["published", "draft", "inactive", "all"]).withMessage("Invalid status"),
        query("difficulty").optional().isIn(["beginner", "intermediate", "advanced"]).withMessage("Invalid difficulty level")
    ],
    validateInput,
    getAllProjects
);

// Get single project by ID (Public)
router.get(
    "/get/:id",
    [
        param("id").isInt().withMessage("Valid project ID is required")
    ],
    validateInput,
    getProjectById
);

// Update project (Admin/Creator only)
router.put(
    "/update/:id",
    isAdmin, // Add authentication
    [
        param("id").isInt().withMessage("Valid project ID is required"),
        body("title").optional().notEmpty().withMessage("Title cannot be empty"),
        body("description").optional().notEmpty().withMessage("Description cannot be empty"),
        body("price").optional().isFloat({ min: 0 }).withMessage("Valid price is required"),
        body("salePrice").optional().isFloat({ min: 0 }).withMessage("Valid sale price is required"),
        body("categoryId").optional().isInt().withMessage("Valid category ID is required"),
        body("techStack").optional().isArray().withMessage("Tech stack must be an array"),
        body("programmingLanguages").optional().isArray().withMessage("Programming languages must be an array"),
        body("features").optional().isArray().withMessage("Features must be an array"),
        body("requirements").optional().isArray().withMessage("Requirements must be an array"),
        body("compatibility").optional().isArray().withMessage("Compatibility must be an array"),
        body("previewImages").optional().isArray().withMessage("Preview images must be an array"),
        body("difficulty").optional().isIn(["beginner", "intermediate", "advanced"]).withMessage("Invalid difficulty level"),
        body("license").optional().isIn(["Regular License", "Extended License"]).withMessage("Invalid license type"),
        body("status").optional().isIn(["draft", "published", "inactive"]).withMessage("Invalid status"),
        body("estimatedTime").optional().isInt({ min: 1 }).withMessage("Estimated time must be a positive integer")
    ],
    validateInput,
    updateProject
);

// Delete project (Admin/Creator only)
router.delete(
    "/delete/:id",
    isAdmin, // Add authentication
    [
        param("id").isInt().withMessage("Valid project ID is required")
    ],
    validateInput,
    deleteProject
);

// ===================== PROJECT PURCHASE ROUTES =====================

// Initiate project purchase (Authenticated users only)
router.post(
    "/purchase",
    verifyToken, // Add authentication for purchase
    [
        body("projectId").isInt().withMessage("Valid project ID is required"),
        body("discountCode").optional().isString().withMessage("Discount code must be a string")
    ],
    validateInput,
    initiateProjectPurchase
);

// Complete project purchase (webhook endpoint)
router.post(
    "/purchase/complete",
    [
        body("purchaseId").isInt().withMessage("Valid purchase ID is required"),
        body("paymentId").notEmpty().withMessage("Payment ID is required"),
        body("paymentStatus").isIn(["completed", "failed", "cancelled"]).withMessage("Invalid payment status")
    ],
    validateInput,
    completeProjectPurchase
);

// Get user's purchased projects (Authenticated users only)
router.get(
    "/purchases/my",
    verifyToken, // Add authentication for user purchases
    [
        query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
        query("limit").optional().isInt({ min: 1, max: 50 }).withMessage("Limit must be between 1 and 50"),
        query("status").optional().isIn(["pending", "completed", "failed", "cancelled"]).withMessage("Invalid status")
    ],
    validateInput,
    getUserPurchases
);

// ===================== ADMIN STATISTICS ROUTES =====================

// Get project statistics (Admin only)
router.get(
    "/admin/statistics",
    isAdmin,
    [
        query("period").optional().isIn(["7d", "30d", "90d", "1y"]).withMessage("Invalid period")
    ],
    validateInput,
    getProjectStatistics
);

// ===================== COMPREHENSIVE ADMIN MANAGEMENT ROUTES =====================

/**
 * @route GET /api/admin/projects
 * @desc Get all projects with comprehensive analytics and filtering
 * @access Private (Super Admin, Project Manager, Course Manager)
 */
router.get(
    "/admin/projects",
    verifyToken,
    isAdmin,
    getAllProjectsAdmin
);

/**
 * @route GET /api/admin/projects/:projectId
 * @desc Get detailed project information with analytics
 * @access Private (Super Admin, Project Manager, Course Manager)
 */
router.get(
    "/admin/projects/:projectId",
    verifyToken,
    isAdmin,
    getProjectDetailsAdmin
);

/**
 * @route GET /api/admin/projects/:projectId/buyers
 * @desc View project buyer history and analytics
 * @access Private (Super Admin, Project Manager, Payment Manager)
 */
router.get(
    "/admin/projects/:projectId/buyers",
    verifyToken,
    isAdmin,
    getProjectBuyers
);

/**
 * @route GET /api/admin/projects/:projectId/downloads
 * @desc Track project downloads and file statistics
 * @access Private (Super Admin, Project Manager)
 */
router.get(
    "/admin/projects/:projectId/downloads",
    verifyToken,
    isAdmin,
    getProjectDownloads
);

/**
 * @route POST /api/admin/projects/:projectId/apply-discount
 * @desc Apply discount codes to projects
 * @access Private (Super Admin, Project Manager, Payment Manager)
 */
router.post(
    "/admin/projects/:projectId/apply-discount",
    verifyToken,
    isAdmin,
    applyDiscountToProject
);

export default router;
