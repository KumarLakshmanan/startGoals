import News from "../model/news.js";
import User from "../model/user.js";
import Category from "../model/category.js";
import { Op } from "sequelize";

export const createNews = async (req, res) => {
  try {
    const { title, content, shortDescription, thumbnailUrl, coverImage, tags, featured, categoryId } = req.body;
    const authorId = req.user.userId;

    const news = await News.create({
      title,
      content,
      shortDescription,
      thumbnailUrl,
      coverImage,
      authorId,
      categoryId,
      tags: tags ? JSON.parse(tags) : null,
      featured: featured || false,
    });

    // Log activity
    await logAdminActivity({
      adminId: authorId,
      action: 'news_created',
      module: 'news',
      details: `Created news article "${title}"`,
      targetId: news.newsId,
      targetType: 'news',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.status(201).json({
      success: true,
      message: "News created successfully",
      data: news,
    });
  } catch (error) {
    console.error("Error creating news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create news",
      error: error.message,
    });
  }
};

export const getAllNews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status = "active",
      featured,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    if (status !== "all") {
      whereClause.status = status;
    }

    if (featured !== undefined) {
      whereClause.featured = featured === "true";
    }

    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { content: { [Op.iLike]: `%${search}%` } },
        { shortDescription: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const { count, rows } = await News.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "author",
          attributes: ["userId", "username", "profileImage"],
        },
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch news",
      error: error.message,
    });
  }
};

export const getNewsById = async (req, res) => {
  try {
    const { id } = req.params;

    const news = await News.findByPk(id, {
      include: [
        {
          model: User,
          as: "author",
          attributes: ["userId", "username", "profileImage"],
        },
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
      ],
    });

    if (!news) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    // Increment view count
    await news.increment("viewCount");

    res.json({
      success: true,
      data: news,
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch news",
      error: error.message,
    });
  }
};

export const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, shortDescription, thumbnailUrl, coverImage, tags, featured, status, categoryId } = req.body;
    const adminId = req.user.userId;

    const news = await News.findByPk(id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    await news.update({
      title,
      content,
      shortDescription,
      thumbnailUrl,
      coverImage,
      categoryId,
      tags: tags ? JSON.parse(tags) : news.tags,
      featured: featured !== undefined ? featured : news.featured,
      status: status || news.status,
    });

    // Log activity
    await logAdminActivity({
      adminId,
      action: 'news_updated',
      module: 'news',
      details: `Updated news article "${title || news.title}"`,
      targetId: id,
      targetType: 'news',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: "News updated successfully",
      data: news,
    });
  } catch (error) {
    console.error("Error updating news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update news",
      error: error.message,
    });
  }
};

export const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    const news = await News.findByPk(id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    const newsTitle = news.title;
    await news.destroy();

    // Log activity
    await logAdminActivity({
      adminId,
      action: 'news_deleted',
      module: 'news',
      details: `Deleted news article "${newsTitle}"`,
      targetId: id,
      targetType: 'news',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: "News deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete news",
      error: error.message,
    });
  }
};

export const toggleNewsStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    const news = await News.findByPk(id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    const newStatus = news.status === "active" ? "draft" : "active";
    await news.update({ status: newStatus });

    // Log activity
    await logAdminActivity({
      adminId,
      action: newStatus === "active" ? 'news_published' : 'news_unpublished',
      module: 'news',
      details: `${newStatus === "active" ? "Published" : "Unpublished"} news article "${news.title}"`,
      targetId: id,
      targetType: 'news',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: `News ${newStatus === "active" ? "published" : "unpublished"} successfully`,
      data: news,
    });
  } catch (error) {
    console.error("Error toggling news status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle news status",
      error: error.message,
    });
  }
};

export const getFeaturedNews = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const news = await News.findAll({
      where: {
        status: "active",
        featured: true,
      },
      include: [
        {
          model: User,
          as: "author",
          attributes: ["userId", "username", "profileImage"],
        },
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
      ],
      limit: parseInt(limit),
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      data: news,
    });
  } catch (error) {
    console.error("Error fetching featured news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch featured news",
      error: error.message,
    });
  }
};

export const toggleNewsFeatured = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.userId;

    const news = await News.findByPk(id);
    if (!news) {
      return res.status(404).json({
        success: false,
        message: "News not found",
      });
    }

    const newFeaturedStatus = !news.featured;
    await news.update({ featured: newFeaturedStatus });

    // Log activity
    await logAdminActivity({
      adminId,
      action: newFeaturedStatus ? 'news_featured' : 'news_unfeatured',
      module: 'news',
      details: `${newFeaturedStatus ? 'Featured' : 'Unfeatured'} news article "${news.title}"`,
      targetId: id,
      targetType: 'news',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: `News ${newFeaturedStatus ? 'featured' : 'unfeatured'} successfully`,
      data: news,
    });
  } catch (error) {
    console.error("Error toggling news featured status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to toggle news featured status",
      error: error.message,
    });
  }
};

export const bulkDeleteNews = async (req, res) => {
  try {
    const { ids } = req.body;
    const adminId = req.user.userId;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "News IDs array is required",
      });
    }

    const deletedCount = await News.destroy({
      where: {
        newsId: ids,
      },
    });

    // Log activity
    await logAdminActivity({
      adminId,
      action: 'news_bulk_deleted',
      module: 'news',
      details: `Bulk deleted ${deletedCount} news articles`,
      targetId: null,
      targetType: 'news_bulk',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: `${deletedCount} news articles deleted successfully`,
      data: { deletedCount },
    });
  } catch (error) {
    console.error("Error bulk deleting news:", error);
    res.status(500).json({
      success: false,
      message: "Failed to bulk delete news",
      error: error.message,
    });
  }
};

export const uploadThumbnail = async (req, res) => {
  try {
    const adminId = req.user.userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // In a real implementation, you would upload to cloud storage
    // For now, we'll simulate the upload
    const thumbnailUrl = `/uploads/thumbnails/${Date.now()}_${req.file.originalname}`;

    // Log activity
    await logAdminActivity({
      adminId,
      action: 'thumbnail_uploaded',
      module: 'news',
      details: `Uploaded thumbnail: ${req.file.originalname}`,
      targetId: null,
      targetType: 'file',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
    });

    res.json({
      success: true,
      message: "Thumbnail uploaded successfully",
      data: {
        url: thumbnailUrl,
        filename: req.file.originalname,
        size: req.file.size,
      },
    });
  } catch (error) {
    console.error("Error uploading thumbnail:", error);
    res.status(500).json({
      success: false,
      message: "Failed to upload thumbnail",
      error: error.message,
    });
  }
};

// Helper function to log admin activities
const logAdminActivity = async (activityData) => {
  try {
    // In a real implementation, you would save to an activity log table
    // For now, we'll just log to console
    console.log('Admin Activity Logged:', {
      timestamp: new Date(),
      ...activityData,
    });

    // You could implement database logging here:
    // await ActivityLog.create({
    //   adminId: activityData.adminId,
    //   action: activityData.action,
    //   module: activityData.module,
    //   details: activityData.details,
    //   targetId: activityData.targetId,
    //   targetType: activityData.targetType,
    //   ipAddress: activityData.ipAddress,
    //   userAgent: activityData.userAgent,
    //   timestamp: new Date(),
    // });

  } catch (error) {
    console.error('Error logging admin activity:', error);
  }
};
