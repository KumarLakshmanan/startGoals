import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Order, Cart, Wishlist, User, Course, Project, ProjectPurchase } from '../model/assosiation.js';
import DiscountCode from '../model/discountCode.js';
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
 * Supports both cart-based checkout and direct purchase of courses or projects
 */
export const createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { userId } = req.user;
    const { courseId, projectId, discountCode } = req.body;
    
    let orderItems = [];
    let totalAmount = 0;
    let discountApplied = null;
    
    // Option 1: Direct course/project purchase
    if (courseId || projectId) {
      // For direct course purchase
      if (courseId) {
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

        // Calculate price (use salePrice if available, otherwise regular price)
        let finalPrice = course.salePrice || course.price;

        // Add to order items
        orderItems.push({
          itemType: 'course',
          itemId: courseId,
          price: course.price,
          salePrice: course.salePrice,
          finalPrice,
          title: course.title,
          type: course.type
        });

        totalAmount += finalPrice;
      } 
      // For direct project purchase
      else if (projectId) {
        // Check if project exists and is published
        const project = await Project.findOne({
          where: {
            projectId: projectId,
            status: "published",
          },
        });

        if (!project) {
          await transaction.rollback();
          return sendNotFound(res, "Project not found or not available for purchase");
        }

        // Check if user already purchased
        const existingPurchase = await ProjectPurchase.findOne({
          where: {
            userId: userId,
            projectId: projectId,
          },
        });

        if (existingPurchase) {
          await transaction.rollback();
          return sendConflict(res, "project", projectId);
        }

        // Add to order items
        orderItems.push({
          itemType: 'project',
          itemId: projectId,
          price: project.price,
          finalPrice: project.price,
          title: project.title,
        });

        totalAmount += project.price;
      }
    } 
    // Option 2: Cart checkout
    else {
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
        ],
        transaction
      });

      if (!cartItems || cartItems.length === 0) {
        await transaction.rollback();
        return sendResponse(res, 400, false, 'Cart is empty', null);
      }

      // Calculate total amount and prepare order items
      for (const item of cartItems) {
        const discountedPrice = item.price - (item.discount || 0);
        totalAmount += discountedPrice;
        
        orderItems.push({
          itemType: item.itemType,
          itemId: item.itemId,
          price: item.price,
          discount: item.discount || 0,
          finalPrice: discountedPrice,
          title: item.itemType === 'course' ? item.course?.title : item.project?.title,
          type: item.itemType === 'course' ? item.course?.type : null
        });
      }
    }

    // Apply discount code if provided
    if (discountCode) {
      // Find valid discount code
      const discount = await DiscountCode.findOne({
        where: {
          code: discountCode.toUpperCase(),
          isActive: true,
          validFrom: { [Op.lte]: new Date() },
          validUntil: { [Op.gte]: new Date() },
          [Op.or]: [
            { usageLimit: null },
            { currentUsage: { [Op.lt]: sequelize.col('usageLimit') } },
          ],
        },
        transaction
      });

      if (!discount) {
        await transaction.rollback();
        return sendValidationError(res, "Invalid or expired discount code");
      }

      // Check if user has already used this code
      if (discount.usageLimitPerUser > 0) {
        // Implement user-specific discount usage check
        // This would require a discount usage tracking table
      }

      // Check applicable types
      const applicableTypes = discount.applicableTypes ? JSON.parse(discount.applicableTypes) : ['all'];
      if (!applicableTypes.includes('all')) {
        const itemTypes = orderItems.map(item => item.itemType);
        const isApplicable = itemTypes.some(type => applicableTypes.includes(type));
        
        if (!isApplicable) {
          await transaction.rollback();
          return sendValidationError(res, `Discount code not applicable for ${itemTypes.join(', ')}`);
        }
      }

      // Calculate discount amount
      let discountAmount = 0;

      if (discount.discountType === 'percentage') {
        discountAmount = totalAmount * (discount.discountValue / 100);
        
        // Apply max discount cap if set
        if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
          discountAmount = discount.maxDiscountAmount;
        }
      } else { // fixed amount
        discountAmount = Math.min(discount.discountValue, totalAmount);
      }

      // Check minimum purchase requirement
      if (discount.minimumPurchaseAmount && totalAmount < discount.minimumPurchaseAmount) {
        await transaction.rollback();
        return sendValidationError(res, `Minimum purchase amount of ₹${discount.minimumPurchaseAmount} required for this discount code`);
      }

      // Apply discount
      totalAmount -= discountAmount;
      discountApplied = {
        code: discount.code,
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        discountAmount,
      };
    }

    // Minimum amount check
    if (totalAmount <= 0) {
      await transaction.rollback();
      return sendValidationError(res, "Order total must be greater than zero");
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: Math.round(totalAmount * 100), // Amount in paise, rounded to ensure integer
      currency: 'INR',
      receipt: `order_${userId}_${Date.now()}`,
      notes: {
        userId: userId.toString(),
        itemCount: orderItems.length.toString(),
        orderType: courseId ? 'direct_course' : projectId ? 'direct_project' : 'cart',
        discountCode: discountCode || ''
      }
    });

    // Save order in database
    const order = await Order.create({
      userId,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      currency: 'INR',
      status: 'created',
      orderItems: JSON.stringify(orderItems),
      discountCode: discountCode || null,
      discountAmount: discountApplied ? discountApplied.discountAmount : null,
      originalAmount: discountApplied ? totalAmount + discountApplied.discountAmount : totalAmount
    }, { transaction });

    // If discount was applied, update usage count
    if (discountApplied && discountCode) {
      await DiscountCode.increment('currentUsage', { 
        where: { code: discountCode.toUpperCase() },
        transaction 
      });
    }

    await transaction.commit();

    return sendResponse(res, 200, true, 'Order created successfully', {
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amount: totalAmount,
      currency: 'INR',
      key: process.env.RAZORPAY_KEY_ID,
      orderItems,
      discount: discountApplied
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Create order error:', error);
    return sendResponse(res, 500, false, 'Failed to create order', error.message);
  }
};

