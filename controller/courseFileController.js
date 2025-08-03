import CourseFile from "../model/courseFile.js";
import Course from "../model/course.js";
import Enrollment from "../model/enrollment.js";
import User from "../model/user.js";
import Order from "../model/order.js";
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
} from "../utils/responseHelper.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===================== COURSE FILE MANAGEMENT =====================

// Upload course files (Admin/Creator only)
export const uploadCourseFiles = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { courseId } = req.params;
    const { fileDescriptions, isPreview, sectionId, lessonId, order } = req.body;
    const userId = req.user.userId;

    // Validate course exists and user has permission
    const course = await Course.findByPk(courseId);
    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
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
    const descriptions = Array.isArray(fileDescriptions)
      ? fileDescriptions
      : [fileDescriptions];
    const previewFlags = Array.isArray(isPreview) ? isPreview : [isPreview];
    const orders = Array.isArray(order) ? order : [order];

    // Process each uploaded file
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const description = descriptions[i] || "";
      const isPreviewFile =
        previewFlags[i] === "true" || previewFlags[i] === true;
      const fileOrder = orders[i] ? parseInt(orders[i]) : i;

      // Determine file type based on extension
      const fileExtension = path.extname(file.originalname).toLowerCase();
      let fileType = "other";

      if ([".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mkv"].includes(fileExtension)) {
        fileType = "video";
      } else if ([".pdf", ".doc", ".docx", ".txt", ".md"].includes(fileExtension)) {
        fileType = "document";
      } else if ([".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp"].includes(fileExtension)) {
        fileType = "image";
      } else if ([".mp3", ".wav", ".ogg", ".m4a"].includes(fileExtension)) {
        fileType = "audio";
      } else if ([".zip", ".rar", ".7z", ".tar", ".gz"].includes(fileExtension)) {
        fileType = "archive";
      } else if ([".js", ".ts", ".html", ".css", ".php", ".py", ".java", ".cpp", ".c"].includes(fileExtension)) {
        fileType = "source_code";
      } else if ([".ppt", ".pptx", ".key"].includes(fileExtension)) {
        fileType = "presentation";
      } else if ([".xls", ".xlsx", ".csv"].includes(fileExtension)) {
        fileType = "spreadsheet";
      }

      // Create file record
      const courseFile = await CourseFile.create(
        {
          courseId,
          fileName: file.originalname,
          filePath: file.path,
          fileType,
          fileSize: file.size,
          mimeType: file.mimetype,
          description: description,
          isPreview: isPreviewFile,
          sectionId: sectionId || null,
          lessonId: lessonId || null,
          order: fileOrder,
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
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["userId", "firstName", "lastName"],
        },
      ],
    });

    return sendSuccess(
      res, 
      `${uploadedFiles.length} file(s) uploaded successfully`, 
      filesWithDetails
    );
  } catch (error) {
    await transaction.rollback();
    console.error("Upload course files error:", error);
    return sendServerError(res, "Failed to upload files", error.message);
  }
};

// Get course files (Admin/Creator for all, Users for preview only, Enrolled users for all)
export const getCourseFiles = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { fileType, isPreview, sectionId, lessonId } = req.query;
    const userId = req.user?.userId;

    // Validate course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    // Check user permissions
    const isCreatorOrAdmin =
      userId && (course.createdBy === userId || req.user?.role === "admin");
    
    const isEnrolled = userId
      ? await Enrollment.findOne({
          where: {
            userId,
            courseId,
            paymentStatus: "completed",
          },
        })
      : null;
      
    // Also check if the user has purchased the course through an order
    const hasPurchased = userId 
      ? await Order.findOne({
          where: {
            userId,
            paymentStatus: "completed",
            "items.type": "course",
            "items.id": courseId
          },
        })
      : null;
      
    // User has access if they are creator/admin, enrolled, or purchased
    const hasAccess = isCreatorOrAdmin || !!isEnrolled || !!hasPurchased;

    // Build where conditions
    const whereConditions = { courseId };

    if (fileType) {
      whereConditions.fileType = fileType;
    }

    if (sectionId) {
      whereConditions.sectionId = sectionId;
    }

    if (lessonId) {
      whereConditions.lessonId = lessonId;
    }

    // If user is not creator/admin and hasn't enrolled, only show preview files
    if (!hasAccess) {
      whereConditions.isPreview = true;
    } else if (isPreview !== undefined) {
      whereConditions.isPreview = isPreview === "true";
    }

    const files = await CourseFile.findAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["userId", "firstName", "lastName"],
        },
      ],
      order: [
        ["order", "ASC"],
        ["createdAt", "ASC"]
      ],
    });

    // Format file data and hide sensitive information
    const formattedFiles = files.map((file) => {
      const fileData = file.toJSON();

      // Remove sensitive information for non-authorized users
      if (!hasAccess) {
        delete fileData.filePath;
      }

      return fileData;
    });

    return sendSuccess(
      res, 
      "Course files retrieved successfully", 
      {
        files: formattedFiles,
        meta: {
          userCanAccessAllFiles: hasAccess,
          totalFiles: formattedFiles.length,
          isEnrolled: !!isEnrolled,
          hasPurchased: !!hasPurchased,
          isCreatorOrAdmin: isCreatorOrAdmin
        }
      }
    );
  } catch (error) {
    console.error("Get course files error:", error);
    return sendServerError(res, "Failed to fetch course files", error.message);
  }
};

