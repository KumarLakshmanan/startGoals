import jwt from "jsonwebtoken";
import User from "../model/user.js";
import LiveSession from "../model/liveSession.js"; // Added for isSessionInstructor

export const authenticateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res
      .status(401)
      .json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded JWT:", decoded); // Debugging line to check token payload
    // ✅ Fetch full user from DB with isVerified and other fields
    const user = await User.findByPk(decoded.id); // assumes `id` is in token payload

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    req.user = user; // Full Sequelize user instance available in all routes
    next();
  } catch (error) {
    console.error("JWT error:", error);
    res.status(401).json({ message: "Invalid or expired token." });
  }
};

// General role check middleware factory
export const checkRole = (allowedRoles) => {
  return (req, res, next) => {
    authenticateToken(req, res, () => {
      // Ensure user is authenticated first
      if (!req.user || !req.user.role) {
        return res
          .status(403)
          .json({
            status: false,
            message: "Forbidden: Role information missing.",
          });
      }
      if (allowedRoles.includes(req.user.role.toLowerCase())) {
        return next();
      }
      return res
        .status(403)
        .json({
          status: false,
          message: `Forbidden: Access restricted to ${allowedRoles.join("/")} roles.`,
        });
    });
  };
};

// ["admin", "owner", "teacher", "student"]
export const isStudent = checkRole(["owner", "admin", "teacher", "student"]);
export const isTeacher = checkRole(["admin", "owner", "teacher"]);
export const isAdmin = checkRole(["owner", "admin"]);
export const isOwner = checkRole(["owner"]);

// Middleware to check if the user is the instructor of the specific session
export const isSessionInstructor = async (req, res, next) => {
  authenticateToken(req, res, async () => {
    // Ensure user is authenticated first
    const { sessionId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      // This case should ideally be caught by authenticateToken already
      return res
        .status(401)
        .json({ status: false, message: "Unauthorized: User ID missing." });
    }

    if (!sessionId) {
      return res
        .status(400)
        .json({
          status: false,
          message: "Session ID is required for this authorization check.",
        });
    }

    try {
      const session = await LiveSession.findOne({ where: { sessionId } });

      if (!session) {
        return res
          .status(404)
          .json({ status: false, message: "Session not found." });
      }

      // Check if the authenticated user is the creator of the session or has a general admin/host role
      if (
        session.createdBy === userId ||
        ["admin", "host", "instructor"].includes(req.user.role.toLowerCase())
      ) {
        return next();
      }

      return res
        .status(403)
        .json({
          status: false,
          message: "Forbidden: You are not authorized to manage this session.",
        });
    } catch (error) {
      console.error("Error in isSessionInstructor middleware:", error);
      return res
        .status(500)
        .json({
          status: false,
          message: "Internal server error during session authorization.",
        });
    }
  });
};

// Optional authentication middleware - doesn't fail if no token provided
export const optionalAuth = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1]; // Bearer <token>

  if (!token) {
    // No token provided, continue without user
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id);

    if (user) {
      req.user = user; // Full Sequelize user instance
    } else {
      req.user = null; // User not found, but don't fail
    }
    next();
  } catch (error) {
    console.error("Optional auth error:", error);
    // Token is invalid or expired, but don't fail - just continue without user
    // Invalid token, but don't fail - just continue without user
    req.user = null;
    next();
  }
};
