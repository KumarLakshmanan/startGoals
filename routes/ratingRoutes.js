import express from "express";
import {
  rateCourse,
  getCourseRatings,
  rateInstructor,
  getInstructorRatings,
  markReviewHelpful
} from "../controller/ratingController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Course rating endpoints
router.post("/courses/:courseId", authenticateToken, rateCourse); // Rate a course
router.get("/courses/:courseId", getCourseRatings); // Get course ratings (public)

// Instructor rating endpoints
router.post("/instructors/:instructorId", authenticateToken, rateInstructor); // Rate an instructor
router.get("/instructors/:instructorId", getInstructorRatings); // Get instructor ratings (public)

// Review interaction endpoints
router.post("/helpful/:ratingId", authenticateToken, markReviewHelpful); // Mark review as helpful (authenticated users only)

export default router;
