// ===================== CONTENT ASSOCIATIONS =====================

import News from "../news.js";
import User from "../user.js";
import CourseChat from "../courseChat.js";
import Course from "../course.js";
import LiveSession from "../liveSession.js";
import LiveSessionParticipant from "../liveSessionParticipant.js";
import RaisedHand from "../raisedHand.js";
import Wishlist from "../wishlist.js";
import Cart from "../cart.js";
import Project from "../project.js";

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

User.hasMany(CourseChat, {
  foreignKey: "senderId",
  as: "sentMessages",
  onDelete: "CASCADE",
});

CourseChat.belongsTo(User, {
  foreignKey: "senderId",
  as: "sender",
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

// Live Session associations
LiveSession.hasMany(LiveSessionParticipant, {
  foreignKey: "liveSessionId",
  as: "participants",
  onDelete: "CASCADE",
});

LiveSessionParticipant.belongsTo(LiveSession, {
  foreignKey: "liveSessionId",
  as: "liveSession",
});

User.hasMany(LiveSessionParticipant, {
  foreignKey: "userId",
  as: "liveSessionParticipations",
  onDelete: "CASCADE",
});

LiveSessionParticipant.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Raised Hand associations
LiveSession.hasMany(RaisedHand, {
  foreignKey: "liveSessionId",
  as: "raisedHands",
  onDelete: "CASCADE",
});

RaisedHand.belongsTo(LiveSession, {
  foreignKey: "liveSessionId",
  as: "liveSession",
});

User.hasMany(RaisedHand, {
  foreignKey: "userId",
  as: "raisedHands",
  onDelete: "CASCADE",
});

RaisedHand.belongsTo(User, {
  foreignKey: "userId",
  as: "user",
});

// Wishlist associations
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

// Cart associations
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

// Setup functions
export const setupWishlistAssociations = () => {
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
};

export const setupCartAssociations = () => {
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
};

export const setupAddressAssociations = () => {
  // Address associations are handled in userAssociations.js
};

export { News, User, CourseChat, Course, LiveSession, LiveSessionParticipant, RaisedHand, Wishlist, Cart, Project };