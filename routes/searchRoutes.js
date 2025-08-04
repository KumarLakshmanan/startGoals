import express from "express";
import {
  getSearchSuggestions,
  searchCourses,
  searchInstructors,
  searchProjects,
  getSearchFilters,
  getSearchAnalytics,
  comprehensiveSearch,
  getSearchHistory,
  clearSearchHistory,
} from "../controller/searchController.js";
import {
  getUnifiedSearchSuggestions,
  searchCoursesAndProjects,
  getUnifiedSearchFilters,
} from "../controller/unifiedSearchController.js";
import {
  authenticateToken,
  optionalAuth,
  isAdmin,
} from "../middleware/authMiddleware.js";
import {
  validateSchema,
  searchValidation,
} from "../middleware/fieldValidation.js";

const router = express.Router();

// ===================== ENHANCED SEARCH ENDPOINTS =====================

// Enhanced autocomplete suggestions with intelligent ranking
// GET /api/search/suggestions
router.get(
  "/suggestions",
  validateSchema(searchValidation.suggestions),
  optionalAuth, // Optional authentication to show recent searches
  getSearchSuggestions,
);

// Comprehensive search with all filtering options
// GET /api/search/comprehensive
router.get(
  "/comprehensive",
  validateSchema(searchValidation.comprehensive),
  optionalAuth, // Optional authentication for personalized results
  comprehensiveSearch,
);

// ===================== UNIFIED SEARCH ENDPOINTS =====================
// Enhanced search endpoints that include both courses and projects
router.get("/unified/suggestions", getUnifiedSearchSuggestions); // Unified autocomplete
router.get("/unified", searchCoursesAndProjects); // Unified search with projects
router.get("/unified/filters", getUnifiedSearchFilters); // Get unified filters

// ===================== LEGACY SEARCH ENDPOINTS =====================
// Advanced course search with filters (maintained for backward compatibility)
router.get("/courses", searchCourses);

// Search instructors
router.get("/instructors", searchInstructors);

// Search projects
router.get("/projects", searchProjects);

// Get available filter options
router.get("/filters", getSearchFilters);

// Get user's search history
// GET /api/search/history
router.get(
  "/history",
  authenticateToken,
  validateSchema(searchValidation.history),
  getSearchHistory,
);

// Clear user's search history
// DELETE /api/search/history
router.delete("/history", authenticateToken, clearSearchHistory);

// ===================== SEARCH ANALYTICS (Admin) =====================

// Get search analytics (Admin only)
router.get("/analytics", isAdmin, getSearchAnalytics);

export default router;
