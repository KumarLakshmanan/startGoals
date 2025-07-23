// ===========================================================================================
// ANALYTICS CONTROLLER
// Handles platform analytics, user statistics, and performance metrics
// ===========================================================================================

import { Op } from "sequelize";
import sequelize from "../config/db.js";
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
import User from "../model/user.js";
import Course from "../model/course.js";
import Enrollment from "../model/enrollment.js";

/**
 * Get platform overview statistics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getPlatformOverview = async (req, res) => {
  try {
    // Get time range from query params
    const { startDate, endDate } = req.query;
    const dateRange = {};
    
    if (startDate && endDate) {
      dateRange.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // Get counts for various metrics
    const [
      totalUsers,
      newUsers,
      totalCourses,
      totalEnrollments,
      activeUsers
    ] = await Promise.all([
      User.count(),
      User.count({
        where: {
          ...dateRange
        }
      }),
      Course.count(),
      Enrollment.count(),
      User.count({
        where: {
          lastLoginAt: {
            [Op.gte]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      })
    ]);
    
    // For now, return counts with some mock data for stats that require more complex queries
    const overview = {
      users: {
        total: totalUsers,
        new: newUsers,
        active: activeUsers,
        growth: ((newUsers / totalUsers) * 100).toFixed(2)
      },
      courses: {
        total: totalCourses,
        published: Math.floor(totalCourses * 0.8), // Mock data
        draft: Math.floor(totalCourses * 0.2), // Mock data
        mostPopular: 'Sample Popular Course' // Mock data
      },
      enrollments: {
        total: totalEnrollments,
        recent: Math.floor(totalEnrollments * 0.3), // Mock data
        completionRate: 68 // Mock percentage
      },
      revenue: {
        total: 125000, // Mock data
        recent: 15000, // Mock data
        growth: 12.5 // Mock percentage
      }
    };
    
    return sendSuccess(res, 200, "Platform overview retrieved successfully", overview);
  } catch (error) {
    console.error("Error getting platform overview:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get user analytics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getUserAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    const dateRange = {};
    
    if (startDate && endDate) {
      dateRange.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // Get user analytics based on requested type
    const userCounts = await User.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('count', sequelize.col('id')), 'count']
      ],
      where: dateRange,
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))],
      order: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))]
    });
    
    // Get user role distribution
    const userRoles = await User.findAll({
      attributes: [
        'role',
        [sequelize.fn('count', sequelize.col('id')), 'count']
      ],
      group: ['role']
    });
    
    // Get user activity data
    const activeUsers = await User.count({
      where: {
        lastLoginAt: {
          [Op.gte]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });
    
    const totalUsers = await User.count();
    
    const userData = {
      userGrowth: userCounts.map(item => ({
        month: item.get('month'),
        count: parseInt(item.get('count'), 10)
      })),
      userRoleDistribution: userRoles.map(item => ({
        role: item.get('role'),
        count: parseInt(item.get('count'), 10)
      })),
      activeUsers,
      totalUsers,
      activePercentage: ((activeUsers / totalUsers) * 100).toFixed(2),
      recentSignups: await User.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(new Date() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    };
    
    return sendSuccess(res, 200, "User analytics retrieved successfully", userData);
  } catch (error) {
    console.error("Error getting user analytics:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get course analytics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getCourseAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, categoryId } = req.query;
    const dateRange = {};
    const whereClause = {};
    
    if (startDate && endDate) {
      dateRange.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }
    
    // Get course creation analytics
    const courseCreation = await Course.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('count', sequelize.col('id')), 'count']
      ],
      where: { ...dateRange, ...whereClause },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))],
      order: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))]
    });
    
    // Get course type distribution
    const courseTypes = await Course.findAll({
      attributes: [
        'type',
        [sequelize.fn('count', sequelize.col('id')), 'count']
      ],
      where: whereClause,
      group: ['type']
    });
    
    // Get enrollment statistics
    const enrollmentStats = await Enrollment.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('count', sequelize.col('id')), 'count']
      ],
      where: dateRange,
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))],
      order: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))]
    });
    
    // Get top courses by enrollment
    const topCourses = await Course.findAll({
      attributes: [
        'id',
        'title',
        'type',
        [sequelize.fn('count', sequelize.col('Enrollments.id')), 'enrollmentCount']
      ],
      include: [{
        model: Enrollment,
        attributes: []
      }],
      where: whereClause,
      group: ['Course.id'],
      order: [[sequelize.fn('count', sequelize.col('Enrollments.id')), 'DESC']],
      limit: 10
    });
    
    // Get completion rate statistics
    // Assuming you have a completionStatus field in Enrollment
    const completionRates = await Enrollment.findAll({
      attributes: [
        'completionStatus',
        [sequelize.fn('count', sequelize.col('id')), 'count']
      ],
      group: ['completionStatus']
    });
    
    const courseData = {
      courseCreationTrend: courseCreation.map(item => ({
        month: item.get('month'),
        count: parseInt(item.get('count'), 10)
      })),
      courseTypeDistribution: courseTypes.map(item => ({
        type: item.get('type'),
        count: parseInt(item.get('count'), 10)
      })),
      enrollmentTrend: enrollmentStats.map(item => ({
        month: item.get('month'),
        count: parseInt(item.get('count'), 10)
      })),
      topCourses: topCourses.map(course => ({
        id: course.id,
        title: course.title,
        type: course.type,
        enrollmentCount: parseInt(course.get('enrollmentCount'), 10)
      })),
      completionRates: completionRates.map(item => ({
        status: item.get('completionStatus'),
        count: parseInt(item.get('count'), 10)
      })),
      totalCourses: await Course.count(whereClause),
      totalEnrollments: await Enrollment.count({ where: dateRange }),
      activeEnrollments: await Enrollment.count({
        where: {
          ...dateRange,
          completionStatus: 'in-progress'
        }
      })
    };
    
    return sendSuccess(res, 200, "Course analytics retrieved successfully", courseData);
  } catch (error) {
    console.error("Error getting course analytics:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get revenue analytics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    const dateRange = {};
    
    if (startDate && endDate) {
      dateRange.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // We'll need to implement or import the Payment model
    // Assuming you have Payment model with courseId, amount, status fields
    const Payment = sequelize.models.Payment || { findAll: () => [] };
    
    // Get revenue by month
    const monthlyRevenue = await Payment.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('sum', sequelize.col('amount')), 'total']
      ],
      where: { 
        ...dateRange,
        status: 'completed' 
      },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))],
      order: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))]
    });
    
    // Get revenue by course type
    const revenueByType = await Payment.findAll({
      attributes: [
        [sequelize.literal('Course.type'), 'courseType'],
        [sequelize.fn('sum', sequelize.col('Payment.amount')), 'total']
      ],
      include: [{
        model: Course,
        attributes: []
      }],
      where: { 
        ...dateRange,
        status: 'completed' 
      },
      group: [sequelize.literal('Course.type')],
      order: [[sequelize.fn('sum', sequelize.col('Payment.amount')), 'DESC']]
    });
    
    // Get top courses by revenue
    const topCoursesByRevenue = await Payment.findAll({
      attributes: [
        [sequelize.literal('Course.id'), 'courseId'],
        [sequelize.literal('Course.title'), 'courseTitle'],
        [sequelize.fn('sum', sequelize.col('Payment.amount')), 'total']
      ],
      include: [{
        model: Course,
        attributes: []
      }],
      where: { 
        ...dateRange,
        status: 'completed' 
      },
      group: [sequelize.literal('Course.id'), sequelize.literal('Course.title')],
      order: [[sequelize.fn('sum', sequelize.col('Payment.amount')), 'DESC']],
      limit: 10
    });
    
    // Calculate overall metrics
    const totalRevenue = await Payment.sum('amount', {
      where: { 
        ...dateRange,
        status: 'completed' 
      }
    }) || 0;
    
    const previousPeriodRevenue = await Payment.sum('amount', {
      where: { 
        createdAt: {
          [Op.lt]: startDate ? new Date(startDate) : new Date(),
          [Op.gte]: startDate 
            ? new Date(new Date(startDate).getTime() - (new Date(endDate).getTime() - new Date(startDate).getTime()))
            : new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
        },
        status: 'completed'
      }
    }) || 0;
    
    const revenueGrowth = previousPeriodRevenue === 0 
      ? 100 
      : ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue * 100).toFixed(2);
    
    const revenueData = {
      monthlyRevenue: monthlyRevenue.map(item => ({
        month: item.get('month'),
        total: parseFloat(item.get('total') || 0)
      })),
      revenueByType: revenueByType.map(item => ({
        type: item.get('courseType'),
        total: parseFloat(item.get('total') || 0)
      })),
      topCourses: topCoursesByRevenue.map(item => ({
        id: item.get('courseId'),
        title: item.get('courseTitle'),
        total: parseFloat(item.get('total') || 0)
      })),
      totalRevenue,
      revenueGrowth,
      averageOrderValue: totalRevenue / (await Payment.count({ 
        where: { 
          ...dateRange,
          status: 'completed' 
        } 
      }) || 1)
    };
    
    return sendSuccess(res, 200, "Revenue analytics retrieved successfully", revenueData);
  } catch (error) {
    console.error("Error getting revenue analytics:", error);
    return sendServerError(res, error);
  }
};

/**
 * Generate a custom report based on specified metrics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateCustomReport = async (req, res) => {
  try {
    // Get parameters from request body
    const { metrics, filters, startDate, endDate, format = 'json' } = req.body;
    
    // Validate input
    if (!metrics || !Array.isArray(metrics) || metrics.length === 0) {
      return sendValidationError(res, "At least one metric must be specified");
    }
    
    // This would build and execute complex queries based on requested metrics
    // For now, return mock data
    const mockReport = {
      generatedAt: new Date(),
      timeRange: {
        start: startDate || '2023-01-01',
        end: endDate || new Date().toISOString().split('T')[0]
      },
      metrics: {},
      filters: filters || {}
    };
    
    // Add mock data for each requested metric
    if (metrics.includes('users')) {
      mockReport.metrics.users = {
        total: 2500,
        active: 1800,
        new: 350
      };
    }
    
    if (metrics.includes('courses')) {
      mockReport.metrics.courses = {
        total: 150,
        published: 120,
        draft: 30,
        byCategory: [
          { category: 'Web Development', count: 45 },
          { category: 'Data Science', count: 32 },
          { category: 'Mobile Development', count: 28 }
        ]
      };
    }
    
    if (metrics.includes('revenue')) {
      mockReport.metrics.revenue = {
        total: 325000,
        byMonth: [
          { month: 'January', amount: 42000 },
          { month: 'February', amount: 38000 },
          { month: 'March', amount: 45000 }
        ]
      };
    }
    
    if (metrics.includes('enrollments')) {
      mockReport.metrics.enrollments = {
        total: 5600,
        completionRate: 68,
        byMonth: [
          { month: 'January', count: 650 },
          { month: 'February', count: 580 },
          { month: 'March', count: 720 }
        ]
      };
    }
    
    // If format is CSV, we would convert the data to CSV
    // For now, just indicate this in the response
    if (format === 'csv') {
      return sendSuccess(res, 200, "Custom report generated successfully (CSV format)", {
        ...mockReport,
        downloadUrl: '/api/admin/analytics/download/report-123.csv'
      });
    }
    
    return sendSuccess(res, 200, "Custom report generated successfully", mockReport);
  } catch (error) {
    console.error("Error generating custom report:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get student analytics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getStudentAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = {};
    
    if (startDate && endDate) {
      dateRange.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get student registration trend
    const registrationTrend = await User.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('count', sequelize.col('id')), 'count']
      ],
      where: { 
        ...dateRange,
        role: 'student' 
      },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))],
      order: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))]
    });

    // Get enrollment trend
    const enrollmentTrend = await Enrollment.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('count', sequelize.col('id')), 'count']
      ],
      where: dateRange,
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))],
      order: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))]
    });

    // Get most active students
    const activeStudents = await User.findAll({
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        [sequelize.fn('count', sequelize.col('Enrollments.id')), 'enrollmentCount']
      ],
      include: [{
        model: Enrollment,
        attributes: []
      }],
      where: {
        role: 'student'
      },
      group: ['User.id'],
      order: [[sequelize.fn('count', sequelize.col('Enrollments.id')), 'DESC']],
      limit: 10
    });

    // Calculate student retention (simplified version)
    const totalStudents = await User.count({
      where: { role: 'student' }
    });

    const activeStudentCount = await User.count({
      where: {
        role: 'student',
        lastLoginAt: {
          [Op.gte]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    const studentData = {
      registrationTrend: registrationTrend.map(item => ({
        month: item.get('month'),
        count: parseInt(item.get('count'), 10)
      })),
      enrollmentTrend: enrollmentTrend.map(item => ({
        month: item.get('month'),
        count: parseInt(item.get('count'), 10)
      })),
      mostActiveStudents: activeStudents.map(student => ({
        id: student.id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        enrollmentCount: parseInt(student.get('enrollmentCount'), 10)
      })),
      totalStudents,
      activeStudents: activeStudentCount,
      retentionRate: ((activeStudentCount / totalStudents) * 100).toFixed(2)
    };

    return sendSuccess(res, 200, "Student analytics retrieved successfully", studentData);
  } catch (error) {
    console.error("Error getting student analytics:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get teacher analytics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getTeacherAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = {};
    
    if (startDate && endDate) {
      dateRange.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // Get teacher data
    const totalTeachers = await User.count({
      where: { 
        ...dateRange,
        role: 'teacher' 
      }
    });

    // Top teachers by courses
    const topTeachersByCourses = await User.findAll({
      attributes: [
        'id',
        'firstName',
        'lastName',
        'email',
        [sequelize.fn('count', sequelize.col('Courses.id')), 'courseCount']
      ],
      include: [{
        model: Course,
        attributes: [],
        as: 'CreatedCourses'
      }],
      where: {
        role: 'teacher'
      },
      group: ['User.id'],
      order: [[sequelize.fn('count', sequelize.col('Courses.id')), 'DESC']],
      limit: 10
    });

    // Top teachers by students
    const topTeachersByStudents = await User.findAll({
      attributes: [
        'id',
        'firstName',
        'lastName',
        [sequelize.literal('COUNT(DISTINCT "Enrollments"."userId")'), 'studentCount']
      ],
      include: [{
        model: Course,
        attributes: [],
        as: 'CreatedCourses',
        include: [{
          model: Enrollment,
          attributes: []
        }]
      }],
      where: {
        role: 'teacher'
      },
      group: ['User.id'],
      order: [[sequelize.literal('COUNT(DISTINCT "Enrollments"."userId")'), 'DESC']],
      limit: 10
    });

    // Teacher registration trend
    const registrationTrend = await User.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('count', sequelize.col('id')), 'count']
      ],
      where: { 
        ...dateRange,
        role: 'teacher' 
      },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))],
      order: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))]
    });

    const teacherData = {
      totalTeachers,
      newTeachers: await User.count({
        where: {
          role: 'teacher',
          createdAt: {
            [Op.gte]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      activeTeachers: await User.count({
        where: {
          role: 'teacher',
          lastLoginAt: {
            [Op.gte]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      topTeachersByCourses: topTeachersByCourses.map(teacher => ({
        id: teacher.id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        email: teacher.email,
        courseCount: parseInt(teacher.get('courseCount'), 10)
      })),
      topTeachersByStudents: topTeachersByStudents.map(teacher => ({
        id: teacher.id,
        name: `${teacher.firstName} ${teacher.lastName}`,
        studentCount: parseInt(teacher.get('studentCount'), 10)
      })),
      registrationTrend: registrationTrend.map(item => ({
        month: item.get('month'),
        count: parseInt(item.get('count'), 10)
      }))
    };

    return sendSuccess(res, 200, "Teacher analytics retrieved successfully", teacherData);
  } catch (error) {
    console.error("Error getting teacher analytics:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get engagement analytics
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getEngagementAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateRange = {};
    
    if (startDate && endDate) {
      dateRange.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    // For now, return mock data for engagement analytics
    // In a real implementation, you would query user activity logs,
    // session data, content progress, etc.
    const engagementData = {
      avgSessionDuration: 32, // minutes
      avgCoursesPerStudent: 2.3,
      completionRates: {
        overall: 68, // percentage
        byType: [
          { type: 'recorded', rate: 72 },
          { type: 'live', rate: 64 }
        ]
      },
      courseEngagement: [
        { courseId: '1', title: 'Course 1', engagement: 89 },
        { courseId: '2', title: 'Course 2', engagement: 76 },
        { courseId: '3', title: 'Course 3', engagement: 82 }
      ],
      activityTrend: [
        { date: '2023-01', sessions: 1250 },
        { date: '2023-02', sessions: 1480 },
        { date: '2023-03', sessions: 1620 }
      ]
    };

    return sendSuccess(res, 200, "Engagement analytics retrieved successfully", engagementData);
  } catch (error) {
    console.error("Error getting engagement analytics:", error);
    return sendServerError(res, error);
  }
};
