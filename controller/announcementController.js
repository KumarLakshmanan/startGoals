import Announcement from "../model/announcement.js";
import { Op } from "sequelize";
import {
  sendSuccess,
  sendValidationError,
  sendNotFound,
  sendServerError,
} from "../utils/responseHelper.js";

// Get all announcements with pagination and filtering
export const getAllAnnouncements = async (req, res) => {
  try {
    const {
      search = "",
      sortBy = "createdAt",
      sortOrder = "DESC",
      page = 1,
      limit = 10,
      announcementType,
      priority,
      targetAudience,
      isActive,
    } = req.query;

    // Robust parsing for page/limit
    let safePage = parseInt(page);
    if (Number.isNaN(safePage) || safePage <= 0) safePage = 1;
    let safeLimit = parseInt(limit);
    if (Number.isNaN(safeLimit) || safeLimit <= 0 || safeLimit > 100) safeLimit = 10;
    const offset = (safePage - 1) * safeLimit;

    const whereClause = {};
    if (search) {
      whereClause.title = {
        [Op.iLike]: `%${search}%`,
      };
    }
    if (announcementType && ['general', 'maintenance', 'feature', 'update', 'important'].includes(announcementType)) {
      whereClause.announcementType = announcementType;
    }
    if (priority && ['low', 'medium', 'high', 'urgent'].includes(priority)) {
      whereClause.priority = priority;
    }
    if (targetAudience && ['all', 'students', 'teachers', 'admins'].includes(targetAudience)) {
      whereClause.targetAudience = targetAudience;
    }
    if (isActive !== undefined) {
      whereClause.isActive = isActive === 'true';
    }

    const { count: totalCount, rows: announcements } = await Announcement.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "title",
        "description",
        "content",
        "imageUrl",
        "isActive",
        "priority",
        "announcementType",
        "targetAudience",
        "startDate",
        "endDate",
        "isSticky",
        "viewCount",
        "clickCount",
        "navigationUrl",
        "navigationType",
        "createdAt",
        "updatedAt",
      ],
      order: [
        ["isSticky", "DESC"],
        ["priority", "DESC"],
        [sortBy, sortOrder.toUpperCase()],
      ],
      limit: safeLimit,
      offset,
    });

    return sendSuccess(res, "Announcements fetched successfully", {
      items: announcements,
      pagination: {
        totalCount,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(totalCount / safeLimit)
      }
    });
  } catch (error) {
    console.error("Get all announcements error:", error);
    return sendServerError(res, error);
  }
};

// Get announcement by ID
export const getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;
    const safeId = parseInt(id);
    if (!id || Number.isNaN(safeId) || safeId <= 0) {
      return sendValidationError(res, "Valid announcement ID is required", { id: "Valid announcement ID is required" });
    }
    const announcement = await Announcement.findByPk(safeId, {
      attributes: [
        "id",
        "title",
        "description",
        "content",
        "imageUrl",
        "isActive",
        "priority",
        "announcementType",
        "targetAudience",
        "startDate",
        "endDate",
        "isSticky",
        "viewCount",
        "clickCount",
        "navigationUrl",
        "navigationType",
        "createdAt",
        "updatedAt",
      ],
    });
    if (!announcement) {
      return sendNotFound(res, "Announcement not found", { id: "Announcement not found" });
    }
    return sendSuccess(res, "Announcement fetched successfully", announcement);
  } catch (error) {
    console.error("Get announcement by ID error:", error);
    return sendServerError(res, error);
  }
};

