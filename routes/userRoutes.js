// ===========================================================================================
// USER & STUDENT ROUTES - UNIFIED
// Combined user authentication functionality with comprehensive student management features
// Includes both public user operations and advanced admin student management
// ===========================================================================================

import express from "express";
import {
  userLogin,
  userRegistration,
  googleCallback,
  getUserDetails,
  getHomePage,
  // Admin student management functions
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  bulkDeleteStudents,
  getStudentAnalytics,
} from "../controller/userController.js";
import passport from "passport";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import {
  validateSchema,
  userValidation,
} from "../middleware/fieldValidation.js";

const userRoutes = express.Router();

userRoutes.post(
  "/userRegistration",
  validateSchema(userValidation.register),
  userRegistration,
);
userRoutes.post("/userLogin", validateSchema(userValidation.login), userLogin);
userRoutes.get(
  "/googleLogin",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);
userRoutes.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/api/auth/callback/success",
    failureRedirect: "/login",
  }),
);
userRoutes.get("/auth/callback/success", authenticateToken, googleCallback);
userRoutes.get("/usersDetailsById/:userId", authenticateToken, getUserDetails);
userRoutes.get("/getUserDetails", authenticateToken, getUserDetails);
userRoutes.get("/getUserData", authenticateToken, getUserDetails);
userRoutes.get("/homepage", authenticateToken, getHomePage);

// ===================== COMPREHENSIVE ADMIN STUDENT MANAGEMENT ROUTES =====================

/**
 * @route GET /api/admin/students
 * @desc Get all students with filters and pagination
 * @access Private (Admin/Owner only)
 */
userRoutes.get("/admin/students", isAdmin, getAllStudents);

/**
 * @route GET /api/admin/students/analytics
 * @desc Get student analytics and statistics
 * @access Private (Admin/Owner only)
 */
userRoutes.get("/admin/students/analytics", isAdmin, getStudentAnalytics);

/**
 * @route GET /api/admin/students/:studentId
 * @desc Get detailed student profile
 * @access Private (Admin/Owner only)
 */
userRoutes.get("/admin/students/:studentId", isAdmin, getStudentById);

/**
 * @route POST /api/admin/students/create
 * @desc Create new student
 * @access Private (Admin/Owner only)
 */
userRoutes.post("/admin/students/create", isAdmin, createStudent);

/**
 * @route PUT /api/admin/students/:studentId
 * @desc Update student information
 * @access Private (Admin/Owner only)
 */
userRoutes.put("/admin/students/:studentId", isAdmin, updateStudent);

/**
 * @route DELETE /api/admin/students/:studentId
 * @desc Delete student (soft/hard delete)
 * @access Private (Admin/Owner only)
 */
userRoutes.delete("/admin/students/:studentId", isAdmin, deleteStudent);

/**
 * @route DELETE /api/admin/students/bulk-delete
 * @desc Delete multiple students at once (soft/hard delete)
 * @access Private (Admin/Owner only)
 */
userRoutes.delete("/admin/students/bulk-delete", isAdmin, bulkDeleteStudents);

export default userRoutes;
