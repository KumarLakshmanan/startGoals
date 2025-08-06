import CourseFile from "../model/courseFile.js";
import Course from "../model/course.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  sendSuccess,
  sendValidationError,
  sendNotFound,
  sendServerError,
  sendForbidden,
} from "../utils/responseHelper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================== COURSE FILE MANAGEMENT =====================

// Upload course files (Admin/Creator only, must be mapped to a lesson)
export const uploadCourseFiles = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { courseId, sectionId, lessonId } = req.params;
    const userId = req.user.userId;

    // Validate course, section, and lesson exist
    const course = await Course.findByPk(courseId, { transaction });
    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
    }

    if (!lessonId) {
      await transaction.rollback();
      return sendValidationError(res, "lessonId is required");
    }

    // Check if user is creator or admin
    if (course.createdBy !== userId && req.user.role !== "admin") {
      await transaction.rollback();
      return sendForbidden(res, "Not authorized to upload files for this course");
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      await transaction.rollback();
      return sendValidationError(res, "No files uploaded");
    }

    const uploadedFiles = [];

    // Process each uploaded file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];

      // Determine file type based on extension
      const fileExtension = path.extname(file.originalname).toLowerCase();
      let fileType = "other";

      if ([".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mkv"].includes(fileExtension)) fileType = "video";
      else if ([".pdf", ".doc", ".docx", ".txt", ".md"].includes(fileExtension)) fileType = "document";
      else if ([".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"].includes(fileExtension)) fileType = "image";
      else if ([".mp3", ".wav", ".ogg", ".m4a"].includes(fileExtension)) fileType = "audio";
      else if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(fileExtension)) fileType = "archive";
      else if ([".js", ".ts", ".html", ".css", ".php", ".py", ".java", ".cpp", ".c"].includes(fileExtension)) fileType = "source_code";
      else if ([".ppt", ".pptx", ".key"].includes(fileExtension)) fileType = "presentation";
      else if ([".xls", ".xlsx", ".csv"].includes(fileExtension)) fileType = "spreadsheet";

      // Create file record, always mapped to lesson
      const courseFile = await CourseFile.create(
        {
          courseId,
          sectionId,
          lessonId,
          fileName: file.originalname,
          fileUrl: file.location || file.path,
          fileType,
          fileSize: file.size,
          mimeType: file.mimetype,
          description: "",
          downloadCount: 0,
          uploadedBy: userId,
        },
        { transaction },
      );
      uploadedFiles.push(courseFile);
    }

    await transaction.commit();
    // Fetch uploaded files with associations
    const filesWithDetails = await CourseFile.findAll({
      where: {
        fileId: { [Op.in]: uploadedFiles.map((f) => f.fileId) },
      },
    });
    return sendSuccess(res, `${uploadedFiles.length} file(s) uploaded successfully`, filesWithDetails);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Upload course files error:", error);
    return sendServerError(res, "Failed to upload files", error.message);
  }
};

// Get course files (must be mapped to lesson)
export const getCourseFiles = async (req, res) => {
  try {
    const { courseId, sectionId, lessonId } = req.params;
    const { fileType } = req.query;
    // Validate course exists
    const course = await Course.findByPk(courseId);
    if (!course) return sendNotFound(res, "Course not found");
    // Only show files for this lesson
    const whereConditions = { courseId, sectionId, lessonId };
    if (fileType) whereConditions.fileType = fileType;
    const files = await CourseFile.findAll({
      where: whereConditions,
      order: [["order", "ASC"], ["createdAt", "ASC"]],
    });
    return sendSuccess(res, "Course files retrieved successfully", { files });
  } catch (error) {
    console.error("Get course files error:", error);
    return sendServerError(res, "Failed to fetch course files", error.message);
  }
};

// Update course file details (Admin/Creator only, must be mapped to lesson)
export const updateCourseFile = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { courseId, sectionId, lessonId, fileId } = req.params;
    // Find file with all params
    const courseFile = await CourseFile.findOne({
      where: { fileId, courseId, sectionId, lessonId },
      include: [{ model: Course, as: "course", attributes: ["courseId"] }],
    });
    if (!courseFile) {
      await transaction.rollback();
      return sendNotFound(res, "File not found");
    }
    // Update file details
    const updateData = {};
    await courseFile.update(updateData, { transaction });
    await transaction.commit();
    // Fetch updated file with associations
    const updatedFile = await CourseFile.findByPk(fileId);
    return sendSuccess(res, "File updated successfully", updatedFile);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Update course file error:", error);
    return sendServerError(res, "Failed to update file", error.message);
  }
};

// Update course file data (Admin/Creator only, must be mapped to lesson)
export const updateCourseFileData = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { courseId, sectionId, lessonId, fileId } = req.params;
    const { description, fileType, order } = req.body;
    // Find file with all params
    const courseFile = await CourseFile.findOne({
      where: { fileId, courseId, sectionId, lessonId },
      include: [{ model: Course, as: "course", attributes: ["courseId"] }],
    });
    if (!courseFile) {
      await transaction.rollback();
      return sendNotFound(res, "File not found");
    }
    // Update file details
    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (fileType !== undefined) updateData.fileType = fileType;
    if (order !== undefined) updateData.order = parseInt(order);
    await courseFile.update(updateData, { transaction });
    await transaction.commit();
    // Fetch updated file with associations
    const updatedFile = await CourseFile.findByPk(fileId);
    return sendSuccess(res, "File data updated successfully", updatedFile);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Update course file data error:", error);
    return sendServerError(res, "Failed to update file data", error.message);
  }
};

// Delete course file (Admin/Creator only, must be mapped to lesson)
export const deleteCourseFile = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { courseId, sectionId, lessonId, fileId } = req.params;
    // Find file with all params
    const courseFile = await CourseFile.findOne({
      where: { fileId, courseId, sectionId, lessonId },
      include: [{ model: Course, as: "course", attributes: ["courseId"] }],
    });
    if (!courseFile) {
      await transaction.rollback();
      return sendNotFound(res, "File not found");
    }
    // Delete file from disk if it exists
    if (fs.existsSync(courseFile.fileUrl)) {
      fs.unlinkSync(courseFile.fileUrl);
    }
    // Delete file record from database
    await courseFile.destroy({ transaction });
    await transaction.commit();
    return sendSuccess(res, "File deleted successfully");
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Delete course file error:", error);
    return sendServerError(res, "Failed to delete file", error.message);
  }
};