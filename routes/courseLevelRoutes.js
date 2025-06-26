import express from "express";
import {
  bulkUploadCourseLevels,
  createCourseLevel,
  deleteCourseLevel,
  getAllCourseLevels,
  getCourseLevelById,
  reorderCourseLevels,
  updateCourseLevel,
} from "../controller/courseLevelController.js";
import { isAdmin, isTeacher } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", getAllCourseLevels);
router.post("/bulk-upload", isAdmin, bulkUploadCourseLevels);
router.get("/getAll", getAllCourseLevels);
router.get("/:levelId", getCourseLevelById);


router.post("/bulk-upload", isAdmin, bulkUploadCourseLevels);
router.post("/", isAdmin, createCourseLevel);
router.put("/:levelId", isAdmin, updateCourseLevel);
router.delete("/:levelId", isAdmin, deleteCourseLevel);
router.post("/reorder", isAdmin, reorderCourseLevels);

export default router;
