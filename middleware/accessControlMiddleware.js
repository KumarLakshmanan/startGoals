import { ProjectPurchase, Course, Project } from '../model/associations.js';
import Enrollment from '../model/enrollment.js';
import { sendResponse } from '../utils/responseHelper.js';

/**
 * Middleware to check if user has purchased a course
 */
export const checkCourseAccess = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const courseId = req.params.courseId || req.body.courseId || req.query.courseId;

    if (!courseId) {
      return sendResponse(res, 400, false, 'Course ID is required', null);
    }

    // Check if user has enrolled in the course (purchased)
    const purchase = await Enrollment.findOne({
      where: {
        userId,
        courseId,
        paymentStatus: 'completed'
      }
    });

    if (!purchase) {
      return sendResponse(res, 403, false, 'Access denied. Please purchase this course to access it.', null);
    }

    // Add purchase info to request for further use
    req.purchaseInfo = purchase;
    next();

  } catch (error) {
    console.error('Check course access error:', error);
    return sendResponse(res, 500, false, 'Failed to verify course access', error.message);
  }
};

/**
 * Middleware to check if user has purchased a project
 */
export const checkProjectAccess = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const projectId = req.params.projectId || req.body.projectId || req.query.projectId;

    if (!projectId) {
      return sendResponse(res, 400, false, 'Project ID is required', null);
    }

    // Check if user has purchased the project
    const purchase = await ProjectPurchase.findOne({
      where: {
        userId,
        projectId
      }
    });

    if (!purchase) {
      return sendResponse(res, 403, false, 'Access denied. Please purchase this project to access it.', null);
    }

    // Add purchase info to request for further use
    req.purchaseInfo = purchase;
    next();

  } catch (error) {
    console.error('Check project access error:', error);
    return sendResponse(res, 500, false, 'Failed to verify project access', error.message);
  }
};

/**
 * Generic middleware to check purchase access for any item type
 */
export const checkPurchaseAccess = (itemType) => {
  return async (req, res, next) => {
    try {
      const { userId } = req.user;
      let itemId;

      // Extract item ID from various possible locations
      switch (itemType) {
        case 'course':
          itemId = req.params.courseId || req.body.courseId || req.query.courseId;
          break;
        case 'project':
          itemId = req.params.projectId || req.body.projectId || req.query.projectId;
          break;
        default:
          return sendResponse(res, 400, false, 'Invalid item type', null);
      }

      if (!itemId) {
        return sendResponse(res, 400, false, `${itemType} ID is required`, null);
      }

      let purchase;
      if (itemType === 'course') {
        purchase = await Enrollment.findOne({
          where: { userId, courseId: itemId, paymentStatus: 'completed' }
        });
      } else if (itemType === 'project') {
        purchase = await ProjectPurchase.findOne({
          where: { userId, projectId: itemId }
        });
      }

      if (!purchase) {
        return sendResponse(res, 403, false, `Access denied. Please purchase this ${itemType} to access it.`, null);
      }

      req.purchaseInfo = purchase;
      next();

    } catch (error) {
      console.error(`Check ${itemType} access error:`, error);
      return sendResponse(res, 500, false, `Failed to verify ${itemType} access`, error.message);
    }
  };
};

/**
 * Middleware to get user's purchased items
 */
export const getUserPurchases = async (req, res, next) => {
  try {
    const { userId } = req.user;

    // Get all enrolled courses (purchased)
    const coursePurchases = await Enrollment.findAll({
      where: { userId, paymentStatus: 'completed' },
      include: [{
        model: Course,
        as: 'course',
        attributes: ['id', 'title', 'description', 'thumbnail', 'duration', 'rating']
      }]
    });

    // Get all purchased projects
    const projectPurchases = await ProjectPurchase.findAll({
      where: { userId },
      include: [{
        model: Project,
        as: 'project',
        attributes: ['id', 'title', 'description', 'thumbnail', 'difficultyLevel', 'rating']
      }]
    });

    req.userPurchases = {
      courses: coursePurchases,
      projects: projectPurchases
    };

    next();

  } catch (error) {
    console.error('Get user purchases error:', error);
    return sendResponse(res, 500, false, 'Failed to get user purchases', error.message);
  }
};

/**
 * Check if user owns specific content and can download/access files
 */
export const checkContentOwnership = async (req, res, next) => {
  try {
    const { userId } = req.user;
    const { contentType, contentId } = req.params;

    if (!['course', 'project'].includes(contentType)) {
      return sendResponse(res, 400, false, 'Invalid content type', null);
    }

    let hasAccess = false;

    if (contentType === 'course') {
      const purchase = await Enrollment.findOne({
        where: { userId, courseId: contentId, paymentStatus: 'completed' }
      });
      hasAccess = !!purchase;
    } else if (contentType === 'project') {
      const purchase = await ProjectPurchase.findOne({
        where: { userId, projectId: contentId }
      });
      hasAccess = !!purchase;
    }

    if (!hasAccess) {
      return sendResponse(res, 403, false, 'Access denied. You do not own this content.', null);
    }

    next();

  } catch (error) {
    console.error('Check content ownership error:', error);
    return sendResponse(res, 500, false, 'Failed to verify content ownership', error.message);
  }
};
