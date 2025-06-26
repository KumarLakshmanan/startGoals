// ===========================================================================================
// ANALYTICS ROUTES
// Routes for platform analytics, user statistics, and performance metrics
// ===========================================================================================

import express from "express";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import {
  getPlatformOverview,
  getUserAnalytics,
  getCourseAnalytics,
  getRevenueAnalytics,
  generateCustomReport
} from "../controller/analyticsController.js";

const router = express.Router();

// All analytics routes require admin privileges
router.use(authenticateToken, isAdmin);

// Platform overview statistics
router.get("/overview", getPlatformOverview);

// User analytics
router.get("/users", getUserAnalytics);

// Course analytics
router.get("/courses", getCourseAnalytics);

// Revenue analytics
router.get("/revenue", getRevenueAnalytics);

// Custom report generation
router.post("/custom", generateCustomReport);

export default router;
