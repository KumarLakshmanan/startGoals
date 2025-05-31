import express from "express";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import {
  deleteCourseLanguage,
  uploadLanguagesBulk,
  getAllLanguages,
} from "../controller/languageController.js";

const router = express.Router();

router.post("/saveAllLanguage", isAdmin, uploadLanguagesBulk);
router.get("/getAllLanguage", getAllLanguages);
router.delete("/deleteCourseLanguageById/:id", isAdmin, deleteCourseLanguage);

export default router;
