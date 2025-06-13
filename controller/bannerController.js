import Banner from "../model/banner.js";
import { Op } from "sequelize";
import {
    handleError,
    handleValidationError,
    handleNotFoundError,
    handleAuthorizationError,
    successResponse
} from "../middleware/standardErrorHandler.js";

// Get all banners with pagination and filtering
export const getAllBanners = async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            search = "",
            sortBy = "createdAt",
            sortOrder = "DESC"
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build where condition for search
        const whereClause = {};
        if (search) {
            whereClause.title = {
                [Op.iLike]: `%${search}%`
            };
        }

        const { count, rows: banners } = await Banner.findAndCountAll({
            where: whereClause,
            attributes: ['id', 'title', 'image', 'createdAt', 'updatedAt'],
            limit: parseInt(limit),
            offset,
            order: [[sortBy, sortOrder.toUpperCase()]],
        });

        const totalPages = Math.ceil(count / parseInt(limit)); return successResponse(res, {
            banners,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalItems: count,
                itemsPerPage: parseInt(limit),
                hasNextPage: parseInt(page) < totalPages,
                hasPrevPage: parseInt(page) > 1,
            },
        }, "Banners fetched successfully");
    } catch (error) {
        console.error("Get all banners error:", error);
        return handleError(res, error);
    }
};

// Get banner by ID
export const getBannerById = async (req, res) => {
    try {
        const { id } = req.params; if (!id || isNaN(parseInt(id))) {
            return handleValidationError(res, "Valid banner ID is required");
        }

        const banner = await Banner.findByPk(id, {
            attributes: ['id', 'title', 'image', 'createdAt', 'updatedAt']
        });

        if (!banner) {
            return handleNotFoundError(res, "Banner not found");
        }

        return successResponse(res, banner, "Banner fetched successfully");
    } catch (error) {
        console.error("Get banner by ID error:", error);
        return handleError(res, error);
    }
};

// Create new banner
export const createBanner = async (req, res) => {
    try {
        const { title, image } = req.body;        // Validation - handled by middleware
        // Create banner
        const banner = await Banner.create({
            title: title || null,
            image
        });

        return successResponse(res, banner, "Banner created successfully", 201);
    } catch (error) {
        console.error("Create banner error:", error);
        return handleError(res, error);
    }
};

// Update banner by ID
export const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, image } = req.body;        // Validation - some will be handled by middleware
        if (!id || isNaN(parseInt(id))) {
            return handleValidationError(res, "Valid banner ID is required");
        }

        if (!title && !image) {
            return handleValidationError(res, "At least one field (title or image) is required to update");
        }

        // Find banner
        const banner = await Banner.findByPk(id);
        if (!banner) {
            return handleNotFoundError(res, "Banner not found");
        }

        // Update banner
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (image !== undefined) updateData.image = image;

        await banner.update(updateData);

        return successResponse(res, banner, "Banner updated successfully");
    } catch (error) {
        console.error("Update banner error:", error);
        return handleError(res, error);
    }
};

// Delete banner by ID (soft delete)
export const deleteBanner = async (req, res) => {
    try {
        const { id } = req.params;        // Validation
        if (!id || isNaN(parseInt(id))) {
            return handleValidationError(res, "Valid banner ID is required");
        }

        // Find banner
        const banner = await Banner.findByPk(id);
        if (!banner) {
            return handleNotFoundError(res, "Banner not found");
        }

        // Soft delete (if paranoid is enabled) or hard delete
        await banner.destroy();

        return successResponse(res, null, "Banner deleted successfully");
    } catch (error) {
        console.error("Delete banner error:", error);
        return handleError(res, error);
    }
};

// Bulk create banners
export const bulkCreateBanners = async (req, res) => {
    try {
        const banners = req.body;        // Validation - will be handled by middleware
        if (!Array.isArray(banners) || banners.length === 0) {
            return handleValidationError(res, "Request body must be a non-empty array of banners");
        }

        // Create banners
        const createdBanners = await Banner.bulkCreate(banners, {
            validate: true,
            returning: true
        });

        return successResponse(res, createdBanners, `${createdBanners.length} banners created successfully`, 201);
    } catch (error) {
        console.error("Bulk create banners error:", error);
        return handleError(res, error);
    }
};

// Get active banners (for public use - homepage, etc.)
export const getActiveBanners = async (req, res) => {
    try {
        const { limit = 10 } = req.query; const banners = await Banner.findAll({
            attributes: ['id', 'title', 'image'],
            limit: parseInt(limit),
            order: [['createdAt', 'DESC']]
        });

        return successResponse(res, banners, "Active banners fetched successfully");
    } catch (error) {
        console.error("Get active banners error:", error);
        return handleError(res, error);
    }
};
