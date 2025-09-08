import express from "express";
import {
  sendMessage,
  getCourseMessages,
  sendAnnouncement,
  deleteMessage,
  getUnreadMessageCount,
} from "../controller/courseChatController.js";
import { authenticateToken, isTeacher } from "../middleware/authMiddleware.js";

const router = express.Router();

// All chat routes require authentication
router.post("/:courseId/messages", authenticateToken, sendMessage);
router.get("/:courseId/messages", authenticateToken, getCourseMessages);
router.post("/:courseId/announcements", isTeacher, sendAnnouncement);
router.delete("/messages/:messageId", authenticateToken, deleteMessage);
router.get("/unread-count", authenticateToken, getUnreadMessageCount);

export default router;
