// Create a new course (hybrid, recorded, or live)
import sequelize from "../config/db.js";
import Course from "../model/course.js";
import CourseLevel from "../model/courseLevel.js";
import Category from "../model/category.js";
import Section from "../model/section.js";
import Lesson from "../model/lesson.js";
import Resource from "../model/resource.js";
import User from "../model/user.js";
import Enrollment from "../model/enrollment.js";
import CourseTechStack from "../model/courseTechStack.js";
import Skill from "../model/skill.js";
import { Op } from "sequelize";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendServerError,
  sendConflict,
  sendUnauthorized,
  sendForbidden
} from "../utils/responseHelper.js";
import CourseTeacher from "../model/courseTeacher.js";
import Batch from "../model/batch.js";
// import BatchTeacher from "../model/batchTeacher.js"; // Commented out unused import
import BatchSchedule from "../model/batchSchedule.js";
// import BatchStudents from "../model/batchStudents.js"; // Commented out unused import
import CourseTest from "../model/courseTest.js";
import CourseCertificate from "../model/courseCertificate.js";
import CourseRating from "../model/courseRating.js";
import Order from "../model/order.js";
import OrderItem from "../model/orderItem.js";
import CourseGoal from "../model/courseGoal.js";
import CourseLanguage from "../model/courseLanguage.js";
import CourseInstructor from "../model/courseInstructor.js";
import Language from "../model/language.js";

// Get live courses only
export const getLiveCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      categoryId,
      levelId,
      instructorId
    } = req.query;

    const whereClause = { type: 'live' };

    // Handle search parameter
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Handle status filter
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Handle category filter
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // Handle level filter
    if (levelId) {
      whereClause.levelId = levelId;
    }

    // Handle instructor filter
    if (instructorId) {
      whereClause.createdBy = instructorId;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Handle sorting by related fields
    let orderClause;
    if (sortBy === 'category') {
      orderClause = [['category', 'categoryName', sortOrder]];
    } else if (sortBy === 'level') {
      orderClause = [['level', 'name', sortOrder]];
    } else if (sortBy === 'startDate') {
      orderClause = [['batches', 'startDate', sortOrder]];
    } else if (sortBy === 'endDate') {
      orderClause = [['batches', 'endDate', sortOrder]];
    } else {
      orderClause = [[sortBy, sortOrder]];
    }

    const { count, rows } = await Course.findAndCountAll({
      where: whereClause,
      include: [
        { model: Category, as: "category", attributes: ["categoryId", "categoryName"] },
        { model: CourseLevel, as: "level", attributes: ["levelId", "name"] },
        { model: Batch, as: "batches", attributes: ["batchId", "startDate", "endDate", "status"], required: false },
        {
          model: CourseTechStack,
          as: "techStack",
          include: [
            {
              model: Skill,
              as: "skill",
              attributes: ["skillId", "skillName"],
            },
          ],
          required: false,
        },
      ],
      order: orderClause,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return sendSuccess(res, "Live courses retrieved successfully", {
      courses: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching live courses:', error);
    return sendServerError(res, "Failed to fetch live courses", error.message);
  }
};

// Get recorded courses only
export const getRecordedCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      categoryId,
      levelId,
      instructorId
    } = req.query;

    const whereClause = { type: 'recorded' };

    // Handle search parameter
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // Handle status filter
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Handle category filter
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // Handle level filter
    if (levelId) {
      whereClause.levelId = levelId;
    }

    // Handle instructor filter
    if (instructorId) {
      whereClause.createdBy = instructorId;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Handle sorting by related fields
    let orderClause;
    if (sortBy === 'category') {
      orderClause = [['category', 'categoryName', sortOrder]];
    } else if (sortBy === 'level') {
      orderClause = [['level', 'name', sortOrder]];
    } else {
      orderClause = [[sortBy, sortOrder]];
    }

    const { count, rows } = await Course.findAndCountAll({
      where: whereClause,
      include: [
        { model: Category, as: "category", attributes: ["categoryId", "categoryName"] },
        { model: CourseLevel, as: "level", attributes: ["levelId", "name"] },
        {
          model: CourseTechStack,
          as: "techStack",
          include: [
            {
              model: Skill,
              as: "skill",
              attributes: ["skillId", "skillName"],
            },
          ],
          required: false,
        },
      ],
      order: orderClause,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return sendSuccess(res, "Recorded courses retrieved successfully", {
      courses: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching recorded courses:', error);
    return sendServerError(res, "Failed to fetch recorded courses", error.message);
  }
};

export const getCourseById = async (req, res) => {
  const { courseId } = req.params;
  console.log(`Fetching course with ID: ${courseId}`);
  // Basic UUID validation
  if (
    !courseId ||
    !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      courseId,
    )
  ) {
    return sendValidationError(res, "Invalid course ID format", {
      courseId: "Must be a valid UUID"
    });
  }

  try {
    const course = await Course.findOne({
      where: { courseId },
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name", "order"],
        },
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: CourseGoal,
          as: "goals",
        },
        {
          model: CourseTechStack,
          as: "techStack",
          include: [
            {
              model: Skill,
              as: "skill",
              attributes: ["skillId", "skillName"],
            },
          ],
        },
        {
          model: CourseLanguage,
          as: "courseLanguages",
          include: [
            {
              model: Language,
              as: "language",
              attributes: ["languageId", "language", "languageCode"],
            },
          ],
        },
        {
          model: CourseInstructor,
          as: "courseInstructors",
          include: [
            {
              model: User,
              as: "instructor",
              attributes: ["userId", "username", "email", "mobile", "profileImage"],
            },
          ],
        },
        {
          model: Section,
          as: "sections",
          include: [
            {
              model: Lesson,
              as: "lessons",
              include: [
                {
                  model: Resource,
                  as: "resources",
                  attributes: ["resourceId", "type", "fileUrl", "title"],
                },
              ],
              attributes: [
                "lessonId",
                "title",
                "streamStartDateTime",
                "streamEndDateTime",
                "duration",
                "content",
                "type",
                "order",
                "isPreview"
              ]
            },
          ],
          attributes: [
            "sectionId",
            "title",
            "description",
            "order",
          ]
        },
      ],
      order: [
        [{ model: Section, as: "sections" }, 'order', 'ASC'],
        [{ model: Section, as: "sections" }, { model: Lesson, as: "lessons" }, 'order', 'ASC']
      ],
    });

    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    const userId = req.user?.userId; // Get user ID from auth token if available
    let courseWithExtras = course.toJSON();

    // Format instructors array
    courseWithExtras.instructors = courseWithExtras.courseInstructors?.map(ci => ({
      ...ci.instructor,
      isPrimary: ci.isPrimary,
      assignedAt: ci.createdAt
    })) || [];
    delete courseWithExtras.courseInstructors;
    
    // Format languages array
    courseWithExtras.languages = courseWithExtras.courseLanguages?.map(cl => cl.language) || [];
    delete courseWithExtras.courseLanguages;

    // Add purchase status
    // TODO: Implement when order_items table is available
    if (userId) {
      const userPurchase = await Order.findOne({
        where: {
          userId,
          status: 'paid'
        },
        include: [
          {
            model: OrderItem,
            as: 'items',
            where: {
              itemType: 'course',
              itemId: courseId
            }
          }
        ]
      });
      courseWithExtras.purchaseStatus = !!userPurchase;
    } else {
      courseWithExtras.purchaseStatus = false;
    }

    // Add recommended courses by same category
    const recommendedCourses = await Course.findAll({
      where: {
        categoryId: course.categoryId,
        courseId: { [Op.ne]: courseId }, // Exclude current course
        status: 'active'
      },
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name"],
        },
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: User,
          as: "instructors",
          attributes: ["userId", "username", "profileImage"],
        }
      ],
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    courseWithExtras.recommendedCourses = recommendedCourses;

    return sendSuccess(res, "Course fetched successfully", courseWithExtras);
  } catch (error) {
    console.error("Error fetching course:", error);
    return sendServerError(res, error);
  }
};

