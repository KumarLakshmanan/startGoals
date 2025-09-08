import { Cart, Course, Project } from '../model/associations.js';
import { sendResponse } from '../utils/responseHelper.js';

/**
 * Add item to cart
 */
export const addToCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const { itemType, itemId, price } = req.body;

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

    // Check if item already in cart
    const existingCartItem = await Cart.findOne({
      where: {
        userId,
        itemType,
        itemId
      }
    });
    console.log("Existing cart item:", existingCartItem);

    if (existingCartItem) {
      return sendResponse(res, 409, false, 'Item already in cart', null);
    }

    // Add to cart
    const cartItem = await Cart.create({
      userId,
      itemType,
      itemId,
      price: price || item.price || 0
    });

    return sendResponse(res, 201, true, 'Item added to cart successfully', cartItem);

  } catch (error) {
    console.error('Add to cart error:', error);
    
    // Handle unique constraint violation
    if (error.name === 'SequelizeUniqueConstraintError') {
      return sendResponse(res, 409, false, 'Item already in cart', null);
    }
    
    return sendResponse(res, 500, false, 'Failed to add item to cart', error.message);
  }
};

/**
 * Remove item from cart
 */
export const removeFromCart = async (req, res) => {
  try {
    const { userId } = req.user;
    const { itemType, itemId } = req.body;

    const deletedCount = await Cart.destroy({
      where: {
        userId,
        itemType,
        itemId
      }
    });

    if (deletedCount === 0) {
      return sendResponse(res, 404, false, 'Item not found in cart', null);
    }

    return sendResponse(res, 200, true, 'Item removed from cart successfully', null);

  } catch (error) {
    console.error('Remove from cart error:', error);
    return sendResponse(res, 500, false, 'Failed to remove item from cart', error.message);
  }
};

/**
 * Get user's cart
 */
export const getCart = async (req, res) => {
  try {
    const { userId } = req.user;

    const cartItems = await Cart.findAll({
      where: { userId },
      include: [
        {
          model: Course,
          as: 'course',
          required: false,
          attributes: ['courseId', 'title', 'description', 'price', 'thumbnailUrl', 'durationMinutes']
        },
        {
          model: Project,
          as: 'project',
          required: false,
          attributes: ['projectId', 'title', 'description', 'price', 'coverImage']
        }
      ]
    });

    // Calculate total
    let totalAmount = 0;

    const cartWithDetails = cartItems.map(item => {
      totalAmount += item.price;
      return {
        id: item.id,
        itemType: item.itemType,
        itemId: item.itemId,
        price: item.price,
        item: item.course || item.project,
        createdAt: item.createdAt
      };
    });

    return sendResponse(res, 200, true, 'Cart retrieved successfully', {
      items: cartWithDetails,
      summary: {
        itemCount: cartItems.length,
        totalAmount,
        finalAmount: totalAmount
      }
    });

  } catch (error) {
    console.error('Get cart error:', error);
    return sendResponse(res, 500, false, 'Failed to get cart', error.message);
  }
};

/**
 * Clear user's cart
 */
export const clearCart = async (req, res) => {
  try {
    const { userId } = req.user;

    await Cart.destroy({
      where: { userId }
    });

    return sendResponse(res, 200, true, 'Cart cleared successfully', null);

  } catch (error) {
    console.error('Clear cart error:', error);
    return sendResponse(res, 500, false, 'Failed to clear cart', error.message);
  }
};

/**
 * Update cart item
 */
export const updateCartItem = async (req, res) => {
  try {
    const { userId } = req.user;
    const { itemType, itemId, price } = req.body;

    const cartItem = await Cart.findOne({
      where: {
        userId,
        itemType,
        itemId
      }
    });

    if (!cartItem) {
      return sendResponse(res, 404, false, 'Item not found in cart', null);
    }

    await cartItem.update({
      price: price !== undefined ? price : cartItem.price
    });

    return sendResponse(res, 200, true, 'Cart item updated successfully', cartItem);

  } catch (error) {
    console.error('Update cart item error:', error);
    return sendResponse(res, 500, false, 'Failed to update cart item', error.message);
  }
};
