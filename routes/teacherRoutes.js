import express from "express";
import { isAdmin } from "../middleware/authMiddleware.js";
import {
  // Teacher CRUD operations
  getAllTeachers,
  getTeacherById,
  createTeacher,
  updateTeacher,
  deleteTeacher,
  // Course & batch assignment
  assignTeacherToCourse,
  assignTeacherToBatch,
  // Performance & analytics
  getTeacherPerformanceReport,
  getTeacherStudentFeedback,
  getTeacherAssignedCourses,
} from "../controller/teacherController.js";

const router = express.Router();

// ===================== TEACHER MANAGEMENT ROUTES (Admin/Owner only) =====================

// Teacher CRUD Operations
router.get("/", isAdmin, getAllTeachers); // Get all teachers with filters and pagination
router.get("/:teacherId", isAdmin, getTeacherById); // Get detailed teacher profile
router.post("/create", isAdmin, createTeacher); // Create new teacher
router.put("/:teacherId", isAdmin, updateTeacher); // Update teacher information
router.delete("/:teacherId", isAdmin, deleteTeacher); // Delete teacher (soft/hard delete)

// Course & Batch Assignment
router.post("/assign-course", isAdmin, assignTeacherToCourse); // Assign teacher to course
router.post("/assign-batch", isAdmin, assignTeacherToBatch); // Assign teacher to batch

// Teacher Performance & Analytics
router.get("/:teacherId/performance", isAdmin, getTeacherPerformanceReport); // Performance report
router.get("/:teacherId/feedback", isAdmin, getTeacherStudentFeedback); // Student feedback & ratings
router.get("/:teacherId/courses", isAdmin, getTeacherAssignedCourses); // Assigned courses list

export default router;
