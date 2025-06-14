// config/s3.js
import { S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config(); // ✅ Load .env variables

// Configure AWS SDK v3
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // from .env
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // from .env
  },
  region: process.env.AWS_REGION, // e.g., "us-east-1"
});

const bucketName = process.env.AWS_BUCKET_NAME;

export { s3, bucketName };
