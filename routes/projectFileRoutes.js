import express from "express";
import {
  uploadProjectFiles,
  getProjectFiles,
  updateProjectFile,
  deleteProjectFile,
  saveProjectFiles,
  updateProjectData,
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
  uploadMultiple("projectFiles", 10), // Allow up to 10 files
  uploadProjectFiles,
);

// Upload project files (Admin/Creator only)
router.post(
  "/:projectId/upload",
  isAdmin, // Add authentication
  uploadMultiple("projectFiles", 10), // Allow up to 10 files
  uploadProjectFiles,
);

// Get project files
router.get(
  "/:projectId/files",
  isAdmin, // Add authentication for admin access, remove for public access
  getProjectFiles,
);

// Update project file details (Admin/Creator only)
router.put(
  "/:projectId/files/:fileId",
  isAdmin, // Add authentication
  updateProjectFile,
);
router.put(
  "/:projectId/data/:fileId",
  isAdmin,
  updateProjectData,
);
// http://localhost:3030/api/project-files/4321fc35-2804-434e-868e-ca4607024d36/files/bb53adb8-f6c3-49d7-982b-6e4121bc089b
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

export default router;
