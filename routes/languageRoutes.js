import express from "express";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import {
  deleteCourseLanguage,
  uploadLanguagesBulk,
  saveAllLanguages,
  getAllLanguages,
  getLanguagesByType,
  getLanguageStats,
  getLanguageById,
  saveLanguage,
  updateLanguage
} from "../controller/languageController.js";

const router = express.Router();

// Modern RESTful routes

// Legacy routes for backward compatibility (STATIC FIRST)
router.get("/getAllLanguages", getAllLanguages);
router.get("/getLanguageById/:id", getLanguageById);
router.get("/getLanguagesByType/:type", getLanguagesByType);
router.get("/getLanguageStats", getLanguageStats);
router.put("/updateLanguage/:id", isAdmin, updateLanguage);
router.delete("/deleteCourseLanguageById/:id", isAdmin, deleteCourseLanguage);

// Modern RESTful routes
router.get("/stats", getLanguageStats);
router.get("/type/:type", getLanguagesByType);
router.get("/", getAllLanguages);
router.post("/", isAdmin, saveLanguage);
router.get("/:id", getLanguageById);
router.put("/:id", isAdmin, updateLanguage);
router.delete("/:id", isAdmin, deleteCourseLanguage);


// Bulk operations
router.post("/upload", isAdmin, uploadLanguagesBulk);
router.post("/saveAllLanguage", isAdmin, uploadLanguagesBulk);
router.post("/saveAllLanguages", isAdmin, saveAllLanguages);
router.post("/saveLanguage", isAdmin, saveLanguage);

export default router;
