// controller/examController.js
import Exam from "../model/exam.js";
import CourseLevel from "../model/courseLevel.js";
import { Op } from "sequelize";
import {
  sendSuccess,
  sendValidationError,
  sendNotFound,
  sendServerError
} from "../utils/responseHelper.js";

export const getAllExams = async (req, res) => {
  try {
    const {
      search = "",
      sortBy = "createdAt",
      sortOrder = "ASC",
    } = req.query;
    // Build where condition for search
    const whereClause = {};
    if (search) {
      whereClause.examName = {
        [Op.iLike]: `%${search}%`,
      };
    }

    const { count: _count, rows: exams } = await Exam.findAndCountAll({
      where: whereClause,
      attributes: ["examId", "examName", "description", "levelId"],
      include: {
        model: CourseLevel,
        as: "level",
        attributes: ["levelId", "name", "order"],
        required: false,
      },
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    return sendSuccess(res,  "Exams fetched successfully", exams);
  } catch (error) {
    console.error("Fetch error:", error);
    return sendServerError(res, error);
  }
};

export const getExamsByLevel = async (req, res) => {
  try {
    const { levelId } = req.params;    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(levelId)) {
      return sendValidationError(res, `Invalid levelId format: ${levelId}. Must be a valid UUID.`);
    }
    const level = await CourseLevel.findByPk(levelId);
    if (!level) {
      return sendNotFound(res, "Level not found");
    }
    const exams = await Exam.findAll({
      where: { levelId },
      attributes: ["examId", "examName", "description", "levelId"],
      include: {
        model: CourseLevel,
        as: "level",
        attributes: ["levelId", "name", "order"],
        required: false,
      },
      order: [["examName", "ASC"]],
    });    return sendSuccess(res,  "Exams fetched successfully", exams);
  } catch (error) {
    console.error("Error fetching exams by level:", error);
    return sendServerError(res, error);
  }
};

export const getExamOptions = async (req, res) => {
  try {
    const levels = await CourseLevel.findAll({
      attributes: ["levelId", "name", "order"],
      order: [["order", "ASC"]],
    });    return sendSuccess(res,  "Exam options fetched successfully", { levels });
  } catch (error) {
    console.error("Error fetching exam options:", error);
    return sendServerError(res, error);
  }
};

export const createExam = async (req, res) => {
  try {
    const { examName, description, levelId } = req.body;

    // Validate required fields
    if (!examName) {
      return sendValidationError(res, "Missing required fields", {
        examName: "Exam name is required",
      });
    }

    // Validate level ID if provided
    if (levelId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(levelId)) {
        return sendValidationError(res, "Invalid level ID format", {
          levelId: "Level ID must be a valid UUID",
        });
      }

      const level = await CourseLevel.findByPk(levelId);
      if (!level) {
        return sendNotFound(res, `Level with ID '${levelId}' not found`);
      }
    }

    // Create the exam
    const exam = await Exam.create({
      examName,
      description,
      levelId,
    });

    return sendSuccess(res,  "Exam created successfully", exam);
  } catch (error) {
    console.error("Error creating exam:", error);
    return sendServerError(res, error);
  }
};

export const getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate exam ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return sendValidationError(res, `Invalid exam ID format: ${id}. Must be a valid UUID.`);
    }
    
    const exam = await Exam.findByPk(id, {
      attributes: ["examId", "examName", "description", "levelId", "createdAt", "updatedAt"],
      include: {
        model: CourseLevel,
        as: "level",
        attributes: ["levelId", "name", "order"],
        required: false,
      },
    });

    if (!exam) {
      return sendNotFound(res, "Exam not found");
    }

    return sendSuccess(res,  "Exam fetched successfully", exam);
  } catch (error) {
    console.error("Error fetching exam:", error);
    return sendServerError(res, error);
  }
};

export const updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { examName, description, levelId } = req.body;
    
    // Validate exam ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return sendValidationError(res, `Invalid exam ID format: ${id}. Must be a valid UUID.`);
    }
    
    // Check if exam exists
    const exam = await Exam.findByPk(id);
    if (!exam) {
      return sendNotFound(res, "Exam not found");
    }

    // Validate level ID if provided
    if (levelId) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(levelId)) {
        return sendValidationError(res, "Invalid level ID format", {
          levelId: "Level ID must be a valid UUID",
        });
      }

      const level = await CourseLevel.findByPk(levelId);
      if (!level) {
        return sendNotFound(res, `Level with ID '${levelId}' not found`);
      }
    }

    // Update exam
    const updatedExam = await exam.update({
      examName: examName || exam.examName,
      description: description !== undefined ? description : exam.description,
      levelId: levelId || exam.levelId,
    });

    return sendSuccess(res,  "Exam updated successfully", updatedExam);
  } catch (error) {
    console.error("Error updating exam:", error);
    return sendServerError(res, error);
  }
};

export const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate exam ID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return sendValidationError(res, `Invalid exam ID format: ${id}. Must be a valid UUID.`);
    }
    
    // Check if exam exists
    const exam = await Exam.findByPk(id);
    if (!exam) {
      return sendNotFound(res, "Exam not found");
    }

    // Delete exam
    await exam.destroy();

    return sendSuccess(res,  "Exam deleted successfully");
  } catch (error) {
    console.error("Error deleting exam:", error);
    return sendServerError(res, error);
  }
};
