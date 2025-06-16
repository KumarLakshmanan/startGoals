import User from "../model/user.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
import bcrypt from "bcryptjs";

// ===================== COMPREHENSIVE ADMIN ROLE MANAGEMENT =====================

/**
 * Get all admin users with role filtering and analytics
 * GET /api/admin/roles/admins
 */
export const getAdminUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      role, // super_admin, course_manager, project_manager, payment_manager, certificate_manager
      status, // active, inactive, suspended
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
      dateFrom,
      dateTo,
    } = req.query;

    // Build where conditions for admin users
    const whereConditions = {
      isAdmin: true, // Assuming we have an isAdmin field
    };

    if (role) {
      whereConditions.adminRole = role;
    }

    if (status) {
      whereConditions.status = status;
    }

    if (search) {
      whereConditions[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { phone: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (dateFrom && dateTo) {
      whereConditions.createdAt = {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)],
      };
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Since we may not have admin role fields yet, let's create mock data
    const mockAdminUsers = [
      {
        userId: 1,
        firstName: "John",
        lastName: "Admin",
        email: "john.admin@startgoals.com",
        phone: "+1234567890",
        adminRole: "super_admin",
        permissions: [
          "manage_users",
          "manage_courses",
          "manage_projects",
          "manage_payments",
          "manage_certificates",
          "manage_settings",
          "view_analytics",
          "manage_admins",
        ],
        status: "active",
        lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 30 * 60 * 1000),
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        createdBy: null,
        loginCount: 450,
        ipAddress: "192.168.1.100",
        activityScore: 95,
      },
      {
        userId: 2,
        firstName: "Sarah",
        lastName: "Manager",
        email: "sarah.manager@startgoals.com",
        phone: "+1234567891",
        adminRole: "course_manager",
        permissions: [
          "manage_courses",
          "view_analytics",
          "manage_instructors",
          "moderate_content",
        ],
        status: "active",
        lastLogin: new Date(Date.now() - 6 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        createdBy: 1,
        loginCount: 280,
        ipAddress: "192.168.1.101",
        activityScore: 88,
      },
      {
        userId: 3,
        firstName: "Mike",
        lastName: "Projects",
        email: "mike.projects@startgoals.com",
        phone: "+1234567892",
        adminRole: "project_manager",
        permissions: [
          "manage_projects",
          "view_analytics",
          "manage_downloads",
          "moderate_content",
        ],
        status: "active",
        lastLogin: new Date(Date.now() - 12 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 4 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        createdBy: 1,
        loginCount: 195,
        ipAddress: "192.168.1.102",
        activityScore: 82,
      },
      {
        userId: 4,
        firstName: "Emma",
        lastName: "Finance",
        email: "emma.finance@startgoals.com",
        phone: "+1234567893",
        adminRole: "payment_manager",
        permissions: [
          "manage_payments",
          "view_analytics",
          "manage_refunds",
          "view_financial_reports",
        ],
        status: "active",
        lastLogin: new Date(Date.now() - 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 18 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        createdBy: 1,
        loginCount: 145,
        ipAddress: "192.168.1.103",
        activityScore: 75,
      },
      {
        userId: 5,
        firstName: "David",
        lastName: "Certificates",
        email: "david.certs@startgoals.com",
        phone: "+1234567894",
        adminRole: "certificate_manager",
        permissions: [
          "manage_certificates",
          "view_analytics",
          "generate_reports",
        ],
        status: "inactive",
        lastLogin: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        lastActivity: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        createdBy: 1,
        loginCount: 78,
        ipAddress: "192.168.1.104",
        activityScore: 35,
      },
    ];

    // Apply filtering to mock data
    let filteredAdmins = mockAdminUsers.filter((admin) => {
      if (role && admin.adminRole !== role) return false;
      if (status && admin.status !== status) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          admin.firstName.toLowerCase().includes(searchLower) ||
          admin.lastName.toLowerCase().includes(searchLower) ||
          admin.email.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });

    // Apply sorting
    filteredAdmins.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (sortOrder.toUpperCase() === "DESC") {
        return aVal > bVal ? -1 : 1;
      }
      return aVal > bVal ? 1 : -1;
    });

    // Apply pagination
    const totalCount = filteredAdmins.length;
    const paginatedAdmins = filteredAdmins.slice(
      offset,
      offset + parseInt(limit),
    );

    // Calculate analytics
    const analytics = {
      totalAdmins: totalCount,
      activeAdmins: filteredAdmins.filter((a) => a.status === "active").length,
      inactiveAdmins: filteredAdmins.filter((a) => a.status === "inactive")
        .length,
      suspendedAdmins: filteredAdmins.filter((a) => a.status === "suspended")
        .length,
      roleDistribution: {
        super_admin: filteredAdmins.filter((a) => a.adminRole === "super_admin")
          .length,
        course_manager: filteredAdmins.filter(
          (a) => a.adminRole === "course_manager",
        ).length,
        project_manager: filteredAdmins.filter(
          (a) => a.adminRole === "project_manager",
        ).length,
        payment_manager: filteredAdmins.filter(
          (a) => a.adminRole === "payment_manager",
        ).length,
        certificate_manager: filteredAdmins.filter(
          (a) => a.adminRole === "certificate_manager",
        ).length,
      },
      avgActivityScore:
        filteredAdmins.length > 0
          ? (
              filteredAdmins.reduce((sum, a) => sum + a.activityScore, 0) /
              filteredAdmins.length
            ).toFixed(1)
          : 0,
      totalLoginCount: filteredAdmins.reduce((sum, a) => sum + a.loginCount, 0),
      onlineAdmins: filteredAdmins.filter(
        (a) => new Date() - new Date(a.lastActivity) < 30 * 60 * 1000, // 30 minutes
      ).length,
    };

    res.status(200).json({
      success: true,
      message: "Admin users retrieved successfully",
      data: {
        admins: paginatedAdmins,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalRecords: totalCount,
          recordsPerPage: parseInt(limit),
        },
        analytics,
      },
    });
  } catch (error) {
    console.error("Get admin users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve admin users",
      error: error.message,
    });
  }
};