/**
 * Verify payment and update order status
 */
export const verifyPayment = async (req, res) => {
  const transaction = await sequelize.transaction();

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
      await transaction.rollback();
      return sendResponse(res, 400, false, 'Invalid payment signature', null);
    }

    // Find and update order
    const order = await Order.findOne({
      where: {
        razorpayOrderId: razorpay_order_id,
        userId
      },
      transaction
    });

    if (!order) {
      await transaction.rollback();
      return sendResponse(res, 404, false, 'Order not found', null);
    }

    // Update order status
    await order.update({
      paymentId: razorpay_payment_id,
      status: 'completed',
      paidAt: new Date()
    }, { transaction });

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
            enrollmentType: item.type || 'recorded',
            paymentMethod: 'razorpay'
          },
          transaction
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
            amount: item.finalPrice,
            paymentStatus: 'completed'
          },
          transaction
        });
      }
    }

    // Clear cart after successful payment if it was a cart checkout
    if (!req.body.courseId && !req.body.projectId) {
      await Cart.destroy({
        where: { userId },
        transaction
      });
    }

    await transaction.commit();

    return sendResponse(res, 200, true, 'Payment verified successfully', {
      orderId: order.id,
      status: 'completed'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Verify payment error:', error);
    return sendResponse(res, 500, false, 'Failed to verify payment', error.message);
  }
};

/**
 * Razorpay webhook handler
 */
export const handleWebhook = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const webhookSignature = req.headers['x-razorpay-signature'];
    const webhookBody = JSON.stringify(req.body);

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(webhookBody)
      .digest('hex');

    if (webhookSignature !== expectedSignature) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;

    if (event === 'payment.captured') {
      const payment = payload.payment.entity;
      const orderId = payment.order_id;

      // Update order status
      const order = await Order.findOne({
        where: { razorpayOrderId: orderId },
        transaction
      });

      if (order && order.status !== 'completed') {
        await order.update({
          paymentId: payment.id,
          status: 'completed',
          paidAt: new Date()
        }, { transaction });

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
                enrollmentType: item.type || 'recorded',
                paymentMethod: 'razorpay'
              },
              transaction
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
                amount: item.finalPrice,
                paymentStatus: 'completed'
              },
              transaction
            });
          }
        }

        // Clear cart
        await Cart.destroy({
          where: { userId: order.userId },
          transaction
        });
      }
    }

    await transaction.commit();
    res.status(200).json({ status: 'ok' });

  } catch (error) {
    await transaction.rollback();
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

    // Validate page and limit parameters    const pageNum = parseInt(page);
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

    const offset = (pageNum - 1) * limitNum;
    
    // Build where conditions
    const whereConditions = { userId };
    
    if (status) {
      whereConditions.status = status;
    }

    // Get orders with pagination
    const { count, rows: orders } = await Order.findAndCountAll({
      where: whereConditions,
      limit: limitNum,
      offset,
      order: [['createdAt', 'DESC']]
    });
    
    // Format order items
    const formattedOrders = await Promise.all(orders.map(async (order) => {
      const orderItems = JSON.parse(order.orderItems);
      
      // Fetch item details
      const itemsWithDetails = await Promise.all(orderItems.map(async (item) => {
        if (item.itemType === 'course') {
          const course = await Course.findByPk(item.itemId, {
            attributes: ['courseId', 'title', 'thumbnailUrl', 'type']
          });
          
          return {
            ...item,
            details: course || { title: 'Course not found' }
          };
        } else if (item.itemType === 'project') {
          const project = await Project.findByPk(item.itemId, {
            attributes: ['projectId', 'title', 'coverImage']
          });
          
          return {
            ...item,
            details: project || { title: 'Project not found' }
          };
        }
        
        return item;
      }));
      
      return {
        orderId: order.id,
        razorpayOrderId: order.razorpayOrderId,
        amount: order.amount,
        status: order.status,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        items: itemsWithDetails,
        discountCode: order.discountCode,
        discountAmount: order.discountAmount,
        originalAmount: order.originalAmount
      };
    }));
    
    const totalPages = Math.ceil(count / limitNum);

    return sendResponse(res, 200, true, 'Orders retrieved successfully', {
      orders: formattedOrders,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: count,
        itemsPerPage: limitNum,
      },
    });

  } catch (error) {
    console.error('Get user orders error:', error);
    return sendResponse(res, 500, false, 'Failed to get orders', error.message);
  }
};
