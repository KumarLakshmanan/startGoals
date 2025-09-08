// Import all association setup functions
import {
  setupUserWalletTransactionAssociations,
} from './userAssociations.js';

import {
  setupCourseBannerAssociations,
  setupCourseTeacherAssociations,
  setupCourseChatAssociations,
} from './courseAssociations.js';

import {
  setupProjectBannerAssociations,
} from './projectAssociations.js';

import {
  setupDiscountCodeAssociations,
  setupOrderAssociations,
  setupOrderItemAssociations,
} from './paymentAssociations.js';

import {
  setupGoalSkillAssociations,
  setupSkillCategoryAssociations,
  setupRatingModerationAssociations,
  setupExamAssociations,
  setupLiveSessionAssociations,
  setupNewsAssociations,
  setupNotificationAssociations,
  setupOtpAssociations,
  setupSettingsAssociations,
} from './systemAssociations.js';

import {
  setupWishlistAssociations,
  setupCartAssociations,
  setupAddressAssociations,
} from './contentAssociations.js';

// Function to setup all associations
export const setupAllAssociations = () => {
  // User associations
  setupUserWalletTransactionAssociations();

  // Course associations
  setupCourseBannerAssociations();
  setupCourseTeacherAssociations();
  setupCourseChatAssociations();

  // Project associations
  setupProjectBannerAssociations();

  // Payment associations
  setupDiscountCodeAssociations();
  setupOrderAssociations();
  setupOrderItemAssociations();

  // System associations
  setupGoalSkillAssociations();
  setupSkillCategoryAssociations();
  setupRatingModerationAssociations();
  setupExamAssociations();
  setupLiveSessionAssociations();
  setupNewsAssociations();
  setupNotificationAssociations();
  setupOtpAssociations();
  setupSettingsAssociations();

  // Content associations
  setupWishlistAssociations();
  setupCartAssociations();
  setupAddressAssociations();

  console.log('All database associations have been set up successfully!');
};