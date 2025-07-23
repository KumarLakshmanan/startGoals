import express from "express";
import { authenticateToken, checkRole } from "../middleware/authMiddleware.js";
import { uploadMultiple } from "../middleware/fileUploadMiddleware.js";
import {
  uploadCourseFiles,
  getCourseFiles,
  downloadCourseFile,
  updateCourseFile,
  deleteCourseFile,
  streamCourseFile
} from "../controller/courseFileController.js";

const router = express.Router();

/**
 * @route   POST /api/courses/:courseId/files
 * @desc    Upload files for a course (admin/creator only)
 * @access  Private (Admin, Course Creator)
 */
router.post(
  "/:courseId/files",
  authenticateToken,
  checkRole(["admin", "teacher"]),
  uploadMultiple("courseFiles"),
  uploadCourseFiles
);

/**
 * @route   GET /api/courses/:courseId/files
 * @desc    Get all files for a course (preview for all, all for enrolled)
 * @access  Mixed (Public for preview, Private for all)
 */
router.get(
  "/:courseId/files",
  getCourseFiles
);

/**
 * @route   GET /api/course-files/:fileId/download
 * @desc    Download a course file
 * @access  Private (Enrolled users, Creator, Admin)
 */
router.get(
  "/files/:fileId/download",
  authenticateToken,
  downloadCourseFile
);

/**
 * @route   GET /api/course-files/:fileId/stream
 * @desc    Stream a video or audio course file
 * @access  Private (Enrolled users, Creator, Admin)
 */
router.get(
  "/files/:fileId/stream",
  authenticateToken,
  streamCourseFile
);

/**
 * @route   PUT /api/course-files/:fileId
 * @desc    Update course file details
 * @access  Private (Creator, Admin)
 */
router.put(
  "/files/:fileId",
  authenticateToken,
  checkRole(["admin", "teacher"]),
  updateCourseFile
);

/**
 * @route   DELETE /api/course-files/:fileId
 * @desc    Delete a course file
 * @access  Private (Creator, Admin)
 */
router.delete(
  "/files/:fileId",
  authenticateToken,
  checkRole(["admin", "teacher"]),
  deleteCourseFile
);

export default router;
