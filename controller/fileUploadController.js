// controllers/uploadController.js
import crypto from "crypto";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendServerError,
  sendConflict
} from "../utils/responseHelper.js";

// Helper function to construct public S3 URL
const constructS3PublicUrl = (bucketName, key, region = "us-east-1") => {
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

export const uploadFiles = async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return sendValidationError(res, "No files uploaded");
    }

    // Validate file size limits (optional additional check)
    const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB total limit
    const MAX_SINGLE_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file

    let totalSize = 0;
    const oversizedFiles = [];

    for (const file of req.files) {
      totalSize += file.size;
      if (file.size > MAX_SINGLE_FILE_SIZE) {
        oversizedFiles.push({
          name: file.originalname,
          size: file.size,
          maxAllowed: MAX_SINGLE_FILE_SIZE
        });
      }
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return sendValidationError(res, "Total upload size exceeds the maximum allowed limit", {
        totalSize,
        maxAllowed: MAX_TOTAL_SIZE
      });
    }

    if (oversizedFiles.length > 0) {
      return sendValidationError(res, "One or more files exceed the maximum allowed file size", {
        oversizedFiles,
        maxAllowedPerFile: MAX_SINGLE_FILE_SIZE
      });
    }

    const uploadedFiles = [];

    let successful = 0;
    let failed = 0;
    let skipped = 0;

    for (const file of req.files) {
      try {
        // Generate unique file ID
        const fileId = `file_${crypto.randomBytes(8).toString("hex")}`;

        // Extract file name without timestamp prefix
        const originalFileName = file.originalname;
        const uploadedFileName = file.key
          ? file.key.split("/").pop()
          : file.filename || originalFileName;

        // Determine category based on field name
        const categoryMap = {
          thumbnail: "thumbnail",
          video: "video",
          profileImage: "profile_image",
          resource: "resource",
          artical: "article",
          banner: "banner",
          files: "project_file",
          projectFiles: "project_file",
        };

        const category = categoryMap[file.fieldname] || "other";

        const fileData = {
          fileId: fileId,
          originalName: originalFileName,
          fileName: uploadedFileName,
          fileSize: file.size,
          mimeType: file.mimetype,
          url: file.location,
          category: category,
          uploadedAt: new Date().toISOString(),
          uploadedBy: req.user?.id || req.userId || null, // Get user ID from auth middleware
        };

        uploadedFiles.push(fileData);
        totalSize += file.size;
        successful++;
      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        failed++;
      }
    }

    const responseData = {
      uploadedFiles: uploadedFiles,
      totalFiles: uploadedFiles.length,
      totalSize: totalSize,
      uploadStats: {
        successful: successful,
        failed: failed,
        skipped: skipped,
      },
    };

    return sendSuccess(res, 200, successful > 0 ? "Files uploaded successfully" : "No files were uploaded successfully", responseData);
  } catch (error) {
    console.error("Upload error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Upload a single file and return its URL
 * Used primarily for project images and files
 */
export const uploadSingleFile = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return sendValidationError(res, "No file uploaded");
    }

    const file = req.file;
    const fileType = req.body.type || 'other';
    
    // Generate unique file ID
    const fileId = `file_${crypto.randomBytes(8).toString("hex")}`;
    
    // Extract file information
    const originalFileName = file.originalname;
    const uploadedFileName = file.key
      ? file.key.split("/").pop()
      : file.filename || originalFileName;
    
    // Create response with file data
    const fileData = {
      fileId: fileId,
      originalName: originalFileName,
      fileName: uploadedFileName,
      fileSize: file.size,
      mimeType: file.mimetype,
      url: file.location,
      category: fileType,
      uploadedAt: new Date().toISOString(),
      uploadedBy: req.user?.userId || null,
    };
    
    // Send successful response
    return sendSuccess(res, 200, "File uploaded successfully", fileData);
  } catch (error) {
    console.error("Error uploading single file:", error);
    return sendServerError(res, "Failed to upload file", error);
  }
};

// Upload files by field names (for multiple different field types)
export const uploadFieldFiles = async (req, res) => {
  try {
    // Check if files were uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      return sendValidationError(res, "No files uploaded");
    }

    // Validate file size limits
    const MAX_TOTAL_SIZE = 200 * 1024 * 1024; // 200MB total limit
    const MAX_SINGLE_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file

    let totalSize = 0;
    const oversizedFiles = [];
    const invalidFields = [];

    // Valid field names for file uploads
    const validFieldNames = [
      'thumbnail', 'video', 'profileImage', 'resource',
      'artical', 'banner', 'files', 'projectFiles'
    ];

    // Process files from different fields
    for (const fieldName in req.files) {
      // Check if the field name is valid
      if (!validFieldNames.includes(fieldName)) {
        invalidFields.push(fieldName);
        continue;
      }

      const filesArray = Array.isArray(req.files[fieldName])
        ? req.files[fieldName]
        : [req.files[fieldName]];

      for (const file of filesArray) {
        totalSize += file.size;
        if (file.size > MAX_SINGLE_FILE_SIZE) {
          oversizedFiles.push({
            field: fieldName,
            name: file.originalname,
            size: file.size,
            maxAllowed: MAX_SINGLE_FILE_SIZE
          });
        }
      }
    }

    // Report validation errors
    if (invalidFields.length > 0) {
      return sendValidationError(res, "Invalid field names detected", {
        invalidFields,
        validFieldNames
      });
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return sendValidationError(res, "Total upload size exceeds the maximum allowed limit", {
        totalSize,
        maxAllowed: MAX_TOTAL_SIZE,
      });
    }

    if (oversizedFiles.length > 0) {
      return sendValidationError(res, "One or more files exceed the maximum allowed file size", {
        oversizedFiles,
        maxAllowedPerFile: MAX_SINGLE_FILE_SIZE,
      });
    }

    const uploadedFiles = [];
    let successful = 0;
    let failed = 0;
    let skipped = 0;

    // Process files from different fields
    for (const fieldName in req.files) {
      const filesArray = Array.isArray(req.files[fieldName])
        ? req.files[fieldName]
        : [req.files[fieldName]];

      for (const file of filesArray) {
        try {
          // Generate unique file ID
          const fileId = `file_${crypto.randomBytes(8).toString("hex")}`;

          // Extract file name without timestamp prefix
          const originalFileName = file.originalname;
          const uploadedFileName = file.key
            ? file.key.split("/").pop()
            : file.filename || originalFileName;

          // Determine category based on field name
          const categoryMap = {
            thumbnail: "thumbnail",
            video: "video",
            profileImage: "profile_image",
            resource: "resource",
            artical: "article",
            banner: "banner",
            files: "project_file",
            projectFiles: "project_file",
          };

          const category = categoryMap[fieldName] || "other";

          const fileData = {
            fileId: fileId,
            originalName: originalFileName,
            fileName: uploadedFileName,
            fileSize: file.size,
            mimeType: file.mimetype,
            url: file.location,
            category: category,
            uploadedAt: new Date().toISOString(),
            uploadedBy: req.user?.id || req.userId || null,
          };

          uploadedFiles.push(fileData);
          totalSize += file.size;
          successful++;
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          failed++;
        }
      }
    }

    const responseData = {
      uploadedFiles: uploadedFiles,
      totalFiles: uploadedFiles.length,
      totalSize: totalSize,
      uploadStats: {
        successful: successful,
        failed: failed,
        skipped: skipped,
      },
    };

    return sendSuccess(res, 200, successful > 0 ? "Files uploaded successfully" : "No files were uploaded successfully", responseData);
  } catch (error) {
    console.error("Upload error:", error);
    return sendServerError(res, error);
  }
};
