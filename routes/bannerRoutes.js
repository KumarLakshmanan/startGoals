import express from "express";
import {
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  bulkCreateBanners,
  bulkDeleteBanners,
  getActiveBanners,
} from "../controller/bannerController.js";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import upload from "../middleware/fileUploadMiddleware.js";

const router = express.Router();

// Public routes
router.get("/active", getActiveBanners); // Get active banners for public use

// Admin routes (require authentication and admin role)
router.get("/", getAllBanners); // Base route for all banners with pagination
router.get("/getAll", getAllBanners); // Get all banners with pagination (backward compatibility)
router.get("/:id", getBannerById); // Direct ID access
router.get("/get/:id", getBannerById); // Get banner by ID (backward compatibility)

// Routes with file upload handling - using the project's standardized file upload middleware
router.post("/", upload.single('banner'), createBanner); // Base route for creation
router.post("/create", upload.single('banner'), createBanner); // Create new banner (backward compatibility)
router.put("/:id", upload.single('banner'), updateBanner); // Direct ID update
router.put("/update/:id", upload.single('banner'), updateBanner); // Update banner by ID (backward compatibility)

router.delete("/:id", deleteBanner); // Direct ID delete
router.delete("/delete/:id", deleteBanner); // Delete banner by ID (backward compatibility)
router.post("/bulkCreate", bulkCreateBanners); // Bulk create banners
router.post("/bulkDelete", bulkDeleteBanners); // Bulk delete banners

export default router;
