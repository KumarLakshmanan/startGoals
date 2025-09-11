import Settings from "../model/settings.js";
import { Op } from "sequelize";
import {
  sendSuccess,
  sendValidationError,
  sendNotFound,
  sendServerError,
} from "../utils/responseHelper.js";

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
      return sendSuccess(res,  "Setting retrieved successfully", settings[0]);
    }

    sendSuccess(res,  "Settings retrieved successfully", settings);
  } catch (error) {
    console.error("Get settings error:", error);
    sendServerError(res, error);
  }
};

// Create or update a setting
export const upsertSetting = async (req, res) => {
  try {
    const { key, value, description, dataType = "string" } = req.body;

    if (!key) {
      return sendValidationError(res, "Setting key is required");
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

    sendSuccess(
      res,
      existingSetting
        ? "Setting updated successfully"
        : "Setting created successfully",
      setting
    );
  } catch (error) {
    console.error("Upsert setting error:", error);
    sendServerError(res, error);
  }
};

// Delete a setting
export const deleteSetting = async (req, res) => {
  try {
    const { id } = req.params;

    const setting = await Settings.findByPk(id);
    if (!setting) {
      return sendNotFound(res, "Setting not found");
    }

    await setting.update({ isActive: false });

    sendSuccess(res,  "Setting deleted successfully");
  } catch (error) {
    console.error("Delete setting error:", error);
    sendServerError(res, error);
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
          "<p>Welcome {{username}}! Your account has been created successfully.</p>",
        variables: ["username", "email"],
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
          "Congratulations {{username}}! You have completed {{courseName}}. Certificate: {{certificateUrl}}",
        variables: ["username", "courseName", "certificateUrl"],
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
          "<p>Dear {{username}}, your payment of ${{amount}} has been received for {{itemName}}.</p>",
        variables: ["username", "orderId", "amount", "itemName"],
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

    sendSuccess(res,  "Notification templates retrieved successfully", {
      templates: paginatedTemplates,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalRecords: totalCount,
        recordsPerPage: parseInt(limit),
      },
      analytics,
    });
  } catch (error) {
    console.error("Get notification templates error:", error);
    sendServerError(res, error);
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
      return sendValidationError(res, "Validation failed", validationErrors);
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

    sendSuccess(res,  "Notification template created successfully", newTemplate);
  } catch (error) {
    console.error("Create notification template error:", error);
    sendServerError(res, error);
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

    sendSuccess(res,  "Legal pages retrieved successfully", {
      pages: paginatedPages,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalRecords: totalCount,
        recordsPerPage: parseInt(limit),
      },
      analytics,
    });
  } catch (error) {
    console.error("Get legal pages error:", error);
    sendServerError(res, error);
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

    sendSuccess(res,  "System configuration retrieved successfully", responseData);
  } catch (error) {
    console.error("Get system config error:", error);
    sendServerError(res, error);
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
      return sendValidationError(res, "Category and settings are required");
    }

    // In real implementation, update in database
    const updatedConfig = {
      category,
      settings,
      updatedAt: new Date(),
      updatedBy,
    };

    sendSuccess(res,  "System configuration updated successfully", updatedConfig);
  } catch (error) {
    console.error("Update system config error:", error);
    sendServerError(res, error);
  }
};

// Get language-specific settings
export const getLanguageSettings = async (req, res) => {
  try {
    const { languageCode } = req.params;

    const settings = await Settings.findAll({
      where: {
        languageCode,
        isActive: true
      },
      attributes: ["id", "key", "value", "description", "dataType", "languageCode"],
      order: [["key", "ASC"]],
    });

    sendSuccess(res, "Language settings retrieved successfully", settings);
  } catch (error) {
    console.error("Get language settings error:", error);
    sendServerError(res, error);
  }
};

// Create or update language-specific setting
export const upsertLanguageSetting = async (req, res) => {
  try {
    const { languageCode } = req.params;
    const { key, value, description, dataType = "string" } = req.body;

    if (!key) {
      return sendValidationError(res, "Setting key is required");
    }

    // Check if setting exists
    const existingSetting = await Settings.findOne({
      where: {
        key,
        languageCode
      }
    });

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
        languageCode,
      });
    }

    sendSuccess(
      res,
      existingSetting
        ? "Language setting updated successfully"
        : "Language setting created successfully",
      setting
    );
  } catch (error) {
    console.error("Upsert language setting error:", error);
    sendServerError(res, error);
  }
};

