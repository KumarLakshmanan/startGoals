import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, bucketName } from "../config/awsS3Config.js";
import { generateToken } from "../config/agoraConfig.js";
import { getZoomAccessToken } from "../config/zoomconfig.js";
import axios from "axios";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const execAsync = promisify(exec);

/**
 * Upload file to S3 bucket
 */
export const uploadToS3 = async (filePath, key, contentType = null) => {
  try {
    const fileContent = fs.readFileSync(filePath);

    // Determine content type if not provided
    let mimeType = contentType;
    if (!mimeType) {
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.mp4': 'video/mp4',
        '.m3u8': 'application/x-mpegURL',
        '.ts': 'video/MP2T'
      };
      mimeType = mimeTypes[ext] || 'application/octet-stream';
    }

    const uploadParams = {
      Bucket: bucketName,
      Key: key,
      Body: fileContent,
      ContentType: mimeType,
      ACL: 'public-read' // Make files publicly accessible
    };

    const command = new PutObjectCommand(uploadParams);
    await s3.send(command);

    // Generate public URL
    const publicUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    console.log(`✅ Uploaded ${key} to S3`);
    return publicUrl;
  } catch (error) {
    console.error(`❌ Error uploading ${key} to S3:`, error);
    throw error;
  }
};

/**
 * Convert video to HLS format using FFmpeg
 */
export const convertToHLS = async (inputPath, outputDir, outputName) => {
  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const hlsPath = path.join(outputDir, `${outputName}.m3u8`);
    const segmentPath = path.join(outputDir, `${outputName}_%03d.ts`);

    // FFmpeg command for HLS conversion
    const ffmpegCommand = `ffmpeg -i "${inputPath}" -c:v libx264 -c:a aac -hls_time 10 -hls_list_size 0 -f hls "${hlsPath}"`;

    console.log(`🎬 Converting ${inputPath} to HLS...`);
    await execAsync(ffmpegCommand);

    console.log(`✅ HLS conversion completed: ${hlsPath}`);
    return {
      m3u8Path: hlsPath,
      segmentsPattern: segmentPath
    };
  } catch (error) {
    console.error(`❌ Error converting video to HLS:`, error);
    throw error;
  }
};

/**
 * Upload HLS files to S3
 */
export const uploadHLSFiles = async (hlsDir, s3Prefix) => {
  try {
    const files = fs.readdirSync(hlsDir);
    const uploadedFiles = [];

    for (const file of files) {
      const filePath = path.join(hlsDir, file);
      const s3Key = `${s3Prefix}/${file}`;

      const url = await uploadToS3(filePath, s3Key);
      uploadedFiles.push({ file, url });
    }

    // Find the m3u8 file URL
    const m3u8File = uploadedFiles.find(f => f.file.endsWith('.m3u8'));

    console.log(`✅ Uploaded ${uploadedFiles.length} HLS files to S3`);
    return {
      m3u8Url: m3u8File ? m3u8File.url : null,
      files: uploadedFiles
    };
  } catch (error) {
    console.error(`❌ Error uploading HLS files:`, error);
    throw error;
  }
};

/**
 * Process and upload media file
 */
export const processMediaFile = async (filePath, type = 'image') => {
  try {
    const fileName = path.basename(filePath, path.extname(filePath));
    const uniqueId = uuidv4().slice(0, 8);
    const timestamp = Date.now();

    if (type === 'image') {
      // Upload image directly
      const s3Key = `seed-samples/${timestamp}-${uniqueId}-${fileName}${path.extname(filePath)}`;
      const url = await uploadToS3(filePath, s3Key);
      return { url, type: 'image' };

    } else if (type === 'video') {
      // Convert to HLS and upload
      const tempDir = path.join(process.cwd(), 'temp-hls', uniqueId);
      const hlsName = `${timestamp}-${uniqueId}`;

      // Convert to HLS
      await convertToHLS(filePath, tempDir, hlsName);

      // Upload HLS files
      const s3Prefix = `course-files/${timestamp}-${uniqueId}`;
      const { m3u8Url } = await uploadHLSFiles(tempDir, s3Prefix);

      // Clean up temp files
      fs.rmSync(tempDir, { recursive: true, force: true });

      return {
        url: m3u8Url,
        type: 'video',
        originalFile: filePath
      };
    }

    throw new Error(`Unsupported media type: ${type}`);
  } catch (error) {
    console.error(`❌ Error processing media file ${filePath}:`, error);
    throw error;
  }
};

