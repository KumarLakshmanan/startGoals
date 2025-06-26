// ===========================================================================================
// NOTIFICATION CONTROLLER
// Handles user notifications, admin notifications, and system-wide messaging
// ===========================================================================================

import { Op } from "sequelize";
import sequelize from "../config/db.js";
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendServerError } from "../utils/responseHelper.js";
import User from "../model/user.js";
import Notification from "../model/notification.js";

/**
 * Get notifications for the logged-in user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Pagination parameters
    const { page = 1, limit = 10, type, read, priority } = req.query;
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const where = { userId };
    if (type) where.type = type;
    if (read !== undefined) where.isRead = read === 'true';
    if (priority) where.priority = priority;
    
    // Fetch notifications from database
    const { count, rows: notifications } = await Notification.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });
    
    return sendSuccess(res, 200, "Notifications retrieved successfully", {
      notifications,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get a specific notification by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getNotificationById = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;
    
    // Fetch notification from database
    const notification = await Notification.findOne({
      where: { 
        id: notificationId,
        userId
      }
    });
    
    if (!notification) {
      return sendNotFound(res, "Notification not found");
    }
    
    return sendSuccess(res, 200, "Notification retrieved successfully", notification);
  } catch (error) {
    console.error("Error fetching notification:", error);
    return sendServerError(res, error);
  }
};

/**
 * Mark a notification as read
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;
    
    // Update notification in database
    const notification = await Notification.findOne({
      where: { 
        id: notificationId,
        userId
      }
    });
    
    if (!notification) {
      return sendNotFound(res, "Notification not found");
    }
    
    notification.isRead = true;
    await notification.save();
    
    return sendSuccess(res, 200, "Notification marked as read", { id: notificationId });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return sendServerError(res, error);
  }
};

/**
 * Mark all notifications as read for a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Update all notifications in database
    await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );
    
    return sendSuccess(res, 200, "All notifications marked as read");
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return sendServerError(res, error);
  }
};

/**
 * Delete a notification
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const deleteNotification = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.userId;
    
    // Delete notification from database
    const notification = await Notification.findOne({
      where: { 
        id: notificationId,
        userId
      }
    });
    
    if (!notification) {
      return sendNotFound(res, "Notification not found");
    }
    
    await notification.destroy();
    
    return sendSuccess(res, 200, "Notification deleted successfully");
  } catch (error) {
    console.error("Error deleting notification:", error);
    return sendServerError(res, error);
  }
};

/**
 * Create a notification (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createNotification = async (req, res) => {
  try {
    const { title, message, type, targetUserIds, priority, link, metadata, expiresAt } = req.body;
    
    // Validate input
    if (!title || !message || !type || !targetUserIds || !Array.isArray(targetUserIds)) {
      return sendValidationError(res, "Invalid notification data", {
        title: title ? null : "Title is required",
        message: message ? null : "Message is required",
        type: type ? null : "Type is required",
        targetUserIds: targetUserIds && Array.isArray(targetUserIds) ? null : "Target users must be an array"
      });
    }
    
    // Create notifications in database
    const notifications = [];
    
    for (const userId of targetUserIds) {
      const notification = await Notification.create({
        userId,
        title,
        message,
        type,
        priority: priority || 'medium',
        link,
        metadata,
        expiresAt,
        isRead: false
      });
      
      notifications.push(notification);
    }
    
    return sendSuccess(res, 201, "Notifications created successfully", { 
      count: notifications.length,
      notifications
    });
  } catch (error) {
    console.error("Error creating notifications:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get notification settings for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user with notification settings
    const user = await User.findByPk(userId, {
      attributes: ['userId', 'notificationSettings'] 
    });
    
    if (!user) {
      return sendNotFound(res, "User not found");
    }
    
    // If user has no notification settings, return defaults
    const settings = user.notificationSettings || {
      email: true,
      push: true,
      sms: false,
      courseUpdates: true,
      newMessages: true,
      marketingEmails: false
    };
    
    return sendSuccess(res, 200, "Notification settings retrieved", settings);
  } catch (error) {
    console.error("Error retrieving notification settings:", error);
    return sendServerError(res, error);
  }
};

/**
 * Update notification settings for the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const updateNotificationSettings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const settings = req.body;
    
    // Validate settings object
    if (!settings || typeof settings !== 'object') {
      return sendValidationError(res, "Invalid settings data");
    }
    
    // Get user
    const user = await User.findByPk(userId);
    
    if (!user) {
      return sendNotFound(res, "User not found");
    }
    
    // Update notification settings
    user.notificationSettings = {
      ...(user.notificationSettings || {}),
      ...settings
    };
    
    await user.save();
    
    return sendSuccess(res, 200, "Notification settings updated", user.notificationSettings);
  } catch (error) {
    console.error("Error updating notification settings:", error);
    return sendServerError(res, error);
  }
};
