// routes/skillRoutes.js
import express from "express";
import {
  bulkUploadSkills,
  getAllSkills,
  getSkillsByGoal,
  getSkillsByCategory,
  getSkillsByLevel,
  getSkillOptions,
} from "../controller/skillcontroller.js";
import { isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/saveAllSkills", isAdmin, bulkUploadSkills);
router.get("/getAllSkills", getAllSkills);
router.get("/getSkillsByGoal/:goalId", getSkillsByGoal);
router.get("/getSkillsByCategory/:categoryId", getSkillsByCategory);
router.get("/getSkillsByLevel/:levelId", getSkillsByLevel);
router.get("/options", getSkillOptions);

export default router;
