// Live Course Controller Functions
import Course from "../model/course.js";
import CourseTeacher from "../model/courseTeacher.js";
import CourseWhatYouLearn from "../model/courseWhatYouLearn.js";
import CourseRequirement from "../model/courseRequirement.js";
import Batch from "../model/batch.js";
import BatchTeacher from "../model/batchTeacher.js";
import BatchSchedule from "../model/batchSchedule.js";
import BatchStudents from "../model/batchStudents.js";
import CourseTest from "../model/courseTest.js";
import CourseCertificate from "../model/courseCertificate.js";
import User from "../model/user.js";
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
import sequelize from "../config/db.js";
import { Op } from "sequelize";

// Create a new live course
export const createLiveCourse = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      title,
      description,
      shortDescription,
      whatYouLearn = [],
      requirements = [],
      levelId,
      categoryId,
      teacherIds = [],
      durationDays,
      isPaid,
      price,
      hasDiscount,
      discountEnabled,
      salePrice,
      thumbnailUrl,
      coverImage,
      introVideoUrl,
      demoUrl,
      screenshots = [],
      techStack = [],
      programmingLanguages = [],
      features,
      prerequisites,
      whatYouGet,
      hasCertificate,
      certificateTemplateUrl,
      supportIncluded = false,
      supportDuration,
      supportEmail,
      version = "1.0",
      status = "draft",
      featured = false,
      tags = [],
      languages = [],
      skills = [],
    } = req.body;

    // Validation - only essential fields required
    if (!title || !description || !levelId || !categoryId) {
      await transaction.rollback();
      return sendValidationError(res, "Missing required fields", {
        title: !title ? "Title is required" : undefined,
        description: !description ? "Description is required" : undefined,
        levelId: !levelId ? "Level is required" : undefined,
        categoryId: !categoryId ? "Category is required" : undefined,
      });
    }

    // Validate title length
    if (title.length < 3 || title.length > 200) {
      await transaction.rollback();
      return sendValidationError(res, "Title must be between 3 and 200 characters", {
        title: "Title must be between 3 and 200 characters"
      });
    }

    // Validate description length
    if (description.length < 10) {
      await transaction.rollback();
      return sendValidationError(res, "Description must be at least 10 characters", {
        description: "Description must be at least 10 characters"
      });
    }

    // Validate shortDescription if provided
    if (shortDescription && shortDescription.length > 500) {
      await transaction.rollback();
      return sendValidationError(res, "Short description cannot exceed 500 characters", {
        shortDescription: "Short description cannot exceed 500 characters"
      });
    }

    // Validate support duration if support is included
    if (supportIncluded && (!supportDuration || supportDuration < 0)) {
      await transaction.rollback();
      return sendValidationError(res, "Valid support duration is required when support is included", {
        supportDuration: "Valid support duration is required when support is included"
      });
    }

    // Create the course with enhanced fields
    const course = await Course.create(
      {
        title,
        description,
        shortDescription: shortDescription || null,
        levelId,
        categoryId,
        type: "live",
        isPaid: isPaid !== undefined ? isPaid : false,
        price: isPaid && price ? parseFloat(price) : 0,
        salePrice: hasDiscount && isPaid && salePrice ? parseFloat(salePrice) : null,
        discountEnabled: discountEnabled !== undefined ? discountEnabled : true,
        isMonthlyPayment: true,
        durationDays: durationDays || 30, // Default to 30 days if not provided
        thumbnailUrl: thumbnailUrl || null,
        coverImage: coverImage || null,
        hasIntroVideo: !!introVideoUrl,
        introVideoUrl: introVideoUrl || null,
        demoUrl: demoUrl || null,
        screenshots: screenshots || [],
        techStack: techStack || [],
        programmingLanguages: programmingLanguages || [],
        features: features || null,
        prerequisites: prerequisites || null,
        whatYouGet: whatYouGet || null,
        hasCertificate: hasCertificate !== undefined ? hasCertificate : false,
        certificateTemplateUrl: certificateTemplateUrl || null,
        supportIncluded: supportIncluded || false,
        supportDuration: supportIncluded ? (supportDuration || 30) : null,
        supportEmail: supportEmail || null,
        version: version || "1.0",
        status: status || "draft",
        featured: featured || false,
        publishedAt: status === 'active' ? new Date() : null,
        createdBy: req.user.userId,
      },
      { transaction }
    );

    // Add What You'll Learn items if provided
    if (whatYouLearn && whatYouLearn.length > 0) {
      await Promise.all(
        whatYouLearn.map((item, index) =>
          CourseWhatYouLearn.create(
            {
              courseId: course.courseId,
              title: item.title || `Item ${index + 1}`,
              description: item.description || '',
              order: index,
            },
            { transaction }
          )
        )
      );
    }

    // Add Requirements if provided
    if (requirements && requirements.length > 0) {
      await Promise.all(
        requirements.map((requirement, index) =>
          CourseRequirement.create(
            {
              courseId: course.courseId,
              requirementText: requirement,
              order: index,
            },
            { transaction }
          )
        )
      );
    }

    // Add Teachers if provided
    if (teacherIds && teacherIds.length > 0) {
      await Promise.all(
        teacherIds.map((teacherId, index) =>
          CourseTeacher.create(
            {
              courseId: course.courseId,
              teacherId,
              isPrimary: index === 0, // First teacher is primary
              assignedBy: req.user.userId,
            },
            { transaction }
          )
        )
      );
    }

    // Associate tags, languages and skills if provided
    if (tags && tags.length > 0) {
      await associateCourseTags(course.courseId, tags, transaction);
    }

    if (languages && languages.length > 0) {
      await associateCourseLanguages(course.courseId, languages, transaction);
    }

    if (skills && skills.length > 0) {
      await associateCourseSkills(course.courseId, skills, transaction);
    }

    await transaction.commit();

    // Fetch the created course with associations
    const createdCourse = await Course.findByPk(course.courseId, {
      include: [
        { model: CourseWhatYouLearn, as: "whatYouLearn" },
        { model: CourseRequirement, as: "requirements" },
        { 
          model: CourseTeacher, 
          as: "courseTeachers",
          include: [{ model: User, as: "teacher", attributes: ["userId", "firstName", "lastName", "email", "profileImage"] }]
        },
        // Include other associations as needed
      ],
    });

    return sendSuccess(res, 201, "Live course created successfully", createdCourse);
  } catch (error) {
    await transaction.rollback();
    console.error("Create live course error:", error);
    return sendServerError(res, error);
  }
};

