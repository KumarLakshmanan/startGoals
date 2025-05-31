import User from "../model/user.js";
import Skill from "../model/skill.js";
import Language from "../model/language.js";
import Goal from "../model/goal.js";
import { generateToken } from "../utils/jwtToken.js";
import sequelize from "../config/db.js";
import {
  validateEmail,
  validateMobile,
} from "../utils/commonUtils.js";
import bcrypt from "bcrypt";

// ✅ OTP-related imports
import { sendOtp } from "../utils/sendOtp.js";

export const userRegistration = async (req, res) => {
  const trans = await sequelize.transaction();

  try {
    const { username, email, mobile, password, role } = req.body;

    if (!email && !mobile) {
      return res.status(400).json({
        message: "Email or mobile number is required",
        status: false,
      });
    }

    // ✅ Password is required only if role is not 'student'
    if (role !== "student" && !password) {
      return res.status(400).json({
        message: "Password is required for non-student roles",
        status: false,
      });
    }

    if (email && !validateEmail(email)) {
      return res
        .status(400)
        .json({ message: "Invalid email format", status: false });
    }

    if (mobile && !validateMobile(mobile)) {
      return res
        .status(400)
        .json({ message: "Invalid mobile number format", status: false });
    }

    const existingUser = await User.findOne({
      where: {
        ...(email && { email }),
        ...(mobile && { mobile }),
      },
    });

    if (existingUser) {
      return res
        .status(409)
        .json({ message: "User already exists", status: false });
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

    const newUser = await User.create(
      {
        username,
        email: email || null,
        mobile: mobile || null,
        password: hashedPassword,
        role,
        isVerified: false,
        provider: "local",
      },
      { transaction: trans }
    );

    const identifier = email || mobile;

    await sendOtp(identifier); // Rollback happens on failure

    await trans.commit();

    return res.status(201).json({
      message: `OTP sent to ${identifier}`,
      status: true,
    });
  } catch (error) {
    await trans.rollback();
    console.error("Registration error:", error);
    return res.status(500).json({
      message: "Server error during registration",
      error: error.message,
      status: false,
    });
  }
};

// ✅ User Login
export const userLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier) {
      return res.status(400).json({
        message: "Email or mobile is required.",
        status: false,
      });
    }
    let user;

    // Determine if identifier is email or mobile
    if (validateEmail(identifier)) {
      user = await User.findOne({ where: { email: identifier } });
    } else if (validateMobile(identifier)) {
      user = await User.findOne({ where: { mobile: identifier } });
    } else {
      return res.status(400).json({
        message: "Invalid email or mobile number format.",
        status: false,
      });
    }

    // Check if user exists
    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials.",
        status: false,
      });
    }

    // ✅ Check if the user is verified
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Account not verified. Please verify before logging in.",
        status: false,
      });
    }

    if (user.role === "student") {
      // 🟰 For student, send OTP immediately instead of checking password

      // Send OTP
      await sendOtp(identifier); // ✅ sending OTP via utils/sendOtp.js

      return res.status(200).json({
        message: `OTP sent to ${identifier}. Please verify OTP to continue.`,
        status: true,
        needOtpVerification: true, // frontend can use this flag
      });
    } else {
      // 🔒 Other roles require password

      if (!password) {
        return res.status(400).json({
          message: "Password is required for this user.",
          status: false,
        });
      }

      // ✅ Check password match
      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return res.status(401).json({
          message: "Invalid credentials.",
          status: false,
        });
      }

      // ✅ Generate and send token
      const token = generateToken(user);

      // Track first login status
      const isFirstLogin = user.firstLogin;

      if (isFirstLogin) {
        await user.update({ firstLogin: false }); // Mark as logged in
      }

      return res.status(200).json({
        message: "Login successful.",
        success: true,
        data: {
          userId: user.userId,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          token,
          isVerified: user.isVerified,
          firstTimeLogin: isFirstLogin,
        },
      });
    }
  } catch (error) {
    return res.status(500).json({ message: error.message, status: false });
  }
};

