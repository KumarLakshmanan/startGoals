import express from "express";
import {
  addStudentToBatch,
  removeStudentFromBatch,
  getStudentsInBatch,
  getBatchesForStudent,
  updateStudentStatusInBatch,
  bulkAddStudentsToBatch,
  getBatchStatistics,
} from "../controller/batchStudentsController.js";
import { isTeacher } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/batch-students/add - Add a student to a batch
router.post("/add", isTeacher, addStudentToBatch);

// DELETE /api/batch-students/remove - Remove a student from a batch
router.delete("/remove", isTeacher, removeStudentFromBatch);

// GET /api/batch-students/student/:userId - Get all batches for a specific student
router.get("/student/:userId", getBatchesForStudent);

// PUT /api/batch-students/status - Update student status in a batch
router.put("/status", isTeacher, updateStudentStatusInBatch);

// POST /api/batch-students/bulk-add - Add multiple students to a batch
router.post("/bulk-add", isTeacher, bulkAddStudentsToBatch);

// GET /api/batch-students/statistics/:batchId - Get batch statistics
router.get("/statistics/:batchId", getBatchStatistics);

export default router;