/**
 * Get specific admin user details with permissions and activity
 * GET /api/admin/roles/admins/:userId
 */
export const getAdminUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Mock admin user details
    const mockAdmin = {
      userId: parseInt(userId),
      firstName: "Sarah",
      lastName: "Manager",
      email: "sarah.manager@startgoals.com",
      phone: "+1234567891",
      profileImage: "/uploads/profiles/sarah.jpg",
      adminRole: "course_manager",
      permissions: [
        { module: "courses", actions: ["create", "read", "update", "delete"] },
        { module: "instructors", actions: ["read", "update", "approve"] },
        { module: "analytics", actions: ["read"] },
        { module: "content", actions: ["moderate", "approve"] },
      ],
      status: "active",
      lastLogin: new Date(Date.now() - 6 * 60 * 60 * 1000),
      lastActivity: new Date(Date.now() - 2 * 60 * 60 * 1000),
      createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      createdBy: {
        userId: 1,
        firstName: "John",
        lastName: "Admin",
        email: "john.admin@startgoals.com",
      },
      lastModifiedBy: {
        userId: 1,
        firstName: "John",
        lastName: "Admin",
        email: "john.admin@startgoals.com",
      },
      loginHistory: [
        {
          loginAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
          ipAddress: "192.168.1.101",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          location: "New York, US",
          success: true,
        },
        {
          loginAt: new Date(Date.now() - 30 * 60 * 60 * 1000),
          ipAddress: "192.168.1.101",
          userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          location: "New York, US",
          success: true,
        },
        {
          loginAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
          ipAddress: "192.168.1.150",
          userAgent:
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          location: "Unknown",
          success: false,
          failureReason: "Invalid password",
        },
      ],
      activityLog: [
        {
          action: "course_approved",
          details: 'Approved course "Advanced JavaScript"',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          ipAddress: "192.168.1.101",
        },
        {
          action: "instructor_updated",
          details: "Updated instructor profile for John Smith",
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          ipAddress: "192.168.1.101",
        },
        {
          action: "content_moderated",
          details: "Moderated 5 course reviews",
          timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
          ipAddress: "192.168.1.101",
        },
      ],
      statistics: {
        loginCount: 280,
        totalActions: 1245,
        coursesManaged: 45,
        instructorsApproved: 18,
        contentModerated: 156,
        activityScore: 88,
        avgSessionDuration: 125, // minutes
      },
      twoFactorEnabled: false,
      lastPasswordChange: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      accountLocked: false,
      failedLoginAttempts: 0,
    };

    if (!mockAdmin) {
      return res.status(404).json({
        success: false,
        message: "Admin user not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Admin user details retrieved successfully",
      data: mockAdmin,
    });
  } catch (error) {
    console.error("Get admin user details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve admin user details",
      error: error.message,
    });
  }
};

