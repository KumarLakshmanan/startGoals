import express from "express";
import userRoutes from "./userRoutes.js";
import otpRoutes from "./otpRoutes.js";
import skillRoutes from "./skillRoutes.js";
import categories from "./categoryRoutes.js";
import LanguageRoutes from "./languageRoutes.js";
import onboardingRoutes from "./onboardingRoutes.js";
import goalRoutes from "./goalRoutes.js";
import courseRoutes from "./courseRoutes.js";
import courseLevelRoutes from "./courseLevelRoutes.js";
import sectionRoutes from "./sectionRoutes.js";
import liveSessionRoutes from "./liveSessionRoutes.js";
import batchRoutes from "./batchRoutes.js";
import batchStudentsRoutes from "./batchStudentsRoutes.js";
import webRoutes from "./webRoutes.js";

const router = express.Router();

router.use('/user', userRoutes);
router.use('/otp', otpRoutes);
router.use('/skill', skillRoutes);
router.use('/category', categories);
router.use('/language', LanguageRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/goal', goalRoutes);
router.use('/course', courseRoutes);
router.use('/course-levels', courseLevelRoutes);
router.use('/section', sectionRoutes);
router.use('/live-session', liveSessionRoutes);
router.use('/batch', batchRoutes);
router.use('/batch-students', batchStudentsRoutes);
router.use('/web/live-session', webRoutes);

export default router;
