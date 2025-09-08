import sequelize from "../config/db.js";

// Import all association files
import "./associations/userAssociations.js";
import "./associations/courseAssociations.js";
import "./associations/projectAssociations.js";
import "./associations/systemAssociations.js";
import "./associations/contentAssociations.js";
import "./associations/walletAssociations.js";

// Import all models for export
import User from "./user.js";
import Language from "./language.js";
import Otp from "./otp.js";
import Course from "./course.js";
import Category from "./category.js";
import Banner from "./banner.js";
import Goal from "./goal.js";
import Skill from "./skill.js";
import CourseGoal from "./courseGoal.js";
import ProjectGoal from "./projectGoal.js";
import CourseLevel from "./courseLevel.js";
import Section from "./section.js";
import UserGoals from "./userGoals.js";
import UserSkills from "./userSkills.js";
import Lesson from "./lesson.js";
import Enrollment from "./enrollment.js";
import LiveSession from "./liveSession.js";
import LiveSessionParticipant from "./liveSessionParticipant.js";
import RaisedHand from "./raisedHand.js";
import Settings from "./settings.js";
import SearchAnalytics from "./searchAnalytics.js";
import CourseRating from "./courseRating.js";
import InstructorRating from "./instructorRating.js";
import Project from "./project.js";
import ProjectFile from "./projectFile.js";
import ProjectPurchase from "./projectPurchase.js";
import ProjectRating from "./projectRating.js";
import RatingHelpful from "./ratingHelpful.js";
import DiscountCode from "./discountCode.js";
import DiscountUsage from "./discountUsage.js";
import UserLanguages from "./userLanguages.js";
import Exam from "./exam.js";
import UserExams from "./userExams.js";
import CourseTeacher from "./courseTeacher.js";
import CourseTest from "./courseTest.js";
import CourseCertificate from "./courseCertificate.js";
import Wishlist from "./wishlist.js";
import Cart from "./cart.js";
import Order from "./order.js";
import OrderItem from "./orderItem.js";
import CourseFile from "./courseFile.js";
import Address from "./address.js";
import CourseLanguage from "./courseLanguage.js";
import ProjectLanguage from "./projectLanguage.js";
import CourseInstructor from "./courseInstructor.js";
import ProjectInstructor from "./projectInstructor.js";
import News from "./news.js";
import Wallet from "./wallet.js";
import WalletTransaction from "./walletTransaction.js";
import RedeemCode from "./redeemCode.js";
import CourseChat from "./courseChat.js";

// All models must be defined before we associate them
const models = {
  User,
  Course,
  Language,
  Otp,
  Category,
  Banner,
  Goal,
  Skill,
  UserGoals,
  UserSkills,
  UserLanguages,
  CourseGoal,
  ProjectGoal,
  CourseLevel,
  Section,
  Lesson,
  Address,
  Enrollment,
  LiveSession,
  LiveSessionParticipant,
  RaisedHand,
  Settings,
  SearchAnalytics,
  CourseRating,
  InstructorRating,
  Project,
  ProjectFile,
  ProjectPurchase,
  ProjectRating,
  RatingHelpful,
  DiscountCode,
  DiscountUsage,
  CourseTeacher,
  CourseTest,
  CourseCertificate,
  Wishlist,
  Cart,
  Order,
  Exam,
  UserExams,
  CourseFile,
  CourseLanguage,
  ProjectLanguage,
  CourseInstructor,
  ProjectInstructor,
  News,
  Wallet,
  WalletTransaction,
  RedeemCode,
  CourseChat,
};

// Export all models + sequelize
export {
  sequelize,
  User,
  Course,
  Project,
  Enrollment,
  Cart,
  Wishlist,
  Order,
  OrderItem,
  ProjectPurchase,
  Address
};

export default models;
