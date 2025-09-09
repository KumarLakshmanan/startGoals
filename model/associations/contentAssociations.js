// ===================== CONTENT ASSOCIATIONS =====================

import News from "../news.js";
import User from "../user.js";
import CourseChat from "../courseChat.js";
import LessonChat from "../lessonChat.js";
import Lesson from "../lesson.js";
import Section from "../section.js";
import Category from "../category.js";
import Course from "../course.js";
import LiveSession from "../liveSession.js";
import RaisedHand from "../raisedHand.js";
import Wishlist from "../wishlist.js";
import Cart from "../cart.js";
import Project from "../project.js";
import CourseInstructor from "../courseInstructor.js";

// News associations
User.hasMany(News, {
  foreignKey: "authorId",
  as: "newsArticles",
  onDelete: "CASCADE",
});

News.belongsTo(User, {
  foreignKey: "authorId",
  as: "author",
});

News.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

Category.hasMany(News, {
  foreignKey: "categoryId",
  as: "categoryNews",
  onDelete: "SET NULL",
});

// Course Chat associations
Course.hasMany(CourseChat, {
  foreignKey: "courseId",
  as: "chatMessages",
  onDelete: "CASCADE",
});

CourseChat.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

CourseChat.belongsTo(CourseChat, {
  foreignKey: "replyToId",
  as: "replyTo",
  onDelete: "SET NULL",
});

CourseChat.hasMany(CourseChat, {
  foreignKey: "replyToId",
  as: "replies",
  onDelete: "SET NULL",
});

// Lesson Chat associations
Lesson.hasMany(LessonChat, {
  foreignKey: "lessonId",
  as: "chatMessages",
  onDelete: "CASCADE",
});

LessonChat.belongsTo(Lesson, {
  foreignKey: "lessonId",
  as: "lesson",
});

LessonChat.belongsTo(LessonChat, {
  foreignKey: "replyToId",
  as: "replyTo",
  onDelete: "SET NULL",
});

LessonChat.hasMany(LessonChat, {
  foreignKey: "replyToId",
  as: "replies",
  onDelete: "SET NULL",
});

// Lesson associations (Section, Course, User) - Note: Section.hasMany(Lesson) is already defined in courseAssociations.js
Lesson.belongsTo(Section, {
  foreignKey: "sectionId",
  as: "section",
});

// Through Section to Course
Lesson.belongsTo(Course, {
  foreignKey: "courseId",
  targetKey: "courseId",
  constraints: false,
  as: "course",
});

// Agora associations (stored in lesson model)
Lesson.belongsTo(User, {
  foreignKey: "instructorId",
  targetKey: "userId",
  constraints: false,
  as: "instructor",
});

// Course Instructor associations
Course.hasMany(CourseInstructor, {
  foreignKey: "courseId",
  as: "instructors",
  onDelete: "CASCADE",
});

CourseInstructor.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

User.hasMany(CourseInstructor, {
  foreignKey: "instructorId",
  as: "coursesAsInstructor",
  onDelete: "CASCADE",
});

CourseInstructor.belongsTo(User, {
  foreignKey: "instructorId",
  as: "instructor",
});

CourseInstructor.belongsTo(User, {
  foreignKey: "assignedBy",
  as: "assignedByUser",
});

// User associations for Lesson Chat
User.hasMany(LessonChat, {
  foreignKey: "senderId",
  as: "lessonChatMessages",
  onDelete: "CASCADE",
});

LessonChat.belongsTo(User, {
  foreignKey: "senderId",
  as: "sender",
});

// Live Session associations
Course.hasMany(LiveSession, {
  foreignKey: "courseId",
  as: "liveSessions",
  onDelete: "CASCADE",
});

LiveSession.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

LiveSession.belongsTo(User, {
  foreignKey: "instructorId",
  targetKey: "userId",
  constraints: false,
  as: "instructor",
});

// RaisedHand associations
LiveSession.hasMany(RaisedHand, {
  foreignKey: "liveSessionId",
  as: "raisedHands",
  onDelete: "CASCADE",
});

RaisedHand.belongsTo(LiveSession, {
  foreignKey: "liveSessionId",
  as: "session",
});

// Setup functions
// export const setupWishlistAssociations = () => {
//   User.hasMany(Wishlist, {
//     foreignKey: "userId",
//     as: "wishlists",
//     onDelete: "CASCADE",
//   });

//   Wishlist.belongsTo(User, {
//     foreignKey: "userId",
//     as: "user",
//   });

//   Wishlist.belongsTo(Course, {
//     foreignKey: "itemId",
//     targetKey: "courseId",
//     constraints: false,
//     as: "course",
//   });

//   Wishlist.belongsTo(Project, {
//     foreignKey: "itemId",
//     targetKey: "projectId",
//     constraints: false,
//     as: "project",
//   });
// };

// export const setupCartAssociations = () => {
//   User.hasMany(Cart, {
//     foreignKey: "userId",
//     as: "cartItems",
//     onDelete: "CASCADE",
//   });

//   Cart.belongsTo(User, {
//     foreignKey: "userId",
//     as: "user",
//   });

//   Cart.belongsTo(Course, {
//     foreignKey: "itemId",
//     targetKey: "courseId",
//     constraints: false,
//     as: "course",
//   });

//   Cart.belongsTo(Project, {
//     foreignKey: "itemId",
//     targetKey: "projectId",
//     constraints: false,
//     as: "project",
//   });
// };

// export const setupAddressAssociations = () => {
//   // Address associations are handled in userAssociations.js
// };
export { News, User, CourseChat, LessonChat, Lesson, Section, Course, CourseInstructor, LiveSession, RaisedHand, Wishlist, Cart, Project };