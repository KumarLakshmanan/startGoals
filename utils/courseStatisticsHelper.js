import Course from "../model/course.js";
import Section from "../model/section.js";
import Lesson from "../model/lesson.js";
import sequelize from "../config/db.js";

/**
 * Utility to update course statistics - similar to project statistics
 * Can be used after adding/removing sections, lessons, or enrollments
 */
export const updateCourseStatistics = async (courseId) => {
  try {
    // Find the course
    const course = await Course.findByPk(courseId);
    if (!course) {
      throw new Error(`Course not found with ID: ${courseId}`);
    }

    // For recorded courses, update section and lesson counts
    if (course.type === "recorded") {
      // Count total sections
      const totalSections = await Section.count({
        where: { courseId }
      });

      // Count total lessons
      const totalLessons = await Lesson.count({
        where: { courseId }
      });

      // Calculate total duration minutes
      const lessonDurations = await Lesson.findAll({
        where: { courseId },
        attributes: [
          [sequelize.fn('SUM', sequelize.col('duration')), 'totalDuration']
        ],
        raw: true
      });

      const totalDuration = lessonDurations[0]?.totalDuration || 0;

      // Update course statistics
      await course.update({
        totalSections,
        totalLessons,
        durationMinutes: totalDuration,
        lastUpdated: new Date()
      });

      return {
        totalSections,
        totalLessons,
        durationMinutes: totalDuration
      };
    }
    
    // For live courses, we might want to update batch statistics
    // or other relevant fields
    return null;
  } catch (error) {
    console.error('Error updating course statistics:', error);
    throw error;
  }
};

/**
 * Utility to update course enrollment statistics
 */
export const updateCourseEnrollmentStatistics = async (courseId) => {
  try {
    // Find the course
    const course = await Course.findByPk(courseId);
    if (!course) {
      throw new Error(`Course not found with ID: ${courseId}`);
    }

    // Count total enrollments
    const totalEnrollments = await Enrollment.count({
      where: { courseId }
    });

    // Calculate total revenue
    const enrollments = await Enrollment.findAll({
      where: { courseId, status: 'active' },
      attributes: [
        [sequelize.fn('SUM', sequelize.col('amount_paid')), 'totalRevenue']
      ],
      raw: true
    });

    const totalRevenue = enrollments[0]?.totalRevenue || 0;

    // Update course statistics
    await course.update({
      totalEnrollments,
      totalRevenue
    });

    return {
      totalEnrollments,
      totalRevenue
    };
  } catch (error) {
    console.error('Error updating course enrollment statistics:', error);
    throw error;
  }
};

export default {
  updateCourseStatistics,
  updateCourseEnrollmentStatistics
};
