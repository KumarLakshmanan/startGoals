// ===========================================================================================
// COMPREHENSIVE RATING & REVIEW MANAGEMENT CONTROLLER
// Unified controller for handling course ratings, project ratings, instructor ratings
// Includes stats, reviews, helpful votes, and CRUD operations
// ===========================================================================================

import CourseRating from "../model/courseRating.js";
import InstructorRating from "../model/instructorRating.js";
import ProjectRating from "../model/projectRating.js";
import RatingHelpful from "../model/ratingHelpful.js";
import Course from "../model/course.js";
import Project from "../model/project.js";
import User from "../model/user.js";
import Enrollment from "../model/enrollment.js";
import ProjectPurchase from "../model/projectPurchase.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
import {
  sendSuccess,
  sendValidationError,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
  sendForbidden,
} from "../utils/responseHelper.js";
import { isValidUUID } from "../utils/commonUtils.js";

// ===========================================================================================
// HELPER FUNCTIONS
// ===========================================================================================

// Check if user has purchased/enrolled in the entity
const checkUserAccess = async (entityType, entityId, userId, transaction = null) => {
  if (entityType === 'course') {
    return await Enrollment.findOne({
      where: {
        userId,
        courseId: entityId,
        paymentStatus: 'completed'
      },
      transaction
    });
  } else if (entityType === 'project') {
    return await ProjectPurchase.findOne({
      where: {
        userId,
        projectId: entityId,
        paymentStatus: 'completed'
      },
      transaction
    });
  }
  // For instructor ratings, check if user has any completed course with that instructor
  else if (entityType === 'instructor') {
    const instructorCourses = await Course.findAll({
      where: { instructorId: entityId },
      attributes: ['courseId'],
      transaction
    });
    
    if (instructorCourses.length === 0) return null;
    
    return await Enrollment.findOne({
      where: {
        userId,
        courseId: { [Op.in]: instructorCourses.map(c => c.courseId) },
        paymentStatus: 'completed'
      },
      transaction
    });
  }
  
  return null;
};

// Get rating model and entity model based on type
const getRatingModel = (entityType) => {
  switch (entityType) {
    case 'course': return CourseRating;
    case 'project': return ProjectRating;
    case 'instructor': return InstructorRating;
    default: throw new Error('Invalid entity type');
  }
};

const getEntityModel = (entityType) => {
  switch (entityType) {
    case 'course': return Course;
    case 'project': return Project;
    case 'instructor': return User;
    default: throw new Error('Invalid entity type');
  }
};