// Download course file
export const downloadCourseFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.userId;

    // Authentication check
    if (!userId) {
      return sendUnauthorized(res, "You must be logged in to download files");
    }

    // Find file with course information
    const courseFile = await CourseFile.findByPk(fileId, {
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["courseId", "title", "createdBy", "status"],
        },
      ],
    });

    if (!courseFile) {
      return sendNotFound(res, "File not found");
    }

    // Check if course is published or user is creator/admin
    if (
      (courseFile.course.status !== "active") &&
      courseFile.course.createdBy !== userId &&
      req.user?.role !== "admin"
    ) {
      return sendForbidden(res, "Course not available for download");
    }

    const isCreatorOrAdmin =
      userId &&
      (courseFile.course.createdBy === userId || req.user?.role === "admin");

    // Check if the file is a preview or if special permissions apply
    if (!courseFile.isPreview && !isCreatorOrAdmin) {
      // Check if user is enrolled in the course
      const enrollment = await Enrollment.findOne({
        where: {
          userId,
          courseId: courseFile.courseId,
          paymentStatus: "completed",
        },
      });
      
      // Also check if user has purchased the course through an order
      const purchase = await Order.findOne({
        where: {
          userId,
          paymentStatus: "completed",
          "items.type": "course",
          "items.id": courseFile.courseId
        },
      });

      if (!enrollment && !purchase) {
        return sendForbidden(res, "You need to enroll in or purchase this course to access this file");
      }
    }

    // Check if file exists on disk
    if (!fs.existsSync(courseFile.filePath)) {
      return sendNotFound(res, "File not found on server");
    }

    // Increment file download count
    await courseFile.increment("downloadCount");

    // Set download headers
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${courseFile.fileName}"`,
    );
    res.setHeader(
      "Content-Type",
      courseFile.mimeType || "application/octet-stream",
    );
    res.setHeader("Content-Length", courseFile.fileSize);

    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(courseFile.filePath);

    fileStream.on("error", (error) => {
      console.error("File stream error:", error);
      if (!res.headersSent) {
        sendServerError(res, "Error reading file");
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error("Download course file error:", error);
    if (!res.headersSent) {
      sendServerError(res, "Failed to download file", error.message);
    }
  }
};

// Update course file details (Admin/Creator only)
export const updateCourseFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { description, isPreview, fileType, sectionId, lessonId, order } = req.body;
    const userId = req.user.userId;

    // Find file with course information
    const courseFile = await CourseFile.findByPk(fileId, {
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["courseId", "createdBy"],
        },
      ],
    });

    if (!courseFile) {
      return sendNotFound(res, "File not found");
    }

    // Check if user is creator or admin
    if (courseFile.course.createdBy !== userId && req.user.role !== "admin") {
      return sendForbidden(res, "Not authorized to update this file");
    }

    // Update file details
    const updateData = {};
    if (description !== undefined) updateData.description = description;
    if (isPreview !== undefined) updateData.isPreview = isPreview;
    if (fileType !== undefined) updateData.fileType = fileType;
    if (sectionId !== undefined) updateData.sectionId = sectionId;
    if (lessonId !== undefined) updateData.lessonId = lessonId;
    if (order !== undefined) updateData.order = parseInt(order);

    await courseFile.update(updateData);

    // Fetch updated file with associations
    const updatedFile = await CourseFile.findByPk(fileId, {
      include: [
        {
          model: User,
          as: "uploader",
          attributes: ["userId", "firstName", "lastName"],
        },
      ],
    });

    return sendSuccess(res, "File updated successfully", updatedFile);
  } catch (error) {
    console.error("Update course file error:", error);
    return sendServerError(res, "Failed to update file", error.message);
  }
};

