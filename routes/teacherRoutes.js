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

// Legacy routes
router.post("/createTeacher", isAdmin, createTeacher);
router.get("/getAllTeachers", getAllTeachers);
router.get("/getAll", getAllTeachers);

router.post("/create", isAdmin, createTeacher); // Create new teacher
router.put("/:teacherId", isAdmin, updateTeacher); // Update teacher information
router.delete("/:teacherId", isAdmin, deleteTeacher); // Delete teacher (soft/hard delete)

router.get("/:teacherId", isAdmin, getTeacherById); // Get detailed teacher profile


export default router;