// Update average rating for an entity
const updateAverageRating = async (entityType, entityId, transaction = null) => {
  const RatingModel = getRatingModel(entityType);
  const EntityModel = getEntityModel(entityType);
  
  const stats = await RatingModel.findOne({
    where: { 
      [entityType === 'instructor' ? 'instructorId' : `${entityType}Id`]: entityId,
      moderationStatus: 'approved'
    },
    attributes: [
      [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
      [sequelize.fn('COUNT', sequelize.col('rating')), 'totalRatings']
    ],
    transaction
  });
  
  const avgRating = parseFloat(stats?.dataValues?.avgRating || 0);
  const totalRatings = parseInt(stats?.dataValues?.totalRatings || 0);
  
  await EntityModel.update(
    {
      averageRating: avgRating,
      totalRatings: totalRatings
    },
    {
      where: { 
        [entityType === 'instructor' ? 'userId' : `${entityType}Id`]: entityId 
      },
      transaction
    }
  );
};

// ===========================================================================================
// RATINGS STATS API
// ===========================================================================================

export const getRatingsStats = async (req, res) => {
  try {
    let { entityType, entityId } = req.params;
    
    // Validate UUID format
    if (!isValidUUID(entityId)) {
      return sendValidationError(res, "Invalid ID format");
    }
    
    // Normalize entity type (remove 's' if plural)
    if (entityType.endsWith('s')) {
      entityType = entityType.slice(0, -1);
    }
    
    if (!['course', 'project', 'instructor'].includes(entityType)) {
      return sendValidationError(res, "Invalid entity type");
    }
    
    const RatingModel = getRatingModel(entityType);
    const entityIdField = entityType === 'instructor' ? 'instructorId' : `${entityType}Id`;
    
    // Get overall stats
    const overallStats = await RatingModel.findOne({
      where: { 
        [entityIdField]: entityId,
        moderationStatus: 'approved'
      },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
        [sequelize.fn('COUNT', sequelize.col('rating')), 'totalRatings']
      ]
    });
    
    // Get rating distribution
    const ratingDistribution = await RatingModel.findAll({
      where: { 
        [entityIdField]: entityId,
        moderationStatus: 'approved'
      },
      attributes: [
        'rating',
        [sequelize.fn('COUNT', sequelize.col('rating')), 'count']
      ],
      group: ['rating'],
      order: [['rating', 'DESC']]
    });
    
    // Format distribution
    const distribution = {};
    for (let i = 1; i <= 5; i++) {
      distribution[i] = 0;
    }
    
    ratingDistribution.forEach(item => {
      distribution[Math.floor(item.rating)] = parseInt(item.dataValues.count);
    });
    
    const stats = {
      averageRating: parseFloat(overallStats?.dataValues?.averageRating || 0),
      totalRatings: parseInt(overallStats?.dataValues?.totalRatings || 0),
      distribution
    };
    
    return sendSuccess(res,  "Rating statistics retrieved successfully", stats);
    
  } catch (error) {
    console.error("Get ratings stats error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// ===========================================================================================
// REVIEWS LIST API
// ===========================================================================================

export const getReviews = async (req, res) => {
  try {
    let { entityType, entityId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      rating,
      verified
    } = req.query;

    // Validate UUID format
    if (!isValidUUID(entityId)) {
      return sendValidationError(res, "Invalid ID format");
    }
    
    // Normalize entity type (remove 's' if plural)
    if (entityType.endsWith('s')) {
      entityType = entityType.slice(0, -1);
    }
    
    if (!['course', 'project', 'instructor'].includes(entityType)) {
      return sendValidationError(res, "Invalid entity type");
    }
    
    const RatingModel = getRatingModel(entityType);
    const entityIdField = entityType === 'instructor' ? 'instructorId' : `${entityType}Id`;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where conditions
    const whereClause = {
      [entityIdField]: entityId,
      moderationStatus: 'approved',
      review: { [Op.ne]: null } // Only include reviews with text
    };
    
    if (rating) {
      whereClause.rating = parseFloat(rating);
    }
    
    if (verified !== undefined) {
      whereClause.isVerified = verified === 'true';
    }
    
    // Build order clause
    let orderClause;
    switch (sortBy) {
      case 'helpful':
        orderClause = [
          ['helpfulVotes', sortOrder],
          ['createdAt', 'DESC']
        ];
        break;
      case 'rating':
        orderClause = [
          ['rating', sortOrder],
          ['createdAt', 'DESC']
        ];
        break;
      case 'createdAt':
      default:
        orderClause = [['createdAt', sortOrder]];
    }
    
    const { count, rows: reviews } = await RatingModel.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'profileImage']
        }
      ],
      limit: parseInt(limit),
      offset,
      order: orderClause
    });
    
    const result = {
      reviews: reviews.map(review => ({
        ratingId: review.ratingId,
        rating: review.rating,
        review: review.review,
        helpfulVotes: review.helpfulVotes,
        notHelpfulVotes: review.notHelpfulVotes,
        isVerified: review.isVerified,
        createdAt: review.createdAt,
        user: review.user
      })),
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalReviews: count,
        hasNext: offset + parseInt(limit) < count,
        hasPrev: parseInt(page) > 1
      }
    };
    
    return sendSuccess(res,  "Reviews retrieved successfully", result);
    
  } catch (error) {
    console.error("Get reviews error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// ===========================================================================================
// CREATE REVIEW API
// ===========================================================================================

export const createReview = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    let { entityType, entityId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.userId;
    
    // Validation
    if (!userId) {
      await transaction.rollback();
      return sendUnauthorized(res, "Authentication required");
    }
    
    // Normalize entity type (remove 's' if plural)
    if (entityType.endsWith('s')) {
      entityType = entityType.slice(0, -1);
    }
    
    if (!['course', 'project', 'instructor'].includes(entityType)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid entity type");
    }
    
    if (!rating || rating < 1 || rating > 5) {
      await transaction.rollback();
      return sendValidationError(res, "Rating must be between 1 and 5");
    }
    
    // Check if entity exists
    const EntityModel = getEntityModel(entityType);
    const entity = await EntityModel.findByPk(entityId, { transaction });
    
    if (!entity) {
      await transaction.rollback();
      return sendNotFound(res, `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} not found`);
    }
    
    // Check if user has access (purchased/enrolled)
    const hasAccess = await checkUserAccess(entityType, entityId, userId, transaction);
    if (!hasAccess) {
      await transaction.rollback();
      return sendForbidden(res, `You must purchase/enroll in this ${entityType} before you can rate it`);
    }
    
    // Create or update rating
    const RatingModel = getRatingModel(entityType);
    const entityIdField = entityType === 'instructor' ? 'instructorId' : `${entityType}Id`;
    
    const ratingData = {
      [entityIdField]: entityId,
      userId,
      rating: parseFloat(rating),
      review: review?.trim() || null,
      isVerified: true,
      moderationStatus: 'approved'
    };
    
    // For instructor ratings, include courseId if provided
    if (entityType === 'instructor' && req.body.courseId) {
      ratingData.courseId = req.body.courseId;
    }
    
    const [ratingRecord, created] = await RatingModel.upsert(ratingData, {
      returning: true,
      transaction
    });
    
    // Update average rating
    await updateAverageRating(entityType, entityId, transaction);
    
    await transaction.commit();
    
    return sendSuccess(res, 
      created ? "Review created successfully" : "Review updated successfully", {
      ratingId: ratingRecord.ratingId,
      rating: ratingRecord.rating,
      review: ratingRecord.review,
      isVerified: ratingRecord.isVerified,
      createdAt: ratingRecord.createdAt
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error("Create review error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// ===========================================================================================
// GET MY RATINGS API
// ===========================================================================================

export const getMyRatings = async (req, res) => {
  try {
    const userId = req.user?.userId || req.user?.id;
    const { type, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;
    
    if (!userId) {
      return sendUnauthorized(res, "Authentication required");
    }

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    let allRatings = [];

    // Get ratings from all models unless type is specified
    const typesToQuery = type ? [type] : ['course', 'project', 'instructor'];

    for (const entityType of typesToQuery) {
      if (!['course', 'project', 'instructor'].includes(entityType)) {
        continue;
      }

      const RatingModel = getRatingModel(entityType);
      const EntityModel = getEntityModel(entityType);

      try {
        const ratings = await RatingModel.findAll({
          where: { 
            userId,
            deletedAt: null 
          },
          include: [
            {
              model: EntityModel,
              as: entityType,
              attributes: entityType === 'instructor' 
                ? ['userId', 'username', 'profileImage']
                : [`${entityType}Id`, 'title', 'thumbnail'],
              required: false
            }
          ],
          order: [[sortBy, sortOrder.toUpperCase()]]
        });

        // Add entity type to each rating
        const ratingsWithType = ratings.map(rating => ({
          ...rating.toJSON(),
          entityType
        }));

        allRatings.push(...ratingsWithType);
      } catch (modelError) {
        console.log(`Error fetching ${entityType} ratings:`, modelError.message);
        // Continue with other types even if one fails
      }
    }

    // Sort all ratings by the specified criteria
    allRatings.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder.toUpperCase() === 'DESC') {
        return bValue > aValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

    // Apply pagination
    const totalRatings = allRatings.length;
    const paginatedRatings = allRatings.slice(offset, offset + limitNum);

    return sendSuccess(res,  "My ratings retrieved successfully", {
      ratings: paginatedRatings.map(rating => ({
        ratingId: rating.ratingId,
        entityType: rating.entityType,
        entityId: rating[`${rating.entityType}Id`],
        rating: rating.rating,
        review: rating.review,
        helpfulVotes: rating.helpfulVotes || 0,
        notHelpfulVotes: rating.notHelpfulVotes || 0,
        isVerified: rating.isVerified,
        moderationStatus: rating.moderationStatus,
        createdAt: rating.createdAt,
        updatedAt: rating.updatedAt,
        entity: rating[rating.entityType]
      })),
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalRatings / limitNum),
        totalRatings,
        hasNext: pageNum < Math.ceil(totalRatings / limitNum),
        hasPrev: pageNum > 1
      }
    });

  } catch (error) {
    console.error("Get my ratings error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// ===========================================================================================
// HELPFUL/NOT HELPFUL API
// ===========================================================================================

export const markReviewHelpful = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    let { entityType, ratingId } = req.params;
    let { isHelpful } = req.body; // Can be set by the wrapper function
    const userId = req.user?.userId;
    
    // If isHelpful is not provided, assume true for /helpful endpoint
    if (isHelpful === undefined) {
      isHelpful = true;
    }
    
    if (!userId) {
      await transaction.rollback();
      return sendUnauthorized(res, "Authentication required");
    }
    
    // Normalize entity type (remove 's' if plural)
    if (entityType.endsWith('s')) {
      entityType = entityType.slice(0, -1);
    }
    
    if (!['course', 'project', 'instructor'].includes(entityType)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid entity type");
    }
    
    if (typeof isHelpful !== 'boolean') {
      await transaction.rollback();
      return sendValidationError(res, "isHelpful must be a boolean value");
    }
    
    const entityTypeSingular = entityType;
    const RatingModel = getRatingModel(entityTypeSingular);
    
    // Check if rating exists
    const rating = await RatingModel.findByPk(ratingId, { transaction });
    if (!rating) {
      await transaction.rollback();
      return sendNotFound(res, "Rating not found");
    }
    
    // Check if user has purchased the entity (only purchased users can vote)
    const entityIdField = entityTypeSingular === 'instructor' ? 'instructorId' : `${entityTypeSingular}Id`;
    const entityId = rating[entityIdField];
    
    const hasAccess = await checkUserAccess(entityTypeSingular, entityId, userId, transaction);
    if (!hasAccess) {
      await transaction.rollback();
      return sendForbidden(res, `You must purchase/enroll in this ${entityTypeSingular} to vote on reviews`);
    }
    
    // Check if user already voted
    const existingVote = await RatingHelpful.findOne({
      where: {
        ratingId,
        userId,
        ratingType: entityTypeSingular
      },
      transaction
    });
    
    let message;
    
    if (existingVote) {
      // Update existing vote
      const oldIsHelpful = existingVote.isHelpful;
      
      if (oldIsHelpful === isHelpful) {
        // Same vote - remove it
        await existingVote.destroy({ transaction });
        
        // Update rating counts
        if (isHelpful) {
          await rating.decrement('helpfulVotes', { transaction });
        } else {
          await rating.decrement('notHelpfulVotes', { transaction });
        }
        
        message = "Vote removed successfully";
      } else {
        // Different vote - update it
        await existingVote.update({ isHelpful }, { transaction });
        
        // Update rating counts
        if (isHelpful) {
          await rating.increment('helpfulVotes', { transaction });
          await rating.decrement('notHelpfulVotes', { transaction });
        } else {
          await rating.increment('notHelpfulVotes', { transaction });
          await rating.decrement('helpfulVotes', { transaction });
        }
        
        message = `Marked as ${isHelpful ? 'helpful' : 'not helpful'} successfully`;
      }
    } else {
      // Create new vote
      await RatingHelpful.create({
        ratingId,
        userId,
        ratingType: entityTypeSingular,
        isHelpful
      }, { transaction });
      
      // Update rating counts
      if (isHelpful) {
        await rating.increment('helpfulVotes', { transaction });
      } else {
        await rating.increment('notHelpfulVotes', { transaction });
      }
      
      message = `Marked as ${isHelpful ? 'helpful' : 'not helpful'} successfully`;
    }
    
    await transaction.commit();
    
    // Get updated rating
    await rating.reload();
    
    return sendSuccess(res,  message, {
      ratingId: rating.ratingId,
      helpfulVotes: rating.helpfulVotes,
      notHelpfulVotes: rating.notHelpfulVotes
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error("Mark review helpful error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// ===========================================================================================
// NOT HELPFUL REVIEW API
// ===========================================================================================

export const markReviewNotHelpful = async (req, res) => {
  // Set isHelpful to false and call the main helpful function
  req.body.isHelpful = false;
  return markReviewHelpful(req, res);
};

// ===========================================================================================
// UPDATE REVIEW API
// ===========================================================================================

export const updateReview = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    let { entityType, ratingId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.userId;
    
    if (!userId) {
      await transaction.rollback();
      return sendUnauthorized(res, "Authentication required");
    }
    
    // Normalize entity type (remove 's' if plural)
    if (entityType.endsWith('s')) {
      entityType = entityType.slice(0, -1);
    }
    
    if (!['course', 'project', 'instructor'].includes(entityType)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid entity type");
    }
    
    if (rating && (rating < 1 || rating > 5)) {
      await transaction.rollback();
      return sendValidationError(res, "Rating must be between 1 and 5");
    }
    
    const entityTypeSingular = entityType;
    const RatingModel = getRatingModel(entityTypeSingular);
    
    // Find rating and check ownership
    const ratingRecord = await RatingModel.findOne({
      where: { ratingId, userId },
      transaction
    });
    
    if (!ratingRecord) {
      await transaction.rollback();
      return sendNotFound(res, "Rating not found or you don't have permission to edit it");
    }
    
    // Update rating
    const updateData = {};
    if (rating) updateData.rating = parseFloat(rating);
    if (review !== undefined) updateData.review = review?.trim() || null;
    
    await ratingRecord.update(updateData, { transaction });
    
    // Update average rating if rating changed
    if (rating) {
      const entityIdField = entityTypeSingular === 'instructor' ? 'instructorId' : `${entityTypeSingular}Id`;
      await updateAverageRating(entityTypeSingular, ratingRecord[entityIdField], transaction);
    }
    
    await transaction.commit();
    
    return sendSuccess(res,  "Review updated successfully", {
      ratingId: ratingRecord.ratingId,
      rating: ratingRecord.rating,
      review: ratingRecord.review,
      updatedAt: ratingRecord.updatedAt
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error("Update review error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// ===========================================================================================
// DELETE REVIEW API
// ===========================================================================================

export const deleteReview = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    let { entityType, ratingId } = req.params;
    const userId = req.user?.userId;
    const isAdmin = req.user?.role === 'admin';
    
    if (!userId) {
      await transaction.rollback();
      return sendUnauthorized(res, "Authentication required");
    }
    
    // Normalize entity type (remove 's' if plural)
    if (entityType.endsWith('s')) {
      entityType = entityType.slice(0, -1);
    }
    
    if (!['course', 'project', 'instructor'].includes(entityType)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid entity type");
    }
    
    const entityTypeSingular = entityType;
    const RatingModel = getRatingModel(entityTypeSingular);
    
    // Find rating and check ownership or admin
    const whereClause = isAdmin ? { ratingId } : { ratingId, userId };
    const ratingRecord = await RatingModel.findOne({
      where: whereClause,
      transaction
    });
    
    if (!ratingRecord) {
      await transaction.rollback();
      return sendNotFound(res, "Rating not found or you don't have permission to delete it");
    }
    
    // Store entity ID for updating average rating
    const entityIdField = entityTypeSingular === 'instructor' ? 'instructorId' : `${entityTypeSingular}Id`;
    const entityId = ratingRecord[entityIdField];
    
    // Delete associated helpful votes
    await RatingHelpful.destroy({
      where: { ratingId },
      transaction
    });
    
    // Delete rating
    await ratingRecord.destroy({ transaction });
    
    // Update average rating
    await updateAverageRating(entityTypeSingular, entityId, transaction);
    
    await transaction.commit();
    
    return sendSuccess(res,  "Review deleted successfully");
    
  } catch (error) {
    await transaction.rollback();
    console.error("Delete review error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// ===========================================================================================
// GET MY SPECIFIC RATING API
// ===========================================================================================

export const getMySpecificRating = async (req, res) => {
  try {
    let { entityType, ratingId } = req.params;
    const userId = req.user?.userId;
    
    if (!userId) {
      return sendUnauthorized(res, "Authentication required");
    }
    
    // Normalize entity type (remove 's' if plural)
    if (entityType.endsWith('s')) {
      entityType = entityType.slice(0, -1);
    }
    
    if (!['course', 'project', 'instructor'].includes(entityType)) {
      return sendValidationError(res, "Invalid entity type");
    }
    
    const RatingModel = getRatingModel(entityType);
    
    const rating = await RatingModel.findOne({
      where: { 
        ratingId,
        userId 
      },
      include: [
        {
          model: getEntityModel(entityType),
          as: entityType,
          attributes: entityType === 'instructor' 
            ? ['userId', 'username', 'profileImage']
            : [`${entityType}Id`, 'title', 'thumbnail']
        }
      ]
    });
    
    if (!rating) {
      return sendNotFound(res, "Rating not found or you don't have permission to view it");
    }
    
    return sendSuccess(res,  "My rating retrieved successfully", {
      ratingId: rating.ratingId,
      rating: rating.rating,
      review: rating.review,
      helpfulVotes: rating.helpfulVotes,
      notHelpfulVotes: rating.notHelpfulVotes,
      isVerified: rating.isVerified,
      createdAt: rating.createdAt,
      updatedAt: rating.updatedAt,
      [entityType]: rating[entityType]
    });
    
  } catch (error) {
    console.error("Get my specific rating error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// ===========================================================================================
// LEGACY COMPATIBILITY EXPORTS
// ===========================================================================================

// For backward compatibility with existing routes

export const getCourseRatingsStats = (req, res) => {
  req.params.entityType = 'course';
  req.params.entityId = req.params.courseId;
  if (!isValidUUID(req.params.entityId)) {
    return sendValidationError(res, "Invalid ID format");
  }
  return getRatingsStats(req, res);
};

export const getCourseReviews = (req, res) => {
  req.params.entityType = 'course';
  req.params.entityId = req.params.courseId;
  if (!isValidUUID(req.params.entityId)) {
    return sendValidationError(res, "Invalid ID format");
  }
  return getReviews(req, res);
};

export const createCourseReview = (req, res) => {
  req.params.entityType = 'course';
  req.params.entityId = req.params.courseId;
  if (!isValidUUID(req.params.entityId)) {
    return sendValidationError(res, "Invalid ID format");
  }
  return createReview(req, res);
};

export const getProjectRatingsStats = (req, res) => {
  req.params.entityType = 'project';
  req.params.entityId = req.params.projectId;
  if (!isValidUUID(req.params.entityId)) {
    return sendValidationError(res, "Invalid ID format");
  }
  return getRatingsStats(req, res);
};

export const getProjectReviews = (req, res) => {
  req.params.entityType = 'project';
  req.params.entityId = req.params.projectId;
  if (!isValidUUID(req.params.entityId)) {
    return sendValidationError(res, "Invalid ID format");
  }
  return getReviews(req, res);
};

export const createProjectReview = (req, res) => {
  req.params.entityType = 'project';
  req.params.entityId = req.params.projectId;
  if (!isValidUUID(req.params.entityId)) {
    return sendValidationError(res, "Invalid ID format");
  }
  return createReview(req, res);
};

export const getInstructorRatingsStats = (req, res) => {
  req.params.entityType = 'instructor';
  req.params.entityId = req.params.instructorId;
  if (!isValidUUID(req.params.entityId)) {
    return sendValidationError(res, "Invalid ID format");
  }
  return getRatingsStats(req, res);
};

export const getInstructorReviews = (req, res) => {
  req.params.entityType = 'instructor';
  req.params.entityId = req.params.instructorId;
  if (!isValidUUID(req.params.entityId)) {
    return sendValidationError(res, "Invalid ID format");
  }
  return getReviews(req, res);
};

export const createInstructorReview = (req, res) => {
  req.params.entityType = 'instructor';
  req.params.entityId = req.params.instructorId;
  if (!isValidUUID(req.params.entityId)) {
    return sendValidationError(res, "Invalid ID format");
  }
  return createReview(req, res);
};
