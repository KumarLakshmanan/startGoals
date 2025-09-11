// Import all association setup functions
import {
  setupUserWalletTransactionAssociations,
} from './userAssociations.js';

import {
  setupNewsAssociations,
} from './systemAssociations.js';






// Function to setup all associations
export const setupAllAssociations = () => {
  // User associations
  setupUserWalletTransactionAssociations();

  // System associations
  setupNewsAssociations();

  // Note: Most associations are defined directly in their respective files
  // and are set up when the files are imported. The imports in associations.js
  // ensure all association files are loaded and associations are established.

  console.log('All database associations have been set up successfully!');
};