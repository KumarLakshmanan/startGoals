// Student Management Controller
import sequelize from "../config/db.js";
import User from "../model/user.js";
import Course from "../model/course.js";
import Batch from "../model/batch.js";
import BatchStudents from "../model/batchStudents.js";
import Enrollment from "../model/enrollment.js";
import CourseCategory from "../model/courseCategory.js";
import { Op } from "sequelize";
import bcrypt from "bcrypt";

/**
 * ===================== STUDENT CRUD OPERATIONS =====================
 */

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

    // Include enrollment and batch information if requested
    const includeOptions = [];
    
    if (includeStats === 'true') {
      includeOptions.push({
        model: Enrollment,
        as: 'enrollments',
        include: [{
          model: Course,
          attributes: ['courseId', 'title', 'type', 'price']
        }],
        ...(enrollmentStatus && { where: { status: enrollmentStatus } }),
        required: false
      });
      
      includeOptions.push({
        model: BatchStudents,
        as: 'batchMemberships',
        where: { role: 'student' },
        include: [{
          model: Batch,
          attributes: ['batchId', 'title', 'status']
        }],
        required: false
      });
    }

    const students = await User.findAndCountAll({
      where: whereConditions,
      include: includeOptions,
      attributes: [
        'userId', 'firstName', 'lastName', 'username', 'email', 'mobile',
        'profileImage', 'address', 'isVerified', 'createdAt', 'updatedAt'
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: offset,
      distinct: true
    });

    // Calculate statistics for each student
    const studentsWithStats = students.rows.map(student => {
      const studentData = student.toJSON();
      
      if (includeStats === 'true') {
        const enrollments = student.enrollments || [];
        const batchMemberships = student.batchMemberships || [];
        
        // Calculate enrollment statistics
        const enrollmentStats = {
          totalEnrollments: enrollments.length,
          activeEnrollments: enrollments.filter(e => e.status === 'active').length,
          completedEnrollments: enrollments.filter(e => e.status === 'completed').length,
          liveCoursesEnrolled: enrollments.filter(e => e.Course?.type === 'live').length,
          recordedCoursesEnrolled: enrollments.filter(e => e.Course?.type === 'recorded').length,
          totalSpent: enrollments.reduce((sum, e) => sum + (e.Course?.price || 0), 0)
        };

        // Calculate batch statistics
        const batchStats = {
          totalBatches: batchMemberships.length,
          activeBatches: batchMemberships.filter(bm => bm.Batch?.status === 'active').length
        };

        studentData.statistics = {
          enrollments: enrollmentStats,
          batches: batchStats
        };
      }

      return studentData;
    });

    res.json({
      status: true,
      data: {
        students: studentsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(students.count / parseInt(limit)),
          totalItems: students.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error("Get all students error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch students",
      error: error.message
    });
  }
};

/**
 * Get Student by ID (Admin/Owner only)
 * Detailed student profile with full information
 */
export const getStudentById = async (req, res) => {
  try {
    const { studentId } = req.params;

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
              include: [
                {
                  model: CourseCategory,
                  as: 'category',
                  attributes: ['categoryId', 'categoryName']
                },
                {
                  model: User,
                  as: 'instructor',
                  attributes: ['userId', 'firstName', 'lastName']
                }
              ]
            }
          ]
        },
        {
          model: BatchStudents,
          as: 'batchMemberships',
          where: { role: 'student' },
          include: [{
            model: Batch,
            include: [
              {
                model: Course,
                attributes: ['courseId', 'title']
              },
              {
                model: User,
                as: 'instructor',
                attributes: ['userId', 'firstName', 'lastName']
              }
            ]
          }],
          required: false
        }
      ],
      attributes: [
        'userId', 'firstName', 'lastName', 'username', 'email', 'mobile',
        'profileImage', 'address', 'dateOfBirth', 'isVerified', 'createdAt', 'updatedAt'
      ]
    });

    if (!student) {
      return res.status(404).json({
        status: false,
        message: "Student not found"
      });
    }

    // Calculate comprehensive statistics
    const enrollments = student.enrollments || [];
    const batchMemberships = student.batchMemberships || [];

    const statistics = {
      enrollments: {
        total: enrollments.length,
        active: enrollments.filter(e => e.status === 'active').length,
        completed: enrollments.filter(e => e.status === 'completed').length,
        inProgress: enrollments.filter(e => e.status === 'in_progress').length,
        dropped: enrollments.filter(e => e.status === 'dropped').length,
        byType: {
          live: enrollments.filter(e => e.Course?.type === 'live').length,
          recorded: enrollments.filter(e => e.Course?.type === 'recorded').length
        },
        averageProgress: enrollments.length > 0
          ? enrollments.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / enrollments.length
          : 0
      },
      financial: {
        totalSpent: enrollments.reduce((sum, e) => sum + (e.Course?.price || 0), 0),
        averageSpentPerCourse: enrollments.length > 0
          ? enrollments.reduce((sum, e) => sum + (e.Course?.price || 0), 0) / enrollments.length
          : 0,
        mostExpensiveCourse: Math.max(...enrollments.map(e => e.Course?.price || 0), 0)
      },
      batches: {
        total: batchMemberships.length,
        active: batchMemberships.filter(bm => bm.Batch?.status === 'active').length,
        completed: batchMemberships.filter(bm => bm.Batch?.status === 'completed').length
      },
      activity: {
        enrollmentsThisMonth: enrollments.filter(e => {
          const enrollmentDate = new Date(e.createdAt);
          const now = new Date();
          return enrollmentDate.getMonth() === now.getMonth() && enrollmentDate.getFullYear() === now.getFullYear();
        }).length,
        lastActivity: enrollments.length > 0 
          ? Math.max(...enrollments.map(e => new Date(e.updatedAt).getTime()))
          : null
      }
    };

    // Group enrollments by category for better overview
    const coursesByCategory = enrollments.reduce((acc, enrollment) => {
      const category = enrollment.Course?.category?.categoryName || 'Uncategorized';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(enrollment);
      return acc;
    }, {});

    res.json({
      status: true,
      data: {
        student: student.toJSON(),
        statistics,
        coursesByCategory
      }
    });

  } catch (error) {
    console.error("Get student by ID error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch student details",
      error: error.message
    });
  }
};

