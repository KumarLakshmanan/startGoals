import express from "express";
import {
  bulkUploadCourseLevels,
  getAllCourseLevels,
  getCourseLevelById,
} from "../controller/courseLevelController.js";
import { isTeacher } from "../middleware/authMiddleware.js";

const router = express.Router();

// Bulk upload course levels with new structure
router.post("/bulk-upload", isTeacher, bulkUploadCourseLevels);

// Get all course levels
router.get("/getAll", getAllCourseLevels);

// Get course level by ID (public access)
router.get("/:levelId", getCourseLevelById);

export default router;
