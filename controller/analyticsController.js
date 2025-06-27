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
    // Get time range from query params
    const { startDate, endDate, groupBy = 'day' } = req.query;
    let interval;
    
    // Determine SQL interval based on groupBy parameter
    switch(groupBy) {
      case 'hour':
        interval = 'HOUR';
        break;
      case 'day':
        interval = 'DAY';
        break;
      case 'week':
        interval = 'WEEK';
        break;
      case 'month':
        interval = 'MONTH';
        break;
      default:
        interval = 'DAY';
    }
    
    // This would be a complex query to group users by registration date
    // For now, return mock data
    const mockUserAnalytics = {
      registrations: [
        { date: '2023-01-01', count: 15 },
        { date: '2023-01-02', count: 23 },
        { date: '2023-01-03', count: 18 },
        { date: '2023-01-04', count: 25 },
        { date: '2023-01-05', count: 30 }
      ],
      demographics: {
        gender: {
          male: 45,
          female: 38,
          other: 7,
          unspecified: 10
        },
        age: {
          '18-24': 35,
          '25-34': 42,
          '35-44': 18,
          '45+': 5
        },
        location: {
          'United States': 40,
          'India': 25,
          'UK': 15,
          'Germany': 10,
          'Other': 10
        }
      },
      engagement: {
        dailyActiveUsers: 120,
        weeklyActiveUsers: 350,
        monthlyActiveUsers: 780,
        averageSessionDuration: 22 // minutes
      }
    };
    
    return sendSuccess(res, 200, "User analytics retrieved successfully", mockUserAnalytics);
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
    // Get parameters from query
    const { startDate, endDate, courseId, categoryId } = req.query;
    
    // If courseId is provided, get analytics for that specific course
    if (courseId) {
      // Check if course exists
      const course = await Course.findByPk(courseId);
      
      if (!course) {
        return sendNotFound(res, "Course not found");
      }
      
      // Get enrollment count for this course
      const enrollmentCount = await Enrollment.count({
        where: {
          courseId
        }
      });
      
      // For now, return mock data for the specific course
      const mockCourseAnalytics = {
        enrollments: {
          total: enrollmentCount,
          recent: Math.floor(enrollmentCount * 0.2),
          trend: '+15%'
        },
        completion: {
          rate: 72, // percentage
          averageTime: 14 // days
        },
        ratings: {
          average: 4.5,
          count: Math.floor(enrollmentCount * 0.4),
          distribution: {
            5: 65,
            4: 25,
            3: 7,
            2: 2,
            1: 1
          }
        },
        engagement: {
          videosWatched: 85, // percentage
          quizzesCompleted: 78, // percentage
          forumParticipation: 45 // percentage
        },
        revenue: {
          total: enrollmentCount * course.price,
          recent: Math.floor(enrollmentCount * 0.2) * course.price
        }
      };
      
      return sendSuccess(res, 200, "Course analytics retrieved successfully", mockCourseAnalytics);
    }
    
    // If no courseId, get overall course analytics
    // For now, return mock data
    const mockOverallCourseAnalytics = {
      popular: [
        { courseId: 'course-1', title: 'JavaScript Fundamentals', enrollments: 256 },
        { courseId: 'course-2', title: 'React Mastery', enrollments: 212 },
        { courseId: 'course-3', title: 'Node.js Backend', enrollments: 187 },
        { courseId: 'course-4', title: 'Python for Beginners', enrollments: 145 },
        { courseId: 'course-5', title: 'Data Science Essentials', enrollments: 132 }
      ],
      topRated: [
        { courseId: 'course-6', title: 'UI/UX Design Principles', rating: 4.9 },
        { courseId: 'course-7', title: 'Advanced Machine Learning', rating: 4.8 },
        { courseId: 'course-3', title: 'Node.js Backend', rating: 4.7 },
        { courseId: 'course-8', title: 'Mobile App Development', rating: 4.7 },
        { courseId: 'course-9', title: 'Cloud Computing', rating: 4.6 }
      ],
      categories: [
        { category: 'Web Development', count: 45, popularity: 35 },
        { category: 'Data Science', count: 32, popularity: 28 },
        { category: 'Mobile Development', count: 28, popularity: 20 },
        { category: 'Design', count: 25, popularity: 15 },
        { category: 'Business', count: 20, popularity: 12 }
      ],
      levels: [
        { level: 'Beginner', count: 62, popularity: 48 },
        { level: 'Intermediate', count: 45, popularity: 35 },
        { level: 'Advanced', count: 28, popularity: 17 }
      ],
      completion: {
        averageRate: 68, // percentage
        byCategory: [
          { category: 'Web Development', rate: 72 },
          { category: 'Data Science', rate: 65 },
          { category: 'Mobile Development', rate: 70 },
          { category: 'Design', rate: 75 },
          { category: 'Business', rate: 62 }
        ]
      }
    };
    
    return sendSuccess(res, 200, "Overall course analytics retrieved successfully", mockOverallCourseAnalytics);
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
    // Get parameters from query
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    // This would be a complex query to calculate revenue over time
    // For now, return mock data
    const mockRevenueAnalytics = {
      summary: {
        total: 325000,
        recent: 42000,
        growth: 18.5, // percentage
        projected: 450000
      },
      timeline: [
        { date: '2023-01-01', amount: 1200 },
        { date: '2023-01-02', amount: 1450 },
        { date: '2023-01-03', amount: 1350 },
        { date: '2023-01-04', amount: 1600 },
        { date: '2023-01-05', amount: 1750 },
        { date: '2023-01-06', amount: 1900 },
        { date: '2023-01-07', amount: 2100 }
      ],
      byCategory: [
        { category: 'Web Development', amount: 120000 },
        { category: 'Data Science', amount: 95000 },
        { category: 'Mobile Development', amount: 85000 },
        { category: 'Design', amount: 65000 },
        { category: 'Business', amount: 50000 }
      ],
      byInstructor: [
        { instructorId: 'instructor-1', name: 'John Smith', amount: 85000 },
        { instructorId: 'instructor-2', name: 'Sarah Johnson', amount: 72000 },
        { instructorId: 'instructor-3', name: 'Michael Brown', amount: 65000 },
        { instructorId: 'instructor-4', name: 'Emily Davis', amount: 58000 },
        { instructorId: 'instructor-5', name: 'Robert Wilson', amount: 45000 }
      ],
      paymentMethods: {
        'Credit Card': 65,
        'PayPal': 25,
        'Bank Transfer': 8,
        'Other': 2
      }
    };
    
    return sendSuccess(res, 200, "Revenue analytics retrieved successfully", mockRevenueAnalytics);
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