// Create a new course with sections and lessons
export const createCourse = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      title,
      description,
      shortDescription,
      levelId,
      categoryId,
      type,
      isPaid = false,
      price = 0,
      discountEnabled = true,
      isMonthlyPayment = false,
      durationMinutes,
      liveStartDate,
      liveEndDate,
      thumbnailUrl,
      coverImage,
      hasIntroVideo = false,
      introVideoUrl,
      demoUrl,
      screenshots = [],
      hasCertificate = false,
      certificateTemplateUrl,
      techStack = [],
      features,
      prerequisites,
      whatYouGet,
      status = 'draft',
      version = '1.0',
      supportIncluded = false,
      supportDuration,
      supportEmail,
      featured = false
    } = req.body;

    const userId = req.user?.userId || req.body.createdBy;

    if (!userId) {
      await transaction.rollback();
      return sendUnauthorized(res, "User authentication required");
    }

    // Validation
    if (!title || !description || !levelId || !categoryId || !type) {
      await transaction.rollback();
      return sendValidationError(res, "Missing required fields", {
        title: !title ? "Title is required" : undefined,
        description: !description ? "Description is required" : undefined,
        levelId: !levelId ? "Level is required" : undefined,
        categoryId: !categoryId ? "Category is required" : undefined,
        type: !type ? "Course type is required" : undefined,
      });
    }

    // Type-specific validations
    if (type === 'live') {
      if (!liveStartDate || !liveEndDate) {
        await transaction.rollback();
        return sendValidationError(res, "Live courses require start and end dates", {
          liveStartDate: !liveStartDate ? "Start date is required for live courses" : undefined,
          liveEndDate: !liveEndDate ? "End date is required for live courses" : undefined,
        });
      }
    }

    // Create the course
    const courseData = {
      title,
      description,
      shortDescription,
      levelId,
      categoryId,
      createdBy: userId,
      type,
      isPaid,
      price: isPaid ? parseFloat(price) : 0,
      discountEnabled,
      isMonthlyPayment,
      durationMinutes,
      liveStartDate: liveStartDate ? new Date(liveStartDate) : null,
      liveEndDate: liveEndDate ? new Date(liveEndDate) : null,
      thumbnailUrl,
      coverImage,
      hasIntroVideo,
      introVideoUrl,
      demoUrl,
      screenshots: Array.isArray(screenshots) ? screenshots : [],
      hasCertificate,
      certificateTemplateUrl,
      features,
      prerequisites,
      whatYouGet,
      status,
      version,
      supportIncluded,
      supportDuration,
      supportEmail,
      featured,
      publishedAt: status === 'active' ? new Date() : null,
      lastUpdated: new Date()
    };

    const course = await Course.create(courseData, { transaction });

    // Add tech stack if provided
    if (techStack && techStack.length > 0) {
      const techStackPromises = techStack.map(async (skillId) => {
        try {
          const skill = await Skill.findByPk(skillId);
          if (skill) {
            await CourseTechStack.create({
              courseId: course.courseId,
              skillId
            }, { transaction });
          }
        } catch (error) {
          console.warn(`Error adding tech stack skill ${skillId}: ${error.message}`);
        }
      });
      await Promise.all(techStackPromises);
    }

    // Update course stats (will be updated when sections/lessons are added separately)
    // await updateCourseStats(course.courseId, transaction);

    await transaction.commit();

    // Fetch the complete course
    const completeCourse = await Course.findOne({
      where: { courseId: course.courseId },
      include: [
        { model: Category, as: "category" },
        { model: CourseLevel, as: "level" },
        { model: User, as: "instructors" },
        {
          model: Section,
          as: "sections",
          include: [{ model: Lesson, as: "lessons", order: [['order', 'ASC']] }],
          order: [['order', 'ASC']]
        },
        {
          model: CourseTechStack,
          as: "techStack",
          include: [
            {
              model: Skill,
              as: "skill",
              attributes: ["skillId", "skillName"],
            },
          ],
        },
      ]
    });

    return sendSuccess(res, "Course created successfully", completeCourse);
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating course:', error);
    return sendServerError(res, "Failed to create course", error.message);
  }
};

// Update course with sections and lessons
export const updateCourse = async (req, res) => {
  const { courseId } = req.params;
  const transaction = await sequelize.transaction();

  try {
    const course = await Course.findOne({ where: { courseId } });
    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
    }

    const {
      title,
      description,
      shortDescription,
      levelId,
      categoryId,
      isPaid,
      price,
      discountEnabled,
      isMonthlyPayment,
      durationMinutes,
      liveStartDate,
      liveEndDate,
      thumbnailUrl,
      coverImage,
      hasIntroVideo,
      introVideoUrl,
      demoUrl,
      screenshots,
      hasCertificate,
      certificateTemplateUrl,
      techStack,
      features,
      prerequisites,
      whatYouGet,
      status,
      version,
      supportIncluded,
      supportDuration,
      supportEmail,
      featured
    } = req.body;

    // Update course data
    const updateData = {
      ...(title && { title }),
      ...(description && { description }),
      ...(shortDescription !== undefined && { shortDescription }),
      ...(levelId && { levelId }),
      ...(categoryId && { categoryId }),
      ...(isPaid !== undefined && { isPaid }),
      ...(price !== undefined && { price: isPaid ? parseFloat(price) : 0 }),
      ...(discountEnabled !== undefined && { discountEnabled }),
      ...(isMonthlyPayment !== undefined && { isMonthlyPayment }),
      ...(durationMinutes !== undefined && { durationMinutes }),
      ...(liveStartDate !== undefined && { liveStartDate: liveStartDate ? new Date(liveStartDate) : null }),
      ...(liveEndDate !== undefined && { liveEndDate: liveEndDate ? new Date(liveEndDate) : null }),
      ...(thumbnailUrl !== undefined && { thumbnailUrl }),
      ...(coverImage !== undefined && { coverImage }),
      ...(hasIntroVideo !== undefined && { hasIntroVideo }),
      ...(introVideoUrl !== undefined && { introVideoUrl }),
      ...(demoUrl !== undefined && { demoUrl }),
      ...(screenshots !== undefined && { screenshots: Array.isArray(screenshots) ? screenshots : [] }),
      ...(hasCertificate !== undefined && { hasCertificate }),
      ...(certificateTemplateUrl !== undefined && { certificateTemplateUrl }),
      ...(techStack !== undefined && { techStack: Array.isArray(techStack) ? techStack : [] }),
      ...(features !== undefined && { features }),
      ...(prerequisites !== undefined && { prerequisites }),
      ...(whatYouGet !== undefined && { whatYouGet }),
      ...(status && { status }),
      ...(version !== undefined && { version }),
      ...(supportIncluded !== undefined && { supportIncluded }),
      ...(supportDuration !== undefined && { supportDuration }),
      ...(supportEmail !== undefined && { supportEmail }),
      ...(featured !== undefined && { featured }),
      lastUpdated: new Date()
    };

    // Set publishedAt if status changes to active
    if (status === 'active' && course.status !== 'active') {
      updateData.publishedAt = new Date();
    }

    await Course.update(updateData, {
      where: { courseId },
      transaction
    });

    // Update course stats (will be updated when sections/lessons are managed separately)
    // await updateCourseStats(courseId, transaction);
    await updateCourseStats(courseId, transaction);

    await transaction.commit();

    // Fetch the updated course
    const updatedCourse = await Course.findOne({
      where: { courseId },
      include: [
        { model: Category, as: "category" },
        { model: CourseLevel, as: "level" },
        { model: User, as: "instructors" },
        {
          model: Section,
          as: "sections",
          include: [{ model: Lesson, as: "lessons", order: [['order', 'ASC']] }],
          order: [['order', 'ASC']]
        }
      ]
    });

    return sendSuccess(res, "Course updated successfully", updatedCourse);
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating course:', error);
    return sendServerError(res, "Failed to update course", error.message);
  }
};

