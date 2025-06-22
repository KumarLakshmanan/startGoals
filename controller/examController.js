// controller/examController.js
import Exam from "../model/exam.js";
import CourseLevel from "../model/courseLevel.js";
import { Op } from "sequelize";

export const bulkUploadExams = async (req, res) => {
  try {
    const requestBody = req.body;
    let exams;
    if (Array.isArray(requestBody)) {
      exams = requestBody;
    } else if (requestBody.exams && Array.isArray(requestBody.exams)) {
      exams = requestBody.exams;
    } else {
      return res.status(400).json({
        status: false,
        message:
          "Request body must be an array of exams or an object with an 'exams' array property",
      });
    }
    if (exams.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Exams array cannot be empty",
      });
    }
    try {
      await Exam.sync({ alter: false });
    } catch (error) {
      console.error("Error with exams table:", error);
    }
    const examsToCreate = [];
    const validationErrors = [];
    for (let i = 0; i < exams.length; i++) {
      const exam = exams[i];
      const examName = exam.title || exam.examName;
      let levelId = null;
      if (exam.level) {
        const level = await CourseLevel.findOne({
          where: {
            [Op.or]: [
              { name: exam.level },
              { name: { [Op.iLike]: exam.level } },
            ],
          },
        });
        if (!level) {
          validationErrors.push({
            index: i,
            errors: [`Level '${exam.level}' not found`],
          });
          continue;
        }
        levelId = level.levelId;
      } else if (exam.levelId) {
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(exam.levelId)) {
          validationErrors.push({
            index: i,
            errors: [`Invalid levelId format: ${exam.levelId}. Must be a valid UUID.`],
          });
          continue;
        }
        const level = await CourseLevel.findByPk(exam.levelId);
        if (!level) {
          validationErrors.push({
            index: i,
            errors: [`Level with ID '${exam.levelId}' not found`],
          });
          continue;
        }
        levelId = exam.levelId;
      }
      const examData = {
        examName: examName,
        description: exam.description || null,
        levelId: levelId,
      };
      examsToCreate.push(examData);
    }
    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: false,
        message: "Validation failed for one or more exams.",
        validationErrors,
      });
    }
    const createdExams = await Exam.bulkCreate(examsToCreate, {
      ignoreDuplicates: true,
    });
    return res.status(201).json({
      status: true,
      message: "Exams uploaded successfully",
      data: createdExams,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to upload exams",
      error: error.message,
    });
  }
};

export const getAllExams = async (req, res) => {
  try {
    const exams = await Exam.findAll({
      attributes: ["examId", "examName", "description", "levelId"],
      include: {
        model: CourseLevel,
        as: "level",
        attributes: ["levelId", "name", "order"],
        required: false,
      },
      order: [["createdAt", "ASC"]],
    });
    return res.status(200).json({
      status: true,
      message: "Exams fetched successfully",
      data: exams,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch exams",
      error: error.message,
    });
  }
};

export const getExamsByLevel = async (req, res) => {
  try {
    const { levelId } = req.params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(levelId)) {
      return res.status(400).json({
        status: false,
        message: `Invalid levelId format: ${levelId}. Must be a valid UUID.`,
      });
    }
    const level = await CourseLevel.findByPk(levelId);
    if (!level) {
      return res.status(404).json({
        status: false,
        message: "Level not found",
      });
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
    });
    return res.status(200).json({
      status: true,
      message: "Exams fetched successfully",
      data: exams,
    });
  } catch (error) {
    console.error("Error fetching exams by level:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch exams by level",
      error: error.message,
    });
  }
};

export const getExamOptions = async (req, res) => {
  try {
    const levels = await CourseLevel.findAll({
      attributes: ["levelId", "name", "order"],
      order: [["order", "ASC"]],
    });
    return res.status(200).json({
      status: true,
      message: "Exam options fetched successfully",
      data: { levels },
    });
  } catch (error) {
    console.error("Error fetching exam options:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch exam options",
      error: error.message,
    });
  }
};
