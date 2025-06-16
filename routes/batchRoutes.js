import express from "express";
import {
  createBatch,
  getAllBatches,
  getBatchById,
  updateBatch,
  deleteBatch,
  getBatchesByCourse,
  // New admin batch management functions
  createBatchWithAutoEnrollment,
  manageBatchStudents,
  createBatchSchedule,
  getBatchManagementData,
  getBatchAnalytics,
  bulkBatchOperations,
} from "../controller/batchController.js";
import { isTeacher, isStudent, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// ===================== ADMIN/OWNER BATCH MANAGEMENT =====================

// Admin batch management
router.post(
  "/admin/create-with-enrollment",
  isAdmin,
  createBatchWithAutoEnrollment,
);
router.get("/admin/manage/:batchId", isAdmin, getBatchManagementData);
router.get("/admin/analytics/:batchId", isAdmin, getBatchAnalytics);

// Batch student management
router.post("/admin/:batchId/manage-students", isAdmin, manageBatchStudents);

// Batch scheduling
router.post("/admin/:batchId/schedule", isAdmin, createBatchSchedule);

// Bulk operations
router.post("/admin/bulk-operations", isAdmin, bulkBatchOperations);

// ===================== GENERAL BATCH ROUTES =====================

// POST /api/batch/createBatch - Create a new batch
router.post("/createBatch", isTeacher, createBatch);

// GET /api/batch - Get all batches with pagination and filtering
router.get("/", isStudent, getAllBatches);

// GET /api/batch/:batchId - Get batch by ID
router.get("/:batchId", isStudent, getBatchById);

// PUT /api/batch/:batchId - Update batch
router.put("/:batchId", isTeacher, updateBatch);

// DELETE /api/batch/:batchId - Delete batch
router.delete("/:batchId", isTeacher, deleteBatch);

// GET /api/batch/course/:courseId - Get batches by course
router.get("/course/:courseId", isStudent, getBatchesByCourse);

export default router;
