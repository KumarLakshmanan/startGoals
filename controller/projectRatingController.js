import ProjectRating from "../model/projectRating.js";
import Project from "../model/project.js";
import ProjectPurchase from "../model/projectPurchase.js";
import User from "../model/user.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendServerError,
  sendConflict
} from "../utils/responseHelper.js";

// ===================== PROJECT RATING MANAGEMENT =====================

// Add project rating (Purchased users only)
export const addProjectRating = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { projectId } = req.params;
    const { rating, review, criteria, isRecommended } = req.body;
    const userId = req.user.userId;

    // Validate rating value
    if (!rating || rating < 1 || rating > 5) {
      await transaction.rollback();
      return sendValidationError(res, "Rating must be between 1 and 5");
    }

    // Check if project exists
    const project = await Project.findByPk(projectId, { transaction });
    if (!project) {
      await transaction.rollback();
      return sendNotFound(res, "Project not found");
    }

    // Check if user has purchased the project - REQUIRED
    const purchase = await ProjectPurchase.findOne({
      where: {
        userId,
        projectId,
        paymentStatus: "completed",
      },
      transaction
    });

    if (!purchase) {
      await transaction.rollback();
      return sendForbidden(res, "You can only rate projects you have purchased");
    }

    // Check if user has already rated this project
    const existingRating = await ProjectRating.findOne({
      where: { userId, projectId },
      transaction
    });

    // Create or update rating
    if (existingRating) {
      await existingRating.update({
        rating: parseFloat(rating),
        review: review?.trim() || null,
        criteria: criteria || null,
        isRecommended: isRecommended || null,
        updatedAt: new Date()
      }, { transaction });
      
      // Update project's average rating and rating count
      await updateProjectRatingStats(projectId, transaction);
      
      await transaction.commit();
      
      return sendSuccess(res,  "Rating updated successfully", existingRating);
    } else {
      // Create new rating
      const projectRating = await ProjectRating.create(
        {
          userId,
          projectId,
          purchaseId: purchase.purchaseId,
          rating: parseFloat(rating),
          review: review?.trim() || null,
          criteria: criteria || null,
          isRecommended: isRecommended || null,
          moderationStatus: "approved", // Auto-approve for purchased users
        },
        { transaction },
      );

      // Update project's average rating and rating count
      await updateProjectRatingStats(projectId, transaction);

      await transaction.commit();

      return sendSuccess(res,  "Rating added successfully", projectRating);
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Add project rating error:", error);
    return sendServerError(res, "Failed to add rating", error.message);
  }
};

// Helper function to update project rating statistics
const updateProjectRatingStats = async (projectId, transaction) => {
  try {
    // Calculate average rating
    const avgRating = await ProjectRating.findOne({
      where: {
        projectId,
        moderationStatus: "approved"
      },
      attributes: [
        [sequelize.fn("AVG", sequelize.col("rating")), "avgRating"],
      ],
      transaction
    });

    // Count total ratings
    const totalRatings = await ProjectRating.count({
      where: {
        projectId,
        moderationStatus: "approved"
      },
      transaction
    });

    // Update project stats
    await Project.update(
      {
        averageRating: avgRating.dataValues.avgRating || 0,
        totalRatings: totalRatings || 0,
      },
      {
        where: { projectId },
        transaction
      }
    );
  } catch (error) {
    console.error("Update project rating stats error:", error);
    throw error; // Rethrow to be caught by the calling function
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
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    // Check if project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return sendNotFound(res, "Project not found");
    }

    // Build where conditions
    const whereConditions = {
      projectId: parseInt(projectId),
      status: "approved",
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
          attributes: ["id", "firstName", "lastName", "profilePicture"],
        },
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    // Calculate rating distribution
    const ratingDistribution = await ProjectRating.findAll({
      attributes: [
        "rating",
        [sequelize.fn("COUNT", sequelize.col("rating")), "count"],
      ],
      where: {
        projectId: parseInt(projectId),
        status: "approved",
      },
      group: ["rating"],
      order: [["rating", "DESC"]],
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
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get project ratings error:", error);
    sendServerError(res, "Failed to fetch ratings", error.message);
  }
};

// Update project rating (User can update their own rating)
export const updateProjectRating = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { ratingId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user.userId;

    // Find rating
    const projectRating = await ProjectRating.findByPk(ratingId);
    if (!projectRating) {
      await transaction.rollback();
      return sendNotFound(res, "Rating not found");
    }

    // Check if user owns this rating
    if (projectRating.userId !== userId) {
      await transaction.rollback();
      return sendError(res, "You can only update your own ratings", 403);
    }

    // Validate rating value if provided
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      await transaction.rollback();
      return sendValidationError(res, "Rating must be between 1 and 5");
    }

    // Update rating
    const updateData = {};
    if (rating !== undefined) updateData.rating = parseInt(rating);
    if (review !== undefined) updateData.review = review;
    updateData.status = "approved"; // Reset to approved after update

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
          attributes: ["id", "firstName", "lastName", "profilePicture"],
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "title"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Rating updated successfully",
      data: updatedRating,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update project rating error:", error);
    sendServerError(res, "Failed to update rating", error.message);
  }
};

