// Live Session Web Interface Routes
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "agora-access-token";
const { RtcRole } = pkg;
import agoraService from "../services/agoraService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Serve static files for the web interface
router.use("/assets", express.static(path.join(__dirname, "../web/assets")));

// Teacher dashboard route
router.get("/live-session/teacher/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  res.sendFile(path.join(__dirname, "../web/teacher.html"));
});

router.get("/live-session/teacher", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/teacher.html"));
});

// Student session route
router.get("/live-session/student/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  res.sendFile(path.join(__dirname, "../web/student.html"));
});

router.get("/live-session/student", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/student.html"));
});
router.get("/search-demo", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/search-demo.html"));
});

// Session selection page
router.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/index.html"));
});

// Test page for debugging
router.get("/test", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/test.html"));
});

// API endpoint to get session configuration
router.get("/api/session-config/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // This would typically fetch from your database
    // For now, return a basic configuration
    const config = {
      sessionId,
      agoraAppId: process.env.AGORA_APP_ID,
      channelName: `session_${sessionId}`,
      // Don't send the certificate to client
    };

    res.json(config);
  } catch (error) {
    res.status(500).json({ error: "Failed to get session configuration" });
  }
});

// API endpoint to get Agora token
router.post("/api/agora-token", async (req, res) => {
  try {
    const { channelName, userId, role } = req.body;

    if (!channelName || !userId) {
      return res
        .status(400)
        .json({ error: "Channel name and user ID are required" });
    }

    // Determine role: teacher = publisher, student = subscriber initially
    const agoraRole =
      role === "teacher" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    const tokenData = agoraService.generateToken(
      channelName,
      parseInt(userId),
      agoraRole,
      3600, // 1 hour expiration
    );

    res.json(tokenData);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

export default router;
