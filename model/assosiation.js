import sequelize from "../config/db.js";
import User from "./user.js";
import Language from "./language.js";
import Opt from "./otp.js";
import Course from "./course.js";
import CourseCategory from "./courseCategory.js";
import CourseTag from "./courseTag.js";
import Banner from "./banner.js";
import Goal from "./goal.js";
import Skill from "./skill.js";
import CourseGoal from "./courseGoal.js";
import CourseRequirement from "./courseRequirement.js";
import CourseLevel from "./courseLevel.js";
import Section from "./section.js";
import Lesson from "./lesson.js";
import Resource from "./resource.js";
import Batch from "./batch.js";
import BatchStudents from "./batchStudents.js";
import Enrollment from "./enrollment.js";
import LiveSession from "./liveSession.js";
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
import DiscountCode from "./discountCode.js";
import DiscountUsage from "./discountUsage.js";

// All models must be defined before we associate them
const models = {
  User,
  Course,
  Language,
  Opt,
  CourseCategory,
  CourseTag,
  Banner,
  Goal,
  Skill,
  CourseGoal,
  CourseRequirement,
  CourseLevel,
  Section,
  Lesson,
  Resource,
  Batch,
  BatchStudents,
  Enrollment,
  LiveSession,
  RecordedSessionResource,
  Settings,
  SearchAnalytics,
  CourseRating,
  InstructorRating,
  Project,
  ProjectFile,
  ProjectPurchase,
  ProjectRating,
  DiscountCode,
  DiscountUsage,
};

//user to course
// course to user (creator)
Course.belongsTo(User, {
  foreignKey: "createdBy",
  as: "instructor",
});

User.hasMany(Course, {
  foreignKey: "createdBy",
  as: "courses",
});

//User to language
// Associations (✅ define them after all models are loaded)
User.belongsToMany(Language, {
  through: "user_languages",
  foreignKey: "user_id",
  otherKey: "language_id",
  onDelete: "CASCADE",
});

Language.belongsToMany(User, {
  through: "user_languages",
  foreignKey: "language_id",
  otherKey: "user_id",
  onDelete: "CASCADE",
});

//course to language
Course.belongsToMany(Language, {
  through: "course_languages",
  foreignKey: "course_id",
  otherKey: "language_id",
  onDelete: "CASCADE",
});

Language.belongsToMany(Course, {
  through: "course_languages",
  foreignKey: "language_id",
  otherKey: "course_id",
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
  through: "user_goals", // join table for user-goals relationship
  foreignKey: "user_id",
  otherKey: "goal_id",
  onDelete: "CASCADE",
});

Goal.belongsToMany(User, {
  through: "user_goals",
  foreignKey: "goal_id",
  otherKey: "user_id",
  onDelete: "CASCADE",
});

///user to skill
// User selects multiple skills related to the selected goal (many-to-many relationship)
User.belongsToMany(Skill, {
  through: "user_skills", // join table for user-skills relationship
  foreignKey: "user_id",
  otherKey: "skill_id",
  onDelete: "CASCADE",
});
Skill.belongsToMany(User, {
  through: "user_skills",
  foreignKey: "skill_id",
  otherKey: "user_id",
  onDelete: "CASCADE",
});

