// ===================== USER ASSOCIATIONS =====================

// User to Language associations
import User from "../user.js";
import Language from "../language.js";
import UserLanguages from "../userLanguages.js";
import UserGoals from "../userGoals.js";
import UserSkills from "../userSkills.js";
import Goal from "../goal.js";
import Skill from "../skill.js";
import Exam from "../exam.js";
import UserExams from "../userExams.js";
import Wishlist from "../wishlist.js";
import Cart from "../cart.js";
import Order from "../order.js";
import Address from "../address.js";
import CourseRating from "../courseRating.js";
import InstructorRating from "../instructorRating.js";
import ProjectRating from "../projectRating.js";
import RatingHelpful from "../ratingHelpful.js";
import SearchAnalytics from "../searchAnalytics.js";
import Wallet from "../wallet.js";
import WalletTransaction from "../walletTransaction.js";
import RedeemCode from "../redeemCode.js";
import CourseChat from "../courseChat.js";
import ProjectFile from "../projectFile.js";
import ProjectPurchase from "../projectPurchase.js";
import ProjectInstructor from "../projectInstructor.js";
import CourseInstructor from "../courseInstructor.js";
import DiscountCode from "../discountCode.js";
import DiscountUsage from "../discountUsage.js";

// User to Language many-to-many
User.belongsToMany(Language, {
  through: UserLanguages,
  foreignKey: "user_id",
  otherKey: "language_id",
  onDelete: "CASCADE",
});

Language.belongsToMany(User, {
  through: UserLanguages,
  foreignKey: "language_id",
  otherKey: "user_id",
  onDelete: "CASCADE",
});

// User to Goal many-to-many
User.belongsToMany(Goal, {
  through: UserGoals,
  foreignKey: "user_id",
  otherKey: "goal_id",
  onDelete: "CASCADE",
});

Goal.belongsToMany(User, {
  through: UserGoals,
  foreignKey: "goal_id",
  otherKey: "user_id",
  onDelete: "CASCADE",
});

// User to Skill many-to-many
User.belongsToMany(Skill, {
  through: UserSkills,
  foreignKey: "user_id",
  otherKey: "skill_id",
  onDelete: "CASCADE",
});

Skill.belongsToMany(User, {
  through: UserSkills,
  foreignKey: "skill_id",
  otherKey: "user_id",
  onDelete: "CASCADE",
});

// User to Exam many-to-many
User.belongsToMany(Exam, {
  through: UserExams,
  foreignKey: "userId",
  otherKey: "examId",
  as: "exams",
});

Exam.belongsToMany(User, {
  through: UserExams,
  foreignKey: "examId",
  otherKey: "userId",
  as: "users",
});

// User to Wishlist
User.hasMany(Wishlist, {
  foreignKey: "userId",
  as: "wishlists",
  onDelete: "CASCADE",
});

Wishlist.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User to Cart
User.hasMany(Cart, {
  foreignKey: "userId",
  as: "cartItems",
  onDelete: "CASCADE",
});

Cart.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User to Order
User.hasMany(Order, {
  foreignKey: "userId",
  as: "orders",
  onDelete: "CASCADE",
});

Order.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User to Address
User.hasMany(Address, {
  foreignKey: "userId",
  as: "addresses",
  onDelete: "CASCADE",
});

Address.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User to CourseRating
User.hasMany(CourseRating, {
  foreignKey: "userId",
  as: "courseRatings",
});

User.hasMany(CourseRating, {
  foreignKey: "moderatedBy",
  as: "moderatedCourseRatings",
});

CourseRating.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

CourseRating.belongsTo(User, {
  foreignKey: "moderatedBy",
  as: "moderator",
});

// User to InstructorRating
User.hasMany(InstructorRating, {
  foreignKey: "instructorId",
  as: "receivedRatings",
  onDelete: "CASCADE",
});

User.hasMany(InstructorRating, {
  foreignKey: "user_id",
  as: "givenInstructorRatings",
  onDelete: "CASCADE",
});

User.hasMany(InstructorRating, {
  foreignKey: "moderatedBy",
  as: "moderatedInstructorRatings",
});

InstructorRating.belongsTo(User, {
  foreignKey: "instructorId",
  as: "instructor",
});