/**
 * Create new admin user
 * POST /api/admin/roles/admins
 */
export const createAdminUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      adminRole,
      permissions = [],
      status = "active",
      sendWelcomeEmail = true,
    } = req.body;

    const createdBy = req.user.userId;

    // Validation
    const validationErrors = [];

    if (!firstName || firstName.trim().length < 2) {
      validationErrors.push("First name must be at least 2 characters long");
    }

    if (!lastName || lastName.trim().length < 2) {
      validationErrors.push("Last name must be at least 2 characters long");
    }

    if (!email || !isValidEmail(email)) {
      validationErrors.push("Valid email address is required");
    }

    if (!password || password.length < 8) {
      validationErrors.push("Password must be at least 8 characters long");
    }

    if (
      ![
        "super_admin",
        "course_manager",
        "project_manager",
        "payment_manager",
        "certificate_manager",
      ].includes(adminRole)
    ) {
      validationErrors.push("Invalid admin role specified");
    }

    if (!["active", "inactive"].includes(status)) {
      validationErrors.push("Status must be active or inactive");
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      validationErrors.push("Email address is already registered");
    }

    // Validate permissions based on role
    const rolePermissions = getRolePermissions(adminRole);
    const invalidPermissions = permissions.filter(
      (p) => !rolePermissions.includes(p),
    );
    if (invalidPermissions.length > 0) {
      validationErrors.push(
        `Invalid permissions for role: ${invalidPermissions.join(", ")}`,
      );
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create admin user (mock implementation)
    const newAdmin = {
      userId: Date.now(), // Mock ID
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase(),
      phone: phone || null,
      password: hashedPassword,
      isAdmin: true,
      adminRole,
      permissions:
        permissions.length > 0 ? permissions : getRolePermissions(adminRole),
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy,
      lastModifiedBy: createdBy,
      loginCount: 0,
      lastLogin: null,
      lastActivity: null,
      twoFactorEnabled: false,
      accountLocked: false,
      failedLoginAttempts: 0,
    };

    // In real implementation, save to database and send welcome email if requested

    // Remove password from response
    const { password: _, ...adminResponse } = newAdmin;

    res.status(201).json({
      success: true,
      message: "Admin user created successfully",
      data: adminResponse,
    });
  } catch (error) {
    console.error("Create admin user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create admin user",
      error: error.message,
    });
  }
};

/**
 * Update admin user
 * PUT /api/admin/roles/admins/:userId
 */