// Helper function to update course statistics
const updateCourseStats = async (courseId, transaction) => {
  const sections = await Section.findAll({
    where: { courseId },
    include: [{ model: Lesson, as: 'lessons' }],
    transaction
  });

  const totalSections = sections.length;
  let totalLessons = 0;

  sections.forEach(section => {
    totalLessons += section.lessons.length;
  });

  await Course.update({
    totalSections,
    totalLessons
  }, {
    where: { courseId },
    transaction
  });
};

export const getAllCourses = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      categoryId,
      levelId,
      type,
      isPaid,
      status = "active",
      sortBy = "createdAt",
      sortOrder = "DESC",
      search = "",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const userId = req.user?.userId; // Get user ID from auth token if available

    // Build where condition
    const whereCondition = {};

    if (typeof status !== "undefined" && status !== "") whereCondition.status = status;
    if (typeof categoryId !== "undefined" && categoryId !== "") whereCondition.categoryId = categoryId;
    if (typeof levelId !== "undefined" && levelId !== "") whereCondition.levelId = levelId;
    if (typeof type !== "undefined" && type !== "") whereCondition.type = type;
    if (typeof isPaid !== "undefined" && isPaid !== "") {
      if (isPaid === "true" || isPaid === true) whereCondition.isPaid = true;
      else if (isPaid === "false" || isPaid === false) whereCondition.isPaid = false;
    }

    // Search condition
    if (search && search.trim().length > 0) {
      whereCondition[Op.or] = [
        { title: { [Op.iLike]: `%${search.trim()}%` } },
        { description: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    const { count, rows: courses } = await Course.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name", "order"],
        },
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: CourseTechStack,
          as: "techStack",
          include: [
            {
              model: Skill,
              as: "skill",
              attributes: ["skillId", "skillName"],
            },
          ],
        },
        {
          model: CourseLanguage,
          as: "courseLanguages",
          include: [
            {
              model: Language,
              as: "language",
              attributes: ["languageId", "language", "languageCode"],
            },
          ],
        },
        {
          model: CourseInstructor,
          as: "courseInstructors",
          include: [
            {
              model: User,
              as: "instructor",
              attributes: ["userId", "username", "email", "profileImage"],
            },
          ],
        },
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    // Get purchase status for each course if user is authenticated
    let userPurchases = [];
    // TODO: Implement when order_items table is available
    if (userId) {
      const userOrders = await Order.findAll({
        where: {
          userId,
          status: 'paid'
        },
        include: [
          {
            model: OrderItem,
            as: 'items',
            where: {
              itemType: 'course',
              itemId: { [Op.in]: courses.map(course => course.courseId) }
            },
          }
        ]
      });
      userPurchases = userOrders.flatMap(order => order.items.map(item => item.itemId));
    }
    // Add purchase status to each course
    const coursesWithPurchaseStatus = courses.map(course => {
      const courseJson = course.toJSON();
      courseJson.purchaseStatus = userPurchases.includes(course.courseId);
      
      // Format instructors array
      courseJson.instructors = courseJson.courseInstructors?.map(ci => ({
        ...ci.instructor,
        isPrimary: ci.isPrimary,
        assignedAt: ci.createdAt
      })) || [];
      delete courseJson.courseInstructors;
      
      // Format languages array
      courseJson.languages = courseJson.courseLanguages?.map(cl => cl.language) || [];
      delete courseJson.courseLanguages;
      
      return courseJson;
    });

    return sendSuccess(res, "Courses retrieved successfully", {
      courses: coursesWithPurchaseStatus,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return sendServerError(res, "Failed to fetch courses", error.message);
  }
};
export const deleteCourse = async (req, res) => {
  const { courseId } = req.params;
  const { hardDelete = false } = req.query;

  // Basic UUID validation
  if (
    !courseId ||
    !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      courseId,
    )
  ) {
    return sendValidationError(res, "Invalid course ID format.", {
      courseId: "Must be a valid UUID"
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const course = await Course.findByPk(courseId, { transaction });

    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found.");
    }

    if (hardDelete === "true") {
      await CourseGoal.destroy({ where: { courseId }, transaction });

      // Remove language associations
      await course.setLanguages([], { transaction });

      // Delete course
      await course.destroy({ transaction });
      await transaction.commit();
      return sendSuccess(res, "Course permanently deleted successfully.");
    } else {
      // Soft delete - just change status
      await course.update({ status: "deleted" }, { transaction });

      await transaction.commit();

      return sendSuccess(res, "Course deleted successfully.");
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting course:", error);
    return sendServerError(res, error);
  }
};

export const getCourseAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      dateRange = "30d",
      includeRevenue = true,
      includeEngagement = true,
    } = req.query;

    // Check if course exists
    const course = await Course.findByPk(courseId, {
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: User,
          as: "instructors",
          attributes: ["userId", "username", "email"],
        },
      ],
    });

    if (!course) {
      return sendNotFound(res, "Course not found");
    }

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

    // Get enrollment data
    const enrollments = await Enrollment.findAll({
      where: {
        courseId,
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "username", "createdAt"],
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    // Get all-time enrollment data
    const allTimeEnrollments = await Enrollment.findAll({
      where: { courseId },
      attributes: [
        "userId",
        "status",
        "progressPercentage",
        "createdAt",
        "completedAt",
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "createdAt"],
        },
      ],
    });

    // Calculate enrollment analytics
    const enrollmentAnalytics = {
      total: allTimeEnrollments.length,
      newInPeriod: enrollments.length,
      completed: allTimeEnrollments.filter((e) => e.status === "completed")
        .length,
      inProgress: allTimeEnrollments.filter((e) => e.status === "in_progress")
        .length,
      dropped: allTimeEnrollments.filter((e) => e.status === "dropped").length,
      completionRate:
        allTimeEnrollments.length > 0
          ? (allTimeEnrollments.filter((e) => e.status === "completed").length /
            allTimeEnrollments.length) *
          100
          : 0,
      averageProgress:
        allTimeEnrollments.length > 0
          ? allTimeEnrollments.reduce(
            (sum, e) => sum + (e.progressPercentage || 0),
            0,
          ) / allTimeEnrollments.length
          : 0,
    };

    // Calculate enrollment trends
    const enrollmentTrends = enrollments.reduce((acc, enrollment) => {
      const date = enrollment.createdAt.toISOString().split("T")[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Calculate completion trends
    const completionTrends = allTimeEnrollments
      .filter(
        (e) =>
          e.completedAt &&
          e.completedAt >= startDate &&
          e.completedAt <= endDate,
      )
      .reduce((acc, enrollment) => {
        const date = enrollment.completedAt.toISOString().split("T")[0];
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      }, {});

    // Revenue analytics (simulated - would integrate with actual payment system)
    let revenueAnalytics = null;
    if (includeRevenue && course.price > 0) {
      const revenue = enrollments.length * course.price;
      const allTimeRevenue = allTimeEnrollments.length * course.price;

      revenueAnalytics = {
        periodRevenue: revenue,
        allTimeRevenue: allTimeRevenue,
        averageRevenuePerStudent: course.price,
        projectedMonthlyRevenue:
          (revenue / parseInt(dateRange.replace("d", ""))) * 30,
        revenueByDay: enrollments.reduce((acc, enrollment) => {
          const date = enrollment.createdAt.toISOString().split("T")[0];
          acc[date] = (acc[date] || 0) + course.price;
          return acc;
        }, {}),
      };
    }

    // Engagement analytics (simulated - would come from actual engagement tracking)
    let engagementAnalytics = null;
    if (includeEngagement) {
      engagementAnalytics = {
        averageTimeSpent: Math.floor(Math.random() * 120) + 30, // minutes
        videoCompletionRate: Math.floor(Math.random() * 40) + 60, // percentage
        resourceDownloads: Math.floor(Math.random() * 500) + 100,
        forumPosts: Math.floor(Math.random() * 50) + 10,
        averageRating: course.averageRating || 0,
        totalRatings: course.totalRatings || 0,
      };
    }

    // Student demographics (simulated)
    const demographics = {
      newStudentsThisPeriod: enrollments.length,
      returningStudents: allTimeEnrollments.filter((e) => {
        const userCreated = new Date(e.user.createdAt);
        const enrollmentCreated = new Date(e.createdAt);
        return enrollmentCreated - userCreated > 30 * 24 * 60 * 60 * 1000; // Enrolled 30+ days after signup
      }).length,
      averageTimeToComplete:
        allTimeEnrollments
          .filter((e) => e.completedAt && e.createdAt)
          .reduce((sum, e) => {
            const timeDiff = new Date(e.completedAt) - new Date(e.createdAt);
            return sum + timeDiff / (1000 * 60 * 60 * 24); // days
          }, 0) /
        Math.max(allTimeEnrollments.filter((e) => e.completedAt).length, 1),
    };

    return sendSuccess(res, "Course analytics fetched successfully", {
      course: {
        courseId: course.courseId,
        title: course.title,
        type: course.type,
        price: course.price,
        category: course.category?.categoryName,
        instructor: course.instructor?.username,
        createdAt: course.createdAt,
      },
      analytics: {
        enrollment: enrollmentAnalytics,
        ...(revenueAnalytics && { revenue: revenueAnalytics }),
        ...(engagementAnalytics && { engagement: engagementAnalytics }),
        demographics,
        trends: {
          enrollmentByDay: enrollmentTrends,
          completionByDay: completionTrends,
        },
      },
      period: {
        startDate,
        endDate,
        duration: dateRange,
      },
    });
  } catch (error) {
    console.error("Get course analytics error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get Admin Dashboard Overview (Admin/Owner only)
 * Comprehensive overview of all courses, revenue, and system metrics
 */
export const getAdminDashboardOverview = async (req, res) => {
  try {
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

    // Get course statistics
    const totalCourses = await Course.count();
    const activeCourses = await Course.count({
      where: { status: "published" },
    });
    const newCoursesInPeriod = await Course.count({
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
    });

    // Get enrollment statistics
    const totalEnrollments = await Enrollment.count();
    const newEnrollmentsInPeriod = await Enrollment.count({
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
    });
    const completedEnrollments = await Enrollment.count({
      where: { status: "completed" },
    });

    // Get user statistics
    const totalUsers = await User.count();
    const newUsersInPeriod = await User.count({
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
    });
    const instructors = await User.count({ where: { role: "teacher" } });
    const students = await User.count({ where: { role: "student" } });

    // Get top performing courses
    const topCourses = await Course.findAll({
      attributes: [
        "courseId",
        "title",
        "price",
        "averageRating",
        "totalRatings",
        [
          sequelize.fn("COUNT", sequelize.col("enrollments.enrollmentId")),
          "enrollmentCount",
        ],
      ],
      include: [
        {
          model: Enrollment,
          as: "enrollments",
          attributes: [],
        },
      ],
      group: ["Course.courseId"],
      order: [[sequelize.literal("enrollmentCount"), "DESC"]],
      limit: 10,
    });

    // Calculate revenue (simulated)
    const courses = await Course.findAll({
      attributes: ["courseId", "price"],
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
      ],
    });

    const revenueAnalytics = {
      totalRevenue: courses.reduce(
        (sum, course) => sum + course.price * (course.enrollments?.length || 0),
        0,
      ),
      averageOrderValue:
        courses.length > 0
          ? courses.reduce((sum, course) => sum + course.price, 0) /
          courses.length
          : 0,
      revenueGrowth: Math.floor(Math.random() * 20) + 5, // Simulated growth percentage
    };

    // Get enrollment trends
    const enrollmentTrends = await Enrollment.findAll({
      attributes: [
        [sequelize.fn("DATE", sequelize.col("createdAt")), "date"],
        [sequelize.fn("COUNT", sequelize.col("enrollmentId")), "count"],
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate,
        },
      },
      group: [sequelize.fn("DATE", sequelize.col("createdAt"))],
      order: [[sequelize.fn("DATE", sequelize.col("createdAt")), "ASC"]],
    });

    // System health metrics (simulated)
    const systemMetrics = {
      serverUptime: "99.9%",
      averageResponseTime: "245ms",
      errorRate: "0.1%",
      activeUsers: Math.floor(Math.random() * 1000) + 500,
      peakConcurrentUsers: Math.floor(Math.random() * 200) + 100,
    };

    // Structure the response to match frontend expectations
    return sendSuccess(res, "Admin dashboard overview fetched successfully", {
      DASHBOARD: {
        overview: {
          courses: {
            total: totalCourses,
            active: activeCourses,
            newInPeriod: newCoursesInPeriod,
            conversionRate:
              totalCourses > 0 ? (activeCourses / totalCourses) * 100 : 0,
          },
          enrollments: {
            total: totalEnrollments,
            newInPeriod: newEnrollmentsInPeriod,
            completed: completedEnrollments,
            completionRate:
              totalEnrollments > 0
                ? (completedEnrollments / totalEnrollments) * 100
                : 0,
          },
          users: {
            total: totalUsers,
            newInPeriod: newUsersInPeriod,
            instructors,
            students,
            growthRate: Math.floor(Math.random() * 15) + 5, // Simulated growth
          },
          revenue: revenueAnalytics,
        },
        topCourses: topCourses.map((course) => ({
          courseId: course.courseId,
          title: course.title,
          price: course.price,
          enrollments: course.dataValues.enrollmentCount,
          rating: course.averageRating,
          reviews: course.totalRatings,
        })),
        trends: {
          enrollmentsByDay: enrollmentTrends.map((trend) => ({
            date: trend.dataValues.date,
            enrollments: parseInt(trend.dataValues.count),
          })),
        },
        systemMetrics,
        period: {
          startDate,
          endDate,
          duration: dateRange,
        }
      }
    });
  } catch (error) {
    console.error("Get admin dashboard overview error:", error);
    return sendServerError(res, error);
  }
};

export const searchCourses = async (req, res) => {
  try {
    const {
      q, // search query
      page = 1,
      limit = 10,
      filters = {},
    } = req.query;

    if (!q || q.trim().length < 2) {
      return sendValidationError(res, "Search query must be at least 2 characters long.", {
        q: "Search query must be at least 2 characters long."
      });
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const searchTerm = q.trim();

    // Build search conditions
    const whereCondition = {
      status: "active",
      [Op.or]: [
        { title: { [Op.iLike]: `%${searchTerm}%` } },
        { description: { [Op.iLike]: `%${searchTerm}%` } },
      ],
    };

    // Add filters
    if (filters.categoryId) whereCondition.categoryId = filters.categoryId;
    if (filters.levelId) whereCondition.levelId = filters.levelId;
    if (filters.type) whereCondition.type = filters.type;
    if (filters.isPaid !== undefined)
      whereCondition.isPaid = filters.isPaid === "true";

    const { count, rows: courses } = await Course.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name"],
        },
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: User,
          as: "instructor",
          attributes: ["userId", "username", "profileImage"],
        },
        {
          model: CourseTechStack,
          as: "techStack",
          include: [
            {
              model: Skill,
              as: "skill",
              attributes: ["skillId", "skillName"],
            },
          ],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    return sendSuccess(res, "Search completed successfully.", {
      searchQuery: searchTerm,
      courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error searching courses:", error);
    return sendServerError(res, error);
  }
};

export const getCoursesByInstructor = async (req, res) => {
  const { page = 1, limit = 10, status = "active" } = req.query;
  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: courses } = await Course.findAndCountAll({
      where: {
        status,
      },
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name"],
        },
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    return sendSuccess(res, "Instructor courses fetched successfully.", {
      courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching instructor courses:", error);
    return sendServerError(res, error);
  }
};

export const getCoursesByCategory = async (req, res) => {
  const { categoryId } = req.params;
  const { page = 1, limit = 10, status = "active" } = req.query;

  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: courses } = await Course.findAndCountAll({
      where: {
        categoryId,
        status,
      },
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name"],
        },
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: User,
          as: "instructor",
          attributes: ["userId", "username", "profileImage"],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    return sendSuccess(res, "Category courses fetched successfully.", {
      courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching category courses:", error);
    return sendServerError(res, error);
  }
};

export const toggleCourseStatus = async (req, res) => {
  const { courseId } = req.params;
  const { status } = req.body;

  const validStatuses = ["active", "inactive", "draft", "deleted"];
  if (!status || !validStatuses.includes(status)) {
    return sendValidationError(res, `Invalid status. Must be one of: ${validStatuses.join(", ")}`, {
      status: `Must be one of: ${validStatuses.join(", ")}`
    });
  }

  try {
    const course = await Course.findByPk(courseId);

    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    await course.update({ status });

    return sendSuccess(res, `Course status updated to ${status} successfully.`, {
      course: {
        courseId: course.courseId,
        title: course.title,
        status: course.status,
      },
    });
  } catch (error) {
    console.error("Error updating course status:", error);
    return sendServerError(res, error);
  }
};

export const getCoursesStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      Course.count({ where: { status: "active" } }),
      Course.count({ where: { status: "inactive" } }),
      Course.count({ where: { status: "draft" } }),
      Course.count({ where: { type: "live" } }),
      Course.count({ where: { type: "recorded" } }),
      Course.count({ where: { type: "hybrid" } }),
      Course.count({ where: { isPaid: true } }),
      Course.count({ where: { isPaid: false } }),
    ]);

    const [
      activeCourses,
      inactiveCourses,
      draftCourses,
      liveCourses,
      recordedCourses,
      hybridCourses,
      paidCourses,
      freeCourses,
    ] = stats;

    return sendSuccess(res, "Course statistics fetched successfully.", {
      byStatus: {
        active: activeCourses,
        inactive: inactiveCourses,
        draft: draftCourses,
        total: activeCourses + inactiveCourses + draftCourses,
      },
      byType: {
        live: liveCourses,
        recorded: recordedCourses,
        hybrid: hybridCourses,
      },
      byPricing: {
        paid: paidCourses,
        free: freeCourses,
      },
    });
  } catch (error) {
    console.error("Error fetching course statistics:", error);
    return sendServerError(res, error);
  }
};

// ===================== ADMIN/OWNER COURSE MANAGEMENT =====================

export const createLiveCourse = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      title,
      description,
      languageId: _languageId, // Prefixed with underscore to indicate unused
      price,
      requirements: _requirements = [], // Prefixed with underscore
      skillLevel,
      whatYoullLearn = [],
      prerequisites: _prerequisites = [], // Prefixed with underscore
      thumbnailUrl,
      introVideoUrl: _introVideoUrl, // Prefixed with underscore
      teacherIds: _teacherIds = [], // Prefixed with underscore
      visibility = "public",
      batchSettings = {
        minStudentsToCreateBatch: 10,
        maxStudentsPerBatch: 50,
        autoCreateBatch: true,
      },
    } = req.body;

    const createdBy = req.user.userId;

    if (!title || !description || !_languageId || !skillLevel || !price) {
      return sendValidationError(res, "Missing required fields: title, description, languageId, skillLevel, price", {
        title: !title ? "Required" : undefined,
        description: !description ? "Required" : undefined,
        languageId: !_languageId ? "Required" : undefined,
        skillLevel: !skillLevel ? "Required" : undefined,
        price: !price ? "Required" : undefined,
      });
    }

    const course = await Course.create(
      {
        title,
        thumbnailUrl,
        description,
        levelId: skillLevel,
        categoryId: req.body.categoryId,
        createdBy,
        type: "live",
        isPaid: price > 0,
        price,
        status: "draft",
        visibility,
        batchSettings: JSON.stringify(batchSettings),
      },
      { transaction },
    );

    if (whatYoullLearn.length > 0) {
      const goalPromises = whatYoullLearn.map((goal, index) =>
        CourseGoal.create(
          {
            courseId: course.courseId,
            goalText: goal.title || goal,
            description: goal.description || null,
            order: index + 1,
          },
          { transaction },
        ),
      );
      await Promise.all(goalPromises);
    }


    await transaction.commit();

    return sendSuccess(res, "Live course created successfully", {
      courseId: course.courseId,
      title: course.title,
      type: course.type,
      price: course.price,
      status: course.status,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create live course error:", error);
    return sendServerError(res, error);
  }
};

export const createRecordedCourse = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      title,
      description,
      languageId: _languageId, // Prefixed with underscore
      price,
      skillLevel,
      whatYoullLearn = [],
      prerequisites: _prerequisites = [], // Prefixed with underscore
      thumbnailUrl,
      introVideoUrl,
      sections = [],
      visibility = "public",
      enableReviews = true,
      enableChat = false,
    } = req.body;

    const createdBy = req.user.userId;

    const course = await Course.create(
      {
        title,
        thumbnailUrl,
        description,
        levelId: skillLevel,
        categoryId: req.body.categoryId,
        createdBy,
        type: "recorded",
        isPaid: price > 0,
        price,
        status: "draft",
        visibility,
        enableReviews,
        enableChat,
        introVideoUrl,
      },
      { transaction },
    );

    if (whatYoullLearn.length > 0) {
      const goalPromises = whatYoullLearn.map((goal, index) =>
        CourseGoal.create(
          {
            courseId: course.courseId,
            goalText: goal.title || goal,
            description: goal.description || null,
            order: index + 1,
          },
          { transaction },
        ),
      );
      await Promise.all(goalPromises);
    }

    if (sections.length > 0) {
      for (let i = 0; i < sections.length; i++) {
        const sectionData = sections[i];
        const section = await Section.create(
          {
            courseId: course.courseId,
            title: sectionData.title,
            description: sectionData.description || "",
            order: i + 1,
          },
          { transaction },
        );

        if (sectionData.lessons && sectionData.lessons.length > 0) {
          for (let j = 0; j < sectionData.lessons.length; j++) {
            const lessonData = sectionData.lessons[j];
            await Lesson.create(
              {
                sectionId: section.sectionId,
                title: lessonData.title,
                description: lessonData.description || "",
                videoUrl: lessonData.videoUrl,
                duration: lessonData.duration || 0,
                order: j + 1,
                isPreview: lessonData.isPreview || false,
              },
              { transaction },
            );
          }
        }
      }
    }

    await transaction.commit();

    return sendSuccess(res, "Recorded course created successfully", {
      courseId: course.courseId,
      title: course.title,
      type: course.type,
      price: course.price,
      status: course.status,
      sectionsCount: sections.length,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create recorded course error:", error);
    return sendServerError(res, error);
  }
};

