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
            message: error.message || "Internal server error"
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
                message: "Valid banner ID is required"
            });
        }

        const banner = await Banner.findByPk(id, {
            attributes: ['id', 'title', 'image', 'createdAt', 'updatedAt']
        });

        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Banner fetched successfully",
            data: banner
        });
    } catch (error) {
        console.error("Get banner by ID error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Create new banner
export const createBanner = async (req, res) => {
    try {
        const { title, image } = req.body;

        // Validation
        if (!image) {
            return res.status(400).json({
                success: false,
                message: "Image URL is required"
            });
        }

        if (title && typeof title !== 'string') {
            return res.status(400).json({
                success: false,
                message: "Title must be a string"
            });
        }

        // Create banner
        const banner = await Banner.create({
            title: title || null,
            image
        });

        return res.status(201).json({
            success: true,
            message: "Banner created successfully",
            data: banner
        });
    } catch (error) {
        console.error("Create banner error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Update banner by ID
export const updateBanner = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, image } = req.body;

        // Validation
        if (!id || isNaN(parseInt(id))) {
            return res.status(400).json({
                success: false,
                message: "Valid banner ID is required"
            });
        }

        if (!title && !image) {
            return res.status(400).json({
                success: false,
                message: "At least one field (title or image) is required to update"
            });
        }

        if (title && typeof title !== 'string') {
            return res.status(400).json({
                success: false,
                message: "Title must be a string"
            });
        }

        if (image && typeof image !== 'string') {
            return res.status(400).json({
                success: false,
                message: "Image must be a valid URL string"
            });
        }

        // Find banner
        const banner = await Banner.findByPk(id);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }

        // Update banner
        const updateData = {};
        if (title !== undefined) updateData.title = title;
        if (image !== undefined) updateData.image = image;

        await banner.update(updateData);

        return res.status(200).json({
            success: true,
            message: "Banner updated successfully",
            data: banner
        });
    } catch (error) {
        console.error("Update banner error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
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
                message: "Valid banner ID is required"
            });
        }

        // Find banner
        const banner = await Banner.findByPk(id);
        if (!banner) {
            return res.status(404).json({
                success: false,
                message: "Banner not found"
            });
        }

        // Soft delete (if paranoid is enabled) or hard delete
        await banner.destroy();

        return res.status(200).json({
            success: true,
            message: "Banner deleted successfully"
        });
    } catch (error) {
        console.error("Delete banner error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
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
                message: "Request body must be a non-empty array of banners"
            });
        }

        // Validate each banner
        for (const [index, banner] of banners.entries()) {
            if (!banner.image) {
                return res.status(400).json({
                    success: false,
                    message: `Banner at index ${index} is missing required field: image`
                });
            }

            if (banner.title && typeof banner.title !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: `Banner at index ${index} has invalid title (must be string)`
                });
            }

            if (typeof banner.image !== 'string') {
                return res.status(400).json({
                    success: false,
                    message: `Banner at index ${index} has invalid image URL (must be string)`
                });
            }
        }

        // Create banners
        const createdBanners = await Banner.bulkCreate(banners, {
            validate: true,
            returning: true
        });

        return res.status(201).json({
            success: true,
            message: `${createdBanners.length} banners created successfully`,
            data: createdBanners
        });
    } catch (error) {
        console.error("Bulk create banners error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Get active banners (for public use - homepage, etc.)
export const getActiveBanners = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const banners = await Banner.findAll({
            attributes: ['id', 'title', 'image'],
            limit: parseInt(limit),
            order: [['createdAt', 'DESC']]
        });

        return res.status(200).json({
            success: true,
            message: "Active banners fetched successfully",
            data: banners
        });
    } catch (error) {
        console.error("Get active banners error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};
