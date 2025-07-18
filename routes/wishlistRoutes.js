import express from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import {
  addToWishlist,
  removeFromWishlist,
  getWishlist,
  clearWishlist,
  checkWishlistStatus,
  moveToCart
} from '../controller/wishlistController.js';

const router = express.Router();

// Add item to wishlist
router.post('/add', authenticateToken, addToWishlist);

// Remove item from wishlist
router.delete('/remove', authenticateToken, removeFromWishlist);

// Get user's wishlist
router.get('/', authenticateToken, getWishlist);

// Clear wishlist
router.delete('/clear', authenticateToken, clearWishlist);

// Check if item is in wishlist
router.get('/status/:itemType/:itemId', authenticateToken, checkWishlistStatus);

// Move item from wishlist to cart
router.post('/move-to-cart', authenticateToken, moveToCart);

export default router;
