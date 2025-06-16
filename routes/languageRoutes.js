import express from "express";
import { authenticateToken, isTeacher } from "../middleware/authMiddleware.js";
import {
  deleteCourseLanguage,
  uploadLanguagesBulk,
  saveAllLanguages,
  getAllLanguages,
  getLanguagesByType,
  getLanguageStats,
} from "../controller/languageController.js";

const router = express.Router();

router.post("/upload", isTeacher, uploadLanguagesBulk);
router.get("/", getAllLanguages);
router.get("/stats", getLanguageStats);
router.get("/type/:type", getLanguagesByType);
router.delete("/:id", isTeacher, deleteCourseLanguage);

// Legacy routes for backward compatibility
router.post("/saveAllLanguage", isTeacher, uploadLanguagesBulk);
router.post("/saveAllLanguages", isTeacher, saveAllLanguages);
router.get("/getAllLanguages", getAllLanguages);
router.get("/getLanguagesByType/:type", getLanguagesByType);
router.get("/getLanguageStats", getLanguageStats);
router.delete("/deleteCourseLanguageById/:id", isTeacher, deleteCourseLanguage);

export default router;
