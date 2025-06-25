// routes/examRoutes.js
import express from "express";
import {
  bulkUploadExams,
  getAllExams,
  getExamsByLevel,
  getExamOptions,
  createExam,
  getExamById,
  updateExam,
  deleteExam
} from "../controller/examController.js";
import { isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/saveAllExams", isAdmin, bulkUploadExams);
router.get("/getAllExams", getAllExams);
router.get("/getAll", getAllExams);
router.get("/getExamsByLevel/:levelId", getExamsByLevel);
router.get("/options", getExamOptions);

// New routes for CRUD operations
router.post("/", isAdmin, createExam);
router.get("/:id", getExamById);
router.put("/:id", isAdmin, updateExam);
router.delete("/:id", isAdmin, deleteExam);

export default router;