// Skill to CourseCategory
Skill.belongsTo(CourseCategory, {
  foreignKey: "category_id",
  as: "category",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

CourseCategory.hasMany(Skill, {
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

// course to courseTag
// Course has many CourseTags
Course.hasMany(CourseTag, {
  foreignKey: "courseId",
  as: "tags",
});
CourseTag.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

//cours with courseCategory
// One category has many courses
CourseCategory.hasMany(Course, {
  foreignKey: "categoryId",
  as: "courses",
});

// A course belongs to one category
Course.belongsTo(CourseCategory, {
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

// course to courseRequirements
// A course can have many requirements
Course.hasMany(CourseRequirement, {
  foreignKey: "courseId",
  as: "requirements",
  onDelete: "CASCADE",
});

// Each requirement belongs to a course
CourseRequirement.belongsTo(Course, {
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

//course to section assositaions
// A course can have many sections
Course.hasMany(Section, {
  foreignKey: "courseId",
  as: "sections",
  onDelete: "CASCADE",
});

// A section belongs to one course
Section.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

//section to lesson assosiations
// A section can have many lessons
Section.hasMany(Lesson, {
  foreignKey: "sectionId",
  as: "lessons",
  onDelete: "CASCADE",
});

// A lesson belongs to one section
Lesson.belongsTo(Section, {
  foreignKey: "sectionId",
  as: "section",
});

//lession to resoursce associtaion
// A lesson can have many resources
Lesson.hasMany(Resource, {
  foreignKey: "lessonId",
  as: "resources",
  onDelete: "CASCADE",
});

// A resource belongs to a single lesson
Resource.belongsTo(Lesson, {
  foreignKey: "lessonId",
  as: "lesson",
});

// Batch belongs to Course
Batch.belongsTo(Course, {
  foreignKey: "courseId", // foreignKey in the Batch model
  targetKey: "courseId", // primaryKey in the Course model
});

// A Batch can have many Students (many-to-many relationship through BatchStudents)
Batch.belongsToMany(User, {
  through: BatchStudents,
  foreignKey: "batchId",
  otherKey: "userId",
  as: "students",
});

User.belongsToMany(Batch, {
  through: BatchStudents,
  foreignKey: "userId",
  otherKey: "batchId",
  as: "batches",
});

// BatchStudents direct associations
BatchStudents.belongsTo(Batch, {
  foreignKey: "batchId",
  as: "batch",
});

BatchStudents.belongsTo(User, {
  foreignKey: "userId",
  as: "student",
});

Batch.hasMany(BatchStudents, {
  foreignKey: "batchId",
  as: "batchStudents",
});

User.hasMany(BatchStudents, {
  foreignKey: "userId",
  as: "studentBatches",
});

// Batch creator association
Batch.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

// enrollement Associations with User and Course models
Enrollment.belongsTo(User, { foreignKey: "userId" });
Enrollment.belongsTo(Course, { foreignKey: "courseId" });
//enrollment
Enrollment.belongsTo(Batch, { foreignKey: "batchId" });

// Reverse associations for Enrollment
User.hasMany(Enrollment, {
  foreignKey: "userId",
  as: "enrollments",
});

Course.hasMany(Enrollment, {
  foreignKey: "courseId",
  as: "enrollments",
});

// Course → Batches
Course.hasMany(Batch, {
  foreignKey: "courseId",
  as: "batches",
});
Batch.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
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
  foreignKey: "userId",
  as: "user",
  onDelete: "SET NULL",
});

User.hasMany(SearchAnalytics, {
  foreignKey: "userId",
  as: "searchHistory",
});

// Rating system associations

// Course Rating associations
Course.hasMany(CourseRating, {
  foreignKey: "courseId",
  as: "ratings",
  onDelete: "CASCADE",
});

CourseRating.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

User.hasMany(CourseRating, {
  foreignKey: "userId",
  as: "courseRatings",
  onDelete: "CASCADE",
});

CourseRating.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
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
  foreignKey: "userId",
  as: "givenInstructorRatings",
  onDelete: "CASCADE",
});

InstructorRating.belongsTo(User, {
  foreignKey: "userId",
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

// Project associations
// Project belongs to User (creator/admin)
Project.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

User.hasMany(Project, {
  foreignKey: "createdBy",
  as: "projects",
});

// Project belongs to Category (using existing CourseCategory)
Project.belongsTo(CourseCategory, {
  foreignKey: "categoryId",
  as: "category",
});

CourseCategory.hasMany(Project, {
  foreignKey: "categoryId",
  as: "projects",
});

// Project has many Tags (using existing CourseTag many-to-many)
Project.belongsToMany(CourseTag, {
  through: "project_tags",
  foreignKey: "project_id",
  otherKey: "tag_id",
  as: "projectTags",
  onDelete: "CASCADE",
});

CourseTag.belongsToMany(Project, {
  through: "project_tags",
  foreignKey: "tag_id",
  otherKey: "project_id",
  as: "projects",
  onDelete: "CASCADE",
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
  foreignKey: "userId",
  as: "projectPurchases",
  onDelete: "CASCADE",
});

ProjectPurchase.belongsTo(User, {
  foreignKey: "userId",
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
  foreignKey: "userId",
  as: "projectRatings",
  onDelete: "CASCADE",
});

ProjectRating.belongsTo(User, {
  foreignKey: "userId",
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

// DiscountCode associations
DiscountCode.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

User.hasMany(DiscountCode, {
  foreignKey: "createdBy",
  as: "createdDiscountCodes",
});

// DiscountCode can apply to categories
DiscountCode.belongsToMany(CourseCategory, {
  through: "discount_categories",
  foreignKey: "discount_id", // Corrected to match actual primary key
  otherKey: "category_id",
  as: "discountCategories",
  onDelete: "CASCADE",
});

CourseCategory.belongsToMany(DiscountCode, {
  through: "discount_categories",
  foreignKey: "category_id",
  otherKey: "discount_id", // Corrected to match actual primary key
  as: "discountCodes",
  onDelete: "CASCADE",
});

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

// Export all models + sequelize
export { sequelize };
export default models;
