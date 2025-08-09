import express from "express";
import {
  // Basic lesson CRUD
  getSectionLessons,
  getLessonById,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  
  // Admin lesson management
  createLessonAdmin,
  updateLessonAdmin,
  deleteLessonAdmin,
  
  // Lesson content management
  updateLessonContent,
  toggleLessonPreview,
  bulkUpdateLessons,
  
  // Lesson progress and analytics
  getLessonProgress,
  markLessonComplete,
  getLessonAnalytics
} from "../controller/lessonController.js";
import {
  isTeacher,
  isStudent,
  isAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ===================== ADMIN LESSON MANAGEMENT =====================

// Admin lesson management
router.post("/admin/create", isAdmin, createLessonAdmin);
router.put("/admin/:lessonId", isAdmin, updateLessonAdmin);
router.delete("/admin/:lessonId", isAdmin, deleteLessonAdmin);
router.post("/admin/bulk-update", isAdmin, bulkUpdateLessons);

// ===================== TEACHER LESSON MANAGEMENT =====================

// Basic lesson CRUD (Teachers)
router.post("/create", isTeacher, createLesson);
router.put("/:lessonId", isTeacher, updateLesson);
router.delete("/:lessonId", isTeacher, deleteLesson);

router.put("/:lessonId/content", isTeacher, updateLessonContent);
router.put("/:lessonId/preview", isTeacher, toggleLessonPreview);

// Section lesson management
router.get("/section/:sectionId", isStudent, getSectionLessons);
router.post("/section/:sectionId/reorder", isTeacher, reorderLessons);

// ===================== STUDENT ACCESS =====================

// Lesson access and progress
router.get("/:lessonId", isStudent, getLessonById);
router.post("/:lessonId/complete", isStudent, markLessonComplete);
router.get("/:lessonId/progress", isStudent, getLessonProgress);

// ===================== ANALYTICS =====================

// Lesson analytics
router.get("/:lessonId/analytics", isTeacher, getLessonAnalytics);

export default router;
