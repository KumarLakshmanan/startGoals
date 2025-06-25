import User from "../model/user.js";
import Skill from "../model/skill.js";
import Language from "../model/language.js";
import Goal from "../model/goal.js";
import Batch from "../model/batch.js";
import BatchStudents from "../model/batchStudents.js";
import Enrollment from "../model/enrollment.js";
import CourseCategory from "../model/courseCategory.js";
import { generateToken } from "../utils/jwtToken.js";
import sequelize from "../config/db.js";
import { validateEmail, validateMobile } from "../utils/commonUtils.js";
import bcrypt from "bcrypt";

// ✅ OTP-related imports
import { sendOtp } from "../utils/sendOtp.js";
import Banner from "../model/banner.js";
import Category from "../model/courseCategory.js";
import Course from "../model/course.js";
import Settings from "../model/settings.js";
import { Op } from "sequelize";
import Exam from "../model/exam.js";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendServerError,
  sendConflict,
} from "../utils/responseHelper.js";

export const userRegistration = async (req, res) => {
  const trans = await sequelize.transaction();

  try {
    const { username, email, mobile, password, role } = req.body;

    if (!email && !mobile) {
      await trans.rollback();
      return sendValidationError(res, "Email or mobile number is required");
    }

    // ✅ Password is required only if role is not 'student'
    if (role !== "student" && !password) {
      await trans.rollback();
      return sendValidationError(res, "Password is required for non-student roles");
    }

    if (email && !validateEmail(email)) {
      await trans.rollback();
      return sendValidationError(res, "Invalid email format");
    }

    if (mobile && !validateMobile(mobile)) {
      await trans.rollback();
      return sendValidationError(res, "Invalid mobile number format");
    }
    // Check for existing email
    if (email) {
      const existingEmail = await User.findOne({
        where: { email },
        transaction: trans,
      });

      if (existingEmail) {
        await trans.rollback();
        return sendConflict(res, "email", email);
      }
    }

    // Check for existing mobile
    if (mobile) {
      const existingMobile = await User.findOne({
        where: { mobile },
        transaction: trans,
      });

      if (existingMobile) {
        await trans.rollback();
        return sendConflict(res, "mobile", mobile);
      }
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
      { transaction: trans },
    );

    const identifier = email || mobile;

    try {
      // Try to send OTP
      await sendOtp(identifier);
    } catch (otpError) {
      await trans.rollback();
      console.error("OTP sending error:", otpError);
      return sendServerError(res, { message: "Failed to send OTP. Please try again." });
    }

    await trans.commit();

    return sendSuccess(res, 200, `OTP sent to ${identifier}`);
  } catch (error) {
    await trans.rollback();
    console.error("Registration error:", error);
    return sendServerError(res, error);
  }
};

// ✅ User Login
export const userLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier) {
      return sendValidationError(res, "Email or mobile is required.");
    }

    let user;

    if (validateEmail(identifier)) {
      user = await User.findOne({ where: { email: identifier } });
    } else if (validateMobile(identifier)) {
      user = await User.findOne({ where: { mobile: identifier } });
    } else {
      return sendValidationError(res, "Invalid email or mobile number format.");
    }

    if (!user) {
      return sendUnauthorized(res, "Invalid credentials. Please check your email/mobile and password.");
    }

    if (!user.isVerified) {
      return sendForbidden(res, "Account not verified. Please verify your account before logging in.");
    }

    if (user.role === "student") {
      try {
        await sendOtp(identifier);
        return sendSuccess(res, 200, `OTP sent to ${identifier}. Please verify OTP to continue.`, {
          userId: user.userId,
          email: user.email,
          mobile: user.mobile,
          role: user.role,
          needOtpVerification: true,
        });
      } catch (otpError) {
        console.error("OTP sending error:", otpError);
        return sendServerError(res, { message: "Failed to send OTP. Please try again." });
      }
    } else {
      if (!password) {
        return sendValidationError(res, "Password is required.");
      }

      if (password.length < 6) {
        return sendValidationError(res, "Password must be at least 6 characters long.");
      }

      const isPasswordCorrect = await bcrypt.compare(password, user.password);
      if (!isPasswordCorrect) {
        return sendUnauthorized(res, "Invalid credentials. Please check your email/mobile and password.");
      }

      const token = generateToken(user);

      const isFirstLogin = user.firstLogin;

      if (isFirstLogin) {
        await user.update({ firstLogin: false });
      }

      return sendSuccess(res, 200, "Login successful.", {
        userId: user.userId,
        name: user.username || user.firstName || user.email,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        token,
        isVerified: user.isVerified,
        firstTimeLogin: isFirstLogin,
      });
    }
  } catch (error) {
    console.error("Login error:", error);
    return sendServerError(res, error);
  }
};

