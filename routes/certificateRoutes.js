// ===========================================================================================
// CERTIFICATE ROUTES
// Routes for generating, retrieving, and verifying course completion certificates
// ===========================================================================================

import express from "express";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import {
  generateCertificate,
  getUserCertificates,
  getCertificateById,
  verifyCertificate,
  downloadCertificate,
  getAllCertificates
} from "../controller/certificateController.js";

const router = express.Router();

// ===================== USER CERTIFICATE ROUTES =====================

// Generate a certificate for a completed course
router.post("/generate/:courseId", authenticateToken, generateCertificate);

// Get all certificates for the current user
router.get("/my-certificates", authenticateToken, getUserCertificates);

// Get a specific certificate by ID
router.get("/:certificateId", authenticateToken, getCertificateById);

// Download certificate PDF
router.get("/:certificateId/download", authenticateToken, downloadCertificate);

// ===================== PUBLIC CERTIFICATE ROUTES =====================

// Verify a certificate by certificate number (public access)
router.get("/verify/:certificateNumber", verifyCertificate);

// ===================== ADMIN CERTIFICATE ROUTES =====================

// Get all certificates (admin only)
router.get("/admin/all", authenticateToken, isAdmin, getAllCertificates);

export default router;
