import Banner from "../model/banner.js";
import { Op } from "sequelize";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendServerError,
  sendConflict
} from "../utils/responseHelper.js";

// Get all banners with pagination and filtering
export const getAllBanners = async (req, res) => {
  try {
    const {
      search = "",
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const whereClause = {};
    if (search) {
      whereClause.title = {
        [Op.iLike]: `%${search}%`,
      };
    }

    const { count, rows: banners } = await Banner.findAndCountAll({
      where: whereClause,
      attributes: [
        "id",
        "title",
        "description",
        "imageUrl",
        "isActive",
        "order",
        "image",
        "createdAt",
        "updatedAt",
      ],
      order: [
        ["order", "ASC"],
        [sortBy, sortOrder.toUpperCase()],
      ],
    });


    return sendSuccess(res, "Banners fetched successfully",
      banners,
    );
  } catch (error) {
    console.error("Get all banners error:", error);
    return sendServerError(res, error);
  }
};

// Get banner by ID
export const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return sendValidationError(res, "Valid banner ID is required", { id: "Valid banner ID is required" });
    }

    const banner = await Banner.findByPk(id, {
      attributes: [
        "id",
        "title",
        "description",
        "imageUrl",
        "isActive",
        "order",
        "image",
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

    // Create banner data object
    const bannerData = {
      title,
      description: description || null,
      imageUrl, // Use the determined imageUrl from above
      isActive,
      order,
      image: imageUrl, // Keep for backward compatibility
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

    // Handle multipart/form-data with possible image
    const title = req.body.title;
    const description = req.body.description;
    let isActive = req.body.isActive;
    const order = req.body.order ? parseInt(req.body.order, 10) : undefined;

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
    if (!id || isNaN(parseInt(id))) {
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

    // Find banner
    const banner = await Banner.findByPk(id);
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

    await banner.update(updateData);

    return sendSuccess(res, "Banner updated successfully", banner);
  } catch (error) {
    console.error("Update banner error:", error);
    return sendServerError(res, error);
  }
  return sendError(res, 500, "An unexpected error occurred while updating the banner");
};

// Delete banner by ID (soft delete)
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation
    if (!id || isNaN(parseInt(id))) {
      return sendValidationError(res, "Valid banner ID is required", {
        id: "Valid banner ID is required"
      });
    }

    // Find banner
    const banner = await Banner.findByPk(id);
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

// Bulk create banners
export const bulkCreateBanners = async (req, res) => {
  try {
    const banners = req.body;

    // Validation
    if (!Array.isArray(banners) || banners.length === 0) {
      return sendValidationError(res, "Request body must be a non-empty array of banners", { banners: "Request body must be a non-empty array of banners" });
    }

    // Validate each banner
    for (const [index, banner] of banners.entries()) {
      if (!banner.title) {
        return sendValidationError(res, `Banner at index ${index} is missing required field: title`, { [`banners[${index}].title`]: "Title is required" });
      }

      if (!banner.imageUrl && !banner.image) {
        return sendValidationError(res, `Banner at index ${index} is missing required field: imageUrl or image`, { [`banners[${index}].image`]: "Image URL is required" });
      }

      if (banner.title && typeof banner.title !== "string") {
        return sendValidationError(res, `Banner at index ${index} has invalid title (must be string)`, { [`banners[${index}].title`]: "Title must be a string" });
      }

      if (banner.description && typeof banner.description !== "string") {
        return sendValidationError(res, `Banner at index ${index} has invalid description (must be string)`, { [`banners[${index}].description`]: "Description must be a string" });
      }

      if (
        (banner.imageUrl && typeof banner.imageUrl !== "string") ||
        (banner.image && typeof banner.image !== "string")
      ) {
        return sendValidationError(res, `Banner at index ${index} has invalid image URL (must be string)`, { [`banners[${index}].image`]: "Image URL must be a string" });
      }

      if (
        banner.isActive !== undefined &&
        typeof banner.isActive !== "boolean"
      ) {
        return sendValidationError(res, `Banner at index ${index} has invalid isActive (must be boolean)`, { [`banners[${index}].isActive`]: "isActive must be a boolean" });
      }

      if (
        banner.order !== undefined &&
        (!Number.isInteger(banner.order) || banner.order < 0)
      ) {
        return sendValidationError(res, `Banner at index ${index} has invalid order (must be positive integer)`, {
          [`banners[${index}].order`]: "Order must be a positive integer"
        });
      }
    }

    // Process banners for creation
    const processedBanners = banners.map((banner) => ({
      title: banner.title,
      description: banner.description || null,
      imageUrl: banner.imageUrl || banner.image,
      isActive: banner.isActive !== undefined ? banner.isActive : true,
      order: banner.order || 1,
      image: banner.image || banner.imageUrl, // Keep for backward compatibility
    }));

    // Create banners
    const createdBanners = await Banner.bulkCreate(processedBanners, {
      validate: true,
      returning: true,
    });

    return sendSuccess(res, `${createdBanners.length} banners created successfully`, createdBanners);
  } catch (error) {
    console.error("Bulk create banners error:", error);
    return sendServerError(res, error);
  }
};

// Get active banners (for public use - homepage, etc.)
export const getActiveBanners = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const banners = await Banner.findAll({
      where: { isActive: true },
      attributes: ["id", "title", "description", "imageUrl", "order", "image"],
      limit: parseInt(limit),
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
    for (const id of bannerIds) {
      if (isNaN(parseInt(id))) {
        return sendValidationError(res, `Invalid banner ID: ${id}`, { bannerIds: `Invalid banner ID: ${id}` });
      }
    }

    // Find all banners to delete
    const banners = await Banner.findAll({
      where: {
        id: bannerIds,
      },
    });

    // Check if all banners were found
    if (banners.length !== bannerIds.length) {
      const foundIds = banners.map(banner => banner.id);
      const missingIds = bannerIds.filter(id => !foundIds.includes(parseInt(id)));

      return sendNotFound(res, `Some banners were not found`, { missingIds: `Banner IDs not found: ${missingIds.join(', ')}` });
    }

    // Delete all banners
    const deletedCount = await Banner.destroy({
      where: {
        id: bannerIds,
      },
    });

    return sendSuccess(res, `${deletedCount} banners deleted successfully`, { deletedCount });
  } catch (error) {
    console.error("Bulk delete banners error:", error);
    return sendServerError(res, error);
  }
};
