import Razorpay from 'razorpay';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { Order, Cart, User, Course, Project, ProjectPurchase, OrderItem } from '../model/associations.js';
import DiscountCode from '../model/discountCode.js';
import DiscountUsage from '../model/discountUsage.js';
import Enrollment from '../model/enrollment.js';
import Address from '../model/address.js';
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
      include: [
        {
          model: OrderItem,
          as: 'items',
        }
      ],
      transaction
    });

    if (!order) {
      await transaction.rollback();
      return sendResponse(res, 404, false, 'Order not found', null);
    }

    // Update order status
    await order.update({
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      status: 'paid',
      paymentDate: new Date()
    }, { transaction });


    for (const item of order.items) {
      try {
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
      } catch (itemError) {
        console.error(`Error processing order item:`, item, itemError);
        if (itemError && itemError.stack) {
          console.error('Stack trace:', itemError.stack);
        }
        await transaction.rollback();
        return sendResponse(
          res,
          500,
          false,
          `Failed to process order item: ${item.itemType} (${item.itemId}) - ${itemError.message}`,
          itemError
        );
      }
    }

    // Clear cart after successful payment if it was a cart checkout
    if (!req.body.courseId && !req.body.projectId) {
      try {
        await Cart.destroy({
          where: { userId },
          transaction
        });
      } catch (cartError) {
        console.error('Error clearing cart:', cartError);
        await transaction.rollback();
        return sendResponse(res, 500, false, 'Failed to clear cart after payment', cartError.message);
      }
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

      if (order && order.status !== 'paid') {
        await order.update({
          paymentId: payment.id,
          status: 'paid',
          paymentDate: new Date()
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

    const payment = await razorpay.orders.fetch(paymentId);

    return sendResponse(res, 200, true, 'Payment status retrieved', payment);

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
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: OrderItem,
          as: 'items',
        }
      ]
    });

    return sendResponse(res, 200, true, 'Orders retrieved successfully', orders);

  } catch (error) {
    console.error('Get user orders error:', error);
    return sendResponse(res, 500, false, 'Failed to get orders', error.message);
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
    const { page = 1, limit = 10, status, type: _type } = req.query;

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
        paymentDate: order.paymentDate,
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

export const createSimpleOrder = async (req, res) => {
  try {
    const { userId } = req.user;
    const { discountCode, addressId } = req.body;

    console.log('Creating simple order for user:', userId);

    // Validate addressId if provided
    if (addressId) {
      const address = await Address.default.findOne({
        where: { addressId, userId }
      });

      if (!address) {
        return sendResponse(res, 400, false, 'Invalid address ID', null);
      }
    }

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

    console.log('Found cart items:', cartItems.length);

    if (!cartItems || cartItems.length === 0) {
      return sendResponse(res, 400, false, 'Cart is empty', null);
    }

    // Calculate total amount
    let totalAmount = 0;
    const orderItems = [];

    for (const item of cartItems) {
      const itemPrice = parseFloat(item.price || 0);
      const itemDiscount = parseFloat(item.discountAmount || 0);
      const finalPrice = itemPrice - itemDiscount;

      totalAmount += finalPrice;

      orderItems.push({
        itemType: item.itemType,
        itemId: item.itemId,
        price: itemPrice,
        discount: itemDiscount,
        finalPrice: finalPrice,
        title: item.course?.title || item.project?.title || 'Unknown Item'
      });
    }

    console.log('Total amount:', totalAmount);
    console.log('Order items:', orderItems);

    // Apply discount if provided
    let discountAmount = 0;
    if (discountCode) {
      try {
        const discount = await DiscountCode.findOne({
          where: {
            code: discountCode.toUpperCase(),
            isActive: true,
            validFrom: { [Op.lte]: new Date() },
            validUntil: { [Op.gte]: new Date() },
          }
        });

        if (discount) {
          if (
            discount.maxUses &&
            discount.currentUses >= discount.maxUses
          ) {
            return sendError(res, 400, "Discount code usage limit exceeded");
          }

          if (discount.maxUsesPerUser) {
            const userUsages = await DiscountUsage.count({
              where: { userId, discountId: discount.id },
            });
            if (userUsages >= discount.maxUsesPerUser) {
              return sendError(res, 400, "You have reached the usage limit for this discount code");
            }
          }

          console.log('Found valid discount:', discount.code, discount.discountType, discount.discountValue);

          if (discount.discountType === 'percentage') {
            discountAmount = (totalAmount * discount.discountValue) / 100;

            // Apply maximum discount limit if set
            if (discount.maxDiscountAmount && discountAmount > discount.maxDiscountAmount) {
              discountAmount = discount.maxDiscountAmount;
            }
          } else if (discount.discountType === 'fixed') {
            discountAmount = Math.min(parseFloat(discount.discountValue), totalAmount);
          }

          // Check minimum purchase requirement
          if (discount.minimumPurchaseAmount && totalAmount < discount.minimumPurchaseAmount) {
            console.log('Minimum purchase amount not met:', discount.minimumPurchaseAmount);
            discountAmount = 0;
          }

          console.log('Discount amount calculated:', discountAmount);
        } else {
          console.log('No valid discount found for code:', discountCode);
        }
      } catch (discountError) {
        console.log('Discount error (ignored):', discountError.message);
      }
    }

    const finalAmount = Math.max(1, totalAmount - discountAmount); // Minimum 1 rupee for Razorpay

    console.log('Final amount after discount:', finalAmount);

    // Create real Razorpay order
    const razorpayOrderOptions = {
      amount: Math.round(finalAmount * 100), // Amount in paise
      currency: 'INR',
      receipt: `order_${Date.now()}_${userId.substring(0, 8)}`,
      notes: {
        userId: userId,
        itemCount: orderItems.length.toString(),
        discountCode: discountCode || '',
        totalAmount: totalAmount.toString(),
        discountAmount: discountAmount.toString()
      }
    };

    console.log('Creating Razorpay order with options:', razorpayOrderOptions);

    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create(razorpayOrderOptions);
      console.log('Razorpay order created successfully:', razorpayOrder.id);
    } catch (razorpayError) {
      console.error('Razorpay order creation failed:', razorpayError);
      return sendResponse(res, 500, false, 'Failed to create Razorpay order', razorpayError.message);
    }

    // Create order in database
    const order = await Order.create({
      userId: userId,
      addressId: addressId || null,
      razorpayOrderId: razorpayOrder.id,
      totalAmount: totalAmount,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      status: 'pending',
      paymentMethod: 'razorpay',
      discountCode: discountCode || null,
      currency: 'INR',
      receipt: razorpayOrder.receipt
    });

    console.log('Order created in database:', order.orderId);

    // Save each order item in OrderItem table
    for (const item of orderItems) {
      await OrderItem.create({
        orderId: order.orderId,
        itemType: item.itemType,
        itemId: item.itemId,
        quantity: 1,
        price: item.price,
        discountApplied: item.discount || 0,
        finalPrice: item.finalPrice,
      });
    }
    console.log(razorpayOrder);
    console.log(order);
    // Prepare response
    const response = {
      orderId: order.orderId,
      razorpayOrderId: razorpayOrder.id,
      amount: finalAmount,
      currency: 'INR',
      totalAmount: totalAmount,
      discountAmount: discountAmount,
      finalAmount: finalAmount,
      items: orderItems,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
      paymentUrl: `${req.protocol}://${req.get('host')}/api/web/payment?orderId=${razorpayOrder.id}`,
      webhookUrl: `${req.protocol}://${req.get('host')}/api/payments/webhook`,
      message: "Real Razorpay order created successfully. Ready for payment."
    };

    return sendResponse(res, 201, true, 'Order created successfully', response);

  } catch (error) {
    console.error('Simple order creation error:', error);
    return sendResponse(res, 500, false, 'Failed to create order', error.message);
  }
};