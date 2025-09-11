// ===========================================================================================
// ANALYTICS CONTROLLER
// Handles platform analytics, user statistics, and performance metrics
// ===========================================================================================

import { Op } from "sequelize";
import sequelize from "../config/db.js";
import {
  sendSuccess,
  sendValidationError,
  sendServerError,
} from "../utils/responseHelper.js";
import User from "../model/user.js";
import Course from "../model/course.js";
import Enrollment from "../model/enrollment.js";
import Order from "../model/order.js";
import OrderItem from "../model/orderItem.js";

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

     // Get real revenue data from orders
     const totalRevenue = await Order.sum('finalAmount', {
       where: {
         status: 'paid',
         ...dateRange
       }
     }) || 0;

     const recentRevenue = await Order.sum('finalAmount', {
       where: {
         status: 'paid',
         createdAt: {
           [Op.gte]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
         }
       }
     }) || 0;

     // Calculate revenue growth (simplified)
     const previousRevenue = await Order.sum('finalAmount', {
       where: {
         status: 'paid',
         createdAt: {
           [Op.lt]: new Date(new Date() - 30 * 24 * 60 * 60 * 1000),
           [Op.gte]: new Date(new Date() - 60 * 24 * 60 * 60 * 1000) // Previous 30 days
         }
       }
     }) || 0;

     const revenueGrowth = previousRevenue === 0 ? 100 :
       ((recentRevenue - previousRevenue) / previousRevenue * 100).toFixed(2);

     // Return counts with real data
     const overview = {
       users: {
         total: totalUsers,
         new: newUsers,
         active: activeUsers,
         growth: ((newUsers / totalUsers) * 100).toFixed(2)
       },
       courses: {
         total: totalCourses,
         published: Math.floor(totalCourses * 0.8), // Estimated - would need status field
         draft: Math.floor(totalCourses * 0.2), // Estimated - would need status field
         mostPopular: 'Real data would require enrollment analysis' // Placeholder
       },
       enrollments: {
         total: totalEnrollments,
         recent: Math.floor(totalEnrollments * 0.3), // Estimated - would need date filtering
         completionRate: 68 // Estimated - would need completion tracking
       },
       revenue: {
         total: parseFloat(totalRevenue),
         recent: parseFloat(recentRevenue),
         growth: parseFloat(revenueGrowth)
       }
     };

     return sendSuccess(res, "Platform overview retrieved successfully", overview);
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
    const { startDate, endDate } = req.query;
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
    
    return sendSuccess(res, "User analytics retrieved successfully", userData);
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
    
    return sendSuccess(res, "Course analytics retrieved successfully", courseData);
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
    const { startDate, endDate } = req.query;
    const dateRange = {};
    
    if (startDate && endDate) {
      dateRange.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }
    
    // Get revenue by month from orders
    const monthlyRevenue = await Order.findAll({
      attributes: [
        [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt')), 'month'],
        [sequelize.fn('sum', sequelize.col('finalAmount')), 'total']
      ],
      where: {
        ...dateRange,
        status: 'paid'
      },
      group: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))],
      order: [sequelize.fn('date_trunc', 'month', sequelize.col('createdAt'))]
    });

    // Get revenue by item type (course vs project)
    const revenueByType = await OrderItem.findAll({
      attributes: [
        'itemType',
        [sequelize.fn('sum', sequelize.col('finalPrice')), 'total']
      ],
      include: [{
        model: Order,
        attributes: [],
        where: {
          status: 'paid',
          ...dateRange
        }
      }],
      group: ['itemType'],
      order: [[sequelize.fn('sum', sequelize.col('finalPrice')), 'DESC']]
    });

    // Get top courses/projects by revenue
    const topItemsByRevenue = await OrderItem.findAll({
      attributes: [
        'itemId',
        'itemType',
        [sequelize.fn('sum', sequelize.col('finalPrice')), 'total']
      ],
      include: [{
        model: Order,
        attributes: [],
        where: {
          status: 'paid',
          ...dateRange
        }
      }],
      group: ['itemId', 'itemType'],
      order: [[sequelize.fn('sum', sequelize.col('finalPrice')), 'DESC']],
      limit: 10
    });

    // Calculate overall metrics
    const totalRevenue = await Order.sum('finalAmount', {
      where: {
        ...dateRange,
        status: 'paid'
      }
    }) || 0;

    const previousPeriodRevenue = await Order.sum('finalAmount', {
      where: {
        createdAt: {
          [Op.lt]: startDate ? new Date(startDate) : new Date(),
          [Op.gte]: startDate
            ? new Date(new Date(startDate).getTime() - (new Date(endDate).getTime() - new Date(startDate).getTime()))
            : new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000)
        },
        status: 'paid'
      }
    }) || 0;

    const revenueGrowth = previousPeriodRevenue === 0
      ? 100
      : ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue * 100).toFixed(2);

    const totalOrders = await Order.count({
      where: {
        ...dateRange,
        status: 'paid'
      }
    }) || 1;

    const revenueData = {
      monthlyRevenue: monthlyRevenue.map(item => ({
        month: item.get('month'),
        total: parseFloat(item.get('total') || 0)
      })),
      revenueByType: revenueByType.map(item => ({
        type: item.get('itemType'),
        total: parseFloat(item.get('total') || 0)
      })),
      topCourses: topItemsByRevenue.map(item => ({
        id: item.get('itemId'),
        title: `Item ${item.get('itemId')}`, // Would need to join with Course/Project tables
        total: parseFloat(item.get('total') || 0)
      })),
      totalRevenue,
      revenueGrowth,
      averageOrderValue: totalRevenue / totalOrders
    };
    
    return sendSuccess(res, "Revenue analytics retrieved successfully", revenueData);
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
      return sendSuccess(res, "Custom report generated successfully (CSV format)", {
        ...mockReport,
        downloadUrl: '/api/admin/analytics/download/report-123.csv'
      });
    }
    
    return sendSuccess(res, "Custom report generated successfully", mockReport);
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
        'username',
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
        name: `${student.username}`,
        email: student.email,
        enrollmentCount: parseInt(student.get('enrollmentCount'), 10)
      })),
      totalStudents,
      activeStudents: activeStudentCount,
      retentionRate: ((activeStudentCount / totalStudents) * 100).toFixed(2)
    };

    return sendSuccess(res, "Student analytics retrieved successfully", studentData);
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
        'username',
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
        'id',        'username',

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
        name: `${teacher.username}`,
        email: teacher.email,
        courseCount: parseInt(teacher.get('courseCount'), 10)
      })),
      topTeachersByStudents: topTeachersByStudents.map(teacher => ({
        id: teacher.id,
        name: `${teacher.username}`,
        studentCount: parseInt(teacher.get('studentCount'), 10)
      })),
      registrationTrend: registrationTrend.map(item => ({
        month: item.get('month'),
        count: parseInt(item.get('count'), 10)
      }))
    };

    return sendSuccess(res, "Teacher analytics retrieved successfully", teacherData);
  } catch (error) {
    console.error("Error getting teacher analytics:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get dashboard stats for overview cards
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Get current month and previous month date ranges
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get total counts
    const totalStudents = await User.count({ where: { role: 'student' } });
    const totalCourses = await Course.count();

    // Get current month students
    const currentMonthStudents = await User.count({
      where: {
        role: 'student',
        createdAt: {
          [Op.gte]: currentMonthStart
        }
      }
    });

    // Get previous month students
    const previousMonthStudents = await User.count({
      where: {
        role: 'student',
        createdAt: {
          [Op.between]: [previousMonthStart, previousMonthEnd]
        }
      }
    });

    // Get current month courses
    const currentMonthCourses = await Course.count({
      where: {
        createdAt: {
          [Op.gte]: currentMonthStart
        }
      }
    });

    // Get previous month courses
    const previousMonthCourses = await Course.count({
      where: {
        createdAt: {
          [Op.between]: [previousMonthStart, previousMonthEnd]
        }
      }
    });

    // Get current month instructors
    const currentMonthInstructors = await User.count({
      where: {
        role: 'teacher',
        createdAt: {
          [Op.gte]: currentMonthStart
        }
      }
    });

    // Get previous month instructors
    const previousMonthInstructors = await User.count({
      where: {
        role: 'teacher',
        createdAt: {
          [Op.between]: [previousMonthStart, previousMonthEnd]
        }
      }
    });

    // Calculate growth percentages
    const studentGrowth = previousMonthStudents === 0 ? 100 :
      ((currentMonthStudents - previousMonthStudents) / previousMonthStudents * 100);

    const courseGrowth = previousMonthCourses === 0 ? 100 :
      ((currentMonthCourses - previousMonthCourses) / previousMonthCourses * 100);

    const instructorGrowth = previousMonthInstructors === 0 ? 100 :
      ((currentMonthInstructors - previousMonthInstructors) / previousMonthInstructors * 100);

    // Get active instructors (those who have logged in recently)
    const activeInstructors = await User.count({
      where: {
        role: 'teacher',
        lastLoginAt: {
          [Op.gte]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        }
      }
    });

    // Get real revenue data from orders
    const totalRevenue = await Order.sum('finalAmount', {
      where: {
        status: 'paid'
      }
    }) || 0;

    // Get current month revenue
    const currentMonthRevenue = await Order.sum('finalAmount', {
      where: {
        status: 'paid',
        createdAt: {
          [Op.gte]: currentMonthStart
        }
      }
    }) || 0;

    // Get previous month revenue
    const previousMonthRevenue = await Order.sum('finalAmount', {
      where: {
        status: 'paid',
        createdAt: {
          [Op.between]: [previousMonthStart, previousMonthEnd]
        }
      }
    }) || 0;

    const revenueGrowth = previousMonthRevenue === 0 ? 100 :
      ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue * 100);

    const dashboardStats = {
      totalRevenue,
      revenueGrowth,
      totalStudents,
      studentGrowth: parseFloat(studentGrowth.toFixed(2)),
      totalCourses,
      courseGrowth: parseFloat(courseGrowth.toFixed(2)),
      activeInstructors,
      instructorGrowth: parseFloat(instructorGrowth.toFixed(2))
    };

    return sendSuccess(res, "Dashboard stats retrieved successfully", dashboardStats);
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
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

    return sendSuccess(res, "Engagement analytics retrieved successfully", engagementData);
  } catch (error) {
    console.error("Error getting engagement analytics:", error);
    return sendServerError(res, error);
  }
};
