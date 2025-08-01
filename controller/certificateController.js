// ===========================================================================================
// CERTIFICATE CONTROLLER
// Handles generating, retrieving, and verifying course completion certificates
// ===========================================================================================

import { Op } from "sequelize";
import sequelize from "../config/db.js";
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
import User from "../model/user.js";
import Course from "../model/course.js";
import Enrollment from "../model/enrollment.js";

// Assuming a Certificate model exists or will be created
// If it doesn't exist, you'll need to create it first
// import Certificate from "../model/certificate.js";

/**
 * Generate a certificate for a completed course
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateCertificate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.userId;
    
    // Check if user has completed the course
    const enrollment = await Enrollment.findOne({
      where: {
        userId,
        courseId,
        status: 'completed' // Assuming 'completed' is a valid status
      }
    });
    
    if (!enrollment) {
      return sendError(res, 400, "Course not completed or not enrolled");
    }
    
    // Get course and user details
    const [course, user] = await Promise.all([
      Course.findByPk(courseId),
      User.findByPk(userId)
    ]);
    
    if (!course || !user) {
      return sendNotFound(res, "Course or user not found");
    }
    
    // Check if certificate already exists
    // Comment out until Certificate model is confirmed to exist
    /*
    const existingCertificate = await Certificate.findOne({
      where: {
        userId,
        courseId
      }
    });
    
    if (existingCertificate) {
      return sendSuccess(res, "Certificate already exists", existingCertificate);
    }
    
    // Generate a unique certificate ID/number
    const certificateNumber = `CERT-${Date.now()}-${userId.slice(-5)}-${courseId.slice(-5)}`;
    
    // Create certificate in database
    const certificate = await Certificate.create({
      userId,
      courseId,
      certificateNumber,
      issueDate: new Date(),
      courseName: course.title,
      userName: `${user.firstName} ${user.lastName}`,
      instructorName: course.instructorName, // Assuming this field exists
      completionDate: enrollment.completedAt || new Date()
    });
    */
    
    // For now, return mock data
    const mockCertificate = {
      id: 'cert-123',
      userId,
      courseId,
      certificateNumber: `CERT-${Date.now()}-${userId.slice(-5)}`,
      issueDate: new Date(),
      courseName: course.title,
      userName: user.username, 
      completionDate: new Date()
    };
    
    return sendSuccess(res, "Certificate generated successfully", mockCertificate);
  } catch (error) {
    console.error("Error generating certificate:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get a user's certificates
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserCertificates = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Pagination parameters
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    // Fetch certificates from database
    // Comment out until Certificate model is confirmed to exist
    /*
    const { count, rows: certificates } = await Certificate.findAndCountAll({
      where: { userId },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['issueDate', 'DESC']],
      include: [
        {
          model: Course,
          attributes: ['courseId', 'title', 'thumbnail']
        }
      ]
    });
    */
    
    // For now, return mock data
    const mockCertificates = [
      {
        id: 'cert-123',
        userId,
        courseId: 'course-1',
        certificateNumber: `CERT-${Date.now()}-${userId.slice(-5)}`,
        issueDate: new Date(),
        courseName: 'Sample Course',
        userName: 'Sample User',
        completionDate: new Date(),
        course: {
          courseId: 'course-1',
          title: 'Sample Course',
          thumbnail: 'https://example.com/thumbnail.jpg'
        }
      }
    ];
    const count = 1;
    
    return sendSuccess(res, "Certificates retrieved successfully", {
      certificates: mockCertificates,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Error fetching certificates:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get a specific certificate by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCertificateById = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    // Fetch certificate from database
    // Comment out until Certificate model is confirmed to exist
    /*
    const certificate = await Certificate.findOne({
      where: { id: certificateId },
      include: [
        {
          model: Course,
          attributes: ['courseId', 'title', 'thumbnail']
        },
        {
          model: User,
          attributes: ['userId', 'username', 'email']
        }
      ]
    });
    
    if (!certificate) {
      return sendNotFound(res, "Certificate not found");
    }
    
    // Check if the user is authorized to view this certificate
    if (certificate.userId !== req.user.userId && !req.user.isAdmin) {
      return sendError(res, 403, "Not authorized to view this certificate");
    }
    */
    
    // For now, return mock data
    const mockCertificate = {
      id: certificateId,
      userId: 'user-1',
      courseId: 'course-1',
      certificateNumber: `CERT-123456`,
      issueDate: new Date(),
      courseName: 'Sample Course',
      userName: 'Sample User',
      completionDate: new Date(),
      course: {
        courseId: 'course-1',
        title: 'Sample Course',
        thumbnail: 'https://example.com/thumbnail.jpg'
      },
      user: {
        userId: 'user-1',
        username: 'sampleuser',
        email: 'sample@example.com'
      }
    };
    
    return sendSuccess(res, "Certificate retrieved successfully", mockCertificate);
  } catch (error) {
    console.error("Error fetching certificate:", error);
    return sendServerError(res, error);
  }
};

/**
 * Verify a certificate by certificate number
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const verifyCertificate = async (req, res) => {
  try {
    const { certificateNumber } = req.params;
    
    // Fetch certificate from database
    // Comment out until Certificate model is confirmed to exist
    /*
    const certificate = await Certificate.findOne({
      where: { certificateNumber },
      include: [
        {
          model: Course,
          attributes: ['courseId', 'title']
        },
        {
          model: User,
          attributes: ['userId', 'username']
        }
      ]
    });
    
    if (!certificate) {
      return sendError(res, 404, "Certificate not found or invalid");
    }
    */
    
    // For now, return mock data
    const isMockValid = certificateNumber.startsWith('CERT-');
    
    if (!isMockValid) {
      return sendError(res, 404, "Certificate not found or invalid");
    }
    
    const mockCertificate = {
      certificateNumber,
      issueDate: new Date(),
      courseName: 'Sample Course',
      userName: 'Sample User',
      completionDate: new Date(),
      isValid: true
    };
    
    return sendSuccess(res, "Certificate is valid", mockCertificate);
  } catch (error) {
    console.error("Error verifying certificate:", error);
    return sendServerError(res, error);
  }
};

