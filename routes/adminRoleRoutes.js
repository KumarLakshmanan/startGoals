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

// ===================== ROUTE DOCUMENTATION =====================

/**
 * ADMIN ROLE MANAGEMENT API ENDPOINTS
 *
 * Base URL: /api/admin/roles
 *
 * ADMIN USER MANAGEMENT:
 * - GET    /admins                           - List all admin users with analytics
 * - GET    /admins/:userId                   - Get admin user details
 * - POST   /admins                           - Create new admin user
 * - PUT    /admins/:userId                   - Update admin user
 * - PUT    /admins/:userId/password          - Change admin password
 * - DELETE /admins/:userId                   - Delete admin user
 *
 * ACTIVITY TRACKING:
 * - GET    /activity-logs                    - Get activity logs with filtering
 *
 * PERMISSIONS & ROLES:
 * - GET    /permissions                      - Get role permissions and hierarchy
 *
 * DATA EXPORT:
 * - GET    /export                           - Export admin data
 *
 * ADMIN ROLES & PERMISSIONS:
 *
 * 🔴 SUPER ADMIN (Level 5):
 * - Full system access
 * - Manage all admin users
 * - System configuration
 * - All permissions
 *
 * 🟡 COURSE MANAGER (Level 3):
 * - Manage courses and instructors
 * - Content moderation
 * - Course analytics
 * - Limited settings access
 *
 * 🟡 PROJECT MANAGER (Level 3):
 * - Manage projects and downloads
 * - Content moderation
 * - Project analytics
 * - Limited settings access
 *
 * 🟠 PAYMENT MANAGER (Level 4):
 * - Manage payments and refunds
 * - Financial reports
 * - Discount management
 * - View system config
 *
 * 🟢 CERTIFICATE MANAGER (Level 2):
 * - Manage certificates
 * - Generate reports
 * - Limited access
 *
 * SECURITY FEATURES:
 * ✅ Role-based access control (RBAC)
 * ✅ Permission hierarchy enforcement
 * ✅ Activity logging and tracking
 * ✅ IP address monitoring
 * ✅ Session management
 * ✅ Password security policies
 * ✅ Two-factor authentication support
 * ✅ Account lockout protection
 * ✅ Self-deletion prevention
 * ✅ Super admin protection
 *
 * ANALYTICS & MONITORING:
 * ✅ User activity scores
 * ✅ Login tracking
 * ✅ Risk assessment
 * ✅ Real-time monitoring
 * ✅ Export capabilities
 * ✅ Audit trails
 *
 * SAMPLE REQUESTS:
 *
 * Create Admin User:
 * POST /api/admin/roles/admins
 * {
 *   "firstName": "Jane",
 *   "lastName": "Doe",
 *   "email": "jane.doe@startgoals.com",
 *   "password": "SecurePass123!",
 *   "adminRole": "course_manager",
 *   "permissions": ["manage_courses", "view_analytics"],
 *   "sendWelcomeEmail": true
 * }
 *
 * Get Activity Logs:
 * GET /api/admin/roles/activity-logs?userId=2&action=course&dateFrom=2025-06-01&limit=50
 *
 * Change Password:
 * PUT /api/admin/roles/admins/2/password
 * {
 *   "currentPassword": "OldPass123!",
 *   "newPassword": "NewSecurePass456!"
 * }
 */
