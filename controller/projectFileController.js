import ProjectFile from "../model/projectFile.js";
import Project from "../model/project.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
import path from "path";
import { fileURLToPath } from "url";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendServerError,
} from "../utils/responseHelper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================== PROJECT FILE MANAGEMENT =====================

/**
 * Upload project files (Admin/Creator only) - Legacy method
 * This method directly handles file uploads with multer
 */
export const uploadProjectFiles = async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { projectId } = req.params;
    const { fileDescriptions } = req.body;
    const userId = req.user.userId;

    // Validate project exists and user has permission
    const project = await Project.findByPk(projectId, { transaction });
    if (!project) {
      if (transaction) await transaction.rollback();
      return sendNotFound(res, "Project not found");
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      if (transaction) await transaction.rollback();
      return sendValidationError(res, "No files uploaded");
    }

    const uploadedFiles = [];
    const descriptions = Array.isArray(fileDescriptions)
      ? fileDescriptions
      : [fileDescriptions];

    // Process each uploaded file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const description = descriptions[i] || "";
      
      try {
        // Determine file type based on extension
        const fileExtension = path.extname(file.originalname).toLowerCase();
        let fileType = "other";

        if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(fileExtension)) {
          fileType = "archive";
        } else if (
          [
            ".js",
            ".ts",
            ".html",
            ".css",
            ".php",
            ".py",
            ".java",
            ".cpp",
            ".c",
          ].includes(fileExtension)
        ) {
          fileType = "source_code";
        } else if (
          [".pdf", ".doc", ".docx", ".txt", ".md"].includes(fileExtension)
        ) {
          fileType = "documentation";
        } else if (
          [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"].includes(
            fileExtension,
          )
        ) {
          fileType = "image";
        } else if (
          [".mp4", ".avi", ".mov", ".wmv", ".flv"].includes(fileExtension)
        ) {
          fileType = "video";
        }
        console.log(file);
        // Create file record
        const projectFile = await ProjectFile.create(
          {
            projectId,
            fileName: file.originalname,
            fileUrl: file.location || file.path, // Use S3 location if available
            fileType,
            fileSize: file.size,
            mimeType: file.mimetype,
            description: description,
            downloadCount: 0,
            uploadedBy: userId,
          },
          { transaction }
        );

        uploadedFiles.push(projectFile);
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        // Continue with other files
      }
    }

    if (uploadedFiles.length === 0) {
      if (transaction) await transaction.rollback();
      return sendValidationError(res, "No files could be processed");
    }

    await transaction.commit();

    // Return success response
    sendSuccess(
      res,
      `${uploadedFiles.length} file(s) uploaded successfully`,
      {
        files: uploadedFiles,
        projectId,
      }
    );
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackError) {
        console.error("Transaction rollback error:", rollbackError);
      }
    }
    console.error("Upload project files error:", error);
    sendServerError(res, "Failed to upload files", error.message);
  }
};

/**
 * Save project files to database (after upload via file upload API)
 * This endpoint expects file information from the upload API response
 */
export const saveProjectFiles = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { projectId } = req.params;
    const { files } = req.body; // Array of file objects from upload API
    const userId = req.user.userId;

    // Validate project exists and user has permission
    const project = await Project.findByPk(projectId);
    if (!project) {
      await transaction.rollback();
      return sendNotFound(res, "Project not found");
    }

    // Validate files array
    if (!files || !Array.isArray(files) || files.length === 0) {
      await transaction.rollback();
      return sendValidationError(res, "No file information provided");
    }

    const savedFiles = [];

    // Process each file
    for (const fileInfo of files) {
      // Validate required file information
      if (!fileInfo.url || !fileInfo.originalName || !fileInfo.fileId) {
        continue; // Skip invalid files
      }

      // Determine file type based on extension or mime type
      const fileExtension = fileInfo.originalName
        ? fileInfo.originalName.split('.').pop().toLowerCase()
        : '';
      
      let fileType = "other";
      if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(`.${fileExtension}`)) {
        fileType = "archive";
      } else if (
        [".js", ".ts", ".html", ".css", ".php", ".py", ".java", ".cpp", ".c"]
          .includes(`.${fileExtension}`)
      ) {
        fileType = "source_code";
      } else if (
        [".pdf", ".doc", ".docx", ".txt", ".md"].includes(`.${fileExtension}`)
      ) {
        fileType = "documentation";
      } else if (
        [".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"]
          .includes(`.${fileExtension}`)
      ) {
        fileType = "image";
      } else if (
        [".mp4", ".avi", ".mov", ".wmv", ".flv"].includes(`.${fileExtension}`)
      ) {
        fileType = "video";
      }

      // Create file record in database
      const projectFile = await ProjectFile.create(
        {
          projectId: projectId, // Keep as string/UUID
          fileName: fileInfo.originalName,
          fileUrl: fileInfo.url, // Use S3 URL
          fileType: fileType,
          fileSize: fileInfo.fileSize || 0,
          mimeType: fileInfo.mimeType || "application/octet-stream",
          description: fileInfo.description || "",
          downloadCount: 0,
          uploadedBy: userId,
        },
        { transaction }
      );

      savedFiles.push(projectFile);
    }

    await transaction.commit();

    // Fetch saved files with associations for response
    const filesWithDetails = await ProjectFile.findAll({
      where: {
        fileId: { [Op.in]: savedFiles.map((f) => f.fileId) },
      },
    });

    sendSuccess(
      res,
      `${savedFiles.length} file(s) saved successfully`,
      {
        files: filesWithDetails,
        projectId: projectId
      }
    );
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error("Transaction rollback error:", rollbackError);
    }
    console.error("Save project files error:", error);
    sendServerError(res, "Failed to save files", error.message);
  }
};

