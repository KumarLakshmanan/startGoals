// Migration script to create all e-commerce tables for StartGoals
// This includes cart, wishlist, order, and discount tables

import sequelize from '../config/db.js';
import Cart from '../model/cart.js';
import Wishlist from '../model/wishlist.js';
import Order from '../model/order.js';
import DiscountCode from '../model/discountCode.js';
import DiscountUsage from '../model/discountUsage.js';

async function createEcommerceTables() {
  try {
    console.log('Starting migration for e-commerce tables...');
    
    // Create tables
    console.log('Creating cart table...');
    await Cart.sync({ force: true });
    console.log('Cart table created');
    
    console.log('Creating wishlist table...');
    await Wishlist.sync({ force: true });
    console.log('Wishlist table created');
    
    console.log('Creating order tables...');
    await Order.sync({ force: true });
    console.log('Order tables created');
    
    console.log('Creating discount tables...');
    await DiscountCode.sync({ force: true });
    await DiscountUsage.sync({ force: true });
    console.log('Discount tables created');
    
    console.log('E-commerce tables migration completed successfully');
  } catch (error) {
    console.error('Error creating e-commerce tables:', error);
    throw error;
  }
}

// Run the migration if this file is executed directly
if (process.argv[1] === import.meta.url) {
  try {
    createEcommerceTables();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

export default createEcommerceTables;