export const googleCallback = async (req, res) => {
  try {
    if (!req.user || !req.user._json) {
      return sendValidationError(res, "Google login failed. No user info received.");
    }

    const profile = req.user._json;

    if (!profile.email || !profile.name) {
      return sendValidationError(res, "Required Google profile information is missing.");
    }

    let user = await User.findOne({ where: { email: profile.email } });

    if (!user) {
      user = await User.create({
        username: profile.name,
        email: profile.email,
        profileImage: profile.picture || null,
        googleId: profile.sub,
        provider: "google",
        isVerified: true,
        role: "student",
        firstLogin: true,
      });
      const token = generateToken(user);

      return res.redirect(
        `http://localhost:3000/google-login-success?token=${token}&status=true`,
      );
    }

    const token = generateToken(user);

    return res.redirect(
      `http://localhost:3000/google-login-success?token=${token}&status=true`,
    );
  } catch (error) {
    console.error("Google callback error:", error);
    return sendServerError(res, error);
  }
};

// ✅ Add User Skills
export const addUserSkills = async (req, res) => {
  try {
    const user = req.user;
    const { skillIds } = req.body;

    if (!Array.isArray(skillIds) || skillIds.length === 0) {
      return sendValidationError(res, "skillIds must be a non-empty array");
    }

    const skills = await Skill.findAll({ where: { id: skillIds } });

    if (skills.length !== skillIds.length) {
      return sendNotFound(res, "One or more skills not found");
    }

    const existingSkills = await user.getSkills({ attributes: ["id"] });
    const existingSkillIds = existingSkills.map((s) => s.id);
    const newSkillIds = skillIds.filter((id) => !existingSkillIds.includes(id));

    if (newSkillIds.length > 0) {
      await user.addSkills(newSkillIds);
    }

    return sendSuccess(res, 200, "Skills updated successfully");
  } catch (err) {
    console.error("Add skills error:", err);
    return sendServerError(res, err);
  }
};

// ✅ Get User Skills
export const getUserSkills = async (req, res) => {
  try {
    const user = req.user;

    if (!user?.isVerified) {
      return sendForbidden(res, "User not verified");
    }

    const userWithSkills = await User.findOne({
      where: { id: user.id },
      include: [
        {
          model: Skill,
          as: "skills",
          attributes: ["id", "skill"],
          through: { attributes: [] },
        },
      ],
    });

    return sendSuccess(res, 200, "User skills fetched successfully", userWithSkills.skills);
  } catch (err) {
    console.error("Get skills error:", err);
    return sendServerError(res, err);
  }
};

//user details by userId , languages ,goals ,skill will also come
export const getUserDetails = async (req, res) => {
  try {
    let { userId } = req.params;

    if (!userId && req.user) {
      userId = req.user.userId;
    }

    if (!userId) {
      return sendValidationError(res, "User ID is required");
    }
    const userWithDetails = await User.findByPk(userId, {
      attributes: { exclude: ["password"] },
      include: [
        {
          model: Language,
          as: "languages",
          through: { attributes: [] },
        },
        {
          model: Goal,
          as: "goals",
          through: { attributes: [] },
        },
        {
          model: Skill,
          as: "skills",
          through: { attributes: [] },
        },
        {
          model: Exam,
          as: "exams",
          through: { attributes: [] },
        },
      ],
    });

    if (!userWithDetails) {
      return sendNotFound(res, "User not found");
    }

    return sendSuccess(res, 200, "User details fetched successfully", userWithDetails);
  } catch (error) {
    console.error("Error fetching user details:", error);
    return sendServerError(res, error);
  }
};

