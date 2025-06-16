/**
 * Course Purchase Routes
 * Handles Razorpay payment integration for course purchases
 */

import express from "express";
import {
  createCourseOrder,
  verifyPaymentAndEnroll,
  getUserPurchases,
  getCoursePurchaseDetails,
  handlePaymentFailure,
} from "../controller/coursePurchaseController.js";
import { authenticateToken } from "../middleware/authMiddleware.js";
import {
  validateSchema,
  coursePurchaseValidation,
} from "../middleware/fieldValidation.js";

const coursePurchaseRoutes = express.Router();

/**
 * @route   POST /api/course-purchase/create-order
 * @desc    Create Razorpay order for course purchase
 * @access  Protected (Students only)
 */
coursePurchaseRoutes.post(
  "/create-order",
  authenticateToken,
  validateSchema(coursePurchaseValidation.createOrder),
  createCourseOrder,
);

/**
 * @route   POST /api/course-purchase/verify-payment
 * @desc    Verify Razorpay payment and enroll user in course
 * @access  Protected (Students only)
 */
coursePurchaseRoutes.post(
  "/verify-payment",
  authenticateToken,
  validateSchema(coursePurchaseValidation.verifyPayment),
  verifyPaymentAndEnroll,
);

/**
 * @route   GET /api/course-purchase/my-purchases
 * @desc    Get user's purchased courses
 * @access  Protected (Students only)
 */
coursePurchaseRoutes.get(
  "/my-purchases",
  authenticateToken,
  validateSchema(coursePurchaseValidation.purchaseHistory, "query"),
  getUserPurchases,
);

/**
 * @route   GET /api/course-purchase/course/:courseId
 * @desc    Get course purchase details and pricing
 * @access  Protected (Students only)
 */
coursePurchaseRoutes.get(
  "/course/:courseId",
  authenticateToken,
  getCoursePurchaseDetails,
);

/**
 * @route   POST /api/course-purchase/payment-failure
 * @desc    Handle payment failure logging
 * @access  Protected (Students only)
 */
coursePurchaseRoutes.post(
  "/payment-failure",
  authenticateToken,
  validateSchema(coursePurchaseValidation.paymentFailure),
  handlePaymentFailure,
);

export default coursePurchaseRoutes;
