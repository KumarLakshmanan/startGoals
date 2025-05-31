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

// user to goal
// User selects one goal (one-to-many relationship)
User.belongsTo(Goal, {
  foreignKey: "goal_id", // goalId is a foreign key in the User model
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
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

// Export all models + sequelize
export { sequelize };
export default models;
