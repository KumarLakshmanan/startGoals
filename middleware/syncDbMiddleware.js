import dotenv from "dotenv";
dotenv.config();

// Middleware to protect database synchronization routes
export const syncDbMiddleware = (req, res, next) => {
  // In production, only allow specific users or admins to access these routes
  if (process.env.NODE_ENV === "production") {
    // Check for authentication and admin role
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required to access database synchronization tools",
      });
    }

    // Check if user has admin role
    const user = req.user;
    if (!user || !user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Admin access required to use database synchronization tools",
      });
    }
  }

  // If in development or authorized in production, allow access
  next();
};