// Create a new recorded course
export const createRecordedCourse = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      title,
      description,
      shortDescription,
      whatYouLearn = [],
      requirements = [],
      levelId,
      categoryId,
      teacherId, // Single teacher for recorded courses
      isPaid,
      price,
      hasDiscount,
      discountEnabled,
      salePrice,
      thumbnailUrl,
      coverImage,
      introVideoUrl,
      demoUrl,
      screenshots = [],
      techStack = [],
      programmingLanguages = [],
      features,
      prerequisites,
      whatYouGet,
      hasCertificate,
      certificateTemplateUrl,
      supportIncluded = false,
      supportDuration,
      supportEmail,
      durationMinutes,
      totalSections,
      totalLessons,
      version = "1.0",
      status = "draft",
      featured = false,
      tags = [],
      languages = [],
      skills = [],
    } = req.body;

    // Validation - only essential fields required
    if (!title || !description || !levelId || !categoryId) {
      await transaction.rollback();
      return sendValidationError(res, "Missing required fields", {
        title: !title ? "Title is required" : undefined,
        description: !description ? "Description is required" : undefined,
        levelId: !levelId ? "Level is required" : undefined,
        categoryId: !categoryId ? "Category is required" : undefined,
      });
    }

    // Validate title length
    if (title.length < 3 || title.length > 200) {
      await transaction.rollback();
      return sendValidationError(res, "Title must be between 3 and 200 characters", {
        title: "Title must be between 3 and 200 characters"
      });
    }

    // Validate description length
    if (description.length < 10) {
      await transaction.rollback();
      return sendValidationError(res, "Description must be at least 10 characters", {
        description: "Description must be at least 10 characters"
      });
    }

    // Validate shortDescription if provided
    if (shortDescription && shortDescription.length > 500) {
      await transaction.rollback();
      return sendValidationError(res, "Short description cannot exceed 500 characters", {
        shortDescription: "Short description cannot exceed 500 characters"
      });
    }

    // Validate support duration if support is included
    if (supportIncluded && (!supportDuration || supportDuration < 0)) {
      await transaction.rollback();
      return sendValidationError(res, "Valid support duration is required when support is included", {
        supportDuration: "Valid support duration is required when support is included"
      });
    }

    // Create the course with enhanced fields
    const course = await Course.create(
      {
        title,
        description,
        shortDescription: shortDescription || null,
        levelId,
        categoryId,
        type: "recorded",
        isPaid: isPaid !== undefined ? isPaid : false,
        price: isPaid && price ? parseFloat(price) : 0,
        salePrice: hasDiscount && isPaid && salePrice ? parseFloat(salePrice) : null,
        discountEnabled: discountEnabled !== undefined ? discountEnabled : true,
        isMonthlyPayment: false,
        durationMinutes: durationMinutes || null,
        totalSections: totalSections || 0,
        totalLessons: totalLessons || 0,
        thumbnailUrl: thumbnailUrl || null,
        coverImage: coverImage || null,
        hasIntroVideo: !!introVideoUrl,
        introVideoUrl: introVideoUrl || null,
        demoUrl: demoUrl || null,
        screenshots: screenshots || [],
        techStack: techStack || [],
        programmingLanguages: programmingLanguages || [],
        features: features || null,
        prerequisites: prerequisites || null,
        whatYouGet: whatYouGet || null,
        hasCertificate: hasCertificate !== undefined ? hasCertificate : false,
        certificateTemplateUrl: certificateTemplateUrl || null,
        supportIncluded: supportIncluded || false,
        supportDuration: supportIncluded ? (supportDuration || 30) : null,
        supportEmail: supportEmail || null,
        version: version || "1.0",
        status: status || "draft",
        featured: featured || false,
        publishedAt: status === 'active' ? new Date() : null,
        createdBy: req.user.userId,
      },
      { transaction }
    );

    // Add What You'll Learn items if provided
    if (whatYouLearn && whatYouLearn.length > 0) {
      await Promise.all(
        whatYouLearn.map((item, index) =>
          CourseWhatYouLearn.create(
            {
              courseId: course.courseId,
              title: item.title || `Item ${index + 1}`,
              description: item.description || '',
              order: index,
            },
            { transaction }
          )
        )
      );
    }

    // Add Requirements if provided
    if (requirements && requirements.length > 0) {
      await Promise.all(
        requirements.map((requirement, index) =>
          CourseRequirement.create(
            {
              courseId: course.courseId,
              requirementText: requirement,
              order: index,
            },
            { transaction }
          )
        )
      );
    }

    // Add Single Teacher if provided
    if (teacherId) {
      await CourseTeacher.create(
        {
          courseId: course.courseId,
          teacherId,
          isPrimary: true,
          assignedBy: req.user.userId,
        },
        { transaction }
      );
    }

    // Associate tags, languages and skills if provided
    if (tags && tags.length > 0) {
      await associateCourseTags(course.courseId, tags, transaction);
    }

    if (languages && languages.length > 0) {
      await associateCourseLanguages(course.courseId, languages, transaction);
    }

    if (skills && skills.length > 0) {
      await associateCourseSkills(course.courseId, skills, transaction);
    }

    await transaction.commit();

    // Fetch the created course with associations
    const createdCourse = await Course.findByPk(course.courseId, {
      include: [
        { model: CourseWhatYouLearn, as: "whatYouLearn" },
        { model: CourseRequirement, as: "requirements" },
        { 
          model: CourseTeacher, 
          as: "courseTeachers",
          include: [{ model: User, as: "teacher", attributes: ["userId", "firstName", "lastName", "email", "profileImage"] }]
        },
        // Include other associations as needed
      ],
    });

    return sendSuccess(res, 201, "Recorded course created successfully", createdCourse);
  } catch (error) {
    await transaction.rollback();
    console.error("Create recorded course error:", error);
    return sendServerError(res, error);
  }
};