/**
 * Create New Student (Admin/Owner only)
 * Add a new student to the system
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
      address,
      dateOfBirth,
      profileImage,
      isVerified = true // Admin-created students are verified by default
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !username || !email || !password) {
      return res.status(400).json({
        status: false,
        message: "First name, last name, username, email, and password are required"
      });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { username },
          { email }
        ]
      }
    });

    if (existingUser) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: existingUser.email === email ? "Email already exists" : "Username already exists"
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create student
    const student = await User.create({
      firstName,
      lastName,
      username,
      email,
      mobile,
      password: hashedPassword,
      role: 'student',
      address,
      dateOfBirth,
      profileImage,
      isVerified
    }, { transaction });

    await transaction.commit();

    // Remove password from response
    const studentData = student.toJSON();
    delete studentData.password;

    res.status(201).json({
      status: true,
      message: "Student created successfully",
      data: { student: studentData }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Create student error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to create student",
      error: error.message
    });
  }
};

/**
 * Update Student (Admin/Owner only)
 * Update student information and settings
 */
export const updateStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { studentId } = req.params;
    const {
      firstName,
      lastName,
      username,
      email,
      mobile,
      address,
      dateOfBirth,
      profileImage,
      isVerified,
      password // Optional - only if admin wants to reset password
    } = req.body;

    const student = await User.findOne({
      where: { 
        userId: studentId,
        role: 'student'
      }
    });

    if (!student) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Student not found"
      });
    }

    // Check for unique constraints if username or email is being changed
    if (username && username !== student.username) {
      const existingUsername = await User.findOne({
        where: { username, userId: { [Op.ne]: studentId } }
      });
      if (existingUsername) {
        await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: "Username already exists"
        });
      }
    }

    if (email && email !== student.email) {
      const existingEmail = await User.findOne({
        where: { email, userId: { [Op.ne]: studentId } }
      });
      if (existingEmail) {
        await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: "Email already exists"
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
    if (address !== undefined) updateData.address = address;
    if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (isVerified !== undefined) updateData.isVerified = isVerified;

    // Hash new password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    await student.update(updateData, { transaction });

    await transaction.commit();

    // Remove password from response
    const updatedStudent = student.toJSON();
    delete updatedStudent.password;

    res.json({
      status: true,
      message: "Student updated successfully",
      data: { student: updatedStudent }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Update student error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to update student",
      error: error.message
    });
  }
};

/**
 * Delete Student (Admin/Owner only)
 * Soft delete student and handle enrollment cleanup
 */
