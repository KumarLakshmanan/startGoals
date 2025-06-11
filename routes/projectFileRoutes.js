import express from "express";
import {
  uploadProjectFiles,
  getProjectFiles,
  downloadProjectFile,
  updateProjectFile,
  deleteProjectFile,
  getDownloadStatistics
} from "../controller/projectFileController.js";
import { isAdmin } from "../middleware/authMiddleware.js";

import { validateInput } from "../middleware/validationMiddleware.js";
import { param, query, body } from "express-validator";
import { fileUploadMiddleware } from "../middleware/fileUploadMiddleware.js";

const router = express.Router();

// ===================== PROJECT FILE MANAGEMENT =====================

// Upload project files (Admin/Creator only)
router.post(
  "/:projectId/files",
  isAdmin, // Add authentication
  fileUploadMiddleware.array('files', 10), // Allow up to 10 files
  [
    param("projectId").isInt().withMessage("Valid project ID is required"),
    body("fileDescriptions").optional().isArray().withMessage("File descriptions must be an array"),
    body("isPreview").optional().isArray().withMessage("Preview flags must be an array")
  ],
  validateInput,
  uploadProjectFiles
);

// Get project files
router.get(
  "/:projectId/files",
  [
    param("projectId").isInt().withMessage("Valid project ID is required"),
    query("fileType").optional().isIn(["archive", "source_code", "documentation", "image", "video", "other"]).withMessage("Invalid file type"),
    query("isPreview").optional().isBoolean().withMessage("Is preview must be a boolean")
  ],
  validateInput,
  getProjectFiles
);

// Download project file (Purchased users only)
router.get(
  "/files/:fileId/download",
  isAdmin, // Add authentication - only purchased users should download
  [
    param("fileId").isInt().withMessage("Valid file ID is required")
  ],
  validateInput,
  downloadProjectFile
);

// Update project file details (Admin/Creator only)
router.put(
  "/files/:fileId",
  isAdmin, // Add authentication
  [
    param("fileId").isInt().withMessage("Valid file ID is required"),
    body("description").optional().isLength({ max: 500 }).withMessage("Description must be under 500 characters"),
    body("isPreview").optional().isBoolean().withMessage("Is preview must be a boolean"),
    body("fileType").optional().isIn(["archive", "source_code", "documentation", "image", "video", "other"]).withMessage("Invalid file type")
  ],
  validateInput,
  updateProjectFile
);

// Delete project file (Admin/Creator only)
router.delete(
  "/files/:fileId",
  isAdmin, // Add authentication
  [
    param("fileId").isInt().withMessage("Valid file ID is required")
  ],
  validateInput,
  deleteProjectFile
);

// ===================== DOWNLOAD STATISTICS =====================

// Get download statistics (Admin only)
router.get(
  "/admin/downloads/statistics",
  isAdmin,
  [
    query("projectId").optional().isInt().withMessage("Valid project ID is required"),
    query("period").optional().isIn(["7d", "30d", "90d", "1y"]).withMessage("Invalid period")
  ],
  validateInput,
  getDownloadStatistics
);

export default router;