export const updateAdminUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updateData = req.body;
    const lastModifiedBy = req.user.userId;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.password;
    delete updateData.userId;
    delete updateData.createdAt;
    delete updateData.createdBy;

    // Validation
    const validationErrors = [];

    if (updateData.firstName && updateData.firstName.trim().length < 2) {
      validationErrors.push("First name must be at least 2 characters long");
    }

    if (updateData.lastName && updateData.lastName.trim().length < 2) {
      validationErrors.push("Last name must be at least 2 characters long");
    }

    if (updateData.email && !isValidEmail(updateData.email)) {
      validationErrors.push("Valid email address is required");
    }

    if (
      updateData.adminRole &&
      ![
        "super_admin",
        "course_manager",
        "project_manager",
        "payment_manager",
        "certificate_manager",
      ].includes(updateData.adminRole)
    ) {
      validationErrors.push("Invalid admin role specified");
    }

    if (
      updateData.status &&
      !["active", "inactive", "suspended"].includes(updateData.status)
    ) {
      validationErrors.push("Status must be active, inactive, or suspended");
    }

    // Validate permissions based on role
    if (updateData.permissions && updateData.adminRole) {
      const rolePermissions = getRolePermissions(updateData.adminRole);
      const invalidPermissions = updateData.permissions.filter(
        (p) => !rolePermissions.includes(p),
      );
      if (invalidPermissions.length > 0) {
        validationErrors.push(
          `Invalid permissions for role: ${invalidPermissions.join(", ")}`,
        );
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    // Check if trying to update email to existing email
    if (updateData.email) {
      const existingUser = await User.findOne({
        where: {
          email: updateData.email,
          userId: { [Op.ne]: userId },
        },
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "Email address is already registered to another user",
        });
      }
    }

    // In real implementation, update in database
    const updatedAdmin = {
      userId: parseInt(userId),
      ...updateData,
      updatedAt: new Date(),
      lastModifiedBy,
    };

    res.status(200).json({
      success: true,
      message: "Admin user updated successfully",
      data: updatedAdmin,
    });
  } catch (error) {
    console.error("Update admin user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update admin user",
      error: error.message,
    });
  }
};

/**
 * Change admin user password
 * PUT /api/admin/roles/admins/:userId/password
 */
export const changeAdminPassword = async (req, res) => {
  try {
    const { userId } = req.params;
    const { currentPassword, newPassword, forceChange = false } = req.body;
    const requestingUserId = req.user.userId;

    // Validation
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    // Check if requesting user is changing their own password or is super admin
    const isSelfChange = parseInt(userId) === requestingUserId;
    const isSuperAdmin = req.user.adminRole === "super_admin";

    if (!isSelfChange && !isSuperAdmin && !forceChange) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions to change this user's password",
      });
    }

    // If self change, verify current password
    if (isSelfChange && !forceChange) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password is required",
        });
      }

      // In real implementation, verify current password
      // const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      // if (!isCurrentPasswordValid) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "Current password is incorrect"
      //   });
      // }
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // In real implementation, update password in database
    const passwordUpdate = {
      userId: parseInt(userId),
      passwordChanged: true,
      lastPasswordChange: new Date(),
      changedBy: requestingUserId,
      forceChange,
    };

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
      data: passwordUpdate,
    });
  } catch (error) {
    console.error("Change admin password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
      error: error.message,
    });
  }
};

/**
 * Delete admin user (with safety checks)
 * DELETE /api/admin/roles/admins/:userId
 */
export const deleteAdminUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { transferActivities = null, forceDelete = false } = req.body;
    const requestingUserId = req.user.userId;

    // Prevent self-deletion
    if (parseInt(userId) === requestingUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot delete your own admin account",
      });
    }

    // Check if user is the only super admin
    const superAdminCount = 1; // Mock count - in real implementation, count from database
    const userRole = "course_manager"; // Mock role - in real implementation, get from database

    if (userRole === "super_admin" && superAdminCount <= 1 && !forceDelete) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete the only super admin. Create another super admin first or use forceDelete=true.",
        data: { superAdminCount },
      });
    }

    // Check for active activities
    const activeActivities = {
      pendingApprovals: 5,
      ongoingTasks: 3,
      scheduledActions: 2,
    };

    const hasActiveActivities = Object.values(activeActivities).some(
      (count) => count > 0,
    );

    if (hasActiveActivities && !transferActivities && !forceDelete) {
      return res.status(400).json({
        success: false,
        message:
          "Admin has active activities. Please transfer activities to another admin or use forceDelete=true.",
        data: { activeActivities },
      });
    }

    // In real implementation, handle activity transfer and delete from database
    const deletionResult = {
      userId: parseInt(userId),
      deletedAt: new Date(),
      deletedBy: requestingUserId,
      activitiesTransferred: transferActivities ? true : false,
      transferredTo: transferActivities,
      forceDelete,
    };

    res.status(200).json({
      success: true,
      message: "Admin user deleted successfully",
      data: deletionResult,
    });
  } catch (error) {
    console.error("Delete admin user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete admin user",
      error: error.message,
    });
  }
};