/**
 * Get project files (improved version with better access control)
 */
export const getProjectFiles = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { fileType, page = 1, limit = 50 } = req.query;

    // Validate project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return sendNotFound(res, "Project not found");
    }

    // Build where condition
    const whereCondition = { projectId: projectId };
    if (fileType && fileType !== 'all') {
      whereCondition.fileType = fileType;
    }
    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Fetch files with pagination
    const { rows: files, count: totalFiles } = await ProjectFile.findAndCountAll({
      where: whereCondition,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: offset,
    });

    const response = {
      files,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalFiles / parseInt(limit)),
        totalFiles,
        limit: parseInt(limit),
        hasNext: offset + files.length < totalFiles,
        hasPrev: parseInt(page) > 1
      },
    };

    sendSuccess(res, "Project files retrieved successfully", response);
  } catch (error) {
    console.error("Get project files error:", error);
    sendServerError(res, "Failed to retrieve files", error.message);
  }
};

/**
 * Update project file metadata (Admin/Creator only)
 */
export const updateProjectFile = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { projectId, fileId } = req.params;
    const userId = req.user.userId;

    // Validate project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      await transaction.rollback();
      return sendNotFound(res, "Project not found");
    }

    // Check if user is creator or admin
    if (project.createdBy !== userId && req.user.role !== "admin") {
      await transaction.rollback();
      return sendError(res, 403, "Not authorized to update files for this project");
    }

    // Find and update the file
    const projectFile = await ProjectFile.findOne({
      where: { fileId: fileId, projectId: projectId }
    });

    if (!projectFile) {
      await transaction.rollback();
      return sendNotFound(res, "File not found");
    }

    await projectFile.save({ transaction });
    await transaction.commit();

    // Fetch updated file with associations
    const updatedFile = await ProjectFile.findByPk(projectFile.fileId,);

    sendSuccess(res, "File updated successfully", updatedFile);
  } catch (error) {
    await transaction.rollback();
    console.error("Update project file error:", error);
    sendServerError(res, "Failed to update file", error.message);
  }
};

export const updateProjectData = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { projectId, fileId } = req.params;
    const { fileName, description } = req.body;
    const userId = req.user.userId;

    // Validate project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      await transaction.rollback();
      return sendNotFound(res, "Project not found");
    }

    // Check if user is creator or admin
    if (project.createdBy !== userId && req.user.role !== "admin") {
      await transaction.rollback();
      return sendError(res, 403, "Not authorized to update files for this project");
    }

    // Find and update the file
    const projectFile = await ProjectFile.findOne({
      where: { fileId: fileId, projectId: projectId }
    });

    if (!projectFile) {
      await transaction.rollback();
      return sendNotFound(res, "File not found");
    }

    // Update fields if provided
    if (fileName !== undefined) projectFile.fileName = fileName;
    if (description !== undefined) projectFile.description = description;

    await projectFile.save({ transaction });
    await transaction.commit();

    // Fetch updated file with associations
    const updatedFile = await ProjectFile.findByPk(projectFile.fileId);

    sendSuccess(res, "File updated successfully", updatedFile);
  } catch (error) {
    await transaction.rollback();
    console.error("Update project data error:", error);
    sendServerError(res, "Failed to update file", error.message);
  }
}

/**
 * Delete project file (Admin/Creator only)
 */
export const deleteProjectFile = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { projectId, fileId } = req.params;
    const userId = req.user.userId;

    // Validate project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      await transaction.rollback();
      return sendNotFound(res, "Project not found");
    }

    // Check if user is creator or admin
    if (project.createdBy !== userId && req.user.role !== "admin") {
      await transaction.rollback();
      return sendError(res, 403, "Not authorized to delete files for this project");
    }

    // Find and delete the file
    const projectFile = await ProjectFile.findOne({
      where: { fileId: fileId, projectId: projectId }
    });

    if (!projectFile) {
      await transaction.rollback();
      return sendNotFound(res, "File not found");
    }

    await projectFile.destroy({ transaction });
    await transaction.commit();

    sendSuccess(res, "File deleted successfully", { 
      deletedFile: {
        fileId: projectFile.fileId,
        fileName: projectFile.fileName
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete project file error:", error);
    sendServerError(res, "Failed to delete file", error.message);
  }
};