export const getHomePage = async (req, res) => {
  try {
    let myClasses = [];

    try {
      const { userId } = req.user;
      user = await User.findByPk(userId);
      if (user) {
        const enrollments = await Enrollment.findAll({
          where: { userId: userId },
          include: [
            {
              model: Course,
              include: [
                {
                  model: Category,
                  as: "category",
                  attributes: ["categoryId", "categoryName"],
                },
              ],
            },
          ],
        });

        myClasses = enrollments.map((enrollment) => {
          const course = enrollment.Course;
          return {
            id: course.courseId,
            course_code: course.title.substring(0, 10).toUpperCase(),
            course_title: course.title,
            course_sub_title: null,
            course_description: course.description,
            category: course.category?.categoryName || null,
            language: "English",
            course_price: parseFloat(course.price) || 0,
            image: course.thumbnailUrl,
            reviews: 0,
            rating: 0,
            purchase_status: true,
          };
        });
      }
    } catch (err) {
      console.log("Invalid token:", err.message);
    }

    const banners = await Banner.findAll({
      attributes: ["id", "title", "image"],
      order: [["createdAt", "DESC"]],
    });

    const categories = await Category.findAll({
      attributes: ["categoryId", "categoryName"],
      order: [["categoryName", "ASC"]],
    });

    const enrolledCourseIds = myClasses.map((course) => course.id);
    const recommendedCourses = await Course.findAll({
      where: {
        isPublished: true,
        status: "active",
        ...(enrolledCourseIds.length > 0 && {
          courseId: { [Op.notIn]: enrolledCourseIds },
        }),
      },
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
      ],
      limit: 10,
      order: [["createdAt", "DESC"]],
    });

    const recommendedList = recommendedCourses.map((course) => ({
      id: course.courseId,
      course_code: course.title.substring(0, 10).toUpperCase(),
      course_title: course.title,
      course_sub_title: null,
      course_description: course.description,
      category: course.category?.categoryName || null,
      language: "English",
      course_price: parseFloat(course.price) || 0,
      image: course.thumbnailUrl,
      reviews: 0,
      rating: 0,
      purchase_status: false,
    }));

    const popularCategories = categories.slice(0, 2).map((cat) => ({
      id: cat.categoryId,
      category_name: cat.categoryName,
    }));

    const contactSettings = await Settings.findAll({
      where: {
        key: {
          [Op.in]: ["contact_phone", "contact_email", "company_name"],
        },
        isActive: true,
      },
      attributes: ["key", "value"],
    });

    const settingsMap = {};
    contactSettings.forEach((setting) => {
      settingsMap[setting.key] = setting.value;
    });

    const response = {
      banners: banners.map((banner) => ({
        id: banner.id,
        title: banner.title,
        image: banner.image,
      })),
      categories: categories.map((cat) => ({
        id: cat.categoryId,
        category_name: cat.categoryName,
      })),
      courses: [
        {
          title: "My Classes",
          list: myClasses,
        },
        {
          title: "Recommended Classes",
          list: recommendedList,
        },
      ],
      popular: {
        categories: popularCategories,
      },
      contact: settingsMap.contact_phone || "1234567890",
      email: settingsMap.contact_email || "support@example.com",
      company_name: settingsMap.company_name || "StartGoals",
    };

    return sendSuccess(res, 200, "Success", response);
  } catch (error) {
    console.error("Homepage API Error:", error);
    return sendServerError(res, error);
  }
};

// ===================== COMPREHENSIVE STUDENT MANAGEMENT =====================

