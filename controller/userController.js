// ===========================================================================================
// USER & STUDENT MANAGEMENT CONTROLLER
// Unified controller for user registration, authentication, and comprehensive student management
// Combines user-facing authentication with advanced admin student management features
// ===========================================================================================

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
import {
  validateEmail,
  validateMobile,
} from "../utils/commonUtils.js";
import bcrypt from "bcrypt";

// ✅ OTP-related imports
import { sendOtp } from "../utils/sendOtp.js";
import Banner from "../model/banner.js";
import Category from "../model/courseCategory.js";
import Course from "../model/course.js";
import Settings from "../model/settings.js";
import { Op } from "sequelize";

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
          role: user.role,
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


export const getHomePage = async (req, res) => {
  try {
    let myClasses = [];

    // Check if user is authenticated
    try {
      const { userId } = req.user; // Assuming userId is passed in the request body
      user = await User.findByPk(userId); if (user) {
        // Get user's enrolled courses
        const enrollments = await Enrollment.findAll({
          where: { userId: userId },
          include: [
            {
              model: Course,
              include: [
                {
                  model: Category,
                  as: 'category',
                  attributes: ['categoryId', 'categoryName']
                }
              ]
            }
          ]
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
            language: "English", // Default language for now
            course_price: parseFloat(course.price) || 0,
            image: course.thumbnailUrl,
            reviews: 0, // You can implement review count later
            rating: 0, // You can implement rating later
            purchase_status: true
          };
        });
      }
    } catch (err) {
      // If token is invalid, continue without user data
      console.log("Invalid token:", err.message);
    }

    // Get all banners
    const banners = await Banner.findAll({
      attributes: ['id', 'title', 'image'],
      order: [['createdAt', 'DESC']]
    });

    // Get all categories
    const categories = await Category.findAll({
      attributes: ['categoryId', 'categoryName'],
      order: [['categoryName', 'ASC']]
    });    // Get recommended courses (published courses that user hasn't enrolled in)
    const enrolledCourseIds = myClasses.map(course => course.id);
    const recommendedCourses = await Course.findAll({
      where: {
        isPublished: true,
        status: 'active',
        ...(enrolledCourseIds.length > 0 && {
          courseId: { [Op.notIn]: enrolledCourseIds }
        })
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['categoryId', 'categoryName']
        }
      ],
      limit: 10,
      order: [['createdAt', 'DESC']]
    });

    const recommendedList = recommendedCourses.map((course) => ({
      id: course.courseId,
      course_code: course.title.substring(0, 10).toUpperCase(),
      course_title: course.title,
      course_sub_title: null,
      course_description: course.description,
      category: course.category?.categoryName || null,
      language: "English", // Default language for now
      course_price: parseFloat(course.price) || 0,
      image: course.thumbnailUrl,
      reviews: 0, // You can implement review count later
      rating: 0, // You can implement rating later
      purchase_status: false
    }));    // Get popular categories (first 2 categories for demo)
    const popularCategories = categories.slice(0, 2).map(cat => ({
      id: cat.categoryId,
      category_name: cat.categoryName
    }));

    // Get contact information from settings
    const contactSettings = await Settings.findAll({
      where: {
        key: {
          [Op.in]: ['contact_phone', 'contact_email', 'company_name']
        },
        isActive: true
      },
      attributes: ['key', 'value']
    });

    // Convert settings array to object for easy access
    const settingsMap = {};
    contactSettings.forEach(setting => {
      settingsMap[setting.key] = setting.value;
    });

    // Format response according to demo structure
    const response = {
      success: true,
      message: "Success",
      banners: banners.map(banner => ({
        id: banner.id,
        title: banner.title,
        image: banner.image
      })),
      categories: categories.map(cat => ({
        id: cat.categoryId,
        category_name: cat.categoryName
      })),
      courses: [
        {
          title: "My Classes",
          list: myClasses
        },
        {
          title: "Recommended Classes",
          list: recommendedList
        }
      ],
      popular: {
        categories: popularCategories,
      },
      contact: settingsMap.contact_phone || "1234567890",
      email: settingsMap.contact_email || "support@example.com",
      company_name: settingsMap.company_name || "StartGoals"
    };

    res.json(response);  } catch (error) {
    console.error("Homepage API Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error"
    });
  }
};

