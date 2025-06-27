// models/courseAssociations.js
import Course from "./course.js";
import CourseTeacher from "./courseTeacher.js";
import CourseWhatYouLearn from "./courseWhatYouLearn.js";
import CourseRequirement from "./courseRequirement.js";
import CourseTest from "./courseTest.js";
import CourseCertificate from "./courseCertificate.js";
import CoursePurchase from "./coursePurchase.js";
import CourseRating from "./courseRating.js";
import Batch from "./batch.js";
import BatchTeacher from "./batchTeacher.js";
import BatchSchedule from "./batchSchedule.js";
import BatchStudents from "./batchStudents.js";
import User from "./user.js";
import CourseCategory from "./courseCategory.js";
import CourseLevel from "./courseLevel.js";
import CourseTag from "./courseTag.js";
import Section from "./section.js";
import Lesson from "./lesson.js";

// Course to User (Creator)
Course.belongsTo(User, { foreignKey: "createdBy", as: "creator" });

// Course to CourseCategory
Course.belongsTo(CourseCategory, { foreignKey: "categoryId", as: "category" });

// Course to CourseLevel
Course.belongsTo(CourseLevel, { foreignKey: "levelId", as: "level" });

// Course to CourseTeacher (Multiple teachers)
Course.hasMany(CourseTeacher, { foreignKey: "courseId", as: "courseTeachers" });
CourseTeacher.belongsTo(Course, { foreignKey: "courseId" });
CourseTeacher.belongsTo(User, { foreignKey: "teacherId", as: "teacher" });

// Course to CourseWhatYouLearn
Course.hasMany(CourseWhatYouLearn, { foreignKey: "courseId", as: "whatYouLearn" });
CourseWhatYouLearn.belongsTo(Course, { foreignKey: "courseId" });

// Course to CourseRequirement
Course.hasMany(CourseRequirement, { foreignKey: "courseId", as: "requirements" });
CourseRequirement.belongsTo(Course, { foreignKey: "courseId" });

// Course to CourseTag
Course.belongsToMany(CourseTag, {
  through: "course_tags_mapping",
  foreignKey: "courseId",
  otherKey: "tagId",
  as: "tags",
});
CourseTag.belongsToMany(Course, {
  through: "course_tags_mapping",
  foreignKey: "tagId",
  otherKey: "courseId",
  as: "courses",
});

// Course to Section (Curriculum)
Course.hasMany(Section, { foreignKey: "courseId", as: "sections" });
Section.belongsTo(Course, { foreignKey: "courseId" });

// Section to Lesson
Section.hasMany(Lesson, { foreignKey: "sectionId", as: "lessons" });
Lesson.belongsTo(Section, { foreignKey: "sectionId" });

// Course to CourseTest
Course.hasMany(CourseTest, { foreignKey: "courseId", as: "tests" });
CourseTest.belongsTo(Course, { foreignKey: "courseId" });

// Course to Batch (Live courses)
Course.hasMany(Batch, { foreignKey: "courseId", as: "batches" });
Batch.belongsTo(Course, { foreignKey: "courseId" });

// Batch to BatchTeacher
Batch.hasMany(BatchTeacher, { foreignKey: "batchId", as: "batchTeachers" });
BatchTeacher.belongsTo(Batch, { foreignKey: "batchId" });
BatchTeacher.belongsTo(User, { foreignKey: "teacherId", as: "teacher" });

// Batch to BatchSchedule
Batch.hasMany(BatchSchedule, { foreignKey: "batchId", as: "schedules" });
BatchSchedule.belongsTo(Batch, { foreignKey: "batchId" });
BatchSchedule.belongsTo(User, { foreignKey: "teacherId", as: "teacher" });

// Batch to BatchStudents
Batch.hasMany(BatchStudents, { foreignKey: "batchId", as: "students" });
BatchStudents.belongsTo(Batch, { foreignKey: "batchId" });
BatchStudents.belongsTo(User, { foreignKey: "userId", as: "student" });

// Batch to CourseTest
Batch.hasMany(CourseTest, { foreignKey: "batchId", as: "batchTests" });
CourseTest.belongsTo(Batch, { foreignKey: "batchId", as: "batch" });

// Course to CoursePurchase
Course.hasMany(CoursePurchase, { foreignKey: "courseId", as: "purchases" });
CoursePurchase.belongsTo(Course, { foreignKey: "courseId" });
CoursePurchase.belongsTo(User, { foreignKey: "userId", as: "student" });
CoursePurchase.belongsTo(Batch, { foreignKey: "batchId", as: "batch" });

// Course to CourseRating
Course.hasMany(CourseRating, { foreignKey: "courseId", as: "ratings" });
CourseRating.belongsTo(Course, { foreignKey: "courseId" });
CourseRating.belongsTo(User, { foreignKey: "userId", as: "student" });

// Course to CourseCertificate
Course.hasMany(CourseCertificate, { foreignKey: "courseId", as: "certificates" });
CourseCertificate.belongsTo(Course, { foreignKey: "courseId" });
CourseCertificate.belongsTo(User, { foreignKey: "userId", as: "student" });
CourseCertificate.belongsTo(Batch, { foreignKey: "batchId", as: "batch" });

export default {
  Course,
  CourseTeacher,
  CourseWhatYouLearn,
  CourseRequirement,
  CourseTest,
  CourseCertificate,
  CoursePurchase,
  CourseRating,
  Batch,
  BatchTeacher,
  BatchSchedule,
  BatchStudents,
};
