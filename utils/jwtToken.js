import jwt from "jsonwebtoken";

export const generateToken = (user) => {
  return jwt.sign({ id: user.userId, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};