// Get comprehensive contact information
export const getContactInfo = async (req, res) => {
  try {
    const { languageCode } = req.params;

    // Get all contact-related settings
    const contactSettings = await Settings.findAll({
      where: {
        key: {
          [Op.in]: [
            "phones",
            "emails",
            "whatsapps",
            "socialMedia_facebook",
            "socialMedia_instagram",
            "socialMedia_twitter",
            "socialMedia_linkedin",
            "socialMedia_youtube",
            "socialMedia_tiktok",
            "otherContacts"
          ]
        },
        languageCode: languageCode || "en",
        isActive: true
      },
      attributes: ["key", "value", "description", "dataType"]
    });

    // Parse and structure the contact information
    const contactInfo = {
      phones: [],
      emails: [],
      whatsapps: [],
      socialMedia: {
        facebook: "",
        instagram: "",
        twitter: "",
        linkedin: "",
        youtube: "",
        tiktok: ""
      },
      otherContacts: [],
      languageCode: languageCode || "en"
    };

    // Process each setting
    contactSettings.forEach(setting => {
      try {
        if (setting.key === "phones" || setting.key === "emails" || setting.key === "whatsapps") {
          contactInfo[setting.key] = JSON.parse(setting.value || "[]");
        } else if (setting.key.startsWith("socialMedia_")) {
          const platform = setting.key.replace("socialMedia_", "");
          contactInfo.socialMedia[platform] = setting.value || "";
        } else if (setting.key === "otherContacts") {
          contactInfo.otherContacts = JSON.parse(setting.value || "[]");
        }
      } catch (parseError) {
        console.warn(`Failed to parse setting ${setting.key}:`, parseError);
      }
    });

    sendSuccess(res, "Contact information retrieved successfully", contactInfo);
  } catch (error) {
    console.error("Get contact info error:", error);
    sendServerError(res, error);
  }
};

// Update comprehensive contact information
export const updateContactInfo = async (req, res) => {
  try {
    const { languageCode } = req.params;
    const {
      phones = [],
      emails = [],
      whatsapps = [],
      socialMedia = {},
      otherContacts = []
    } = req.body;

    const _updatedBy = req.user?.userId || "system";
    const updateResults = [];

    // Update phones
    if (phones && Array.isArray(phones)) {
      const phoneSetting = await Settings.findOne({
        where: { key: "phones", languageCode: languageCode || "en" }
      });

      if (phoneSetting) {
        await phoneSetting.update({
          value: JSON.stringify(phones),
          description: "Contact phone numbers",
          dataType: "json"
        });
      } else {
        await Settings.create({
          key: "phones",
          value: JSON.stringify(phones),
          description: "Contact phone numbers",
          dataType: "json",
          languageCode: languageCode || "en"
        });
      }
      updateResults.push("phones");
    }

    // Update emails
    if (emails && Array.isArray(emails)) {
      const emailSetting = await Settings.findOne({
        where: { key: "emails", languageCode: languageCode || "en" }
      });

      if (emailSetting) {
        await emailSetting.update({
          value: JSON.stringify(emails),
          description: "Contact email addresses",
          dataType: "json"
        });
      } else {
        await Settings.create({
          key: "emails",
          value: JSON.stringify(emails),
          description: "Contact email addresses",
          dataType: "json",
          languageCode: languageCode || "en"
        });
      }
      updateResults.push("emails");
    }

    // Update whatsapps
    if (whatsapps && Array.isArray(whatsapps)) {
      const whatsappSetting = await Settings.findOne({
        where: { key: "whatsapps", languageCode: languageCode || "en" }
      });

      if (whatsappSetting) {
        await whatsappSetting.update({
          value: JSON.stringify(whatsapps),
          description: "WhatsApp contact numbers",
          dataType: "json"
        });
      } else {
        await Settings.create({
          key: "whatsapps",
          value: JSON.stringify(whatsapps),
          description: "WhatsApp contact numbers",
          dataType: "json",
          languageCode: languageCode || "en"
        });
      }
      updateResults.push("whatsapps");
    }

    // Update social media
    if (socialMedia && typeof socialMedia === "object") {
      const platforms = ["facebook", "instagram", "twitter", "linkedin", "youtube", "tiktok"];

      for (const platform of platforms) {
        const value = socialMedia[platform] || "";
        const settingKey = `socialMedia_${platform}`;

        const socialSetting = await Settings.findOne({
          where: { key: settingKey, languageCode: languageCode || "en" }
        });

        if (socialSetting) {
          await socialSetting.update({
            value,
            description: `${platform} social media URL`,
            dataType: "string"
          });
        } else {
          await Settings.create({
            key: settingKey,
            value,
            description: `${platform} social media URL`,
            dataType: "string",
            languageCode: languageCode || "en"
          });
        }
      }
      updateResults.push("socialMedia");
    }

    // Update other contacts
    if (otherContacts && Array.isArray(otherContacts)) {
      const otherContactsSetting = await Settings.findOne({
        where: { key: "otherContacts", languageCode: languageCode || "en" }
      });

      if (otherContactsSetting) {
        await otherContactsSetting.update({
          value: JSON.stringify(otherContacts),
          description: "Other contact information",
          dataType: "json"
        });
      } else {
        await Settings.create({
          key: "otherContacts",
          value: JSON.stringify(otherContacts),
          description: "Other contact information",
          dataType: "json",
          languageCode: languageCode || "en"
        });
      }
      updateResults.push("otherContacts");
    }

    sendSuccess(res, "Contact information updated successfully", {
      updatedFields: updateResults,
      languageCode: languageCode || "en"
    });
  } catch (error) {
    console.error("Update contact info error:", error);
    sendServerError(res, error);
  }
};

