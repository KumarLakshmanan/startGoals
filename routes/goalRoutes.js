// routes/goalRoutes.js
import express from "express";
import {
  bulkUploadGoals,
  getAllGoals,
  getGoalsByLevel,
  getGoalOptions,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal
} from "../controller/goalController.js";
import { isAdmin, isTeacher } from "../middleware/authMiddleware.js";

const router = express.Router();



// Legacy routes for backward compatibility (STATIC FIRST)
router.get("/getAllGoals", getAllGoals); // GET all goals
router.post("/createGoal", isTeacher, createGoal); // CREATE goal
router.get("/getGoal/:goalId", getGoal); // GET goal by ID
router.put("/updateGoal/:goalId", isTeacher, updateGoal); // UPDATE goal
router.delete("/deleteGoal/:goalId", isTeacher, deleteGoal); // DELETE goal
router.get("/level/:levelId", getGoalsByLevel); // GET by level (already present as special route)
// Keep other legacy routes for compatibility
router.post("/saveAllGoals", isAdmin, bulkUploadGoals);
router.get("/getAll", getAllGoals);
router.get("/getGoalsByLevel/:levelId", getGoalsByLevel);

// Special routes
router.get("/level/:levelId", getGoalsByLevel);
router.get("/options", getGoalOptions);

// Modern RESTful routes
router.get("/", getAllGoals);
router.post("/", isTeacher, createGoal);
router.get("/:goalId", getGoal);
router.put("/:goalId", isTeacher, updateGoal);
router.delete("/:goalId", isTeacher, deleteGoal);

export default router;
