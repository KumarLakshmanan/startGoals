import express from "express";
import {
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  bulkDeleteBanners,
  getActiveBanners,
} from "../controller/bannerController.js";
import { isAdmin } from "../middleware/authMiddleware.js";
import { uploadSingle } from "../middleware/fileUploadMiddleware.js";

const router = express.Router();

// Public routes
router.get("/active", getActiveBanners); // Get active banners for public use

// Admin routes (require authentication and admin role)
router.get("/", getAllBanners); // Base route for all banners with pagination
router.get("/getAll", getAllBanners); // Get all banners with pagination (backward compatibility)
router.get("/:id", getBannerById); // Direct ID access
router.get("/get/:id", getBannerById); // Get banner by ID (backward compatibility)

// Routes with file upload handling - using the project's standardized file upload middleware
router.post("/", uploadSingle('banner'), isAdmin, createBanner); // Base route for creation
router.post("/create", uploadSingle('banner'), isAdmin, createBanner); // Create new banner (backward compatibility)
router.put("/:id", uploadSingle('banner'), isAdmin, updateBanner); // Direct ID update
router.put("/update/:id", uploadSingle('banner'), isAdmin, updateBanner); // Update banner by ID (backward compatibility)

router.delete("/:id", isAdmin, deleteBanner); // Direct ID delete
router.delete("/delete/:id", isAdmin, deleteBanner); // Delete banner by ID (backward compatibility)
router.post("/bulkDelete", isAdmin, bulkDeleteBanners); // Bulk delete banners

export default router;
