import express from "express";
import {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  bulkDeleteAnnouncements,
  getActiveAnnouncements,
  trackAnnouncementView,
  trackAnnouncementClick,
} from "../controller/announcementController.js";
import { isAdmin } from "../middleware/authMiddleware.js";
import { uploadSingle } from "../middleware/fileUploadMiddleware.js";

const router = express.Router();

// Public routes
router.get("/active", getActiveAnnouncements); // Get active announcements for public use

// Admin routes (require authentication and admin role)
router.get("/", getAllAnnouncements); // Base route for all announcements with pagination
router.get("/getAll", getAllAnnouncements); // Get all announcements with pagination (backward compatibility)
router.get("/:id", getAnnouncementById); // Direct ID access
router.get("/get/:id", getAnnouncementById); // Get announcement by ID (backward compatibility)

// Routes with file upload handling - using the project's standardized file upload middleware
router.post("/", uploadSingle('announcement'), isAdmin, createAnnouncement); // Base route for creation
router.post("/create", uploadSingle('announcement'), isAdmin, createAnnouncement); // Create new announcement (backward compatibility)
router.put("/:id", uploadSingle('announcement'), isAdmin, updateAnnouncement); // Direct ID update
router.put("/update/:id", uploadSingle('announcement'), isAdmin, updateAnnouncement); // Update announcement by ID (backward compatibility)

router.delete("/:id", isAdmin, deleteAnnouncement); // Direct ID delete
router.delete("/delete/:id", isAdmin, deleteAnnouncement); // Delete announcement by ID (backward compatibility)
router.post("/bulkDelete", isAdmin, bulkDeleteAnnouncements); // Bulk delete announcements

// Tracking routes (public - for analytics)
router.post("/:id/view", trackAnnouncementView); // Track announcement view
router.post("/:id/click", trackAnnouncementClick); // Track announcement click

export default router;