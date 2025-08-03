import express from "express";
import {
  getSearchSuggestions,
  searchCourses,
  searchInstructors,
  searchProjects,
  getSearchFilters,
  getSearchAnalytics,
  comprehensiveSearch,
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
import { query } from "express-validator";
import SearchAnalytics from "../model/searchAnalytics.js";
import { Op } from "sequelize";

const router = express.Router();

// ===================== ENHANCED SEARCH ENDPOINTS =====================

// Enhanced autocomplete suggestions with intelligent ranking
// GET /api/search/suggestions
router.get(
  "/suggestions",
  [
    query("query")
      .optional()
      .isLength({ min: 2, max: 100 })
      .withMessage("Query must be between 2 and 100 characters"),
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("type")
      .optional()
      .isIn(["all", "courses", "projects", "instructors"])
      .withMessage("Type must be one of: all, courses, projects, instructors"),
    query("include_recent")
      .optional()
      .isBoolean()
      .withMessage("Include recent must be a boolean"),
  ],
  optionalAuth, // Optional authentication to show recent searches
  getSearchSuggestions,
);

// Comprehensive search with all filtering options
// GET /api/search/comprehensive
router.get(
  "/comprehensive",
  [
    // Search parameters
    query("query")
      .optional()
      .isLength({ max: 200 })
      .withMessage("Query must not exceed 200 characters"),
    query("type")
      .optional()
      .isIn(["all", "courses", "projects", "instructors"])
      .withMessage("Type must be one of: all, courses, projects, instructors"),
    // Filter parameters
    query("category")
      .optional()
      .custom((value) => {
        // Allow single ID or array of IDs
        if (Array.isArray(value)) {
          return value.every((id) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              id,
            ),
          );
        }
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value,
        );
      })
      .withMessage("Category must be valid UUID(s)"),

    query("skill_level")
      .optional()
      .custom((value) => {
        const validLevels = ["beginner", "intermediate", "expert", "advanced"];
        if (Array.isArray(value)) {
          return value.every((level) => validLevels.includes(level));
        }
        return validLevels.includes(value);
      })
      .withMessage(
        "Skill level must be one of: beginner, intermediate, expert, advanced",
      ),

    query("price_min")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price minimum must be a positive number"),

    query("price_max")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Price maximum must be a positive number"),

    query("course_type")
      .optional()
      .custom((value) => {
        const validTypes = ["live", "recorded"];
        if (Array.isArray(value)) {
          return value.every((type) => validTypes.includes(type));
        }
        return validTypes.includes(value);
      })
      .withMessage("Course type must be one of: live, recorded"),

    query("language")
      .optional()
      .custom((value) => {
        if (Array.isArray(value)) {
          return value.every((id) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              id,
            ),
          );
        }
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value,
        );
      })
      .withMessage("Language must be valid UUID(s)"),

    query("duration_min")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Duration minimum must be a positive integer (hours)"),

    query("duration_max")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Duration maximum must be a positive integer (hours)"),

    query("instructor")
      .optional()
      .custom((value) => {
        if (Array.isArray(value)) {
          return value.every((id) =>
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
              id,
            ),
          );
        }
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          value,
        );
      })
      .withMessage("Instructor must be valid UUID(s)"),

    query("rating_min")
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage("Rating minimum must be between 0 and 5"),

    // Sort parameters
    query("sort")
      .optional()
      .isIn([
        "relevance",
        "popular",
        "newest",
        "price_low",
        "price_high",
        "rating",
        "title",
      ])
      .withMessage(
        "Sort must be one of: relevance, popular, newest, price_low, price_high, rating, title",
      ),

    // Pagination parameters
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),

    query("limit")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Limit must be between 1 and 100"),

    // Additional filters
    query("free_only")
      .optional()
      .isBoolean()
      .withMessage("Free only must be a boolean"),

    query("premium_only")
      .optional()
      .isBoolean()
      .withMessage("Premium only must be a boolean"),

    query("certification")
      .optional()
      .isBoolean()
      .withMessage("Certification must be a boolean"),

    query("include_inactive")
      .optional()
      .isBoolean()
      .withMessage("Include inactive must be a boolean"),

    query("view_mode")
      .optional()
      .isIn(["grid", "list"])
      .withMessage("View mode must be one of: grid, list"),
  ],
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
  [
    query("limit")
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage("Limit must be between 1 and 50"),
    query("page")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Page must be a positive integer"),
  ],
  async (req, res) => {
    try {
      const { limit = 20, page = 1 } = req.query;
      const userId = req.user.userId;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const searchHistory = await SearchAnalytics.findAndCountAll({
        where: {
          userId,
          searchQuery: { [Op.ne]: null },
        },
        attributes: [
          "searchQuery",
          "searchType",
          "filters",
          "resultsCount",
          "createdAt",
          "metadata",
        ],
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset,
        distinct: true,
      });

      const formattedHistory = searchHistory.rows.map((search) => ({
        query: search.searchQuery,
        type: search.searchType,
        filters: search.filters ? JSON.parse(search.filters) : {},
        results_count: search.resultsCount,
        timestamp: search.createdAt,
        metadata: search.metadata ? JSON.parse(search.metadata) : {},
      }));

      res.json({
        success: true,
        data: {
          history: formattedHistory,
          pagination: {
            current_page: parseInt(page),
            total_pages: Math.ceil(searchHistory.count / parseInt(limit)),
            total_items: searchHistory.count,
            per_page: parseInt(limit),
          },
        },
      });
    } catch (error) {
      console.error("Get search history error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch search history",
        error: error.message,
      });
    }
  },
);

// Clear user's search history
// DELETE /api/search/history
router.delete("/history", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    await SearchAnalytics.destroy({
      where: { userId },
    });

    res.json({
      success: true,
      message: "Search history cleared successfully",
    });
  } catch (error) {
    console.error("Clear search history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to clear search history",
      error: error.message,
    });
  }
});

// ===================== SEARCH ANALYTICS (Admin) =====================

// Get search analytics (Admin only)
router.get("/analytics", isAdmin, getSearchAnalytics);

export default router;
