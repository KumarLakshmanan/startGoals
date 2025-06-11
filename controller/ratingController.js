import CourseRating from "../model/courseRating.js";
import InstructorRating from "../model/instructorRating.js";
import Course from "../model/course.js";
import User from "../model/user.js";
import Enrollment from "../model/enrollment.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";

// Create or update course rating
export const rateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.userId;

    // Validation
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found"
      });
    }

    // Check if user is enrolled (for verified rating)
    const enrollment = await Enrollment.findOne({
      where: { userId, courseId }
    });

    const isVerified = !!enrollment;

    // Create or update rating
    const [courseRating, created] = await CourseRating.upsert({
      courseId,
      userId,
      rating: parseFloat(rating),
      review: review?.trim() || null,
      isVerified,
      moderationStatus: review ? 'pending' : 'approved' // Auto-approve ratings without reviews
    }, {
      returning: true
    });

    // Recalculate course average rating
    await updateCourseAverageRating(courseId);

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? "Rating submitted successfully" : "Rating updated successfully",
      data: {
        ratingId: courseRating.ratingId,
        rating: courseRating.rating,
        review: courseRating.review,
        isVerified: courseRating.isVerified,
        moderationStatus: courseRating.moderationStatus,
        createdAt: courseRating.createdAt
      }
    });
  } catch (error) {
    console.error("Rate course error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
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
      sortBy = 'helpful' 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    const whereClause = { 
      courseId,
      moderationStatus: 'approved'
    };

    if (rating) {
      whereClause.rating = parseFloat(rating);
    }

    if (verified !== null) {
      whereClause.isVerified = verified === 'true';
    }

    // Build order clause
    let orderClause;
    switch (sortBy) {
      case 'helpful':
        orderClause = [['isHelpful', 'DESC'], ['createdAt', 'DESC']];
        break;
      case 'recent':
        orderClause = [['createdAt', 'DESC']];
        break;
      case 'rating_high':
        orderClause = [['rating', 'DESC'], ['createdAt', 'DESC']];
        break;
      case 'rating_low':
        orderClause = [['rating', 'ASC'], ['createdAt', 'DESC']];
        break;
      default:
        orderClause = [['createdAt', 'DESC']];
    }

    const { count, rows: ratings } = await CourseRating.findAndCountAll({
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

    // Get rating summary
    const ratingSummary = await CourseRating.findAll({
      where: { courseId, moderationStatus: 'approved' },
      attributes: [
        'rating',
        [sequelize.fn('COUNT', sequelize.col('rating')), 'count']
      ],
      group: ['rating'],
      order: [['rating', 'DESC']]
    });

    const totalRatings = await CourseRating.count({
      where: { courseId, moderationStatus: 'approved' }
    });

    const avgRating = await CourseRating.findOne({
      where: { courseId, moderationStatus: 'approved' },
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']]
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return res.status(200).json({
      success: true,
      message: "Course ratings fetched successfully",
      data: {
        ratings: ratings.map(rating => ({
          ratingId: rating.ratingId,
          rating: rating.rating,
          review: rating.review,
          isVerified: rating.isVerified,
          isHelpful: rating.isHelpful,
          createdAt: rating.createdAt,
          user: rating.user
        })),
        summary: {
          averageRating: parseFloat(avgRating?.dataValues?.avgRating || 0),
          totalRatings,
          distribution: ratingSummary.map(item => ({
            rating: item.rating,
            count: parseInt(item.dataValues.count)
          }))
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error("Get course ratings error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

// Rate instructor
export const rateInstructor = async (req, res) => {
  try {
    const { instructorId } = req.params;
    const { rating, review, courseId, criteria } = req.body;
    const userId = req.user?.userId;

    // Validation
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5"
      });
    }

    // Check if instructor exists and is actually a teacher
    const instructor = await User.findOne({
      where: { userId: instructorId, role: 'teacher' }
    });

    if (!instructor) {
      return res.status(404).json({
        success: false,
        message: "Instructor not found"
      });
    }

    // Check verification status
    let isVerified = false;
    if (courseId) {
      const enrollment = await Enrollment.findOne({
        where: { userId, courseId },
        include: [{
          model: Course,
          where: { createdBy: instructorId }
        }]
      });
      isVerified = !!enrollment;
    }

    // Create or update rating
    const [instructorRating, created] = await InstructorRating.upsert({
      instructorId,
      userId,
      courseId: courseId || null,
      rating: parseFloat(rating),
      review: review?.trim() || null,
      criteria: criteria || null,
      isVerified,
      moderationStatus: review ? 'pending' : 'approved'
    }, {
      returning: true
    });

    // Update instructor average rating
    await updateInstructorAverageRating(instructorId);

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? "Instructor rating submitted successfully" : "Instructor rating updated successfully",
      data: {
        ratingId: instructorRating.ratingId,
        rating: instructorRating.rating,
        review: instructorRating.review,
        criteria: instructorRating.criteria,
        isVerified: instructorRating.isVerified,
        moderationStatus: instructorRating.moderationStatus,
        createdAt: instructorRating.createdAt
      }
    });
  } catch (error) {
    console.error("Rate instructor error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
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
      sortBy = 'recent' 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = { 
      instructorId,
      moderationStatus: 'approved'
    };

    if (rating) {
      whereClause.rating = parseFloat(rating);
    }

    if (courseId) {
      whereClause.courseId = courseId;
    }

    let orderClause;
    switch (sortBy) {
      case 'recent':
        orderClause = [['createdAt', 'DESC']];
        break;
      case 'rating_high':
        orderClause = [['rating', 'DESC'], ['createdAt', 'DESC']];
        break;
      case 'rating_low':
        orderClause = [['rating', 'ASC'], ['createdAt', 'DESC']];
        break;
      default:
        orderClause = [['createdAt', 'DESC']];
    }

    const { count, rows: ratings } = await InstructorRating.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'profileImage']
        },
        {
          model: Course,
          as: 'course',
          attributes: ['courseId', 'title'],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset,
      order: orderClause
    });

    // Get rating summary
    const avgRating = await InstructorRating.findOne({
      where: { instructorId, moderationStatus: 'approved' },
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']]
    });

    const totalRatings = await InstructorRating.count({
      where: { instructorId, moderationStatus: 'approved' }
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return res.status(200).json({
      success: true,
      message: "Instructor ratings fetched successfully",
      data: {
        ratings: ratings.map(rating => ({
          ratingId: rating.ratingId,
          rating: rating.rating,
          review: rating.review,
          criteria: rating.criteria,
          isVerified: rating.isVerified,
          createdAt: rating.createdAt,
          user: rating.user,
          course: rating.course
        })),
        summary: {
          averageRating: parseFloat(avgRating?.dataValues?.avgRating || 0),
          totalRatings
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error("Get instructor ratings error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

// Mark review as helpful
export const markReviewHelpful = async (req, res) => {
  try {
    const { ratingId } = req.params;
    const { type = 'course' } = req.body; // course or instructor

    let rating;
    if (type === 'course') {
      rating = await CourseRating.findByPk(ratingId);
    } else {
      rating = await InstructorRating.findByPk(ratingId);
    }

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: "Rating not found"
      });
    }

    // Increment helpful count
    await rating.increment('isHelpful');

    return res.status(200).json({
      success: true,
      message: "Review marked as helpful",
      data: {
        helpfulCount: rating.isHelpful + 1
      }
    });
  } catch (error) {
    console.error("Mark review helpful error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

// Helper function to update course average rating
async function updateCourseAverageRating(courseId) {
  try {
    const avgData = await CourseRating.findOne({
      where: { courseId, moderationStatus: 'approved' },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        [sequelize.fn('COUNT', sequelize.col('rating')), 'totalRatings']
      ]
    });

    const avgRating = parseFloat(avgData?.dataValues?.avgRating || 0);
    const totalRatings = parseInt(avgData?.dataValues?.totalRatings || 0);

    // Update course with calculated rating
    await Course.update({
      averageRating: avgRating,
      totalRatings: totalRatings
    }, {
      where: { courseId }
    });
  } catch (error) {
    console.error("Update course average rating error:", error);
  }
}

// Helper function to update instructor average rating
async function updateInstructorAverageRating(instructorId) {
  try {
    const avgData = await InstructorRating.findOne({
      where: { instructorId, moderationStatus: 'approved' },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
        [sequelize.fn('COUNT', sequelize.col('rating')), 'totalRatings']
      ]
    });

    const avgRating = parseFloat(avgData?.dataValues?.avgRating || 0);
    const totalRatings = parseInt(avgData?.dataValues?.totalRatings || 0);

    // Update user profile with calculated rating
    await User.update({
      averageRating: avgRating,
      totalRatings: totalRatings
    }, {
      where: { userId: instructorId, role: 'teacher' }
    });
  } catch (error) {
    console.error("Update instructor average rating error:", error);
  }
}
