// routes/examRoutes.js
import express from "express";
import {
  bulkUploadExams,
  getAllExams,
  getExamsByLevel,
  getExamOptions,
} from "../controller/examController.js";
import { isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/saveAllExams", isAdmin, bulkUploadExams);
router.get("/getAllExams", getAllExams);
router.get("/getAll", getAllExams);
router.get("/getExamsByLevel/:levelId", getExamsByLevel);
router.get("/options", getExamOptions);

export default router;
