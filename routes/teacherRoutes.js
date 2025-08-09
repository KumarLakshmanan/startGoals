import express from "express";
import { isAdmin } from "../middleware/authMiddleware.js";
import {
  // Teacher CRUD operations
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  assignTeacherToCourse,
  getTeacherPerformanceReport,
  getTeacherStudentFeedback,
  getTeacherAssignedCourses,
} from "../controller/teacherController.js";

const router = express.Router();

// ===================== TEACHER MANAGEMENT ROUTES (Admin/Owner only) =====================

// CRUD operations
router.get("/getAll", isAdmin, getAllTeachers); // Match frontend API endpoint
router.get("/getAllTeachers", isAdmin, getAllTeachers); // Legacy support
router.get("/:teacherId", isAdmin, getTeacherById); // Get detailed teacher profile
router.post("/create", isAdmin, createTeacher); // Create new teacher
router.post("/createTeacher", isAdmin, createTeacher); // Legacy support
router.put("/:teacherId", isAdmin, updateTeacher); // Update teacher information
router.delete("/:teacherId", isAdmin, deleteTeacher); // Delete teacher (soft/hard delete)

// Assignment operations
router.post("/assign-course", isAdmin, assignTeacherToCourse); // Assign teacher to course
// Analytics and performance
router.get("/:teacherId/performance", isAdmin, getTeacherPerformanceReport); // Teacher performance
router.get("/:teacherId/feedback", isAdmin, getTeacherStudentFeedback); // Student feedback
router.get("/:teacherId/courses", isAdmin, getTeacherAssignedCourses); // Teacher's courses

export default router;
