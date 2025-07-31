// ===========================================================================================
// RATING & REVIEW MANAGEMENT CONTROLLER
// Unified controller for handling course ratings, instructor ratings, and review management
// Combines user-facing rating functionality with comprehensive admin management features
// ===========================================================================================

import CourseRating from "../model/courseRating.js";
import InstructorRating from "../model/instructorRating.js";
import ProjectRating from "../model/projectRating.js";
import Course from "../model/course.js";
import Project from "../model/project.js";
import User from "../model/user.js";
import Enrollment from "../model/enrollment.js";
import ProjectPurchase from "../model/projectPurchase.js";
import Order from "../model/order.js";
import OrderItem from "../model/orderItem.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
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

// Import course rating methods from courseController
import {
  getCourseRatingsStats,
  getCourseReviews,
  createCourseReview
} from "./courseController.js";

// Re-export course rating methods
export { getCourseRatingsStats, getCourseReviews, createCourseReview };

// Create or update course rating
export const rateCourse = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { courseId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.userId;

    // Authentication validation
    if (!userId) {
      await transaction.rollback();
      return sendError(res, 401, "Authentication required");
    }

    // Rating validation
    if (!rating || rating < 1 || rating > 5) {
      await transaction.rollback();
      return sendValidationError(res, "Rating must be between 1 and 5");
    }

    // Check if course exists
    const course = await Course.findByPk(courseId, { transaction });
    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
    }

    // Check if user is enrolled (STRICT requirement for rating)
    const enrollment = await Enrollment.findOne({
      where: {
        userId,
        courseId,
        paymentStatus: 'completed'
      },
      transaction
    });

    if (!enrollment) {
      await transaction.rollback();
      return sendForbidden(res, "You must purchase this course before you can rate it");
    }

    // Create or update rating
    const [courseRating, created] = await CourseRating.upsert(
      {
        courseId,
        userId,
        rating: parseFloat(rating),
        review: review?.trim() || null,
        isVerified: true, // Always true since we've verified enrollment
        moderationStatus: review ? "pending" : "approved", // Auto-approve ratings without reviews
      },
      {
        returning: true,
        transaction
      },
    );

    // Recalculate course average rating
    await updateCourseAverageRating(courseId, transaction);

    await transaction.commit();

    return sendSuccess(res, created ? 201 : 200, created
      ? "Rating submitted successfully"
      : "Rating updated successfully", {
      ratingId: courseRating.ratingId,
      rating: courseRating.rating,
      review: courseRating.review,
      isVerified: courseRating.isVerified,
      moderationStatus: courseRating.moderationStatus,
      createdAt: courseRating.createdAt,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Rate course error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// Get course ratings with pagination
export const getCourseRatings = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      page = 1,
      limit = 10,
      rating,
      verified = null,
      sortBy = "helpful",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    const whereClause = {
      courseId,
      moderationStatus: "approved",
    };

    if (rating) {
      whereClause.rating = parseFloat(rating);
    }

    if (verified !== null) {
      whereClause.isVerified = verified === "true";
    }

    // Build order clause
    let orderClause;
    switch (sortBy) {
      case "helpful":
        orderClause = [
          ["isHelpful", "DESC"],
          ["createdAt", "DESC"],
        ];
        break;
      case "recent":
        orderClause = [["createdAt", "DESC"]];
        break;
      case "rating_high":
        orderClause = [
          ["rating", "DESC"],
          ["createdAt", "DESC"],
        ];
        break;
      case "rating_low":
        orderClause = [
          ["rating", "ASC"],
          ["createdAt", "DESC"],
        ];
        break;
      default:
        orderClause = [["createdAt", "DESC"]];
    }

    const { count, rows: ratings } = await CourseRating.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "username", "profileImage"],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: orderClause,
    });

    // Get rating summary
    const ratingSummary = await CourseRating.findAll({
      where: { courseId, moderationStatus: "approved" },
      attributes: [
        "rating",
        [sequelize.fn("COUNT", sequelize.col("rating")), "count"],
      ],
      group: ["rating"],
      order: [["rating", "DESC"]],
    });

    const totalRatings = await CourseRating.count({
      where: { courseId, moderationStatus: "approved" },
    });

    const avgRating = await CourseRating.findOne({
      where: { courseId, moderationStatus: "approved" },
      attributes: [[sequelize.fn("AVG", sequelize.col("rating")), "avgRating"]],
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return sendSuccess(res, 200, "Course ratings fetched successfully", {
      ratings: ratings.map((rating) => ({
        ratingId: rating.ratingId,
        rating: rating.rating,
        review: rating.review,
        isVerified: rating.isVerified,
        isHelpful: rating.isHelpful,
        createdAt: rating.createdAt,
        user: rating.user,
      })),
      summary: {
        averageRating: parseFloat(avgRating?.dataValues?.avgRating || 0),
        totalRatings,
        distribution: ratingSummary.map((item) => ({
          rating: item.rating,
          count: parseInt(item.dataValues.count),
        })),
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get course ratings error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// Rate instructor
export const rateInstructor = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { instructorId } = req.params;
    const { rating, review, courseId, criteria } = req.body;
    const userId = req.user?.userId;

    // Validation
    if (!userId) {
      await transaction.rollback();
      return sendError(res, 401, "Authentication required");
    }

    if (!rating || rating < 1 || rating > 5) {
      await transaction.rollback();
      return sendValidationError(res, "Rating must be between 1 and 5");
    }

    // Check if instructor exists and is actually a teacher
    const instructor = await User.findOne({
      where: { userId: instructorId, role: "teacher" },
      transaction
    });

    if (!instructor) {
      await transaction.rollback();
      return sendNotFound(res, "Instructor not found");
    }

    // Check enrollment and verification status - REQUIRED
    if (!courseId) {
      await transaction.rollback();
      return sendValidationError(res, "You must specify a course to rate this instructor");
    }

    // Check if the course is taught by this instructor
    const course = await Course.findOne({
      where: {
        courseId,
        createdBy: instructorId
      },
      transaction
    });

    if (!course) {
      await transaction.rollback();
      return sendValidationError(res, "This instructor is not teaching the specified course");
    }

    // Verify that the user has purchased the course
    const enrollment = await Enrollment.findOne({
      where: {
        userId,
        courseId,
        paymentStatus: 'completed'
      },
      transaction
    });

    if (!enrollment) {
      await transaction.rollback();
      return sendForbidden(res, "You must purchase and enroll in a course by this instructor before rating them");
    }

    // Create or update rating
    const [instructorRating, created] = await InstructorRating.upsert(
      {
        instructorId,
        userId,
        courseId,
        rating: parseFloat(rating),
        review: review?.trim() || null,
        criteria: criteria || null,
        isVerified: true, // Always true since we've verified enrollment
        moderationStatus: review ? "pending" : "approved",
      },
      {
        returning: true,
        transaction
      },
    );

    // Update instructor average rating
    await updateInstructorAverageRating(instructorId, transaction);

    await transaction.commit();

    return sendSuccess(res, created ? 201 : 200, created
      ? "Instructor rating submitted successfully"
      : "Instructor rating updated successfully", {
      ratingId: instructorRating.ratingId,
      rating: instructorRating.rating,
      review: instructorRating.review,
      criteria: instructorRating.criteria,
      isVerified: instructorRating.isVerified,
      moderationStatus: instructorRating.moderationStatus,
      createdAt: instructorRating.createdAt,
    });
  } catch (error) {
    console.error("Rate instructor error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// Get instructor ratings
export const getInstructorRatings = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const {
      page = 1,
      limit = 10,
      rating,
      courseId,
      sortBy = "recent",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = {
      instructorId,
      moderationStatus: "approved",
    };

    if (rating) {
      whereClause.rating = parseFloat(rating);
    }

    if (courseId) {
      whereClause.courseId = courseId;
    }

    let orderClause;
    switch (sortBy) {
      case "recent":
        orderClause = [["createdAt", "DESC"]];
        break;
      case "rating_high":
        orderClause = [
          ["rating", "DESC"],
          ["createdAt", "DESC"],
        ];
        break;
      case "rating_low":
        orderClause = [
          ["rating", "ASC"],
          ["createdAt", "DESC"],
        ];
        break;
      default:
        orderClause = [["createdAt", "DESC"]];
    }

    const { count, rows: ratings } = await InstructorRating.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "username", "profileImage"],
        },
        {
          model: Course,
          as: "course",
          attributes: ["courseId", "title"],
          required: false,
        },
      ],
      limit: parseInt(limit),
      offset,
      order: orderClause,
    });

    // Get rating summary
    const avgRating = await InstructorRating.findOne({
      where: { instructorId, moderationStatus: "approved" },
      attributes: [[sequelize.fn("AVG", sequelize.col("rating")), "avgRating"]],
    });

    const totalRatings = await InstructorRating.count({
      where: { instructorId, moderationStatus: "approved" },
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return sendSuccess(res, 200, "Instructor ratings fetched successfully", {
      ratings: ratings.map((rating) => ({
        ratingId: rating.ratingId,
        rating: rating.rating,
        review: rating.review,
        criteria: rating.criteria,
        isVerified: rating.isVerified,
        createdAt: rating.createdAt,
        user: rating.user,
        course: rating.course,
      })),
      summary: {
        averageRating: parseFloat(avgRating?.dataValues?.avgRating || 0),
        totalRatings,
      },
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Get instructor ratings error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// Mark review as helpful
export const markReviewHelpful = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { type = "course" } = req.body; // course or instructor

    let rating;
    if (type === "course") {
      rating = await CourseRating.findByPk(ratingId);
    } else {
      rating = await InstructorRating.findByPk(ratingId);
    }

    if (!rating) {
      return sendNotFound(res, "Rating not found");
    }

    // Increment helpful count
    await rating.increment("isHelpful");

    return sendSuccess(res, 200, "Review marked as helpful", {
      helpfulCount: rating.isHelpful + 1,
    });
  } catch (error) {
    console.error("Mark review helpful error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// ===================== COMPREHENSIVE REVIEW & RATING MANAGEMENT =====================

/**
 * Get all reviews with advanced filtering and moderation tools
 * GET /api/admin/reviews
 */
export const getAllReviews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type = "all", // all, course, project, instructor
      status = "all", // all, pending, approved, rejected, hidden
      rating,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
      dateRange,
      flagged = false,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let allReviews = [];

    // Course Reviews
    if (type === "all" || type === "course") {
      const courseWhereConditions = {};

      if (status !== "all") {
        courseWhereConditions.status = status;
      }

      if (rating) {
        courseWhereConditions.rating = parseInt(rating);
      }

      if (flagged === "true") {
        courseWhereConditions.flaggedCount = { [Op.gt]: 0 };
      }

      if (search) {
        courseWhereConditions[Op.or] = [
          { review: { [Op.iLike]: `%${search}%` } },
          { "$User.firstName$": { [Op.iLike]: `%${search}%` } },
          { "$Course.title$": { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (dateRange) {
        const dates = dateRange.split(",");
        if (dates.length === 2) {
          courseWhereConditions.createdAt = {
            [Op.between]: [new Date(dates[0]), new Date(dates[1])],
          };
        }
      }

      const courseReviews = await CourseRating.findAll({
        where: courseWhereConditions,
        include: [
          {
            model: User,
            attributes: [
              "userId",
              "firstName",
              "lastName",
              "email",
              "profileImage",
            ],
          },
          {
            model: Course,
            attributes: ["courseId", "title", "thumbnail"],
          },
        ],
        order: [[sortBy, sortOrder]],
        raw: false,
      });

      allReviews = allReviews.concat(
        courseReviews.map((review) => ({
          ...review.dataValues,
          type: "course",
          contentTitle: review.Course?.title,
          userInfo: review.User,
        })),
      );
    }

    // Project Reviews (if ProjectRating model exists)
    if (type === "all" || type === "project") {
      try {
        const projectWhereConditions = {};

        if (status !== "all") {
          projectWhereConditions.status = status;
        }

        if (rating) {
          projectWhereConditions.rating = parseInt(rating);
        }

        if (flagged === "true") {
          projectWhereConditions.flaggedCount = { [Op.gt]: 0 };
        }

        if (search) {
          projectWhereConditions[Op.or] = [
            { review: { [Op.iLike]: `%${search}%` } },
            { "$User.firstName$": { [Op.iLike]: `%${search}%` } },
            { "$Project.title$": { [Op.iLike]: `%${search}%` } },
          ];
        }

        if (dateRange) {
          const dates = dateRange.split(",");
          if (dates.length === 2) {
            projectWhereConditions.createdAt = {
              [Op.between]: [new Date(dates[0]), new Date(dates[1])],
            };
          }
        }

        const projectReviews = await ProjectRating.findAll({
          where: projectWhereConditions,
          include: [
            {
              model: User,
              attributes: [
                "userId",
                "firstName",
                "lastName",
                "email",
                "profileImage",
              ],
            },
            {
              model: Project,
              attributes: ["projectId", "title", "thumbnail"],
            },
          ],
          order: [[sortBy, sortOrder]],
          raw: false,
        });

        allReviews = allReviews.concat(
          projectReviews.map((review) => ({
            ...review.dataValues,
            type: "project",
            contentTitle: review.Project?.title,
            userInfo: review.User,
          })),
        );
      } catch (error) {
        // Project ratings might not exist, skip silently
        console.log("Project ratings not available:", error.message);
      }
    }

    // Instructor Reviews
    if (type === "all" || type === "instructor") {
      const instructorWhereConditions = {};

      if (status !== "all") {
        instructorWhereConditions.moderationStatus = status;
      }

      if (rating) {
        instructorWhereConditions.rating = parseInt(rating);
      }

      if (flagged === "true") {
        instructorWhereConditions.flaggedCount = { [Op.gt]: 0 };
      }

      if (search) {
        instructorWhereConditions[Op.or] = [
          { review: { [Op.iLike]: `%${search}%` } },
          { "$Reviewer.firstName$": { [Op.iLike]: `%${search}%` } },
          { "$Instructor.firstName$": { [Op.iLike]: `%${search}%` } },
        ];
      }

      if (dateRange) {
        const dates = dateRange.split(",");
        if (dates.length === 2) {
          instructorWhereConditions.createdAt = {
            [Op.between]: [new Date(dates[0]), new Date(dates[1])],
          };
        }
      }

      const instructorReviews = await InstructorRating.findAll({
        where: instructorWhereConditions,
        include: [
          {
            model: User,
            as: "Reviewer",
            attributes: [
              "userId",
              "firstName",
              "lastName",
              "email",
              "profileImage",
            ],
          },
          {
            model: User,
            as: "Instructor",
            attributes: [
              "userId",
              "firstName",
              "lastName",
              "email",
              "profileImage",
            ],
          },
        ],
        order: [[sortBy, sortOrder]],
        raw: false,
      });

      allReviews = allReviews.concat(
        instructorReviews.map((review) => ({
          ...review.dataValues,
          type: "instructor",
          contentTitle: `${review.Instructor?.firstName} ${review.Instructor?.lastName}`,
          userInfo: review.Reviewer,
          review: review.review,
        })),
      );
    }

    // Sort all reviews together
    allReviews.sort((a, b) => {
      if (sortOrder === "ASC") {
        return new Date(a[sortBy]) - new Date(b[sortBy]);
      }
      return new Date(b[sortBy]) - new Date(a[sortBy]);
    });

    // Paginate results
    const paginatedReviews = allReviews.slice(offset, offset + parseInt(limit));
    const totalReviews = allReviews.length;

    // Calculate statistics
    const stats = {
      total: totalReviews,
      pending: allReviews.filter(
        (r) => r.status === "pending" || r.moderationStatus === "pending",
      ).length,
      approved: allReviews.filter(
        (r) => r.status === "approved" || r.moderationStatus === "approved",
      ).length,
      rejected: allReviews.filter(
        (r) => r.status === "rejected" || r.moderationStatus === "rejected",
      ).length,
      flagged: allReviews.filter((r) => (r.flaggedCount || 0) > 0).length,
      averageRating:
        allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews || 0,
    };

    const responseData = {
      reviews: paginatedReviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / parseInt(limit)),
        totalReviews,
        hasNext: offset + parseInt(limit) < totalReviews,
        hasPrev: parseInt(page) > 1,
      },
      stats,
    };

    return sendSuccess(res, 200, "Reviews fetched successfully", responseData);
  } catch (error) {
    console.error("Get all reviews error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Moderate a specific review (approve/reject/hide)
 * PUT /api/admin/reviews/:id/moderate
 */
export const moderateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, reason, type } = req.body; // action: approve, reject, hide
    const adminId = req.user?.userId;

    if (!["approve", "reject", "hide"].includes(action)) {
      return sendValidationError(res, "Invalid moderation action");
    }

    let review = null;
    let updateData = {
      moderatedBy: adminId,
      moderatedAt: new Date(),
      moderationReason: reason,
    };

    // Determine status based on action
    const statusMap = {
      approve: "approved",
      reject: "rejected",
      hide: "hidden",
    };

    if (type === "course") {
      updateData.status = statusMap[action];
      const [updatedRows] = await CourseRating.update(updateData, {
        where: { ratingId: id },
        returning: true,
      });

      if (updatedRows === 0) {
        return sendNotFound(res, "Course review not found");
      }

      review = await CourseRating.findByPk(id, {
        include: [
          { model: User, attributes: ["firstName", "lastName", "email"] },
          { model: Course, attributes: ["title"] },
        ],
      });

      // Update course average rating if approved
      if (action === "approve") {
        await updateCourseAverageRating(review.courseId);
      }
    } else if (type === "instructor") {
      updateData.moderationStatus = statusMap[action];
      const [updatedRows] = await InstructorRating.update(updateData, {
        where: { ratingId: id },
        returning: true,
      });

      if (updatedRows === 0) {
        return sendNotFound(res, "Instructor review not found");
      }

      review = await InstructorRating.findByPk(id, {
        include: [
          {
            model: User,
            as: "Reviewer",
            attributes: ["firstName", "lastName", "email"],
          },
          {
            model: User,
            as: "Instructor",
            attributes: ["firstName", "lastName", "email"],
          },
        ],
      });

      // Update instructor average rating if approved
      if (action === "approve") {
        await updateInstructorAverageRating(review.instructorId);
      }
    }

    return sendSuccess(res, 200, `Review ${action}d successfully`, { review, action, moderatedBy: adminId });
  } catch (error) {
    console.error("Moderate review error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get review analytics and statistics
 * GET /api/admin/reviews/analytics
 */
export const getReviewAnalytics = async (req, res) => {
  try {
    const { timeRange = "30d", type = "all" } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const dateFilter = {
      createdAt: { [Op.gte]: startDate },
    };

    let analytics = {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      moderationStats: {
        pending: 0,
        approved: 0,
        rejected: 0,
        hidden: 0,
      },
      flaggedReviews: 0,
      reviewsByType: {
        course: 0,
        instructor: 0,
      },
      topRatedContent: [],
      recentActivity: [],
    };

    // Course Reviews Analytics
    if (type === "all" || type === "course") {
      const courseReviews = await CourseRating.findAll({
        where: dateFilter,
        include: [{ model: Course, attributes: ["title"] }],
      });

      analytics.reviewsByType.course = courseReviews.length;
      analytics.totalReviews += courseReviews.length;

      courseReviews.forEach((review) => {
        analytics.averageRating += review.rating;
        analytics.ratingDistribution[review.rating]++;

        if (review.status === "pending") analytics.moderationStats.pending++;
        else if (review.status === "approved")
          analytics.moderationStats.approved++;
        else if (review.status === "rejected")
          analytics.moderationStats.rejected++;
        else if (review.status === "hidden") analytics.moderationStats.hidden++;

        if ((review.flaggedCount || 0) > 0) analytics.flaggedReviews++;
      });
    }

    // Instructor Reviews Analytics
    if (type === "all" || type === "instructor") {
      const instructorReviews = await InstructorRating.findAll({
        where: dateFilter,
        include: [
          {
            model: User,
            as: "Instructor",
            attributes: ["firstName", "lastName"],
          },
        ],
      });

      analytics.reviewsByType.instructor = instructorReviews.length;
      analytics.totalReviews += instructorReviews.length;

      instructorReviews.forEach((review) => {
        analytics.averageRating += review.rating;
        analytics.ratingDistribution[review.rating]++;

        if (review.moderationStatus === "pending")
          analytics.moderationStats.pending++;
        else if (review.moderationStatus === "approved")
          analytics.moderationStats.approved++;
        else if (review.moderationStatus === "rejected")
          analytics.moderationStats.rejected++;
        else if (review.moderationStatus === "hidden")
          analytics.moderationStats.hidden++;

        if ((review.flaggedCount || 0) > 0) analytics.flaggedReviews++;
      });
    }

    // Calculate final average
    if (analytics.totalReviews > 0) {
      analytics.averageRating =
        analytics.averageRating / analytics.totalReviews;
    }

    // Get top rated content
    if (type === "all" || type === "course") {
      const topCourses = await Course.findAll({
        where: { averageRating: { [Op.gte]: 4.0 } },
        order: [
          ["averageRating", "DESC"],
          ["totalRatings", "DESC"],
        ],
        limit: 5,
        attributes: ["courseId", "title", "averageRating", "totalRatings"],
      });

      analytics.topRatedContent.push(
        ...topCourses.map((course) => ({
          type: "course",
          id: course.courseId,
          title: course.title,
          rating: course.averageRating,
          totalRatings: course.totalRatings,
        })),
      );
    }

    // Get recent activity (last 10 reviews)
    const recentCourseReviews = await CourseRating.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
      include: [
        { model: User, attributes: ["firstName", "lastName"] },
        { model: Course, attributes: ["title"] },
      ],
    });

    analytics.recentActivity = recentCourseReviews.map((review) => ({
      type: "course",
      reviewId: review.ratingId,
      rating: review.rating,
      userName: `${review.User.firstName} ${review.User.lastName}`,
      contentTitle: review.Course.title,
      createdAt: review.createdAt,
      status: review.status,
    }));

    return sendSuccess(res, 200, "Review analytics fetched successfully", analytics);
  } catch (error) {
    console.error("Get review analytics error:", error);
    return sendServerError(res, error);
  }
};

// Helper function to update instructor average rating
async function updateInstructorAverageRating(instructorId, transaction = null) {
  try {
    const avgData = await InstructorRating.findOne({
      where: { instructorId, moderationStatus: "approved" },
      attributes: [
        [sequelize.fn("AVG", sequelize.col("rating")), "avgRating"],
        [sequelize.fn("COUNT", sequelize.col("rating")), "totalRatings"],
      ],
      transaction
    });

    // We would need to add these fields to the User model for instructors
    // For now, we'll just log the calculated ratings
    const avgRating = parseFloat(avgData?.dataValues?.avgRating || 0);
    const totalRatings = parseInt(avgData?.dataValues?.totalRatings || 0);

    console.log(`Instructor ${instructorId} ratings updated: ${avgRating} (${totalRatings} total)`);

    // TODO: Update instructor profile with rating data when field is added to User model
    // await User.update(
    //  {
    //    instructorRating: avgRating,
    //    instructorTotalRatings: totalRatings,
    //  },
    //  {
    //    where: { userId: instructorId },
    //    transaction
    //  },
    // );
  } catch (error) {
    console.error("Update instructor average rating error:", error);
    throw error; // Rethrow to be caught by the calling function
  }
}

// ===================== PROJECT RATING FUNCTIONS =====================

// Get project rating statistics
export const getProjectRatingsStats = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Check if project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return sendNotFound(res, "Project not found");
    }

    // Get rating summary
    const ratingSummary = await ProjectRating.findAll({
      where: {
        projectId,
        moderationStatus: "approved"
      },
      attributes: [
        "rating",
        [sequelize.fn("COUNT", sequelize.col("rating")), "count"],
      ],
      group: ["rating"],
      order: [["rating", "DESC"]],
    });

    const totalRatings = await ProjectRating.count({
      where: {
        projectId,
        moderationStatus: "approved"
      },
    });

    const avgRating = await ProjectRating.findOne({
      where: {
        projectId,
        moderationStatus: "approved"
      },
      attributes: [
        [sequelize.fn("AVG", sequelize.col("rating")), "averageRating"],
      ],
    });

    // Format rating distribution
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0
    };

    ratingSummary.forEach(({ rating, count }) => {
      ratingDistribution[rating] = parseInt(count);
    });

    return sendSuccess(res, 200, "Project rating statistics retrieved", {
      projectId,
      totalRatings,
      averageRating: avgRating?.dataValues?.averageRating
        ? parseFloat(avgRating.dataValues.averageRating).toFixed(2)
        : "0.00",
      ratingDistribution
    });

  } catch (error) {
    console.error("Get project rating stats error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// Get project reviews with pagination
export const getProjectReviews = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      page = 1,
      limit = 10,
      rating,
      verified = null,
      sortBy = "helpful",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    const whereClause = {
      projectId,
      moderationStatus: "approved",
    };

    if (rating) {
      whereClause.rating = parseFloat(rating);
    }

    if (verified !== null) {
      whereClause.isVerified = verified === "true";
    }

    // Build order clause
    let orderClause;
    switch (sortBy) {
      case "helpful":
        orderClause = [
          ["helpfulCount", "DESC"],
          ["createdAt", "DESC"],
        ];
        break;
      case "recent":
        orderClause = [["createdAt", "DESC"]];
        break;
      case "rating_high":
        orderClause = [
          ["rating", "DESC"],
          ["createdAt", "DESC"],
        ];
        break;
      case "rating_low":
        orderClause = [
          ["rating", "ASC"],
          ["createdAt", "DESC"],
        ];
        break;
      default:
        orderClause = [["createdAt", "DESC"]];
    }

    const { count, rows: reviews } = await ProjectRating.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          attributes: ["userId", "username", "profileImage"],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: orderClause,
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return sendSuccess(res, 200, "Project reviews retrieved successfully", {
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });

  } catch (error) {
    console.error("Get project reviews error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// Create or update project review
export const createProjectReview = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { projectId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.userId;

    // Authentication validation
    if (!userId) {
      await transaction.rollback();
      return sendError(res, 401, "Authentication required");
    }

    // Rating validation
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

    // Check if user has purchased the project
    const purchase = await ProjectPurchase.findOne({
      where: {
        userId,
        projectId,
        paymentStatus: 'completed'
      },
      transaction
    });

    if (!purchase) {
      await transaction.rollback();
      return sendForbidden(res, "You must purchase this project before you can rate it");
    }

    // Create or update rating
    const [projectRating, created] = await ProjectRating.upsert(
      {
        projectId,
        userId,
        purchaseId: purchase.purchaseId,
        rating: parseFloat(rating),
        review: review?.trim() || null,
        isVerified: true,
        moderationStatus: 'approved',
      },
      {
        returning: true,
        transaction
      },
    );

    // Update project average rating
    await updateProjectAverageRating(projectId, transaction);

    await transaction.commit();

    return sendSuccess(res, created ? 201 : 200, created
      ? "Review submitted successfully"
      : "Review updated successfully", {
      ratingId: projectRating.ratingId,
      rating: projectRating.rating,
      review: projectRating.review,
      isVerified: projectRating.isVerified,
      moderationStatus: projectRating.moderationStatus,
      createdAt: projectRating.createdAt,
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Create project review error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};

// Update project average rating helper function
async function updateProjectAverageRating(projectId, transaction) {
  const stats = await ProjectRating.findOne({
    where: {
      projectId,
      moderationStatus: "approved"
    },
    attributes: [
      [sequelize.fn("AVG", sequelize.col("rating")), "averageRating"],
      [sequelize.fn("COUNT", sequelize.col("rating")), "totalRatings"],
    ],
    transaction,
  });

  const averageRating = stats?.dataValues?.averageRating || 0;
  const totalRatings = stats?.dataValues?.totalRatings || 0;

  await Project.update(
    {
      averageRating: parseFloat(averageRating).toFixed(2),
      totalRatings: parseInt(totalRatings),
    },
    {
      where: { projectId },
      transaction,
    }
  );
}

// Update course average rating helper function
async function updateCourseAverageRating(courseId, transaction = null) {
  const stats = await CourseRating.findOne({
    where: {
      courseId,
      moderationStatus: "approved"
    },
    attributes: [
      [sequelize.fn("AVG", sequelize.col("rating")), "averageRating"],
      [sequelize.fn("COUNT", sequelize.col("rating")), "totalRatings"],
    ],
    transaction,
  });

  const averageRating = stats?.dataValues?.averageRating || 0;
  const totalRatings = stats?.dataValues?.totalRatings || 0;

  await Course.update(
    {
      averageRating: parseFloat(averageRating).toFixed(2),
      totalRatings: parseInt(totalRatings),
    },
    {
      where: { courseId },
      transaction,
    }
  );
}


// Edit course review/rating
export const editCourseReview = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { ratingId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.userId;

    // Authentication validation
    if (!userId) {
      await transaction.rollback();
      return sendError(res, 401, "Authentication required");
    }

    // Rating validation
    if (rating && (rating < 1 || rating > 5)) {
      await transaction.rollback();
      return sendValidationError(res, "Rating must be between 1 and 5");
    }

    // Find the rating
    const courseRating = await CourseRating.findOne({
      where: {
        ratingId,
        userId
      },
      transaction
    });

    if (!courseRating) {
      await transaction.rollback();
      return sendNotFound(res, "Rating not found or you don't have permission to edit it");
    }

    // Update the rating
    const updateData = {};
    if (rating !== undefined) updateData.rating = parseFloat(rating);
    if (review !== undefined) updateData.review = review?.trim() || null;

    // If review is being added/modified, set to pending moderation
    if (review !== undefined && review?.trim()) {
      updateData.moderationStatus = "pending";
    }

    await courseRating.update(updateData, { transaction });

    // Recalculate course average rating
    await updateCourseAverageRating(courseRating.courseId, transaction);

    await transaction.commit();

    return sendSuccess(res, 200, "Review updated successfully", {
      ratingId: courseRating.ratingId,
      rating: courseRating.rating,
      review: courseRating.review,
      moderationStatus: courseRating.moderationStatus,
      updatedAt: courseRating.updatedAt,
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Edit course review error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};


// Edit project review/rating
export const editProjectReview = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { ratingId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.userId;

    // Authentication validation
    if (!userId) {
      await transaction.rollback();
      return sendError(res, 401, "Authentication required");
    }

    // Rating validation
    if (rating && (rating < 1 || rating > 5)) {
      await transaction.rollback();
      return sendValidationError(res, "Rating must be between 1 and 5");
    }

    // Find the rating
    const projectRating = await ProjectRating.findOne({
      where: {
        ratingId,
        userId
      },
      transaction
    });

    if (!projectRating) {
      await transaction.rollback();
      return sendNotFound(res, "Rating not found or you don't have permission to edit it");
    }

    // Update the rating
    const updateData = {};
    if (rating !== undefined) updateData.rating = parseFloat(rating);
    if (review !== undefined) updateData.review = review?.trim() || null;

    // If review is being added/modified, set to pending moderation
    if (review !== undefined && review?.trim()) {
      updateData.moderationStatus = "pending";
    }

    await projectRating.update(updateData, { transaction });

    // Recalculate project average rating
    await updateProjectAverageRating(projectRating.projectId, transaction);

    await transaction.commit();

    return sendSuccess(res, 200, "Review updated successfully", {
      ratingId: projectRating.ratingId,
      rating: projectRating.rating,
      review: projectRating.review,
      moderationStatus: projectRating.moderationStatus,
      updatedAt: projectRating.updatedAt,
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Edit project review error:", error);
    return sendServerError(res, error.message || "Internal server error");
  }
};