export const getAllStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "DESC",
      includeStats = true,
      enrollmentStatus,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereConditions = {
      role: "student",
    };

    if (search) {
      whereConditions[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { mobile: { [Op.iLike]: `%${search}%` } },
      ];
    }

    if (status) whereConditions.isVerified = status === "active";

    const include = [];

    if (includeStats === "true") {
      include.push(
        {
          model: Enrollment,
          as: "enrollments",
          include: [{ model: Course, attributes: ["title", "thumbnail"] }],
          required: false,
        },
        {
          model: BatchStudents,
          as: "batchEnrollments",
          include: [{ model: Batch, attributes: ["batchName", "status"] }],
          required: false,
        },
      );
    }

    const { count, rows: students } = await User.findAndCountAll({
      where: whereConditions,
      include,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]],
      distinct: true,
    });

    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const studentData = student.toJSON();

        if (includeStats === "true") {
          const enrollmentCount = await Enrollment.count({
            where: { userId: student.userId },
          });

          const completedCourses = await Enrollment.count({
            where: {
              userId: student.userId,
              completionStatus: "completed",
            },
          });

          const batchCount = await BatchStudents.count({
            where: { userId: student.userId },
          });

          studentData.stats = {
            totalEnrollments: enrollmentCount,
            completedCourses,
            activeBatches: batchCount,
            completionRate:
              enrollmentCount > 0
                ? ((completedCourses / enrollmentCount) * 100).toFixed(1)
                : 0,
          };
        }

        return studentData;
      }),
    );

    const totalPages = Math.ceil(count / parseInt(limit));

    return sendSuccess(res, 200, "Students retrieved successfully", {
      students: studentsWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalStudents: count,
        studentsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
      summary: {
        totalStudents: count,
        activeStudents: students.filter((s) => s.isVerified).length,
        inactiveStudents: students.filter((s) => !s.isVerified).length,
      },
    });
  } catch (error) {
    console.error("Get all students error:", error);
    return sendServerError(res, error);
  }
};

export const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { includeProgress = true } = req.query;

    const student = await User.findOne({
      where: {
        userId: studentId,
        role: "student",
      },
      include: [
        {
          model: Enrollment,
          as: "enrollments",
          include: [
            {
              model: Course,
              attributes: [
                "courseId",
                "title",
                "thumbnail",
                "category",
                "level",
                "duration",
              ],
            },
          ],
        },
        {
          model: BatchStudents,
          as: "batchEnrollments",
          include: [
            {
              model: Batch,
              attributes: [
                "batchId",
                "batchName",
                "status",
                "startDate",
                "endDate",
              ],
            },
          ],
        },
      ],
    });

    if (!student) {
      return sendNotFound(res, "Student not found");
    }

    const studentData = student.toJSON();

    if (includeProgress === "true") {
      const enrollments = studentData.enrollments || [];
      const totalEnrollments = enrollments.length;
      const completedCourses = enrollments.filter(
        (e) => e.completionStatus === "completed",
      ).length;
      const inProgressCourses = enrollments.filter(
        (e) => e.completionStatus === "in_progress",
      ).length;

      studentData.progress = {
        totalEnrollments,
        completedCourses,
        inProgressCourses,
        notStartedCourses:
          totalEnrollments - completedCourses - inProgressCourses,
        completionRate:
          totalEnrollments > 0
            ? ((completedCourses / totalEnrollments) * 100).toFixed(1)
            : 0,
        averageProgress:
          enrollments.length > 0
            ? (
              enrollments.reduce(
                (sum, e) => sum + (e.progressPercentage || 0),
                0,
              ) / enrollments.length
            ).toFixed(1)
            : 0,
      };

      const recentEnrollments = await Enrollment.findAll({
        where: { userId: studentId },
        include: [{ model: Course, attributes: ["title"] }],
        order: [["updatedAt", "DESC"]],
        limit: 5,
      });

      studentData.recentActivity = recentEnrollments.map((enrollment) => ({
        courseTitle: enrollment.Course.title,
        status: enrollment.completionStatus,
        progress: enrollment.progressPercentage,
        lastAccessed: enrollment.updatedAt,
      }));
    }

    return sendSuccess(res, 200, "Student details retrieved successfully", studentData);
  } catch (error) {
    console.error("Get student by ID error:", error);
    return sendServerError(res, error);
  }
};