// Create course batch
export const createCourseBatch = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { courseId } = req.params;
    const {
      batchName,
      maxStudents,
      startDate,
      endDate,
      schedule = []
    } = req.body;

    const createdBy = req.user?.userId;

    // Validate course exists and is live type
    const course = await Course.findByPk(courseId);
    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
    }

    if (course.type !== 'live') {
      await transaction.rollback();
      return sendError(res, 400, "Batches can only be created for live courses");
    }

    // Create batch
    const batch = await Batch.create({
      courseId,
      batchName,
      maxStudents: maxStudents || 50,
      currentStudents: 0,
      status: 'planned',
      startDate,
      endDate,
      createdBy
    }, { transaction });

    // Create batch schedule
    if (schedule.length > 0) {
      const scheduleData = schedule.map(scheduleItem => ({
        batchId: batch.batchId,
        dayOfWeek: scheduleItem.dayOfWeek,
        startTime: scheduleItem.startTime,
        endTime: scheduleItem.endTime,
        timeZone: scheduleItem.timeZone || 'UTC'
      }));
      await BatchSchedule.bulkCreate(scheduleData, { transaction });
    }

    await transaction.commit();

    const createdBatch = await Batch.findByPk(batch.batchId, {
      include: [
        { model: BatchSchedule, as: "schedules" },
        { model: Course, as: "course", attributes: ["courseId", "title"] }
      ]
    });

    return sendSuccess(res, "Batch created successfully", createdBatch);

  } catch (error) {
    await transaction.rollback();
    console.error("Create batch error:", error);
    return sendServerError(res, error);
  }
};

