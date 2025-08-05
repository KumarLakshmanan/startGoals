// ===========================================================================================
// PROJECT ROUTES - UNIFIED
// Combined user-facing project functionality with comprehensive admin management features
// Includes both public project operations and advanced admin analytics
// ===========================================================================================

import express from "express";
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  bulkDeleteProjects,
  initiateProjectPurchase,
  completeProjectPurchase,
  getUserPurchases,
  getProjectStatistics,
  // Language management
  getProjectLanguages,
  addProjectLanguages,
  removeProjectLanguage,
  // Instructor management
  getProjectInstructors,
  addProjectInstructors,
  removeProjectInstructor,
  getAllInstructors
} from "../controller/projectController.js";
import { isAdmin, authenticateToken, isStudent } from "../middleware/authMiddleware.js";
import { validateSchema, projectValidation } from "../middleware/fieldValidation.js";

const router = express.Router();

// ===================== PROJECT MANAGEMENT ROUTES =====================

// Create new project (Admin only)
router.post(
  "/create",
  isAdmin,
  validateSchema(projectValidation.create),
  createProject,
);

// Update project (Creator only)
router.put(
  "/update/:id",
  isAdmin,
  validateSchema(projectValidation.getById), // Optionally validate params
  validateSchema(projectValidation.create), // Optionally validate params
  updateProject,
);

// Get all projects with filtering (Public)
router.get(
  "/getAll",
  isStudent,
  validateSchema(projectValidation.filter, "query"),
  getAllProjects,
);

// Get single project by ID (Public)
router.get(
  "/get/:id",
  isStudent,
  validateSchema(projectValidation.getById),
  getProjectById,
);

// Delete project (Creator only)
router.delete(
  "/delete/:id",
  isAdmin,
  validateSchema(projectValidation.getById),
  deleteProject,
);

// Bulk delete projects (Admin only)
router.delete(
  "/bulk-delete",
  isAdmin,
  validateSchema(projectValidation.bulkDelete),
  bulkDeleteProjects
);

// ===================== PROJECT PURCHASE ROUTES =====================

// Initiate project purchase (Authenticated users only)
router.post(
  "/purchase",
  isStudent,
  validateSchema(projectValidation.purchase),
  initiateProjectPurchase,
);

// Complete project purchase (webhook endpoint)
router.post(
  "/purchase/complete",
  validateSchema(projectValidation.completePurchase),
  completeProjectPurchase,
);

// Get user's purchased projects (Authenticated users only)
router.get(
  "/purchases/my",
  authenticateToken,
  validateSchema(projectValidation.purchaseHistory, "query"),
  getUserPurchases,
);

// ===================== ADMIN STATISTICS ROUTES =====================

// Get project statistics (Admin only)
router.get(
  "/statistics",
  isAdmin,
  validateSchema(projectValidation.statistics, "query"),
  getProjectStatistics,
);

// Admin: get project by ID
router.get(
  "/:id",
  isStudent,
  validateSchema(projectValidation.getById),
  getProjectById,
);

// Admin: update project by ID
router.put(
  "/:id",
  isAdmin,
  validateSchema(projectValidation.getById, "body"),
  updateProject
);

// Admin: delete project by ID
router.delete(
  "/:id",
  isAdmin,
  validateSchema(projectValidation.getById),
  deleteProject
);

// Admin: bulk delete projects
router.delete(
  "/bulk-delete",
  isAdmin,
  validateSchema(projectValidation.bulkDelete),
  bulkDeleteProjects
);

// ===================== PROJECT LANGUAGE MANAGEMENT =====================

// Project Language CRUD operations
router.get("/:projectId/languages", authenticateToken, getProjectLanguages); // Get project languages
router.post("/:projectId/languages", isAdmin, addProjectLanguages); // Add languages to project
router.delete("/:projectId/languages/:languageId", isAdmin, removeProjectLanguage); // Remove language from project

// ===================== PROJECT INSTRUCTOR MANAGEMENT =====================

// Get all available instructors (for dropdowns)
router.get("/admin/instructors", isAdmin, getAllInstructors);

// Project Instructor CRUD operations
router.get("/:projectId/instructors", authenticateToken, getProjectInstructors); // Get project instructors
router.post("/:projectId/instructors", isAdmin, addProjectInstructors); // Add instructors to project
router.delete("/:projectId/instructors/:instructorId", isAdmin, removeProjectInstructor); // Remove instructor from project

export default router;
