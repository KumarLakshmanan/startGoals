import express from "express";
import {
  getAdminUsers,
  getAdminUser,
  createAdminUser,
  updateAdminUser,
  changeAdminPassword,
  deleteAdminUser,
  getActivityLogs,
  getPermissions,
  exportAdminData,
} from "../controller/adminRoleController.js";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ===================== ADMIN USER MANAGEMENT ROUTES =====================

/**
 * @route GET /api/admin/roles/admins
 * @desc Get all admin users with role filtering and analytics
 * @access Private (Super Admin)
 */
router.get("/admins", authenticateToken, isAdmin, getAdminUsers);

/**
 * @route GET /api/admin/roles/admins/:userId
 * @desc Get specific admin user details with permissions and activity
 * @access Private (Super Admin, Self)
 */
router.get(
  "/admins/:userId",
  authenticateToken,
  isAdmin, // Additional check in controller for self-access
  getAdminUser,
);

/**
 * @route POST /api/admin/roles/admins
 * @desc Create new admin user
 * @access Private (Super Admin)
 */
router.post("/admins", authenticateToken, isAdmin, createAdminUser);

/**
 * @route PUT /api/admin/roles/admins/:userId
 * @desc Update admin user
 * @access Private (Super Admin, Self for limited fields)
 */
router.put(
  "/admins/:userId",
  authenticateToken,
  isAdmin, // Additional check in controller for self-access
  updateAdminUser,
);

/**
 * @route PUT /api/admin/roles/admins/:userId/password
 * @desc Change admin user password
 * @access Private (Super Admin, Self)
 */
router.put(
  "/admins/:userId/password",
  authenticateToken,
  isAdmin, // Self-access handled in controller
  changeAdminPassword,
);

/**
 * @route DELETE /api/admin/roles/admins/:userId
 * @desc Delete admin user (with safety checks)
 * @access Private (Super Admin)
 */
router.delete("/admins/:userId", authenticateToken, isAdmin, deleteAdminUser);

// ===================== ACTIVITY LOGS AND TRACKING ROUTES =====================

/**
 * @route GET /api/admin/roles/activity-logs
 * @desc Get admin activity logs with advanced filtering
 * @access Private (Super Admin, Course Manager, Project Manager, Payment Manager)
 */
router.get("/activity-logs", authenticateToken, isAdmin, getActivityLogs);

// ===================== PERMISSIONS AND ROLES ROUTES =====================

/**
 * @route GET /api/admin/roles/permissions
 * @desc Get role permissions and hierarchy
 * @access Private (All Admin Roles)
 */
router.get("/permissions", authenticateToken, isAdmin, getPermissions);

// ===================== DATA EXPORT ROUTES =====================

/**
 * @route GET /api/admin/roles/export
 * @desc Export admin users and activity data
 * @access Private (Super Admin)
 */
router.get("/export", authenticateToken, isAdmin, exportAdminData);

export default router;