/**
 * Get admin activity logs with advanced filtering
 * GET /api/admin/roles/activity-logs
 */
export const getActivityLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      userId,
      action,
      module, // courses, projects, users, payments, etc.
      dateFrom,
      dateTo,
      ipAddress,
      search,
      sortBy = "timestamp",
      sortOrder = "DESC",
    } = req.query;

    // Mock activity logs
    const mockLogs = [
      {
        logId: 1,
        userId: 2,
        userName: "Sarah Manager",
        userRole: "course_manager",
        action: "course_approved",
        module: "courses",
        details: 'Approved course "Advanced JavaScript Programming"',
        targetId: 45,
        targetType: "course",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
        ipAddress: "192.168.1.101",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        sessionId: "sess_abc123",
        risk: "low",
      },
      {
        logId: 2,
        userId: 1,
        userName: "John Admin",
        userRole: "super_admin",
        action: "admin_created",
        module: "admin_management",
        details: 'Created new admin user "Emma Finance"',
        targetId: 4,
        targetType: "admin_user",
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
        ipAddress: "192.168.1.100",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        sessionId: "sess_def456",
        risk: "medium",
      },
      {
        logId: 3,
        userId: 3,
        userName: "Mike Projects",
        userRole: "project_manager",
        action: "project_deleted",
        module: "projects",
        details: 'Deleted project "Outdated Mobile App Template"',
        targetId: 28,
        targetType: "project",
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
        ipAddress: "192.168.1.102",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        sessionId: "sess_ghi789",
        risk: "high",
      },
      {
        logId: 4,
        userId: 4,
        userName: "Emma Finance",
        userRole: "payment_manager",
        action: "refund_processed",
        module: "payments",
        details: "Processed refund of $99.99 for order #12345",
        targetId: 12345,
        targetType: "order",
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
        ipAddress: "192.168.1.103",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        sessionId: "sess_jkl012",
        risk: "medium",
      },
      {
        logId: 5,
        userId: 2,
        userName: "Sarah Manager",
        userRole: "course_manager",
        action: "login_failed",
        module: "authentication",
        details: "Failed login attempt with incorrect password",
        targetId: null,
        targetType: null,
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
        ipAddress: "192.168.1.150",
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        sessionId: null,
        risk: "high",
      },
    ];

    // Apply filtering
    let filteredLogs = mockLogs.filter((log) => {
      if (userId && log.userId !== parseInt(userId)) return false;
      if (action && !log.action.toLowerCase().includes(action.toLowerCase()))
        return false;
      if (module && log.module !== module) return false;
      if (ipAddress && log.ipAddress !== ipAddress) return false;
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          log.details.toLowerCase().includes(searchLower) ||
          log.userName.toLowerCase().includes(searchLower) ||
          log.action.toLowerCase().includes(searchLower)
        );
      }
      if (dateFrom && dateTo) {
        const logDate = new Date(log.timestamp);
        return logDate >= new Date(dateFrom) && logDate <= new Date(dateTo);
      }
      return true;
    });

    // Apply sorting
    filteredLogs.sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (sortOrder.toUpperCase() === "DESC") {
        return aVal > bVal ? -1 : 1;
      }
      return aVal > bVal ? 1 : -1;
    });

    // Apply pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const totalCount = filteredLogs.length;
    const paginatedLogs = filteredLogs.slice(offset, offset + parseInt(limit));

    // Calculate analytics
    const analytics = {
      totalLogs: totalCount,
      riskDistribution: {
        low: filteredLogs.filter((l) => l.risk === "low").length,
        medium: filteredLogs.filter((l) => l.risk === "medium").length,
        high: filteredLogs.filter((l) => l.risk === "high").length,
      },
      actionDistribution: {
        logins: filteredLogs.filter((l) => l.action.includes("login")).length,
        approvals: filteredLogs.filter((l) => l.action.includes("approved"))
          .length,
        deletions: filteredLogs.filter((l) => l.action.includes("deleted"))
          .length,
        creations: filteredLogs.filter((l) => l.action.includes("created"))
          .length,
      },
      moduleDistribution: {
        courses: filteredLogs.filter((l) => l.module === "courses").length,
        projects: filteredLogs.filter((l) => l.module === "projects").length,
        payments: filteredLogs.filter((l) => l.module === "payments").length,
        authentication: filteredLogs.filter(
          (l) => l.module === "authentication",
        ).length,
        admin_management: filteredLogs.filter(
          (l) => l.module === "admin_management",
        ).length,
      },
      uniqueUsers: [...new Set(filteredLogs.map((l) => l.userId))].length,
      uniqueIPs: [...new Set(filteredLogs.map((l) => l.ipAddress))].length,
    };

    res.status(200).json({
      success: true,
      message: "Activity logs retrieved successfully",
      data: {
        logs: paginatedLogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalRecords: totalCount,
          recordsPerPage: parseInt(limit),
        },
        analytics,
      },
    });
  } catch (error) {
    console.error("Get activity logs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve activity logs",
      error: error.message,
    });
  }
};

