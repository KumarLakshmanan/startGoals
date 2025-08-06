import express from "express";
import { authenticateToken, checkRole } from "../middleware/authMiddleware.js";
import { uploadMultiple } from "../middleware/fileUploadMiddleware.js";
import {
  uploadCourseFiles,
  getCourseFiles,
  updateCourseFile,
  deleteCourseFile,
  updateCourseFileData,
} from "../controller/courseFileController.js";

const router = express.Router();

/**
 * @route   POST /api/courses/:courseId/sections/:sectionId/lessons/:lessonId/files
 * @desc    Upload files for a lesson in a section in a course (admin/creator only)
 * @access  Private (Admin, Course Creator)
 */
router.post(
  "/:courseId/sections/:sectionId/lessons/:lessonId/files",
  authenticateToken,
  checkRole(["admin", "teacher"]),
  uploadMultiple("courseFiles"),
  uploadCourseFiles
);

/**
 * @route   GET /api/courses/:courseId/sections/:sectionId/lessons/:lessonId/files
 * @desc    Get all files for a lesson in a section in a course (preview for all, all for enrolled)
 * @access  Mixed (Public for preview, Private for all)
 */
router.get(
  "/:courseId/sections/:sectionId/lessons/:lessonId/files",
  authenticateToken,
  getCourseFiles
);

/**
 * @route   PUT /api/courses/:courseId/sections/:sectionId/lessons/:lessonId/files/:fileId
 * @desc    Update a file for a lesson in a section in a course
 * @access  Private (Creator, Admin)
 */
router.put(
  "/:courseId/sections/:sectionId/lessons/:lessonId/files/:fileId",
  authenticateToken,
  checkRole(["admin", "teacher"]),
  updateCourseFile
);

/**
 * @route   DELETE /api/courses/:courseId/sections/:sectionId/lessons/:lessonId/files/:fileId
 * @desc    Delete a file for a lesson in a section in a course
 * @access  Private (Creator, Admin)
 */
router.delete(
  "/:courseId/sections/:sectionId/lessons/:lessonId/files/:fileId",
  authenticateToken,
  checkRole(["admin", "teacher"]),
  deleteCourseFile
);

/**
 * @route   PUT /api/courses/:courseId/sections/:sectionId/lessons/:lessonId/data/:fileId
 * @desc    Update file data for a lesson in a section in a course
 * @access  Private (Creator, Admin)
 */
router.put(
  "/:courseId/sections/:sectionId/lessons/:lessonId/data/:fileId",
  authenticateToken,
  checkRole(["admin", "teacher"]),
  updateCourseFileData
);



export default router;
