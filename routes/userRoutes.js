import express from "express";
import {
  userLogin,
  userRegistration,
  googleCallback,
  getUserDetails,
} from "../controller/userController.js";
import passport from "passport";

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
userRoutes.get("/auth/callback/success", googleCallback);
userRoutes.get("/usersDetailsById/:userId", getUserDetails);

export default userRoutes;