/**
 * Get role permissions and hierarchy
 * GET /api/admin/roles/permissions
 */
export const getRolePermissions = (role = null) => {
  const allPermissions = {
    super_admin: [
      // User Management
      "manage_users",
      "view_users",
      "create_users",
      "update_users",
      "delete_users",
      // Course Management
      "manage_courses",
      "view_courses",
      "create_courses",
      "update_courses",
      "delete_courses",
      "approve_courses",
      // Project Management
      "manage_projects",
      "view_projects",
      "create_projects",
      "update_projects",
      "delete_projects",
      "approve_projects",
      // Payment Management
      "manage_payments",
      "view_payments",
      "process_refunds",
      "view_financial_reports",
      // Certificate Management
      "manage_certificates",
      "view_certificates",
      "generate_certificates",
      "revoke_certificates",
      // Admin Management
      "manage_admins",
      "view_admins",
      "create_admins",
      "update_admins",
      "delete_admins",
      // Settings Management
      "manage_settings",
      "view_settings",
      "update_settings",
      "backup_settings",
      // Analytics
      "view_analytics",
      "export_data",
      "generate_reports",
      // Content Moderation
      "moderate_content",
      "approve_content",
      "reject_content",
    ],
    course_manager: [
      "manage_courses",
      "view_courses",
      "create_courses",
      "update_courses",
      "approve_courses",
      "manage_instructors",
      "view_instructors",
      "approve_instructors",
      "moderate_content",
      "approve_content",
      "reject_content",
      "view_analytics",
      "generate_reports",
    ],
    project_manager: [
      "manage_projects",
      "view_projects",
      "create_projects",
      "update_projects",
      "approve_projects",
      "manage_downloads",
      "view_downloads",
      "moderate_content",
      "approve_content",
      "reject_content",
      "view_analytics",
      "generate_reports",
    ],
    payment_manager: [
      "manage_payments",
      "view_payments",
      "process_refunds",
      "view_financial_reports",
      "export_financial_data",
      "manage_discounts",
      "view_discounts",
      "view_analytics",
    ],
    certificate_manager: [
      "manage_certificates",
      "view_certificates",
      "generate_certificates",
      "revoke_certificates",
      "view_analytics",
      "generate_reports",
    ],
  };

  if (role) {
    return allPermissions[role] || [];
  }

  return allPermissions;
};

