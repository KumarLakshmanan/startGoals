// Teacher Management Controller
import sequelize from "../config/db.js";
import User from "../model/user.js";
import Course from "../model/course.js";
import Batch from "../model/batch.js";
import BatchStudents from "../model/batchStudents.js";
import Enrollment from "../model/enrollment.js";
import InstructorRating from "../model/instructorRating.js";
import CourseRating from "../model/courseRating.js";
import CourseCategory from "../model/courseCategory.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";

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
      page = 1,
      limit = 20,
      search,
      status,
      sortBy = "createdAt",
      sortOrder = "DESC",
      includeStats = true,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    const whereConditions = {
      role: "teacher",
    };

    if (search) {
      whereConditions[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { username: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
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

    const teachers = await User.findAndCountAll({
      where: whereConditions,
      include: includeOptions,
      attributes: [
        "userId",
        "firstName",
        "lastName",
        "username",
        "email",
        "mobile",
        "profileImage",
        "bio",
        "isVerified",
        "createdAt",
        "updatedAt",
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: offset,
      distinct: true,
    });

    // Calculate statistics for each teacher
    const teachersWithStats = await Promise.all(
      teachers.rows.map(async (teacher) => {
        const teacherData = teacher.toJSON();

        if (includeStats === "true") {
          // Calculate course statistics
          const courseStats = {
            totalCourses: teacher.courses?.length || 0,
            activeCourses:
              teacher.courses?.filter((c) => c.status === "published").length ||
              0,
            averageCourseRating:
              teacher.courses?.length > 0
                ? teacher.courses.reduce(
                    (sum, c) => sum + (c.averageRating || 0),
                    0,
                  ) / teacher.courses.length
                : 0,
          };

          // Calculate instructor rating statistics
          const instructorRatingStats = {
            totalRatings: teacher.instructorRatings?.length || 0,
            averageRating:
              teacher.instructorRatings?.length > 0
                ? teacher.instructorRatings.reduce(
                    (sum, r) => sum + r.rating,
                    0,
                  ) / teacher.instructorRatings.length
                : 0,
          };

          // Get student count
          const studentCount = await BatchStudents.count({
            where: { role: "student" },
            include: [
              {
                model: Batch,
                where: { createdBy: teacher.userId },
                required: true,
              },
            ],
          });

          teacherData.statistics = {
            courses: courseStats,
            ratings: instructorRatingStats,
            students: studentCount,
          };
        }

        return teacherData;
      }),
    );

    res.json({
      status: true,
      data: {
        teachers: teachersWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(teachers.count / parseInt(limit)),
          totalItems: teachers.count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get all teachers error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch teachers",
      error: error.message,
    });
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
      include: [
        {
          model: Course,
          as: "courses",
          include: [
            {
              model: CourseCategory,
              as: "category",
              attributes: ["categoryId", "categoryName"],
            },
            {
              model: Enrollment,
              as: "enrollments",
              attributes: ["enrollmentId", "status", "progressPercentage"],
            },
          ],
        },
        {
          model: Batch,
          as: "batches",
          include: [
            {
              model: BatchStudents,
              as: "batchStudents",
              where: { role: "student" },
              required: false,
              include: [
                {
                  model: User,
                  as: "user",
                  attributes: ["userId", "firstName", "lastName", "email"],
                },
              ],
            },
          ],
        },
        {
          model: InstructorRating,
          as: "instructorRatings",
          include: [
            {
              model: User,
              as: "ratedBy",
              attributes: ["userId", "firstName", "lastName"],
            },
          ],
        },
      ],
      attributes: [
        "userId",
        "firstName",
        "lastName",
        "username",
        "email",
        "mobile",
        "profileImage",
        "bio",
        "isVerified",
        "createdAt",
        "updatedAt",
      ],
    });

    if (!teacher) {
      return res.status(404).json({
        status: false,
        message: "Teacher not found",
      });
    }

    // Calculate comprehensive statistics
    const courses = teacher.courses || [];
    const batches = teacher.batches || [];
    const ratings = teacher.instructorRatings || [];

    const statistics = {
      courses: {
        total: courses.length,
        published: courses.filter((c) => c.status === "published").length,
        draft: courses.filter((c) => c.status === "draft").length,
        totalEnrollments: courses.reduce(
          (sum, c) => sum + (c.enrollments?.length || 0),
          0,
        ),
        averageRating:
          courses.length > 0
            ? courses.reduce((sum, c) => sum + (c.averageRating || 0), 0) /
              courses.length
            : 0,
      },
      students: {
        total: batches.reduce(
          (sum, b) => sum + (b.batchStudents?.length || 0),
          0,
        ),
        activeBatches: batches.filter((b) => b.status === "active").length,
      },
      ratings: {
        total: ratings.length,
        average:
          ratings.length > 0
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
            : 0,
        distribution: ratings.reduce((dist, r) => {
          dist[`star${r.rating}`] = (dist[`star${r.rating}`] || 0) + 1;
          return dist;
        }, {}),
      },
      performance: {
        coursesCreatedThisMonth: courses.filter((c) => {
          const courseDate = new Date(c.createdAt);
          const now = new Date();
          return (
            courseDate.getMonth() === now.getMonth() &&
            courseDate.getFullYear() === now.getFullYear()
          );
        }).length,
        recentActivity: courses.filter((c) => {
          const courseDate = new Date(c.updatedAt);
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return courseDate >= thirtyDaysAgo;
        }).length,
      },
    };

    res.json({
      status: true,
      data: {
        teacher: teacher.toJSON(),
        statistics,
      },
    });
  } catch (error) {
    console.error("Get teacher by ID error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch teacher details",
      error: error.message,
    });
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
      firstName,
      lastName,
      username,
      email,
      mobile,
      password,
      bio,
      profileImage,
      isVerified = true, // Admin-created teachers are verified by default
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !username || !email || !password) {
      return res.status(400).json({
        status: false,
        message:
          "First name, last name, username, email, and password are required",
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }],
      },
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message:
          existingUser.email === email
            ? "Email already exists"
            : "Username already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create teacher
    const teacher = await User.create(
      {
        firstName,
        lastName,
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

    res.status(201).json({
      status: true,
      message: "Teacher created successfully",
      data: { teacher: teacherData },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create teacher error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to create teacher",
      error: error.message,
    });
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
      firstName,
      lastName,
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
      return res.status(404).json({
        status: false,
        message: "Teacher not found",
      });
    }

    // Check for unique constraints if username or email is being changed
    if (username && username !== teacher.username) {
      const existingUsername = await User.findOne({
        where: { username, userId: { [Op.ne]: teacherId } },
      });
      if (existingUsername) {
        await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: "Username already exists",
        });
      }
    }

    if (email && email !== teacher.email) {
      const existingEmail = await User.findOne({
        where: { email, userId: { [Op.ne]: teacherId } },
      });
      if (existingEmail) {
        await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: "Email already exists",
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
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

    res.json({
      status: true,
      message: "Teacher updated successfully",
      data: { teacher: updatedTeacher },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update teacher error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to update teacher",
      error: error.message,
    });
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
      return res.status(404).json({
        status: false,
        message: "Teacher not found",
      });
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
      return res.status(400).json({
        status: false,
        message:
          "Teacher has active courses or batches. Please provide reassignToTeacherId or deactivate all content first",
        data: {
          activeCourses,
          activeBatches,
        },
      });
    }

    // Reassign courses and batches if specified
    if (reassignToTeacherId) {
      const newTeacher = await User.findOne({
        where: { userId: reassignToTeacherId, role: "teacher" },
      });

      if (!newTeacher) {
        await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: "Reassignment teacher not found",
        });
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

    res.json({
      status: true,
      message: `Teacher ${permanent === "true" ? "permanently deleted" : "deleted"} successfully`,
      data: {
        reassignedCourses: reassignToTeacherId ? activeCourses : 0,
        reassignedBatches: reassignToTeacherId ? activeBatches : 0,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete teacher error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to delete teacher",
      error: error.message,
    });
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
      return res.status(404).json({
        status: false,
        message: "Teacher not found",
      });
    }

    // Validate course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    // Update course assignment
    const previousTeacherId = course.createdBy;
    await course.update({ createdBy: teacherId }, { transaction });

    await transaction.commit();

    res.json({
      status: true,
      message: "Teacher assigned to course successfully",
      data: {
        courseId,
        courseTitle: course.title,
        newTeacher: {
          id: teacher.userId,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email,
        },
        previousTeacherId,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Assign teacher to course error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to assign teacher to course",
      error: error.message,
    });
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
      return res.status(404).json({
        status: false,
        message: "Teacher not found",
      });
    }

    // Validate batch exists
    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Batch not found",
      });
    }

    // Update batch assignment
    const previousTeacherId = batch.createdBy;
    await batch.update({ createdBy: teacherId }, { transaction });

    await transaction.commit();

    res.json({
      status: true,
      message: "Teacher assigned to batch successfully",
      data: {
        batchId,
        batchTitle: batch.title,
        newTeacher: {
          id: teacher.userId,
          name: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email,
        },
        previousTeacherId,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Assign teacher to batch error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to assign teacher to batch",
      error: error.message,
    });
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
      attributes: ["userId", "firstName", "lastName", "email"],
    });

    if (!teacher) {
      return res.status(404).json({
        status: false,
        message: "Teacher not found",
      });
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

    res.json({
      status: true,
      data: {
        teacher: {
          id: teacher.userId,
          name: `${teacher.firstName} ${teacher.lastName}`,
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
      },
    });
  } catch (error) {
    console.error("Get teacher performance report error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch teacher performance report",
      error: error.message,
    });
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
          attributes: ["userId", "firstName", "lastName", "profileImage"],
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

    res.json({
      status: true,
      data: {
        feedback: ratings.rows,
        summary,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(ratings.count / parseInt(limit)),
          totalItems: ratings.count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get teacher student feedback error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch teacher student feedback",
      error: error.message,
    });
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
          model: CourseCategory,
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

    res.json({
      status: true,
      data: {
        courses: coursesWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(courses.count / parseInt(limit)),
          totalItems: courses.count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get teacher assigned courses error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch teacher assigned courses",
      error: error.message,
    });
  }
};
