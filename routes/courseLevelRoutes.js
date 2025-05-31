import express from "express";
import {
  bulkUploadCourseLevels,
  getAllCourseLevels,
  getCourseLevelById,
} from "../controller/courseLevelController.js";

const router = express.Router();

// Bulk upload course levels
router.post("/bulk-upload", bulkUploadCourseLevels);

// Get all course levels
router.get("/", getAllCourseLevels);

// Get course level by ID
router.get("/:levelId", getCourseLevelById);

export default router;
