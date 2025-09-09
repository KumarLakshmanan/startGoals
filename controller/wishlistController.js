import { Wishlist, Course, Project } from '../model/associations.js';
import { sendResponse } from '../utils/responseHelper.js';

/**
 * Add item to wishlist
 */
export const addToWishlist = async (req, res) => {
  try {
    const { userId } = req.user;
    const { itemType, itemId } = req.body;

    // Validate itemType
    if (!['course', 'project'].includes(itemType)) {
      return sendResponse(res, 400, false, 'Invalid item type', null);
    }

    // Check if item exists
    let item;
    switch (itemType) {
      case 'course':
        item = await Course.findByPk(itemId);
        break;
      case 'project':
        item = await Project.findByPk(itemId);
        break;
    }

    if (!item) {
      return sendResponse(res, 404, false, 'Item not found', null);
    }

    // Check if item already in wishlist
    const existingWishlistItem = await Wishlist.findOne({
      where: {
        userId,
        itemType,
        itemId
      }
    });

    if (existingWishlistItem) {
      return sendResponse(res, 400, false, 'Item already in wishlist', null);
    }

    // Add to wishlist
    const wishlistItem = await Wishlist.create({
      userId,
      itemType,
      itemId
    });

    return sendResponse(res, 201, true, 'Item added to wishlist successfully', wishlistItem);

  } catch (error) {
    console.error('Add to wishlist error:', error);
    
    // Handle unique constraint violation
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendResponse(res, 409, false, 'Item already in wishlist', null);
    }
    
    return sendResponse(res, 500, false, 'Failed to add item to wishlist', error.message);
  }
};

/**
 * Remove item from wishlist
 */
export const removeFromWishlist = async (req, res) => {
  try {
    const { userId } = req.user;
    const { itemType, itemId } = req.body;

    const deletedCount = await Wishlist.destroy({
      where: {
        userId,
        itemType,
        itemId
      }
    });

    if (deletedCount === 0) {
      return sendResponse(res, 404, false, 'Item not found in wishlist', null);
    }

    return sendResponse(res, 200, true, 'Item removed from wishlist successfully', null);

  } catch (error) {
    console.error('Remove from wishlist error:', error);
    return sendResponse(res, 500, false, 'Failed to remove item from wishlist', error.message);
  }
};

/**
 * Get user's wishlist
 */
export const getWishlist = async (req, res) => {
  try {
    const { userId } = req.user;

    const wishlistItems = await Wishlist.findAll({
      where: { userId },
      include: [
        {
          model: Course,
          as: 'course',
          required: false,
          attributes: ['courseId', 'title', 'description', 'price', 'thumbnailUrl', 'durationMinutes', 'averageRating']
        },
        {
          model: Project,
          as: 'project',
          required: false,
          attributes: ['projectId', 'title', 'description', 'price', 'coverImage', 'averageRating']
        }
      ]
    });

    const wishlistWithDetails = wishlistItems.map(item => ({
      id: item.id,
      itemType: item.itemType,
      itemId: item.itemId,
      item: item.course || item.project,
      createdAt: item.createdAt
    }));

    return sendResponse(res, 200, true, 'Wishlist retrieved successfully', {
      items: wishlistWithDetails,
      count: wishlistItems.length
    });

  } catch (error) {
    console.error('Get wishlist error:', error);
    return sendResponse(res, 500, false, 'Failed to get wishlist', error.message);
  }
};

/**
 * Clear user's wishlist
 */
export const clearWishlist = async (req, res) => {
  try {
    const { userId } = req.user;

    await Wishlist.destroy({
      where: { userId }
    });

    return sendResponse(res, 200, true, 'Wishlist cleared successfully', null);

  } catch (error) {
    console.error('Clear wishlist error:', error);
    return sendResponse(res, 500, false, 'Failed to clear wishlist', error.message);
  }
};

/**
 * Check if item is in wishlist
 */
export const checkWishlistStatus = async (req, res) => {
  try {
    const { userId } = req.user;
    const { itemType, itemId } = req.params;

    const wishlistItem = await Wishlist.findOne({
      where: {
        userId,
        itemType,
        itemId
      }
    });

    return sendResponse(res, 200, true, 'Wishlist status checked', {
      inWishlist: !!wishlistItem
    });

  } catch (error) {
    console.error('Check wishlist status error:', error);
    return sendResponse(res, 500, false, 'Failed to check wishlist status', error.message);
  }
};

/**
 * Move item from wishlist to cart
 */
export const moveToCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const { itemType, itemId, price, discount = 0 } = req.body;

    // Check if item is in wishlist
    const wishlistItem = await Wishlist.findOne({
      where: {
        userId,
        itemType,
        itemId
      }
    });

    if (!wishlistItem) {
      return sendResponse(res, 404, false, 'Item not found in wishlist', null);
    }

    // Check if item already in cart
    const { Cart } = await import('../model/associations.js');
    const existingCartItem = await Cart.findOne({
      where: {
        userId,
        itemType,
        itemId
      }
    });

    if (existingCartItem) {
      return sendResponse(res, 400, false, 'Item already in cart', null);
    }

    // Get item details for price if not provided
    let itemPrice = price;
    if (!itemPrice) {
      let item;
      switch (itemType) {
        case 'course':
          item = await Course.findByPk(itemId);
          break;
        case 'project':
          item = await Project.findByPk(itemId);
          break;
      }
      itemPrice = item ? item.price : 0;
    }

    // Add to cart
    const cartItem = await Cart.create({
      userId,
      itemType,
      itemId,
      price: itemPrice,
      discount
    });

    // Remove from wishlist
    await wishlistItem.destroy();

    return sendResponse(res, 200, true, 'Item moved to cart successfully', cartItem);

  } catch (error) {
    console.error('Move to cart error:', error);
    return sendResponse(res, 500, false, 'Failed to move item to cart', error.message);
  }
};
