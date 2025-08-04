// routes/examRoutes.js
import express from "express";
import {
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

// Root routes for various requests
router.get("/", getAllExams);
router.post("/", isAdmin, createExam);

// Legacy routes
router.post("/createExam", isAdmin, createExam);
router.get("/getAllExams", getAllExams);
router.get("/getAll", getAllExams);
router.get("/getExamsByLevel/:levelId", getExamsByLevel);
router.get("/options", getExamOptions);

// RESTful routes
router.get("/:id", getExamById);
router.put("/:id", isAdmin, updateExam);
router.delete("/:id", isAdmin, deleteExam);

export default router;
