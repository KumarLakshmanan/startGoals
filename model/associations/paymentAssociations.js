import DiscountCode from "../discountCode.js";
import DiscountUsage from "../discountUsage.js";
import User from "../user.js";
import Course from "../course.js";
import Project from "../project.js";
import Enrollment from "../enrollment.js";
import ProjectPurchase from "../projectPurchase.js";
import Wallet from "../wallet.js";
import WalletTransaction from "../walletTransaction.js";
import Order from "../order.js";
import OrderItem from "../orderItem.js";
import Address from "../address.js";

// Discount Code associations
export const setupDiscountCodeAssociations = () => {
  User.hasMany(DiscountCode, {
    foreignKey: "createdBy",
    as: "createdDiscountCodes",
  });

  DiscountCode.belongsTo(User, {
    foreignKey: "createdBy",
    as: "creator",
  });

  DiscountCode.hasMany(DiscountUsage, {
    foreignKey: "discountId",
    as: "usages",
    onDelete: "CASCADE",
  });

  DiscountUsage.belongsTo(DiscountCode, {
    foreignKey: "discountId",
    as: "discountCode",
  });

  User.hasMany(DiscountUsage, {
    foreignKey: "userId",
    as: "discountUsages",
    onDelete: "CASCADE",
  });

  DiscountUsage.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });

  // DiscountUsage can reference Course (for course discounts)
  DiscountUsage.belongsTo(Course, {
    foreignKey: "courseId",
    as: "course",
  });

  Course.hasMany(DiscountUsage, {
    foreignKey: "courseId",
    as: "discountUsages",
  });

  // DiscountUsage can reference Project (for project discounts)
  DiscountUsage.belongsTo(Project, {
    foreignKey: "projectId",
    as: "project",
  });

  Project.hasMany(DiscountUsage, {
    foreignKey: "projectId",
    as: "discountUsages",
  });

  // DiscountUsage can reference Enrollment (for course enrollment discounts)
  DiscountUsage.belongsTo(Enrollment, {
    foreignKey: "enrollmentId",
    as: "enrollment",
  });

  Enrollment.hasOne(DiscountUsage, {
    foreignKey: "enrollmentId",
    as: "discountUsage",
  });

  // ProjectPurchase belongs to DiscountCode (optional)
  ProjectPurchase.belongsTo(DiscountCode, {
    foreignKey: "discount_id",
    as: "appliedDiscountCode",
  });

  DiscountCode.hasMany(ProjectPurchase, {
    foreignKey: "discount_id",
    as: "projectPurchases",
  });
};

// Order associations
export const setupOrderAssociations = () => {
  Order.belongsTo(Address, {
    foreignKey: "addressId",
    as: "deliveryAddress",
  });

  Address.hasMany(Order, {
    foreignKey: "addressId",
    as: "orders",
  });

  Order.hasMany(OrderItem, {
    foreignKey: "orderId",
    as: "items",
    onDelete: "CASCADE",
  });

  OrderItem.belongsTo(Order, {
    foreignKey: "orderId",
    as: "order",
  });
};

// OrderItem associations
export const setupOrderItemAssociations = () => {
 // OrderItem associations are already handled in setupOrderAssociations
 // This function is here for consistency with the modular structure
};
