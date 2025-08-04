import express from "express";
import {
  uploadProjectFiles,
  getProjectFiles,
  downloadProjectFile,
  updateProjectFile,
  deleteProjectFile,
  getDownloadStatistics,
} from "../controller/projectFileController.js";
import { isAdmin } from "../middleware/authMiddleware.js";
import { validateSchema, projectFileValidation } from "../middleware/fieldValidation.js";
import { uploadMultiple } from "../middleware/fileUploadMiddleware.js";

const router = express.Router();

// ===================== PROJECT FILE MANAGEMENT =====================

// Upload project files (Admin/Creator only)
router.post(
  "/:projectId/files",
  isAdmin, // Add authentication
  uploadMultiple("files", 10), // Allow up to 10 files
  validateSchema(projectFileValidation.upload, "body", { mergeParams: true }),
  uploadProjectFiles,
);

// Get project files
router.get(
  "/:projectId/files",
  validateSchema(projectFileValidation.getFiles, "query", { mergeParams: true }),
  getProjectFiles,
);

// Download project file (Purchased users only)
router.get(
  "/files/:fileId/download",
  isAdmin, // Add authentication - only purchased users should download
  validateSchema(projectFileValidation.fileIdParam, "params"),
  downloadProjectFile,
);

// Update project file details (Admin/Creator only)
router.put(
  "/files/:fileId",
  isAdmin, // Add authentication
  validateSchema(projectFileValidation.update, "body", { mergeParams: true }),
  updateProjectFile,
);

// Delete project file (Admin/Creator only)
router.delete(
  "/files/:fileId",
  isAdmin, // Add authentication
  validateSchema(projectFileValidation.fileIdParam, "params"),
  deleteProjectFile,
);

// ===================== DOWNLOAD STATISTICS =====================

// Get download statistics (Admin only)
router.get(
  "/admin/downloads/statistics",
  isAdmin,
  validateSchema(projectFileValidation.downloadStats, "query"),
  getDownloadStatistics,
);

export default router;
