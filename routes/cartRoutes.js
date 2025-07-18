import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  addToCart,
  removeFromCart,
  getCart,
  clearCart,
  updateCartItem
} from '../controller/cartController.js';

const router = express.Router();

// Add item to cart
router.post('/add', authenticateToken, addToCart);

// Remove item from cart
router.delete('/remove', authenticateToken, removeFromCart);

// Get user's cart
router.get('/', authenticateToken, getCart);

// Clear cart
router.delete('/clear', authenticateToken, clearCart);

// Update cart item
router.put('/update', authenticateToken, updateCartItem);

export default router;