// Create a new batch for live course
export const createCourseBatch = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { courseId } = req.params;
    const {
      title,
      description,
      startDate,
      endDate,
      enrollmentCapacity,
      teacherIds = [],
      schedules = [],
      hasChatEnabled = true,
    } = req.body;

    // Validate course exists and is a live course
    const course = await Course.findByPk(courseId);
    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
    }

    if (course.type !== "live") {
      await transaction.rollback();
      return sendValidationError(res, "Batches can only be created for live courses");
    }

    // Validation - only title is required
    if (!title) {
      await transaction.rollback();
      return sendValidationError(res, "Missing required fields", {
        title: !title ? "Title is required" : undefined,
      });
    }

    // Validate title length
    if (title.length < 3 || title.length > 200) {
      await transaction.rollback();
      return sendValidationError(res, "Title must be between 3 and 200 characters", {
        title: "Title must be between 3 and 200 characters"
      });
    }

    // Calculate default dates if not provided
    let batchStartDate = startDate ? new Date(startDate) : new Date();
    let batchEndDate = endDate ? new Date(endDate) : new Date();
    
    if (!endDate) {
      // Default end date: start date + 30 days
      batchEndDate.setDate(batchStartDate.getDate() + 30);
    }

    // Create batch with nullable fields
    const batch = await Batch.create(
      {
        courseId,
        title,
        description: description || null,
        startDate: batchStartDate,
        endDate: batchEndDate,
        enrollmentCapacity: enrollmentCapacity || 30,
        currentEnrollment: 0,
        hasChatEnabled: hasChatEnabled !== undefined ? hasChatEnabled : true,
        status: "upcoming",
        createdBy: req.user.userId,
      },
      { transaction }
    );

    // Add teachers to batch if provided
    if (teacherIds && teacherIds.length > 0) {
      await Promise.all(
        teacherIds.map((teacherId, index) =>
          BatchTeacher.create(
            {
              batchId: batch.batchId,
              teacherId,
              isPrimary: index === 0, // First teacher is primary
              assignedBy: req.user.userId,
            },
            { transaction }
          )
        )
      );
    }

    // Add schedules if provided
    if (schedules && schedules.length > 0) {
      await Promise.all(
        schedules.map((schedule, index) =>
          BatchSchedule.create(
            {
              batchId: batch.batchId,
              title: schedule.title || `Class ${index + 1}`,
              sessionDate: schedule.sessionDate || new Date(),
              startTime: schedule.startTime || '09:00:00',
              endTime: schedule.endTime || '10:00:00',
              meetingLink: schedule.meetingLink || null,
              platform: schedule.platform || 'zoom',
              platformSessionId: schedule.platformSessionId || null,
              description: schedule.description || null,
              recordingUrl: schedule.recordingUrl || null,
              status: schedule.status || 'scheduled',
              createdBy: req.user.userId,
            },
            { transaction }
          )
        )
      );
    }

    await transaction.commit();

    // Fetch the created batch with associations
    const createdBatch = await Batch.findByPk(batch.batchId, {
      include: [
        { model: BatchTeacher, as: "teachers", include: [{ model: User, as: "teacher" }] },
        { model: BatchSchedule, as: "schedules" },
        { model: Course, as: "course" },
      ],
    });

    return sendSuccess(res, 201, "Batch created successfully", createdBatch);
  } catch (error) {
    await transaction.rollback();
    console.error("Create batch error:", error);
    return sendServerError(res, error);
  }
};