// Get course batches
export const getCourseBatches = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const whereClause = { courseId };
    if (status) {
      whereClause.status = status;
    }

    const offset = (page - 1) * limit;
    const { count, rows } = await Batch.findAndCountAll({
      where: whereClause,
      include: [
        { model: BatchSchedule, as: "schedules" },
        { model: Course, as: "course", attributes: ["courseId", "title"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset
    });

    return sendSuccess(res, "Batches retrieved successfully", {
      batches: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
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
      } catch (_error) {
        console.error("Error parsing questions JSON:", _error);
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
      console.error("Error parsing questions JSON:", e);
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

// Get all purchases (enrollments) for a course
export const getCoursePurchases = async (req, res) => {
  const { courseId } = req.params;

  try {
    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    // Get all enrollments (purchases) for the course
    const purchases = await Enrollment.findAll({
      where: {
        courseId,
        paymentStatus: 'completed'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'email', 'profileImage', 'mobile']
        }
      ],
      order: [['enrollmentDate', 'DESC']]
    });

    // Format the response to match expected structure
    const formattedPurchases = purchases.map(enrollment => ({
      enrollmentId: enrollment.enrollmentId,
      purchaseDate: enrollment.enrollmentDate,
      amountPaid: enrollment.amountPaid,
      paymentMethod: enrollment.paymentMethod,
      completionStatus: enrollment.completionStatus,
      progressPercentage: enrollment.progressPercentage,
      student: {
        id: enrollment.user.userId,
        name: enrollment.user.username,
        email: enrollment.user.email,
        avatar: enrollment.user.profileImage,
        phone: enrollment.user.mobile
      }
    }));

    return sendSuccess(res, "Course purchases fetched successfully", formattedPurchases);
  } catch (error) {
    console.error("Error fetching course purchases:", error);
    return sendServerError(res, "Failed to fetch course purchases");
  }
};

// Get purchase (enrollment) details
export const getPurchaseDetails = async (req, res) => {
  const { courseId, purchaseId } = req.params;

  try {
    const purchase = await Enrollment.findOne({
      where: {
        enrollmentId: purchaseId,
        courseId,
        paymentStatus: 'completed'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['userId', 'username', 'email', 'profileImage', 'mobile']
        },
        {
          model: Course,
          as: 'course',
          attributes: ['courseId', 'title', 'type', 'price']
        }
      ]
    });

    if (!purchase) {
      return sendNotFound(res, "Purchase not found");
    }

    // Format the response
    const formattedPurchase = {
      enrollmentId: purchase.enrollmentId,
      purchaseDate: purchase.enrollmentDate,
      amountPaid: purchase.amountPaid,
      paymentMethod: purchase.paymentMethod,
      paymentId: purchase.paymentId,
      orderId: purchase.orderId,
      completionStatus: purchase.completionStatus,
      progressPercentage: purchase.progressPercentage,
      student: {
        id: purchase.user.userId,
        name: purchase.user.username,
        email: purchase.user.email,
        avatar: purchase.user.profileImage,
        phone: purchase.user.mobile
      },
      course: purchase.course
    };

    return sendSuccess(res, "Purchase details fetched successfully", formattedPurchase);
  } catch (error) {
    console.error("Error fetching purchase details:", error);
    return sendServerError(res, "Failed to fetch purchase details");
  }
};

// Delete course (Admin only)
export const deleteCourseAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { courseId } = req.params;

    // Find the course
    const course = await Course.findByPk(courseId);
    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
    }

    // Check if course has any enrollments
    const enrollmentCount = await Enrollment.count({
      where: { courseId, paymentStatus: 'completed' }
    });

    if (enrollmentCount > 0) {
      await transaction.rollback();
      return sendError(res, 400, "Cannot delete course with active enrollments. Please archive the course instead.");
    }

    // Delete associated data
    await Section.destroy({ where: { courseId }, transaction });
    await CourseTeacher.destroy({ where: { courseId }, transaction });
    await CourseRating.destroy({ where: { courseId }, transaction });
    await Batch.destroy({ where: { courseId }, transaction });

    // Delete the course
    await course.destroy({ transaction });
    await transaction.commit();
    return sendSuccess(res, "Course deleted successfully", { courseId });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting course:", error);
    return sendServerError(res, "Failed to delete course");
  }
};

