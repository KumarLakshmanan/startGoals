// controllers/batchController.js
import Batch from "../model/batch.js";
import Course from "../model/course.js";
import User from "../model/user.js";
import BatchStudents from "../model/batchStudents.js";
import Enrollment from "../model/enrollment.js";
import LiveSession from "../model/liveSession.js";
import sequelize from "../config/db.js";
import { Op } from "sequelize";

export const createBatch = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const userId = req.user?.userId || null; // Get userId from request, if available
    const { courseId, title, description, startTime, endTime } = req.body;

    if (!courseId || !title || !description || !startTime || !endTime) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields",
      });
    }

    const courseExists = await Course.count({
      where: { courseId },
      transaction: t,
    });
    if (!courseExists) {
      await t.rollback();
      return res
        .status(404)
        .json({ status: false, message: "Course not found" });
    }

    const batch = await Batch.create(
      {
        courseId,
        title,
        description,
        startTime,
        endTime,
        createdBy: userId || null,
      },
      { transaction: t },
    );

    await t.commit();
    return res
      .status(201)
      .json({ status: true, message: "Batch created", data: batch });
  } catch (err) {
    await t.rollback();
    console.error("Batch creation error:", err);
    return res
      .status(500)
      .json({ status: false, message: "Internal server error" });
  }
};

