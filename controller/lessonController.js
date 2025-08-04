import Lesson from "../model/lesson.js";
import Section from "../model/section.js";
import Course from "../model/course.js";
import { sendSuccess, sendValidationError, sendNotFound, sendServerError, sendUnauthorized } from "../utils/responseHelper.js";
import sequelize from "../config/db.js";

// Get all lessons for a section
export const getSectionLessons = async (req, res) => {
  try {
    const { sectionId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Check if section exists
    const section = await Section.findByPk(sectionId, {
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["courseId", "title"]
        }
      ]
    });
    
    if (!section) {
      return sendNotFound(res, "Section not found");
    }

    const lessons = await Lesson.findAndCountAll({
      where: { sectionId },
      order: [['order', 'ASC']],
      limit: parseInt(limit),
      offset
    });

    return sendSuccess(res, "Section lessons retrieved successfully", {
      section: {
        sectionId: section.sectionId,
        title: section.title,
        course: section.course
      },
      lessons: lessons.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(lessons.count / parseInt(limit)),
        totalItems: lessons.count,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Error getting section lessons:", error);
    return sendServerError(res, "Failed to retrieve section lessons", error.message);
  }
};

// Get a single lesson by ID
export const getLessonById = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findOne({
      where: { lessonId },
      include: [
        {
          model: Section,
          as: "section",
          attributes: ["sectionId", "title"],
          include: [
            {
              model: Course,
              as: "course",
              attributes: ["courseId", "title"]
            }
          ]
        }
      ]
    });

    if (!lesson) {
      return sendNotFound(res, "Lesson not found");
    }

    return sendSuccess(res, "Lesson retrieved successfully", lesson);
  } catch (error) {
    console.error("Error getting lesson:", error);
    return sendServerError(res, "Failed to retrieve lesson", error.message);
  }
};

// Create a new lesson
export const createLesson = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { sectionId } = req.params;
    const { 
      title, 
      type, 
      content, 
      streamStartDateTime, 
      streamEndDateTime, 
      videoUrl, 
      duration, 
      order, 
      isPreview = false 
    } = req.body;

    // Validation
    if (!title || !type) {
      await transaction.rollback();
      return sendValidationError(res, "Missing required fields", {
        title: !title ? "Lesson title is required" : undefined,
        type: !type ? "Lesson type is required" : undefined
      });
    }

    // Check if section exists
    const section = await Section.findByPk(sectionId);
    if (!section) {
      await transaction.rollback();
      return sendNotFound(res, "Section not found");
    }

    // Type-specific validation
    if (type === 'live') {
      if (!streamStartDateTime || !streamEndDateTime) {
        await transaction.rollback();
        return sendValidationError(res, "Live lessons require start and end date/time", {
          streamStartDateTime: !streamStartDateTime ? "Start date/time is required for live lessons" : undefined,
          streamEndDateTime: !streamEndDateTime ? "End date/time is required for live lessons" : undefined
        });
      }
    }

    // If no order provided, set as last
    let lessonOrder = order;
    if (!lessonOrder) {
      const lastLesson = await Lesson.findOne({
        where: { sectionId },
        order: [['order', 'DESC']],
        transaction
      });
      lessonOrder = lastLesson ? lastLesson.order + 1 : 1;
    }

    const lessonData = {
      sectionId,
      title,
      type,
      content,
      duration,
      order: lessonOrder,
      isPreview
    };

    // Add type-specific fields
    if (type === 'live') {
      lessonData.streamStartDateTime = new Date(streamStartDateTime);
      lessonData.streamEndDateTime = new Date(streamEndDateTime);
    } else if (type === 'video' && videoUrl) {
      lessonData.videoUrl = videoUrl;
    }

    const lesson = await Lesson.create(lessonData, { transaction });

    await transaction.commit();

    // Fetch the created lesson with section info
    const createdLesson = await Lesson.findOne({
      where: { lessonId: lesson.lessonId },
      include: [
        {
          model: Section,
          as: "section",
          attributes: ["sectionId", "title"],
          include: [
            {
              model: Course,
              as: "course",
              attributes: ["courseId", "title"]
            }
          ]
        }
      ]
    });

    return sendSuccess(res, "Lesson created successfully", createdLesson);
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating lesson:", error);
    return sendServerError(res, "Failed to create lesson", error.message);
  }
};

