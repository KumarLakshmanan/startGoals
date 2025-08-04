import sequelize from "../config/db.js";
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
import Resource from "./resource.js";
import Batch from "./batch.js";
import BatchStudents from "./batchStudents.js";
import Enrollment from "./enrollment.js";
import LiveSession from "./liveSession.js";
import LiveSessionParticipant from "./liveSessionParticipant.js";
import RaisedHand from "./raisedHand.js";
import RecordedSession from "./recordedSession.js";
import RecordedSessionResource from "./recordedSessionResource.js";
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
import BatchTeacher from "./batchTeacher.js";
import BatchSchedule from "./batchSchedule.js";
import CourseCertificate from "./courseCertificate.js";
import Wishlist from "./wishlist.js";
import Cart from "./cart.js";
import Order from "./order.js";
import OrderItem from "./orderItem.js";
import CourseFile from "./courseFile.js";
import ProjectTechStack from "./projectTechStack.js";
import Address from "./address.js";
import CourseTechStack from "./courseTechStack.js";
import CourseLanguage from "./courseLanguage.js";
import ProjectLanguage from "./projectLanguage.js";
import CourseInstructor from "./courseInstructor.js";
import ProjectInstructor from "./projectInstructor.js";

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
  Resource,
  Batch,
  Address,
  BatchStudents,
  Enrollment,
  LiveSession,
  LiveSessionParticipant,
  RaisedHand,
  RecordedSession,
  RecordedSessionResource,
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
  BatchTeacher,
  BatchSchedule,
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
};

//User to language
// Associations (✅ define them after all models are loaded)
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

