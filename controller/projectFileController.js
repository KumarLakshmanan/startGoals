import ProjectFile from "../model/projectFile.js";
import Project from "../model/project.js";
import ProjectPurchase from "../model/projectPurchase.js";
import User from "../model/user.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
  sendForbidden,
} from "../utils/responseHelper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================== PROJECT FILE MANAGEMENT =====================

// Upload project files (Admin/Creator only)
export const uploadProjectFiles = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { projectId } = req.params;
    const { fileDescriptions } = req.body;
    const userId = req.user.userId;

    // Validate project exists and user has permission
    const project = await Project.findByPk(projectId);
    if (!project) {
      await transaction.rollback();
      return sendNotFound(res, "Project not found");
    }

    // Check if user is creator or admin
    if (project.createdBy !== userId && req.user.role !== "admin") {
      await transaction.rollback();
      return sendError(res, 403, "Not authorized to upload files for this project");
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      await transaction.rollback();
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

      // Create file record
      const projectFile = await ProjectFile.create(
        {
          projectId: parseInt(projectId),
          fileName: file.originalname,
          filePath: file.path,
          fileType: fileType,
          fileSize: file.size,
          mimeType: file.mimetype,
          description: description,
          downloadCount: 0,
          uploadedBy: userId,
        },
        { transaction },
      );

      uploadedFiles.push(projectFile);
    }

    await transaction.commit();

    // Fetch uploaded files with associations
    const filesWithDetails = await ProjectFile.findAll({
      where: {
        id: { [Op.in]: uploadedFiles.map((f) => f.id) },
      },
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["id", "username"],
        },
      ],
    });

    sendSuccess(res, `${uploadedFiles.length} file(s) uploaded successfully`, filesWithDetails);
  } catch (error) {
    await transaction.rollback();
    console.error("Upload project files error:", error);
    sendServerError(res, "Failed to upload files", error.message);
  }
};

// Get project files (Admin/Creator for all, Users for preview only, Purchased users for all)
export const getProjectFiles = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { fileType } = req.query;
    const userId = req.user?.userId;

    // Validate project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return sendNotFound(res, "Project not found");
    }

    // Check user permissions
    const isCreatorOrAdmin =
      userId && (project.createdBy === userId || req.user?.role === "admin");
    
    const hasPurchased = userId
      ? await ProjectPurchase.findOne({
          where: {
            userId,
            projectId,
            paymentStatus: "completed",
          },
        })
      : null;

    // Build where conditions
    const whereConditions = { projectId: projectId };

    if (fileType) {
      whereConditions.fileType = fileType;
    }

    const files = await ProjectFile.findAll({
      where: whereConditions,
      order: [["createdAt", "ASC"]],
    });

    // Format file data and hide sensitive information
    const formattedFiles = files.map((file) => {
      const fileData = file.toJSON();

      // Remove sensitive information for non-authorized users
      if (!isCreatorOrAdmin && !hasPurchased) {
        delete fileData.filePath;
      }

      return fileData;
    });

    return sendSuccess(
      res, 
      200, 
      "Project files retrieved successfully", 
      {
        files: formattedFiles,
        meta: {
          userCanAccessAllFiles: isCreatorOrAdmin || !!hasPurchased,
          totalFiles: formattedFiles.length,
          isPurchased: !!hasPurchased,
          isCreatorOrAdmin: isCreatorOrAdmin
        }
      }
    );
  } catch (error) {
    console.error("Get project files error:", error);
    return sendServerError(res, "Failed to fetch project files", error.message);
  }
};

