import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Order, Cart, Wishlist, User, Course, Project, ProjectPurchase } from '../model/assosiation.js';
import Enrollment from '../model/enrollment.js';
import sequelize from '../config/db.js';
import { sendResponse } from '../utils/responseHelper.js';
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendServerError,
  sendConflict,
} from "../utils/responseHelper.js";

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Create Razorpay order for checkout
 */
export const createOrder = async (req, res) => {
  try {
    const { userId } = req.user;
    
    // Get cart items for the user
    const cartItems = await Cart.findAll({
      where: { userId },
      include: [
        {
          model: Course,
          as: 'course',
          required: false,
        },
        {
          model: Project,
          as: 'project',
          required: false,
        }
      ]
    });

    if (!cartItems || cartItems.length === 0) {
      return sendResponse(res, 400, false, 'Cart is empty', null);
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = [];

    for (const item of cartItems) {
      const discountedPrice = item.price - (item.discount || 0);
      totalAmount += discountedPrice;
      
      orderItems.push({
        itemType: item.itemType,
        itemId: item.itemId,
        price: item.price,
        discount: item.discount || 0,
        finalPrice: discountedPrice
      });
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: totalAmount * 100, // Amount in paise
      currency: 'INR',
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        itemCount: cartItems.length.toString()
      }
    });

    // Save order in database
    const order = await Order.create({
      userId,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      currency: 'INR',
      status: 'created',
      orderItems: JSON.stringify(orderItems)
    });

    return sendResponse(res, 200, true, 'Order created successfully', {
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      orderItems
    });

  } catch (error) {
    console.error('Create order error:', error);
    return sendResponse(res, 500, false, 'Failed to create order', error.message);
  }
};

/**
 * Verify payment and update order status
 */
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const { userId } = req.user;

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return sendResponse(res, 400, false, 'Invalid payment signature', null);
    }

    // Find and update order
    const order = await Order.findOne({
      where: {
        razorpayOrderId: razorpay_order_id,
        userId
      }
    });

    if (!order) {
      return sendResponse(res, 404, false, 'Order not found', null);
    }

    // Update order status
    await order.update({
      paymentId: razorpay_payment_id,
      status: 'completed',
      paidAt: new Date()
    });

    // Grant access to purchased items
    const orderItems = JSON.parse(order.orderItems);
    
    for (const item of orderItems) {
      if (item.itemType === 'course') {
        await Enrollment.findOrCreate({
          where: {
            userId,
            courseId: item.itemId
          },
          defaults: {
            userId,
            courseId: item.itemId,
            enrollmentDate: new Date(),
            amountPaid: item.finalPrice,
            paymentStatus: 'completed',
            completionStatus: 'not_started',
            progressPercentage: 0,
            isActive: true,
            enrollmentType: 'recorded', // default, should be updated based on course type
            paymentMethod: 'razorpay'
          }
        });
      } else if (item.itemType === 'project') {
        await ProjectPurchase.findOrCreate({
          where: {
            userId,
            projectId: item.itemId
          },
          defaults: {
            userId,
            projectId: item.itemId,
            purchaseDate: new Date(),
            amount: item.finalPrice
          }
        });
      }
    }

    // Clear cart after successful payment
    await Cart.destroy({
      where: { userId }
    });

    return sendResponse(res, 200, true, 'Payment verified successfully', {
      orderId: order.id,
      status: 'completed'
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    return sendResponse(res, 500, false, 'Failed to verify payment', error.message);
  }
};

/**
 * Razorpay webhook handler
 */
export const handleWebhook = async (req, res) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;

      // Update order status
      const order = await Order.findOne({
        where: { razorpayOrderId: orderId }
      });

      if (order && order.status !== 'completed') {
        await order.update({
          paymentId: payment.id,
          status: 'completed',
          paidAt: new Date()
        });

        // Grant access to purchased items (same logic as verifyPayment)
        const orderItems = JSON.parse(order.orderItems);
        
        for (const item of orderItems) {
          if (item.itemType === 'course') {
            await Enrollment.findOrCreate({
              where: {
                userId: order.userId,
                courseId: item.itemId
              },
              defaults: {
                userId: order.userId,
                courseId: item.itemId,
                enrollmentDate: new Date(),
                amountPaid: item.finalPrice,
                paymentStatus: 'completed',
                completionStatus: 'not_started',
                progressPercentage: 0,
                isActive: true,
                enrollmentType: 'recorded', // default, should be updated based on course type
                paymentMethod: 'razorpay'
              }
            });
          } else if (item.itemType === 'project') {
            await ProjectPurchase.findOrCreate({
              where: {
                userId: order.userId,
                projectId: item.itemId
              },
              defaults: {
                userId: order.userId,
                projectId: item.itemId,
                purchaseDate: new Date(),
                amount: item.finalPrice
              }
            });
          }
        }

        // Clear cart
        await Cart.destroy({
          where: { userId: order.userId }
        });
      }
    }

    res.status(200).json({ status: 'ok' });

  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Get payment status
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await razorpay.payments.fetch(paymentId);

    return sendResponse(res, 200, true, 'Payment status retrieved', {
      paymentId: payment.id,
      orderId: payment.order_id,
      status: payment.status,
      method: payment.method,
      amount: payment.amount / 100, // Convert from paise to rupees
      currency: payment.currency,
      createdAt: payment.created_at
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    return sendResponse(res, 500, false, 'Failed to get payment status', error.message);
  }
};

/**
 * Get user's orders
 */
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.user;

    const orders = await Order.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']]
    });

    return sendResponse(res, 200, true, 'Orders retrieved successfully', orders);

  } catch (error) {
    console.error('Get user orders error:', error);
    return sendResponse(res, 500, false, 'Failed to get orders', error.message);
  }
};

