// routes/onboardingRoutes.js
import express from "express";
import { isStudent } from "../middleware/authMiddleware.js";
import {
  selectLanguages,
  selectGoals,
  selectSkills,
  selectExams,
} from "../controller/onboardingController.js";

const router = express.Router();

router.post("/languages", isStudent, selectLanguages); // API to select languages
router.post("/goals", isStudent, selectGoals); // API to select goal
router.post("/skills", isStudent, selectSkills); // API to select skills
router.post("/exams", isStudent, selectExams); // API to select exams

export default router;