// Create new announcement
export const createAnnouncement = async (req, res) => {
  console.log("Starting announcement creation process");
  try {
    console.log("Request body:", req.body);

    const title = req.body.title;
    const description = req.body.description;
    const content = req.body.content;
    let isActive = req.body.isActive !== undefined ? req.body.isActive : true;
    const priority = req.body.priority || "medium";
    const announcementType = req.body.announcementType || "general";
    const targetAudience = req.body.targetAudience || "all";
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const isSticky = req.body.isSticky !== undefined ? req.body.isSticky : false;
    const navigationUrl = req.body.navigationUrl;
    const navigationType = req.body.navigationType || "none";

    console.log("Parsed form data:", { title, description, isActive });

    // If image file is uploaded directly
    let imageUrl = null;

    // Convert isActive to boolean if it's a string
    if (typeof isActive === "string") {
      isActive = isActive === "true";
    }

    // Convert isSticky to boolean if it's a string
    if (typeof isSticky === "string") {
      isSticky = isSticky === "true";
    }

    // Validation
    if (!title) {
      console.log("Validation failed: Title is required");
      return sendValidationError(res, "Title is required", { title: "Title is required" });
    }

    // Check if image was uploaded through fileUploadMiddleware
    if (req.file) {
      // Standard fileUploadMiddleware puts the URL in location property
      imageUrl = req.file.location;
      // Log the file info for debugging
      console.log("Image file uploaded:", {
        fieldname: req.file.fieldname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        location: req.file.location
      });
    } else if (req.body.imageUrl) {
      // Image URL provided directly in request body
      imageUrl = req.body.imageUrl;
      console.log("Using imageUrl from request body:", imageUrl);
    }

    if (title && typeof title !== "string") {
      console.log("Validation failed: Title must be a string");
      return sendValidationError(res, "Title must be a string", {
        title: "Title must be a string"
      });
    }

    if (description && typeof description !== "string") {
      console.log("Validation failed: Description must be a string");
      return sendValidationError(res, "Description must be a string", {
        description: "Description must be a string"
      });
    }

    // Convert isActive to boolean if it's a string
    if (typeof isActive === "string") {
      isActive = isActive === "true";
    }

    if (typeof isActive !== "boolean") {
      console.log("Validation failed: isActive must be a boolean");
      return sendValidationError(res, "isActive must be a boolean", {
        isActive: "isActive must be a boolean"
      });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    if (!validPriorities.includes(priority)) {
      console.log("Validation failed: Invalid priority");
      return sendValidationError(res, "Invalid priority. Must be one of: low, medium, high, urgent", {
        priority: "Invalid priority"
      });
    }

    // Validate announcementType
    const validAnnouncementTypes = ['general', 'maintenance', 'feature', 'update', 'important'];
    if (!validAnnouncementTypes.includes(announcementType)) {
      console.log("Validation failed: Invalid announcement type");
      return sendValidationError(res, "Invalid announcement type. Must be one of: general, maintenance, feature, update, important", {
        announcementType: "Invalid announcement type"
      });
    }

    // Validate targetAudience
    const validTargetAudiences = ['all', 'students', 'teachers', 'admins'];
    if (!validTargetAudiences.includes(targetAudience)) {
      console.log("Validation failed: Invalid target audience");
      return sendValidationError(res, "Invalid target audience. Must be one of: all, students, teachers, admins", {
        targetAudience: "Invalid target audience"
      });
    }

    // Validate navigationType
    const validNavigationTypes = ['external', 'internal', 'none'];
    if (!validNavigationTypes.includes(navigationType)) {
      console.log("Validation failed: Invalid navigation type");
      return sendValidationError(res, "Invalid navigation type. Must be one of: external, internal, none", {
        navigationType: "Invalid navigation type"
      });
    }

    // Create announcement data object
    const announcementData = {
      title,
      description: description || null,
      content: content || null,
      imageUrl,
      isActive,
      priority,
      announcementType,
      targetAudience,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      isSticky,
      navigationUrl,
      navigationType,
    };
    await Announcement.create(announcementData);

    return sendSuccess(res, "Announcement created successfully", announcementData);
  } catch (error) {
    console.error("Create announcement error:", error);
    // Ensure we send a response even if there's an error
    if (!res.headersSent) {
      return sendServerError(res, error);
    }
  }
};

// Update announcement by ID
export const updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const safeId = parseInt(id);

    const title = req.body.title;
    const description = req.body.description;
    const content = req.body.content;
    let isActive = req.body.isActive;
    const priority = req.body.priority;
    const announcementType = req.body.announcementType;
    const targetAudience = req.body.targetAudience;
    const startDate = req.body.startDate;
    const endDate = req.body.endDate;
    const isSticky = req.body.isSticky;
    const navigationUrl = req.body.navigationUrl;
    const navigationType = req.body.navigationType;

    // Convert isActive to boolean if it's a string
    if (isActive !== undefined && typeof isActive === "string") {
      isActive = isActive === "true";
    }

    // Convert isSticky to boolean if it's a string
    if (isSticky !== undefined && typeof isSticky === "string") {
      isSticky = isSticky === "true";
    }

    // Check if image was uploaded
    let imageUrl = null;
    let hasNewImage = false;

    // Check for uploaded file through fileUploadMiddleware
    if (req.file) {
      // Standard fileUploadMiddleware puts the URL in location property
      imageUrl = req.file.location;
      hasNewImage = true;

      // Log the file info for debugging
      console.log("Update - Image file uploaded:", {
        fieldname: req.file.fieldname,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        location: req.file.location
      });
    } else if (req.body.imageUrl) {
      // Image URL provided directly in request body
      imageUrl = req.body.imageUrl;
      hasNewImage = true;
    }

    // Validation
    if (!id || Number.isNaN(safeId) || safeId <= 0) {
      return sendValidationError(res, "Valid announcement ID is required", { id: "Valid announcement ID is required" });
    }

    if (
      !title &&
      !description &&
      !content &&
      !hasNewImage &&
      isActive === undefined &&
      priority === undefined &&
      announcementType === undefined &&
      targetAudience === undefined &&
      startDate === undefined &&
      endDate === undefined &&
      isSticky === undefined
    ) {
      return sendValidationError(res, "At least one field is required to update", {
        general: "At least one field is required to update"
      });
    }

    // Find announcement
    const announcement = await Announcement.findByPk(safeId);
    if (!announcement) {
      return sendNotFound(res, "Announcement not found", {
        id: "Announcement not found"
      });
    }

    // Update announcement
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (content !== undefined) updateData.content = content;
    if (hasNewImage && imageUrl) {
      updateData.imageUrl = imageUrl;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (priority !== undefined) updateData.priority = priority;
    if (announcementType !== undefined) updateData.announcementType = announcementType;
    if (targetAudience !== undefined) updateData.targetAudience = targetAudience;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (isSticky !== undefined) updateData.isSticky = isSticky;
    if (navigationUrl !== undefined) updateData.navigationUrl = navigationUrl;
    if (navigationType !== undefined) updateData.navigationType = navigationType;

    await announcement.update(updateData);

    return sendSuccess(res, "Announcement updated successfully", announcement);
  } catch (error) {
    console.error("Update announcement error:", error);
    return sendServerError(res, error);
  }
};