// ===================== COMPREHENSIVE STUDENT MANAGEMENT =====================

/**
 * Get All Students (Admin/Owner only)
 * With filters, search, and pagination
 */
export const getAllStudents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      includeStats = true,
      enrollmentStatus
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where conditions
    const whereConditions = {
      role: 'student'
    };
    
    if (search) {
      whereConditions[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
        { mobile: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (status) whereConditions.isVerified = status === 'active';

    // Include associations based on query params
    const include = [];
    
    if (includeStats === 'true') {
      include.push(
        {
          model: Enrollment,
          as: 'enrollments',
          include: [{ model: Course, attributes: ['title', 'thumbnail'] }],
          required: false
        },
        {
          model: BatchStudents,
          as: 'batchEnrollments',
          include: [{ model: Batch, attributes: ['batchName', 'status'] }],
          required: false
        }
      );
    }

    const { count, rows: students } = await User.findAndCountAll({
      where: whereConditions,
      include,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]],
      distinct: true
    });

    // Calculate stats for each student if requested
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const studentData = student.toJSON();
        
        if (includeStats === 'true') {
          // Calculate enrollment statistics
          const enrollmentCount = await Enrollment.count({
            where: { userId: student.userId }
          });
          
          const completedCourses = await Enrollment.count({
            where: { 
              userId: student.userId,
              completionStatus: 'completed'
            }
          });

          const batchCount = await BatchStudents.count({
            where: { userId: student.userId }
          });

          studentData.stats = {
            totalEnrollments: enrollmentCount,
            completedCourses,
            activeBatches: batchCount,
            completionRate: enrollmentCount > 0 ? (completedCourses / enrollmentCount * 100).toFixed(1) : 0
          };
        }

        return studentData;
      })
    );

    const totalPages = Math.ceil(count / parseInt(limit));

    res.status(200).json({
      success: true,
      message: "Students retrieved successfully",
      data: {
        students: studentsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalStudents: count,
          studentsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        },
        summary: {
          totalStudents: count,
          activeStudents: students.filter(s => s.isVerified).length,
          inactiveStudents: students.filter(s => !s.isVerified).length
        }
      }
    });

  } catch (error) {
    console.error("Get all students error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve students",
      error: error.message
    });
  }
};

/**
 * Get student by ID with detailed information
 */
export const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { includeProgress = true } = req.query;

    const student = await User.findOne({
      where: { 
        userId: studentId, 
        role: 'student' 
      },
      include: [
        {
          model: Enrollment,
          as: 'enrollments',
          include: [
            {
              model: Course,
              attributes: ['courseId', 'title', 'thumbnail', 'category', 'level', 'duration']
            }
          ]
        },
        {
          model: BatchStudents,
          as: 'batchEnrollments',
          include: [
            {
              model: Batch,
              attributes: ['batchId', 'batchName', 'status', 'startDate', 'endDate']
            }
          ]
        }
      ]
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    const studentData = student.toJSON();

    // Add detailed statistics
    if (includeProgress === 'true') {
      const enrollments = studentData.enrollments || [];
      const totalEnrollments = enrollments.length;
      const completedCourses = enrollments.filter(e => e.completionStatus === 'completed').length;
      const inProgressCourses = enrollments.filter(e => e.completionStatus === 'in_progress').length;
      
      studentData.progress = {
        totalEnrollments,
        completedCourses,
        inProgressCourses,
        notStartedCourses: totalEnrollments - completedCourses - inProgressCourses,
        completionRate: totalEnrollments > 0 ? (completedCourses / totalEnrollments * 100).toFixed(1) : 0,
        averageProgress: enrollments.length > 0 ? 
          (enrollments.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / enrollments.length).toFixed(1) : 0
      };

      // Recent activity
      const recentEnrollments = await Enrollment.findAll({
        where: { userId: studentId },
        include: [{ model: Course, attributes: ['title'] }],
        order: [['updatedAt', 'DESC']],
        limit: 5
      });

      studentData.recentActivity = recentEnrollments.map(enrollment => ({
        courseTitle: enrollment.Course.title,
        status: enrollment.completionStatus,
        progress: enrollment.progressPercentage,
        lastAccessed: enrollment.updatedAt
      }));
    }

    res.status(200).json({
      success: true,
      message: "Student details retrieved successfully",
      data: studentData
    });

  } catch (error) {
    console.error("Get student by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve student details",
      error: error.message
    });
  }
};

