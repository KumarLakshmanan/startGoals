import LessonChat from "../model/lessonChat.js";
import User from "../model/user.js";
import Lesson from "../model/lesson.js";
import Section from "../model/section.js";
import Course from "../model/course.js";
import Enrollment from "../model/enrollment.js";

export const sendMessage = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const { message, messageType = "text", fileUrl, fileName, replyToId } = req.body;
    const senderId = req.user.userId;

    // Check if lesson exists and get course information
    const lesson = await Lesson.findOne({
      where: { lessonId },
      include: [
        {
          model: Section,
          as: "section",
          include: [
            {
              model: Course,
              as: "course",
              attributes: ["courseId"]
            }
          ]
        }
      ]
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    const courseId = lesson.section.course.courseId;

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      where: {
        courseId,
        userId: senderId,
        status: "active",
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to send messages",
      });
    }

    const chatMessage = await LessonChat.create({
      lessonId,
      senderId,
      message,
      messageType,
      fileUrl,
      fileName,
      replyToId,
    });

    // Populate sender information
    const populatedMessage = await LessonChat.findByPk(chatMessage.chatId, {
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["userId", "username", "profileImage", "role"],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message,
    });
  }
};

export const getLessonMessages = async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = req.user.userId;
    const {
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "ASC",
    } = req.query;

    const offset = (page - 1) * limit;

    // Check if lesson exists and get course information
    const lesson = await Lesson.findOne({
      where: { lessonId },
      include: [
        {
          model: Section,
          as: "section",
          include: [
            {
              model: Course,
              as: "course",
              attributes: ["courseId"]
            }
          ]
        }
      ]
    });

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: "Lesson not found",
      });
    }

    const courseId = lesson.section.course.courseId;

    // Check if user is enrolled in the course
    const enrollment = await Enrollment.findOne({
      where: {
        courseId,
        userId,
        status: "active",
      },
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You must be enrolled in this course to view messages",
      });
    }

    const { count, rows } = await LessonChat.findAndCountAll({
      where: { lessonId },
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["userId", "username", "profileImage", "role"],
        },
        {
          model: LessonChat,
          as: "replyTo",
          include: [
            {
              model: User,
              as: "sender",
              attributes: ["userId", "username", "profileImage", "role"],
            },
          ],
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
    console.error("Error fetching lesson messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch lesson messages",
      error: error.message,
    });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await LessonChat.findByPk(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    // Check if user is the sender or admin
    const isAdmin = req.user.role === "admin" || req.user.role === "owner";
    if (message.senderId !== userId && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own messages",
      });
    }

    await message.destroy();

    res.json({
      success: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: error.message,
    });
  }
};

export const getUnreadMessageCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    // Get all courses where user is enrolled
    const enrollments = await Enrollment.findAll({
      where: {
        userId,
        status: "active",
      },
      attributes: ["courseId"],
    });

    const courseIds = enrollments.map(e => e.courseId);

    if (courseIds.length === 0) {
      return res.json({
        success: true,
        data: { totalUnread: 0, byLesson: {} },
      });
    }

    // Get all lessons from enrolled courses
    const lessons = await Lesson.findAll({
      include: [
        {
          model: Section,
          as: "section",
          where: { courseId: courseIds },
          attributes: ["sectionId"]
        }
      ],
      attributes: ["lessonId"]
    });

    const lessonIds = lessons.map(l => l.lessonId);

    if (lessonIds.length === 0) {
      return res.json({
        success: true,
        data: { totalUnread: 0, byLesson: {} },
      });
    }

    // For now, return 0 as we don't have a read status tracking system
    // This can be enhanced later with a read receipts system
    const unreadCount = 0;
    const byLesson = {};

    lessonIds.forEach(lessonId => {
      byLesson[lessonId] = 0;
    });

    res.json({
      success: true,
      data: {
        totalUnread: unreadCount,
        byLesson,
      },
    });
  } catch (error) {
    console.error("Error fetching unread message count:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch unread message count",
      error: error.message,
    });
  }
};