import express from "express";
import {
  bulkUploadCourseLevels,
  getAllCourseLevels,
  getCourseLevelById,
} from "../controller/courseLevelController.js";
import { isTeacher } from "../middleware/authMiddleware.js";

const router = express.Router();

// Bulk upload course levels
router.post("/bulk-upload", isTeacher, bulkUploadCourseLevels);

// Get all course levels
router.get("/", isTeacher, getAllCourseLevels);

// Get course level by ID
router.get("/:levelId", getCourseLevelById);

export default router;