// Get general settings (site info, system config, etc.)
export const getGeneralSettings = async (req, res) => {
  try {
    const generalSettings = await Settings.findAll({
      where: {
        key: {
          [Op.in]: [
            "siteName",
            "siteDescription",
            "siteUrl",
            "adminEmail",
            "supportEmail",
            "maintenanceMode",
            "registrationEnabled",
            "emailVerificationRequired",
            "defaultLanguage",
            "timezone",
            "maxFileUploadSize",
            "sessionTimeout"
          ]
        },
        isActive: true
      },
      attributes: ["key", "value", "description", "dataType"]
    });

    // Structure the settings
    const settings = {};
    generalSettings.forEach(setting => {
      try {
        if (setting.dataType === "boolean") {
          settings[setting.key] = setting.value === "true";
        } else if (setting.dataType === "number") {
          settings[setting.key] = parseFloat(setting.value);
        } else {
          settings[setting.key] = setting.value;
        }
      } catch (parseError) {
        console.warn(`Failed to parse setting ${setting.key}:`, parseError);
        settings[setting.key] = setting.value;
      }
    });

    // Set defaults for missing settings
    const defaults = {
      siteName: "StartGoals",
      siteDescription: "Learning Management System",
      siteUrl: "https://startgoals.com",
      adminEmail: "",
      supportEmail: "",
      maintenanceMode: false,
      registrationEnabled: true,
      emailVerificationRequired: true,
      defaultLanguage: "en",
      timezone: "UTC",
      maxFileUploadSize: 10,
      sessionTimeout: 30
    };

    const finalSettings = { ...defaults, ...settings };

    sendSuccess(res, "General settings retrieved successfully", finalSettings);
  } catch (error) {
    console.error("Get general settings error:", error);
    sendServerError(res, error);
  }
};

// Update general settings
export const updateGeneralSettings = async (req, res) => {
  try {
    const settingsData = req.body;
    const _updatedBy = req.user?.userId || "system";
    const updateResults = [];

    // Define the allowed settings keys and their data types
    const allowedSettings = {
      siteName: "string",
      siteDescription: "string",
      siteUrl: "string",
      adminEmail: "string",
      supportEmail: "string",
      maintenanceMode: "boolean",
      registrationEnabled: "boolean",
      emailVerificationRequired: "boolean",
      defaultLanguage: "string",
      timezone: "string",
      maxFileUploadSize: "number",
      sessionTimeout: "number"
    };

    // Update each setting
    for (const [key, dataType] of Object.entries(allowedSettings)) {
      if (Object.prototype.hasOwnProperty.call(settingsData, key)) {
        const value = dataType === "boolean" ? String(settingsData[key]) : String(settingsData[key]);

        const setting = await Settings.findOne({ where: { key } });

        if (setting) {
          await setting.update({
            value,
            description: `${key} setting`,
            dataType
          });
        } else {
          await Settings.create({
            key,
            value,
            description: `${key} setting`,
            dataType
          });
        }
        updateResults.push(key);
      }
    }

    sendSuccess(res, "General settings updated successfully", {
      updatedFields: updateResults
    });
  } catch (error) {
    console.error("Update general settings error:", error);
    sendServerError(res, error);
  }
};

// ===================== CONTACT DETAILS MANAGEMENT =====================

/**
 * Get comprehensive contact details for contact settings page
 * GET /api/settings/admin/contact-details
 */
