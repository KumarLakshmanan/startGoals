import express from "express";
import {
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  bulkCreateBanners,
  getActiveBanners,
} from "../controller/bannerController.js";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public routes
router.get("/active", getActiveBanners); // Get active banners for public use
// Admin routes (require authentication and admin role)
router.get("/getAll", getAllBanners); // Get all banners with pagination
router.get("/get/:id", isAdmin, getBannerById); // Get banner by ID
router.post("/create", isAdmin, createBanner); // Create new banner
router.put("/update:id", isAdmin, updateBanner); // Update banner by ID
router.delete("/delete/:id", isAdmin, deleteBanner); // Delete banner by ID
router.post("/bulkCreate", isAdmin, bulkCreateBanners); // Bulk create banners

export default router;
