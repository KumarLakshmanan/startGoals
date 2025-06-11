import express from "express";
import { isAdmin } from "../middleware/authMiddleware.js";
import {
  // Student CRUD operations
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  // Batch assignment & management
  assignStudentToBatch,
  removeStudentFromBatch,
  // Student enrollment & progress
  getStudentEnrolledCourses,
  getStudentPaymentHistory,
  getStudentWishlist
} from "../controller/studentManagementController.js";

const router = express.Router();

// ===================== STUDENT MANAGEMENT ROUTES (Admin/Owner only) =====================

// Student CRUD Operations
router.get("/", isAdmin, getAllStudents); // Get all students with filters and pagination
router.get("/:studentId", isAdmin, getStudentById); // Get detailed student profile
router.post("/create", isAdmin, createStudent); // Create new student
router.put("/:studentId", isAdmin, updateStudent); // Update student information
router.delete("/:studentId", isAdmin, deleteStudent); // Delete student (soft/hard delete)

// Batch Assignment & Management
router.post("/assign-batch", isAdmin, assignStudentToBatch); // Assign student to batch
router.post("/remove-batch", isAdmin, removeStudentFromBatch); // Remove student from batch

// Student Enrollment & Progress
router.get("/:studentId/courses", isAdmin, getStudentEnrolledCourses); // Enrolled courses with progress
router.get("/:studentId/payments", isAdmin, getStudentPaymentHistory); // Payment history
router.get("/:studentId/wishlist", isAdmin, getStudentWishlist); // Student wishlist

export default router;
