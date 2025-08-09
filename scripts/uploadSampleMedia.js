// Upload sample media files to S3 for seeding
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { s3, bucketName } from '../config/awsS3Config.js';
import { PutObjectCommand } from '@aws-sdk/client-s3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Sample URLs for demonstration (will be replaced with actual S3 URLs)
let SAMPLE_IMAGE_URL = 'https://startgoals.s3.eu-north-1.amazonaws.com/seed-sample-image.jpg';
let SAMPLE_VIDEO_URL = 'https://startgoals.s3.eu-north-1.amazonaws.com/seed-sample-video.mp4';

const uploadSampleFiles = async () => {
  try {
    console.log('📤 Starting sample file upload to S3...');

    // Check if local media directories exist
    const imagesDir = path.join(__dirname, '../../images');
    const videosDir = path.join(__dirname, '../../videos');

    let imageUploaded = false;
    let videoUploaded = false;

    // Try to upload a sample image
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir).filter(file => 
        ['.jpg', '.jpeg', '.png', '.gif'].includes(path.extname(file).toLowerCase())
      );

      if (imageFiles.length > 0) {
        const sampleImagePath = path.join(imagesDir, imageFiles[0]);
        console.log(`📸 Uploading sample image: ${imageFiles[0]}`);

        try {
          const imageBuffer = fs.readFileSync(sampleImagePath);
          const imageKey = `seed-samples/sample-image${path.extname(imageFiles[0])}`;

          const imageUploadParams = {
            Bucket: bucketName,
            Key: imageKey,
            Body: imageBuffer,
            ContentType: `image/${path.extname(imageFiles[0]).slice(1)}`,
            ACL: 'public-read'
          };

          await s3.send(new PutObjectCommand(imageUploadParams));
          SAMPLE_IMAGE_URL = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${imageKey}`;
          console.log(`✅ Image uploaded successfully: ${SAMPLE_IMAGE_URL}`);
          imageUploaded = true;
        } catch (error) {
          console.log(`⚠️  Image upload failed, using placeholder: ${error.message}`);
        }
      }
    }

    // Try to upload a sample video
    if (fs.existsSync(videosDir)) {
      const videoFiles = fs.readdirSync(videosDir).filter(file => 
        ['.mp4', '.avi', '.mov', '.mkv'].includes(path.extname(file).toLowerCase())
      );

      if (videoFiles.length > 0) {
        const sampleVideoPath = path.join(videosDir, videoFiles[0]);
        console.log(`🎥 Uploading sample video: ${videoFiles[0]}`);

        try {
          const videoBuffer = fs.readFileSync(sampleVideoPath);
          const videoKey = `seed-samples/sample-video${path.extname(videoFiles[0])}`;

          const videoUploadParams = {
            Bucket: bucketName,
            Key: videoKey,
            Body: videoBuffer,
            ContentType: `video/${path.extname(videoFiles[0]).slice(1)}`,
            ACL: 'public-read'
          };

          await s3.send(new PutObjectCommand(videoUploadParams));
          SAMPLE_VIDEO_URL = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${videoKey}`;
          console.log(`✅ Video uploaded successfully: ${SAMPLE_VIDEO_URL}`);
          videoUploaded = true;
        } catch (error) {
          console.log(`⚠️  Video upload failed, using placeholder: ${error.message}`);
        }
      }
    }

    // If no local files found, use placeholder URLs
    if (!imageUploaded) {
      SAMPLE_IMAGE_URL = 'https://picsum.photos/800/600?random=1';
      console.log(`📷 No local images found, using placeholder: ${SAMPLE_IMAGE_URL}`);
    }

    if (!videoUploaded) {
      SAMPLE_VIDEO_URL = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      console.log(`🎬 No local videos found, using placeholder: ${SAMPLE_VIDEO_URL}`);
    }

    console.log('✅ Sample file upload process completed');
    return { SAMPLE_IMAGE_URL, SAMPLE_VIDEO_URL };

  } catch (error) {
    console.error('❌ Error in sample file upload:', error.message);
    // Return placeholder URLs as fallback
    return {
      SAMPLE_IMAGE_URL: 'https://picsum.photos/800/600?random=1',
      SAMPLE_VIDEO_URL: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
    };
  }
};

export { uploadSampleFiles, SAMPLE_IMAGE_URL, SAMPLE_VIDEO_URL };
