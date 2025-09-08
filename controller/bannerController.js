import Banner from "../model/banner.js";
import { Op } from "sequelize";
import {
  sendSuccess,
  sendValidationError,
  sendNotFound,
  sendServerError,
} from "../utils/responseHelper.js";

// Get all banners with pagination and filtering
export const getAllBanners = async (req, res) => {
  try {
    const {
      search = "",
      sortBy = "createdAt",
      sortOrder = "DESC",
      page = 1,
      limit = 10,
      bannerType,
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
    if (bannerType && ['primary', 'secondary', 'tertiary'].includes(bannerType)) {
      whereClause.bannerType = bannerType;
    }

    const { count: totalCount, rows: banners } = await Banner.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "title",
        "description",
        "imageUrl",
        "isActive",
        "order",
        "image",
        "bannerType",
        "navigationUrl",
        "navigationType",
        "navigationTargetId",
        "createdAt",
        "updatedAt",
      ],
      order: [
        ["order", "ASC"],
        [sortBy, sortOrder.toUpperCase()],
      ],
      limit: safeLimit,
      offset,
    });

    return sendSuccess(res, "Banners fetched successfully", {
      items: banners,
      pagination: {
        totalCount,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(totalCount / safeLimit)
      }
    });
  } catch (error) {
    console.error("Get all banners error:", error);
    return sendServerError(res, error);
  }
};

// Get banner by ID
export const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const safeId = parseInt(id);
    if (!id || Number.isNaN(safeId) || safeId <= 0) {
      return sendValidationError(res, "Valid banner ID is required", { id: "Valid banner ID is required" });
    }
    const banner = await Banner.findByPk(safeId, {
      attributes: [
        "id",
        "title",
        "description",
        "imageUrl",
        "isActive",
        "order",
        "image",
        "bannerType",
        "navigationUrl",
        "navigationType",
        "navigationTargetId",
        "createdAt",
        "updatedAt",
      ],
    });
    if (!banner) {
      return sendNotFound(res, "Banner not found", { id: "Banner not found" });
    }
    return sendSuccess(res, "Banner fetched successfully", banner);
  } catch (error) {
    console.error("Get banner by ID error:", error);
    return sendServerError(res, error);
  }
};

