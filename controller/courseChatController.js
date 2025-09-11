import CourseChat from "../model/courseChat.js";
import User from "../model/user.js";
import Enrollment from "../model/enrollment.js";

export const sendMessage = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { message, messageType = "text", fileUrl, fileName, replyToId } = req.body;
    const senderId = req.user.userId;

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

    const chatMessage = await CourseChat.create({
      courseId,
      senderId,
      message,
      messageType,
      fileUrl,
      fileName,
      replyToId,
    });

    // Populate sender information
    const populatedMessage = await CourseChat.findByPk(chatMessage.chatId, {
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["userId", "username", "profileImage", "role"],
        },
      ],
    });

    // Emit WebSocket event for real-time updates
    const io = req.app.get("io");
    if (io) {
      io.to(`course-chat-${courseId}`).emit("newCourseMessage", {
        chatId: populatedMessage.chatId,
        courseId,
        senderId: populatedMessage.senderId,
        message: populatedMessage.message,
        messageType: populatedMessage.messageType,
        fileUrl: populatedMessage.fileUrl,
        fileName: populatedMessage.fileName,
        replyToId: populatedMessage.replyToId,
        sender: populatedMessage.sender,
        createdAt: populatedMessage.createdAt,
      });
    }

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

export const getCourseMessages = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;
    const {
      page = 1,
      limit = 50,
      sortBy = "createdAt",
      sortOrder = "ASC",
    } = req.query;

    const offset = (page - 1) * limit;

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

    const { count, rows } = await CourseChat.findAndCountAll({
      where: { courseId },
      include: [
        {
          model: User,
          as: "sender",
          attributes: ["userId", "username", "profileImage", "role"],
        },
        {
          model: CourseChat,
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
    console.error("Error fetching course messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch course messages",
      error: error.message,
    });
  }
};


export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.userId;

    const message = await CourseChat.findByPk(messageId);
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

    // Emit WebSocket event for real-time updates
    const io = req.app.get("io");
    if (io) {
      io.to(`course-chat-${message.courseId}`).emit("courseMessageDeleted", {
        messageId: messageId,
        deletedBy: userId,
        courseId: message.courseId,
      });
    }

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
        data: { totalUnread: 0, byCourse: {} },
      });
    }

    // For now, return 0 as we don't have a read status tracking system
    // This can be enhanced later with a read receipts system
    const unreadCount = 0;
    const byCourse = {};

    courseIds.forEach(courseId => {
      byCourse[courseId] = 0;
    });

    res.json({
      success: true,
      data: {
        totalUnread: unreadCount,
        byCourse,
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