export const deleteStudent = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { studentId } = req.params;
    const { permanent = false, cleanupEnrollments = false } = req.body;

    const student = await User.findOne({
      where: { 
        userId: studentId,
        role: 'student'
      }
    });

    if (!student) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Student not found"
      });
    }

    // Get enrollment and batch membership counts
    const enrollmentCount = await Enrollment.count({
      where: { userId: studentId }
    });

    const batchMembershipCount = await BatchStudents.count({
      where: { userId: studentId, role: 'student' }
    });

    // Cleanup enrollments and batch memberships if requested
    if (cleanupEnrollments === 'true' || permanent === 'true') {
      await Enrollment.destroy({
        where: { userId: studentId },
        force: permanent === 'true',
        transaction
      });

      await BatchStudents.destroy({
        where: { userId: studentId, role: 'student' },
        force: permanent === 'true',
        transaction
      });
    }

    if (permanent === 'true') {
      // Hard delete - be careful!
      await student.destroy({ force: true, transaction });
    } else {
      // Soft delete
      await student.destroy({ transaction });
    }

    await transaction.commit();

    res.json({
      status: true,
      message: `Student ${permanent === 'true' ? 'permanently deleted' : 'deleted'} successfully`,
      data: {
        cleanedUpEnrollments: cleanupEnrollments === 'true' || permanent === 'true' ? enrollmentCount : 0,
        cleanedUpBatchMemberships: cleanupEnrollments === 'true' || permanent === 'true' ? batchMembershipCount : 0
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Delete student error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to delete student",
      error: error.message
    });
  }
};

/**
 * ===================== BATCH ASSIGNMENT & MANAGEMENT =====================
 */

/**
 * Assign Student to Batch (Admin/Owner only)
 * Assign student to a specific batch
 */
export const assignStudentToBatch = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { studentId, batchId } = req.body;

    // Validate student exists and is a student
    const student = await User.findOne({
      where: { userId: studentId, role: 'student' }
    });

    if (!student) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Student not found"
      });
    }

    // Validate batch exists
    const batch = await Batch.findByPk(batchId, {
      include: [{
        model: Course,
        attributes: ['courseId', 'title']
      }]
    });

    if (!batch) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Batch not found"
      });
    }

    // Check if student is already in the batch
    const existingMembership = await BatchStudents.findOne({
      where: { userId: studentId, batchId, role: 'student' }
    });

    if (existingMembership) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: "Student is already assigned to this batch"
      });
    }

    // Check batch capacity
    const currentStudents = await BatchStudents.count({
      where: { batchId, role: 'student' }
    });

    if (batch.capacity && currentStudents >= batch.capacity) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: "Batch is at full capacity"
      });
    }

    // Create batch membership
    const batchMembership = await BatchStudents.create({
      userId: studentId,
      batchId,
      role: 'student',
      status: 'active',
      joinedAt: new Date()
    }, { transaction });

    // Also create course enrollment if not exists
    if (batch.courseId) {
      const existingEnrollment = await Enrollment.findOne({
        where: { userId: studentId, courseId: batch.courseId }
      });

      if (!existingEnrollment) {
        await Enrollment.create({
          userId: studentId,
          courseId: batch.courseId,
          status: 'active',
          progressPercentage: 0
        }, { transaction });
      }
    }

    await transaction.commit();

    res.json({
      status: true,
      message: "Student assigned to batch successfully",
      data: {
        student: {
          id: student.userId,
          name: `${student.firstName} ${student.lastName}`,
          email: student.email
        },
        batch: {
          id: batch.batchId,
          title: batch.title,
          course: batch.Course?.title
        },
        batchMembership: batchMembership.toJSON()
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Assign student to batch error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to assign student to batch",
      error: error.message
    });
  }
};

/**
 * Remove Student from Batch (Admin/Owner only)
 * Remove student from a specific batch
 */
export const removeStudentFromBatch = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { studentId, batchId } = req.body;

    const batchMembership = await BatchStudents.findOne({
      where: { userId: studentId, batchId, role: 'student' },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['firstName', 'lastName', 'email']
        },
        {
          model: Batch,
          include: [{
            model: Course,
            attributes: ['title']
          }]
        }
      ]
    });

    if (!batchMembership) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Student is not assigned to this batch"
      });
    }

    // Remove batch membership
    await batchMembership.destroy({ transaction });

    await transaction.commit();

    res.json({
      status: true,
      message: "Student removed from batch successfully",
      data: {
        student: {
          id: studentId,
          name: `${batchMembership.user.firstName} ${batchMembership.user.lastName}`,
          email: batchMembership.user.email
        },
        batch: {
          id: batchId,
          title: batchMembership.Batch.title,
          course: batchMembership.Batch.Course?.title
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Remove student from batch error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to remove student from batch",
      error: error.message
    });
  }
};

/**
 * ===================== STUDENT ENROLLMENT & PROGRESS =====================
 */

/**
 * Get Student Enrolled Courses (Admin/Owner only)
 * List all courses a student is enrolled in
 */
