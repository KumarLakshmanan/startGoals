import express from "express";
import userRoutes from "./userRoutes.js";
import otpRoutes from "./otpRoutes.js";
import skillRoutes from "./skillRoutes.js";
import categories from "./categoryRoutes.js";
import LanguageRoutes from "./languageRoutes.js";
import onboardingRoutes from "./onboardingRoutes.js";
import goalRoutes from "./goalRoutes.js";
import examRoutes from "./examRoutes.js";
import courseRoutes from "./courseRoutes.js";
import courseLevelRoutes from "./courseLevelRoutes.js";
import sectionRoutes from "./sectionRoutes.js";
import liveSessionRoutes from "./liveSessionRoutes.js";
import batchRoutes from "./batchRoutes.js";
import batchStudentsRoutes from "./batchStudentsRoutes.js";
import webRoutes from "./webRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import bannerRoutes from "./bannerRoutes.js";
import searchRoutes from "./searchRoutes.js";
import ratingRoutes from "./ratingRoutes.js";
import projectRoutes from "./projectRoutes.js";
import discountRoutes from "./discountRoutes.js";
import projectFileRoutes from "./projectFileRoutes.js";
import projectRatingRoutes from "./projectRatingRoutes.js";
import fileUploadRoutes from "./fileUploadRoutes.js";
import teacherRoutes from "./teacherRoutes.js";
import coursePurchaseRoutes from "./coursePurchaseRoutes.js";
import notificationRoutes from "./notificationRoutes.js";
import certificateRoutes from "./certificateRoutes.js";
import analyticsRoutes from "./analyticsRoutes.js";
import liveCourseRoutes from "./liveCourseRoutes.js";

const router = express.Router();

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    status: "healthy",
  });
});

router.use("/user", userRoutes);
router.use("/otp", otpRoutes);
router.use("/skill", skillRoutes);
router.use("/category", categories);
router.use("/language", LanguageRoutes);
router.use("/onboarding", onboardingRoutes);
router.use("/goal", goalRoutes);
router.use("/exam", examRoutes);
router.use("/course", courseRoutes);
router.use("/course-levels", courseLevelRoutes);
router.use("/section", sectionRoutes);
router.use("/live-session", liveSessionRoutes);
router.use("/batch", batchRoutes);
router.use("/batch-students", batchStudentsRoutes);
router.use("/web", webRoutes);
router.use("/settings", settingsRoutes);
router.use("/banners", bannerRoutes);
router.use("/search", searchRoutes);
router.use("/ratings", ratingRoutes);
router.use("/projects", projectRoutes);
router.use("/project-files", projectFileRoutes);
router.use("/project-ratings", projectRatingRoutes);
router.use("/discounts", discountRoutes);
router.use("/upload", fileUploadRoutes);
// Admin routes
router.use("/admin/teachers", teacherRoutes);
router.use("/admin/analytics", analyticsRoutes);
router.use("/admin/courses", liveCourseRoutes);
router.use("/course-purchase", coursePurchaseRoutes);
router.use("/notifications", notificationRoutes);
router.use("/certificates", certificateRoutes);

export default router;