export const googleCallback = async (req, res) => {
  try {
    // Validate if user data is present from Google
    if (!req.user || !req.user._json) {
      return res.status(400).json({
        status: false,
        message: "Google login failed. No user info received.",
      });
    }

    const profile = req.user._json;

    console.log(profile);

    // Validate necessary fields from profile
    if (!profile.email || !profile.name) {
      return res.status(400).json({
        status: false,
        message: "Required Google profile information is missing.",
      });
    }

    // Check if user exists in DB
    let user = await User.findOne({ where: { email: profile.email } });

    // If not, create the user
    if (!user) {
      user = await User.create({
        username: profile.name,
        email: profile.email,
        profileImage: profile.picture || null,
        googleId: profile.sub, // Save Google user ID here
        provider: "google",
        isVerified: true,
        role: "student",
        firstLogin: true,
      });
      // Generate a JWT token for the user
      const token = generateToken(user);

      return res.redirect(
        `http://localhost:3000/google-login-success?token=${token}&status=true`
      );
    }

    // Generate a JWT token for the user
    const token = generateToken(user);

    // Redirect or respond with token
    // For redirect:
    return res.redirect(
      `http://localhost:3000/google-login-success?token=${token}&status=true`
    );

    // Or to send a direct response (if frontend expects JSON):
    // return res.status(200).json({
    //   status: true,
    //   message: "Login successful",
    //   token,
    //   user: {
    //     id: user.id,
    //     username: user.username,
    //     email: user.email,
    //     profileImage: user.profileImage,
    //     role: user.role,
    //   },
    // });
  } catch (error) {
    console.error("Google callback error:", error);
    return res.status(500).json({
      status: false,
      message: "An internal error occurred during Google authentication",
      error: error.message,
    });
  }
};

// ✅ Add User Skills
export const addUserSkills = async (req, res) => {
  try {
    const user = req.user;
    const { skillIds } = req.body;

    if (!Array.isArray(skillIds) || skillIds.length === 0) {
      return res.status(400).json({
        message: "skillIds must be a non-empty array",
        status: false,
      });
    }

    const skills = await Skill.findAll({ where: { id: skillIds } });

    if (skills.length !== skillIds.length) {
      return res.status(404).json({
        message: "One or more skills not found",
        status: false,
      });
    }

    const existingSkills = await user.getSkills({ attributes: ["id"] });
    const existingSkillIds = existingSkills.map((s) => s.id);
    const newSkillIds = skillIds.filter((id) => !existingSkillIds.includes(id));

    if (newSkillIds.length > 0) {
      await user.addSkills(newSkillIds);
    }

    return res.status(200).json({
      status: true,
      message: "Skills updated successfully",
    });
  } catch (err) {
    console.error("Add skills error:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

// ✅ Get User Skills
export const getUserSkills = async (req, res) => {
  try {
    const user = req.user;

    if (!user?.isVerified) {
      return res.status(403).json({
        message: "User not verified",
        status: false,
      });
    }

    // Reload user with associated skills (eager loading)
    const userWithSkills = await User.findOne({
      where: { id: user.id },
      include: [
        {
          model: Skill,
          as: "skills", // 👈 Must match association alias
          attributes: ["id", "skill"],
          through: { attributes: [] }, // hide junction table
        },
      ],
    });

    return res.status(200).json({
      status: true,
      message: "User skills fetched successfully",
      data: userWithSkills.skills,
    });
  } catch (err) {
    console.error("Get skills error:", err);
    res.status(500).json({ status: false, message: "Server error" });
  }
};

//user details by userId , languages ,goals ,skill will also come
export const getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: { exclude: ["password"] }, // Optional: Hide sensitive data
      include: [
        {
          model: Language,
          as: "languages", // 👈 Use alias if defined in association
          through: { attributes: [] }, // Exclude join table fields
        },
        {
          model: Goal,
          as: "goal", // 👈 Use alias if defined
        },
        {
          model: Skill,
          as: "skills", // 👈 Use alias if defined
          through: { attributes: [] },
        },
      ],
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: true,
      message: "User details fetched successfully",
      data: user,
    });
  } catch (error) {
    console.error("Error fetching user details:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching user details",
      error: error.message,
    });
  }
};