/**
 * Create new student (Admin)
 */
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
      isVerified = false
    } = req.body;

    // Validation
    if (!firstName || !lastName || !email) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "First name, last name, and email are required"
      });
    }

    if (!validateEmail(email)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    if (mobile && !validateMobile(mobile)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number format"
      });
    }

    // Check for existing user
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { email },
          ...(mobile ? [{ mobile }] : []),
          ...(username ? [{ username }] : [])
        ]
      }
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(409).json({
        success: false,
        message: "User with this email, mobile, or username already exists"
      });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create student
    const student = await User.create({
      firstName,
      lastName,
      username: username || `student_${Date.now()}`,
      email,
      mobile,
      password: hashedPassword,
      role: 'student',
      dateOfBirth,
      address,
      city,
      state,
      country,
      pincode,
      emergencyContact,
      isVerified,
      isActive: true
    }, { transaction });

    await transaction.commit();

    // Return student data without password
    const { password: _, ...studentData } = student.toJSON();

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: studentData
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Create student error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create student",
      error: error.message
    });
  }
};

/**
 * Update student information
 */
export const updateStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { studentId } = req.params;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated via this endpoint
    delete updateData.password;
    delete updateData.role;
    delete updateData.userId;

    // Validate email if provided
    if (updateData.email && !validateEmail(updateData.email)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }

    // Validate mobile if provided
    if (updateData.mobile && !validateMobile(updateData.mobile)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Invalid mobile number format"
      });
    }

    // Check if student exists
    const student = await User.findOne({
      where: { userId: studentId, role: 'student' }
    });

    if (!student) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    // Check for unique constraints if email/mobile/username are being updated
    if (updateData.email || updateData.mobile || updateData.username) {
      const whereConditions = {
        userId: { [Op.ne]: studentId }
      };

      const orConditions = [];
      if (updateData.email) orConditions.push({ email: updateData.email });
      if (updateData.mobile) orConditions.push({ mobile: updateData.mobile });
      if (updateData.username) orConditions.push({ username: updateData.username });

      if (orConditions.length > 0) {
        whereConditions[Op.or] = orConditions;

        const existingUser = await User.findOne({ where: whereConditions });
        if (existingUser) {
          await transaction.rollback();
          return res.status(409).json({
            success: false,
            message: "Email, mobile, or username already exists"
          });
        }
      }
    }

    // Update student
    await student.update(updateData, { transaction });

    await transaction.commit();

    // Return updated student data
    const updatedStudent = await User.findByPk(studentId, {
      attributes: { exclude: ['password'] }
    });

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: updatedStudent
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Update student error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update student",
      error: error.message
    });
  }
};

/**
 * Delete student (soft delete)
 */
export const deleteStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { studentId } = req.params;
    const { permanent = false } = req.query;

    const student = await User.findOne({
      where: { userId: studentId, role: 'student' }
    });

    if (!student) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Student not found"
      });
    }

    if (permanent === 'true') {
      // Hard delete - remove all related data
      await BatchStudents.destroy({ where: { userId: studentId }, transaction });
      await Enrollment.destroy({ where: { userId: studentId }, transaction });
      await student.destroy({ transaction });
    } else {
      // Soft delete - deactivate account
      await student.update({ 
        isActive: false,
        deactivatedAt: new Date()
      }, { transaction });
    }

    await transaction.commit();

    res.status(200).json({
      success: true,
      message: permanent === 'true' ? "Student permanently deleted" : "Student deactivated successfully"
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Delete student error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete student",
      error: error.message
    });
  }
};

