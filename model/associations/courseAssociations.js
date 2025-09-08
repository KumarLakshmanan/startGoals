// ===================== COURSE ASSOCIATIONS =====================

import Course from "../course.js";
import Category from "../category.js";
import CourseGoal from "../courseGoal.js";
import Goal from "../goal.js";
import CourseLevel from "../courseLevel.js";
import Section from "../section.js";
import Lesson from "../lesson.js";
import Enrollment from "../enrollment.js";
import LiveSession from "../liveSession.js";
import CourseRating from "../courseRating.js";
import InstructorRating from "../instructorRating.js";
import CourseFile from "../courseFile.js";
import CourseTechStack from "../courseTechStack.js";
import Skill from "../skill.js";
import CourseLanguage from "../courseLanguage.js";
import Language from "../language.js";
import CourseInstructor from "../courseInstructor.js";
import User from "../user.js";
import DiscountUsage from "../discountUsage.js";
import CourseTest from "../courseTest.js";
import CourseCertificate from "../courseCertificate.js";
import Banner from "../banner.js";
import CourseTeacher from "../courseTeacher.js";

// Course to Category
Category.hasMany(Course, {
  foreignKey: "categoryId",
  as: "courses",
});

Course.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

// Course to CourseGoal
Course.hasMany(CourseGoal, {
  foreignKey: "courseId",
  as: "goals",
  onDelete: "CASCADE",
});

CourseGoal.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

// Course to CourseLevel
CourseLevel.hasMany(Course, {
  foreignKey: "levelId",
  as: "courses",
  onDelete: "SET NULL",
});

Course.belongsTo(CourseLevel, {
  foreignKey: "levelId",
  as: "level",
});

// Course to Section
Course.hasMany(Section, { as: "sections", foreignKey: "courseId" });
Section.belongsTo(Course, { as: "course", foreignKey: "courseId" });

// Section to Lesson
Section.hasMany(Lesson, { as: "lessons", foreignKey: "sectionId" });
Lesson.belongsTo(Section, { as: "section", foreignKey: "sectionId" });

// Course to Enrollment
Course.hasMany(Enrollment, {
  foreignKey: "courseId",
  as: "enrollments",
});

Enrollment.belongsTo(Course, { foreignKey: "courseId" });
Enrollment.belongsTo(User, { foreignKey: "user_id" });

// Course to LiveSession
Course.hasMany(LiveSession, {
  foreignKey: "courseId",
  as: "liveSessions",
});

LiveSession.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

// Course to CourseRating
Course.hasMany(CourseRating, {
  foreignKey: "courseId",
  as: "ratings",
  onDelete: "CASCADE",
});

CourseRating.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

// Course to InstructorRating
Course.hasMany(InstructorRating, {
  foreignKey: "courseId",
  as: "instructorRatings",
  onDelete: "SET NULL",
});

InstructorRating.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

// Course to CourseFile
Course.hasMany(CourseFile, {
  foreignKey: "courseId",
  as: "files"
});

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

// Lesson to CourseFile
Lesson.hasMany(CourseFile, {
  foreignKey: "lessonId",
  as: "files"
});

// Course to CourseTechStack
Course.hasMany(CourseTechStack, { as: "techStack", foreignKey: "courseId" });
CourseTechStack.belongsTo(Course, { foreignKey: "courseId" });

CourseTechStack.belongsTo(Skill, { foreignKey: "skillId", as: "skill" });

// Course to CourseLanguage
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

// Course to CourseInstructor
Course.hasMany(CourseInstructor, {
  foreignKey: "courseId",
  as: "courseInstructors",
  onDelete: "CASCADE",
});

CourseInstructor.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
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

// Course to DiscountUsage
Course.hasMany(DiscountUsage, {
  foreignKey: "courseId",
  as: "discountUsages",
});

DiscountUsage.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

// Enrollment to DiscountUsage
Enrollment.hasOne(DiscountUsage, {
  foreignKey: "enrollmentId",
  as: "discountUsage",
});

DiscountUsage.belongsTo(Enrollment, {
  foreignKey: "enrollmentId",
  as: "enrollment",
});

// Course to CourseTest
Course.hasMany(CourseTest, {
  foreignKey: "courseId",
  as: "tests",
  onDelete: "CASCADE",
});

CourseTest.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

// Course to CourseCertificate
Course.hasMany(CourseCertificate, {
  foreignKey: "courseId",
  as: "certificates",
  onDelete: "CASCADE",
});

CourseCertificate.belongsTo(Course, {
  foreignKey: "courseId",
  as: "course",
});

// Setup functions
// export const setupCourseBannerAssociations = () => {
//   Course.belongsTo(Banner, {
//     foreignKey: "bannerId",
//     as: "banner",
//     onDelete: "SET NULL",
//   });

//   Banner.hasMany(Course, {
//     foreignKey: "bannerId",
//     as: "courses",
//   });
// };

// export const setupCourseTeacherAssociations = () => {
//   Course.hasMany(CourseTeacher, {
//     foreignKey: "courseId",
//     as: "teachers",
//     onDelete: "CASCADE",
//   });

//   CourseTeacher.belongsTo(Course, {
//     foreignKey: "courseId",
//     as: "course",
//   });
// };
// // CourseChat associations
// export const setupCourseChatAssociations = () => {
//   // CourseChat belongs to Course
//   Course.hasMany(CourseChat, {
//     foreignKey: "courseId",
//     as: "chats",
//     onDelete: "CASCADE",
//   });

//   CourseChat.belongsTo(Course, {
//     foreignKey: "courseId",
//     as: "chatCourse",
//   });

//   // CourseChat belongs to User as sender
//   CourseChat.belongsTo(User, {
//     foreignKey: "senderId",
//     as: "sender",
//   });

//   User.hasMany(CourseChat, {
//     foreignKey: "senderId",
//     as: "sentMessages",
//   });

//   // CourseChat self-referencing for replies
//   CourseChat.hasMany(CourseChat, {
//     foreignKey: "replyToId",
//     as: "chatReplies",
//   });

//   CourseChat.belongsTo(CourseChat, {
//     foreignKey: "replyToId",
//     as: "chatReplyTo",
//   });
// };

export { Course, Category, CourseGoal, Goal, CourseLevel, Section, Lesson, Enrollment, LiveSession, CourseRating, InstructorRating, CourseFile, CourseTechStack, Skill, CourseLanguage, Language, CourseInstructor, User, DiscountUsage, CourseTest, CourseCertificate, Banner, CourseTeacher };