export const createStudent = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      firstName,
      lastName,
      username,
      email,
      mobile,
      password,
      dateOfBirth,
      address,
      city,
      state,
      country,
      pincode,
      emergencyContact,
      isVerified = false,
    } = req.body;

    if (!firstName || !lastName || !email) {
      await transaction.rollback();
      return sendValidationError(res, "First name, last name, and email are required");
    }

    if (!validateEmail(email)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid email format");
    }

    if (mobile && !validateMobile(mobile)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid mobile number format");
    }

    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          ...(mobile ? [{ mobile }] : []),
          ...(username ? [{ username }] : []),
        ],
      },
    });

    if (existingUser) {
      await transaction.rollback();
      return sendConflict(res, "user", email || mobile || username);
    }

    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const student = await User.create(
      {
        firstName,
        lastName,
        username: username || `student_${Date.now()}`,
        email,
        mobile,
        password: hashedPassword,
        role: "student",
        dateOfBirth,
        address,
        city,
        state,
        country,
        pincode,
        emergencyContact,
        isVerified,
        isActive: true,
      },
      { transaction },
    );

    await transaction.commit();

    const { password: _, ...studentData } = student.toJSON();

    return sendSuccess(res, 200, "Student created successfully", studentData);
  } catch (error) {
    await transaction.rollback();
    console.error("Create student error:", error);
    return sendServerError(res, error);
  }
};

export const updateStudent = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { studentId } = req.params;
    const updateData = req.body;

    delete updateData.password;
    delete updateData.role;
    delete updateData.userId;

    if (updateData.email && !validateEmail(updateData.email)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid email format");
    }

    if (updateData.mobile && !validateMobile(updateData.mobile)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid mobile number format");
    }

    const student = await User.findOne({
      where: { userId: studentId, role: "student" },
    });

    if (!student) {
      await transaction.rollback();
      return sendNotFound(res, "Student not found");
    }

    if (updateData.email || updateData.mobile || updateData.username) {
      const whereConditions = {
        userId: { [Op.ne]: studentId },
      };

      const orConditions = [];
      if (updateData.email) orConditions.push({ email: updateData.email });
      if (updateData.mobile) orConditions.push({ mobile: updateData.mobile });
      if (updateData.username)
        orConditions.push({ username: updateData.username });

      if (orConditions.length > 0) {
        whereConditions[Op.or] = orConditions;

        const existingUser = await User.findOne({ where: whereConditions });
        if (existingUser) {
          await transaction.rollback();
          return sendConflict(res, "user", updateData.email || updateData.mobile || updateData.username);
        }
      }
    }

    await student.update(updateData, { transaction });

    await transaction.commit();

    const updatedStudent = await User.findByPk(studentId, {
      attributes: { exclude: ["password"] },
    });

    return sendSuccess(res, 200, "Student updated successfully", updatedStudent);
  } catch (error) {
    await transaction.rollback();
    console.error("Update student error:", error);
    return sendServerError(res, error);
  }
};

export const deleteStudent = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { studentId } = req.params;
    const { permanent = false } = req.query;

    const student = await User.findOne({
      where: { userId: studentId, role: "student" },
    });

    if (!student) {
      await transaction.rollback();
      return sendNotFound(res, "Student not found");
    }

    if (permanent === "true") {
      await BatchStudents.destroy({
        where: { userId: studentId },
        transaction,
      });
      await Enrollment.destroy({ where: { userId: studentId }, transaction });
      await student.destroy({ transaction });
    } else {
      await student.update(
        {
          isActive: false,
          deactivatedAt: new Date(),
        },
        { transaction },
      );
    }

    await transaction.commit();

    return sendSuccess(
      res,
      200,
      permanent === "true"
        ? "Student permanently deleted"
        : "Student deactivated successfully"
    );
  } catch (error) {
    await transaction.rollback();
    console.error("Delete student error:", error);
    return sendServerError(res, error);
  }
};

