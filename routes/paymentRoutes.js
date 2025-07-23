import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
  getUserOrders,
  getUserPurchases
} from '../controller/paymentController.js';

const router = express.Router();

// Create order for checkout
router.post('/create-order', authenticateToken, createOrder);

// Verify payment
router.post('/verify', authenticateToken, verifyPayment);

// Razorpay webhook
router.post('/webhook', handleWebhook);

// Get payment status
router.get('/status/:paymentId', authenticateToken, getPaymentStatus);

// Get user orders
router.get('/orders', authenticateToken, getUserOrders);

// Get user purchases
router.get('/purchases', authenticateToken, getUserPurchases);

export default router;
