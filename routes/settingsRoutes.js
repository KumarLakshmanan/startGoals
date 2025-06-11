import express from "express";
import {
  getSettings,
  upsertSetting,
  deleteSetting,
  initializeDefaultSettings,
} from "../controller/settingsController.js";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get settings (Admin only - sensitive configuration data)
router.get("/", isAdmin, getSettings);

// Create or update a setting (Admin only)
router.post("/", isAdmin, upsertSetting);

// Delete a setting (Admin only)
router.delete("/:id", isAdmin, deleteSetting);

// Initialize default settings (Admin only)
router.post("/initialize", isAdmin, initializeDefaultSettings);

export default router;