export const getStudentEnrolledCourses = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type,
      category,
      includeProgress = true 
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions for enrollments
    const enrollmentWhere = { userId: studentId };
    if (status) enrollmentWhere.status = status;

    // Build where conditions for courses
    const courseWhere = {};
    if (type) courseWhere.type = type;
    if (category) courseWhere.categoryId = category;

    const enrollments = await Enrollment.findAndCountAll({
      where: enrollmentWhere,
      include: [
        {
          model: Course,
          where: courseWhere,
          include: [
            {
              model: CourseCategory,
              as: 'category',
              attributes: ['categoryId', 'categoryName']
            },
            {
              model: User,
              as: 'instructor',
              attributes: ['userId', 'firstName', 'lastName']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
      distinct: true
    });

    // Add progress information if requested
    const enrollmentsWithDetails = enrollments.rows.map(enrollment => {
      const enrollmentData = enrollment.toJSON();
      
      if (includeProgress === 'true') {
        enrollmentData.progressDetails = {
          percentage: enrollment.progressPercentage || 0,
          status: enrollment.status,
          enrolledAt: enrollment.createdAt,
          lastAccessAt: enrollment.updatedAt,
          completedAt: enrollment.completedAt
        };
      }

      return enrollmentData;
    });

    res.json({
      status: true,
      data: {
        enrollments: enrollmentsWithDetails,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(enrollments.count / parseInt(limit)),
          totalItems: enrollments.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error("Get student enrolled courses error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch student enrolled courses",
      error: error.message
    });
  }
};

/**
 * Get Student Payment History (Admin/Owner only)
 * Simulated payment history based on enrollments
 */
export const getStudentPaymentHistory = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 20, dateRange } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build date filter
    const dateFilter = {};
    if (dateRange) {
      const endDate = new Date();
      const startDate = new Date();
      switch (dateRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }
      dateFilter.createdAt = {
        [Op.gte]: startDate,
        [Op.lte]: endDate
      };
    }

    const enrollments = await Enrollment.findAndCountAll({
      where: {
        userId: studentId,
        ...dateFilter
      },
      include: [
        {
          model: Course,
          attributes: ['courseId', 'title', 'price', 'type'],
          include: [
            {
              model: CourseCategory,
              as: 'category',
              attributes: ['categoryName']
            }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // Simulate payment data based on enrollments
    const paymentHistory = enrollments.rows.map((enrollment, index) => ({
      paymentId: `PAY_${enrollment.enrollmentId}_${Date.now()}`,
      transactionId: `TXN_${enrollment.enrollmentId}`,
      courseId: enrollment.Course.courseId,
      courseTitle: enrollment.Course.title,
      courseType: enrollment.Course.type,
      category: enrollment.Course.category?.categoryName,
      amount: enrollment.Course.price || 0,
      currency: 'USD',
      paymentMethod: ['Credit Card', 'PayPal', 'Bank Transfer'][index % 3],
      status: 'completed', // Simulated as completed
      paymentDate: enrollment.createdAt,
      enrollmentId: enrollment.enrollmentId
    }));

    // Calculate summary statistics
    const totalSpent = paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
    const averageTransactionAmount = paymentHistory.length > 0 
      ? totalSpent / paymentHistory.length 
      : 0;

    const summary = {
      totalTransactions: paymentHistory.length,
      totalSpent,
      averageTransactionAmount,
      paymentMethods: paymentHistory.reduce((methods, payment) => {
        methods[payment.paymentMethod] = (methods[payment.paymentMethod] || 0) + 1;
        return methods;
      }, {})
    };

    res.json({
      status: true,
      data: {
        payments: paymentHistory,
        summary,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(enrollments.count / parseInt(limit)),
          totalItems: enrollments.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error("Get student payment history error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch student payment history",
      error: error.message
    });
  }
};

/**
 * Get Student Wishlist (Admin/Owner only)
 * Simulated wishlist functionality
 */
export const getStudentWishlist = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // For now, we'll simulate wishlist by finding popular courses 
    // that the student hasn't enrolled in yet
    const enrolledCourseIds = await Enrollment.findAll({
      where: { userId: studentId },
      attributes: ['courseId']
    }).then(enrollments => enrollments.map(e => e.courseId));

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const wishlistCourses = await Course.findAndCountAll({
      where: {
        courseId: { [Op.notIn]: enrolledCourseIds },
        status: 'published',
        isPublished: true
      },
      include: [
        {
          model: CourseCategory,
          as: 'category',
          attributes: ['categoryId', 'categoryName']
        },
        {
          model: User,
          as: 'instructor',
          attributes: ['userId', 'firstName', 'lastName']
        }
      ],
      order: [['averageRating', 'DESC'], ['totalRatings', 'DESC']],
      limit: parseInt(limit),
      offset: offset,
      distinct: true
    });

    // Simulate wishlist items with additional metadata
    const wishlistItems = wishlistCourses.rows.map(course => ({
      ...course.toJSON(),
      addedToWishlistAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
      priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)]
    }));

    res.json({
      status: true,
      data: {
        wishlist: wishlistItems,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(wishlistCourses.count / parseInt(limit)),
          totalItems: wishlistCourses.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error("Get student wishlist error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch student wishlist",
      error: error.message
    });
  }
};