//goal to skill
// Goal has many Skills
Goal.hasMany(Skill, {
  foreignKey: "goal_id",
  as: "skills", // optional alias
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Skill belongs to Goal
Skill.belongsTo(Goal, {
  foreignKey: "goal_id",
  as: "goal", // optional alias
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

// Goal to CourseLevel
Goal.belongsTo(CourseLevel, {
  foreignKey: "level_id",
  as: "level",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

CourseLevel.hasMany(Goal, {
  foreignKey: "level_id",
  as: "goals",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// user to goal
// User can select multiple goals (many-to-many relationship)
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

///user to skill
// User selects multiple skills related to the selected goal (many-to-many relationship)
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

// Skill to Category
Skill.belongsTo(Category, {
  foreignKey: "category_id",
  as: "category",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

Category.hasMany(Skill, {
  foreignKey: "category_id",
  as: "skills",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// Skill to CourseLevel
Skill.belongsTo(CourseLevel, {
  foreignKey: "level_id",
  as: "level",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

CourseLevel.hasMany(Skill, {
  foreignKey: "level_id",
  as: "skills",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

//cours with Category
// One category has many courses
Category.hasMany(Course, {
  foreignKey: "categoryId",
  as: "courses",
});

// A course belongs to one category
Course.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

//course to courseGoals
// A course can have many course goals
Course.hasMany(CourseGoal, {
  foreignKey: "courseId",
  as: "goals",
  onDelete: "CASCADE",
});

// Each course goal belongs to a single course
CourseGoal.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

//course to courselevel
// A courseLevel can be assigned to many courses
CourseLevel.hasMany(Course, {
  foreignKey: "levelId",
  as: "courses",
  onDelete: "SET NULL",
});

// A course belongs to one level
Course.belongsTo(CourseLevel, {
  foreignKey: "levelId",
  as: "level",
});

// Removed Course-Language association - no languageId column exists in courses table
// Batch belongs to Course
Batch.belongsTo(Course, {
  foreignKey: "courseId", // foreignKey in the Batch model
  targetKey: "courseId", // primaryKey in the Course model
});

// A Batch can have many Students (many-to-many relationship through BatchStudents)
Batch.belongsToMany(User, {
  through: BatchStudents,
  foreignKey: "batchId",
  otherKey: "user_id",
  as: "users",
});

User.belongsToMany(Batch, {
  through: BatchStudents,
  foreignKey: "user_id",
  otherKey: "batchId",
  as: "batches",
});

// BatchStudents direct associations
BatchStudents.belongsTo(Batch, {
  foreignKey: "batchId",
  as: "batch",
});

BatchStudents.belongsTo(User, {
  foreignKey: "user_id",
  as: "student",
});

Batch.hasMany(BatchStudents, {
  foreignKey: "batchId",
  as: "batchStudents",
});

User.hasMany(BatchStudents, {
  foreignKey: "user_id",
  as: "studentBatches",
});


// enrolement Associations with User and Course models
Enrollment.belongsTo(User, { foreignKey: "user_id" });
Enrollment.belongsTo(Course, { foreignKey: "courseId" });
//enrollment
Enrollment.belongsTo(Batch, { foreignKey: "batchId" });

// Reverse associations for Enrollment
User.hasMany(Enrollment, {
  foreignKey: "user_id",
  as: "enrollments",
});

Course.hasMany(Enrollment, {
  foreignKey: "courseId",
  as: "enrollments",
});

// Course → LiveSessions
Course.hasMany(LiveSession, {
  foreignKey: "courseId",
  as: "liveSessions",
});
LiveSession.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

// Batch → LiveSessions
Batch.hasMany(LiveSession, {
  foreignKey: "batchId",
  as: "liveSessions",
});
LiveSession.belongsTo(Batch, {
  foreignKey: "batchId",
  as: "batch",
});

// LiveSessions -> RecordeddSession
RecordedSession.belongsTo(LiveSession, {
  foreignKey: "sessionId",
  as: "liveSession",
});

// Associations RecordedSession-> RecordedSessionResource
RecordedSession.hasMany(RecordedSessionResource, {
  foreignKey: "recordedId",
  as: "resources",
});

RecordedSessionResource.belongsTo(RecordedSession, {
  foreignKey: "recordedId",
  as: "recordedSession",
});

// SearchAnalytics associations
SearchAnalytics.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
  onDelete: "SET NULL",
});

User.hasMany(SearchAnalytics, {
  foreignKey: "user_id",
  as: "searchHistory",
});

// Rating system associations - removed duplicate, see end of file

CourseRating.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

User.hasMany(CourseRating, {
  foreignKey: "userId",
  as: "courseRatings",
});

// Moderation associations for course ratings
CourseRating.belongsTo(User, {
  foreignKey: "moderatedBy",
  as: "moderator",
});

User.hasMany(CourseRating, {
  foreignKey: "moderatedBy",
  as: "moderatedCourseRatings",
});

// Instructor Rating associations
User.hasMany(InstructorRating, {
  foreignKey: "instructorId",
  as: "receivedRatings",
  onDelete: "CASCADE",
});

InstructorRating.belongsTo(User, {
  foreignKey: "instructorId",
  as: "instructor",
});

User.hasMany(InstructorRating, {
  foreignKey: "user_id",
  as: "givenInstructorRatings",
  onDelete: "CASCADE",
});

InstructorRating.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// Optional course reference for instructor ratings
Course.hasMany(InstructorRating, {
  foreignKey: "courseId",
  as: "instructorRatings",
  onDelete: "SET NULL",
});

InstructorRating.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

// Moderation associations for instructor ratings
InstructorRating.belongsTo(User, {
  foreignKey: "moderatedBy",
  as: "moderator",
});

User.hasMany(InstructorRating, {
  foreignKey: "moderatedBy",
  as: "moderatedInstructorRatings",
});

// ===================== PROJECT MARKETPLACE ASSOCIATIONS =====================

// Project belongs to Category (using existing Category)
Project.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

Category.hasMany(Project, {
  foreignKey: "categoryId",
  as: "projects",
});
// ProjectFile associations
Project.hasMany(ProjectFile, {
  foreignKey: "projectId",
  as: "files",
  onDelete: "CASCADE",
});

ProjectFile.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

ProjectFile.belongsTo(User, {
  foreignKey: "uploadedBy",
  as: "uploader",
});

User.hasMany(ProjectFile, {
  foreignKey: "uploadedBy",
  as: "uploadedProjectFiles",
});

// ProjectPurchase associations
Project.hasMany(ProjectPurchase, {
  foreignKey: "projectId",
  as: "purchases",
  onDelete: "CASCADE",
});

ProjectPurchase.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

User.hasMany(ProjectPurchase, {
  foreignKey: "user_id",
  as: "projectPurchases",
  onDelete: "CASCADE",
});

ProjectPurchase.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
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

// ProjectRating associations
Project.hasMany(ProjectRating, {
  foreignKey: "projectId",
  as: "ratings",
  onDelete: "CASCADE",
});

ProjectRating.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

User.hasMany(ProjectRating, {
  foreignKey: "user_id",
  as: "projectRatings",
  onDelete: "CASCADE",
});

ProjectRating.belongsTo(User, {
  foreignKey: "user_id",
  as: "user",
});

// ProjectRating belongs to ProjectPurchase (only purchased users can rate)
ProjectRating.belongsTo(ProjectPurchase, {
  foreignKey: "purchaseId",
  as: "purchase",
});

ProjectPurchase.hasOne(ProjectRating, {
  foreignKey: "purchaseId",
  as: "rating",
});

// Moderation associations for project ratings
ProjectRating.belongsTo(User, {
  foreignKey: "moderatedBy",
  as: "moderator",
});

User.hasMany(ProjectRating, {
  foreignKey: "moderatedBy",
  as: "moderatedProjectRatings",
});

// project to ProjectGoal
// A project can have many project goals
Project.hasMany(ProjectGoal, {
  foreignKey: "projectId",
  as: "goals",
  onDelete: "CASCADE",
});
// Each project goal belongs to a single project
ProjectGoal.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

// Goal to ProjectGoal association
Goal.hasMany(ProjectGoal, {
  foreignKey: "goalId",
  as: "projectGoals",
  onDelete: "CASCADE",
});
ProjectGoal.belongsTo(Goal, {
  foreignKey: "goalId",
  as: "goal",
});

User.hasMany(DiscountCode, {
  foreignKey: "createdBy",
  as: "createdDiscountCodes",
});

// DiscountCode can apply to categories - TEMPORARILY DISABLED
// DiscountCode.belongsToMany(Category, {
//   through: "discount_categories",
//   foreignKey: "discount_id", // Corrected to match actual primary key
//   otherKey: "category_id",
//   as: "discountCategories",
//   onDelete: "CASCADE",
// });

// Category.belongsToMany(DiscountCode, {
//   through: "discount_categories",
//   foreignKey: "category_id",
//   otherKey: "discount_id", // Corrected to match actual primary key
//   as: "discountCodes",
//   onDelete: "CASCADE",
// });

// DiscountUsage associations
DiscountCode.hasMany(DiscountUsage, {
  foreignKey: "discount_id",
  as: "usages",
  onDelete: "CASCADE",
});

DiscountUsage.belongsTo(DiscountCode, {
  foreignKey: "discount_id",
  as: "discountCode",
});

User.hasMany(DiscountUsage, {
  foreignKey: "user_id",
  as: "discountUsages",
  onDelete: "CASCADE",
});

DiscountUsage.belongsTo(User, {
  foreignKey: "user_id",
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

// Exam to CourseLevel
Exam.belongsTo(CourseLevel, {
  foreignKey: "level_id",
  as: "level",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// User <-> Exam many-to-many association via UserExams
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

// ===================== WISHLIST ASSOCIATIONS =====================
User.hasMany(Wishlist, {
  foreignKey: "userId",
  as: "wishlists",
  onDelete: "CASCADE",
});

Wishlist.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Wishlist.belongsTo(Course, {
  foreignKey: "itemId",
  targetKey: "courseId",
  constraints: false,
  as: "course",
});

Wishlist.belongsTo(Project, {
  foreignKey: "itemId",
  targetKey: "projectId",
  constraints: false,
  as: "project",
});

// ===================== CART ASSOCIATIONS =====================
User.hasMany(Cart, {
  foreignKey: "userId",
  as: "cartItems",
  onDelete: "CASCADE",
});

Cart.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

Cart.belongsTo(Course, {
  foreignKey: "itemId",
  targetKey: "courseId",
  constraints: false,
  as: "course",
});

Cart.belongsTo(Project, {
  foreignKey: "itemId",
  targetKey: "projectId",
  constraints: false,
  as: "project",
});

// ===================== ORDER ASSOCIATIONS =====================
User.hasMany(Order, {
  foreignKey: "userId",
  as: "orders",
  onDelete: "CASCADE",
});

Order.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// ===================== ADDRESS ASSOCIATIONS =====================
User.hasMany(Address, {
  foreignKey: "userId",
  as: "addresses",
  onDelete: "CASCADE",
});

Address.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Order-Address associations
Order.belongsTo(Address, {
  foreignKey: "addressId",
  as: "deliveryAddress",
});

Address.hasMany(Order, {
  foreignKey: "addressId",
  as: "orders",
});

// Order-OrderItem associations
Order.hasMany(OrderItem, {
  foreignKey: "orderId",
  as: "items", // Changed from "orderItems" to avoid naming collision
  onDelete: "CASCADE",
});

OrderItem.belongsTo(Order, {
  foreignKey: "orderId",
  as: "order",
});

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

// CourseFile associations
CourseFile.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course"
});

CourseFile.belongsTo(User, {
  foreignKey: "uploadedBy",
  as: "uploader"
});

CourseFile.belongsTo(Section, {
  foreignKey: "sectionId",
  as: "section"
});

CourseFile.belongsTo(Lesson, {
  foreignKey: "lessonId",
  as: "lesson"
});

Course.hasMany(CourseFile, {
  foreignKey: "courseId",
  as: "files"
});

// Course and Section association for eager loading support
Course.hasMany(Section, { as: "sections", foreignKey: "courseId" });
Section.belongsTo(Course, { as: "course", foreignKey: "courseId" });

Section.hasMany(Lesson, { as: "lessons", foreignKey: "sectionId" });
Lesson.belongsTo(Section, { as: "section", foreignKey: "sectionId" });

Lesson.hasMany(Resource, { as: "resources", foreignKey: "lessonId" });
Resource.belongsTo(Lesson, { as: "lesson", foreignKey: "lessonId" });

// ===================== RATING HELPFUL ASSOCIATIONS =====================

// RatingHelpful associations for tracking helpful votes
User.hasMany(RatingHelpful, {
  foreignKey: "userId",
  as: "helpfulVotes",
  onDelete: "CASCADE",
});

RatingHelpful.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Associations for eager loading
Project.hasMany(ProjectTechStack, { as: "techStack", foreignKey: "projectId" });
ProjectTechStack.belongsTo(Project, { foreignKey: "projectId" });

Course.hasMany(CourseTechStack, { as: "techStack", foreignKey: "courseId" });
CourseTechStack.belongsTo(Course, { foreignKey: "courseId" });

ProjectTechStack.belongsTo(Skill, { foreignKey: "skillId", as: "skill" });
CourseTechStack.belongsTo(Skill, { foreignKey: "skillId", as: "skill" });

// ===================== COURSE LANGUAGE ASSOCIATIONS =====================
Course.hasMany(CourseLanguage, {
  foreignKey: "courseId",
  as: "courseLanguages",
  onDelete: "CASCADE",
});

CourseLanguage.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

Language.hasMany(CourseLanguage, {
  foreignKey: "languageId",
  as: "courseLanguages",
  onDelete: "CASCADE",
});

CourseLanguage.belongsTo(Language, {
  foreignKey: "languageId",
  as: "language",
});

// Course many-to-many with Language through CourseLanguage
Course.belongsToMany(Language, {
  through: CourseLanguage,
  foreignKey: "courseId",
  otherKey: "languageId",
  as: "languages",
});

Language.belongsToMany(Course, {
  through: CourseLanguage,
  foreignKey: "languageId",
  otherKey: "courseId",
  as: "courses",
});

// ===================== PROJECT LANGUAGE ASSOCIATIONS =====================
Project.hasMany(ProjectLanguage, {
  foreignKey: "projectId",
  as: "projectLanguages",
  onDelete: "CASCADE",
});

ProjectLanguage.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

Language.hasMany(ProjectLanguage, {
  foreignKey: "languageId",
  as: "projectLanguages",
  onDelete: "CASCADE",
});

ProjectLanguage.belongsTo(Language, {
  foreignKey: "languageId",
  as: "language",
});

// Project many-to-many with Language through ProjectLanguage
Project.belongsToMany(Language, {
  through: ProjectLanguage,
  foreignKey: "projectId",
  otherKey: "languageId",
  as: "languages",
});

Language.belongsToMany(Project, {
  through: ProjectLanguage,
  foreignKey: "languageId",
  otherKey: "projectId",
  as: "projects",
});

// ===================== COURSE INSTRUCTOR ASSOCIATIONS =====================
Course.hasMany(CourseInstructor, {
  foreignKey: "courseId",
  as: "courseInstructors",
  onDelete: "CASCADE",
});

CourseInstructor.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

User.hasMany(CourseInstructor, {
  foreignKey: "instructorId",
  as: "courseInstructions",
  onDelete: "CASCADE",
});

CourseInstructor.belongsTo(User, {
  foreignKey: "instructorId",
  as: "instructor",
});

CourseInstructor.belongsTo(User, {
  foreignKey: "assignedBy",
  as: "assigner",
});

// Course many-to-many with User (instructors) through CourseInstructor
Course.belongsToMany(User, {
  through: CourseInstructor,
  foreignKey: "courseId",
  otherKey: "instructorId",
  as: "instructors",
});

User.belongsToMany(Course, {
  through: CourseInstructor,
  foreignKey: "instructorId",
  otherKey: "courseId",
  as: "instructedCourses",
});

// ===================== PROJECT INSTRUCTOR ASSOCIATIONS =====================
Project.hasMany(ProjectInstructor, {
  foreignKey: "projectId",
  as: "projectInstructors",
  onDelete: "CASCADE",
});

ProjectInstructor.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

User.hasMany(ProjectInstructor, {
  foreignKey: "instructorId",
  as: "projectInstructions",
  onDelete: "CASCADE",
});

ProjectInstructor.belongsTo(User, {
  foreignKey: "instructorId",
  as: "instructor",
});

ProjectInstructor.belongsTo(User, {
  foreignKey: "assignedBy",
  as: "assigner",
});

// Project many-to-many with User (instructors) through ProjectInstructor
Project.belongsToMany(User, {
  through: ProjectInstructor,
  foreignKey: "projectId",
  otherKey: "instructorId",
  as: "instructors",
});

User.belongsToMany(Project, {
  through: ProjectInstructor,
  foreignKey: "instructorId",
  otherKey: "projectId",
  as: "instructedProjects",
});

export default models;