/**
 * Create order for course purchase specifically
 */
export const createCourseOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { courseId } = req.body;
    const userId = req.user?.userId;

    // Validate user authentication
    if (!userId) {
      await transaction.rollback();
      return sendError(res, 401, "Authentication required");
    }

    // Validate courseId is provided
    if (!courseId) {
      await transaction.rollback();
      return sendValidationError(res, "Course ID is required", {
        courseId: "Required field",
      });
    }

    // Validate UUID format
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        courseId,
      )
    ) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid course ID format", {
        courseId: "Must be a valid UUID",
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
      return sendNotFound(res, "Course not found or not available for purchase");
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
      return sendConflict(res, "course", courseId);
    }

    // Get user details
    const user = await User.findByPk(userId);
    if (!user) {
      await transaction.rollback();
      return sendNotFound(res, "User not found");
    }

    // Calculate final price (use salePrice if available, otherwise regular price)
    const finalPrice = course.salePrice || course.price;
    const amountInPaise = Math.round(finalPrice * 100); // Convert to paise

    if (amountInPaise <= 0) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid course price", {
        price: "Price must be greater than zero",
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
        orderType: 'course_purchase',
      },
    };

    const razorpayOrder = await razorpay.orders.create(orderOptions);

    // Create order record in database
    const order = await Order.create({
      userId,
      razorpayOrderId: razorpayOrder.id,
      totalAmount: finalPrice,
      currency: 'INR',
      status: 'created',
      receipt: orderOptions.receipt,
      orderItems: JSON.stringify([{
        itemType: 'course',
        itemId: courseId,
        price: course.price,
        salePrice: course.salePrice,
        finalPrice: finalPrice,
        title: course.title,
        type: course.type
      }]),
      notes: orderOptions.notes,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes expiry
    }, { transaction });

    await transaction.commit();

    // Return order details to frontend
    return sendSuccess(res, 200, "Order created successfully", {
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
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create course order error:", error);
    return sendServerError(res, error);
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

    // Validate user authentication
    if (!userId) {
      await transaction.rollback();
      return sendError(res, 401, "Authentication required");
    }

    // Validate required fields
    if (
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature ||
      !courseId
    ) {
      await transaction.rollback();
      return sendValidationError(
        res,
        "Missing required payment verification data",
        {
          missingFields: [
            !razorpay_order_id ? "razorpay_order_id" : null,
            !razorpay_payment_id ? "razorpay_payment_id" : null,
            !razorpay_signature ? "razorpay_signature" : null,
            !courseId ? "courseId" : null,
          ].filter(Boolean),
        },
      );
    }

    // Validate courseId UUID format
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        courseId,
      )
    ) {
      await transaction.rollback();
      return sendValidationError(
        res,
        `Invalid courseId format: ${courseId}. Must be a valid UUID.`,
        { courseId: "Must be a valid UUID" },
      );
    }

    // Verify signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      await transaction.rollback();
      return sendError(res, 400, "Payment verification failed - invalid signature");
    }

    // Fetch payment details from Razorpay
    const payment = await razorpay.payments.fetch(razorpay_payment_id);

    if (payment.status !== "captured" && payment.status !== "authorized") {
      await transaction.rollback();
      return sendError(res, 400, "Payment not successful");
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
      return sendNotFound(res, "Course not found");
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
      return sendConflict(res, "course", courseId);
    }

    // Update order status
    await Order.update({
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: 'paid',
      paymentDate: new Date(),
      paymentMethod: payment.method
    }, {
      where: {
        razorpayOrderId: razorpay_order_id,
        userId: userId
      },
      transaction
    });

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

    return sendSuccess(
      res,
      200,
      "Payment verified and enrollment completed successfully",
      {
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
    );
  } catch (error) {
    await transaction.rollback();
    console.error("Verify payment and enroll error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get user's purchased courses (enrollments)
 */
export const getUserPurchases = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { page = 1, limit = 10, status, type } = req.query;

    if (!userId) {
      return sendError(res, 401, "Authentication required");
    }

    // Validate page and limit parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return sendValidationError(res, "Page must be a positive integer", {
        page: "Must be a positive integer",
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return sendValidationError(
        res,
        "Limit must be a positive integer between 1 and 100",
        { limit: "Must be between 1 and 100" },
      );
    }

    // Validate status if provided
    if (
      status &&
      !["not_started", "in_progress", "completed", "on_hold"].includes(status)
    ) {
      return sendValidationError(
        res,
        "Invalid status value. Must be one of: not_started, in_progress, completed, on_hold",
        { status: "Invalid value" },
      );
    }

    // Validate type if provided
    if (type && !["live", "recorded", "hybrid"].includes(type)) {
      return sendValidationError(
        res,
        "Invalid type value. Must be one of: live, recorded, hybrid",
        { type: "Invalid value" },
      );
    }

    const offset = (pageNum - 1) * limitNum;

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
      limit: limitNum,
      offset: offset,
      order: [["enrollmentDate", "DESC"]],
    });

    const totalPages = Math.ceil(count / limitNum);

    return sendSuccess(res, 200, "User purchases retrieved successfully", {
      enrollments: enrollments.map(enrollment => ({
        enrollmentId: enrollment.enrollmentId,
        courseId: enrollment.courseId,
        enrollmentDate: enrollment.enrollmentDate,
        completionStatus: enrollment.completionStatus,
        progressPercentage: enrollment.progressPercentage,
        paymentStatus: enrollment.paymentStatus,
        amountPaid: enrollment.amountPaid,
        enrollmentType: enrollment.enrollmentType,
        course: enrollment.Course,
      })),
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: count,
        itemsPerPage: limitNum,
      },
    });
  } catch (error) {
    console.error("Get user purchases error:", error);
    return sendServerError(res, error);
  }
};