// Update a lesson
export const updateLesson = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { lessonId } = req.params;
    const { 
      title, 
      type, 
      content, 
      streamStartDateTime, 
      streamEndDateTime, 
      videoUrl, 
      duration, 
      order, 
      isPreview 
    } = req.body;

    const lesson = await Lesson.findByPk(lessonId, { transaction });
    if (!lesson) {
      await transaction.rollback();
      return sendNotFound(res, "Lesson not found");
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (type !== undefined) updateData.type = type;
    if (content !== undefined) updateData.content = content;
    if (duration !== undefined) updateData.duration = duration;
    if (order !== undefined) updateData.order = order;
    if (isPreview !== undefined) updateData.isPreview = isPreview;

    // Handle type-specific fields
    if (type === 'live') {
      if (streamStartDateTime) updateData.streamStartDateTime = new Date(streamStartDateTime);
      if (streamEndDateTime) updateData.streamEndDateTime = new Date(streamEndDateTime);
      // Clear video URL for live lessons
      updateData.videoUrl = null;
    } else if (type === 'video') {
      if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
      // Clear live session fields for video lessons
      updateData.streamStartDateTime = null;
      updateData.streamEndDateTime = null;
    } else {
      // For document/assignment lessons, clear both video and live fields
      updateData.videoUrl = null;
      updateData.streamStartDateTime = null;
      updateData.streamEndDateTime = null;
    }

    await Lesson.update(updateData, {
      where: { lessonId },
      transaction
    });

    await transaction.commit();

    // Fetch updated lesson
    const updatedLesson = await Lesson.findOne({
      where: { lessonId },
      include: [
        {
          model: Section,
          as: "section",
          attributes: ["sectionId", "title"],
          include: [
            {
              model: Course,
              as: "course",
              attributes: ["courseId", "title"]
            }
          ]
        }
      ]
    });

    return sendSuccess(res, "Lesson updated successfully", updatedLesson);
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating lesson:", error);
    return sendServerError(res, "Failed to update lesson", error.message);
  }
};

// Delete a lesson
export const deleteLesson = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findByPk(lessonId, { transaction });
    if (!lesson) {
      await transaction.rollback();
      return sendNotFound(res, "Lesson not found");
    }

    await Lesson.destroy({
      where: { lessonId },
      transaction
    });

    await transaction.commit();

    return sendSuccess(res, "Lesson deleted successfully");
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting lesson:", error);
    return sendServerError(res, "Failed to delete lesson", error.message);
  }
};

// Reorder lessons within a section
export const reorderLessons = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { sectionId } = req.params;
    const { lessonOrders } = req.body; // Array of { lessonId, order }

    if (!Array.isArray(lessonOrders)) {
      await transaction.rollback();
      return sendValidationError(res, "lessonOrders must be an array");
    }

    // Update each lesson's order
    for (const { lessonId, order } of lessonOrders) {
      await Lesson.update(
        { order },
        {
          where: { lessonId, sectionId },
          transaction
        }
      );
    }

    await transaction.commit();

    // Fetch updated lessons
    const lessons = await Lesson.findAll({
      where: { sectionId },
      order: [['order', 'ASC']]
    });

    return sendSuccess(res, "Lessons reordered successfully", lessons);
  } catch (error) {
    await transaction.rollback();
    console.error("Error reordering lessons:", error);
    return sendServerError(res, "Failed to reorder lessons", error.message);
  }
};

// ===================== ADMIN LESSON MANAGEMENT =====================

export const createLessonAdmin = async (req, res) => {
  return createLesson(req, res); // Reuse the main createLesson function
};

export const updateLessonAdmin = async (req, res) => {
  return updateLesson(req, res); // Reuse the main updateLesson function
};

export const deleteLessonAdmin = async (req, res) => {
  return deleteLesson(req, res); // Reuse the main deleteLesson function
};

// ===================== LESSON CONTENT MANAGEMENT =====================

export const updateLessonVideo = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const videoFile = req.file;

    if (!videoFile) {
      return sendValidationError(res, "Video file is required");
    }

    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) {
      return sendNotFound(res, "Lesson not found");
    }

    // Update lesson with video URL (assuming file upload middleware sets the URL)
    const videoUrl = videoFile.location || videoFile.path; // For S3 or local storage
    
    await lesson.update({ videoUrl });

    return sendSuccess(res, "Lesson video updated successfully", {
      lessonId: lesson.lessonId,
      videoUrl: lesson.videoUrl
    });
  } catch (error) {
    console.error("Error updating lesson video:", error);
    return sendServerError(res, "Failed to update lesson video", error.message);
  }
};