InstructorRating.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

InstructorRating.belongsTo(User, {
  foreignKey: "moderatedBy",
  as: "moderator",
});

// User to ProjectRating
User.hasMany(ProjectRating, {
  foreignKey: "user_id",
  as: "projectRatings",
  onDelete: "CASCADE",
});

User.hasMany(ProjectRating, {
  foreignKey: "moderatedBy",
  as: "moderatedProjectRatings",
});

ProjectRating.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

ProjectRating.belongsTo(User, {
  foreignKey: "moderatedBy",
  as: "moderator",
});

// User to RatingHelpful
User.hasMany(RatingHelpful, {
  foreignKey: "userId",
  as: "helpfulVotes",
  onDelete: "CASCADE",
});

RatingHelpful.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User to SearchAnalytics
User.hasMany(SearchAnalytics, {
  foreignKey: "user_id",
  as: "searchHistory",
});

SearchAnalytics.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  onDelete: "SET NULL",
});


// User to Wallet
User.hasOne(Wallet, {
  foreignKey: "userId",
  as: "wallet",
  onDelete: "CASCADE",
});

Wallet.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User to WalletTransaction
Wallet.hasMany(WalletTransaction, {
  foreignKey: "walletId",
  as: "transactions",
  onDelete: "CASCADE",
});

WalletTransaction.belongsTo(Wallet, {
  foreignKey: "walletId",
  as: "wallet",
});

WalletTransaction.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User to RedeemCode
User.hasMany(RedeemCode, {
  foreignKey: "createdBy",
  as: "createdRedeemCodes",
  onDelete: "SET NULL",
});

RedeemCode.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// User to CourseChat
User.hasMany(CourseChat, {
  foreignKey: "senderId",
  as: "sentMessages",
  onDelete: "CASCADE",
});

CourseChat.belongsTo(User, {
  foreignKey: "senderId",
  as: "sender",
});

// User to ProjectFile
User.hasMany(ProjectFile, {
  foreignKey: "uploadedBy",
  as: "uploadedProjectFiles",
});

ProjectFile.belongsTo(User, {
  foreignKey: "uploadedBy",
  as: "uploader",
});

// User to ProjectPurchase
User.hasMany(ProjectPurchase, {
  foreignKey: "user_id",
  as: "projectPurchases",
  onDelete: "CASCADE",
});

ProjectPurchase.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// User to ProjectInstructor
User.hasMany(ProjectInstructor, {
  foreignKey: "instructorId",
  as: "projectInstructions",
  onDelete: "CASCADE",
});

User.hasMany(ProjectInstructor, {
  foreignKey: "assignedBy",
  as: "assignedProjectInstructions",
});

ProjectInstructor.belongsTo(User, {
  foreignKey: "instructorId",
  as: "instructor",
});

ProjectInstructor.belongsTo(User, {
  foreignKey: "assignedBy",
  as: "assigner",
});

// User to CourseInstructor
User.hasMany(CourseInstructor, {
  foreignKey: "instructorId",
  as: "courseInstructions",
  onDelete: "CASCADE",
});

User.hasMany(CourseInstructor, {
  foreignKey: "assignedBy",
  as: "assignedCourseInstructions",
});

CourseInstructor.belongsTo(User, {
  foreignKey: "instructorId",
  as: "instructor",
});

CourseInstructor.belongsTo(User, {
  foreignKey: "assignedBy",
  as: "assigner",
});

// User to DiscountCode
User.hasMany(DiscountCode, {
  foreignKey: "createdBy",
  as: "createdDiscountCodes",
});

DiscountCode.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// User to DiscountUsage
User.hasMany(DiscountUsage, {
  foreignKey: "userId",
  as: "discountUsages",
  onDelete: "CASCADE",
});

DiscountUsage.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User to DiscountCode
User.hasMany(DiscountCode, {
  foreignKey: "createdBy",
  as: "createdDiscountCodes",
});

DiscountCode.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// User to DiscountUsage
User.hasMany(DiscountUsage, {
  foreignKey: "userId",
  as: "discountUsages",
  onDelete: "CASCADE",
});

