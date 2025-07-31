// ===========================================================================================
// COMPREHENSIVE RATING & REVIEW ROUTES
// All rating endpoints for courses, projects, and instructors
// Includes stats, reviews, helpful votes, and CRUD operations
// ===========================================================================================

import express from "express";
import {
  // Generic endpoints (new structure)
  getRatingsStats,
  getReviews,
  createReview,
  getMyRatings,
  getMySpecificRating,
  markReviewHelpful,
  markReviewNotHelpful,
  updateReview,
  deleteReview,
  
  // Legacy compatibility endpoints
  getCourseRatingsStats,
  getCourseReviews,
  createCourseReview,
  getProjectRatingsStats,
  getProjectReviews,
  createProjectReview,
  getInstructorRatingsStats,
  getInstructorReviews,
  createInstructorReview
} from "../controller/ratingController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// ===========================================================================================
// GENERIC RATING ENDPOINTS (NEW STRUCTURE)
// ===========================================================================================

/**
 * @route GET /api/ratings/:entityType/:entityId/stats
 * @desc Get rating statistics for courses, projects, or instructors
 * @access Public
 * @example GET /api/ratings/courses/123/stats
 * @example GET /api/ratings/projects/456/stats
 * @example GET /api/ratings/instructors/789/stats
 */
router.get("/:entityType/:entityId/stats", getRatingsStats);

/**
 * @route GET /api/ratings/:entityType/:entityId/reviews
 * @desc Get reviews with pagination for courses, projects, or instructors
 * @access Public
 * @query page, limit, sortBy, sortOrder, rating, verified
 * @example GET /api/ratings/courses/123/reviews?page=1&limit=10&sortBy=createdAt&sortOrder=DESC
 */
router.get("/:entityType/:entityId/reviews", getReviews);

/**
 * @route POST /api/ratings/:entityType/:entityId/reviews
 * @desc Create a review for courses, projects, or instructors
 * @access Private (must have purchased/enrolled)
 * @body { rating, review }
 * @example POST /api/ratings/courses/123/reviews
 */
router.post("/:entityType/:entityId/reviews", authenticateToken, createReview);

/**
 * @route GET /api/ratings/:entityType/reviews/:ratingId/my
 * @desc Get my specific rating by rating ID
 * @access Private
 * @example GET /api/ratings/courses/reviews/123/my
 * @example GET /api/ratings/projects/reviews/456/my
 * @example GET /api/ratings/instructors/reviews/789/my
 */
router.get("/:entityType/reviews/:ratingId/my", authenticateToken, getMySpecificRating);

/**
 * @route GET /api/ratings/:entityType/my
 * @desc Get all my ratings for entity type
 * @access Private
 * @example GET /api/ratings/courses/my
 * @example GET /api/ratings/projects/my
 * @example GET /api/ratings/instructors/my
 */
router.get("/:entityType/my", authenticateToken, getMyRatings);

/**
 * @route POST /api/ratings/:entityType/reviews/:ratingId/helpful
 * @desc Mark a review as helpful
 * @access Private (must have purchased/enrolled)
 * @example POST /api/ratings/courses/reviews/123/helpful
 */
router.post("/:entityType/reviews/:ratingId/helpful", authenticateToken, markReviewHelpful);

/**
 * @route POST /api/ratings/:entityType/reviews/:ratingId/not-helpful
 * @desc Mark a review as not helpful
 * @access Private (must have purchased/enrolled)
 * @example POST /api/ratings/courses/reviews/123/not-helpful
 */
router.post("/:entityType/reviews/:ratingId/not-helpful", authenticateToken, markReviewNotHelpful);

/**
 * @route PUT /api/ratings/:entityType/reviews/:ratingId
 * @desc Update a review
 * @access Private (must be review owner)
 * @body { rating?, review? }
 * @example PUT /api/ratings/courses/reviews/123
 */
router.put("/:entityType/reviews/:ratingId", authenticateToken, updateReview);

/**
 * @route DELETE /api/ratings/:entityType/reviews/:ratingId
 * @desc Delete a review
 * @access Private (must be review owner)
 * @example DELETE /api/ratings/courses/reviews/123
 */
router.delete("/:entityType/reviews/:ratingId", authenticateToken, deleteReview);

// ===========================================================================================
// GET MY RATINGS ENDPOINTS
// ===========================================================================================

/**
 * @route GET /api/ratings/my-ratings
 * @desc Get all ratings created by the authenticated user
 * @access Private
 * @query { page?, limit?, type?, sortBy?, sortOrder? }
 * @example GET /api/ratings/my-ratings?page=1&limit=10&type=course
 */
router.get("/my-ratings", authenticateToken, getMyRatings);

/**
 * @route GET /api/ratings/my-ratings/:ratingId
 * @desc Get a specific rating created by the authenticated user
 * @access Private (must be rating owner)
 * @example GET /api/ratings/my-ratings/123
 */
router.get("/my-ratings/:ratingId", authenticateToken, getMySpecificRating);

// ===========================================================================================
// LEGACY COMPATIBILITY ENDPOINTS
// ===========================================================================================

// Course rating endpoints (legacy compatibility)
router.get("/courses/:courseId/stats", getCourseRatingsStats);
router.get("/courses/:courseId/reviews", getCourseReviews);
router.post("/courses/:courseId/reviews", authenticateToken, createCourseReview);

// Project rating endpoints (legacy compatibility)
router.get("/projects/:projectId/stats", getProjectRatingsStats);
router.get("/projects/:projectId/reviews", getProjectReviews);
router.post("/projects/:projectId/reviews", authenticateToken, createProjectReview);

// Instructor rating endpoints (legacy compatibility)
router.get("/instructors/:instructorId/stats", getInstructorRatingsStats);
router.get("/instructors/:instructorId/reviews", getInstructorReviews);
router.post("/instructors/:instructorId/reviews", authenticateToken, createInstructorReview);

// ===========================================================================================
// SPECIFIC HELPFUL ENDPOINTS (AS REQUESTED)
// ===========================================================================================

/**
 * @route POST /api/ratings/helpful/:ratingId
 * @desc Mark a review as helpful (backward compatibility)
 * @access Private (must have purchased/enrolled)
 */
router.post("/helpful/:ratingId", authenticateToken, async (req, res) => {
  req.body.isHelpful = true;
  req.params.entityType = 'courses'; // Default to courses for backward compatibility
  return markReviewHelpful(req, res);
});

/**
 * @route POST /api/ratings/not-helpful/:ratingId
 * @desc Mark a review as not helpful (backward compatibility)
 * @access Private (must have purchased/enrolled)
 */
router.post("/not-helpful/:ratingId", authenticateToken, async (req, res) => {
  req.body.isHelpful = false;
  req.params.entityType = 'courses'; // Default to courses for backward compatibility
  return markReviewHelpful(req, res);
});

export default router;
