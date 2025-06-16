import express from "express";
import {
  createSection,
  updateSectionById,
  getSectionsByCourseId,
  getSectionById,
  // New admin section management functions
  createSectionAdmin,
  updateSectionAdmin,
  deleteSectionAdmin,
  reorderSections,
  getCourseContentManagement,
  bulkPublishContent,
} from "../controller/sectionController.js";
import {
  authenticateToken,
  isTeacher,
  isStudent,
  isAdmin,
} from "../middleware/authMiddleware.js";

const router = express.Router();

// ===================== ADMIN/OWNER SECTION MANAGEMENT =====================

// Admin section management
router.post("/admin/create", isAdmin, createSectionAdmin);
router.put("/admin/:sectionId", isAdmin, updateSectionAdmin);
router.delete("/admin/:sectionId", isAdmin, deleteSectionAdmin);

// Content management
router.get(
  "/admin/course/:courseId/content",
  isAdmin,
  getCourseContentManagement,
);
router.post("/admin/course/:courseId/reorder", isAdmin, reorderSections);
router.post(
  "/admin/course/:courseId/bulk-publish",
  isAdmin,
  bulkPublishContent,
);

// ===================== GENERAL SECTION ROUTES =====================

router.post("/uploadSection", isTeacher, createSection); // Create section (Teacher only)
router.put("/updateSectionById/:sectionId", isTeacher, updateSectionById); // Update section (Teacher only)
router.get(
  "/getSectionsByCourseId/:courseId",
  isStudent,
  getSectionsByCourseId,
); // Get all sections for a course (Students/Teachers)
router.get("/getSectionById/:sectionId", isStudent, getSectionById); // Get single section by ID (Students/Teachers)

export default router;
