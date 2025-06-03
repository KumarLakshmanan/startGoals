// routes/goalRoutes.js
import express from "express";
import { bulkUploadGoals, getAllGoals } from "../controller/goalController.js";
import { isAdmin } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/saveAllGoals", isAdmin,  bulkUploadGoals);
router.get("/getAllGoals", getAllGoals);

export default router;
