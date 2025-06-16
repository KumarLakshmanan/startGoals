import Settings from "../model/settings.js";
import User from "../model/user.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
import fs from "fs/promises";
import path from "path";

// ===================== COMPREHENSIVE SETTINGS MANAGEMENT =====================
// This file combines both basic settings and advanced admin settings management

// Get all settings or filter by key
export const getSettings = async (req, res) => {
  try {
    const { key } = req.query;

    let whereClause = { isActive: true };
    if (key) {
      whereClause.key = key;
    }

    const settings = await Settings.findAll({
      where: whereClause,
      attributes: ["id", "key", "value", "description", "dataType"],
      order: [["key", "ASC"]],
    });

    // If specific key requested, return single object
    if (key && settings.length === 1) {
      return res.json({
        success: true,
        message: "Setting retrieved successfully",
        data: settings[0],
      });
    }

    res.json({
      success: true,
      message: "Settings retrieved successfully",
      data: settings,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Create or update a setting
export const upsertSetting = async (req, res) => {
  try {
    const { key, value, description, dataType = "string" } = req.body;

    if (!key) {
      return res.status(400).json({
        success: false,
        message: "Setting key is required",
      });
    }

    // Check if setting exists
    const existingSetting = await Settings.findOne({ where: { key } });

    let setting;
    if (existingSetting) {
      // Update existing setting
      await existingSetting.update({
        value,
        description,
        dataType,
      });
      setting = existingSetting;
    } else {
      // Create new setting
      setting = await Settings.create({
        key,
        value,
        description,
        dataType,
      });
    }

    res.json({
      success: true,
      message: existingSetting
        ? "Setting updated successfully"
        : "Setting created successfully",
      data: setting,
    });
  } catch (error) {
    console.error("Upsert setting error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Delete a setting
export const deleteSetting = async (req, res) => {
  try {
    const { id } = req.params;

    const setting = await Settings.findByPk(id);
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: "Setting not found",
      });
    }

    await setting.update({ isActive: false });

    res.json({
      success: true,
      message: "Setting deleted successfully",
    });
  } catch (error) {
    console.error("Delete setting error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Bulk insert default settings
export const initializeDefaultSettings = async (req, res) => {
  try {
    const defaultSettings = [
      {
        key: "contact_phone",
        value: "1234567890",
        description: "Contact phone number for customer support",
        dataType: "string",
      },
      {
        key: "contact_email",
        value: "support@example.com",
        description: "Contact email for customer support",
        dataType: "string",
      },
      {
        key: "company_name",
        value: "StartGoals",
        description: "Company name",
        dataType: "string",
      },
      {
        key: "app_version",
        value: "1.0.0",
        description: "Current app version",
        dataType: "string",
      },
      {
        key: "maintenance_mode",
        value: "false",
        description: "Enable/disable maintenance mode",
        dataType: "boolean",
      },
    ];

    const createdSettings = [];

    for (const settingData of defaultSettings) {
      const existingSetting = await Settings.findOne({
        where: { key: settingData.key },
      });

      if (!existingSetting) {
        const setting = await Settings.create(settingData);
        createdSettings.push(setting);
      }
    }

    res.json({
      success: true,
      message: `Initialized ${createdSettings.length} default settings`,
      data: createdSettings,
    });
  } catch (error) {
    console.error("Initialize settings error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// ===================== COMPREHENSIVE ADMIN SETTINGS MANAGEMENT =====================

/**
 * Get all notification templates with filtering and analytics
 * GET /api/admin/settings/notification-templates
 */
export const getNotificationTemplates = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type, // email, sms, push
      category, // user_registration, course_completion, payment, etc.
      status, // active, inactive, draft
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    // Since we don't have a notification templates table yet, let's create mock data structure
    const mockTemplates = [
      {
        templateId: 1,
        name: "Welcome Email",
        type: "email",
        category: "user_registration",
        subject: "Welcome to StartGoals!",
        content:
          "<p>Welcome {{firstName}}! Your account has been created successfully.</p>",
        variables: ["firstName", "lastName", "email"],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 1250,
        lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        templateId: 2,
        name: "Course Completion SMS",
        type: "sms",
        category: "course_completion",
        subject: null,
        content:
          "Congratulations {{firstName}}! You have completed {{courseName}}. Certificate: {{certificateUrl}}",
        variables: ["firstName", "courseName", "certificateUrl"],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 890,
        lastUsed: new Date(Date.now() - 5 * 60 * 60 * 1000),
      },
      {
        templateId: 3,
        name: "Payment Confirmation",
        type: "email",
        category: "payment",
        subject: "Payment Received - Order #{{orderId}}",
        content:
          "<p>Dear {{firstName}}, your payment of ${{amount}} has been received for {{itemName}}.</p>",
        variables: ["firstName", "orderId", "amount", "itemName"],
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 2100,
        lastUsed: new Date(Date.now() - 1 * 60 * 60 * 1000),
      },
    ];

    // Apply filtering to mock data
    let filteredTemplates = mockTemplates.filter((template) => {
      if (type && template.type !== type) return false;
      if (category && template.category !== category) return false;
      if (status && template.status !== status) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          template.name.toLowerCase().includes(searchLower) ||
          (template.subject &&
            template.subject.toLowerCase().includes(searchLower))
        );
      }
      return true;
    });

    // Apply sorting and pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = filteredTemplates.length;
    const paginatedTemplates = filteredTemplates.slice(
      offset,
      offset + parseInt(limit),
    );

    // Calculate analytics
    const analytics = {
      totalTemplates: totalCount,
      activeTemplates: filteredTemplates.filter((t) => t.status === "active")
        .length,
      draftTemplates: filteredTemplates.filter((t) => t.status === "draft")
        .length,
      inactiveTemplates: filteredTemplates.filter(
        (t) => t.status === "inactive",
      ).length,
      emailTemplates: filteredTemplates.filter((t) => t.type === "email")
        .length,
      smsTemplates: filteredTemplates.filter((t) => t.type === "sms").length,
      totalUsage: filteredTemplates.reduce((sum, t) => sum + t.usageCount, 0),
    };

    res.status(200).json({
      success: true,
      message: "Notification templates retrieved successfully",
      data: {
        templates: paginatedTemplates,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalRecords: totalCount,
          recordsPerPage: parseInt(limit),
        },
        analytics,
      },
    });
  } catch (error) {
    console.error("Get notification templates error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve notification templates",
      error: error.message,
    });
  }
};

/**
 * Create new notification template
 */
export const createNotificationTemplate = async (req, res) => {
  try {
    const {
      name,
      type, // email, sms, push
      category,
      subject,
      content,
      variables,
      description,
      status = "draft",
    } = req.body;

    const createdBy = req.user.userId;

    // Validation
    const validationErrors = [];

    if (!name || name.trim().length < 3) {
      validationErrors.push("Template name must be at least 3 characters long");
    }

    if (!["email", "sms", "push"].includes(type)) {
      validationErrors.push("Type must be email, sms, or push");
    }

    if (!category) {
      validationErrors.push("Category is required");
    }

    if (type === "email" && !subject) {
      validationErrors.push("Subject is required for email templates");
    }

    if (!content || content.trim().length < 10) {
      validationErrors.push("Content must be at least 10 characters long");
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // In real implementation, save to database
    const newTemplate = {
      templateId: Date.now(), // Mock ID
      name: name.trim(),
      type,
      category,
      subject: type === "email" ? subject : null,
      content: content.trim(),
      variables: variables || [],
      description: description || "",
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      usageCount: 0,
    };

    res.status(201).json({
      success: true,
      message: "Notification template created successfully",
      data: newTemplate,
    });
  } catch (error) {
    console.error("Create notification template error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create notification template",
      error: error.message,
    });
  }
};

/**
 * Get all legal pages with version history
 */
export const getLegalPages = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status, // published, draft, archived
      search,
    } = req.query;

    // Mock legal pages data
    const mockLegalPages = [
      {
        pageId: 1,
        slug: "terms-of-service",
        title: "Terms of Service",
        content:
          "<h1>Terms of Service</h1><p>Last updated: June 2025</p><p>These terms govern your use of StartGoals...</p>",
        status: "published",
        version: "2.1",
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        wordCount: 2450,
        viewCount: 15420,
      },
      {
        pageId: 2,
        slug: "privacy-policy",
        title: "Privacy Policy",
        content:
          "<h1>Privacy Policy</h1><p>Last updated: June 2025</p><p>This privacy policy describes how we collect...</p>",
        status: "published",
        version: "1.8",
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        wordCount: 3200,
        viewCount: 12800,
      },
      {
        pageId: 3,
        slug: "cancellation-refund-policy",
        title: "Cancellation & Refund Policy",
        content:
          "<h1>Cancellation & Refund Policy</h1><p>Last updated: May 2025</p><p>This policy outlines our cancellation...</p>",
        status: "published",
        version: "1.3",
        publishedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        wordCount: 1850,
        viewCount: 8900,
      },
    ];

    // Apply filtering
    let filteredPages = mockLegalPages.filter((page) => {
      if (status && page.status !== status) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          page.title.toLowerCase().includes(searchLower) ||
          page.slug.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = filteredPages.length;
    const paginatedPages = filteredPages.slice(
      offset,
      offset + parseInt(limit),
    );

    // Calculate analytics
    const analytics = {
      totalPages: totalCount,
      publishedPages: filteredPages.filter((p) => p.status === "published")
        .length,
      draftPages: filteredPages.filter((p) => p.status === "draft").length,
      totalViews: filteredPages.reduce((sum, p) => sum + p.viewCount, 0),
    };

    res.status(200).json({
      success: true,
      message: "Legal pages retrieved successfully",
      data: {
        pages: paginatedPages,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalRecords: totalCount,
          recordsPerPage: parseInt(limit),
        },
        analytics,
      },
    });
  } catch (error) {
    console.error("Get legal pages error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve legal pages",
      error: error.message,
    });
  }
};

/**
 * Get system configuration settings
 */
export const getSystemConfig = async (req, res) => {
  try {
    const { category } = req.query; // general, email, sms, payment, security, etc.

    // Mock system configuration
    const mockConfig = {
      general: {
        siteName: "StartGoals",
        siteUrl: "https://startgoals.com",
        adminEmail: "admin@startgoals.com",
        timezone: "UTC",
        language: "en",
        maintenanceMode: false,
        registrationEnabled: true,
        maxFileUploadSize: 50, // MB
        sessionTimeout: 30, // minutes
      },
      email: {
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        smtpSecure: true,
        smtpUser: "noreply@startgoals.com",
        fromName: "StartGoals",
        fromEmail: "noreply@startgoals.com",
        emailEnabled: true,
      },
      sms: {
        provider: "twilio",
        fromNumber: "+1234567890",
        smsEnabled: true,
      },
      payment: {
        currency: "USD",
        paymentMethodsEnabled: ["stripe", "paypal"],
        taxRate: 0.0, // percentage
        platformFee: 5.0, // percentage
      },
      security: {
        passwordMinLength: 8,
        passwordRequireSpecialChar: true,
        passwordRequireNumber: true,
        twoFactorEnabled: false,
        loginAttemptLimit: 5,
        lockoutDuration: 30, // minutes
      },
    };

    const responseData = category
      ? { [category]: mockConfig[category] }
      : mockConfig;

    res.status(200).json({
      success: true,
      message: "System configuration retrieved successfully",
      data: responseData,
    });
  } catch (error) {
    console.error("Get system config error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve system configuration",
      error: error.message,
    });
  }
};

/**
 * Update system configuration settings
 */
export const updateSystemConfig = async (req, res) => {
  try {
    const { category, settings } = req.body;
    const updatedBy = req.user.userId;

    if (!category || !settings) {
      return res.status(400).json({
        success: false,
        message: "Category and settings are required",
      });
    }

    // In real implementation, update in database
    const updatedConfig = {
      category,
      settings,
      updatedAt: new Date(),
      updatedBy,
    };

    res.status(200).json({
      success: true,
      message: "System configuration updated successfully",
      data: updatedConfig,
    });
  } catch (error) {
    console.error("Update system config error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update system configuration",
      error: error.message,
    });
  }
};

// All functions are exported individually above using 'export const'
