import express from "express";
import {
  createNews,
  getAllNews,
  getNewsById,
  updateNews,
  deleteNews,
  toggleNewsStatus,
  getFeaturedNews,
  toggleNewsFeatured,
  bulkDeleteNews,
  uploadThumbnail,
} from "../controller/newsController.js";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import multer from "multer";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Public routes
router.get("/featured", getFeaturedNews);
router.get("/:id", getNewsById);

// Admin routes
router.get("/", authenticateToken, getAllNews);
router.post("/", isAdmin, createNews);
router.put("/:id", isAdmin, updateNews);
router.delete("/:id", isAdmin, deleteNews);
router.patch("/:id/toggle-status", isAdmin, toggleNewsStatus);
router.patch("/:id/featured", isAdmin, toggleNewsFeatured);
router.delete("/bulk", isAdmin, bulkDeleteNews);
router.post("/upload-thumbnail", isAdmin, upload.single('thumbnail'), uploadThumbnail);

export default router;
