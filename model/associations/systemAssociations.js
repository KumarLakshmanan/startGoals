// ===================== SYSTEM ASSOCIATIONS =====================

import Category from "../category.js";
import Skill from "../skill.js";
import Goal from "../goal.js";
import CourseLevel from "../courseLevel.js";
import Banner from "../banner.js";
import Settings from "../settings.js";
import SearchAnalytics from "../searchAnalytics.js";
import Exam from "../exam.js";
import User from "../user.js";
import CourseRating from "../courseRating.js";
import InstructorRating from "../instructorRating.js";
import ProjectRating from "../projectRating.js";
import LiveSession from "../liveSession.js";
import LiveSessionParticipant from "../liveSessionParticipant.js";
import RaisedHand from "../raisedHand.js";
import News from "../news.js";
import Notification from "../notification.js";
import Otp from "../otp.js";

// Goal to Skill
Goal.hasMany(Skill, {
  foreignKey: "goal_id",
  as: "skills",
  onDelete: "CASCADE",
  onUpdate: "CASCADE",
});

Skill.belongsTo(Goal, {
  foreignKey: "goal_id",
  as: "goal",
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

// Exam to CourseLevel
Exam.belongsTo(CourseLevel, {
  foreignKey: "level_id",
  as: "level",
  onDelete: "SET NULL",
  onUpdate: "CASCADE",
});

// Setup functions
export const setupGoalSkillAssociations = () => {
  Goal.hasMany(Skill, {
    foreignKey: "goal_id",
    as: "skills",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });

  Skill.belongsTo(Goal, {
    foreignKey: "goal_id",
    as: "goal",
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  });
};

export const setupSkillCategoryAssociations = () => {
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
};

export const setupRatingModerationAssociations = () => {
  CourseRating.belongsTo(User, {
    foreignKey: "moderatedBy",
    as: "moderator",
  });

  User.hasMany(CourseRating, {
    foreignKey: "moderatedBy",
    as: "moderatedCourseRatings",
  });

  InstructorRating.belongsTo(User, {
    foreignKey: "moderatedBy",
    as: "moderator",
  });

  User.hasMany(InstructorRating, {
    foreignKey: "moderatedBy",
    as: "moderatedInstructorRatings",
  });

  ProjectRating.belongsTo(User, {
    foreignKey: "moderatedBy",
    as: "moderator",
  });

  User.hasMany(ProjectRating, {
    foreignKey: "moderatedBy",
    as: "moderatedProjectRatings",
  });
};

export const setupExamAssociations = () => {
  Exam.belongsTo(CourseLevel, {
    foreignKey: "level_id",
    as: "level",
    onDelete: "SET NULL",
    onUpdate: "CASCADE",
  });
};

export const setupLiveSessionAssociations = () => {
  LiveSession.hasMany(LiveSessionParticipant, {
    foreignKey: "liveSessionId",
    as: "participants",
    onDelete: "CASCADE",
  });

  LiveSessionParticipant.belongsTo(LiveSession, {
    foreignKey: "liveSessionId",
    as: "liveSession",
  });

  LiveSession.hasMany(RaisedHand, {
    foreignKey: "liveSessionId",
    as: "raisedHands",
    onDelete: "CASCADE",
  });

  RaisedHand.belongsTo(LiveSession, {
    foreignKey: "liveSessionId",
    as: "liveSession",
  });
};

export const setupNewsAssociations = () => {
  // News associations would go here if needed
};

export const setupNotificationAssociations = () => {
  // Notification associations would go here if needed
};

export const setupOtpAssociations = () => {
  // OTP associations would go here if needed
};

export const setupSettingsAssociations = () => {
  // Settings associations would go here if needed
};

export { Category, Skill, Goal, CourseLevel, Banner, Settings, SearchAnalytics, Exam, User, CourseRating, InstructorRating, ProjectRating, LiveSession, LiveSessionParticipant, RaisedHand, News, Notification, Otp };