// Get all batches with pagination and filtering
export const getAllBatches = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      courseId,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = {};

    // Add filters
    if (courseId) {
      whereClause.courseId = courseId;
    }

    if (status) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.title = {
        [Op.iLike]: `%${search}%`,
      };
    }
    const { count, rows } = await Batch.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["courseId", "title", "description"],
        },
        {
          model: User,
          as: "creator",
          attributes: ["userId", "username", "email"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    return res.status(200).json({
      status: true,
      message: "Batches retrieved successfully",
      data: {
        batches: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (err) {
    console.error("Get all batches error:", err);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Get batch by ID
export const getBatchById = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(batchId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid batch ID format",
      });
    }

    const batch = await Batch.findByPk(batchId, {
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["courseId", "title", "description"],
        },
        {
          model: User,
          as: "creator",
          attributes: ["userId", "username", "email"],
        },
        {
          model: BatchStudents,
          as: "batchStudents",
          include: [
            {
              model: User,
              as: "student",
              attributes: ["userId", "username", "email"],
            },
          ],
        },
      ],
    });

    if (!batch) {
      return res.status(404).json({
        status: false,
        message: "Batch not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Batch retrieved successfully",
      data: batch,
    });
  } catch (err) {
    console.error("Get batch by ID error:", err);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Update batch
export const updateBatch = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { batchId } = req.params;
    const { title, startTime, endTime, status, maxStudents } = req.body;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(batchId)) {
      await t.rollback();
      return res.status(400).json({
        status: false,
        message: "Invalid batch ID format",
      });
    }

    const batch = await Batch.findByPk(batchId, { transaction: t });
    if (!batch) {
      await t.rollback();
      return res.status(404).json({
        status: false,
        message: "Batch not found",
      });
    }

    // Update only provided fields
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (startTime !== undefined) updateData.startTime = startTime;
    if (endTime !== undefined) updateData.endTime = endTime;
    if (status !== undefined) updateData.status = status;
    if (maxStudents !== undefined) updateData.maxStudents = maxStudents;

    await batch.update(updateData, { transaction: t });

    await t.commit();
    return res.status(200).json({
      status: true,
      message: "Batch updated successfully",
      data: batch,
    });
  } catch (err) {
    await t.rollback();
    console.error("Update batch error:", err);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Delete batch
export const deleteBatch = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { batchId } = req.params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(batchId)) {
      await t.rollback();
      return res.status(400).json({
        status: false,
        message: "Invalid batch ID format",
      });
    }

    const batch = await Batch.findByPk(batchId, { transaction: t });
    if (!batch) {
      await t.rollback();
      return res.status(404).json({
        status: false,
        message: "Batch not found",
      });
    }

    // Check if batch has students enrolled
    const studentsCount = await BatchStudents.count({
      where: { batchId },
      transaction: t,
    });

    if (studentsCount > 0) {
      await t.rollback();
      return res.status(400).json({
        status: false,
        message: "Cannot delete batch with enrolled students",
      });
    }

    await batch.destroy({ transaction: t });

    await t.commit();
    return res.status(200).json({
      status: true,
      message: "Batch deleted successfully",
    });
  } catch (err) {
    await t.rollback();
    console.error("Delete batch error:", err);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// Get batches by course
export const getBatchesByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { status, page = 1, limit = 10 } = req.query;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(courseId)) {
      return res.status(400).json({
        status: false,
        message: "Invalid course ID format",
      });
    }

    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    const offset = (page - 1) * limit;
    const whereClause = { courseId };

    if (status) {
      whereClause.status = status;
    }
    const { count, rows } = await Batch.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["courseId", "title", "description"],
        },
        {
          model: User,
          as: "creator",
          attributes: ["userId", "username", "email"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["createdAt", "DESC"]],
    });
    return res.status(200).json({
      status: true,
      message: "Batches retrieved successfully",
      data: {
        batches: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (err) {
    console.error("Get batches by course error:", err);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

// ===================== ADMIN/OWNER BATCH MANAGEMENT =====================

/**
 * Create Batch with Auto-Enrollment (Admin/Owner only)
 * Automatically assigns students to batches based on criteria
 */
export const createBatchWithAutoEnrollment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      courseId,
      title,
      description,
      startTime,
      endTime,
      maxStudents,
      minStudents,
      autoEnrollmentCriteria,
      teacherIds = [],
      studentIds = [],
    } = req.body;

    // Validate required fields
    if (!courseId || !title || !startTime || !endTime) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields: courseId, title, startTime, endTime",
      });
    }

    // Check if course exists
    const course = await Course.findByPk(courseId, { transaction: t });
    if (!course) {
      await t.rollback();
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    // Create batch
    const batch = await Batch.create(
      {
        courseId,
        title,
        description,
        startTime,
        endTime,
        maxStudents: maxStudents || 50,
        minStudents: minStudents || 5,
        status: "active",
        createdBy: req.user.userId,
      },
      { transaction: t },
    );

    // Auto-enroll students if criteria provided
    let enrolledStudents = [];
    if (autoEnrollmentCriteria) {
      const { enrollmentStatus, registrationDate, skillLevel } =
        autoEnrollmentCriteria;

      const whereClause = { courseId };
      if (enrollmentStatus) whereClause.status = enrollmentStatus;

      const enrollments = await Enrollment.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: "user",
            where: {
              role: "student",
              ...(registrationDate && {
                createdAt: {
                  [Op.gte]: new Date(registrationDate.from),
                  [Op.lte]: new Date(registrationDate.to),
                },
              }),
            },
          },
        ],
        limit: maxStudents || 50,
        transaction: t,
      });

      // Enroll students in batch
      for (const enrollment of enrollments) {
        await BatchStudents.create(
          {
            batchId: batch.batchId,
            userId: enrollment.userId,
            role: "student",
            status: "active",
          },
          { transaction: t },
        );
        enrolledStudents.push(enrollment.user);
      }
    }

    // Manually assign students if provided
    if (studentIds.length > 0) {
      for (const studentId of studentIds) {
        await BatchStudents.create(
          {
            batchId: batch.batchId,
            userId: studentId,
            role: "student",
            status: "active",
          },
          { transaction: t },
        );
      }
    }

    // Assign teachers if provided
    if (teacherIds.length > 0) {
      for (const teacherId of teacherIds) {
        await BatchStudents.create(
          {
            batchId: batch.batchId,
            userId: teacherId,
            role: "teacher",
            status: "active",
          },
          { transaction: t },
        );
      }
    }

    await t.commit();

    res.status(201).json({
      status: true,
      message: "Batch created successfully with auto-enrollment",
      data: {
        batch,
        enrolledStudentsCount: enrolledStudents.length,
        assignedTeachersCount: teacherIds.length,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("Create batch with auto-enrollment error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to create batch with auto-enrollment",
      error: error.message,
    });
  }
};

