// middleware/upload.js
import multer from "multer";
import { Upload } from "@aws-sdk/lib-storage";
import { s3, bucketName } from "../config/awsS3Config.js";
import path from "path";
import crypto from "crypto";
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import fs from 'fs';
import os from 'os';

// Set ffmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
  console.log(`FFmpeg path set to: ${ffmpegStatic}`);
} else {
  console.warn('FFmpeg static binary not found, HLS conversion may fail');
}

// Allowed field names and their S3 folder paths
const folderMap = {
  thumbnail: "thumbnails/",
  video: "videos/",
  profileImage: "profiles/",
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
    let fileSize = 0;
    // get the file size
    file.stream.on("data", (chunk) => {
      fileSize += chunk.length;
    });
    file.stream.on("end", () => {
      console.log(`File size for ${file.originalname}: ${fileSize} bytes`);
    });
    file.stream.on("error", (err) => {
      console.error(`Error reading file stream for ${file.originalname}:`, err);
      cb(err);
      return;
    });
    // Remove duplicate declaration of metadata for video branch
    let metadata;
    if (this.metadata) {
      this.metadata(req, file, (err, meta) => {
        metadata = meta;
      });
    } else {
      metadata = {};
    }

    // Detect video file type
    const videoTypes = [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm"];
    if (videoTypes.includes(fileExtension.toLowerCase())) {
      // Save the uploaded video temporarily
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-'));
      const tempVideoPath = path.join(tempDir, fileName);
      const writeStream = fs.createWriteStream(tempVideoPath);
      
      file.stream.pipe(writeStream);
      
      writeStream.on('finish', () => {
        // Convert to HLS using ffmpeg
        const hlsOutputDir = path.join(tempDir, 'hls');
        fs.mkdirSync(hlsOutputDir, { recursive: true });
        const playlistName = `${path.parse(fileName).name}.m3u8`;
        
        console.log(`Converting video to HLS: ${tempVideoPath}`);
        
        ffmpeg(tempVideoPath)
          .outputOptions([
            '-c:v libx264',
            '-c:a aac',
            '-profile:v baseline',
            '-level 3.0',
            '-start_number 0',
            '-hls_time 10',
            '-hls_list_size 0',
            '-hls_flags independent_segments',
            '-f hls'
          ])
          .output(path.join(hlsOutputDir, playlistName))
          .on('start', (commandLine) => {
            console.log('Spawned Ffmpeg with command: ' + commandLine);
          })
          .on('stderr', (stderrLine) => {
            console.log('FFmpeg stderr: ' + stderrLine);
          })
          .on('progress', (progress) => {
            console.log('Processing: ' + progress.percent + '% done');
          })
          .on('end', async () => {
            console.log('HLS conversion completed');
            // Upload all HLS files to S3
            try {
              const files = fs.readdirSync(hlsOutputDir);
              console.log(`Found ${files.length} HLS files to upload`);
              
              for (const hlsFile of files) {
                const hlsFilePath = path.join(hlsOutputDir, hlsFile);
                if (!fs.existsSync(hlsFilePath)) {
                  throw new Error(`HLS file not found: ${hlsFilePath}`);
                }
                const s3Key = `${folder}${path.parse(fileName).name}/hls/${hlsFile}`;
                const putParams = {
                  Bucket: this.bucket,
                  Key: s3Key,
                  Body: fs.createReadStream(hlsFilePath),
                  ContentType: hlsFile.endsWith('.m3u8') ? 'application/vnd.apple.mpegurl' : 'video/MP2T',
                  Metadata: {
                    fieldName: file.fieldname,
                    originalFileName: file.originalname,
                    ...metadata,
                  },
                };
                await this.s3.send(new PutObjectCommand(putParams));
                console.log(`Uploaded HLS file: ${s3Key}`);
              }
              
              // Generate public URL for playlist
              const publicUrl = `https://${this.bucket}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${folder}${path.parse(fileName).name}/hls/${playlistName}`;
              
              cb(null, {
                bucket: this.bucket,
                key: `${folder}${path.parse(fileName).name}/hls/${playlistName}`,
                size: fileSize,
                location: publicUrl,
                etag: null,
                hls: true,
                type: 'hls_video'
              });
            } catch (err) {
              console.error('Error uploading HLS files:', err);
              cb(err);
            } finally {
              // Clean up temp files
              try {
                fs.rmSync(tempDir, { recursive: true, force: true });
                console.log('Temporary files cleaned up');
              } catch (cleanupErr) {
                console.warn('Failed to cleanup temp files:', cleanupErr);
              }
            }
          })
          .on('error', (err) => {
            console.error('FFmpeg error:', err);
            cb(new Error(`Video conversion failed: ${err.message}`));
            try {
              fs.rmSync(tempDir, { recursive: true, force: true });
            } catch (cleanupErr) {
              console.warn('Failed to cleanup temp files after error:', cleanupErr);
            }
          })
          .run();
      });
      
      writeStream.on('error', (err) => {
        console.error('Error writing temp video file:', err);
        cb(err);
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch (cleanupErr) {
          console.warn('Failed to cleanup temp files after write error:', cleanupErr);
        }
      });
      
      return;
    }


    const uploadParams = {
      Bucket: this.bucket,
      Key: key,
      Body: file.stream,
      ContentType: file.mimetype,
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
        const publicUrl = `https://${this.bucket}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
        cb(null, {
          bucket: this.bucket,
          key: key,
          size: fileSize,
          location: publicUrl,
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
    fileSize: 1024 * 1024 * 1024, // 1GB file size limit
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
