import sequelize from '../config/db.js';
import User from '../model/user.js';
import Course from '../model/course.js';
import Category from '../model/category.js';
import CourseLevel from '../model/courseLevel.js';
import Project from '../model/project.js';
import ProjectFile from '../model/projectFile.js';
import Language from '../model/language.js';
import LiveSession from '../model/liveSession.js';
import Banner from '../model/banner.js';
import Goal from '../model/goal.js';
import Skill from '../model/skill.js';
import Exam from '../model/exam.js';
import Batch from '../model/batch.js';
import Section from '../model/section.js';
import Lesson from '../model/lesson.js';
import CourseRating from '../model/courseRating.js';
import ProjectRating from '../model/projectRating.js';
import Enrollment from '../model/enrollment.js';
import ProjectPurchase from '../model/projectPurchase.js';

/**
 * Comprehensive validation of seeded database
 */
async function validateSeedData() {
  try {
    console.log('🔍 Starting comprehensive database validation...\n');

    // Basic Data Validation
    console.log('📊 BASIC DATA VALIDATION');
    console.log('='.repeat(50));

    const adminCount = await User.count({ where: { role: 'admin' } });
    const teacherCount = await User.count({ where: { role: 'teacher' } });
    const studentCount = await User.count({ where: { role: 'student' } });
    
    console.log(`👤 Admin users: ${adminCount}`);
    console.log(`👨‍🏫 Teacher users: ${teacherCount}`);
    console.log(`👨‍🎓 Student users: ${studentCount}`);

    const levelCount = await CourseLevel.count();
    const categoryCount = await Category.count();
    const languageCount = await Language.count();
    
    console.log(`📊 Course levels: ${levelCount}`);
    console.log(`📂 Course categories: ${categoryCount}`);
    console.log(`🌐 Languages: ${languageCount}`);

    // Course Validation
    console.log('\n📚 COURSE VALIDATION');
    console.log('='.repeat(50));

    const liveCourses = await Course.count({ where: { type: 'live' } });
    const recordedCourses = await Course.count({ where: { type: 'recorded' } });
    const totalCourses = await Course.count();
    
    console.log(`🔴 Live courses: ${liveCourses}`);
    console.log(`📹 Recorded courses: ${recordedCourses}`);
    console.log(`📚 Total courses: ${totalCourses}`);

    // Check course requirements
    const requirements = {
      liveCourses: liveCourses >= 10,
      recordedCourses: recordedCourses >= 10,
    };

    console.log(`✅ Live courses requirement (≥10): ${requirements.liveCourses ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Recorded courses requirement (≥10): ${requirements.recordedCourses ? 'PASSED' : 'FAILED'}`);

    // Course with sections and lessons (count directly)
    const totalSections = await Section.count();
    const totalLessons = await Lesson.count();
    
    console.log(` Total sections: ${totalSections}`);
    console.log(`📝 Total lessons: ${totalLessons}`);

    // Live sessions and batches
    const batchCount = await Batch.count();
    const liveSessionCount = await LiveSession.count();
    
    console.log(`👥 Batches: ${batchCount}`);
    console.log(`📺 Live sessions: ${liveSessionCount}`);

    // Project Validation
    console.log('\n🛠️ PROJECT VALIDATION');
    console.log('='.repeat(50));

    const totalProjects = await Project.count();
    const publishedProjects = await Project.count({ where: { status: 'published' } });
    const projectsWithFiles = await Project.count();
    // Get projects that have files (we'll count separately)
    const totalProjectFiles = await ProjectFile.count();
    console.log(`📄 Total project files: ${totalProjectFiles}`);

    // Check project requirements
    const projectRequirements = {
      totalProjects: totalProjects >= 10,
      projectsWithFiles: totalProjectFiles >= 10, // Check if we have at least 10 project files
    };

    console.log(`✅ Total projects requirement (≥10): ${projectRequirements.totalProjects ? 'PASSED' : 'FAILED'}`);
    console.log(`✅ Projects with files requirement (≥10 files): ${projectRequirements.projectsWithFiles ? 'PASSED' : 'FAILED'}`);

    console.log(`🛠️ Total projects: ${totalProjects}`);
    console.log(`✅ Published projects: ${publishedProjects}`);
    console.log(`📁 Total projects: ${projectsWithFiles}`);

    // Ratings Validation
    console.log('\n⭐ RATINGS VALIDATION');
    console.log('='.repeat(50));

    const courseRatingCount = await CourseRating.count();
    const projectRatingCount = await ProjectRating.count();
    
    console.log(`⭐ Course ratings: ${courseRatingCount}`);
    console.log(`⭐ Project ratings: ${projectRatingCount}`);

    // Get average ratings
    const avgCourseRating = await CourseRating.findOne({
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']]
    });

    const avgProjectRating = await ProjectRating.findOne({
      attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']]
    });

    console.log(`📊 Average course rating: ${parseFloat(avgCourseRating?.dataValues?.avgRating || 0).toFixed(2)}`);
    console.log(`📊 Average project rating: ${parseFloat(avgProjectRating?.dataValues?.avgRating || 0).toFixed(2)}`);

    // Purchases and Enrollments Validation
    console.log('\n💰 PURCHASES & ENROLLMENTS VALIDATION');
    console.log('='.repeat(50));

    const enrollmentCount = await Enrollment.count();
    const purchaseCount = await ProjectPurchase.count();
    
    console.log(`📚 Course enrollments: ${enrollmentCount}`);
    console.log(`🛒 Project purchases: ${purchaseCount}`);

    // Simple payment status breakdown
    const paidEnrollments = await Enrollment.count({ where: { paymentStatus: 'completed' } });
    const pendingEnrollments = await Enrollment.count({ where: { paymentStatus: 'pending' } });
    
    console.log('\n📊 Enrollment Payment Status:');
    console.log(`  - Completed: ${paidEnrollments}`);
    console.log(`  - Pending: ${pendingEnrollments}`);

    // Purchase payment status breakdown
    const completedPurchases = await ProjectPurchase.count({ where: { paymentStatus: 'completed' } });
    const pendingPurchases = await ProjectPurchase.count({ where: { paymentStatus: 'pending' } });
    
    console.log('\n💳 Purchase Payment Status:');
    console.log(`  - Completed: ${completedPurchases}`);
    console.log(`  - Pending: ${pendingPurchases}`);

    // Additional Data Validation
    console.log('\n🎯 ADDITIONAL DATA VALIDATION');
    console.log('='.repeat(50));

    const bannerCount = await Banner.count();
    const goalCount = await Goal.count();
    const skillCount = await Skill.count();
    const examCount = await Exam.count();
    
    console.log(`🎨 Banners: ${bannerCount}`);
    console.log(`🎯 Goals: ${goalCount}`);
    console.log(`💪 Skills: ${skillCount}`);
    console.log(`📝 Exams: ${examCount}`);

    // Final Summary
    console.log('\n📋 FINAL VALIDATION SUMMARY');
    console.log('='.repeat(50));

    const allRequirements = [
      { name: 'Live Courses (≥10)', passed: requirements.liveCourses },
      { name: 'Recorded Courses (≥10)', passed: requirements.recordedCourses },
      { name: 'Projects (≥10)', passed: projectRequirements.totalProjects },
      { name: 'Projects with Files (≥10 files)', passed: projectRequirements.projectsWithFiles },
      { name: 'Course Ratings Present', passed: courseRatingCount > 0 },
      { name: 'Project Ratings Present', passed: projectRatingCount > 0 },
      { name: 'Enrollments Present', passed: enrollmentCount > 0 },
      { name: 'Purchases Present', passed: purchaseCount > 0 },
      { name: 'Sections and Lessons Present', passed: totalSections > 0 && totalLessons > 0 },
    ];

    const passedRequirements = allRequirements.filter(req => req.passed).length;
    const totalRequirements = allRequirements.length;

    console.log(`\n📊 Overall Score: ${passedRequirements}/${totalRequirements} requirements passed`);
    
    allRequirements.forEach(req => {
      console.log(`${req.passed ? '✅' : '❌'} ${req.name}`);
    });

    if (passedRequirements === totalRequirements) {
      console.log('\n🎉 ALL REQUIREMENTS PASSED! Database is fully seeded and ready to use.');
    } else {
      console.log(`\n⚠️ ${totalRequirements - passedRequirements} requirements failed. Please check the seeding process.`);
    }

    // Display default credentials
    console.log('\n🔑 DEFAULT CREDENTIALS');
    console.log('='.repeat(50));
    console.log('Admin: admin@example.com / SecurePassword@123');
    
    const teachers = await User.findAll({ where: { role: 'teacher' }, limit: 5 });
    teachers.forEach((teacher, i) => {
      console.log(`Teacher ${i + 1}: ${teacher.email} / SecurePassword@123`);
    });

    const students = await User.findAll({ where: { role: 'student' }, limit: 5 });
    students.forEach((student, i) => {
      console.log(`Student ${i + 1}: ${student.email} / SecurePassword@123`);
    });

    console.log('\n🔗 API ENDPOINTS TO TEST');
    console.log('='.repeat(50));
    console.log('- GET /api/courses (list all courses)');
    console.log('- GET /api/projects (list all projects)');
    console.log('- GET /api/course-categories (list categories)');
    console.log('- GET /api/course-levels (list levels)');
    console.log('- POST /api/auth/login (login with above credentials)');
    console.log('- GET /api/banners (homepage banners)');
    console.log('- GET /api/ratings/course/:courseId (course ratings)');
    console.log('- GET /api/ratings/project/:projectId (project ratings)');

  } catch (error) {
    console.error('❌ Error during validation:', error);
  } finally {
    try {
      await sequelize.close();
      console.log('\n🔌 Database connection closed.');
    } catch (err) {
      console.error('Error closing database connection:', err);
    }
  }
}

// Run the validation
validateSeedData();