// Get all live courses for admin panel
export const getLiveCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    const whereCondition = {
      type: "live",
    };
    
    if (search) {
      whereCondition.title = { [Op.like]: `%${search}%` };
    }
    
    if (status && status !== "all") {
      whereCondition.status = status;
    }
    
    // Fetch courses with pagination
    const { count, rows: courses } = await Course.findAndCountAll({
      where: whereCondition,
      include: [
        { 
          model: CourseTeacher, 
          as: "courseTeachers",
          include: [{ model: User, as: "teacher", attributes: ["userId", "firstName", "lastName", "email", "profileImage"] }]
        },
        { model: Batch, as: "batches" },
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset,
      distinct: true,
    });
    
    // Format response with pagination info
    const totalPages = Math.ceil(count / limit);
    
    return sendSuccess(res, 200, "Live courses fetched successfully", {
      courses,
      pagination: {
        total: count,
        currentPage: parseInt(page),
        totalPages,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get live courses error:", error);
    return sendServerError(res, error);
  }
};

// Get all recorded courses for admin panel
export const getRecordedCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      status,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build filter conditions
    const whereCondition = {
      type: "recorded",
    };
    
    if (search) {
      whereCondition.title = { [Op.like]: `%${search}%` };
    }
    
    if (status && status !== "all") {
      whereCondition.status = status;
    }
    
    // Fetch courses with pagination
    const { count, rows: courses } = await Course.findAndCountAll({
      where: whereCondition,
      include: [
        { 
          model: CourseTeacher, 
          as: "courseTeachers",
          include: [{ model: User, as: "teacher", attributes: ["userId", "firstName", "lastName", "email", "profileImage"] }]
        },
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset,
      distinct: true,
    });
    
    // Format response with pagination info
    const totalPages = Math.ceil(count / limit);
    
    return sendSuccess(res, 200, "Recorded courses fetched successfully", {
      courses,
      pagination: {
        total: count,
        currentPage: parseInt(page),
        totalPages,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get recorded courses error:", error);
    return sendServerError(res, error);
  }
};

// Get batches for a live course
export const getCourseBatches = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      page = 1,
      limit = 10,
      status,
      sortBy = "startDate",
      sortOrder = "ASC",
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Validate course exists and is a live course
    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }
    
    if (course.type !== "live") {
      return sendValidationError(res, "Batches are only available for live courses");
    }
    
    // Build filter conditions
    const whereCondition = {
      courseId,
    };
    
    if (status && status !== "all") {
      whereCondition.status = status;
    }
    
    // Fetch batches with pagination
    const { count, rows: batches } = await Batch.findAndCountAll({
      where: whereCondition,
      include: [
        { 
          model: BatchTeacher, 
          as: "batchTeachers",
          include: [{ model: User, as: "teacher", attributes: ["userId", "firstName", "lastName", "email", "profileImage"] }]
        },
        { model: BatchSchedule, as: "schedules" },
        { model: BatchStudents, as: "students", attributes: ["batchStudentId", "userId", "status"] },
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset,
      distinct: true,
    });
    
    // Format response with pagination info
    const totalPages = Math.ceil(count / limit);
    
    return sendSuccess(res, 200, "Course batches fetched successfully", {
      batches,
      pagination: {
        total: count,
        currentPage: parseInt(page),
        totalPages,
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get course batches error:", error);
    return sendServerError(res, error);
  }
};

// ============== COURSE TESTS MANAGEMENT =================

// Create a new test for a course
export const createCourseTest = async (req, res) => {
  const { courseId } = req.params;
  const transaction = await sequelize.transaction();
  
  try {
    const course = await Course.findByPk(courseId);
    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
    }
    
    const {
      title,
      description,
      duration,
      totalMarks,
      passingMarks,
      isActive = true,
      questions = []
    } = req.body;
    
    // Validation
    if (!title || !duration || !totalMarks || !passingMarks) {
      await transaction.rollback();
      return sendValidationError(res, "Missing required fields", {
        title: !title ? "Title is required" : undefined,
        duration: !duration ? "Duration is required" : undefined,
        totalMarks: !totalMarks ? "Total marks is required" : undefined,
        passingMarks: !passingMarks ? "Passing marks is required" : undefined
      });
    }
    
    // Create the test
    const test = await CourseTest.create({
      courseId,
      title,
      description,
      duration,
      totalMarks,
      passingMarks,
      isActive,
      questions: JSON.stringify(questions)
    }, { transaction });
    
    await transaction.commit();
    return sendSuccess(res, "Test created successfully", test);
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating course test:", error);
    return sendServerError(res, "Failed to create test");
  }
};

// Get all tests for a course
export const getCourseTests = async (req, res) => {
  const { courseId } = req.params;
  
  try {
    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }
    
    const tests = await CourseTest.findAll({
      where: { courseId },
      order: [['createdAt', 'DESC']]
    });
    
    // Parse questions JSON for each test
    const testsWithParsedQuestions = tests.map(test => {
      const testData = test.toJSON();
      try {
        testData.questions = JSON.parse(testData.questions);
      } catch (e) {
        testData.questions = [];
      }
      return testData;
    });
    
    return sendSuccess(res, "Tests fetched successfully", testsWithParsedQuestions);
  } catch (error) {
    console.error("Error fetching course tests:", error);
    return sendServerError(res, "Failed to fetch tests");
  }
};

// Update a course test
export const updateCourseTest = async (req, res) => {
  const { courseId, testId } = req.params;
  const transaction = await sequelize.transaction();
  
  try {
    const test = await CourseTest.findOne({
      where: { id: testId, courseId }
    });
    
    if (!test) {
      await transaction.rollback();
      return sendNotFound(res, "Test not found");
    }
    
    const {
      title,
      description,
      duration,
      totalMarks,
      passingMarks,
      isActive,
      questions
    } = req.body;
    
    // Update the test
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (duration !== undefined) updateData.duration = duration;
    if (totalMarks !== undefined) updateData.totalMarks = totalMarks;
    if (passingMarks !== undefined) updateData.passingMarks = passingMarks;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (questions !== undefined) updateData.questions = JSON.stringify(questions);
    
    await test.update(updateData, { transaction });
    await transaction.commit();
    
    // Get the updated test with parsed questions
    const updatedTest = await CourseTest.findByPk(testId);
    const testData = updatedTest.toJSON();
    try {
      testData.questions = JSON.parse(testData.questions);
    } catch (e) {
      testData.questions = [];
    }
    
    return sendSuccess(res, "Test updated successfully", testData);
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating course test:", error);
    return sendServerError(res, "Failed to update test");
  }
};

// Delete a course test
export const deleteCourseTest = async (req, res) => {
  const { courseId, testId } = req.params;
  
  try {
    const test = await CourseTest.findOne({
      where: { id: testId, courseId }
    });
    
    if (!test) {
      return sendNotFound(res, "Test not found");
    }
    
    await test.destroy();
    return sendSuccess(res, "Test deleted successfully");
  } catch (error) {
    console.error("Error deleting course test:", error);
    return sendServerError(res, "Failed to delete test");
  }
};

// ============== COURSE CERTIFICATES MANAGEMENT =================

// Create a certificate for a course
export const createCourseCertificate = async (req, res) => {
  const { courseId } = req.params;
  const transaction = await sequelize.transaction();
  
  try {
    const course = await Course.findByPk(courseId);
    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
    }
    
    // Get certificate data from request body
    const {
      title,
      description,
      requiresTestCompletion = true,
      minimumScore = 60,
      isActive = true
    } = req.body;
    
    // Validate required fields
    if (!title) {
      await transaction.rollback();
      return sendValidationError(res, "Title is required");
    }
    
    // Handle template image if uploaded
    let templateUrl = null;
    if (req.file) {
      // In a real implementation, this would upload to S3 or other storage
      // For now, we'll just use a placeholder URL
      templateUrl = `https://example.com/certificates/${courseId}/${Date.now()}.jpg`;
    }
    
    // Create the certificate
    const certificate = await CourseCertificate.create({
      courseId,
      title,
      description,
      templateUrl,
      requiresTestCompletion,
      minimumScore,
      isActive
    }, { transaction });
    
    await transaction.commit();
    return sendSuccess(res, "Certificate created successfully", certificate);
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating course certificate:", error);
    return sendServerError(res, "Failed to create certificate");
  }
};

// Get all certificates for a course
export const getCourseCertificates = async (req, res) => {
  const { courseId } = req.params;
  
  try {
    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }
    
    const certificates = await CourseCertificate.findAll({
      where: { courseId },
      order: [['createdAt', 'DESC']]
    });
    
    return sendSuccess(res, "Certificates fetched successfully", certificates);
  } catch (error) {
    console.error("Error fetching course certificates:", error);
    return sendServerError(res, "Failed to fetch certificates");
  }
};

// Update a course certificate
export const updateCourseCertificate = async (req, res) => {
  const { courseId, certificateId } = req.params;
  const transaction = await sequelize.transaction();
  
  try {
    const certificate = await CourseCertificate.findOne({
      where: { id: certificateId, courseId }
    });
    
    if (!certificate) {
      await transaction.rollback();
      return sendNotFound(res, "Certificate not found");
    }
    
    const {
      title,
      description,
      requiresTestCompletion,
      minimumScore,
      isActive
    } = req.body;
    
    // Update certificate data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (requiresTestCompletion !== undefined) updateData.requiresTestCompletion = requiresTestCompletion;
    if (minimumScore !== undefined) updateData.minimumScore = minimumScore;
    if (isActive !== undefined) updateData.isActive = isActive;
    
    // Handle template image if uploaded
    if (req.file) {
      // In a real implementation, this would upload to S3 or other storage
      // For now, we'll just use a placeholder URL
      updateData.templateUrl = `https://example.com/certificates/${courseId}/${Date.now()}.jpg`;
    }
    
    await certificate.update(updateData, { transaction });
    await transaction.commit();
    
    return sendSuccess(res, "Certificate updated successfully", await CourseCertificate.findByPk(certificateId));
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating course certificate:", error);
    return sendServerError(res, "Failed to update certificate");
  }
};

// Delete a course certificate
export const deleteCourseCertificate = async (req, res) => {
  const { courseId, certificateId } = req.params;
  
  try {
    const certificate = await CourseCertificate.findOne({
      where: { id: certificateId, courseId }
    });
    
    if (!certificate) {
      return sendNotFound(res, "Certificate not found");
    }
    
    await certificate.destroy();
    return sendSuccess(res, "Certificate deleted successfully");
  } catch (error) {
    console.error("Error deleting course certificate:", error);
    return sendServerError(res, "Failed to delete certificate");
  }
};

// ============== COURSE PURCHASES MANAGEMENT =================

// Get all purchases for a course
export const getCoursePurchases = async (req, res) => {
  const { courseId } = req.params;
  
  try {
    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }
    
    // Assuming we have a CoursePurchase model with appropriate associations
    const purchases = await CoursePurchase.findAll({
      where: { courseId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'avatar', 'phone']
        },
        {
          model: Batch,
          as: 'batch',
          attributes: ['id', 'name', 'startDate', 'endDate', 'status']
        }
      ],
      order: [['purchaseDate', 'DESC']]
    });
    
    return sendSuccess(res, "Course purchases fetched successfully", purchases);
  } catch (error) {
    console.error("Error fetching course purchases:", error);
    return sendServerError(res, "Failed to fetch course purchases");
  }
};

