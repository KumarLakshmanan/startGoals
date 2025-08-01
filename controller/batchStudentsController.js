// controllers/batchStudentsController.js
import sequelize from "../config/db.js";
import BatchStudents from "../model/batchStudents.js";
import Batch from "../model/batch.js";
import User from "../model/user.js";
import Course from "../model/course.js";
import { Op } from "sequelize";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendServerError,
  sendConflict,
} from "../utils/responseHelper.js";

// Add student to batch
export const addStudentToBatch = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { batchId, userId } = req.body;

    // Validate required fields
    if (!batchId || !userId) {
      await t.rollback();
      return sendValidationError(res, "batchId and userId are required", {
        batchId: !batchId ? "Required field" : undefined,
        userId: !userId ? "Required field" : undefined,
      });
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(batchId) || !uuidRegex.test(userId)) {
      await t.rollback();
      return sendValidationError(res, "Invalid UUID format for batchId or userId", {
        batchId: !uuidRegex.test(batchId) ? "Invalid UUID format" : undefined,
        userId: !uuidRegex.test(userId) ? "Invalid UUID format" : undefined,
      });
    }

    // Check if batch exists
    const batch = await Batch.findByPk(batchId, { transaction: t });
    if (!batch) {
      await t.rollback();
      return sendNotFound(res, "Batch not found", {
        batchId: "Batch not found",
      });
    }

    // Check if user exists
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      return sendNotFound(res, "User not found", {
        userId: "User not found",
      });
    }

    // Check if student is already enrolled in this batch
    const existingEnrollment = await BatchStudents.findOne({
      where: { batchId, userId },
      transaction: t,
    });

    if (existingEnrollment) {
      await t.rollback();
      return sendConflict(res, "enrollment", "Student is already enrolled in this batch");
    }

    // Add student to batch
    const batchStudent = await BatchStudents.create(
      {
        batchId,
        userId,
        status: "active",
      },
      { transaction: t }
    );

    await t.commit();

    return sendSuccess(res, "Student added to batch successfully", batchStudent);
  } catch (error) {
    await t.rollback();
    console.error("Error adding student to batch:", error);
    return sendServerError(res, error);
  }
};

// Remove student from batch
export const removeStudentFromBatch = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { batchId, userId } = req.params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(batchId) || !uuidRegex.test(userId)) {
      await t.rollback();
      return sendValidationError(res, "Invalid UUID format for batchId or userId", {
        batchId: !uuidRegex.test(batchId) ? "Invalid UUID format" : undefined,
        userId: !uuidRegex.test(userId) ? "Invalid UUID format" : undefined,
      });
    }

    // Find the enrollment
    const batchStudent = await BatchStudents.findOne({
      where: { batchId, userId },
      transaction: t,
    });

    if (!batchStudent) {
      await t.rollback();
      return sendNotFound(res, "Student not found in this batch", {
        enrollment: "Student not found in this batch",
      });
    }

    // Remove student from batch
    await batchStudent.destroy({ transaction: t });

    await t.commit();

    return sendSuccess(res, "Student removed from batch successfully");
  } catch (error) {
    await t.rollback();
    console.error("Error removing student from batch:", error);
    return sendServerError(res, error);
  }
};

