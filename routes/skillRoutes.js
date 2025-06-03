// routes/skillRoutes.js
import express from "express";
import {
  bulkUploadSkills,
  getAllSkills,
  getSkillsByGoal,
} from "../controller/skillcontroller.js";
import { isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/saveAllSkills", isAdmin, bulkUploadSkills);
router.get("/getAllSkills", getAllSkills);
router.get("/getSkillsByGoal/:goalId", getSkillsByGoal);

export default router;