// Delete project rating (User can delete their own rating, Admin can delete any)
export const deleteProjectRating = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { ratingId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    // Find rating
    const projectRating = await ProjectRating.findByPk(ratingId);
    if (!projectRating) {
      await transaction.rollback();
      return sendNotFound(res, "Rating not found");
    }

    // Check permissions
    if (projectRating.userId !== userId && userRole !== "admin") {
      await transaction.rollback();
      return sendError(res, "Not authorized to delete this rating", 403);
    }

    const projectId = projectRating.projectId;

    // Delete rating
    await projectRating.destroy({ transaction });

    // Update project's average rating and rating count
    await updateProjectRatingStats(projectId, transaction);

    await transaction.commit();

    res.json({
      success: true,
      message: "Rating deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete project rating error:", error);
    sendServerError(res, "Failed to delete rating", error.message);
  }
};

// Get user's project ratings
export const getUserProjectRatings = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: ratings } = await ProjectRating.findAndCountAll({
      where: { userId },
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "title", "previewImages"],
        },
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [["createdAt", "DESC"]],
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: ratings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get user project ratings error:", error);
    sendServerError(res, "Failed to fetch user ratings", error.message);
  }
};

// ===================== ADMIN RATING MODERATION =====================

// Get all ratings for moderation (Admin only)
export const getAllRatingsForModeration = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "pending",
      projectId,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    // Build where conditions
    const whereConditions = {};

    if (status !== "all") {
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
          attributes: [
            "id",
            "firstName",
            "lastName",
            "email",
            "profilePicture",
          ],
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "title"],
        },
        {
          model: User,
          as: "moderator",
          attributes: ["id", "firstName", "lastName"],
          required: false,
        },
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: ratings,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get all ratings for moderation error:", error);
    sendServerError(res, "Failed to fetch ratings for moderation", error.message);
  }
};

// Moderate project rating (Admin only)
export const moderateProjectRating = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { ratingId } = req.params;
    const { status, moderationNotes } = req.body;
    const moderatorId = req.user.userId;

    // Validate status
    if (!["approved", "rejected", "pending"].includes(status)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid status. Must be 'approved', 'rejected', or 'pending'");
    }

    // Find rating
    const projectRating = await ProjectRating.findByPk(ratingId);
    if (!projectRating) {
      await transaction.rollback();
      return sendNotFound(res, "Rating not found");
    }

    // Update rating
    await projectRating.update(
      {
        status,
        moderationNotes,
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
      },
      { transaction },
    );

    // Update project's average rating and rating count
    await updateProjectRatingStats(projectRating.projectId, transaction);

    await transaction.commit();

    // Fetch updated rating with associations
    const updatedRating = await ProjectRating.findByPk(ratingId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "title"],
        },
        {
          model: User,
          as: "moderator",
          attributes: ["id", "firstName", "lastName"],
        },
      ],
    });

    res.json({
      success: true,
      message: "Rating moderated successfully",
      data: updatedRating,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Moderate project rating error:", error);
    sendServerError(res, "Failed to moderate rating", error.message);
  }
};

export default {
  addProjectRating,
  getProjectRatings,
  updateProjectRating,
  deleteProjectRating,
  getUserProjectRatings,
  getAllRatingsForModeration,
  moderateProjectRating,
};