// Delete course file (Admin/Creator only)
export const deleteCourseFile = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { fileId } = req.params;
    const userId = req.user.userId;

    // Find file with course information
    const courseFile = await CourseFile.findByPk(fileId, {
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["courseId", "createdBy"],
        },
      ],
    });

    if (!courseFile) {
      await transaction.rollback();
      return sendNotFound(res, "File not found");
    }

    // Check if user is creator or admin
    if (courseFile.course.createdBy !== userId && req.user.role !== "admin") {
      await transaction.rollback();
      return sendForbidden(res, "Not authorized to delete this file");
    }

    // Delete file from disk if it exists
    if (fs.existsSync(courseFile.filePath)) {
      fs.unlinkSync(courseFile.filePath);
    }

    // Delete file record from database
    await courseFile.destroy({ transaction });

    await transaction.commit();

    return sendSuccess(res, "File deleted successfully");
  } catch (error) {
    await transaction.rollback();
    console.error("Delete course file error:", error);
    return sendServerError(res, "Failed to delete file", error.message);
  }
};

// Stream course file (for videos and audio)
export const streamCourseFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.user?.userId;

    // Authentication check
    if (!userId) {
      return sendUnauthorized(res, "You must be logged in to stream files");
    }

    // Find file with course information
    const courseFile = await CourseFile.findByPk(fileId, {
      include: [
        {
          model: Course,
          as: "course",
          attributes: ["courseId", "title", "createdBy", "status"],
        },
      ],
    });

    if (!courseFile) {
      return sendNotFound(res, "File not found");
    }

    // Only video and audio files can be streamed
    if (courseFile.fileType !== "video" && courseFile.fileType !== "audio") {
      return sendError(res, 400, "Only video and audio files can be streamed");
    }

    // Check if course is published or user is creator/admin
    if (
      (courseFile.course.status !== "active") &&
      courseFile.course.createdBy !== userId &&
      req.user?.role !== "admin"
    ) {
      return sendForbidden(res, "Course content not available");
    }

    const isCreatorOrAdmin =
      userId &&
      (courseFile.course.createdBy === userId || req.user?.role === "admin");

    // Check if the file is a preview or if special permissions apply
    if (!courseFile.isPreview && !isCreatorOrAdmin) {
      // Check if user is enrolled in the course
      const enrollment = await Enrollment.findOne({
        where: {
          userId,
          courseId: courseFile.courseId,
          paymentStatus: "completed",
        },
      });
      
      // Also check if user has purchased the course through an order
      const purchase = await Order.findOne({
        where: {
          userId,
          paymentStatus: "completed",
          "items.type": "course",
          "items.id": courseFile.courseId
        },
      });

      if (!enrollment && !purchase) {
        return sendForbidden(res, "You need to enroll in or purchase this course to access this file");
      }
    }

    // Check if file exists on disk
    if (!fs.existsSync(courseFile.filePath)) {
      return sendNotFound(res, "File not found on server");
    }

    // Get file stats
    const stat = fs.statSync(courseFile.filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Streaming logic for range requests
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(courseFile.filePath, { start, end });
      
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": courseFile.mimeType,
      });
      
      file.pipe(res);
    } else {
      // Full file response
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": courseFile.mimeType,
      });
      
      fs.createReadStream(courseFile.filePath).pipe(res);
    }
  } catch (error) {
    console.error("Stream course file error:", error);
    if (!res.headersSent) {
      sendServerError(res, "Failed to stream file", error.message);
    }
  }
};

// Helper function to check if a user has purchased or enrolled in a course
export const checkCourseAccess = async (userId, courseId) => {
  if (!userId || !courseId) {
    return { hasAccess: false, message: "Invalid user or course ID" };
  }

  try {
    // Check if user is the creator or admin
    const course = await Course.findByPk(courseId);
    
    if (!course) {
      return { hasAccess: false, message: "Course not found" };
    }

    // Admin or creator always has access
    if (course.createdBy === userId) {
      return { hasAccess: true, role: "creator" };
    }

    // Check if user has enrolled in the course
    const enrollment = await Enrollment.findOne({
      where: {
        userId,
        courseId,
        paymentStatus: "completed",
      },
    });

    if (enrollment) {
      return { hasAccess: true, role: "enrolled", enrollmentData: enrollment };
    }

    // Check if user has purchased the course from an order
    const order = await Order.findOne({
      where: {
        userId,
        paymentStatus: "completed",
        "items.type": "course",
        "items.id": courseId
      },
    });

    if (order) {
      return { hasAccess: true, role: "purchased", orderData: order };
    }

    return { hasAccess: false, message: "User has not purchased or enrolled in this course" };
  } catch (error) {
    console.error("Error checking course access:", error);
    return { hasAccess: false, message: "Error checking access", error };
  }
};