export const getContactDetails = async (req, res) => {
  try {
    // Get all contact-related settings
    const contactSettings = await Settings.findAll({
      where: {
        key: {
          [Op.in]: [
            "phones",
            "emails",
            "whatsapps",
            "socialMedia_facebook",
            "socialMedia_instagram",
            "socialMedia_twitter",
            "socialMedia_linkedin",
            "socialMedia_youtube",
            "socialMedia_tiktok",
            "otherContacts",
            "address_street",
            "address_city",
            "address_state",
            "address_country",
            "address_zipCode",
            "businessHours_monday_open",
            "businessHours_monday_close",
            "businessHours_monday_isOpen",
            "businessHours_tuesday_open",
            "businessHours_tuesday_close",
            "businessHours_tuesday_isOpen",
            "businessHours_wednesday_open",
            "businessHours_wednesday_close",
            "businessHours_wednesday_isOpen",
            "businessHours_thursday_open",
            "businessHours_thursday_close",
            "businessHours_thursday_isOpen",
            "businessHours_friday_open",
            "businessHours_friday_close",
            "businessHours_friday_isOpen",
            "businessHours_saturday_open",
            "businessHours_saturday_close",
            "businessHours_saturday_isOpen",
            "businessHours_sunday_open",
            "businessHours_sunday_close",
            "businessHours_sunday_isOpen"
          ]
        },
        isActive: true
      },
      attributes: ["key", "value", "description", "dataType"]
    });

    // Structure the contact details
    const contactDetails = {
      phones: [],
      emails: [],
      whatsapps: [],
      socialMedia: {
        facebook: "",
        instagram: "",
        twitter: "",
        linkedin: "",
        youtube: "",
        tiktok: ""
      },
      otherContacts: [],
      address: {
        street: "",
        city: "",
        state: "",
        country: "",
        zipCode: ""
      },
      businessHours: {
        monday: { open: "09:00", close: "17:00", isOpen: true },
        tuesday: { open: "09:00", close: "17:00", isOpen: true },
        wednesday: { open: "09:00", close: "17:00", isOpen: true },
        thursday: { open: "09:00", close: "17:00", isOpen: true },
        friday: { open: "09:00", close: "17:00", isOpen: true },
        saturday: { open: "09:00", close: "17:00", isOpen: false },
        sunday: { open: "09:00", close: "17:00", isOpen: false }
      }
    };

    // Process each setting
    contactSettings.forEach(setting => {
      try {
        if (setting.key === "phones" || setting.key === "emails" || setting.key === "whatsapps") {
          contactDetails[setting.key] = JSON.parse(setting.value || "[]");
        } else if (setting.key.startsWith("socialMedia_")) {
          const platform = setting.key.replace("socialMedia_", "");
          contactDetails.socialMedia[platform] = setting.value || "";
        } else if (setting.key === "otherContacts") {
          contactDetails.otherContacts = JSON.parse(setting.value || "[]");
        } else if (setting.key.startsWith("address_")) {
          const field = setting.key.replace("address_", "");
          contactDetails.address[field] = setting.value || "";
        } else if (setting.key.startsWith("businessHours_")) {
          const parts = setting.key.replace("businessHours_", "").split("_");
          const day = parts[0];
          const field = parts[1];

          if (!contactDetails.businessHours[day]) {
            contactDetails.businessHours[day] = { open: "09:00", close: "17:00", isOpen: true };
          }

          if (field === "isOpen") {
            contactDetails.businessHours[day][field] = setting.value === "true";
          } else {
            contactDetails.businessHours[day][field] = setting.value || "";
          }
        }
      } catch (parseError) {
        console.warn(`Failed to parse setting ${setting.key}:`, parseError);
      }
    });

    sendSuccess(res, "Contact details retrieved successfully", contactDetails);
  } catch (error) {
    console.error("Get contact details error:", error);
    sendServerError(res, error);
  }
};

/**
 * Update comprehensive contact details for contact settings page
 * PUT /api/settings/admin/contact-details
 */