/**
 * Manage Batch Students (Admin/Owner only)
 * Add/Remove students and teachers from batches
 */
export const manageBatchStudents = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { batchId } = req.params;
    const { action, userIds, role = "student" } = req.body;

    if (!["add", "remove"].includes(action)) {
      return res.status(400).json({
        status: false,
        message: "Invalid action. Use 'add' or 'remove'",
      });
    }

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: "userIds must be a non-empty array",
      });
    }

    // Check if batch exists
    const batch = await Batch.findByPk(batchId, { transaction: t });
    if (!batch) {
      await t.rollback();
      return res.status(404).json({
        status: false,
        message: "Batch not found",
      });
    }

    const results = {
      successful: [],
      failed: [],
    };

    for (const userId of userIds) {
      try {
        if (action === "add") {
          // Check if user is already in batch
          const existing = await BatchStudents.findOne({
            where: { batchId, userId },
            transaction: t,
          });

          if (existing) {
            results.failed.push({
              userId,
              reason: "User already in batch",
            });
            continue;
          }

          // Add user to batch
          await BatchStudents.create(
            {
              batchId,
              userId,
              role,
              status: "active",
            },
            { transaction: t },
          );

          results.successful.push({ userId, action: "added" });
        } else if (action === "remove") {
          // Remove user from batch
          const deleted = await BatchStudents.destroy({
            where: { batchId, userId },
            transaction: t,
          });

          if (deleted > 0) {
            results.successful.push({ userId, action: "removed" });
          } else {
            results.failed.push({
              userId,
              reason: "User not found in batch",
            });
          }
        }
      } catch (error) {
        results.failed.push({
          userId,
          reason: error.message,
        });
      }
    }

    await t.commit();

    res.json({
      status: true,
      message: `Batch ${role}s ${action} operation completed`,
      data: results,
    });
  } catch (error) {
    await t.rollback();
    console.error("Manage batch students error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to manage batch students",
      error: error.message,
    });
  }
};

/**
 * Create Batch Schedule (Admin/Owner only)
 * Create live sessions schedule for a batch
 */
export const createBatchSchedule = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { batchId } = req.params;
    const { sessions, recurringPattern } = req.body;

    // Check if batch exists
    const batch = await Batch.findByPk(batchId, { transaction: t });
    if (!batch) {
      await t.rollback();
      return res.status(404).json({
        status: false,
        message: "Batch not found",
      });
    }

    const createdSessions = [];

    if (sessions && Array.isArray(sessions)) {
      // Create individual sessions
      for (const session of sessions) {
        const liveSession = await LiveSession.create(
          {
            batchId,
            courseId: batch.courseId,
            title: session.title,
            description: session.description,
            scheduledStartTime: session.scheduledStartTime,
            scheduledEndTime: session.scheduledEndTime,
            status: "scheduled",
            createdBy: req.user.userId,
          },
          { transaction: t },
        );

        createdSessions.push(liveSession);
      }
    }

    if (recurringPattern) {
      // Create recurring sessions
      const {
        startDate,
        endDate,
        frequency, // 'daily', 'weekly', 'monthly'
        interval = 1,
        sessionDuration = 60, // minutes
        sessionTitle,
        sessionDescription,
      } = recurringPattern;

      const start = new Date(startDate);
      const end = new Date(endDate);
      let currentDate = new Date(start);

      while (currentDate <= end) {
        const sessionEnd = new Date(
          currentDate.getTime() + sessionDuration * 60000,
        );

        const liveSession = await LiveSession.create(
          {
            batchId,
            courseId: batch.courseId,
            title: sessionTitle || `${batch.title} - Session`,
            description:
              sessionDescription || `Recurring session for ${batch.title}`,
            scheduledStartTime: new Date(currentDate),
            scheduledEndTime: sessionEnd,
            status: "scheduled",
            createdBy: req.user.userId,
          },
          { transaction: t },
        );

        createdSessions.push(liveSession);

        // Calculate next session date
        if (frequency === "daily") {
          currentDate.setDate(currentDate.getDate() + interval);
        } else if (frequency === "weekly") {
          currentDate.setDate(currentDate.getDate() + 7 * interval);
        } else if (frequency === "monthly") {
          currentDate.setMonth(currentDate.getMonth() + interval);
        }
      }
    }

    await t.commit();

    res.status(201).json({
      status: true,
      message: "Batch schedule created successfully",
      data: {
        batchId,
        sessionsCreated: createdSessions.length,
        sessions: createdSessions,
      },
    });
  } catch (error) {
    await t.rollback();
    console.error("Create batch schedule error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to create batch schedule",
      error: error.message,
    });
  }
};

