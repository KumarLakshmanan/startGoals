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

const router = express.Router();

router.post("/saveCategory", isAdmin, createCategory);
router.post("/saveAllCategories", isAdmin, bulkCreateCategories);
router.get("/getCategories", getAllCategories);
router.get("/categoryById/:id", getCategoryById);
router.get("/categoryByCode/:code", getCategoryByCode);
router.delete("/deleteCategory/:id", isAdmin, deleteCategoryById);

export default router;
