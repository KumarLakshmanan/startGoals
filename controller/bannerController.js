import Banner from "../model/banner.js";
import { Op } from "sequelize";

// Get all banners with pagination and filtering
export const getAllBanners = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where condition for search
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
      limit: parseInt(limit),
      offset,
      order: [
        ["order", "ASC"],
        [sortBy, sortOrder.toUpperCase()],
      ],
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return res.status(200).json({
      success: true,
      message: "Banners fetched successfully",
      data: {
        banners,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get all banners error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Get banner by ID
export const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "Valid banner ID is required",
      });
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
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Banner fetched successfully",
      data: banner,
    });
  } catch (error) {
    console.error("Get banner by ID error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Create new banner
export const createBanner = async (req, res) => {
  try {
    const {
      title,
      description,
      imageUrl,
      isActive = true,
      order = 1,
      image,
    } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({
        success: false,
        message: "Title is required",
      });
    }

    if (!imageUrl && !image) {
      return res.status(400).json({
        success: false,
        message: "Image URL is required",
      });
    }

    if (title && typeof title !== "string") {
      return res.status(400).json({
        success: false,
        message: "Title must be a string",
      });
    }

    if (description && typeof description !== "string") {
      return res.status(400).json({
        success: false,
        message: "Description must be a string",
      });
    }

    if (typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean",
      });
    }

    if (order && (!Number.isInteger(order) || order < 0)) {
      return res.status(400).json({
        success: false,
        message: "Order must be a positive integer",
      });
    }

    // Create banner
    const banner = await Banner.create({
      title,
      description: description || null,
      imageUrl: imageUrl || image, // Use imageUrl if provided, fallback to image for backward compatibility
      isActive,
      order,
      image: image || imageUrl, // Keep for backward compatibility
    });

    return res.status(201).json({
      success: true,
      message: "Banner created successfully",
      data: banner,
    });
  } catch (error) {
    console.error("Create banner error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Update banner by ID
export const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, imageUrl, isActive, order, image } = req.body;

    // Validation
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "Valid banner ID is required",
      });
    }

    if (
      !title &&
      !description &&
      !imageUrl &&
      !image &&
      isActive === undefined &&
      order === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "At least one field is required to update",
      });
    }

    if (title && typeof title !== "string") {
      return res.status(400).json({
        success: false,
        message: "Title must be a string",
      });
    }

    if (description && typeof description !== "string") {
      return res.status(400).json({
        success: false,
        message: "Description must be a string",
      });
    }

    if (
      (imageUrl && typeof imageUrl !== "string") ||
      (image && typeof image !== "string")
    ) {
      return res.status(400).json({
        success: false,
        message: "Image URL must be a valid string",
      });
    }

    if (isActive !== undefined && typeof isActive !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "isActive must be a boolean",
      });
    }

    if (order !== undefined && (!Number.isInteger(order) || order < 0)) {
      return res.status(400).json({
        success: false,
        message: "Order must be a positive integer",
      });
    }

    // Find banner
    const banner = await Banner.findByPk(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // Update banner
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl;
      updateData.image = imageUrl; // Keep for backward compatibility
    }
    if (image !== undefined && !imageUrl) {
      updateData.imageUrl = image;
      updateData.image = image;
    }
    if (isActive !== undefined) updateData.isActive = isActive;
    if (order !== undefined) updateData.order = order;

    await banner.update(updateData);

    return res.status(200).json({
      success: true,
      message: "Banner updated successfully",
      data: banner,
    });
  } catch (error) {
    console.error("Update banner error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Delete banner by ID (soft delete)
export const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;

    // Validation
    if (!id || isNaN(parseInt(id))) {
      return res.status(400).json({
        success: false,
        message: "Valid banner ID is required",
      });
    }

    // Find banner
    const banner = await Banner.findByPk(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Banner not found",
      });
    }

    // Soft delete (if paranoid is enabled) or hard delete
    await banner.destroy();

    return res.status(200).json({
      success: true,
      message: "Banner deleted successfully",
    });
  } catch (error) {
    console.error("Delete banner error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

// Bulk create banners
export const bulkCreateBanners = async (req, res) => {
  try {
    const banners = req.body;

    // Validation
    if (!Array.isArray(banners) || banners.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Request body must be a non-empty array of banners",
      });
    }

    // Validate each banner
    for (const [index, banner] of banners.entries()) {
      if (!banner.title) {
        return res.status(400).json({
          success: false,
          message: `Banner at index ${index} is missing required field: title`,
        });
      }

      if (!banner.imageUrl && !banner.image) {
        return res.status(400).json({
          success: false,
          message: `Banner at index ${index} is missing required field: imageUrl or image`,
        });
      }

      if (banner.title && typeof banner.title !== "string") {
        return res.status(400).json({
          success: false,
          message: `Banner at index ${index} has invalid title (must be string)`,
        });
      }

      if (banner.description && typeof banner.description !== "string") {
        return res.status(400).json({
          success: false,
          message: `Banner at index ${index} has invalid description (must be string)`,
        });
      }

      if (
        (banner.imageUrl && typeof banner.imageUrl !== "string") ||
        (banner.image && typeof banner.image !== "string")
      ) {
        return res.status(400).json({
          success: false,
          message: `Banner at index ${index} has invalid image URL (must be string)`,
        });
      }

      if (
        banner.isActive !== undefined &&
        typeof banner.isActive !== "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message: `Banner at index ${index} has invalid isActive (must be boolean)`,
        });
      }

      if (
        banner.order !== undefined &&
        (!Number.isInteger(banner.order) || banner.order < 0)
      ) {
        return res.status(400).json({
          success: false,
          message: `Banner at index ${index} has invalid order (must be positive integer)`,
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

    return res.status(201).json({
      success: true,
      message: `${createdBanners.length} banners created successfully`,
      data: createdBanners,
    });
  } catch (error) {
    console.error("Bulk create banners error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
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

    return res.status(200).json({
      success: true,
      message: "Active banners fetched successfully",
      data: banners,
    });
  } catch (error) {
    console.error("Get active banners error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