// Delete announcement by ID (soft delete)
export const deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const safeId = parseInt(id);
    if (!id || Number.isNaN(safeId) || safeId <= 0) {
      return sendValidationError(res, "Valid announcement ID is required", {
        id: "Valid announcement ID is required"
      });
    }
    // Find announcement
    const announcement = await Announcement.findByPk(safeId);
    if (!announcement) {
      return sendNotFound(res, "Announcement not found", { id: "Announcement not found" });
    }

    // Soft delete (if paranoid is enabled) or hard delete
    await announcement.destroy();

    return sendSuccess(res, "Announcement deleted successfully");
  } catch (error) {
    console.error("Delete announcement error:", error);
    return sendServerError(res, error);
  }
};

// Get active announcements (for public use)
export const getActiveAnnouncements = async (req, res) => {
  try {
    let { limit = 10, targetAudience, announcementType } = req.query;
    let safeLimit = parseInt(limit);
    if (Number.isNaN(safeLimit) || safeLimit <= 0 || safeLimit > 100) safeLimit = 10;

    const whereClause = {
      isActive: true,
      [Op.or]: [
        { startDate: null },
        { startDate: { [Op.lte]: new Date() } }
      ],
      [Op.or]: [
        { endDate: null },
        { endDate: { [Op.gte]: new Date() } }
      ]
    };

    if (targetAudience && ['all', 'students', 'teachers', 'admins'].includes(targetAudience)) {
      whereClause.targetAudience = { [Op.in]: ['all', targetAudience] };
    }

    if (announcementType && ['general', 'maintenance', 'feature', 'update', 'important'].includes(announcementType)) {
      whereClause.announcementType = announcementType;
    }

    const announcements = await Announcement.findAll({
      where: whereClause,
      attributes: [
        "id",
        "title",
        "description",
        "content",
        "imageUrl",
        "priority",
        "announcementType",
        "targetAudience",
        "isSticky",
        "navigationUrl",
        "navigationType",
        "createdAt"
      ],
      limit: safeLimit,
      order: [
        ["isSticky", "DESC"],
        ["priority", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    return sendSuccess(res, "Active announcements fetched successfully", announcements);
  } catch (error) {
    console.error("Get active announcements error:", error);
    return sendServerError(res, error);
  }
};

// Bulk delete announcements
export const bulkDeleteAnnouncements = async (req, res) => {
  try {
    const { announcementIds } = req.body;
    // Validation
    if (!Array.isArray(announcementIds) || announcementIds.length === 0) {
      return sendValidationError(res, "Request body must contain a non-empty array of announcement IDs", { announcementIds: "Request body must contain a non-empty array of announcement IDs" });
    }
    // Check if all IDs are valid
    const safeIds = announcementIds.map(id => parseInt(id)).filter(id => !Number.isNaN(id) && id > 0);
    if (safeIds.length !== announcementIds.length) {
      return sendValidationError(res, `Invalid announcement ID(s) in array`, { announcementIds: `All announcement IDs must be valid positive integers.` });
    }
    // Find all announcements to delete
    const announcements = await Announcement.findAll({
      where: {
        id: safeIds,
      },
    });
    // Check if all announcements were found
    if (announcements.length !== safeIds.length) {
      const foundIds = announcements.map(announcement => announcement.id);
      const missingIds = safeIds.filter(id => !foundIds.includes(id));
      return sendNotFound(res, `Some announcements were not found`, { missingIds: `Announcement IDs not found: ${missingIds.join(', ')}` });
    }
    // Delete all announcements
    const deletedCount = await Announcement.destroy({
      where: {
        id: safeIds,
      },
    });
    return sendSuccess(res, `${deletedCount} announcements deleted successfully`, { deletedCount });
  } catch (error) {
    console.error("Bulk delete announcements error:", error);
    return sendServerError(res, error);
  }
};

// Track announcement view
export const trackAnnouncementView = async (req, res) => {
  try {
    const { id } = req.params;
    const safeId = parseInt(id);
    if (!id || Number.isNaN(safeId) || safeId <= 0) {
      return sendValidationError(res, "Valid announcement ID is required", { id: "Valid announcement ID is required" });
    }

    const announcement = await Announcement.findByPk(safeId);
    if (!announcement) {
      return sendNotFound(res, "Announcement not found", { id: "Announcement not found" });
    }

    // Increment view count
    await announcement.increment('viewCount', { by: 1 });

    return sendSuccess(res, "Announcement view tracked successfully");
  } catch (error) {
    console.error("Track announcement view error:", error);
    return sendServerError(res, error);
  }
};

// Track announcement click
export const trackAnnouncementClick = async (req, res) => {
  try {
    const { id } = req.params;
    const safeId = parseInt(id);
    if (!id || Number.isNaN(safeId) || safeId <= 0) {
      return sendValidationError(res, "Valid announcement ID is required", { id: "Valid announcement ID is required" });
    }

    const announcement = await Announcement.findByPk(safeId);
    if (!announcement) {
      return sendNotFound(res, "Announcement not found", { id: "Announcement not found" });
    }

    // Increment click count
    await announcement.increment('clickCount', { by: 1 });

    return sendSuccess(res, "Announcement click tracked successfully");
  } catch (error) {
    console.error("Track announcement click error:", error);
    return sendServerError(res, error);
  }
};