// Get purchase details
export const getPurchaseDetails = async (req, res) => {
  const { courseId, purchaseId } = req.params;
  
  try {
    const purchase = await CoursePurchase.findOne({
      where: { id: purchaseId, courseId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'avatar', 'phone']
        },
        {
          model: Batch,
          as: 'batch',
          attributes: ['id', 'name', 'startDate', 'endDate', 'status']
        }
      ]
    });
    
    if (!purchase) {
      return sendNotFound(res, "Purchase not found");
    }
    
    return sendSuccess(res, "Purchase details fetched successfully", purchase);
  } catch (error) {
    console.error("Error fetching purchase details:", error);
    return sendServerError(res, "Failed to fetch purchase details");
  }
};

// ============== COURSE RATINGS MANAGEMENT =================

// Get all ratings for a course
export const getCourseRatings = async (req, res) => {
  const { courseId } = req.params;
  
  try {
    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }
    
    // Get all ratings for the course
    const ratings = await CourseRating.findAll({
      where: { courseId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Calculate average rating and distribution
    let totalRating = 0;
    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };
    
    ratings.forEach(rating => {
      totalRating += rating.rating;
      distribution[rating.rating]++;
    });
    
    const averageRating = ratings.length > 0 ? totalRating / ratings.length : 0;
    
    return sendSuccess(res, "Course ratings fetched successfully", {
      ratings,
      averageRating,
      distribution
    });
  } catch (error) {
    console.error("Error fetching course ratings:", error);
    return sendServerError(res, "Failed to fetch course ratings");
  }
};

// Add admin reply to a rating
export const replyToRating = async (req, res) => {
  const { courseId, ratingId } = req.params;
  const { reply } = req.body;
  
  try {
    const rating = await CourseRating.findOne({
      where: { id: ratingId, courseId }
    });
    
    if (!rating) {
      return sendNotFound(res, "Rating not found");
    }
    
    if (!reply) {
      return sendValidationError(res, "Reply text is required");
    }
    
    await rating.update({ adminReply: reply });
    
    return sendSuccess(res, "Reply added successfully", await CourseRating.findByPk(ratingId, {
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'name', 'email', 'avatar']
        }
      ]
    }));
  } catch (error) {
    console.error("Error adding reply to rating:", error);
    return sendServerError(res, "Failed to add reply");
  }
};