// Create new banner
export const createBanner = async (req, res) => {
  console.log("Starting banner creation process");
  try {
    console.log("Request body:", req.body);
    console.log("Request file:", req.file);

    // Handle multipart/form-data with image
    const title = req.body.title;
    const description = req.body.description;
    let isActive = req.body.isActive !== undefined ? req.body.isActive : true;
    const order = parseInt(req.body.order || 1, 10);
    const bannerType = req.body.bannerType || "primary";
    const navigationUrl = req.body.navigationUrl;
    const navigationType = req.body.navigationType || "external";
    const navigationTargetId = req.body.navigationTargetId;

    console.log("Parsed form data:", { title, description, isActive, order });

    // If image file is uploaded directly
    let imageUrl = null;

    // Convert isActive to boolean if it's a string
    if (typeof isActive === "string") {
      isActive = isActive === "true";
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
    } else if (req.body.image) {
      // Legacy field support
      imageUrl = req.body.image;
      console.log("Using image from request body:", imageUrl);
    } else {
      console.log("Validation failed: Banner image is required");
      return sendValidationError(res, "Banner image is required", {
        image: "Banner image is required"
      });
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

    if (order && (!Number.isInteger(order) || order < 0)) {
      console.log("Validation failed: Order must be a positive integer");
      return sendValidationError(res, "Order must be a positive integer", { order: "Order must be a positive integer" });
    }

    // Validate bannerType
    const validBannerTypes = ['primary', 'secondary', 'tertiary'];
    if (!validBannerTypes.includes(bannerType)) {
      console.log("Validation failed: Invalid banner type");
      return sendValidationError(res, "Invalid banner type. Must be one of: primary, secondary, tertiary", {
        bannerType: "Invalid banner type"
      });
    }

    // Validate navigationType
    const validNavigationTypes = ['external', 'internal', 'recorded_course', 'live_course', 'project', 'category'];
    if (!validNavigationTypes.includes(navigationType)) {
      console.log("Validation failed: Invalid navigation type");
      return sendValidationError(res, "Invalid navigation type. Must be one of: external, internal, recorded_course, live_course, project, category", {
        navigationType: "Invalid navigation type"
      });
    }

    // Create banner data object
    const bannerData = {
      title,
      description: description || null,
      imageUrl, // Use the determined imageUrl from above
      isActive,
      order,
      image: imageUrl, // Keep for backward compatibility
      bannerType,
      navigationUrl,
      navigationType,
      navigationTargetId,
    };
    await Banner.create(bannerData);

    return sendSuccess(res, "Banner created successfully", bannerData);
  } catch (error) {
    console.error("Create banner error:", error);
    // Ensure we send a response even if there's an error
    if (!res.headersSent) {
      return sendServerError(res, error);
    }
  }
};

// Update banner by ID
export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const safeId = parseInt(id);
    // Handle multipart/form-data with possible image
    const title = req.body.title;
    const description = req.body.description;
    let isActive = req.body.isActive;
    const order = req.body.order ? parseInt(req.body.order, 10) : undefined;
    const bannerType = req.body.bannerType;
    const navigationUrl = req.body.navigationUrl;
    const navigationType = req.body.navigationType;
    const navigationTargetId = req.body.navigationTargetId;

    // Convert isActive to boolean if it's a string
    if (isActive !== undefined && typeof isActive === "string") {
      isActive = isActive === "true";
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
    } else if (req.body.image) {
      // Legacy field support
      imageUrl = req.body.image;
      hasNewImage = true;
    }

    // Validation
    if (!id || Number.isNaN(safeId) || safeId <= 0) {
      return sendValidationError(res, "Valid banner ID is required", { id: "Valid banner ID is required" });
    }

    if (
      !title &&
      !description &&
      !hasNewImage &&
      isActive === undefined &&
      order === undefined
    ) {
      return sendValidationError(res, "At least one field is required to update", {
        general: "At least one field is required to update"
      });
    }

    if (title && typeof title !== "string") {
      return sendValidationError(res, "Title must be a string", {
        title: "Title must be a string"
      });
    }

    if (description && typeof description !== "string") {
      return sendValidationError(res, "Description must be a string", {
        description: "Description must be a string"
      });
    }

    // Convert isActive to boolean if it's a string
    if (isActive !== undefined && typeof isActive === "string") {
      isActive = isActive === "true";
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return sendValidationError(res, "isActive must be a boolean", {
        isActive: "isActive must be a boolean"
      });
    }

    // Parse order as integer if provided as string
    const parsedOrder = order !== undefined ? parseInt(order, 10) : undefined;

    if (parsedOrder !== undefined && (isNaN(parsedOrder) || parsedOrder < 0)) {
      return sendValidationError(res, "Order must be a positive integer", {
        order: "Order must be a positive integer"
      });
    }

    // Validate bannerType
    if (bannerType && typeof bannerType !== "string") {
      return sendValidationError(res, "bannerType must be a string", {
        bannerType: "bannerType must be a string"
      });
    }

    const validBannerTypes = ['primary', 'secondary', 'tertiary'];
    if (bannerType && !validBannerTypes.includes(bannerType)) {
      return sendValidationError(res, "Invalid banner type. Must be one of: primary, secondary, tertiary", {
        bannerType: "Invalid banner type"
      });
    }

    // Validate navigationType
    const validNavigationTypes = ['external', 'internal', 'recorded_course', 'live_course', 'project', 'category'];
    if (navigationType && !validNavigationTypes.includes(navigationType)) {
      return sendValidationError(res, "Invalid navigation type. Must be one of: external, internal, recorded_course, live_course, project, category", {
        navigationType: "Invalid navigation type"
      });
    }

    // Find banner
    const banner = await Banner.findByPk(safeId);
    if (!banner) {
      return sendNotFound(res, "Banner not found", {
        id: "Banner not found"
      });
    }

    // Update banner
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (hasNewImage && imageUrl) {
      updateData.imageUrl = imageUrl;
      updateData.image = imageUrl; // Keep for backward compatibility
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (parsedOrder !== undefined) updateData.order = parsedOrder;
    if (bannerType !== undefined) updateData.bannerType = bannerType;
    if (navigationUrl !== undefined) updateData.navigationUrl = navigationUrl;
    if (navigationType !== undefined) updateData.navigationType = navigationType;
    if (navigationTargetId !== undefined) updateData.navigationTargetId = navigationTargetId;

    await banner.update(updateData);

    return sendSuccess(res, "Banner updated successfully", banner);
  } catch (error) {
    console.error("Update banner error:", error);
    return sendServerError(res, error);
  }
};