// Download project file
export const downloadProjectFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.userId;

    // Authentication check
    if (!userId) {
      return sendUnauthorized(res, "You must be logged in to download files");
    }

    // Find file with project information
    const projectFile = await ProjectFile.findByPk(fileId, {
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "projectId", "title", "createdBy", "status"],
        },
      ],
    });

    if (!projectFile) {
      return sendNotFound(res, "File not found");
    }

    // Check if project is published or user is creator/admin
    if (
      projectFile.project.status !== "published" &&
      projectFile.project.createdBy !== userId &&
      req.user?.role !== "admin"
    ) {
      return sendForbidden(res, "Project not available for download");
    }

    const isCreatorOrAdmin =
      userId &&
      (projectFile.project.createdBy === userId || req.user?.role === "admin");

    // Check if the file is a preview or if special permissions apply
    if (!isCreatorOrAdmin) {
      // Check if user has purchased the project
      const purchase = await ProjectPurchase.findOne({
        where: {
          userId,
          projectId: projectFile.project.projectId,
          paymentStatus: "completed",
        },
      });

      if (!purchase) {
        return sendForbidden(res, "You need to purchase this project to download this file");
      }

      // Check download limits if any (for purchased users)
      if (
        purchase.downloadLimit &&
        purchase.downloadCount >= purchase.downloadLimit
      ) {
        return sendForbidden(res, "Download limit exceeded for this purchase");
      }

      // Increment purchase download count
      await purchase.increment("downloadCount");
      
      // Update the lastDownloadAt timestamp
      await purchase.update({
        lastDownloadAt: new Date()
      });
    }

    // Check if file exists on disk
    if (!fs.existsSync(projectFile.filePath)) {
      return sendNotFound(res, "File not found on server");
    }

    // Increment file download count
    await projectFile.increment("downloadCount");

    // Set download headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${projectFile.fileName}"`,
    );
    res.setHeader(
      "Content-Type",
      projectFile.mimeType || "application/octet-stream",
    );
    res.setHeader("Content-Length", projectFile.fileSize);

    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(projectFile.filePath);

    fileStream.on("error", (error) => {
      console.error("File stream error:", error);
      if (!res.headersSent) {
        sendServerError(res, "Error reading file");
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error("Download project file error:", error);
    if (!res.headersSent) {
      sendServerError(res, "Failed to download file", error.message);
    }
  }
};

// Update project file details (Admin/Creator only)
export const updateProjectFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { description, fileType } = req.body;
    const userId = req.user.userId;

    // Find file with project information
    const projectFile = await ProjectFile.findByPk(fileId, {
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "createdBy"],
        },
      ],
    });

    if (!projectFile) {
      return sendNotFound(res, "File not found");
    }

    // Check if user is creator or admin
    if (projectFile.project.createdBy !== userId && req.user.role !== "admin") {
      return sendError(res, 403, "Not authorized to update this file");
    }

    // Update file details
    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (fileType !== undefined) updateData.fileType = fileType;

    await projectFile.update(updateData);

    // Fetch updated file with associations
    const updatedFile = await ProjectFile.findByPk(fileId, {
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["id", "username"],
        },
      ],
    });

    res.json({
      success: true,
      message: "File updated successfully",
      data: updatedFile,
    });
  } catch (error) {
    console.error("Update project file error:", error);
    sendServerError(res, "Failed to update file", error.message);
  }
};

// Delete project file (Admin/Creator only)
export const deleteProjectFile = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { fileId } = req.params;
    const userId = req.user.userId;

    // Find file with project information
    const projectFile = await ProjectFile.findByPk(fileId, {
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "createdBy"],
        },
      ],
    });

    if (!projectFile) {
      await transaction.rollback();
      return sendNotFound(res, "File not found");
    }

    // Check if user is creator or admin
    if (projectFile.project.createdBy !== userId && req.user.role !== "admin") {
      await transaction.rollback();
      return sendError(res, 403, "Not authorized to delete this file");
    }

    // Delete file from database
    await projectFile.destroy({ transaction });

    // Delete file from disk (optional - you might want to keep files for backup)
    try {
      if (fs.existsSync(projectFile.filePath)) {
        fs.unlinkSync(projectFile.filePath);
      }
    } catch (fileError) {
      console.error("Error deleting file from disk:", fileError);
      // Continue with database transaction - file deletion from disk is not critical
    }

    await transaction.commit();

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete project file error:", error);
    sendServerError(res, "Failed to delete file", error.message);
  }
};

// Get download statistics (Admin only)
export const getDownloadStatistics = async (req, res) => {
  try {
    const { projectId, period = "30d" } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "7d":
        dateFilter = {
          [Op.gte]: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        };
        break;
      case "30d":
        dateFilter = {
          [Op.gte]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        };
        break;
      case "90d":
        dateFilter = {
          [Op.gte]: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        };
        break;
      case "1y":
        // eslint-disable-next-line no-unused-vars
        dateFilter = {
          [Op.gte]: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        };
        break;
    }

    const whereConditions = {};
    if (projectId) {
      whereConditions.projectId = projectId;
    }

    // Most downloaded files
    const topDownloadedFiles = await ProjectFile.findAll({
      where: whereConditions,
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "title"],
        },
      ],
      attributes: ["id", "fileName", "fileType", "downloadCount"],
      order: [["downloadCount", "DESC"]],
      limit: 10,
    });

    // File type distribution
    const fileTypeStats = await ProjectFile.findAll({
      where: whereConditions,
      attributes: [
        "fileType",
        [sequelize.fn("COUNT", sequelize.col("id")), "fileCount"],
        [sequelize.fn("SUM", sequelize.col("downloadCount")), "totalDownloads"],
      ],
      group: ["fileType"],
      order: [[sequelize.fn("SUM", sequelize.col("downloadCount")), "DESC"]],
    });

    // Total statistics
    const totalStats = await ProjectFile.findAll({
      where: whereConditions,
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("id")), "totalFiles"],
        [sequelize.fn("SUM", sequelize.col("downloadCount")), "totalDownloads"],
        [sequelize.fn("SUM", sequelize.col("fileSize")), "totalSize"],
      ],
      raw: true,
    });

    const stats = totalStats[0] || {};

    res.json({
      success: true,
      data: {
        overview: {
          totalFiles: parseInt(stats.totalFiles) || 0,
          totalDownloads: parseInt(stats.totalDownloads) || 0,
          totalSize: parseInt(stats.totalSize) || 0,
          period,
        },
        topDownloadedFiles,
        fileTypeDistribution: fileTypeStats,
      },
    });
  } catch (error) {
    console.error("Get download statistics error:", error);
    sendServerError(res, "Failed to fetch download statistics", error.message);
  }
};