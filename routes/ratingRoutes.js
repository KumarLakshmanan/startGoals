// ===========================================================================================
// RATING & REVIEW ROUTES - UNIFIED
// Combined user-facing rating functionality with comprehensive admin review management
// Includes both public rating operations and advanced admin moderation tools
// ===========================================================================================

import express from "express";
import {
  rateCourse,
  getCourseRatings,
  rateInstructor,
  getInstructorRatings,
  markReviewHelpful,
  // Admin management functions
  getAllReviews,
  moderateReview,
  getReviewAnalytics,
} from "../controller/ratingController.js";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Course rating endpoints
router.post("/courses/:courseId", authenticateToken, rateCourse); // Rate a course
router.get("/courses/:courseId", getCourseRatings); // Get course ratings (public)

// Instructor rating endpoints
router.post("/instructors/:instructorId", authenticateToken, rateInstructor); // Rate an instructor
router.get("/instructors/:instructorId", getInstructorRatings); // Get instructor ratings (public)

// Review interaction endpoints
router.post("/helpful/:ratingId", authenticateToken, markReviewHelpful); // Mark review as helpful (authenticated users only)

// ===================== COMPREHENSIVE ADMIN REVIEW MANAGEMENT ROUTES =====================

/**
 * @route GET /api/admin/reviews
 * @desc Get all reviews with comprehensive filtering and moderation tools
 * @access Private (Super Admin, Course Manager, Project Manager)
 */
router.get("/admin/reviews", authenticateToken, isAdmin, getAllReviews);

/**
 * @route PUT /api/admin/reviews/:id/moderate
 * @desc Moderate a specific review (approve/reject/hide)
 * @access Private (Super Admin, Course Manager, Project Manager)
 */
router.put(
  "/admin/reviews/:id/moderate",
  authenticateToken,
  isAdmin,
  moderateReview,
);

/**
 * @route GET /api/admin/reviews/analytics
 * @desc Get review analytics and statistics
 * @access Private (Super Admin, Course Manager, Project Manager)
 */
router.get(
  "/admin/reviews/analytics",
  authenticateToken,
  isAdmin,
  getReviewAnalytics,
);

export default router;
