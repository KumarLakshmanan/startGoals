import Otp from "../model/otp.js";
import { generateToken } from "../utils/jwtToken.js";
import {
  sendEmailOtp,
  sendSmsOtp,
  verifyOtp,
  getLastSentTime,
  sendOtp,
} from "../utils/sendOtp.js";
import User from "../model/user.js";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendUnauthorized,
  sendForbidden,
  sendServerError,
  sendConflict
} from "../utils/responseHelper.js";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import { generateOtp } from "../utils/commonUtils.js";

const OTP_EXPIRY_MINUTES = 5;

// ✅ Send OTP (initial or for password reset)
export const sendOtpApi = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return sendValidationError(res, "Identifier is required", {
        identifier: "Required field"
      });
    }

    // Determine delivery method based on identifier format
    let deliveryMethod = "email";
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    if (!isEmail) deliveryMethod = "sms";

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60000);

    // Expire old OTPs
    await Otp.update(
      { status: "expired" },
      {
        where: {
          identifier,
          status: "active",
        },
      },
    );
    // 2️⃣ Soft delete expired or used OTPs
    await Otp.destroy({
      where: {
        identifier,
        status: {
          [Op.in]: ["expired", "used"],
        },
      },
    });
    await Otp.create({
      id: uuidv4(),
      identifier,
      otp: hashedOtp,
      expiresAt,
      deliveryMethod,
    });

    if (deliveryMethod === "email") await sendEmailOtp(identifier, otp);
    else await sendSmsOtp(identifier, otp);

    return sendSuccess(res, 200, `OTP sent via ${method}`);
  } catch (err) {
    console.error("Error sending OTP:", err);
    return sendServerError(res, err);
  }
};
// ✅ Resend OTP
export async function resendOtp(req, res) {
  const { identifier, method } = req.body;

  try {
    const lastSent = await getLastSentTime(identifier);
    if (lastSent) {
      const now = new Date();
      const diff = (now - lastSent) / 1000;
      if (diff < 60) {
        return sendError(res, 429, `Please wait ${60 - Math.floor(diff)} seconds before resending`);
      }
    }

    await sendOtp(identifier);
    return sendSuccess(res, 200, `OTP sent to ${identifier}`);
  } catch (err) {
    console.error("Error resending OTP:", err);
    return sendServerError(res, err);
  }
}

// ✅ Send OTP for Password Reset
export async function sendResetOtp(req, res) {
  const { identifier, method } = req.body;

  try {
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: identifier }, { mobile: identifier }],
      },
    });

    if (!user) {
      return sendNotFound(res, "User not found");
    }

    const lastSent = await getLastSentTime(identifier);
    if (lastSent) {
      const now = new Date();
      const diff = (now - lastSent) / 1000;
      if (diff < 60) {
        return sendError(res, 429, `Please wait ${60 - Math.floor(diff)} seconds before retrying`);
      }
    }

    const otp = generateOtp();
    await createOtpEntry(identifier, otp);

    if (method === "email") await sendEmailOtp(identifier, otp);
    else await sendSmsOtp(identifier, otp);

    return sendSuccess(res, 200, `Password reset OTP sent via ${method}`);
  } catch (err) {
    console.error("Error sending reset OTP:", err);
    return sendServerError(res, err);
  }
}

//Verify-password-reset-otp

export async function verifyResetOtp(req, res) {
  const { identifier, otp } = req.body;

  try {
    const isValid = await verifyOtp(identifier, otp);
    if (!isValid) {
      return sendValidationError(res, "Invalid or expired OTP");
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: identifier }, { mobile: identifier }],
      },
    });

    if (!user) {
      return sendNotFound(res, "User not found");
    }

    // ✅ Mark user eligible for password reset
    user.passwordResetVerified = true;
    await user.save();

    return sendSuccess(res, 200, "OTP verified for password reset");
  } catch (err) {
    console.error("Error verifying reset OTP:", err);
    return sendServerError(res, err);
  }
}

export async function resetPassword(req, res) {
  const { identifier, newPassword } = req.body;

  try {
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: identifier }, { mobile: identifier }],
      },
    });

    if (!user) {
      return sendNotFound(res, "User not found");
    }

    // ❌ Block reset if OTP not verified
    if (!user.passwordResetVerified) {
      return sendError(res, 403, "OTP verification required before resetting password");
    }

    // ✅ Proceed with reset
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordResetVerified = false; // Invalidate OTP use
    await user.save();

    return sendSuccess(res, 200, "Password reset successfully");
  } catch (err) {
    console.error("Error resetting password:", err);
    return sendServerError(res, err);
  }
}

export async function validateOtp(req, res) {
  try {
    const { identifier, otp, androidRegId, iosRegId } = req.body;

    const isValid = await verifyOtp(identifier, otp);
    if (!isValid) {
      return sendValidationError(res, "Invalid or expired OTP");
    }

    // ✅ OTP valid: now fetch user
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: identifier }, { mobile: identifier }],
      },
    });

    if (!user) {
      return sendNotFound(res, "User not found");
    }

    // ✅ Update user verification if needed
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    // Update registration IDs if provided
    if (androidRegId || iosRegId) {
      await user.update({
        androidRegId: androidRegId || user.androidRegId,
        iosRegId: iosRegId || user.iosRegId
      });
    }

    // ✅ Generate token
    const token = generateToken(user);

    const responseData = {
      userId: user.userId,
      name: user.username || user.firstName || user.email,
      email: user.email,
      mobile: user.mobile,
      profileImage: user.profileImage,
      role: user.role,
      isVerified: user.isVerified,
      firstTimeLogin: user.firstLogin,
      token,
    };

    return sendSuccess(res, 200, "OTP verification successful", responseData);
  } catch (err) {
    console.error("Error validating OTP:", err);
    return sendServerError(res, err);
  }
}
