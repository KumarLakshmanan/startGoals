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
  getReviewAnalytics
} from "../controller/ratingController.js";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import { 
    courseRatingValidation, 
    instructorRatingValidation,
    validateSchema, 
    asyncErrorHandler 
} from "../middleware/fieldValidation.js";
import { 
    errorHandler, 
    successResponse 
} from "../middleware/standardErrorHandler.js";

const router = express.Router();

// Course rating endpoints
router.post("/courses/:courseId", 
    authenticateToken, 
    validateSchema(courseRatingValidation.rate),
    asyncErrorHandler(rateCourse)
);
router.get("/courses/:courseId", 
    validateSchema(courseRatingValidation.filter, 'query'),
    asyncErrorHandler(getCourseRatings)
);

// Instructor rating endpoints
router.post("/instructors/:instructorId", 
    authenticateToken, 
    validateSchema(instructorRatingValidation.rate),
    asyncErrorHandler(rateInstructor)
);
router.get("/instructors/:instructorId", 
    validateSchema(instructorRatingValidation.filter, 'query'),
    asyncErrorHandler(getInstructorRatings)
);

// Review interaction endpoints
router.post("/helpful/:ratingId", authenticateToken, markReviewHelpful); // Mark review as helpful (authenticated users only)

// ===================== COMPREHENSIVE ADMIN REVIEW MANAGEMENT ROUTES =====================

/**
 * @route GET /api/admin/reviews
 * @desc Get all reviews with comprehensive filtering and moderation tools
 * @access Private (Super Admin, Course Manager, Project Manager)
 */
router.get(
  "/admin/reviews",
  authenticateToken,
  isAdmin,
  getAllReviews
);

/**
 * @route PUT /api/admin/reviews/:id/moderate
 * @desc Moderate a specific review (approve/reject/hide)
 * @access Private (Super Admin, Course Manager, Project Manager)
 */
router.put(
  "/admin/reviews/:id/moderate",
  authenticateToken,
  isAdmin,
  moderateReview
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
  getReviewAnalytics
);

export default router;