export const updateContactDetails = async (req, res) => {
  try {
    const {
      phones = [],
      emails = [],
      whatsapps = [],
      socialMedia = {},
      otherContacts = [],
      address = {},
      businessHours = {}
    } = req.body;

    const updatedBy = req.user?.userId || "system";
    const updateResults = [];

    // Update phones
    if (phones && Array.isArray(phones)) {
      const phoneSetting = await Settings.findOne({
        where: { key: "phones" }
      });

      if (phoneSetting) {
        await phoneSetting.update({
          value: JSON.stringify(phones),
          description: "Contact phone numbers",
          dataType: "json"
        });
      } else {
        await Settings.create({
          key: "phones",
          value: JSON.stringify(phones),
          description: "Contact phone numbers",
          dataType: "json"
        });
      }
      updateResults.push("phones");
    }

    // Update emails
    if (emails && Array.isArray(emails)) {
      const emailSetting = await Settings.findOne({
        where: { key: "emails" }
      });

      if (emailSetting) {
        await emailSetting.update({
          value: JSON.stringify(emails),
          description: "Contact email addresses",
          dataType: "json"
        });
      } else {
        await Settings.create({
          key: "emails",
          value: JSON.stringify(emails),
          description: "Contact email addresses",
          dataType: "json"
        });
      }
      updateResults.push("emails");
    }

    // Update whatsapps
    if (whatsapps && Array.isArray(whatsapps)) {
      const whatsappSetting = await Settings.findOne({
        where: { key: "whatsapps" }
      });

      if (whatsappSetting) {
        await whatsappSetting.update({
          value: JSON.stringify(whatsapps),
          description: "WhatsApp contact numbers",
          dataType: "json"
        });
      } else {
        await Settings.create({
          key: "whatsapps",
          value: JSON.stringify(whatsapps),
          description: "WhatsApp contact numbers",
          dataType: "json"
        });
      }
      updateResults.push("whatsapps");
    }

    // Update social media
    if (socialMedia && typeof socialMedia === "object") {
      const platforms = ["facebook", "instagram", "twitter", "linkedin", "youtube", "tiktok"];

      for (const platform of platforms) {
        const value = socialMedia[platform] || "";
        const settingKey = `socialMedia_${platform}`;

        const socialSetting = await Settings.findOne({
          where: { key: settingKey }
        });

        if (socialSetting) {
          await socialSetting.update({
            value,
            description: `${platform} social media URL`,
            dataType: "string"
          });
        } else {
          await Settings.create({
            key: settingKey,
            value,
            description: `${platform} social media URL`,
            dataType: "string"
          });
        }
      }
      updateResults.push("socialMedia");
    }

    // Update other contacts
    if (otherContacts && Array.isArray(otherContacts)) {
      const otherContactsSetting = await Settings.findOne({
        where: { key: "otherContacts" }
      });

      if (otherContactsSetting) {
        await otherContactsSetting.update({
          value: JSON.stringify(otherContacts),
          description: "Other contact information",
          dataType: "json"
        });
      } else {
        await Settings.create({
          key: "otherContacts",
          value: JSON.stringify(otherContacts),
          description: "Other contact information",
          dataType: "json"
        });
      }
      updateResults.push("otherContacts");
    }

    // Update address
    if (address && typeof address === "object") {
      const addressFields = ["street", "city", "state", "country", "zipCode"];

      for (const field of addressFields) {
        const value = address[field] || "";
        const settingKey = `address_${field}`;

        const addressSetting = await Settings.findOne({
          where: { key: settingKey }
        });

        if (addressSetting) {
          await addressSetting.update({
            value,
            description: `Address ${field}`,
            dataType: "string"
          });
        } else {
          await Settings.create({
            key: settingKey,
            value,
            description: `Address ${field}`,
            dataType: "string"
          });
        }
      }
      updateResults.push("address");
    }

    // Update business hours
    if (businessHours && typeof businessHours === "object") {
      const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

      for (const day of days) {
        if (businessHours[day]) {
          const dayData = businessHours[day];
          const fields = ["open", "close", "isOpen"];

          for (const field of fields) {
            const value = field === "isOpen" ? String(dayData[field] || false) : (dayData[field] || "");
            const settingKey = `businessHours_${day}_${field}`;

            const businessHoursSetting = await Settings.findOne({
              where: { key: settingKey }
            });

            if (businessHoursSetting) {
              await businessHoursSetting.update({
                value,
                description: `${day} ${field}`,
                dataType: field === "isOpen" ? "boolean" : "string"
              });
            } else {
              await Settings.create({
                key: settingKey,
                value,
                description: `${day} ${field}`,
                dataType: field === "isOpen" ? "boolean" : "string"
              });
            }
          }
        }
      }
      updateResults.push("businessHours");
    }

    sendSuccess(res, "Contact details updated successfully", {
      updatedFields: updateResults,
      updatedAt: new Date(),
      updatedBy
    });
  } catch (error) {
    console.error("Update contact details error:", error);
    sendServerError(res, error);
  }
};

// All functions are exported individually above using 'export const'
