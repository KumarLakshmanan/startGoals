import express from "express";
import {
  uploadProjectFiles,
  getProjectFiles,
  downloadProjectFile,
  updateProjectFile,
  deleteProjectFile,
} from "../controller/projectFileController.js";
// Import improved functions
import {
  saveProjectFiles,
  getProjectFiles as getProjectFilesImproved,
  deleteProjectFile as deleteProjectFileImproved,
  updateProjectFile as updateProjectFileImproved,
} from "../controller/projectFileController_improved.js";
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
  "/:projectId/files/:fileId",
  isAdmin, // Add authentication
  validateSchema(projectFileValidation.update, "body", { mergeParams: true }),
  updateProjectFile,
);

// Delete project file (Admin/Creator only)
router.delete(
  "/:projectId/files/:fileId",
  isAdmin, // Add authentication
  validateSchema(projectFileValidation.fileIdParam, "params"),
  deleteProjectFile,
);

// ===================== IMPROVED PROJECT FILE MANAGEMENT =====================

// Save project files after upload (New improved workflow)
// Step 1: Use /api/upload/upload-fields with projectFiles field to upload files to S3
// Step 2: Use this endpoint to save file info to database
router.post(
  "/:projectId/save-files",
  isAdmin, // Add authentication
  saveProjectFiles,
);

// Get project files (improved with better access control)
router.get(
  "/:projectId/files-improved",
  getProjectFilesImproved,
);

// Update project file (improved)
router.put(
  "/:projectId/files-improved/:fileId",
  isAdmin,
  updateProjectFileImproved,
);

// Delete project file (improved)
router.delete(
  "/:projectId/files-improved/:fileId",
  isAdmin,
  deleteProjectFileImproved,
);

// ===================== LEGACY ROUTES (for backward compatibility) =====================

export default router;