// Delete banner by ID (soft delete)
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const safeId = parseInt(id);
    if (!id || Number.isNaN(safeId) || safeId <= 0) {
      return sendValidationError(res, "Valid banner ID is required", {
        id: "Valid banner ID is required"
      });
    }
    // Find banner
    const banner = await Banner.findByPk(safeId);
    if (!banner) {
      return sendNotFound(res, "Banner not found", { id: "Banner not found" });
    }

    // Soft delete (if paranoid is enabled) or hard delete
    await banner.destroy();

    return sendSuccess(res, "Banner deleted successfully");
  } catch (error) {
    console.error("Delete banner error:", error);
    return sendServerError(res, error);
  }
};

// Get active banners (for public use - homepage, etc.)
export const getActiveBanners = async (req, res) => {
  try {
    let { limit = 10, bannerType } = req.query;
    let safeLimit = parseInt(limit);
    if (Number.isNaN(safeLimit) || safeLimit <= 0 || safeLimit > 100) safeLimit = 10;

    const whereClause = { isActive: true };
    if (bannerType && ['primary', 'secondary', 'tertiary'].includes(bannerType)) {
      whereClause.bannerType = bannerType;
    }

    const banners = await Banner.findAll({
      where: whereClause,
      attributes: ["id", "title", "description", "imageUrl", "order", "image", "bannerType", "navigationUrl", "navigationType", "navigationTargetId"],
      limit: safeLimit,
      order: [
        ["order", "ASC"],
        ["createdAt", "DESC"],
      ],
    });

    return sendSuccess(res, "Active banners fetched successfully", banners);
  } catch (error) {
    console.error("Get active banners error:", error);
    return sendServerError(res, error);
  }
};

// Bulk delete banners
export const bulkDeleteBanners = async (req, res) => {
  try {
    const { bannerIds } = req.body;
    // Validation
    if (!Array.isArray(bannerIds) || bannerIds.length === 0) {
      return sendValidationError(res, "Request body must contain a non-empty array of banner IDs", { bannerIds: "Request body must contain a non-empty array of banner IDs" });
    }
    // Check if all IDs are valid
    const safeIds = bannerIds.map(id => parseInt(id)).filter(id => !Number.isNaN(id) && id > 0);
    if (safeIds.length !== bannerIds.length) {
      return sendValidationError(res, `Invalid banner ID(s) in array`, { bannerIds: `All banner IDs must be valid positive integers.` });
    }
    // Find all banners to delete
    const banners = await Banner.findAll({
      where: {
        id: safeIds,
      },
    });
    // Check if all banners were found
    if (banners.length !== safeIds.length) {
      const foundIds = banners.map(banner => banner.id);
      const missingIds = safeIds.filter(id => !foundIds.includes(id));
      return sendNotFound(res, `Some banners were not found`, { missingIds: `Banner IDs not found: ${missingIds.join(', ')}` });
    }
    // Delete all banners
    const deletedCount = await Banner.destroy({
      where: {
        id: safeIds,
      },
    });
    return sendSuccess(res, `${deletedCount} banners deleted successfully`, { deletedCount });
  } catch (error) {
    console.error("Bulk delete banners error:", error);
    return sendServerError(res, error);
  }
};
