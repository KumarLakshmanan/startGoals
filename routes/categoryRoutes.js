import express from "express";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import {
  createCategory,
  getAllCategories,
  bulkCreateCategories,
  getCategoryById,
  getCategoryByCode,
  deleteCategoryById,
} from "../controller/categoryController.js";
import { validateSchema, categoryValidation, commonSchemas } from "../middleware/fieldValidation.js";
import { asyncErrorHandler } from "../middleware/standardErrorHandler.js";
import Joi from 'joi';

const router = express.Router();

router.post("/saveCategory", 
  isAdmin, 
  validateSchema(categoryValidation.create),
  asyncErrorHandler(createCategory)
);

router.post("/saveAllCategories", 
  isAdmin, 
  validateSchema(categoryValidation.bulkUpdate),
  asyncErrorHandler(bulkCreateCategories)
);

router.get("/getCategories", 
  validateSchema(categoryValidation.query, 'query'),
  asyncErrorHandler(getAllCategories)
);

router.get("/categoryById/:id", 
  validateSchema(Joi.object({ id: commonSchemas.id.required() }), 'params'),
  asyncErrorHandler(getCategoryById)
);

router.get("/categoryByCode/:code", 
  validateSchema(Joi.object({ code: Joi.string().min(2).max(50).required() }), 'params'),
  asyncErrorHandler(getCategoryByCode)
);

router.delete("/deleteCategory/:id", 
  isAdmin, 
  validateSchema(Joi.object({ id: commonSchemas.id.required() }), 'params'),
  asyncErrorHandler(deleteCategoryById)
);

export default router;
