import express from "express";
import {
  authenticateToken,
  isTeacher,
  isAdmin,
} from "../middleware/authMiddleware.js";
import {
  createCourse,
  getCourseById,
  getAllCourses,
  updateCourse,
  deleteCourse,
  searchCourses,
  getCoursesByInstructor,
  getCoursesByCategory,
  toggleCourseStatus,
  getCoursesStats,
  getLiveCourses,
  getRecordedCourses,
  // Admin course management functions
  createLiveCourse,
  createRecordedCourse,
  createCourseBatch,
  getCourseBatches,
  deleteCourseAdmin,
  getCourseManagementData,
  // Analytics and reporting functions
  getCourseAnalytics,
  getAdminDashboardOverview,
  exportCourseData,
  // Course tests management
  getCourseTests,
  createCourseTest,
  updateCourseTest,
  deleteCourseTest,
  // Course certificates management
  getCourseCertificates,
  createCourseCertificate,
  updateCourseCertificate,
  deleteCourseCertificate,
  // Course purchases management
  getCoursePurchases,
  getPurchaseDetails,
  // Course ratings management
  getCourseRatings,
  replyToRating,
  deleteRating,
  batchUpdateRatingStatus,
  // New rating and review APIs
  getCourseRatingsStats,
  getCourseReviews,
  createCourseReview
} from "../controller/courseController.js";
import upload from "../middleware/fileUploadMiddleware.js";

const router = express.Router();

// ===================== ADMIN/OWNER COURSE MANAGEMENT =====================

// Admin dashboard and overview
router.get("/dashboard", isAdmin, getAllCourses);
router.get("/overview", isAdmin, getAdminDashboardOverview);
router.get("/list", isAdmin, getAllCourses); // Add specific route for list view

// Get courses by type
router.get("/live", authenticateToken, getLiveCourses);
router.get("/recorded", authenticateToken, getRecordedCourses);

// Course management
router.get("/manage/:courseId", isAdmin, getCourseManagementData);

// Create courses (Admin/Owner only)
router.post("/create/live", isAdmin, createLiveCourse);
router.post("/create/recorded", isAdmin, createRecordedCourse);
router.post("/", isAdmin, createCourse); // General create endpoint

// Update/Delete courses (Admin/Owner only)
router.put("/:courseId", isAdmin, updateCourse);
router.delete("/:courseId", isAdmin, deleteCourse);

// Analytics and Reporting (Admin/Owner only)
router.get("/analytics/:courseId", isAdmin, getCourseAnalytics);
router.post("/export/:courseId", isAdmin, exportCourseData);

// ===================== PUBLIC AND GENERAL ROUTES =====================

router.get("/getAllCourses", getAllCourses);
router.get("/:courseId", getCourseById);
router.put("/:courseId", isTeacher, updateCourse);
router.delete("/:courseId", isTeacher, deleteCourse);

// Search and Filter Operations
router.get("/search/courses", searchCourses);
router.get("/instructor/:instructorId", getCoursesByInstructor);
router.get("/category/:categoryId", getCoursesByCategory);

// Course Management Operations
router.patch("/:courseId/status", isTeacher, toggleCourseStatus); // Toggle course status

// Statistics and Analytics
router.get("/admin/stats", isTeacher, getCoursesStats);

// ===================== COURSE RATINGS & REVIEWS =====================

// Rating and Review Routes
router.get("/:courseId/ratings/stats", getCourseRatingsStats); // Get rating statistics
router.get("/:courseId/reviews", getCourseReviews); // Get course reviews with pagination
router.post("/:courseId/reviews", authenticateToken, createCourseReview); // Create review (authenticated users only)

// Legacy routes (for backward compatibility)
router.post("/uploadCourse", isTeacher, createCourse);
router.get("/getCourseById/:courseId", getCourseById);

export default router;