// Delete rating (Admin only)
export const deleteRating = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { courseId, ratingId } = req.params;

    // Verify course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
    }

    // Find and delete the rating
    const rating = await CourseRating.findOne({
      where: {
        ratingId: ratingId,
        courseId: courseId
      }
    });

    if (!rating) {
      await transaction.rollback();
      return sendNotFound(res, "Rating not found");
    }

    await rating.destroy({ transaction });

    await transaction.commit();

    return sendSuccess(res, "Rating deleted successfully", { ratingId });
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting rating:", error);
    return sendServerError(res, "Failed to delete rating");
  }
};

// Reply to rating (Admin only)
export const replyToRating = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { courseId, ratingId } = req.params;
    const { reply } = req.body;

    // Validate input
    if (!reply || reply.trim().length === 0) {
      await transaction.rollback();
      return sendValidationError(res, "Reply message is required");
    }

    // Verify course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
    }

    // Find and update the rating with reply
    const rating = await CourseRating.findOne({
      where: {
        ratingId: ratingId,
        courseId: courseId
      }
    });

    if (!rating) {
      await transaction.rollback();
      return sendNotFound(res, "Rating not found");
    }



    // Update rating with reply
    await rating.update({
      adminReply: reply.trim(),
      repliedAt: new Date()
    }, { transaction });

    await transaction.commit();

    return sendSuccess(res, "Reply added successfully", {
      ratingId,
      reply: reply.trim(),
      repliedAt: new Date()
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error replying to rating:", error);
    return sendServerError(res, "Failed to reply to rating");
  }
};

