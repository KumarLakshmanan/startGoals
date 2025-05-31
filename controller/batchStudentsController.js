// controllers/batchStudentsController.js
import sequelize from "../config/db.js";
import BatchStudents from "../model/batchStudents.js";
import Batch from "../model/batch.js";
import User from "../model/user.js";
import Course from "../model/course.js";
import { Op } from "sequelize";

// Add student to batch
export const addStudentToBatch = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { batchId, userId } = req.body;

        // Validate required fields
        if (!batchId || !userId) {
            await t.rollback();
            return res.status(400).json({
                status: false,
                message: "batchId and userId are required",
            });
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
        if (!uuidRegex.test(batchId) || !uuidRegex.test(userId)) {
            await t.rollback();
            return res.status(400).json({
                status: false,
                message: "Invalid UUID format for batchId or userId",
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

        // Check if user exists
        const user = await User.findByPk(userId, { transaction: t });
        if (!user) {
            await t.rollback();
            return res.status(404).json({
                status: false,
                message: "User not found",
            });
        }

        // Check if student is already enrolled in this batch
        const existingEnrollment = await BatchStudents.findOne({
            where: { batchId, userId },
            transaction: t,
        });

        if (existingEnrollment) {
            await t.rollback();
            return res.status(409).json({
                status: false,
                message: "Student is already enrolled in this batch",
            });
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

        return res.status(201).json({
            status: true,
            message: "Student added to batch successfully",
            data: batchStudent,
        });
    } catch (error) {
        await t.rollback();
        console.error("Error adding student to batch:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// Remove student from batch
export const removeStudentFromBatch = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { batchId, userId } = req.params;

        // Validate UUID format
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
        if (!uuidRegex.test(batchId) || !uuidRegex.test(userId)) {
            await t.rollback();
            return res.status(400).json({
                status: false,
                message: "Invalid UUID format for batchId or userId",
            });
        }

        // Find the enrollment
        const batchStudent = await BatchStudents.findOne({
            where: { batchId, userId },
            transaction: t,
        });

        if (!batchStudent) {
            await t.rollback();
            return res.status(404).json({
                status: false,
                message: "Student not found in this batch",
            });
        }

        // Remove student from batch
        await batchStudent.destroy({ transaction: t });

        await t.commit();

        return res.status(200).json({
            status: true,
            message: "Student removed from batch successfully",
        });
    } catch (error) {
        await t.rollback();
        console.error("Error removing student from batch:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// Get all students in a batch
export const getStudentsInBatch = async (req, res) => {
    try {
        const { batchId } = req.params;
        const { page = 1, limit = 10, status } = req.query;

        // Validate UUID format
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
        if (!uuidRegex.test(batchId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid UUID format for batchId",
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

        return res.status(200).json({
            status: true,
            message: "Students fetched successfully",
            data: {
                students,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                },
            },
        });
    } catch (error) {
        console.error("Error fetching students in batch:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// Get all batches for a student
export const getBatchesForStudent = async (req, res) => {
    try {
        const { userId } = req.params;
        const { page = 1, limit = 10, status } = req.query;

        // Validate UUID format
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
        if (!uuidRegex.test(userId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid UUID format for userId",
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

        return res.status(200).json({
            status: true,
            message: "Batches fetched successfully",
            data: {
                batches,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(count / parseInt(limit)),
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                },
            },
        });
    } catch (error) {
        console.error("Error fetching batches for student:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message,
        });
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
            return res.status(400).json({
                status: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
            });
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
        if (!uuidRegex.test(batchId) || !uuidRegex.test(userId)) {
            await t.rollback();
            return res.status(400).json({
                status: false,
                message: "Invalid UUID format for batchId or userId",
            });
        }

        // Find the enrollment
        const batchStudent = await BatchStudents.findOne({
            where: { batchId, userId },
            transaction: t,
        });

        if (!batchStudent) {
            await t.rollback();
            return res.status(404).json({
                status: false,
                message: "Student not found in this batch",
            });
        }

        // Update status
        await batchStudent.update({ status }, { transaction: t });

        await t.commit();

        return res.status(200).json({
            status: true,
            message: `Student status updated to ${status} successfully`,
            data: batchStudent,
        });
    } catch (error) {
        await t.rollback();
        console.error("Error updating student status in batch:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message,
        });
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
            return res.status(400).json({
                status: false,
                message: "batchId and userIds array are required",
            });
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
        if (!uuidRegex.test(batchId)) {
            await t.rollback();
            return res.status(400).json({
                status: false,
                message: "Invalid UUID format for batchId",
            });
        }

        // Validate all userIds
        for (const userId of userIds) {
            if (!uuidRegex.test(userId)) {
                await t.rollback();
                return res.status(400).json({
                    status: false,
                    message: `Invalid UUID format for userId: ${userId}`,
                });
            }
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

        // Check if all users exist
        const users = await User.findAll({
            where: { userId: { [Op.in]: userIds } },
            transaction: t,
        });

        if (users.length !== userIds.length) {
            await t.rollback();
            return res.status(404).json({
                status: false,
                message: "One or more users not found",
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

        const existingUserIds = existingEnrollments.map((enrollment) => enrollment.userId);
        const newUserIds = userIds.filter((userId) => !existingUserIds.includes(userId));

        if (newUserIds.length === 0) {
            await t.rollback();
            return res.status(409).json({
                status: false,
                message: "All students are already enrolled in this batch",
            });
        }

        // Create batch enrollments for new users
        const batchStudentRecords = newUserIds.map((userId) => ({
            batchId,
            userId,
            status: "active",
        }));

        const createdEnrollments = await BatchStudents.bulkCreate(batchStudentRecords, {
            transaction: t,
        });

        await t.commit();

        return res.status(201).json({
            status: true,
            message: `${newUserIds.length} students added to batch successfully`,
            data: {
                addedCount: newUserIds.length,
                skippedCount: existingUserIds.length,
                enrollments: createdEnrollments,
            },
        });
    } catch (error) {
        await t.rollback();
        console.error("Error bulk adding students to batch:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};

// Get batch statistics
export const getBatchStatistics = async (req, res) => {
    try {
        const { batchId } = req.params;

        // Validate UUID format
        const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
        if (!uuidRegex.test(batchId)) {
            return res.status(400).json({
                status: false,
                message: "Invalid UUID format for batchId",
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

        const [activeCount, inactiveCount, droppedCount, completedCount, totalCount] = stats;

        return res.status(200).json({
            status: true,
            message: "Batch statistics fetched successfully",
            data: {
                batchId,
                statistics: {
                    total: totalCount,
                    active: activeCount,
                    inactive: inactiveCount,
                    dropped: droppedCount,
                    completed: completedCount,
                },
            },
        });
    } catch (error) {
        console.error("Error fetching batch statistics:", error);
        return res.status(500).json({
            status: false,
            message: "Internal server error",
            error: error.message,
        });
    }
};