/**
 * Get permissions endpoint
 * GET /api/admin/roles/permissions
 */
export const getPermissions = async (req, res) => {
  try {
    const { role } = req.query;

    const permissions = getRolePermissions(role);

    const roleHierarchy = {
      super_admin: {
        level: 5,
        description: "Full system access and admin management",
      },
      course_manager: {
        level: 3,
        description: "Course and instructor management",
      },
      project_manager: {
        level: 3,
        description: "Project and download management",
      },
      payment_manager: {
        level: 4,
        description: "Payment and financial management",
      },
      certificate_manager: { level: 2, description: "Certificate management" },
    };

    res.status(200).json({
      success: true,
      message: "Permissions retrieved successfully",
      data: {
        permissions: role ? { [role]: permissions } : permissions,
        roleHierarchy,
        availableRoles: Object.keys(roleHierarchy),
      },
    });
  } catch (error) {
    console.error("Get permissions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve permissions",
      error: error.message,
    });
  }
};

/**
 * Export admin users and activity data
 * GET /api/admin/roles/export
 */
export const exportAdminData = async (req, res) => {
  try {
    const {
      type = "users", // users, activity_logs, permissions
      format = "json", // json, csv
      dateFrom,
      dateTo,
      includePasswords = false,
    } = req.query;

    let exportData = {};

    switch (type) {
      case "users":
        // Mock admin users export
        exportData = {
          exportType: "admin_users",
          generatedAt: new Date(),
          generatedBy: req.user.userId,
          data: [
            {
              userId: 1,
              firstName: "John",
              lastName: "Admin",
              email: "john.admin@startgoals.com",
              adminRole: "super_admin",
              status: "active",
              createdAt: new Date(),
              lastLogin: new Date(),
              loginCount: 450,
            },
            {
              userId: 2,
              firstName: "Sarah",
              lastName: "Manager",
              email: "sarah.manager@startgoals.com",
              adminRole: "course_manager",
              status: "active",
              createdAt: new Date(),
              lastLogin: new Date(),
              loginCount: 280,
            },
          ],
        };
        break;

      case "activity_logs":
        // Mock activity logs export
        exportData = {
          exportType: "activity_logs",
          generatedAt: new Date(),
          generatedBy: req.user.userId,
          dateRange: { from: dateFrom, to: dateTo },
          data: [
            {
              timestamp: new Date(),
              userId: 2,
              userName: "Sarah Manager",
              action: "course_approved",
              module: "courses",
              details: 'Approved course "Advanced JavaScript Programming"',
              ipAddress: "192.168.1.101",
              risk: "low",
            },
          ],
        };
        break;

      case "permissions":
        // Mock permissions export
        exportData = {
          exportType: "role_permissions",
          generatedAt: new Date(),
          generatedBy: req.user.userId,
          data: getRolePermissions(),
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          message:
            "Invalid export type. Supported types: users, activity_logs, permissions",
        });
    }

    // Format response based on requested format
    if (format === "csv") {
      // In real implementation, convert to CSV format
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${type}_export_${Date.now()}.csv"`,
      );
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${type}_export_${Date.now()}.json"`,
      );
    }

    res.status(200).json({
      success: true,
      message: "Data exported successfully",
      data: exportData,
    });
  } catch (error) {
    console.error("Export admin data error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export data",
      error: error.message,
    });
  }
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Log admin activity
 */
async function logAdminActivity(
  userId,
  action,
  module,
  details,
  targetId = null,
  targetType = null,
  ipAddress = null,
  risk = "low",
) {
  // In real implementation, save to activity log table
  const activityLog = {
    userId,
    action,
    module,
    details,
    targetId,
    targetType,
    timestamp: new Date(),
    ipAddress,
    risk,
  };

  console.log("Admin Activity:", activityLog);
  return activityLog;
}
