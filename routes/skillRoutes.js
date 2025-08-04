// routes/skillRoutes.js
import express from "express";
import {
  getAllSkills,
  getSkillsByLevel,
  getSkillOptions,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill
} from "../controller/skillcontroller.js";
import { isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();


router.post("/createSkill", isAdmin, createSkill);
router.get("/getAllSkills", getAllSkills);
router.get("/getSkill/:skillId", getSkill);
router.get("/getSkillsByLevel/:levelId", getSkillsByLevel);
router.put("/updateSkill/:skillId", isAdmin, updateSkill);
router.delete("/deleteSkill/:skillId", isAdmin, deleteSkill);

// Special routes
router.get("/level/:levelId", getSkillsByLevel);
router.get("/options", getSkillOptions);

// Modern RESTful routes
router.get("/", getAllSkills);
router.post("/", isAdmin, createSkill);
router.get("/:skillId", getSkill);
router.put("/:skillId", isAdmin, updateSkill);
router.delete("/:skillId", isAdmin, deleteSkill);

export default router;
