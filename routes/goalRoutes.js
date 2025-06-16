// routes/goalRoutes.js
import express from "express";
import {
  bulkUploadGoals,
  getAllGoals,
  getGoalsByLevel,
  getGoalOptions,
} from "../controller/goalController.js";
import { isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/saveAllGoals", isAdmin, bulkUploadGoals);
router.get("/getAllGoals", getAllGoals);
router.get("/getAll", getAllGoals);
router.get("/getGoalsByLevel/:levelId", getGoalsByLevel);
router.get("/options", getGoalOptions);

export default router;
