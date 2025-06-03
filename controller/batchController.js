// controllers/batchController.js
import Batch from "../model/batch.js";
import Course from "../model/course.js";
import User from "../model/user.js";
import BatchStudents from "../model/batchStudents.js";
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
      { transaction: t }
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
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
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
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
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
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
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
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
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
    } const { count, rows } = await Batch.findAndCountAll({
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
  }
  catch (err) {
    console.error("Get batches by course error:", err);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
}