/**
 * Get Batch Analytics (Admin/Owner only)
 * Comprehensive analytics for batch performance
 */
export const getBatchAnalytics = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { dateRange } = req.query;

    // Get batch with all related data
    const batch = await Batch.findByPk(batchId, {
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["courseId", "title", "type", "price"],
        },
        {
          model: BatchStudents,
          as: "students",
          include: [
            {
              model: User,
              as: "user",
              attributes: ["userId", "username", "email", "createdAt"],
            },
          ],
        },
        {
          model: LiveSession,
          as: "sessions",
          attributes: [
            "sessionId",
            "title",
            "scheduledStartTime",
            "actualStartTime",
            "actualEndTime",
            "status",
          ],
        },
      ],
    });

    if (!batch) {
      return res.status(404).json({
        status: false,
        message: "Batch not found",
      });
    }

    // Calculate analytics
    const students = batch.students.filter((s) => s.role === "student");
    const teachers = batch.students.filter((s) => s.role === "teacher");

    const sessionStats = {
      total: batch.sessions.length,
      completed: batch.sessions.filter((s) => s.status === "completed").length,
      scheduled: batch.sessions.filter((s) => s.status === "scheduled").length,
      inProgress: batch.sessions.filter((s) => s.status === "in_progress")
        .length,
      cancelled: batch.sessions.filter((s) => s.status === "cancelled").length,
    };

    const enrollmentTrend = students.reduce((acc, student) => {
      const date = student.enrolledAt.toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Calculate completion rate
    const completionRate =
      sessionStats.total > 0
        ? (sessionStats.completed / sessionStats.total) * 100
        : 0;

    // Calculate average session duration
    const completedSessions = batch.sessions.filter(
      (s) => s.actualStartTime && s.actualEndTime,
    );
    const avgSessionDuration =
      completedSessions.length > 0
        ? completedSessions.reduce((sum, session) => {
            const duration =
              new Date(session.actualEndTime) -
              new Date(session.actualStartTime);
            return sum + duration;
          }, 0) /
          completedSessions.length /
          (1000 * 60) // Convert to minutes
        : 0;

    res.json({
      status: true,
      data: {
        batch: {
          batchId: batch.batchId,
          title: batch.title,
          status: batch.status,
          startTime: batch.startTime,
          endTime: batch.endTime,
        },
        course: batch.course,
        statistics: {
          enrollment: {
            totalStudents: students.length,
            totalTeachers: teachers.length,
            maxStudents: batch.maxStudents,
            minStudents: batch.minStudents,
            enrollmentRate:
              batch.maxStudents > 0
                ? (students.length / batch.maxStudents) * 100
                : 0,
          },
          sessions: {
            ...sessionStats,
            completionRate: Math.round(completionRate * 100) / 100,
            averageDuration: Math.round(avgSessionDuration * 100) / 100,
          },
          trends: {
            enrollmentByDate: enrollmentTrend,
          },
        },
      },
    });
  } catch (error) {
    console.error("Get batch analytics error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch batch analytics",
      error: error.message,
    });
  }
};

/**
 * Bulk Batch Operations (Admin/Owner only)
 * Perform bulk operations on multiple batches
 */
