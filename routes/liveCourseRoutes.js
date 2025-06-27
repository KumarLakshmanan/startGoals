import express from "express";
import {
  authenticateToken,
  isTeacher,
  isAdmin,
} from "../middleware/authMiddleware.js";
import {
  createLiveCourse,
  createRecordedCourse,
  createCourseBatch,
  getLiveCourses,
  getRecordedCourses,
  getCourseBatches,
  getCourseTests,
  createCourseTest,
  updateCourseTest,
  deleteCourseTest,
  getCourseCertificates,
  createCourseCertificate,
  updateCourseCertificate,
  deleteCourseCertificate,
  getCoursePurchases,
  getPurchaseDetails,
  getCourseRatings,
  replyToRating,
  deleteRating
} from "../controller/liveCourseController.js";
import upload from "../middleware/fileUploadMiddleware.js";

const router = express.Router();

// ===================== COURSE CREATION ROUTES =====================
// Create new courses
router.post("/live", isAdmin, createLiveCourse);
router.post("/recorded", isAdmin, createRecordedCourse);

// ===================== COURSE MANAGEMENT ROUTES =====================
// Get courses
router.get("/live", isAdmin, getLiveCourses);
router.get("/recorded", isAdmin, getRecordedCourses);

// Batch management for live courses
router.post("/:courseId/batches", isAdmin, createCourseBatch);
router.get("/:courseId/batches", isAdmin, getCourseBatches);

// Course tests
router.get("/:courseId/tests", isAdmin, getCourseTests);
router.post("/:courseId/tests", isAdmin, createCourseTest);
router.put("/:courseId/tests/:testId", isAdmin, updateCourseTest);
router.delete("/:courseId/tests/:testId", isAdmin, deleteCourseTest);

// Course certificates
router.get("/:courseId/certificates", isAdmin, getCourseCertificates);
router.post("/:courseId/certificates", isAdmin, upload.single('templateImage'), createCourseCertificate);
router.put("/:courseId/certificates/:certificateId", isAdmin, upload.single('templateImage'), updateCourseCertificate);
router.delete("/:courseId/certificates/:certificateId", isAdmin, deleteCourseCertificate);

// Course purchases
router.get("/:courseId/purchases", isAdmin, getCoursePurchases);
router.get("/:courseId/purchases/:purchaseId", isAdmin, getPurchaseDetails);

// Course ratings and reviews
router.get("/:courseId/ratings", isAdmin, getCourseRatings);
router.post("/:courseId/ratings/:ratingId/reply", isAdmin, replyToRating);
router.delete("/:courseId/ratings/:ratingId", isAdmin, deleteRating);

export default router;
