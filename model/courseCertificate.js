// models/courseCertificate.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import { commonFields, commonOptions } from "../utils/baseModelConfig.js";

const CourseCertificate = sequelize.define(
  "course_certificate",
  {
    certificateId: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    courseId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "courses",
        key: "course_id",
      },
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
      comment: "Student who received the certificate",
    },
    batchId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: "batches",
        key: "batch_id",
      },
      comment: "For live courses with batches",
    },
    certificateNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    certificateUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    issueDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Optional expiry date for the certificate",
    },
    issuedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "users",
        key: "user_id",
      },
      comment: "Admin/teacher who issued the certificate",
    },
    status: {
      type: DataTypes.ENUM("active", "revoked"),
      defaultValue: "active",
      allowNull: false,
    },
    ...commonFields,
  },
  {
    tableName: "course_certificates",
    ...commonOptions,
  },
);

export default CourseCertificate;
