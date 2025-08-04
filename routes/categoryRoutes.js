import express from "express";
import { isAdmin } from "../middleware/authMiddleware.js";
import {
  createCategory,
  getAllCategories,
  getCategoryById,
  getCategoryByCode,
  deleteCategoryById,
  updateCategory,
  reorderCategories,
} from "../controller/categoryController.js";

const router = express.Router();

// Legacy routes for backward compatibility (STATIC FIRST)
router.get("/getAllCategories", getAllCategories);
router.get("/getCategory/:id", getCategoryById);
router.post("/createCategory", isAdmin, createCategory);
router.get("/getCategoryByCode/:code", getCategoryByCode);
router.delete("/deleteCategory/:id", isAdmin, deleteCategoryById);
router.put("/updateCategory/:id", isAdmin, updateCategory); // Assuming updateCategory uses the same logic as createCategory
router.post("/reorderCategories", isAdmin, reorderCategories);



export default router;