// Batch update rating status (Admin only)
export const batchUpdateRatingStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { courseId } = req.params;
    const { ratingIds, status } = req.body;

    // Validate inputs
    if (!ratingIds || !Array.isArray(ratingIds) || ratingIds.length === 0) {
      await transaction.rollback();
      return sendValidationError(res, "Rating IDs array is required");
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid status. Must be 'approved', 'rejected', or 'pending'");
    }

    // Verify course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
    }

    // Update ratings
    const [updatedCount] = await CourseRating.update(
      { status },
      {
        where: {
          id: ratingIds,
          courseId: courseId
        },
        transaction
      }
    );

    await transaction.commit();

    sendSuccess(res, {
      message: `Successfully updated ${updatedCount} ratings`,
      updatedCount
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error in batchUpdateRatingStatus:', error);
    sendServerError(res, "Failed to update rating status");
  }
};

// Export course data (Admin only)
export const exportCourseData = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { format = 'json' } = req.query;

    // Find course with all related data
    const course = await Course.findByPk(courseId, {
      include: [
        { model: User, as: 'instructor', attributes: ['id', 'name', 'email'] },
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        // Add other associations as needed
      ]
    });

    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    // Format data for export
    const exportData = {
      course: course.toJSON(),
      exportedAt: new Date().toISOString(),
      exportedBy: req.user.userId
    };

    if (format === 'csv') {
      // Convert to CSV format if needed
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="course_export.csv"');
      // Implementation for CSV export would go here
      return res.send('CSV export not implemented yet');
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="course_export.json"');

    sendSuccess(res,
      "Course data exported successfully",
      exportData
    );
  } catch (error) {
    console.error('Error in exportCourseData:', error);
    sendServerError(res, "Failed to export course data");
  }
};

// ===================== COURSE RATINGS & REVIEWS =====================

// Get course ratings stats (average rating, total reviews, etc.)
export const getCourseRatingsStats = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Validate course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    // Get rating statistics
    const ratingsStats = await CourseRating.findAll({
      where: { courseId },
      attributes: [
        [sequelize.fn('AVG', sequelize.col('rating')), 'averageRating'],
        [sequelize.fn('COUNT', sequelize.col('rating_id')), 'totalReviews'], // Use actual column name
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 5 THEN 1 END')), 'fiveStars'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 4 THEN 1 END')), 'fourStars'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 3 THEN 1 END')), 'threeStars'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 2 THEN 1 END')), 'twoStars'],
        [sequelize.fn('COUNT', sequelize.literal('CASE WHEN rating = 1 THEN 1 END')), 'oneStar']
      ],
      raw: true
    });

    const stats = ratingsStats[0];
    const averageRating = parseFloat(stats.averageRating) || 0;
    const totalReviews = parseInt(stats.totalReviews) || 0;

    return sendSuccess(res, "Course ratings stats retrieved successfully", {
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      totalReviews,
      ratingDistribution: {
        fiveStars: parseInt(stats.fiveStars) || 0,
        fourStars: parseInt(stats.fourStars) || 0,
        threeStars: parseInt(stats.threeStars) || 0,
        twoStars: parseInt(stats.twoStars) || 0,
        oneStar: parseInt(stats.oneStar) || 0
      }
    });

  } catch (error) {
    console.error("Error fetching course ratings stats:", error);
    return sendServerError(res, "Failed to fetch course ratings stats", error.message);
  }
};

