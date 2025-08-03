import express from "express";
import {
  validateOtp,
  resendOtp,
  sendResetOtp,
  verifyResetOtp,
  resetPassword,
} from "../controller/otpController.js";
const otpRoutes = express.Router();

//Route for user after registration -- OTP for verification
otpRoutes.post("/verify-otp", validateOtp);

//Route for user to resend the OTP during registration
otpRoutes.post("/resend-otp", resendOtp);

// 👇 Password reset routes
otpRoutes.post("/send-reset-otp", sendResetOtp);
otpRoutes.post("/verify-reset-otp", verifyResetOtp);
otpRoutes.post("/reset-password", resetPassword);
export default otpRoutes;
