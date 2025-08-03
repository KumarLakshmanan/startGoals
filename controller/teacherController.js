// Teacher Management Controller
import sequelize from "../config/db.js";
import User from "../model/user.js";
import Course from "../model/course.js";
import Batch from "../model/batch.js";
import BatchStudents from "../model/batchStudents.js";
import Enrollment from "../model/enrollment.js";
import InstructorRating from "../model/instructorRating.js";
import CourseRating from "../model/courseRating.js";
import Category from "../model/category.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendServerError,
} from "../utils/responseHelper.js";

/**
 * ===================== TEACHER CRUD OPERATIONS =====================
 */

/**
 * Get All Teachers (Admin/Owner only)
 * With filters, search, and pagination
 */
export const getAllTeachers = async (req, res) => {
  try {
    const {
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "DESC",
      includeStats = true,
    } = req.query;

    // Build where conditions
    const whereConditions = {
      role: "teacher",
    };

    if (search) {
      whereConditions[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { mobile: { [Op.like]: `%${search}%` } },
      ];
    }

    if (status) whereConditions.isVerified = status === "active";

    // Include course and rating statistics if requested
    const includeOptions = [];

    if (includeStats === "true") {
      includeOptions.push({
        model: Course,
        as: "courses",
        attributes: [
          "courseId",
          "title",
          "status",
          "averageRating",
          "totalRatings",
        ],
        required: false,
      });

      includeOptions.push({
        model: InstructorRating,
        as: "instructorRatings",
        attributes: ["rating", "review"],
        required: false,
      });
    }

    const teachers = await User.findAll({
      where: whereConditions,
      include: includeOptions,
      attributes: [
        "userId",
        "username",
        "email",
        "mobile",
        "profileImage",
        "bio",
        "experience",
        "qualification",
        "isVerified",
        "createdAt",
        "updatedAt",
      ],
      order: [[sortBy, sortOrder]],
      distinct: true,
    });

    return sendSuccess(res,  "Teachers fetched successfully", teachers);
  } catch (error) {
    console.error("Get all teachers error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get Teacher by ID (Admin/Owner only)
 * Detailed teacher profile with full statistics
 */
export const getTeacherById = async (req, res) => {
  try {
    const { teacherId } = req.params;

    const teacher = await User.findOne({
      where: {
        userId: teacherId,
        role: "teacher",
      },
    });

    if (!teacher) {
      return sendNotFound(res, "Teacher not found");
    }

    return sendSuccess(res,  "Teacher fetched successfully", teacher);
  } catch (error) {
    console.error("Get teacher by ID error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Create New Teacher (Admin/Owner only)
 * Add a new teacher to the system
 */
export const createTeacher = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      username,
      email,
      mobile,
      password,
      bio,
      profileImage,
      isVerified = true, // Admin-created teachers are verified by default
    } = req.body;

    // Validate required fields
    if (!username || !email || !password) {
      await transaction.rollback();
      return sendValidationError(
        res,
        "Username, email, and password are required"
      );
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }],
      },
    });

    if (existingUser) {
      await transaction.rollback();
      if (existingUser.email === email) {
        return sendConflict(res, "email", email);
      } else {
        return sendConflict(res, "username", username);
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create teacher
    const teacher = await User.create(
      {
        username,
        email,
        mobile,
        password: hashedPassword,
        role: "teacher",
        bio,
        profileImage,
        isVerified,
      },
      { transaction },
    );

    await transaction.commit();

    // Remove password from response
    const teacherData = teacher.toJSON();
    delete teacherData.password;

    return sendSuccess(res,  "Teacher created successfully", {
      teacher: teacherData,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create teacher error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Update Teacher (Admin/Owner only)
 * Update teacher information and settings
 */
export const updateTeacher = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { teacherId } = req.params;
    const {
      username,
      email,
      mobile,
      bio,
      profileImage,
      isVerified,
      password, // Optional - only if admin wants to reset password
    } = req.body;

    const teacher = await User.findOne({
      where: {
        userId: teacherId,
        role: "teacher",
      },
    });

    if (!teacher) {
      await transaction.rollback();
      return sendNotFound(res, "Teacher not found");
    }

    // Check for unique constraints if username or email is being changed
    if (username && username !== teacher.username) {
      const existingUsername = await User.findOne({
        where: { username, userId: { [Op.ne]: teacherId } },
      });
      if (existingUsername) {
        await transaction.rollback();
        return sendConflict(res, "username", username);
      }
    }

    if (email && email !== teacher.email) {
      const existingEmail = await User.findOne({
        where: { email, userId: { [Op.ne]: teacherId } },
      });
      if (existingEmail) {
        await transaction.rollback();
        return sendConflict(res, "email", email);
      }
    }

    // Prepare update data
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (email !== undefined) updateData.email = email;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (bio !== undefined) updateData.bio = bio;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (isVerified !== undefined) updateData.isVerified = isVerified;

    // Hash new password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    await teacher.update(updateData, { transaction });

    await transaction.commit();

    // Remove password from response
    const updatedTeacher = teacher.toJSON();
    delete updatedTeacher.password;

    return sendSuccess(res,  "Teacher updated successfully", {
      teacher: updatedTeacher,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update teacher error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Delete Teacher (Admin/Owner only)
 * Soft delete teacher and handle course/batch reassignment
 */
export const deleteTeacher = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { teacherId } = req.params;
    const { reassignToTeacherId, permanent = false } = req.body;

    const teacher = await User.findOne({
      where: {
        userId: teacherId,
        role: "teacher",
      },
    });

    if (!teacher) {
      await transaction.rollback();
      return sendNotFound(res, "Teacher not found");
    }

    // Check if teacher has active courses or batches
    const activeCourses = await Course.count({
      where: {
        createdBy: teacherId,
        status: { [Op.in]: ["active", "published"] },
      },
    });

    const activeBatches = await Batch.count({
      where: {
        createdBy: teacherId,
        status: "active",
      },
    });

    if ((activeCourses > 0 || activeBatches > 0) && !reassignToTeacherId) {
      await transaction.rollback();
      return sendError(
        res,
        400,
        "Teacher has active courses or batches. Please provide reassignToTeacherId or deactivate all content first",
        {
          activeCourses,
          activeBatches,
        }
      );
    }

    // Reassign courses and batches if specified
    if (reassignToTeacherId) {
      const newTeacher = await User.findOne({
        where: { userId: reassignToTeacherId, role: "teacher" },
      });

      if (!newTeacher) {
        await transaction.rollback();
        return sendNotFound(res, "Reassignment teacher not found");
      }

      await Course.update(
        { createdBy: reassignToTeacherId },
        { where: { createdBy: teacherId }, transaction },
      );

      await Batch.update(
        { createdBy: reassignToTeacherId },
        { where: { createdBy: teacherId }, transaction },
      );
    }

    if (permanent === "true") {
      // Hard delete - be careful!
      await teacher.destroy({ force: true, transaction });
    } else {
      // Soft delete
      await teacher.destroy({ transaction });
    }

    await transaction.commit();

    return sendSuccess(
      res,
      `Teacher ${permanent === "true" ? "permanently deleted" : "deleted"} successfully`,
      {
        reassignedCourses: reassignToTeacherId ? activeCourses : 0,
        reassignedBatches: reassignToTeacherId ? activeBatches : 0,
      }
    );
  } catch (error) {
    await transaction.rollback();
    console.error("Delete teacher error:", error);
    return sendServerError(res, error);
  }
};

/**
 * ===================== COURSE & BATCH ASSIGNMENT =====================
 */

/**
 * Assign Teacher to Course (Admin/Owner only)
 * Assign or reassign course ownership
 */
export const assignTeacherToCourse = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { teacherId, courseId } = req.body;

    // Validate teacher exists and is a teacher
    const teacher = await User.findOne({
      where: { userId: teacherId, role: "teacher" },
    });

    if (!teacher) {
      await transaction.rollback();
      return sendNotFound(res, "Teacher not found");
    }

    // Validate course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
    }

    // Update course assignment
    const previousTeacherId = course.createdBy;
    await course.update({ createdBy: teacherId }, { transaction });

    await transaction.commit();

    return sendSuccess(res,  "Teacher assigned to course successfully", {
      courseId,
      courseTitle: course.title,
      newTeacher: {
        id: teacher.userId,
        name: teacher.username,
        email: teacher.email,
      },
      previousTeacherId,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Assign teacher to course error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Assign Teacher to Batch (Admin/Owner only)
 * Assign or reassign batch ownership
 */
export const assignTeacherToBatch = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { teacherId, batchId } = req.body;

    // Validate teacher exists and is a teacher
    const teacher = await User.findOne({
      where: { userId: teacherId, role: "teacher" },
    });

    if (!teacher) {
      await transaction.rollback();
      return sendNotFound(res, "Teacher not found");
    }

    // Validate batch exists
    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      await transaction.rollback();
      return sendNotFound(res, "Batch not found");
    }

    // Update batch assignment
    const previousTeacherId = batch.createdBy;
    await batch.update({ createdBy: teacherId }, { transaction });

    await transaction.commit();

    return sendSuccess(res,  "Teacher assigned to batch successfully", {
      batchId,
      batchTitle: batch.title,
      newTeacher: {
        id: teacher.userId,
        name: teacher.username,
        email: teacher.email,
      },
      previousTeacherId,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Assign teacher to batch error:", error);
    return sendServerError(res, error);
  }
};

/**
 * ===================== TEACHER PERFORMANCE & ANALYTICS =====================
 */

/**
 * Get Teacher Performance Report (Admin/Owner only)
 * Comprehensive performance analytics for a teacher
 */
export const getTeacherPerformanceReport = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { dateRange = "30d" } = req.query;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    switch (dateRange) {
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const teacher = await User.findOne({
      where: { userId: teacherId, role: "teacher" },
      attributes: ["userId", "username", "email"],
    });

    if (!teacher) {
      return sendNotFound(res, "Teacher not found");
    }

    // Get courses with enrollment data
    const courses = await Course.findAll({
      where: { createdBy: teacherId },
      include: [
        {
          model: Enrollment,
          as: "enrollments",
          where: {
            createdAt: {
              [Op.gte]: startDate,
              [Op.lte]: endDate,
            },
          },
          required: false,
        },
        {
          model: CourseRating,
          as: "courseRatings",
          where: {
            createdAt: {
              [Op.gte]: startDate,
              [Op.lte]: endDate,
            },
          },
          required: false,
        },
      ],
    });

    // Get instructor ratings in period
    const instructorRatings = await InstructorRating.findAll({
      where: {
        instructorId: teacherId,
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
    });

    // Calculate performance metrics
    const performance = {
      courses: {
        total: courses.length,
        newEnrollments: courses.reduce(
          (sum, c) => sum + (c.enrollments?.length || 0),
          0,
        ),
        averageRating:
          courses.length > 0
            ? courses.reduce((sum, c) => {
              const ratings = c.courseRatings || [];
              const avg =
                ratings.length > 0
                  ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
                  : 0;
              return sum + avg;
            }, 0) / courses.length
            : 0,
        totalRatings: courses.reduce(
          (sum, c) => sum + (c.courseRatings?.length || 0),
          0,
        ),
      },
      instructor: {
        averageRating:
          instructorRatings.length > 0
            ? instructorRatings.reduce((sum, r) => sum + r.rating, 0) /
            instructorRatings.length
            : 0,
        totalRatings: instructorRatings.length,
        ratingDistribution: instructorRatings.reduce((dist, r) => {
          dist[`star${r.rating}`] = (dist[`star${r.rating}`] || 0) + 1;
          return dist;
        }, {}),
      },
      revenue: {
        totalRevenue: courses.reduce(
          (sum, c) => sum + c.price * (c.enrollments?.length || 0),
          0,
        ),
        averageRevenuePerCourse:
          courses.length > 0
            ? courses.reduce(
              (sum, c) => sum + c.price * (c.enrollments?.length || 0),
              0,
            ) / courses.length
            : 0,
      },
    };

    // Get trending data
    const enrollmentTrends = courses
      .flatMap((course) =>
        (course.enrollments || []).map((enrollment) => ({
          date: enrollment.createdAt.toISOString().split("T")[0],
          courseId: course.courseId,
          courseTitle: course.title,
        })),
      )
      .reduce((acc, enrollment) => {
        acc[enrollment.date] = (acc[enrollment.date] || 0) + 1;
        return acc;
      }, {});

    return sendSuccess(res,  "Teacher performance report fetched successfully", {
      teacher: {
        id: teacher.userId,
        name: teacher.username,
        email: teacher.email,
      },
      performance,
      trends: {
        enrollmentsByDay: Object.entries(enrollmentTrends).map(
          ([date, count]) => ({
            date,
            enrollments: count,
          }),
        ),
      },
      period: {
        startDate,
        endDate,
        duration: dateRange,
      },
    });
  } catch (error) {
    console.error("Get teacher performance report error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get Teacher Student Feedback (Admin/Owner only)
 * Aggregated student feedback and ratings
 */
export const getTeacherStudentFeedback = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { page = 1, limit = 20, rating, courseId } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions for instructor ratings
    const whereConditions = { instructorId: teacherId };
    if (rating) whereConditions.rating = rating;
    if (courseId) whereConditions.courseId = courseId;

    const ratings = await InstructorRating.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "ratedBy",
          attributes: ["userId", "username", "profileImage"],
        },
        {
          model: Course,
          attributes: ["courseId", "title"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: offset,
    });

    // Calculate summary statistics
    const allRatings = await InstructorRating.findAll({
      where: { instructorId: teacherId },
      attributes: ["rating"],
    });

    const summary = {
      totalRatings: allRatings.length,
      averageRating:
        allRatings.length > 0
          ? allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length
          : 0,
      ratingDistribution: allRatings.reduce(
        (dist, r) => {
          const key = `star${r.rating}`;
          dist[key] = (dist[key] || 0) + 1;
          return dist;
        },
        {
          star1: 0,
          star2: 0,
          star3: 0,
          star4: 0,
          star5: 0,
        },
      ),
    };

    return sendSuccess(res,  "Teacher student feedback fetched successfully", {
      feedback: ratings.rows,
      summary,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(ratings.count / parseInt(limit)),
        totalItems: ratings.count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get teacher student feedback error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get Teacher Assigned Courses (Admin/Owner only)
 * List all courses assigned to a teacher
 */
export const getTeacherAssignedCourses = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    const whereConditions = { createdBy: teacherId };
    if (status) whereConditions.status = status;

    const courses = await Course.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: Enrollment,
          as: "enrollments",
          attributes: ["enrollmentId", "status"],
        },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: offset,
      distinct: true,
    });

    // Add enrollment statistics to each course
    const coursesWithStats = courses.rows.map((course) => {
      const courseData = course.toJSON();
      const enrollments = course.enrollments || [];

      courseData.statistics = {
        totalEnrollments: enrollments.length,
        activeEnrollments: enrollments.filter((e) => e.status === "active")
          .length,
        completedEnrollments: enrollments.filter(
          (e) => e.status === "completed",
        ).length,
      };

      delete courseData.enrollments; // Remove raw enrollment data
      return courseData;
    });

    return sendSuccess(res,  "Teacher assigned courses fetched successfully", {
      courses: coursesWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(courses.count / parseInt(limit)),
        totalItems: courses.count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get teacher assigned courses error:", error);
    return sendServerError(res, error);
  }
};