/**
 * Generate Agora token for live streaming
 */
export const generateAgoraToken = (channelName, userId = 0, role = 1) => {
  try {
    // Role: 1 for publisher (host), 2 for subscriber (audience)
    // Expiration: 24 hours
    const expirationTimeInSeconds = 24 * 60 * 60;

    const tokenData = generateToken(channelName, userId, role, expirationTimeInSeconds);

    return {
      token: tokenData.token,
      appId: tokenData.appId,
      channelName,
      userId,
      role,
      expirationTime: tokenData.privilegeExpiredTs
    };
  } catch (error) {
    console.error('❌ Error generating Agora token:', error);
    throw error;
  }
};

/**
 * Create Zoom meeting
 */
export const createZoomMeeting = async (topic, startTime, duration = 60) => {
  try {
    const accessToken = await getZoomAccessToken();

    const meetingData = {
      topic,
      type: 2, // Scheduled meeting
      start_time: startTime.toISOString(),
      duration,
      timezone: 'UTC',
      agenda: 'Live course session',
      settings: {
        host_video: true,
        participant_video: true,
        join_before_host: false,
        mute_upon_entry: true,
        watermark: false,
        use_pmi: false,
        approval_type: 0,
        audio: 'both',
        auto_recording: 'none'
      }
    };

    const response = await axios.post(
      'https://api.zoom.us/v2/users/me/meetings',
      meetingData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const meeting = response.data;

    return {
      meetingId: meeting.id.toString(),
      joinUrl: meeting.join_url,
      startUrl: meeting.start_url,
      password: meeting.password,
      topic: meeting.topic,
      startTime: meeting.start_time,
      duration: meeting.duration
    };
  } catch (error) {
    console.error('❌ Error creating Zoom meeting:', error.response?.data || error.message);
    throw error;
  }
};

/**
 * Get local media files
 */
export const getLocalMediaFiles = (type = 'image') => {
  const baseDir = type === 'image'
    ? path.join(process.cwd(), '..', 'images')
    : path.join(process.cwd(), '..', 'videos');

  try {
    const files = fs.readdirSync(baseDir)
      .filter(file => {
        if (type === 'image') {
          return ['.jpg', '.jpeg', '.png', '.gif'].includes(path.extname(file).toLowerCase());
        } else {
          return ['.mp4', '.avi', '.mov', '.mkv'].includes(path.extname(file).toLowerCase());
        }
      })
      .map(file => path.join(baseDir, file));

    console.log(`📁 Found ${files.length} ${type} files in ${baseDir}`);
    return files;
  } catch (error) {
    console.error(`❌ Error reading ${type} directory:`, error);
    return [];
  }
};

/**
 * Upload sample media files and return URLs
 */
export const uploadSampleMedia = async () => {
  try {
    console.log('📤 Starting media upload process...');

    // Get local files
    const imageFiles = getLocalMediaFiles('image');
    const videoFiles = getLocalMediaFiles('video');

    if (imageFiles.length === 0) {
      throw new Error('No image files found in images directory');
    }

    if (videoFiles.length === 0) {
      throw new Error('No video files found in videos directory');
    }

    // Upload first image as sample
    console.log('🖼️  Uploading sample image...');
    const sampleImage = await processMediaFile(imageFiles[0], 'image');

    // Upload first video as sample and convert to HLS
    console.log('🎥 Uploading and converting sample video...');
    const sampleVideo = await processMediaFile(videoFiles[0], 'video');

    const result = {
      sampleImageUrl: sampleImage.url,
      sampleVideoUrl: sampleVideo.url,
      imageFiles: imageFiles.length,
      videoFiles: videoFiles.length
    };

    console.log('✅ Media upload completed successfully!');
    console.log(`📊 Results: ${result.imageFiles} images, ${result.videoFiles} videos`);
    console.log(`🖼️  Sample Image: ${result.sampleImageUrl}`);
    console.log(`🎥 Sample Video: ${result.sampleVideoUrl}`);

    return result;
  } catch (error) {
    console.error('❌ Error in media upload process:', error);
    throw error;
  }
};

export default {
  uploadToS3,
  convertToHLS,
  uploadHLSFiles,
  processMediaFile,
  generateAgoraToken,
  createZoomMeeting,
  getLocalMediaFiles,
  uploadSampleMedia
};
