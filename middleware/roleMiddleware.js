export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ message: "Access denied" });
      }
      next();
    } catch (error) {
      res
        .status(500)
        .json({ error: error.message, message: "somthing went wrong" });
    }
  };
};
