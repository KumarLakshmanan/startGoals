import ProjectRating from "../model/projectRating.js";
import Project from "../model/project.js";
import ProjectPurchase from "../model/projectPurchase.js";
import User from "../model/user.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
import { 
    handleError, 
    handleValidationError, 
    handleNotFoundError, 
    handleAuthorizationError,
    successResponse 
} from "../middleware/standardErrorHandler.js";

// ===================== PROJECT RATING MANAGEMENT =====================

// Add project rating (Purchased users only)
export const addProjectRating = async (req, res, next) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { projectId, rating, review } = req.body;
    const userId = req.user.id;

    // Check if project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      await transaction.rollback();
      return handleNotFoundError(res, "Project not found");
    }

    // Check if user has purchased the project
    const purchase = await ProjectPurchase.findOne({
      where: {
        userId,
        projectId,
        paymentStatus: 'completed'
      }
    });

    if (!purchase) {
      await transaction.rollback();
      return handleAuthorizationError(res, "You can only rate projects you have purchased");
    }

    // Check if user has already rated this project
    const existingRating = await ProjectRating.findOne({
      where: { userId, projectId }
    });

    if (existingRating) {
      await transaction.rollback();
      return handleValidationError(res, [{ field: 'projectId', message: 'You have already rated this project' }]);
    }

    // Create rating
    const projectRating = await ProjectRating.create({
      userId,
      projectId,
      purchaseId: purchase.id,
      rating: parseInt(rating),
      review: review || null,
      status: 'approved' // Auto-approve for now, can add moderation later
    }, { transaction });

    // Update project's average rating and rating count
    await updateProjectRatingStats(projectId, transaction);

    await transaction.commit();

    // Fetch complete rating with associations
    const completeRating = await ProjectRating.findByPk(projectRating.id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "profilePicture"]
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "title"]
        }
      ]
    });

    return successResponse(res, completeRating, "Rating added successfully", 201);

  } catch (error) {
    await transaction.rollback();
    return handleError(res, error, "Failed to add rating");
  }
};

// Get project ratings with pagination
export const getProjectRatings = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { 
      page = 1, 
      limit = 10, 
      rating, 
      sortBy = 'createdAt', 
      sortOrder = 'DESC' 
    } = req.query;

    // Check if project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Build where conditions
    const whereConditions = {
      projectId: parseInt(projectId),
      status: 'approved'
    };

    if (rating) {
      whereConditions.rating = parseInt(rating);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: ratings } = await ProjectRating.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "profilePicture"]
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    // Calculate rating distribution
    const ratingDistribution = await ProjectRating.findAll({
      attributes: [
        'rating',
        [sequelize.fn('COUNT', sequelize.col('rating')), 'count']
      ],
      where: {
        projectId: parseInt(projectId),
        status: 'approved'
      },
      group: ['rating'],
      order: [['rating', 'DESC']]
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: {
        ratings,
        ratingDistribution,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error("Get project ratings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ratings",
      error: error.message
    });
  }
};

// Update project rating (User can update their own rating)
export const updateProjectRating = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { ratingId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.id;

    // Find rating
    const projectRating = await ProjectRating.findByPk(ratingId);
    if (!projectRating) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Rating not found"
      });
    }

    // Check if user owns this rating
    if (projectRating.userId !== userId) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "You can only update your own ratings"
      });
    }

    // Validate rating value if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    // Update rating
    const updateData = {};
    if (rating !== undefined) updateData.rating = parseInt(rating);
    if (review !== undefined) updateData.review = review;
    updateData.status = 'approved'; // Reset to approved after update

    await projectRating.update(updateData, { transaction });

    // Update project's average rating and rating count
    await updateProjectRatingStats(projectRating.projectId, transaction);

    await transaction.commit();

    // Fetch updated rating with associations
    const updatedRating = await ProjectRating.findByPk(ratingId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "profilePicture"]
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "title"]
        }
      ]
    });

    res.json({
      success: true,
      message: "Rating updated successfully",
      data: updatedRating
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Update project rating error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update rating",
      error: error.message
    });
  }
};

