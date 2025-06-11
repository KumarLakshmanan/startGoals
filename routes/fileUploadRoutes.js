import express from "express";
import upload from "../middleware/fileUploadMiddleware.js";
import { uploadFiles } from "../controller/fileUploadController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Single dynamic upload endpoint (Authenticated users only)
router.post("/upload-file", authenticateToken, upload.any(), uploadFiles);

export default router;