/**
 * Download a certificate PDF
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const downloadCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;
    
    // Fetch certificate from database
    // Comment out until Certificate model is confirmed to exist
    /*
    const certificate = await Certificate.findOne({
      where: { id: certificateId },
      include: [
        {
          model: Course,
          attributes: ['courseId', 'title']
        },
        {
          model: User,
          attributes: ['userId', 'username', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!certificate) {
      return sendNotFound(res, "Certificate not found");
    }
    
    // Check if the user is authorized to download this certificate
    if (certificate.userId !== req.user.userId && !req.user.isAdmin) {
      return sendError(res, 403, "Not authorized to download this certificate");
    }
    
    // Generate PDF (implementation would depend on what PDF library you use)
    // const pdfBuffer = generateCertificatePDF(certificate);
    
    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificateId}.pdf"`);
    
    // Send the PDF
    // return res.send(pdfBuffer);
    */
    
    // For now, return a success message
    return sendSuccess(res, "Certificate download initiated", {
      certificateId,
      downloadUrl: `/api/certificates/${certificateId}/download-link`
    });
  } catch (error) {
    console.error("Error downloading certificate:", error);
    return sendServerError(res, error);
  }
};

/**
 * List all certificates (admin only)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getAllCertificates = async (req, res) => {
  try {
    // Pagination and filter parameters
    const { 
      page = 1, 
      limit = 10,
      courseId,
      userId,
      startDate,
      endDate,
      search
    } = req.query;
    const offset = (page - 1) * limit;
    
    // Build query conditions
    const where = {};
    if (courseId) where.courseId = courseId;
    if (userId) where.userId = userId;
    
    if (startDate && endDate) {
      where.issueDate = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.issueDate = {
        [Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      where.issueDate = {
        [Op.lte]: new Date(endDate)
      };
    }
    
    if (search) {
      where[Op.or] = [
        { certificateNumber: { [Op.like]: `%${search}%` } },
        { userName: { [Op.like]: `%${search}%` } },
        { courseName: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Fetch certificates from database
    // Comment out until Certificate model is confirmed to exist
    /*
    const { count, rows: certificates } = await Certificate.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['issueDate', 'DESC']],
      include: [
        {
          model: Course,
          attributes: ['courseId', 'title']
        },
        {
          model: User,
          attributes: ['userId', 'username', 'email']
        }
      ]
    });
    */
    
    // For now, return mock data
    const mockCertificates = [
      {
        id: 'cert-123',
        userId: 'user-1',
        courseId: 'course-1',
        certificateNumber: 'CERT-123456',
        issueDate: new Date(),
        courseName: 'Sample Course',
        userName: 'Sample User',
        completionDate: new Date(),
        course: {
          courseId: 'course-1',
          title: 'Sample Course'
        },
        user: {
          userId: 'user-1',
          username: 'sampleuser',
          email: 'sample@example.com'
        }
      }
    ];
    const count = 1;
    
    return sendSuccess(res, "Certificates retrieved successfully", {
      certificates: mockCertificates,
      pagination: {
        totalItems: count,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error("Error fetching all certificates:", error);
    return sendServerError(res, error);
  }
};