DiscountUsage.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User to CourseChat
User.hasMany(CourseChat, {
  foreignKey: "senderId",
  as: "sentMessages",
  onDelete: "CASCADE",
});

CourseChat.belongsTo(User, {
  foreignKey: "senderId",
  as: "sender",
});

// User to ProjectFile
User.hasMany(ProjectFile, {
  foreignKey: "uploadedBy",
  as: "uploadedProjectFiles",
});

ProjectFile.belongsTo(User, {
  foreignKey: "uploadedBy",
  as: "uploader",
});

// User to RedeemCode
User.hasMany(RedeemCode, {
  foreignKey: "createdBy",
  as: "createdRedeemCodes",
  onDelete: "SET NULL",
});

RedeemCode.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// User to WalletTransaction
Wallet.hasMany(WalletTransaction, {
  foreignKey: "walletId",
  as: "transactions",
  onDelete: "CASCADE",
});

WalletTransaction.belongsTo(Wallet, {
  foreignKey: "walletId",
  as: "wallet",
});

WalletTransaction.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// User to RatingHelpful
User.hasMany(RatingHelpful, {
  foreignKey: "userId",
  as: "helpfulVotes",
  onDelete: "CASCADE",
});

RatingHelpful.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Direct associations for UserGoals and UserSkills
UserGoals.belongsTo(User, { foreignKey: "userId", as: "user" });
UserGoals.belongsTo(Goal, { foreignKey: "goalId", as: "goal" });

UserSkills.belongsTo(User, { foreignKey: "userId", as: "user" });
UserSkills.belongsTo(Skill, { foreignKey: "skillId", as: "skill" });

// Setup functions for new associations
export const setupUserDiscountCodeAssociations = () => {
  User.hasMany(DiscountCode, {
    foreignKey: "createdBy",
    as: "createdDiscountCodes",
  });

  DiscountCode.belongsTo(User, {
    foreignKey: "createdBy",
    as: "creator",
  });
};

export const setupUserDiscountUsageAssociations = () => {
  User.hasMany(DiscountUsage, {
    foreignKey: "userId",
    as: "discountUsages",
    onDelete: "CASCADE",
  });

  DiscountUsage.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });
};

export const setupUserCourseChatAssociations = () => {
  User.hasMany(CourseChat, {
    foreignKey: "senderId",
    as: "sentMessages",
    onDelete: "CASCADE",
  });

  CourseChat.belongsTo(User, {
    foreignKey: "senderId",
    as: "sender",
  });
};

export const setupUserProjectFileAssociations = () => {
  User.hasMany(ProjectFile, {
    foreignKey: "uploadedBy",
    as: "uploadedProjectFiles",
  });

  ProjectFile.belongsTo(User, {
    foreignKey: "uploadedBy",
    as: "uploader",
  });
};

export const setupUserRedeemCodeAssociations = () => {
  User.hasMany(RedeemCode, {
    foreignKey: "createdBy",
    as: "createdRedeemCodes",
    onDelete: "SET NULL",
  });

  RedeemCode.belongsTo(User, {
    foreignKey: "createdBy",
    as: "creator",
  });
};

export const setupUserWalletTransactionAssociations = () => {
  Wallet.hasMany(WalletTransaction, {
    foreignKey: "walletId",
    as: "transactions",
    onDelete: "CASCADE",
  });

  WalletTransaction.belongsTo(Wallet, {
    foreignKey: "walletId",
    as: "wallet",
  });

  WalletTransaction.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });
};

export const setupUserRatingHelpfulAssociations = () => {
  User.hasMany(RatingHelpful, {
    foreignKey: "userId",
    as: "helpfulVotes",
    onDelete: "CASCADE",
  });

  RatingHelpful.belongsTo(User, {
    foreignKey: "userId",
    as: "user",
  });
};

export { User, Language, UserLanguages, UserGoals, UserSkills, Goal, Skill, Exam, UserExams, Wishlist, Cart, Order, Address, CourseRating, InstructorRating, ProjectRating, RatingHelpful, SearchAnalytics, Wallet, WalletTransaction, RedeemCode, CourseChat, ProjectFile, ProjectPurchase, ProjectInstructor, CourseInstructor, DiscountCode, DiscountUsage };