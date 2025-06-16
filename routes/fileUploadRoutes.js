import express from "express";
import upload from "../middleware/fileUploadMiddleware.js";
import {
  uploadFiles,
  uploadSingleFile,
  uploadFieldFiles,
} from "../controller/fileUploadController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Multiple files upload endpoint (any field names)
router.post("/upload-files", authenticateToken, upload.any(), uploadFiles);

// Single file upload endpoint
router.post(
  "/upload-single/:fieldName",
  authenticateToken,
  (req, res, next) => {
    const fieldName = req.params.fieldName;
    upload.single(fieldName)(req, res, next);
  },
  uploadSingleFile,
);

// Multiple files with specific field names
router.post(
  "/upload-fields",
  authenticateToken,
  upload.fields([
    { name: "thumbnail", maxCount: 1 },
    { name: "video", maxCount: 1 },
    { name: "profileImage", maxCount: 1 },
    { name: "resource", maxCount: 10 },
    { name: "artical", maxCount: 5 },
    { name: "banner", maxCount: 5 },
    { name: "files", maxCount: 20 },
    { name: "projectFiles", maxCount: 20 },
  ]),
  uploadFieldFiles,
);

// Legacy endpoint (keep for backward compatibility)
router.post("/upload-file", authenticateToken, upload.any(), uploadFiles);

export default router;
