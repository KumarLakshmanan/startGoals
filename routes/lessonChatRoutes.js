import express from "express";
import {
  sendMessage,
  getLessonMessages,
  deleteMessage,
  getUnreadMessageCount,
} from "../controller/lessonChatController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// All chat routes require authentication
router.post("/:lessonId/messages", authenticateToken, sendMessage);
router.get("/:lessonId/messages", authenticateToken, getLessonMessages);
router.delete("/messages/:messageId", authenticateToken, deleteMessage);
router.get("/unread-count", authenticateToken, getUnreadMessageCount);

export default router;