// Get all students in a batch
export const getStudentsInBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(batchId)) {
      return sendValidationError(res, "Invalid UUID format for batchId", {
        batchId: "Invalid UUID format",
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where condition
    const whereCondition = { batchId };
    if (status) {
      whereCondition.status = status;
    }
    const { count, rows: students } = await BatchStudents.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: User,
          as: "student",
          attributes: ["userId", "username", "email", "mobile", "profileImage"],
        },
        {
          model: Batch,
          as: "batch",
          attributes: ["batchId", "title", "startTime", "endTime"],
          include: [
            {
              model: Course,
              as: "course",
              attributes: ["courseId", "title", "description"],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [["enrollmentDate", "DESC"]],
    });

    return sendSuccess(res, "Students fetched successfully", {
      students,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching students in batch:", error);
    return sendServerError(res, error);
  }
};

// Get all batches for a student
export const getBatchesForStudent = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(userId)) {
      return sendValidationError(res, "Invalid UUID format for userId", {
        userId: "Invalid UUID format",
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where condition
    const whereCondition = { userId };
    if (status) {
      whereCondition.status = status;
    }

    const { count, rows: batches } = await BatchStudents.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Batch,
          as: "batch",
          attributes: ["batchId", "title", "startTime", "endTime"],
          include: [
            {
              model: Course,
              as: "course",
              attributes: ["courseId", "title", "description", "thumbnailUrl"],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [["enrollmentDate", "DESC"]],
    });

    return sendSuccess(res, "Batches fetched successfully", {
      batches,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching batches for student:", error);
    return sendServerError(res, error);
  }
};

// Update student status in batch
export const updateStudentStatusInBatch = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { batchId, userId } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["active", "inactive", "dropped", "completed"];
    if (!status || !validStatuses.includes(status)) {
      await t.rollback();
      return sendValidationError(
        res,
        `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        { status: "Invalid status" }
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(batchId) || !uuidRegex.test(userId)) {
      await t.rollback();
      return sendValidationError(res, "Invalid UUID format for batchId or userId", {
        batchId: !uuidRegex.test(batchId) ? "Invalid UUID format" : undefined,
        userId: !uuidRegex.test(userId) ? "Invalid UUID format" : undefined,
      });
    }

    // Find the enrollment
    const batchStudent = await BatchStudents.findOne({
      where: { batchId, userId },
      transaction: t,
    });

    if (!batchStudent) {
      await t.rollback();
      return sendNotFound(res, "Student not found in this batch", {
        enrollment: "Student not found in this batch",
      });
    }

    // Update status
    await batchStudent.update({ status }, { transaction: t });

    await t.commit();

    return sendSuccess(
      res,
      `Student status updated to ${status} successfully`,
      batchStudent
    );
  } catch (error) {
    await t.rollback();
    console.error("Error updating student status in batch:", error);
    return sendServerError(res, error);
  }
};

// Bulk add students to batch
export const bulkAddStudentsToBatch = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { batchId, userIds } = req.body;

    // Validate required fields
    if (!batchId || !Array.isArray(userIds) || userIds.length === 0) {
      await t.rollback();
      return sendValidationError(res, "batchId and userIds array are required", {
        batchId: !batchId ? "Required field" : undefined,
        userIds: !Array.isArray(userIds) || userIds.length === 0 ? "Required field" : undefined,
      });
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(batchId)) {
      await t.rollback();
      return sendValidationError(res, "Invalid UUID format for batchId", {
        batchId: "Invalid UUID format",
      });
    }

    // Validate all userIds
    for (const userId of userIds) {
      if (!uuidRegex.test(userId)) {
        await t.rollback();
        return sendValidationError(res, `Invalid UUID format for userId: ${userId}`, {
          userId: "Invalid UUID format",
        });
      }
    }

    // Check if batch exists
    const batch = await Batch.findByPk(batchId, { transaction: t });
    if (!batch) {
      await t.rollback();
      return sendNotFound(res, "Batch not found", {
        batchId: "Batch not found",
      });
    }

    // Check if all users exist
    const users = await User.findAll({
      where: { userId: { [Op.in]: userIds } },
      transaction: t,
    });

    if (users.length !== userIds.length) {
      await t.rollback();
      return sendNotFound(res, "One or more users not found", {
        userIds: "One or more users not found",
      });
    }

    // Check for existing enrollments
    const existingEnrollments = await BatchStudents.findAll({
      where: {
        batchId,
        userId: { [Op.in]: userIds },
      },
      transaction: t,
    });

    const existingUserIds = existingEnrollments.map(
      (enrollment) => enrollment.userId
    );
    const newUserIds = userIds.filter(
      (userId) => !existingUserIds.includes(userId)
    );

    if (newUserIds.length === 0) {
      await t.rollback();
      return sendConflict(res, "enrollment", "All students are already enrolled in this batch");
    }

    // Create batch enrollments for new users
    const batchStudentRecords = newUserIds.map((userId) => ({
      batchId,
      userId,
      status: "active",
    }));

    const createdEnrollments = await BatchStudents.bulkCreate(
      batchStudentRecords,
      {
        transaction: t,
      }
    );

    await t.commit();

    return sendSuccess(res, `${newUserIds.length} students added to batch successfully`, {
      addedCount: newUserIds.length,
      skippedCount: existingUserIds.length,
      enrollments: createdEnrollments,
    });
  } catch (error) {
    await t.rollback();
    console.error("Error bulk adding students to batch:", error);
    return sendServerError(res, error);
  }
};

// Get batch statistics
export const getBatchStatistics = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!uuidRegex.test(batchId)) {
      return sendValidationError(res, "Invalid UUID format for batchId", {
        batchId: "Invalid UUID format",
      });
    }

    // Get statistics
    const stats = await Promise.all([
      BatchStudents.count({ where: { batchId, status: "active" } }),
      BatchStudents.count({ where: { batchId, status: "inactive" } }),
      BatchStudents.count({ where: { batchId, status: "dropped" } }),
      BatchStudents.count({ where: { batchId, status: "completed" } }),
      BatchStudents.count({ where: { batchId } }),
    ]);

    const [
      activeCount,
      inactiveCount,
      droppedCount,
      completedCount,
      totalCount,
    ] = stats;

    return sendSuccess(res, "Batch statistics fetched successfully", {
      batchId,
      statistics: {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        dropped: droppedCount,
        completed: completedCount,
      },
    });
  } catch (error) {
    console.error("Error fetching batch statistics:", error);
    return sendServerError(res, error);
  }
};
