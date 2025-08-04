// middleware/upload.js
import multer from "multer";
import { Upload } from "@aws-sdk/lib-storage";
import { s3, bucketName } from "../config/awsS3Config.js";
import path from "path";
import crypto from "crypto";

// Allowed field names and their S3 folder paths
const folderMap = {
  thumbnail: "thumbnails/",
  video: "videos/",
  profileImage: "profiles/",
  resource: "resources/",
  artical: "articals/",
  banner: "banners/",
  projectFiles: "project-files/", // Alternative name for project files
  courseFiles: "course-files/", // For course files
};

// Custom S3 storage engine for AWS SDK v3
class S3Storage {
  constructor(options) {
    this.s3 = options.s3;
    this.bucket = options.bucket;
    this.metadata = options.metadata;
    this.key = options.key;
  }

  _handleFile(req, file, cb) {
    const folder = folderMap[file.fieldname] || "others/";
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${fileExtension}`;
    const key = `${folder}${fileName}`;

    const metadata = this.metadata
      ? this.metadata(req, file, (err, metadata) => metadata)
      : {};

    const uploadParams = {
      Bucket: this.bucket,
      Key: key,
      Body: file.stream,
      ContentType: file.mimetype,
      // Removed ACL parameter as bucket doesn't allow ACLs
      Metadata: {
        fieldName: file.fieldname,
        ...metadata,
      },
    };

    const upload = new Upload({
      client: this.s3,
      params: uploadParams,
    });

    upload
      .done()
      .then((result) => {
        // Generate public URL manually since we can't use ACL
        const publicUrl = `https://${this.bucket}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;

        cb(null, {
          bucket: this.bucket,
          key: key,
          location: publicUrl, // Use constructed public URL
          etag: result.ETag,
        });
      })
      .catch((err) => {
        cb(err);
      });
  }

  _removeFile(req, file, cb) {
    // Implement file removal if needed
    cb(null);
  }
}

// Custom multer storage
const customS3Storage = new S3Storage({
  s3: s3,
  bucket: bucketName,
  // Removed ACL configuration as bucket doesn't allow ACLs
  metadata: (req, file, cb) => {
    cb(null, { fieldName: file.fieldname });
  },
  key: (req, file, cb) => {
    const folder = folderMap[file.fieldname] || "others/";
    const fileExtension = path.extname(file.originalname);
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${fileExtension}`;
    cb(null, `${folder}${fileName}`);
  },
});

const upload = multer({
  storage: customS3Storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Define allowed file types based on fieldname
    const allowedTypes = {
      thumbnail: /jpeg|jpg|png|gif|webp/,
      video: /mp4|avi|mov|wmv|flv|webm/,
      profileImage: /jpeg|jpg|png|gif|webp/,
      resource: /pdf|doc|docx|ppt|pptx|txt|zip|rar/,
      artical: /pdf|doc|docx|txt/,
      banner: /jpeg|jpg|png|gif|webp/,
      files: /.*/,
      projectFiles: /.*/,
      courseFiles: /.*/,
      file: /.*/,
    };

    // Check if the field name is valid
    if (!Object.keys(allowedTypes).includes(file.fieldname)) {
      return cb(new Error(`Invalid field name: ${file.fieldname}. Allowed field names are: ${Object.keys(allowedTypes).join(', ')}`), false);
    }

    // Check file size before processing (additional check)
    if (file.size > 100 * 1024 * 1024) {
      return cb(new Error(`File size exceeds limit of 100MB`), false);
    }

    const fieldType = allowedTypes[file.fieldname];
    const extname = fieldType.test(
      path.extname(file.originalname).toLowerCase(),
    );
    console.log(
      `File upload check for field ${file.fieldname} field ${file.originalname}: extname=${extname}`,
    );
    if (extname) {
      return cb(null, true);
    } else {
      // Provide more detailed error message about allowed file types
      const allowedExtensions = fieldType.toString().replace(/\/|\^|\$/g, '').split('|');
      cb(new Error(`Only ${allowedExtensions.join(', ')} files are allowed for ${file.fieldname}!`), false);
    }
  },
});

// Export different upload configurations
export const uploadSingle = (fieldName) => upload.single(fieldName);
export const uploadMultiple = (fieldName, maxCount) =>
  upload.array(fieldName, maxCount);
export const uploadFields = (fields) => upload.fields(fields);

export const fileUploadMiddleware = upload;
export default upload;
