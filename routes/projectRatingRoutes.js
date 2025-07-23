import express from "express";
import {
  addProjectRating,
  getProjectRatings,
  updateProjectRating,
  deleteProjectRating,
  getUserProjectRatings,
  getAllRatingsForModeration,
  moderateProjectRating,
} from "../controller/projectRatingController.js";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import { validateInput } from "../middleware/validationMiddleware.js";
import { body, param, query } from "express-validator";

const router = express.Router();

// ===================== PROJECT RATING ROUTES =====================

// Add project rating (Purchased users only)
router.post(
  "/projects/:projectId/rating",
  authenticateToken,
  [
    param("projectId").isUUID().withMessage("Valid project ID is required"),
    body("rating")
      .isFloat({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("review")
      .optional()
      .isLength({ max: 1000 })
      .withMessage("Review must be under 1000 characters"),
  ],
  validateInput,
  addProjectRating,
);

// Get project ratings with pagination
router.get(
  "/projects/:projectId/ratings",
  [
    param("projectId").isUUID().withMessage("Valid project ID is required"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("rating")
      .optional()
      .isFloat({ min: 1, max: 5 })
      .withMessage("Rating filter must be between 1 and 5"),
    query("sortBy")
      .optional()
      .isIn(["createdAt", "rating", "helpful"])
      .withMessage("Invalid sort field"),
    query("sortOrder")
      .optional()
      .isIn(["ASC", "DESC"])
      .withMessage("Sort order must be ASC or DESC"),
  ],
  validateInput,
  getProjectRatings,
);

// Update project rating (User can update their own rating)
router.put(
  "/ratings/:ratingId",
  authenticateToken,
  [
    param("ratingId").isUUID().withMessage("Valid rating ID is required"),
    body("rating")
      .optional()
      .isFloat({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("review")
      .optional()
      .isLength({ max: 1000 })
      .withMessage("Review must be under 1000 characters"),
  ],
  validateInput,
  updateProjectRating,
);

// Delete project rating (User can delete their own rating, Admin can delete any)
router.delete(
  "/ratings/:ratingId",
  authenticateToken,
  [param("ratingId").isUUID().withMessage("Valid rating ID is required")],
  validateInput,
  deleteProjectRating,
);

// Get user's project ratings
router.get(
  "/my/ratings/projects",
  authenticateToken,
  [
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
  ],
  validateInput,
  getUserProjectRatings,
);

// ===================== ADMIN RATING MODERATION ROUTES =====================

// Get all ratings for moderation (Admin only)
router.get(
  "/admin/ratings/projects",
  authenticateToken,
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
      .isIn(["pending", "approved", "rejected", "all"])
      .withMessage("Invalid status"),
    query("projectId")
      .optional()
      .isUUID()
      .withMessage("Valid project ID is required"),
    query("sortBy")
      .optional()
      .isIn(["createdAt", "rating", "status"])
      .withMessage("Invalid sort field"),
    query("sortOrder")
      .optional()
      .isIn(["ASC", "DESC"])
      .withMessage("Sort order must be ASC or DESC"),
  ],
  validateInput,
  getAllRatingsForModeration,
);

// Moderate project rating (Admin only)
router.put(
  "/admin/ratings/projects/:ratingId/moderate",
  authenticateToken,
  isAdmin,
  [
    param("ratingId").isUUID().withMessage("Valid rating ID is required"),
    body("status")
      .isIn(["approved", "rejected", "pending", "hidden"])
      .withMessage("Status must be 'approved', 'rejected', 'pending', or 'hidden'"),
    body("moderationNotes")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Moderation notes must be under 500 characters"),
  ],
  validateInput,
  moderateProjectRating,
);

export default router;
