import express from "express";
import {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  getBatchesByCourse,
} from "../controller/batchController.js";
import { isTeacher } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/batch/createBatch - Create a new batch
router.post("/createBatch", isTeacher, createBatch);

// GET /api/batch - Get all batches with pagination and filtering
router.get("/", getAllBatches);

// GET /api/batch/:batchId - Get batch by ID
router.get("/:batchId", getBatchById);

// PUT /api/batch/:batchId - Update batch
router.put("/:batchId", isTeacher, updateBatch);

// DELETE /api/batch/:batchId - Delete batch
router.delete("/:batchId", deleteBatch);

// GET /api/batch/course/:courseId - Get batches by course
router.get("/course/:courseId", getBatchesByCourse);

export default router;
