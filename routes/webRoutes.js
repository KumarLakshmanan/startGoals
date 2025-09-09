// Live Session Web Interface Routes
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import pkg from "agora-access-token";
const { RtcRole } = pkg;
import agoraService from "../services/agoraService.js";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Serve static files for the web interface
router.use("/assets", express.static(path.join(__dirname, "../web/assets")));

// Teacher dashboard route
router.get("/live-session/teacher/:sessionId", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/teacher.html"));
});

router.get("/live-session/teacher", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/teacher.html"));
});

// Student session route
router.get("/live-session/student/:sessionId", (req, res) => {
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

// Payment link for Razorpay payment page
router.get("/razorpay", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/razorpay-payment.html"));
});

// Payment link for Razorpay payment page
router.get("/payment", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/payment.html"));
});

// HLS Video Player route
router.get("/video-player", (req, res) => {
  res.sendFile(path.join(__dirname, "../web/video-player.html"));
});

// Enhanced proxy HLS files from S3 to bypass CORS
router.get('/proxy/hls', async (req, res) => {
  const fileUrl = req.query.url;
  if (!fileUrl) return res.status(400).send('Missing url parameter');
  try {
    const response = await fetch(fileUrl);
    if (!response.ok) return res.status(response.status).send('Failed to fetch file');
    
    // Set appropriate headers for HLS streaming
    res.set({
      'Content-Type': fileUrl.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Cache-Control': 'public, max-age=31536000'
    });
    
    response.body.pipe(res);
  } catch (err) {
    console.error('HLS proxy error:', err);
    res.status(500).send('Proxy error');
  }
});

// Proxy route for S3 videos to handle CORS (general video files)
// TODO: Fix route pattern for video proxy
// router.get("/proxy/video/:path(*)", async (req, res) => {
//   // Implementation for video proxy
// });

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
    console.error("Get session config error:", error);
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

// ===================== ANALYTICS DASHBOARD API ENDPOINTS =====================
// These endpoints are for the analytics dashboard and require admin authentication

// Get basic dashboard stats
router.get("/api/dashboard/stats", authenticateToken, isAdmin, (req, res) => {
  // This would connect to your analytics service
  // For now, return mock data
  const stats = {
    totalUsers: 2500,
    activeUsers: 1800,
    totalCourses: 150,
    totalRevenue: 325000,
    newUsersToday: 35,
    completedCourses: 780
  };
  
  res.json({ success: true, data: stats });
});

// Get user activity graph data
router.get("/api/dashboard/user-activity", authenticateToken, isAdmin, (req, res) => {
  // This would connect to your analytics service
  // For now, return mock data
  const userActivity = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Active Users",
        data: [650, 730, 690, 810, 880, 720, 680]
      },
      {
        label: "New Registrations",
        data: [120, 135, 110, 150, 180, 90, 85]
      }
    ]
  };
  
  res.json({ success: true, data: userActivity });
});

// Get revenue graph data
router.get("/api/dashboard/revenue", authenticateToken, isAdmin, (req, res) => {
  // This would connect to your analytics service
  // For now, return mock data
  const revenue = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        label: "Revenue",
        data: [35000, 42000, 38000, 45000, 50000, 55000]
      }
    ]
  };
  
  res.json({ success: true, data: revenue });
});

// Get course popularity data
router.get("/api/dashboard/popular-courses", authenticateToken, isAdmin, (req, res) => {
  // This would connect to your analytics service
  // For now, return mock data
  const popularCourses = [
    { name: "JavaScript Fundamentals", enrollments: 256, rating: 4.7 },
    { name: "React Mastery", enrollments: 212, rating: 4.8 },
    { name: "Node.js Backend", enrollments: 187, rating: 4.7 },
    { name: "Python for Beginners", enrollments: 145, rating: 4.5 },
    { name: "Data Science Essentials", enrollments: 132, rating: 4.6 }
  ];
  
  res.json({ success: true, data: popularCourses });
});

export default router;