export const bulkBatchOperations = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { action, batchIds, data } = req.body;

    if (!["activate", "deactivate", "delete", "update"].includes(action)) {
      return res.status(400).json({
        status: false,
        message:
          "Invalid action. Supported actions: activate, deactivate, delete, update",
      });
    }

    if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: "batchIds must be a non-empty array",
      });
    }

    const results = {
      successful: [],
      failed: [],
    };

    for (const batchId of batchIds) {
      try {
        const batch = await Batch.findByPk(batchId, { transaction: t });

        if (!batch) {
          results.failed.push({
            batchId,
            reason: "Batch not found",
          });
          continue;
        }

        switch (action) {
          case "activate":
            await batch.update({ status: "active" }, { transaction: t });
            results.successful.push({ batchId, action: "activated" });
            break;

          case "deactivate":
            await batch.update({ status: "inactive" }, { transaction: t });
            results.successful.push({ batchId, action: "deactivated" });
            break;

          case "delete":
            await batch.destroy({ transaction: t });
            results.successful.push({ batchId, action: "deleted" });
            break;

          case "update":
            if (data) {
              await batch.update(data, { transaction: t });
              results.successful.push({ batchId, action: "updated" });
            }
            break;
        }
      } catch (error) {
        results.failed.push({
          batchId,
          reason: error.message,
        });
      }
    }

    await t.commit();

    res.json({
      status: true,
      message: `Bulk ${action} operation completed`,
      data: results,
    });
  } catch (error) {
    await t.rollback();
    console.error("Bulk batch operations error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to perform bulk batch operations",
      error: error.message,
    });
  }
};

/**
 * Get Batch Management Data (Admin/Owner only)
 * Comprehensive batch management dashboard data
 */
export const getBatchManagementData = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Get batch with complete related data
    const batch = await Batch.findByPk(batchId, {
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["courseId", "title", "type", "price"],
        },
        {
          model: BatchStudents,
          as: "batchStudents",
          include: [
            {
              model: User,
              as: "student",
              attributes: ["userId", "username", "email", "profileImage"],
            },
          ],
        },
        {
          model: LiveSession,
          as: "sessions",
          attributes: [
            "sessionId",
            "title",
            "scheduledStartTime",
            "status",
            "actualStartTime",
            "actualEndTime",
          ],
        },
      ],
    });

    if (!batch) {
      return res.status(404).json({
        status: false,
        message: "Batch not found",
      });
    }

    // Separate students and teachers
    const students = batch.batchStudents.filter((s) => s.role === "student");
    const teachers = batch.batchStudents.filter((s) => s.role === "teacher");

    // Get session statistics
    const sessionStats = {
      total: batch.sessions.length,
      completed: batch.sessions.filter((s) => s.status === "completed").length,
      scheduled: batch.sessions.filter((s) => s.status === "scheduled").length,
      inProgress: batch.sessions.filter((s) => s.status === "in_progress")
        .length,
    };

    res.json({
      status: true,
      data: {
        batch: {
          batchId: batch.batchId,
          title: batch.title,
          description: batch.description,
          startTime: batch.startTime,
          endTime: batch.endTime,
          status: batch.status,
          maxStudents: batch.maxStudents,
          minStudents: batch.minStudents,
        },
        course: batch.course,
        students: students.map((s) => ({
          userId: s.student.userId,
          username: s.student.username,
          email: s.student.email,
          profileImage: s.student.profileImage,
          status: s.status,
          enrolledAt: s.enrolledAt,
        })),
        teachers: teachers.map((t) => ({
          userId: t.student.userId,
          username: t.student.username,
          email: t.student.email,
          profileImage: t.student.profileImage,
          status: t.status,
          enrolledAt: t.enrolledAt,
        })),
        sessions: batch.sessions,
        statistics: {
          totalStudents: students.length,
          totalTeachers: teachers.length,
          sessionStats,
        },
      },
    });
  } catch (error) {
    console.error("Get batch management data error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch batch management data",
      error: error.message,
    });
  }
};
