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
  // Admin course management functions
  createLiveCourse,
  createRecordedCourse,
  updateCourseAdmin,
  deleteCourseAdmin,
  getCourseManagementData,
  updateCourseSettings,
  // Analytics and reporting functions
  getCourseAnalytics,
  getAdminDashboardOverview,
  exportCourseData,
  getRevenueAnalytics,
} from "../controller/courseController.js";

const router = express.Router();

// ===================== ADMIN/OWNER COURSE MANAGEMENT =====================

// Admin dashboard and overview
router.get("/dashboard", isAdmin, getAllCourses);
router.get("/overview", isAdmin, getAdminDashboardOverview);
router.get("/list", isAdmin, getAllCourses); // Add specific route for list view

// Course management
router.get("/manage/:courseId", isAdmin, getCourseManagementData);

// Create courses (Admin/Owner only)
router.post("/create/live", isAdmin, createLiveCourse);
router.post("/create/recorded", isAdmin, createRecordedCourse);

// Update/Delete courses (Admin/Owner only)
router.put("/:courseId", isAdmin, updateCourseAdmin);
router.delete("/:courseId", isAdmin, deleteCourseAdmin);

// Course settings management (Admin/Owner only)
router.patch("/:courseId/settings", isAdmin, updateCourseSettings);

// Analytics and Reporting (Admin/Owner only)
router.get("/analytics/:courseId", isAdmin, getCourseAnalytics);
router.get("/revenue-analytics", isAdmin, getRevenueAnalytics);
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

// Legacy routes (for backward compatibility)
router.post("/uploadCourse", isTeacher, createCourse);
router.get("/getCourseById/:courseId", getCourseById);

export default router;
