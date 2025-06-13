import express from "express";
import {
  createSection,
  updateSectionById,
  getSectionsByCourseId,
  getSectionById,
  // New admin section management functions
  createSectionAdmin,
  updateSectionAdmin,
  deleteSectionAdmin,
  reorderSections,
  getCourseContentManagement,
  bulkPublishContent
} from "../controller/sectionController.js";
import { authenticateToken, isTeacher, isStudent, isAdmin } from "../middleware/authMiddleware.js";
import { 
    sectionValidation, 
    commonSchemas,
    validateSchema, 
    asyncErrorHandler 
} from "../middleware/fieldValidation.js";
import Joi from 'joi';

const router = express.Router();

// ===================== ADMIN/OWNER SECTION MANAGEMENT =====================

// Admin section management
router.post("/admin/create", 
    isAdmin, 
    validateSchema(sectionValidation.create),
    asyncErrorHandler(createSectionAdmin)
);

router.put("/admin/:sectionId", 
    isAdmin, 
    validateSchema(Joi.object({ sectionId: commonSchemas.id.required() }), 'params'),
    validateSchema(sectionValidation.create), // Can use full create schema for updates too
    asyncErrorHandler(updateSectionAdmin)
);

router.delete("/admin/:sectionId", 
    isAdmin, 
    validateSchema(Joi.object({ sectionId: commonSchemas.id.required() }), 'params'),
    asyncErrorHandler(deleteSectionAdmin)
);

// Content management
router.get("/admin/course/:courseId/content", 
    isAdmin, 
    validateSchema(Joi.object({ courseId: commonSchemas.id.required() }), 'params'),
    validateSchema(sectionValidation.filter, 'query'),
    asyncErrorHandler(getCourseContentManagement)
);

router.post("/admin/course/:courseId/reorder", 
    isAdmin, 
    validateSchema(Joi.object({ courseId: commonSchemas.id.required() }), 'params'),
    validateSchema(sectionValidation.reorder),
    asyncErrorHandler(reorderSections)
);

router.post("/admin/course/:courseId/bulk-publish", 
    isAdmin, 
    validateSchema(Joi.object({ courseId: commonSchemas.id.required() }), 'params'),
    asyncErrorHandler(bulkPublishContent)
);

// ===================== GENERAL SECTION ROUTES =====================

router.post("/uploadSection", isTeacher, createSection); // Create section (Teacher only)
router.put("/updateSectionById/:sectionId", isTeacher, updateSectionById); // Update section (Teacher only)
router.get("/getSectionsByCourseId/:courseId", isStudent, getSectionsByCourseId); // Get all sections for a course (Students/Teachers)
router.get("/getSectionById/:sectionId", isStudent, getSectionById); // Get single section by ID (Students/Teachers)

export default router;
