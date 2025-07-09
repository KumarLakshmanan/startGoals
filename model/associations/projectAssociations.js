import Project from "../project.js";
import ProjectFile from "../projectFile.js";
import ProjectPurchase from "../projectPurchase.js";
import ProjectRating from "../projectRating.js";
import User from "../user.js";
import CourseCategory from "../courseCategory.js";
import CourseTag from "../courseTag.js";
import Language from "../language.js";
import Goal from "../goal.js";
import Skill from "../skill.js";
import CourseLevel from "../courseLevel.js";
import ProjectGoal from "./projectGoal.js";
import ProjectTechStack from "./projectTechStack.js";
import ProjectProgrammingLanguage from "./projectProgrammingLanguage.js";

// Project associations
Project.belongsTo(User, {
  foreignKey: "createdBy",
  as: "creator",
});

Project.belongsTo(User, {
  foreignKey: "linkedTeacherId",
  as: "linkedTeacher",
});

Project.belongsTo(CourseCategory, {
  foreignKey: "categoryId",
  as: "category",
});

Project.belongsTo(Language, {
  foreignKey: "languageId",
  as: "language",
});

Project.belongsTo(CourseLevel, {
  foreignKey: "levelId",
  as: "level",
});

Project.belongsToMany(CourseTag, {
  through: "project_tags",
  foreignKey: "projectId",
  otherKey: "tagId",
  as: "projectTags",
});

// Project goals association
Project.belongsToMany(Goal, {
  through: ProjectGoal,
  foreignKey: "projectId",
  otherKey: "goalId",
  as: "goals",
});

Goal.belongsToMany(Project, {
  through: ProjectGoal,
  foreignKey: "goalId",
  otherKey: "projectId",
  as: "projects",
});

// Project tech stack association
Project.belongsToMany(Skill, {
  through: ProjectTechStack,
  foreignKey: "projectId",
  otherKey: "skillId",
  as: "techStackSkills",
});

Skill.belongsToMany(Project, {
  through: ProjectTechStack,
  foreignKey: "skillId",
  otherKey: "projectId",
  as: "techStackProjects",
});

// Project programming languages association
Project.belongsToMany(Skill, {
  through: ProjectProgrammingLanguage,
  foreignKey: "projectId",
  otherKey: "skillId",
  as: "programmingLanguageSkills",
});

Skill.belongsToMany(Project, {
  through: ProjectProgrammingLanguage,
  foreignKey: "skillId",
  otherKey: "projectId",
  as: "programmingLanguageProjects",
});

// Project files association
Project.hasMany(ProjectFile, {
  foreignKey: "projectId",
  as: "files",
});

ProjectFile.belongsTo(Project, {
  foreignKey: "projectId",
});

ProjectFile.belongsTo(User, {
  foreignKey: "uploadedBy",
  as: "uploader",
});

// Project purchase associations
Project.hasMany(ProjectPurchase, {
  foreignKey: "projectId",
  as: "purchases",
});

ProjectPurchase.belongsTo(Project, {
  foreignKey: "projectId",
});

ProjectPurchase.belongsTo(User, {
  foreignKey: "userId",
  as: "buyer",
});

// Project rating associations
Project.hasMany(ProjectRating, {
  foreignKey: "projectId",
  as: "ratings",
});

ProjectRating.belongsTo(Project, {
  foreignKey: "projectId",
  as: "project",
});

ProjectRating.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

ProjectRating.belongsTo(ProjectPurchase, {
  foreignKey: "purchaseId",
  as: "purchase",
});

ProjectRating.belongsTo(User, {
  foreignKey: "moderatedBy",
  as: "moderator",
});

export default {
  Project,
  ProjectFile,
  ProjectPurchase,
  ProjectRating,
  ProjectGoal,
  ProjectTechStack,
  ProjectProgrammingLanguage
};
