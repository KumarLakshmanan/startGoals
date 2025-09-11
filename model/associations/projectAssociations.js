// ===================== PROJECT ASSOCIATIONS =====================

import Project from "../project.js";
import Category from "../category.js";
import ProjectGoal from "../projectGoal.js";
import Goal from "../goal.js";
import ProjectFile from "../projectFile.js";
import User from "../user.js";
import ProjectPurchase from "../projectPurchase.js";
import DiscountCode from "../discountCode.js";
import ProjectRating from "../projectRating.js";
import ProjectTechStack from "../projectTechStack.js";
import Skill from "../skill.js";
import ProjectLanguage from "../projectLanguage.js";
import Language from "../language.js";
import ProjectInstructor from "../projectInstructor.js";
import DiscountUsage from "../discountUsage.js";
import Banner from "../banner.js";
import CourseLevel from "../courseLevel.js";

// Project to Category
Project.belongsTo(Category, {
  foreignKey: "categoryId",
  as: "category",
});

Category.hasMany(Project, {
  foreignKey: "categoryId",
  as: "projects",
});

// Project to CourseLevel
CourseLevel.hasMany(Project, {
  foreignKey: "levelId",
  as: "projects",
  onDelete: "SET NULL",
});

Project.belongsTo(CourseLevel, {
  foreignKey: "levelId",
  as: "level",
});

// Project to ProjectGoal
Project.hasMany(ProjectGoal, {
  foreignKey: "projectId",
  as: "goals",
  onDelete: "CASCADE",
});

ProjectGoal.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

// Goal to ProjectGoal
Goal.hasMany(ProjectGoal, {
  foreignKey: "goalId",
  as: "projectGoals",
  onDelete: "CASCADE",
});

ProjectGoal.belongsTo(Goal, {
  foreignKey: "goalId",
  as: "goal",
});

// Project to ProjectFile
Project.hasMany(ProjectFile, {
  foreignKey: "projectId",
  as: "files",
  onDelete: "CASCADE",
});

ProjectFile.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

// Project to ProjectPurchase
Project.hasMany(ProjectPurchase, {
  foreignKey: "projectId",
  as: "purchases",
  onDelete: "CASCADE",
});

ProjectPurchase.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

// ProjectPurchase to DiscountCode associations are handled in paymentAssociations.js

// ProjectPurchase to ProjectRating
ProjectPurchase.hasOne(ProjectRating, {
  foreignKey: "purchaseId",
  as: "rating",
});

ProjectRating.belongsTo(ProjectPurchase, {
  foreignKey: "purchaseId",
  as: "purchase",
});

// Project to ProjectRating
Project.hasMany(ProjectRating, {
  foreignKey: "projectId",
  as: "ratings",
  onDelete: "CASCADE",
});

ProjectRating.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

// Project to ProjectTechStack
Project.hasMany(ProjectTechStack, { as: "techStack", foreignKey: "projectId" });
ProjectTechStack.belongsTo(Project, { foreignKey: "projectId" });

ProjectTechStack.belongsTo(Skill, { foreignKey: "skillId", as: "skill" });

// Project to ProjectLanguage
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

// Project to ProjectInstructor
Project.hasMany(ProjectInstructor, {
  foreignKey: "projectId",
  as: "projectInstructors",
  onDelete: "CASCADE",
});

ProjectInstructor.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
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

// Project to DiscountUsage
Project.hasMany(DiscountUsage, {
  foreignKey: "projectId",
  as: "discountUsages",
});

DiscountUsage.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

// Project to Banner
Project.belongsTo(Banner, {
  foreignKey: "bannerId",
  as: "banner",
  onDelete: "SET NULL",
});

Banner.hasMany(Project, {
  foreignKey: "bannerId",
  as: "projects",
});

// Setup functions
// export const setupProjectBannerAssociations = () => {
//   Project.belongsTo(Banner, {
//     foreignKey: "bannerId",
//     as: "banner",
//     onDelete: "SET NULL",
//   });

//   Banner.hasMany(Project, {
//     foreignKey: "bannerId",
//     as: "projects",
//   });
// };

export { Project, Category, ProjectGoal, Goal, ProjectFile, User, ProjectPurchase, DiscountCode, ProjectRating, ProjectTechStack, Skill, ProjectLanguage, Language, ProjectInstructor, DiscountUsage, Banner, CourseLevel };