import express from "express";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
    createCourse,
    getCourseById,
    getAllCourses,
    updateCourse,
    deleteCourse,
    searchCourses,
    getCoursesByInstructor,
    getCoursesByCategory,
    toggleCourseStatus,
    getCoursesStats
} from "../controller/courseController.js";

const router = express.Router();

router.get("/getAllCourses", getAllCourses);                                       // Get all courses with pagination & filters
router.get("/:courseId", getCourseById);                              // Get single course by ID
router.put("/:courseId", authenticateToken, updateCourse);           // Update course
router.delete("/:courseId", authenticateToken, deleteCourse);        // Delete course (soft/hard)

// Search and Filter Operations
router.get("/search/courses", searchCourses);                        // Search courses
router.get("/instructor/:instructorId", getCoursesByInstructor);     // Get courses by instructor
router.get("/category/:categoryId", getCoursesByCategory);           // Get courses by category

// Course Management Operations
router.patch("/:courseId/status", authenticateToken, toggleCourseStatus); // Toggle course status

// Statistics and Analytics
router.get("/admin/stats", authenticateToken, getCoursesStats);      // Get course statistics

// Legacy routes (for backward compatibility)
router.post("/uploadCourse", authenticateToken, createCourse);       // Legacy create route
router.get("/getCourseById/:courseId", getCourseById);               // Legacy get route

export default router;
