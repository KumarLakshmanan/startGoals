// ===========================================================================================
// SETTINGS ROUTES - UNIFIED
// Combined basic settings functionality with comprehensive admin management features
// Includes both basic settings operations and advanced admin configuration
// ===========================================================================================

import express from "express";
import {
  getSettings,
  upsertSetting,
  deleteSetting,
  getNotificationTemplates,
  createNotificationTemplate,
  getLegalPages,
  getSystemConfig,
  updateSystemConfig,
  getLanguageSettings,
  upsertLanguageSetting,
  getContactInfo,
} from "../controller/settingsController.js";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get settings (Admin only - sensitive configuration data)
router.get("/", isAdmin, getSettings);
// Create or update a setting (Admin only)
router.post("/", isAdmin, upsertSetting);

// Delete a setting (Admin only)
router.delete("/:id", isAdmin, deleteSetting);

// ===================== COMPREHENSIVE ADMIN MANAGEMENT ROUTES =====================

/**
 * @route GET /api/admin/settings/notification-templates
 * @desc Get all notification templates with filtering and pagination
 * @access Private (Super Admin, Course Manager, Project Manager)
 */
router.get(
  "/admin/notification-templates",
  authenticateToken,
  isAdmin,
  getNotificationTemplates,
);

/**
 * @route POST /api/admin/settings/notification-templates
 * @desc Create new notification template
 * @access Private (Super Admin, Course Manager, Project Manager)
 */
router.post(
  "/admin/notification-templates",
  authenticateToken,
  isAdmin,
  createNotificationTemplate,
);

/**
 * @route GET /api/admin/settings/legal-pages
 * @desc Get all legal pages with version history
 * @access Private (Super Admin, Course Manager, Project Manager)
 */
router.get("/admin/legal-pages", authenticateToken, isAdmin, getLegalPages);

/**
 * @route GET /api/admin/settings/system-config
 * @desc Get system configuration by category
 * @access Private (Super Admin, Course Manager, Project Manager)
 */
router.get("/admin/system-config", authenticateToken, isAdmin, getSystemConfig);

/**
 * @route PUT /api/admin/settings/system-config
 * @desc Update system configuration
 * @access Private (Super Admin)
 */
router.put(
  "/admin/system-config",
  authenticateToken,
  isAdmin,
  updateSystemConfig,
);

// Language-specific settings routes
router.get("/language/:languageCode", isAdmin, getLanguageSettings);
router.post("/language/:languageCode", isAdmin, upsertLanguageSetting);
router.get("/contact/:languageCode", authenticateToken, getContactInfo);

export default router;