// Delete a course rating
export const deleteRating = async (req, res) => {
  const { courseId, ratingId } = req.params;
  
  try {
    const rating = await CourseRating.findOne({
      where: { id: ratingId, courseId }
    });
    
    if (!rating) {
      return sendNotFound(res, "Rating not found");
    }
    
    await rating.destroy();
    return sendSuccess(res, "Rating deleted successfully");
  } catch (error) {
    console.error("Error deleting rating:", error);
    return sendServerError(res, "Failed to delete rating");
  }
};

// Batch update ratings status
export const batchUpdateRatingStatus = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { ratingIds, status } = req.body;
    
    if (!ratingIds || !Array.isArray(ratingIds) || ratingIds.length === 0) {
      await transaction.rollback();
      return sendValidationError(res, "No rating IDs provided");
    }
    
    if (!status || !["approved", "hidden"].includes(status)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid status. Must be 'approved' or 'hidden'");
    }
    
    // Update all ratings
    await CourseRating.update(
      { status },
      { 
        where: { ratingId: { [Op.in]: ratingIds } },
        transaction 
      }
    );
    
    await transaction.commit();
    
    return sendSuccess(res, 200, `${ratingIds.length} ratings updated to ${status} successfully`);
  } catch (error) {
    await transaction.rollback();
    console.error("Batch update rating status error:", error);
    return sendServerError(res, error);
  }
};
