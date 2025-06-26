// ===========================================================================================
// NOTIFICATION ROUTES
// Routes for user notifications, admin notifications, and system-wide messaging
// ===========================================================================================

import express from "express";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import {
  getUserNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createNotification,
  getNotificationSettings,
  updateNotificationSettings
} from "../controller/notificationController.js";

const router = express.Router();

// ===================== USER NOTIFICATION ROUTES =====================

// Get user's notifications (with pagination and filters)
router.get("/my-notifications", authenticateToken, getUserNotifications);

// Get specific notification by ID
router.get("/:notificationId", authenticateToken, getNotificationById);

// Mark notification as read
router.patch("/:notificationId/read", authenticateToken, markNotificationAsRead);

// Mark all notifications as read
router.patch("/mark-all-read", authenticateToken, markAllNotificationsAsRead);

// Delete a notification
router.delete("/:notificationId", authenticateToken, deleteNotification);

// ===================== NOTIFICATION SETTINGS =====================

// Get notification settings
router.get("/settings", authenticateToken, getNotificationSettings);

// Update notification settings
router.put("/settings", authenticateToken, updateNotificationSettings);

// ===================== ADMIN NOTIFICATION ROUTES =====================

// Create notifications (admin only)
router.post("/admin/create", authenticateToken, isAdmin, createNotification);

export default router;
