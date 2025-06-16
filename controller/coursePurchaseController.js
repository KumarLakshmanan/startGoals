/**
 * Course Purchase Controller with Razorpay Integration
 * Handles both live and recorded course purchases
 */

import Razorpay from "razorpay";
import crypto from "crypto";
import Course from "../model/course.js";
import User from "../model/user.js";
import Enrollment from "../model/enrollment.js";
import sequelize from "../config/db.js";
import { Op } from "sequelize";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create order for course purchase
 */
export const createCourseOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { courseId } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!courseId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Course ID is required",
      });
    }

    // Check if course exists and is published
    const course = await Course.findOne({
      where: {
        courseId: courseId,
        isPublished: true,
        status: "active",
      },
    });

    if (!course) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Course not found or not available for purchase",
      });
    }

    // Check if user already enrolled
    const existingEnrollment = await Enrollment.findOne({
      where: {
        userId: userId,
        courseId: courseId,
      },
    });

    if (existingEnrollment) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "You are already enrolled in this course",
      });
    }

    // Get user details
    const user = await User.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Calculate final price (use salePrice if available, otherwise regular price)
    const finalPrice = course.salePrice || course.price;
    const amountInPaise = Math.round(finalPrice * 100); // Convert to paise

    if (amountInPaise <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid course price",
      });
    }

    // Create Razorpay order
    const orderOptions = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `course_${courseId}_user_${userId}_${Date.now()}`,
      notes: {
        courseId: courseId,
        userId: userId,
        courseTitle: course.title,
        userEmail: user.email,
        courseType: course.type,
      },
    };

    const razorpayOrder = await razorpay.orders.create(orderOptions);

    await transaction.commit();

    // Return order details to frontend
    res.status(200).json({
      success: true,
      message: "Order created successfully",
      data: {
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        courseDetails: {
          courseId: course.courseId,
          title: course.title,
          type: course.type,
          thumbnail: course.thumbnailUrl,
          originalPrice: course.price,
          salePrice: course.salePrice,
          finalPrice: finalPrice,
        },
        userDetails: {
          name: user.firstName
            ? `${user.firstName} ${user.lastName || ""}`.trim()
            : user.username,
          email: user.email,
          mobile: user.mobile,
        },
        razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create course order error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create order",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal Server Error",
    });
  }
};

/**
 * Verify payment and enroll user in course
 */
export const verifyPaymentAndEnroll = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      courseId,
    } = req.body;

    const userId = req.user?.userId;

    if (!userId) {
      await transaction.rollback();
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Validate required fields
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !courseId
    ) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Missing required payment verification data",
      });
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment verification failed - invalid signature",
      });
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status !== "captured" && payment.status !== "authorized") {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Payment not successful",
      });
    }

    // Verify course exists and matches order
    const course = await Course.findOne({
      where: {
        courseId: courseId,
        isPublished: true,
        status: "active",
      },
    });

    if (!course) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Course not found",
      });
    }

    // Check if user already enrolled (double check)
    const existingEnrollment = await Enrollment.findOne({
      where: {
        userId: userId,
        courseId: courseId,
      },
    });

    if (existingEnrollment) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "Already enrolled in this course",
      });
    }

    // Create enrollment record
    const enrollment = await Enrollment.create(
      {
        userId: userId,
        courseId: courseId,
        enrollmentDate: new Date(),
        completionStatus: "not_started",
        progressPercentage: 0,
        paymentStatus: "completed",
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        amountPaid: payment.amount / 100, // Convert back from paise
        paymentMethod: "razorpay",
        enrollmentType: course.type, // 'live' or 'recorded'
        isActive: true,
      },
      { transaction },
    );

    await transaction.commit();

    // Get user details for response
    const user = await User.findByPk(userId, {
      attributes: ["userId", "firstName", "lastName", "username", "email"],
    });

    res.status(200).json({
      success: true,
      message: "Payment verified and enrollment completed successfully",
      data: {
        enrollmentId: enrollment.enrollmentId,
        courseId: course.courseId,
        courseTitle: course.title,
        courseType: course.type,
        enrollmentDate: enrollment.enrollmentDate,
        paymentId: razorpay_payment_id,
        amountPaid: payment.amount / 100,
        user: {
          userId: user.userId,
          name: user.firstName
            ? `${user.firstName} ${user.lastName || ""}`.trim()
            : user.username,
          email: user.email,
        },
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Verify payment and enroll error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to verify payment and enroll",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal Server Error",
    });
  }
};

