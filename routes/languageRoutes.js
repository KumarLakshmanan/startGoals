import express from "express";
import { authenticateToken, isTeacher, } from "../middleware/authMiddleware.js";
import {
  deleteCourseLanguage,
  uploadLanguagesBulk,
  getAllLanguages,
} from "../controller/languageController.js";
import { validateSchema, languageValidation, commonSchemas } from "../middleware/fieldValidation.js";
import { asyncErrorHandler } from "../middleware/standardErrorHandler.js";
import Joi from 'joi';

const router = express.Router();

router.post("/saveAllLanguage", 
  isTeacher, 
  validateSchema(Joi.object({
    languages: Joi.array().items(languageValidation.create).min(1).required()
  })),
  asyncErrorHandler(uploadLanguagesBulk)
);

router.get("/getAllLanguage", 
  validateSchema(languageValidation.query, 'query'),
  asyncErrorHandler(getAllLanguages)
);

router.delete("/deleteCourseLanguageById/:id", 
  isTeacher, 
  validateSchema(Joi.object({ id: commonSchemas.id.required() }), 'params'),
  asyncErrorHandler(deleteCourseLanguage)
);

export default router;
