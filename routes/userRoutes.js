import express from "express";
import {
  userLogin,
  userRegistration,
  googleCallback,
  getUserDetails,
  getHomePage,
} from "../controller/userController.js";
import passport from "passport";
import { authenticateToken } from "../middleware/authMiddleware.js";

const userRoutes = express.Router();

userRoutes.post("/userRegistration", userRegistration);
userRoutes.post("/userLogin", userLogin);
userRoutes.get(
  "/googleLogin",
  passport.authenticate("google", { scope: ["profile", "email"] })
);
userRoutes.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/api/auth/callback/success",
    failureRedirect: "/login",
  })
);
userRoutes.get("/auth/callback/success", authenticateToken, googleCallback);
userRoutes.get("/usersDetailsById/:userId", authenticateToken, getUserDetails);
userRoutes.get("/homepage", authenticateToken, getHomePage);

export default userRoutes;