// Delete project rating (User can delete their own rating, Admin can delete any)
export const deleteProjectRating = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { ratingId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Find rating
    const projectRating = await ProjectRating.findByPk(ratingId);
    if (!projectRating) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Rating not found"
      });
    }

    // Check permissions
    if (projectRating.userId !== userId && userRole !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this rating"
      });
    }

    const projectId = projectRating.projectId;

    // Delete rating
    await projectRating.destroy({ transaction });

    // Update project's average rating and rating count
    await updateProjectRatingStats(projectId, transaction);

    await transaction.commit();

    res.json({
      success: true,
      message: "Rating deleted successfully"
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Delete project rating error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete rating",
      error: error.message
    });
  }
};

// Get user's project ratings
export const getUserProjectRatings = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: ratings } = await ProjectRating.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "title", "previewImages"]
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: ratings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Get user project ratings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user ratings",
      error: error.message
    });
  }
};

// ===================== ADMIN RATING MODERATION =====================

// Get all ratings for moderation (Admin only)
export const getAllRatingsForModeration = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = 'pending', 
      projectId,
      sortBy = 'createdAt', 
      sortOrder = 'DESC' 
    } = req.query;

    // Build where conditions
    const whereConditions = {};
    
    if (status !== 'all') {
      whereConditions.status = status;
    }
    
    if (projectId) {
      whereConditions.projectId = parseInt(projectId);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: ratings } = await ProjectRating.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "profilePicture"]
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "title"]
        },
        {
          model: User,
          as: "moderator",
          attributes: ["id", "firstName", "lastName"],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: ratings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Get all ratings for moderation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch ratings for moderation",
      error: error.message
    });
  }
};

// Moderate project rating (Admin only)
export const moderateProjectRating = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { ratingId } = req.params;
    const { status, moderationNotes } = req.body;
    const moderatorId = req.user.id;

    // Validate status
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'approved', 'rejected', or 'pending'"
      });
    }

    // Find rating
    const projectRating = await ProjectRating.findByPk(ratingId);
    if (!projectRating) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Rating not found"
      });
    }

    // Update rating
    await projectRating.update({
      status,
      moderationNotes,
      moderatedBy: moderatorId,
      moderatedAt: new Date()
    }, { transaction });

    // Update project's average rating and rating count
    await updateProjectRatingStats(projectRating.projectId, transaction);

    await transaction.commit();

    // Fetch updated rating with associations
    const updatedRating = await ProjectRating.findByPk(ratingId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"]
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "title"]
        },
        {
          model: User,
          as: "moderator",
          attributes: ["id", "firstName", "lastName"]
        }
      ]
    });

    res.json({
      success: true,
      message: "Rating moderated successfully",
      data: updatedRating
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Moderate project rating error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to moderate rating",
      error: error.message
    });
  }
};

// ===================== HELPER FUNCTIONS =====================

// Update project rating statistics
const updateProjectRatingStats = async (projectId, transaction) => {
  try {
    // Calculate average rating and count
    const ratingStats = await ProjectRating.findAll({
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        [sequelize.fn('COUNT', sequelize.col('rating')), 'ratingCount']
      ],
      where: {
        projectId,
        status: 'approved'
      },
      raw: true
    });

    const stats = ratingStats[0] || {};
    const averageRating = parseFloat(stats.avgRating) || 0;
    const totalRatings = parseInt(stats.ratingCount) || 0;

    // Update project
    await Project.update({
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal place
      totalRatings
    }, {
      where: { id: projectId },
      transaction
    });

  } catch (error) {
    console.error("Update project rating stats error:", error);
    throw error;
  }
};

export default {
  addProjectRating,
  getProjectRatings,
  updateProjectRating,
  deleteProjectRating,
  getUserProjectRatings,
  getAllRatingsForModeration,
  moderateProjectRating
};
