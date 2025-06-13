import express from "express";
import {
  bulkUploadCourseLevels,
  getAllCourseLevels,
  getCourseLevelById,
} from "../controller/courseLevelController.js";
import { isTeacher } from "../middleware/authMiddleware.js";
import { validateSchema, courseLevelValidation, commonSchemas } from "../middleware/fieldValidation.js";
import { asyncErrorHandler } from "../middleware/standardErrorHandler.js";
import Joi from 'joi';

const router = express.Router();

// Bulk upload course levels
router.post("/bulk-upload", 
  isTeacher, 
  validateSchema(Joi.object({
    levels: Joi.array().items(courseLevelValidation.create).min(1).required()
  })),
  asyncErrorHandler(bulkUploadCourseLevels)
);

// Get all course levels
router.get("/", 
  isTeacher, 
  validateSchema(courseLevelValidation.query, 'query'),
  asyncErrorHandler(getAllCourseLevels)
);

// Get course level by ID (public access)
router.get("/:levelId", 
  validateSchema(Joi.object({ levelId: commonSchemas.id.required() }), 'params'),
  asyncErrorHandler(getCourseLevelById)
);

export default router;
