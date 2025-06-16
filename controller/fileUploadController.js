// controllers/uploadController.js
import crypto from "crypto";

// Helper function to construct public S3 URL
const constructS3PublicUrl = (bucketName, key, region = "us-east-1") => {
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

export const uploadFiles = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
        data: null,
      });
    }

    const uploadedFiles = [];
    let totalSize = 0;
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

    return res.status(200).json({
      success: true,
      message:
        successful > 0
          ? "Files uploaded successfully"
          : "No files were uploaded successfully",
      data: {
        uploadedFiles: uploadedFiles,
        totalFiles: uploadedFiles.length,
        totalSize: totalSize,
        uploadStats: {
          successful: successful,
          failed: failed,
          skipped: skipped,
        },
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Upload failed",
      data: null,
      error: error.message,
    });
  }
};

// Upload single file
export const uploadSingleFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
        data: null,
      });
    }

    const file = req.file;

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
      uploadedBy: req.user?.id || req.userId || null,
    };

    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      data: {
        uploadedFiles: [fileData],
        totalFiles: 1,
        totalSize: file.size,
        uploadStats: {
          successful: 1,
          failed: 0,
          skipped: 0,
        },
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Upload failed",
      data: null,
      error: error.message,
    });
  }
};

// Upload files by field names (for multiple different field types)
export const uploadFieldFiles = async (req, res) => {
  try {
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
        data: null,
      });
    }

    const uploadedFiles = [];
    let totalSize = 0;
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

    return res.status(200).json({
      success: true,
      message:
        successful > 0
          ? "Files uploaded successfully"
          : "No files were uploaded successfully",
      data: {
        uploadedFiles: uploadedFiles,
        totalFiles: uploadedFiles.length,
        totalSize: totalSize,
        uploadStats: {
          successful: successful,
          failed: failed,
          skipped: skipped,
        },
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Upload failed",
      data: null,
      error: error.message,
    });
  }
};