/**
 * Get student analytics and statistics
 */
export const getStudentAnalytics = async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Basic student counts
    const totalStudents = await User.count({ where: { role: 'student' } });
    const activeStudents = await User.count({ 
      where: { role: 'student', isVerified: true, isActive: true } 
    });
    const newStudents = await User.count({
      where: { 
        role: 'student',
        createdAt: { [Op.gte]: startDate }
      }
    });

    // Enrollment statistics
    const totalEnrollments = await Enrollment.count();
    const activeEnrollments = await Enrollment.count({
      where: { completionStatus: 'in_progress' }
    });
    const completedEnrollments = await Enrollment.count({
      where: { completionStatus: 'completed' }
    });

    // Popular courses among students
    const popularCourses = await Course.findAll({
      attributes: [
        'courseId',
        'title',
        [sequelize.fn('COUNT', sequelize.col('Enrollments.enrollmentId')), 'enrollmentCount']
      ],
      include: [
        {
          model: Enrollment,
          attributes: [],
          required: true
        }
      ],
      group: ['Course.courseId', 'Course.title'],
      order: [[sequelize.fn('COUNT', sequelize.col('Enrollments.enrollmentId')), 'DESC']],
      limit: 10
    });

    // Student registration trends (last 12 months)
    const registrationTrends = await User.findAll({
      where: {
        role: 'student',
        createdAt: { [Op.gte]: new Date(now.getFullYear(), now.getMonth() - 11, 1) }
      },
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('COUNT', sequelize.col('userId')), 'count']
      ],
      group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE_TRUNC', 'month', sequelize.col('createdAt')), 'ASC']]
    });

    // Completion rates by category
    const categoryStats = await CourseCategory.findAll({
      attributes: [
        'categoryId',
        'categoryName',
        [sequelize.fn('COUNT', sequelize.col('Courses.Enrollments.enrollmentId')), 'totalEnrollments'],
        [sequelize.fn('SUM', sequelize.case()
          .when(sequelize.col('Courses.Enrollments.completionStatus'), 'completed', 1)
          .else(0)), 'completedEnrollments']
      ],
      include: [
        {
          model: Course,
          include: [
            {
              model: Enrollment,
              attributes: []
            }
          ],
          attributes: []
        }
      ],
      group: ['CourseCategory.categoryId', 'CourseCategory.categoryName'],
      having: sequelize.where(sequelize.fn('COUNT', sequelize.col('Courses.Enrollments.enrollmentId')), '>', 0)
    });

    const analytics = {
      overview: {
        totalStudents,
        activeStudents,
        inactiveStudents: totalStudents - activeStudents,
        newStudents,
        growthRate: totalStudents > 0 ? ((newStudents / totalStudents) * 100).toFixed(1) : 0
      },
      enrollments: {
        total: totalEnrollments,
        active: activeEnrollments,
        completed: completedEnrollments,
        completionRate: totalEnrollments > 0 ? ((completedEnrollments / totalEnrollments) * 100).toFixed(1) : 0
      },
      popularCourses: popularCourses.map(course => ({
        courseId: course.courseId,
        title: course.title,
        enrollments: parseInt(course.dataValues.enrollmentCount)
      })),
      registrationTrends: registrationTrends.map(trend => ({
        month: trend.dataValues.month,
        count: parseInt(trend.dataValues.count)
      })),
      categoryPerformance: categoryStats.map(cat => ({
        category: cat.categoryName,
        totalEnrollments: parseInt(cat.dataValues.totalEnrollments),
        completedEnrollments: parseInt(cat.dataValues.completedEnrollments),
        completionRate: cat.dataValues.totalEnrollments > 0 ? 
          ((cat.dataValues.completedEnrollments / cat.dataValues.totalEnrollments) * 100).toFixed(1) : 0
      }))
    };

    res.status(200).json({
      success: true,
      data: analytics
    });

  } catch (error) {
    console.error("Get student analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch student analytics",
      error: error.message
    });
  }
};
