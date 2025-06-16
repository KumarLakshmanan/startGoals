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
import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import { generateOtp } from "../utils/commonUtils.js";

const OTP_EXPIRY_MINUTES = 5;


// ✅ Send OTP (initial or for password reset)
export const sendOtpApi = async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res
        .status(400)
        .json({ status: false, message: "Identifier is required" });
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
      }
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

    res.json({ status: true, message: `OTP sent via ${method}` });
  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ status: false, error: "Failed to send OTP" });
  }
};

// // ✅ Validate OTP (for verification)
// export async function validateOtp(req, res) {
//   try {
//     const { identifier, otp } = req.body;

//     const isValid = await verifyOtp(identifier, otp);
//     if (!isValid) {
//       return res.status(400).json({
//         error: "Invalid or expired OTP",
//         status: false,
//       });
//     }

//     const user = await User.findOne({
//       where: {
//         [Op.or]: [{ email: identifier }, { mobile: identifier }],
//       },
//     });

//     if (!user) {
//       return res.status(404).json({
//         error: "User not found",
//         status: false,
//       });
//     }

//     if (user.isVerified) {
//       return res.json({
//         message: "Account already verified",
//         status: true,
//       });
//     }

//     user.isVerified = true;
//     await user.save();

//     return res.json({
//       message: "Login successful",
//       status: true,
//       user: {
//         id: user.id,
//         username: user.username,
//         email: user.email,
//         mobile: user.mobile,
//         isVerified: user.isVerified,
//       },
//     });
//   } catch (err) {
//     console.error("Error validating OTP:", err);
//     res.status(500).json({
//       error: "Internal server error during OTP verification",
//       status: false,
//     });
//   }
// }

// ✅ Resend OTP
export async function resendOtp(req, res) {
  const { identifier, method } = req.body;

  try {
    const lastSent = await getLastSentTime(identifier);
    if (lastSent) {
      const now = new Date();
      const diff = (now - lastSent) / 1000;
      if (diff < 60) {
        return res.status(429).json({
          status: false,
          error: `Please wait ${
            60 - Math.floor(diff)
          } seconds before resending`,
        });
      }
    }

    await sendOtp(identifier);
    res.json({
      success: true,
      message: `OTP sent to ${identifier}`,
      status: true,
    });
  } catch (err) {
    console.error("Error resending OTP:", err);
    res.status(500).json({ status: false, error: "Failed to resend OTP" });
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
      return res.status(404).json({ error: "User not found" });
    }

    const lastSent = await getLastSentTime(identifier);
    if (lastSent) {
      const now = new Date();
      const diff = (now - lastSent) / 1000;
      if (diff < 60) {
        return res.status(429).json({
          error: `Please wait ${60 - Math.floor(diff)} seconds before retrying`,
        });
      }
    }

    const otp = generateOtp();
    await createOtpEntry(identifier, otp);

    if (method === "email") await sendEmailOtp(identifier, otp);
    else await sendSmsOtp(identifier, otp);

    res.json({
      message: `Password reset OTP sent via ${method}`,
      success: true,
    });
  } catch (err) {
    console.error("Error sending reset OTP:", err);
    res.status(500).json({ error: "Failed to send password reset OTP" });
  }
}

//Verify-password-reset-otp

export async function verifyResetOtp(req, res) {
  const { identifier, otp } = req.body;

  try {
    const isValid = await verifyOtp(identifier, otp);
    if (!isValid) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: identifier }, { mobile: identifier }],
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // ✅ Mark user eligible for password reset
    user.passwordResetVerified = true;
    await user.save();

    res.json({ success: true, message: "OTP verified for password reset" });
  } catch (err) {
    console.error("Error verifying reset OTP:", err);
    res.status(500).json({ error: "Internal server error" });
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
      return res.status(404).json({ error: "User not found" });
    }

    // ❌ Block reset if OTP not verified
    if (!user.passwordResetVerified) {
      return res
        .status(403)
        .json({ error: "OTP verification required before resetting password" });
    }

    // ✅ Proceed with reset
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordResetVerified = false; // Invalidate OTP use
    await user.save();

    return res.json({ success: true, message: "Password reset successfully" });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
}

export async function validateOtp(req, res) {
  try {
    const { identifier, otp } = req.body;

    const isValid = await verifyOtp(identifier, otp);
    if (!isValid) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
        status: false,
        success: false,
        data: null,
      });
    }

    // ✅ OTP valid: now fetch user
    const user = await User.findOne({
      where: {
        [Op.or]: [{ email: identifier }, { mobile: identifier }],
      },
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
        status: false,
        success: false,
        data: null,
      });
    }

    // ✅ Update user verification if needed
    if (!user.isVerified) {
      user.isVerified = true;
      await user.save();
    }

    // ✅ Generate token
    const token = generateToken(user);

    return res.status(200).json({
      message: "OTP verification successful",
      status: true,
      success: true,
      data: {
        userId: user.userId,
        name: user.username || user.firstName || user.email,
        email: user.email,
        mobile: user.mobile,
        profileImage: user.profileImage,
        role: user.role,
        isVerified: user.isVerified,
        firstTimeLogin: user.firstLogin,
        token,
      },
    });
  } catch (err) {
    console.error("Error validating OTP:", err);
    return res.status(500).json({
      message: "Internal server error during OTP verification",
      status: false,
      success: false,
      data: null,
      error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error',
    });
  }
}
