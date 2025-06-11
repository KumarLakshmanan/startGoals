// middleware/upload.js
import multer from "multer";
import multerS3 from "multer-s3";
import { s3, bucketName } from "../config/awsS3Config.js";
import path from "path";

// Allowed field names and their S3 folder paths
const folderMap = {
  thumbnail: "thumbnails/",
  video: "videos/",
  profileImage: "profiles/",
  resource: "resources/",
  artical: "articals/",
  banner: "banners/",
  files: "project-files/", // For project files
  projectFiles: "project-files/", // Alternative name for project files
};

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: bucketName,
    acl: "public-read",
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      const folder = folderMap[file.fieldname] || "others/"; // fallback folder
      const fileExtension = path.extname(file.originalname);
      const fileName = `${Date.now()}-${Math.floor(
        Math.random() * 1000
      )}${fileExtension}`;
      cb(null, `${folder}${fileName}`);
    },  }),
});

export const fileUploadMiddleware = upload;
export default upload;
