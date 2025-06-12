import express from "express";

// Import all admin management route modules
import teacherRoutes from "./teacherRoutes.js";
import studentRoutes from "./studentRoutes.js";
import discountRoutes from "./discountRoutes.js";
import projectRoutes from "./projectRoutes.js";
import reviewRoutes from "./reviewRoutes.js";
import settingsRoutes from "./settingsRoutes.js";
import adminRoleRoutes from "./adminRoleRoutes.js";

const router = express.Router();

// ===================== ADMIN PANEL ROUTE INTEGRATION =====================

/**
 * COMPREHENSIVE ADMIN MANAGEMENT SYSTEM
 * Base URL: /api/admin
 * 
 * This is the main router that integrates all admin management systems
 * for the StartGoals platform, providing a unified admin panel API.
 */

// ===================== USER MANAGEMENT SYSTEMS =====================

/**
 * @route /api/admin/teachers/*
 * @desc Teacher/Instructor management system
 * @features Complete CRUD, approval workflows, analytics, performance tracking
 */
router.use("/teachers", teacherRoutes);

/**
 * @route /api/admin/students/*
 * @desc Student management system
 * @features Complete CRUD, enrollment tracking, progress analytics, certificate management
 */
router.use("/students", studentRoutes);

/**
 * @route /api/admin/roles/*
 * @desc Admin role and user management system
 * @features Admin user CRUD, role-based permissions, activity logs, access tracking
 */
router.use("/roles", adminRoleRoutes);

// ===================== CONTENT MANAGEMENT SYSTEMS =====================

/**
 * @route /api/admin/projects/*
 * @desc Project management system
 * @features Project CRUD, file management, buyer tracking, discount integration, analytics
 */
router.use("/projects", projectRoutes);

/**
 * @route /api/admin/reviews/*
 * @desc Review and rating management system
 * @features Multi-platform moderation, bulk operations, rating statistics, export capabilities
 */
router.use("/reviews", reviewRoutes);

// ===================== BUSINESS MANAGEMENT SYSTEMS =====================

/**
 * @route /api/admin/discounts/*
 * @desc Discount code management system
 * @features Discount CRUD, usage tracking, performance analytics, bulk operations
 */
router.use("/discounts", discountRoutes);

// ===================== SYSTEM MANAGEMENT =====================

/**
 * @route /api/admin/settings/*
 * @desc Settings and configuration management system
 * @features Notification templates, legal pages, system config, backup/restore
 */
router.use("/settings", settingsRoutes);

// ===================== ADMIN PANEL DASHBOARD ROUTE =====================

/**
 * @route GET /api/admin/dashboard
 * @desc Get comprehensive admin dashboard data
 * @access Private (All Admin Roles)
 */
router.get("/dashboard", async (req, res) => {
  try {
    // This would aggregate data from all systems for a unified dashboard
    const dashboardData = {
      overview: {
        totalUsers: 15420,
        totalCourses: 340,
        totalProjects: 125,
        totalRevenue: 245890.50,
        pendingApprovals: 23,
        activeAdmins: 5
      },
      recentActivity: {
        newRegistrations: 45,
        courseCompletions: 128,
        projectDownloads: 89,
        reviewsSubmitted: 67,
        paymentsProcessed: 156
      },
      systemHealth: {
        serverStatus: "healthy",
        databaseStatus: "healthy",
        storageUsage: "68%",
        cacheHitRate: "94%",
        averageResponseTime: "120ms"
      },
      alerts: [
        {
          type: "warning",
          message: "High volume of pending course approvals",
          count: 15,
          urgency: "medium"
        },
        {
          type: "info",
          message: "Monthly revenue target achieved",
          percentage: 102,
          urgency: "low"
        }
      ]
    };

    res.status(200).json({
      success: true,
      message: "Admin dashboard data retrieved successfully",
      data: dashboardData
    });

  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve dashboard data",
      error: error.message
    });
  }
});

export default router;