// Get course reviews with pagination
export const getCourseReviews = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      rating // Filter by specific rating
    } = req.query;

    // Validate course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const whereClause = { courseId };

    // Filter by rating if provided
    if (rating && rating !== 'all') {
      whereClause.rating = rating;
    }

    // Only show reviews with text content
    whereClause.review = { [Op.ne]: null };

    const { count, rows: reviews } = await CourseRating.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "username", "profileImage"]
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return sendSuccess(res, "Course reviews retrieved successfully", {
      reviews,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });

  } catch (error) {
    console.error("Error fetching course reviews:", error);
    return sendServerError(res, "Failed to fetch course reviews", error.message);
  }
};

// Create course review (only if user purchased the course)
export const createCourseReview = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, review } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return sendUnauthorized(res, "Authentication required");
    }

    // Validate input
    if (!rating || rating < 1 || rating > 5) {
      return sendValidationError(res, "Rating must be between 1 and 5");
    }

    // Validate course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    // Check if user has purchased the course
    // TODO: Implement when order_items table is available
    const userPurchase = await Order.findOne({
      where: {
        userId,
        status: 'paid'
      },
      include: [{
        model: OrderItem,
        as: 'items',
        where: {
          itemType: 'course',
          itemId: courseId
        },
        required: true
      }]
    });

    if (!userPurchase) {
      return sendForbidden(res, "You can only review courses you have purchased");
    }

    // For now, allow all authenticated users to review courses
    console.log("Note: Purchase verification temporarily disabled - allowing all authenticated users to review");

    // Check if user already reviewed this course
    const existingReview = await CourseRating.findOne({
      where: { courseId, userId }
    });

    if (existingReview) {
      return sendConflict(res, "You have already reviewed this course");
    }

    // Create the review
    const newReview = await CourseRating.create({
      courseId,
      userId,
      rating: parseFloat(rating),
      review: review?.trim() || null,
      isVerified: true // Since we verified they purchased the course
    });

    // Get the created review with user info
    const reviewWithUser = await CourseRating.findByPk(newReview.ratingId, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "username", "profileImage"]
        }
      ]
    });

    return sendSuccess(res, "Review created successfully", reviewWithUser);

  } catch (error) {
    console.error("Error creating course review:", error);
    return sendServerError(res, "Failed to create review", error.message);
  }
};

// ===================== COURSE LANGUAGE MANAGEMENT =====================

// Get languages for a course
export const getCourseLanguages = async (req, res) => {
  try {
    const { courseId } = req.params;

    const courseLanguages = await CourseLanguage.findAll({
      where: { courseId },
      include: [
        {
          model: Language,
          as: "language",
          attributes: ["languageId", "language", "languageCode"]
        }
      ]
    });

    return sendSuccess(res, "Course languages retrieved successfully", courseLanguages);
  } catch (error) {
    console.error("Error getting course languages:", error);
    return sendServerError(res, error);
  }
};

// Add languages to a course
export const addCourseLanguages = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { languageIds } = req.body;

    if (!Array.isArray(languageIds) || languageIds.length === 0) {
      return sendValidationError(res, "Language IDs array is required");
    }

    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    // Check if languages exist
    const languages = await Language.findAll({
      where: { languageId: languageIds }
    });
    
    if (languages.length !== languageIds.length) {
      return sendValidationError(res, "One or more languages not found");
    }

    // Create course language associations
    console.log(`Adding languages ${languageIds} to course ${courseId}`);
    const courseLanguages = await Promise.all(
      languageIds.map(async languageId => {
        console.log(`Processing language ${languageId}`);
        const result = await CourseLanguage.findOrCreate({
          where: { courseId, languageId },
          defaults: { courseId, languageId }
        });
        console.log(`Language ${languageId} result:`, result[1] ? 'created' : 'exists');
        return result;
      })
    );

    const newlyAdded = courseLanguages.filter(([_courseLanguage, created]) => created);
    console.log(`Successfully added ${newlyAdded.length} new languages`);
    
    return sendSuccess(res, `Added ${newlyAdded.length} new language(s) to course`, {
      added: newlyAdded.length,
      total: courseLanguages.length
    });
  } catch (error) {
    console.error("Error adding course languages:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    return sendServerError(res, error);
  }
};

// Remove language from course
export const removeCourseLanguage = async (req, res) => {
  try {
    const { courseId, languageId } = req.params;

    const deleted = await CourseLanguage.destroy({
      where: { courseId, languageId }
    });

    if (deleted === 0) {
      return sendNotFound(res, "Course language association not found");
    }

    return sendSuccess(res, "Language removed from course successfully");
  } catch (error) {
    console.error("Error removing course language:", error);
    return sendServerError(res, error);
  }
};

// ===================== COURSE INSTRUCTOR MANAGEMENT =====================

// Get instructors for a course
export const getCourseInstructors = async (req, res) => {
  try {
    const { courseId } = req.params;

    const courseInstructors = await CourseInstructor.findAll({
      where: { courseId },
      include: [
        {
          model: User,
          as: "instructor",
          attributes: ["userId", "username", "email", "profileImage", "bio"]
        },
        {
          model: User,
          as: "assigner",
          attributes: ["userId", "username"]
        }
      ]
    });

    return sendSuccess(res, "Course instructors retrieved successfully", courseInstructors);
  } catch (error) {
    console.error("Error getting course instructors:", error);
    return sendServerError(res, error);
  }
};

// Add instructors to a course
export const addCourseInstructors = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { instructorIds, isPrimary = false } = req.body;
    const assignedBy = req.user.userId;

    if (!Array.isArray(instructorIds) || instructorIds.length === 0) {
      return sendValidationError(res, "Instructor IDs array is required");
    }

    // Check if course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    // Check if instructors exist and have teacher/admin role
    const instructors = await User.findAll({
      where: { 
        userId: instructorIds,
        role: { [Op.in]: ['teacher', 'admin'] }
      }
    });
    
    if (instructors.length !== instructorIds.length) {
      return sendValidationError(res, "One or more instructors not found or don't have appropriate role");
    }

    // Create course instructor associations
    const courseInstructors = await Promise.all(
      instructorIds.map(instructorId =>
        CourseInstructor.findOrCreate({
          where: { courseId, instructorId },
          defaults: { courseId, instructorId, isPrimary, assignedBy }
        })
      )
    );

    const newlyAdded = courseInstructors.filter(([_courseInstructor, created]) => created);
    
    return sendSuccess(res, `Added ${newlyAdded.length} new instructor(s) to course`, {
      added: newlyAdded.length,
      total: courseInstructors.length
    });
  } catch (error) {
    console.error("Error adding course instructors:", error);
    return sendServerError(res, error);
  }
};

// Remove instructor from course
export const removeCourseInstructor = async (req, res) => {
  try {
    const { courseId, instructorId } = req.params;

    const deleted = await CourseInstructor.destroy({
      where: { courseId, instructorId }
    });

    if (deleted === 0) {
      return sendNotFound(res, "Course instructor association not found");
    }

    return sendSuccess(res, "Instructor removed from course successfully");
  } catch (error) {
    console.error("Error removing course instructor:", error);
    return sendServerError(res, error);
  }
};
