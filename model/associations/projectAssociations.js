import Project from "../project.js";
import ProjectFile from "../projectFile.js";
import ProjectPurchase from "../projectPurchase.js";
import ProjectRating from "../projectRating.js";
import User from "../user.js";
import CourseCategory from "../courseCategory.js";
import CourseTag from "../courseTag.js";
import Language from "../language.js";

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

Project.belongsToMany(CourseTag, {
  through: "project_tags",
  foreignKey: "projectId",
  otherKey: "tagId",
  as: "projectTags",
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
};
