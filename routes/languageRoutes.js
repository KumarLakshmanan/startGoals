import express from "express";
import { authenticateToken, isTeacher, } from "../middleware/authMiddleware.js";
import {
  deleteCourseLanguage,
  uploadLanguagesBulk,
  getAllLanguages,
} from "../controller/languageController.js";

const router = express.Router();

router.post("/saveAllLanguage", isTeacher, uploadLanguagesBulk);
router.get("/getAllLanguage", getAllLanguages);
router.delete("/deleteCourseLanguageById/:id", isTeacher, deleteCourseLanguage);

export default router;