export const getStudentAnalytics = async (req, res) => {
  try {
    const { timeRange = "30d" } = req.query;

    const now = new Date();
    let startDate = new Date();

    switch (timeRange) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    const totalStudents = await User.count({ where: { role: "student" } });
    const activeStudents = await User.count({
      where: { role: "student", isVerified: true, isActive: true },
    });
    const newStudents = await User.count({
      where: {
        role: "student",
        createdAt: { [Op.gte]: startDate },
      },
    });

    const totalEnrollments = await Enrollment.count();
    const activeEnrollments = await Enrollment.count({
      where: { completionStatus: "in_progress" },
    });
    const completedEnrollments = await Enrollment.count({
      where: { completionStatus: "completed" },
    });

    const popularCourses = await Course.findAll({
      attributes: [
        "courseId",
        "title",
        [
          sequelize.fn("COUNT", sequelize.col("Enrollments.enrollmentId")),
          "enrollmentCount",
        ],
      ],
      include: [
        {
          model: Enrollment,
          attributes: [],
          required: true,
        },
      ],
      group: ["Course.courseId", "Course.title"],
      order: [
        [
          sequelize.fn("COUNT", sequelize.col("Enrollments.enrollmentId")),
          "DESC",
        ],
      ],
      limit: 10,
    });

    const registrationTrends = await User.findAll({
      where: {
        role: "student",
        createdAt: {
          [Op.gte]: new Date(now.getFullYear(), now.getMonth() - 11, 1),
        },
      },
      attributes: [
        [
          sequelize.fn("DATE_TRUNC", "month", sequelize.col("createdAt")),
          "month",
        ],
        [sequelize.fn("COUNT", sequelize.col("userId")), "count"],
      ],
      group: [sequelize.fn("DATE_TRUNC", "month", sequelize.col("createdAt"))],
      order: [
        [
          sequelize.fn("DATE_TRUNC", "month", sequelize.col("createdAt")),
          "ASC",
        ],
      ],
    });

    const categoryStats = await CourseCategory.findAll({
      attributes: [
        "categoryId",
        "categoryName",
        [
          sequelize.fn(
            "COUNT",
            sequelize.col("Courses.Enrollments.enrollmentId"),
          ),
          "totalEnrollments",
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize
              .case()
              .when(
                sequelize.col("Courses.Enrollments.completionStatus"),
                "completed",
                1,
              )
              .else(0),
          ),
          "completedEnrollments",
        ],
      ],
      include: [
        {
          model: Course,
          include: [
            {
              model: Enrollment,
              attributes: [],
            },
          ],
          attributes: [],
        },
      ],
      group: ["CourseCategory.categoryId", "CourseCategory.categoryName"],
      having: sequelize.where(
        sequelize.fn(
          "COUNT",
          sequelize.col("Courses.Enrollments.enrollmentId"),
        ),
        ">",
        0,
      ),
    });

    const analytics = {
      overview: {
        totalStudents,
        activeStudents,
        inactiveStudents: totalStudents - activeStudents,
        newStudents,
        growthRate:
          totalStudents > 0
            ? ((newStudents / totalStudents) * 100).toFixed(1)
            : 0,
      },
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
        completed: completedEnrollments,
        completionRate:
          totalEnrollments > 0
            ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1)
            : 0,
      },
      popularCourses: popularCourses.map((course) => ({
        courseId: course.courseId,
        title: course.title,
        enrollments: parseInt(course.dataValues.enrollmentCount),
      })),
      registrationTrends: registrationTrends.map((trend) => ({
        month: trend.dataValues.month,
        count: parseInt(trend.dataValues.count),
      })),
      categoryPerformance: categoryStats.map((cat) => ({
        category: cat.categoryName,
        totalEnrollments: parseInt(cat.dataValues.totalEnrollments),
        completedEnrollments: parseInt(cat.dataValues.completedEnrollments),
        completionRate:
          cat.dataValues.totalEnrollments > 0
            ? (
              (cat.dataValues.completedEnrollments /
                cat.dataValues.totalEnrollments) *
              100
            ).toFixed(1)
            : 0,
      })),
    };

    return sendSuccess(res, 200, "Student analytics fetched successfully", analytics);
  } catch (error) {
    console.error("Get student analytics error:", error);
    return sendServerError(res, error);
  }
};