export const updateLessonContent = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { content } = req.body;

    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) {
      return sendNotFound(res, "Lesson not found");
    }

    await lesson.update({ content });

    return sendSuccess(res, "Lesson content updated successfully", lesson);
  } catch (error) {
    console.error("Error updating lesson content:", error);
    return sendServerError(res, "Failed to update lesson content", error.message);
  }
};

export const toggleLessonPreview = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { isPreview } = req.body;

    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) {
      return sendNotFound(res, "Lesson not found");
    }

    await lesson.update({ isPreview: Boolean(isPreview) });

    return sendSuccess(res, "Lesson preview setting updated successfully", {
      lessonId: lesson.lessonId,
      isPreview: lesson.isPreview
    });
  } catch (error) {
    console.error("Error updating lesson preview:", error);
    return sendServerError(res, "Failed to update lesson preview", error.message);
  }
};

export const bulkUpdateLessons = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { lessons } = req.body; // Array of lesson updates

    if (!Array.isArray(lessons)) {
      await transaction.rollback();
      return sendValidationError(res, "lessons must be an array");
    }

    const updatedLessons = [];

    for (const lessonData of lessons) {
      const { lessonId, ...updateData } = lessonData;
      
      if (!lessonId) {
        continue; // Skip if no lessonId provided
      }

      const [updatedRowsCount] = await Lesson.update(updateData, {
        where: { lessonId },
        transaction
      });

      if (updatedRowsCount > 0) {
        const updatedLesson = await Lesson.findByPk(lessonId, { transaction });
        updatedLessons.push(updatedLesson);
      }
    }

    await transaction.commit();

    return sendSuccess(res, "Lessons updated successfully", updatedLessons);
  } catch (error) {
    await transaction.rollback();
    console.error("Error bulk updating lessons:", error);
    return sendServerError(res, "Failed to bulk update lessons", error.message);
  }
};

// ===================== LESSON PROGRESS AND ANALYTICS =====================

export const getLessonProgress = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, "User authentication required");
    }

    // This would typically fetch from a user_lesson_progress table
    // For now, return a basic structure
    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) {
      return sendNotFound(res, "Lesson not found");
    }

    // Mock progress data - replace with actual progress tracking
    const progress = {
      lessonId,
      userId,
      isCompleted: false,
      progressPercentage: 0,
      timeSpent: 0,
      lastAccessed: null
    };

    return sendSuccess(res, "Lesson progress retrieved successfully", progress);
  } catch (error) {
    console.error("Error getting lesson progress:", error);
    return sendServerError(res, "Failed to get lesson progress", error.message);
  }
};

export const markLessonComplete = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, "User authentication required");
    }

    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) {
      return sendNotFound(res, "Lesson not found");
    }

    // This would typically update a user_lesson_progress table
    // For now, return success message
    const progress = {
      lessonId,
      userId,
      isCompleted: true,
      completedAt: new Date(),
      progressPercentage: 100
    };

    return sendSuccess(res, "Lesson marked as complete", progress);
  } catch (error) {
    console.error("Error marking lesson complete:", error);
    return sendServerError(res, "Failed to mark lesson complete", error.message);
  }
};

export const getLessonAnalytics = async (req, res) => {
  try {
    const { lessonId } = req.params;

    const lesson = await Lesson.findByPk(lessonId);
    if (!lesson) {
      return sendNotFound(res, "Lesson not found");
    }

    // Mock analytics data - replace with actual analytics
    const analytics = {
      lessonId,
      title: lesson.title,
      totalViews: 0,
      completionRate: 0,
      averageTimeSpent: 0,
      studentEngagement: {
        totalStudents: 0,
        completedStudents: 0,
        inProgressStudents: 0
      }
    };

    return sendSuccess(res, "Lesson analytics retrieved successfully", analytics);
  } catch (error) {
    console.error("Error getting lesson analytics:", error);
    return sendServerError(res, "Failed to get lesson analytics", error.message);
  }
};