/**
 * Get user's purchased courses
 */
export const getUserPurchases = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 10, status, type } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    const whereConditions = {
      userId: userId,
      paymentStatus: "completed",
    };

    if (status) {
      whereConditions.completionStatus = status;
    }

    if (type) {
      whereConditions.enrollmentType = type;
    }

    const { count, rows: enrollments } = await Enrollment.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Course,
          attributes: [
            "courseId",
            "title",
            "description",
            "thumbnailUrl",
            "type",
            "duration",
            "level",
            "price",
            "salePrice",
          ],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [["enrollmentDate", "DESC"]],
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.status(200).json({
      success: true,
      message: "User purchases retrieved successfully",
      data: {
        purchases: enrollments.map((enrollment) => ({
          enrollmentId: enrollment.enrollmentId,
          enrollmentDate: enrollment.enrollmentDate,
          completionStatus: enrollment.completionStatus,
          progressPercentage: enrollment.progressPercentage,
          amountPaid: enrollment.amountPaid,
          paymentId: enrollment.paymentId,
          course: enrollment.Course,
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalPurchases: count,
          purchasesPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get user purchases error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve purchases",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal Server Error",
    });
  }
};

/**
 * Get course purchase details
 */
export const getCoursePurchaseDetails = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    // Get course details
    const course = await Course.findOne({
      where: {
        courseId: courseId,
        isPublished: true,
        status: "active",
      },
      attributes: [
        "courseId",
        "title",
        "description",
        "thumbnailUrl",
        "type",
        "duration",
        "level",
        "price",
        "salePrice",
        "maxStudents",
        "requirements",
        "goals",
      ],
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: "Course not found or not available",
      });
    }

    // Check if user is already enrolled
    const enrollment = await Enrollment.findOne({
      where: {
        userId: userId,
        courseId: courseId,
      },
    });

    const finalPrice = course.salePrice || course.price;

    res.status(200).json({
      success: true,
      message: "Course purchase details retrieved successfully",
      data: {
        course: course,
        pricing: {
          originalPrice: course.price,
          salePrice: course.salePrice,
          finalPrice: finalPrice,
          discount: course.salePrice ? course.price - course.salePrice : 0,
          discountPercentage: course.salePrice
            ? Math.round(
                ((course.price - course.salePrice) / course.price) * 100,
              )
            : 0,
        },
        enrollment: enrollment
          ? {
              isEnrolled: true,
              enrollmentDate: enrollment.enrollmentDate,
              completionStatus: enrollment.completionStatus,
              progressPercentage: enrollment.progressPercentage,
            }
          : {
              isEnrolled: false,
            },
      },
    });
  } catch (error) {
    console.error("Get course purchase details error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve course details",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal Server Error",
    });
  }
};

/**
 * Handle payment failure
 */
export const handlePaymentFailure = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, error } = req.body;
    const userId = req.user?.userId;

    console.log("Payment failure:", {
      userId,
      razorpay_order_id,
      razorpay_payment_id,
      error: error?.description || "Unknown error",
    });

    // You can log this to a payment failures table if needed

    res.status(200).json({
      success: false,
      message: "Payment failed",
      data: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        error: error?.description || "Payment was not completed",
      },
    });
  } catch (error) {
    console.error("Handle payment failure error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to handle payment failure",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Internal Server Error",
    });
  }
};
