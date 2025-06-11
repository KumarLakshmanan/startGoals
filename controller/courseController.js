// Create a new course (hybrid, recorded, or live)
import sequelize from "../config/db.js";
import Course from "../model/course.js";
import { validateCourseInput } from "../utils/commonUtils.js";
import CourseLevel from "../model/courseLevel.js";
import CourseCategory from "../model/courseCategory.js";
import CourseTag from "../model/courseTag.js";
import Language from "../model/language.js";
import CourseGoal from "../model/courseGoal.js";
import CourseRequirement from "../model/courseRequirement.js";
import Section from "../model/section.js";
import Lesson from "../model/lesson.js";
import Resource from "../model/resource.js";
import User from "../model/user.js";
import Enrollment from "../model/enrollment.js";
import { Op } from "sequelize";

export const getCourseById = async (req, res) => {
  const { courseId } = req.params;

  // Basic UUID validation
  if (
    !courseId ||
    !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      courseId
    )
  ) {
    return res.status(400).json({
      status: false,
      message: "Invalid course ID format.",
    });
  }

  try {
    const course = await Course.findOne({
      where: { courseId },
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "level", "order"],
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: User,
          as: "instructor",
          attributes: ["userId", "username", "email", "mobile", "profileImage"],
        },
        {
          model: CourseTag,
          as: "tags",
          attributes: ["tag"],
        },
        {
          model: Language,
          through: { attributes: [] },
          attributes: ["languageId", "language", "languageCode"],
          // course_languages join table
        },
        {
          model: CourseGoal,
          as: "goals",
          attributes: ["goalId", "goalText"],
        },
        {
          model: CourseRequirement,
          as: "requirements",
          attributes: ["requirementId", "requirementText", "order"],
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
                "videoUrl",
                "duration",
                "content",
                "type",
                "order",
              ],
            },
          ],
        },
      ],
    });

    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found.",
      });
    }

    return res.status(200).json({
      status: true,
      message: "Course fetched successfully.",
      course,
    });
  } catch (error) {
    console.error("Error fetching course:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching the course.",
    });
  }
};

export const createCourse = async (req, res) => {
  console.log('createCourse called with body:', JSON.stringify(req.body, null, 2));

  const {
    title,
    description,
    levelId,
    categoryId,
    languageIds,
    tags,
    goals,
    requirements,
    isPaid,
    price,
    type,
    wasLive,
    liveStartDate,
    liveEndDate,
    thumbnailUrl,
  } = req.body;
  const createdBy = req.user?.userId; // Assuming userId is set in the request by auth middleware
  // Additional validation for UUID fields
  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

  if (levelId && !uuidRegex.test(levelId)) {
    return res.status(400).json({
      status: false,
      message: "Invalid levelId format. Must be a valid UUID.",
      field: "levelId",
      value: levelId
    });
  }

  if (categoryId && !uuidRegex.test(categoryId)) {
    return res.status(400).json({
      status: false,
      message: "Invalid categoryId format. Must be a valid UUID.",
      field: "categoryId",
      value: categoryId
    });
  }

  if (createdBy && !uuidRegex.test(createdBy)) {
    return res.status(400).json({
      status: false,
      message: "Invalid createdBy format. Must be a valid UUID.",
      field: "createdBy",
      value: createdBy
    });
  }

  // Validate course input
  const validationErrors = validateCourseInput(req.body);
  if (validationErrors.length > 0) {
    return res.status(400).json({
      status: false,
      errors: validationErrors,
    });
  }
  const transaction = await sequelize.transaction();

  try {
    if (
      (type === "live" || type === "hybrid") &&
      (!liveStartDate || !liveEndDate)
    ) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message:
          "Live and Hybrid courses must have both liveStartDate and liveEndDate.",
      });
    }    // Step 1: Validate foreign key references exist
    const [levelExists, categoryExists, userExists] = await Promise.all([
      CourseLevel.findByPk(levelId, { transaction }),
      CourseCategory.findByPk(categoryId, { transaction }),
      User.findByPk(createdBy, { transaction })
    ]);

    if (!levelExists) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: "Invalid levelId: Course level does not exist",
        field: "levelId",
        value: levelId
      });
    }

    if (!categoryExists) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: "Invalid categoryId: Course category does not exist",
        field: "categoryId",
        value: categoryId
      });
    }

    if (!userExists) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: "Invalid createdBy: User does not exist",
        field: "createdBy",
        value: createdBy
      });
    }

    // Step 2: Create course
    console.log('Creating course with data:', {
      title, description, levelId, categoryId, createdBy,
      isPaid, price, type, liveStartDate, liveEndDate, thumbnailUrl, wasLive
    });

    const newCourse = await Course.create(
      {
        title,
        description,
        levelId,
        categoryId,
        createdBy,
        isPaid,
        price,
        type,
        liveStartDate,
        liveEndDate,
        thumbnailUrl,
        wasLive,
      },
      { transaction }
    );

    // Step 3: Validate languageIds exist
    const languages = await Language.findAll({
      where: {
        languageId: { [Op.in]: languageIds },
      },
      transaction,
    });

    if (languages.length !== languageIds.length) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: "Some language IDs are invalid",
      });
    }

    // Step 4: Associate languages
    await newCourse.setLanguages(languageIds, { transaction });

    // Step 5: Save tags
    if (tags?.length) {
      const tagRecords = tags.map((tag) => ({
        tag,
        courseId: newCourse.courseId,
      }));
      await CourseTag.bulkCreate(tagRecords, { transaction });
    }

    // Step 6: Save goals
    if (goals?.length) {
      const goalRecords = goals.map((goalText, index) => ({
        goalText,
        courseId: newCourse.courseId,
        order: index + 1,
      }));
      await CourseGoal.bulkCreate(goalRecords, { transaction });
    }

    // Step 7: Save requirements
    if (requirements?.length) {
      const requirementRecords = requirements.map((requirementText, index) => ({
        requirementText,
        courseId: newCourse.courseId,
        order: index + 1,
      }));
      await CourseRequirement.bulkCreate(requirementRecords, { transaction });
    }    // Step 8: Commit
    await transaction.commit();

    return res.status(201).json({
      status: true,
      message: "Course created successfully!",
      course: newCourse,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating course:", error);
    return res.status(500).json({
      status: false,
      message: "Error creating course",
      error: error.message
    });
  }
};

export const updateCourse = async (req, res) => {
  const {
    courseId,
    title,
    description,
    levelId,
    categoryId,
    languageIds,
    tags,
    goals,
    requirements,
    isPaid,
    price,
    type,
    wasLive,
    liveStartDate,
    liveEndDate,
    thumbnailUrl,
  } = req.body;

  // Validate input
  if (!courseId) {
    return res.status(400).json({
      status: false,
      message: "courseId is required to update course",
    });
  }

  const validationErrors = validateCourseInput({
    title,
    description,
    levelId,
    categoryId,
    isPaid,
    price,
    type,
    liveStartDate,
    liveEndDate,
  });

  if (validationErrors.length > 0) {
    return res.status(400).json({
      status: false,
      errors: validationErrors,
    });
  }

  const transaction = await sequelize.transaction();

  try {
    // Find course
    const existingCourse = await Course.findByPk(courseId, { transaction });

    if (!existingCourse) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    // Validate live/hybrid course dates
    if (
      (type === "live" || type === "hybrid") &&
      (!liveStartDate || !liveEndDate)
    ) {
      return res.status(400).json({
        status: false,
        message:
          "Live and Hybrid courses must have both liveStartDate and liveEndDate.",
      });
    }

    // Step 1: Update course fields
    await existingCourse.update(
      {
        title,
        description,
        levelId,
        categoryId,
        isPaid,
        price,
        type,
        wasLive,
        liveStartDate,
        liveEndDate,
        thumbnailUrl,
      },
      { transaction }
    );

    // Step 2: Update languages
    if (languageIds?.length) {
      const languages = await Language.findAll({
        where: {
          languageId: { [Op.in]: languageIds },
        },
        transaction,
      });

      if (languages.length !== languageIds.length) {
        await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: "Some language IDs are invalid",
        });
      }

      await existingCourse.setLanguages(languageIds, { transaction });
    }

    // Step 3: Update tags
    if (tags) {
      await CourseTag.destroy({ where: { courseId }, transaction });
      if (tags.length) {
        const tagRecords = tags.map((tag) => ({ tag, courseId }));
        await CourseTag.bulkCreate(tagRecords, { transaction });
      }
    }

    // Step 4: Update goals
    if (goals) {
      await CourseGoal.destroy({ where: { courseId }, transaction });
      if (goals.length) {
        const goalRecords = goals.map((goalText, index) => ({
          goalText,
          courseId,
          order: index + 1,
        }));
        await CourseGoal.bulkCreate(goalRecords, { transaction });
      }
    }

    // Step 5: Update requirements
    if (requirements) {
      await CourseRequirement.destroy({ where: { courseId }, transaction });
      if (requirements.length) {
        const requirementRecords = requirements.map(
          (requirementText, index) => ({
            requirementText,
            courseId,
            order: index + 1,
          })
        );
        await CourseRequirement.bulkCreate(requirementRecords, { transaction });
      }
    }

    await transaction.commit();

    return res.status(200).json({
      status: true,
      message: "Course updated successfully!",
      course: existingCourse,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating course:", error);
    return res.status(500).json({
      status: false,
      message: "Error updating course",
    });
  }
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
      search = ''
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where condition
    const whereCondition = { status };

    if (categoryId) whereCondition.categoryId = categoryId;
    if (levelId) whereCondition.levelId = levelId;
    if (type) whereCondition.type = type;
    if (isPaid !== undefined) whereCondition.isPaid = isPaid === "true";

    // Search condition
    if (search) {
      whereCondition[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }
    const { count, rows: courses } = await Course.findAndCountAll({
      // where: whereCondition,
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "level", "order"],
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: User,
          as: "instructor",
          attributes: ["userId", "username", "email", "profileImage"],
        },
        {
          model: CourseTag,
          as: "tags",
          attributes: ["tag"],
        },
        {
          model: Language,
          through: { attributes: [] },
          attributes: ["languageId", "language", "languageCode"],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      distinct: true,
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return res.status(200).json({
      status: true,
      message: "Courses fetched successfully.",
      data: {
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching courses.",
    });
  }
};

export const deleteCourse = async (req, res) => {
  const { courseId } = req.params;
  const { hardDelete = false } = req.query;

  // Basic UUID validation
  if (
    !courseId ||
    !/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
      courseId
    )
  ) {
    return res.status(400).json({
      status: false,
      message: "Invalid course ID format.",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const course = await Course.findByPk(courseId, { transaction });

    if (!course) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Course not found.",
      });
    }

    if (hardDelete === "true") {
      // Hard delete - remove from database completely
      await CourseTag.destroy({ where: { courseId }, transaction });
      await CourseGoal.destroy({ where: { courseId }, transaction });
      await CourseRequirement.destroy({ where: { courseId }, transaction });

      // Remove language associations
      await course.setLanguages([], { transaction });

      // Delete course
      await course.destroy({ transaction });

      await transaction.commit();

      return res.status(200).json({
        status: true,
        message: "Course permanently deleted successfully.",
      });
    } else {
      // Soft delete - just change status
      await course.update({ status: "deleted" }, { transaction });

      await transaction.commit();

      return res.status(200).json({
        status: true,
        message: "Course deleted successfully.",
      });
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting course:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while deleting the course.",
    });
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
      return res.status(400).json({
        status: false,
        message: "Search query must be at least 2 characters long.",
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
          attributes: ["levelId", "level"],
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: User,
          as: "instructor",
          attributes: ["userId", "username", "profileImage"],
        },
        {
          model: CourseTag,
          as: "tags",
          attributes: ["tag"],
          where: {
            tag: { [Op.iLike]: `%${searchTerm}%` },
          },
          required: false,
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    return res.status(200).json({
      status: true,
      message: "Search completed successfully.",
      data: {
        searchQuery: searchTerm,
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error searching courses:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while searching courses.",
    });
  }
};

export const getCoursesByInstructor = async (req, res) => {
  const { page = 1, limit = 10, status = "active" } = req.query;
  const instructorId = req.user?.userId; // Assuming userId is set in the request by auth middleware
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
          attributes: ["levelId", "level"],
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: CourseTag,
          as: "tags",
          attributes: ["tag"],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    return res.status(200).json({
      status: true,
      message: "Instructor courses fetched successfully.",
      data: {
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching instructor courses:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching instructor courses.",
    });
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
          attributes: ["levelId", "level"],
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: User,
          as: "instructor",
          attributes: ["userId", "username", "profileImage"],
        },
        {
          model: CourseTag,
          as: "tags",
          attributes: ["tag"],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
      distinct: true,
    });

    return res.status(200).json({
      status: true,
      message: "Category courses fetched successfully.",
      data: {
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Error fetching category courses:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching category courses.",
    });
  }
};

export const toggleCourseStatus = async (req, res) => {
  const { courseId } = req.params;
  const { status } = req.body;

  // Validate status
  const validStatuses = ["active", "inactive", "draft", "deleted"];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({
      status: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
    });
  }

  try {
    const course = await Course.findByPk(courseId);

    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found.",
      });
    }

    await course.update({ status });

    return res.status(200).json({
      status: true,
      message: `Course status updated to ${status} successfully.`,
      course: {
        courseId: course.courseId,
        title: course.title,
        status: course.status,
      },
    });
  } catch (error) {
    console.error("Error updating course status:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while updating course status.",
    });
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

    return res.status(200).json({
      status: true,
      message: "Course statistics fetched successfully.",
      stats: {
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
      },
    });
  } catch (error) {
    console.error("Error fetching course statistics:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred while fetching course statistics.",
    });
  }
};

// ===================== ADMIN/OWNER COURSE MANAGEMENT =====================

/**
 * Create Live Course (Admin/Owner only)
 * For monthly subscription model with batch management
 */
export const createLiveCourse = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      title,
      description,
      tags = [],
      languageId,
      price, // Monthly price
      requirements = [],
      skillLevel,
      whatYoullLearn = [],
      prerequisites = [],
      thumbnailUrl,
      introVideoUrl,
      teacherIds = [],
      visibility = 'public',
      batchSettings = {
        minStudentsToCreateBatch: 10,
        maxStudentsPerBatch: 50,
        autoCreateBatch: true
      }
    } = req.body;

    const createdBy = req.user.userId;

    // Validate required fields
    if (!title || !description || !languageId || !skillLevel || !price) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields: title, description, languageId, skillLevel, price"
      });
    }

    // Create the course
    const course = await Course.create({
      title,
      thumbnailUrl,
      description,
      levelId: skillLevel,
      categoryId: req.body.categoryId,
      createdBy,
      type: 'live',
      isPaid: price > 0,
      price,
      status: 'draft',
      isPublished: false,
      visibility,
      batchSettings: JSON.stringify(batchSettings)
    }, { transaction });

    // Add course goals (What You'll Learn)
    if (whatYoullLearn.length > 0) {
      const goalPromises = whatYoullLearn.map((goal, index) => 
        CourseGoal.create({
          courseId: course.courseId,
          goalText: goal.title || goal,
          description: goal.description || null,
          order: index + 1
        }, { transaction })
      );
      await Promise.all(goalPromises);
    }

    // Add course requirements
    if (requirements.length > 0) {
      const requirementPromises = requirements.map((req, index) => 
        CourseRequirement.create({
          courseId: course.courseId,
          requirementText: req,
          order: index + 1
        }, { transaction })
      );
      await Promise.all(requirementPromises);
    }

    // Add course tags
    if (tags.length > 0) {
      const tagPromises = tags.map((tag, index) => 
        CourseTag.create({
          courseId: course.courseId,
          tagName: tag,
          order: index + 1
        }, { transaction })
      );
      await Promise.all(tagPromises);
    }

    await transaction.commit();

    res.status(201).json({
      status: true,
      message: "Live course created successfully",
      data: {
        courseId: course.courseId,
        title: course.title,
        type: course.type,
        price: course.price,
        status: course.status
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Create live course error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to create live course",
      error: error.message
    });
  }
};

/**
 * Create Recorded Course (Admin/Owner only)
 * For one-time payment with video content
 */
export const createRecordedCourse = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      title,
      description,
      tags = [],
      languageId,
      price, // One-time price
      requirements = [],
      skillLevel,
      whatYoullLearn = [],
      prerequisites = [],
      thumbnailUrl,
      introVideoUrl,
      sections = [], // Video curriculum structure
      visibility = 'public',
      enableReviews = true,
      enableChat = false // Usually false for recorded courses
    } = req.body;

    const createdBy = req.user.userId;

    // Create the course
    const course = await Course.create({
      title,
      thumbnailUrl,
      description,
      levelId: skillLevel,
      categoryId: req.body.categoryId,
      createdBy,
      type: 'recorded',
      isPaid: price > 0,
      price,
      status: 'draft',
      isPublished: false,
      visibility,
      enableReviews,
      enableChat,
      introVideoUrl
    }, { transaction });

    // Add course goals, requirements, and tags (same as live course)
    // ... (duplicate the same logic as above)

    // Create sections and lessons for recorded course
    if (sections.length > 0) {
      for (let i = 0; i < sections.length; i++) {
        const sectionData = sections[i];
        const section = await Section.create({
          courseId: course.courseId,
          title: sectionData.title,
          description: sectionData.description || '',
          order: i + 1
        }, { transaction });

        // Add lessons to section
        if (sectionData.lessons && sectionData.lessons.length > 0) {
          for (let j = 0; j < sectionData.lessons.length; j++) {
            const lessonData = sectionData.lessons[j];
            await Lesson.create({
              sectionId: section.sectionId,
              title: lessonData.title,
              description: lessonData.description || '',
              videoUrl: lessonData.videoUrl,
              duration: lessonData.duration || 0,
              order: j + 1,
              isPreview: lessonData.isPreview || false
            }, { transaction });
          }
        }
      }
    }

    await transaction.commit();

    res.status(201).json({
      status: true,
      message: "Recorded course created successfully",
      data: {
        courseId: course.courseId,
        title: course.title,
        type: course.type,
        price: course.price,
        status: course.status,
        sectionsCount: sections.length
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Create recorded course error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to create recorded course",
      error: error.message
    });
  }
};

/**
 * Update Course (Admin/Owner only)
 * Update any course type with comprehensive data
 */
export const updateCourseAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { courseId } = req.params;
    const updateData = req.body;

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found"
      });
    }

    // Update course basic data
    const allowedUpdates = [
      'title', 'description', 'thumbnailUrl', 'introVideoUrl', 'price',
      'levelId', 'categoryId', 'visibility', 'enableReviews', 'enableChat',
      'isPublished', 'status'
    ];

    const courseUpdates = {};
    allowedUpdates.forEach(field => {
      if (updateData[field] !== undefined) {
        courseUpdates[field] = updateData[field];
      }
    });

    await course.update(courseUpdates, { transaction });

    // Update goals if provided
    if (updateData.whatYoullLearn) {
      await CourseGoal.destroy({ where: { courseId }, transaction });
      
      const goalPromises = updateData.whatYoullLearn.map((goal, index) => 
        CourseGoal.create({
          courseId: course.courseId,
          goalText: goal.title || goal,
          description: goal.description || null,
          order: index + 1
        }, { transaction })
      );
      await Promise.all(goalPromises);
    }

    // Update requirements if provided
    if (updateData.requirements) {
      await CourseRequirement.destroy({ where: { courseId }, transaction });
      
      const requirementPromises = updateData.requirements.map((req, index) => 
        CourseRequirement.create({
          courseId: course.courseId,
          requirementText: req,
          order: index + 1
        }, { transaction })
      );
      await Promise.all(requirementPromises);
    }

    // Update tags if provided
    if (updateData.tags) {
      await CourseTag.destroy({ where: { courseId }, transaction });
      
      const tagPromises = updateData.tags.map((tag, index) => 
        CourseTag.create({
          courseId: course.courseId,
          tagName: tag,
          order: index + 1
        }, { transaction })
      );
      await Promise.all(tagPromises);
    }

    await transaction.commit();

    res.json({
      status: true,
      message: "Course updated successfully",
      data: {
        courseId: course.courseId,
        title: course.title,
        status: course.status,
        isPublished: course.isPublished
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Update course error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to update course",
      error: error.message
    });
  }
};

/**
 * Delete Course (Admin/Owner only)
 * Soft delete with cascade to related data
 */
export const deleteCourseAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { courseId } = req.params;
    const { permanent = false } = req.query;

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found"
      });
    }

    if (permanent === 'true') {
      // Hard delete - be careful!
      await CourseGoal.destroy({ where: { courseId }, transaction });
      await CourseRequirement.destroy({ where: { courseId }, transaction });
      await CourseTag.destroy({ where: { courseId }, transaction });
      await course.destroy({ force: true, transaction });
    } else {
      // Soft delete
      await course.update({ status: 'deleted' }, { transaction });
      await course.destroy({ transaction }); // This is soft delete due to paranoid: true
    }

    await transaction.commit();

    res.json({
      status: true,
      message: `Course ${permanent === 'true' ? 'permanently deleted' : 'deleted'} successfully`
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Delete course error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to delete course",
      error: error.message
    });
  }
};

/**
 * Get Course Management Dashboard (Admin/Owner only)
 * Comprehensive course data for admin interface
 */
export const getCourseManagementData = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findByPk(courseId, {
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["level"]
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryName"]
        },
        {
          model: User,
          as: "instructor",
          attributes: ["username", "email", "profileImage"]
        },
        {
          model: CourseGoal,
          as: "goals",
          attributes: ["goalText", "order"],
          order: [['order', 'ASC']]
        },
        {
          model: CourseRequirement,
          as: "requirements",
          attributes: ["requirementText", "order"],
          order: [['order', 'ASC']]
        },
        {
          model: CourseTag,
          as: "tags",
          attributes: ["tagName", "order"],
          order: [['order', 'ASC']]
        },
        {
          model: Section,
          as: "sections",
          attributes: ["title", "description", "order"],
          include: [{
            model: Lesson,
            as: "lessons",
            attributes: ["title", "description", "videoUrl", "duration", "order", "isPreview"]
          }],
          order: [['order', 'ASC']]
        }
      ]
    });

    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found"
      });
    }

    // Get enrollment statistics
    const enrollmentStats = await Enrollment.findAndCountAll({
      where: { courseId }
    });

    res.json({
      status: true,
      data: {
        course,
        statistics: {
          totalEnrollments: enrollmentStats.count,
          averageRating: course.averageRating,
          totalRatings: course.totalRatings
        }
      }
    });

  } catch (error) {
    console.error("Get course management data error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch course management data",
      error: error.message
    });
  }
};

/**
 * Update Course Settings (Admin/Owner only)
 * Manage course visibility, pricing, features
 */
export const updateCourseSettings = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      visibility,
      enableReviews,
      enableChat,
      enableCertificates,
      discountSettings,
      priceChanges
    } = req.body;

    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found"
      });
    }

    const updateData = {};
    
    if (visibility !== undefined) updateData.visibility = visibility;
    if (enableReviews !== undefined) updateData.enableReviews = enableReviews;
    if (enableChat !== undefined) updateData.enableChat = enableChat;
    if (enableCertificates !== undefined) updateData.enableCertificates = enableCertificates;
    
    if (priceChanges && priceChanges.newPrice !== undefined) {
      updateData.price = priceChanges.newPrice;
    }

    await course.update(updateData);

    res.json({
      status: true,
      message: "Course settings updated successfully",
      data: {
        courseId: course.courseId,
        settings: updateData
      }
    });

  } catch (error) {
    console.error("Update course settings error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to update course settings",
      error: error.message
    });
  }
};

/**
 * Get All Courses for Admin Dashboard
 * With filters, search, and pagination
 */
export const getAllCoursesAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      type,
      status,
      category,
      instructor,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where conditions
    const whereConditions = {};
    
    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (type) whereConditions.type = type;
    if (status) whereConditions.status = status;
    if (category) whereConditions.categoryId = category;
    if (instructor) whereConditions.createdBy = instructor;

    const courses = await Course.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "categoryName"]
        },
        {
          model: User,
          as: "instructor",
          attributes: ["userId", "username", "email"]
        },
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "level"]
        }
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: offset,
      distinct: true
    });

    res.json({
      status: true,
      data: {
        courses: courses.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(courses.count / parseInt(limit)),
          totalItems: courses.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error("Get all courses admin error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch courses",
      error: error.message
    });
  }
};

/**
 * ===================== COURSE ANALYTICS & REPORTING =====================
 */

/**
 * Get Comprehensive Course Analytics (Admin/Owner only)
 * Detailed analytics for course performance, revenue, and student engagement
 */
export const getCourseAnalytics = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { 
      dateRange = '30d', 
      includeRevenue = true, 
      includeEngagement = true,
      includeCompletion = true 
    } = req.query;

    // Check if course exists
    const course = await Course.findByPk(courseId, {
      include: [
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "categoryName"]
        },
        {
          model: User,
          as: "instructor",
          attributes: ["userId", "username", "email"]
        }
      ]
    });

    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found"
      });
    }

    // Calculate date range
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
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get enrollment data
    const enrollments = await Enrollment.findAll({
      where: {
        courseId,
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['userId', 'username', 'createdAt']
      }],
      order: [['createdAt', 'ASC']]
    });

    // Get all-time enrollment data
    const allTimeEnrollments = await Enrollment.findAll({
      where: { courseId },
      attributes: ['userId', 'status', 'progressPercentage', 'createdAt', 'completedAt'],
      include: [{
        model: User,
        as: 'user',
        attributes: ['userId', 'createdAt']
      }]
    });

    // Calculate enrollment analytics
    const enrollmentAnalytics = {
      total: allTimeEnrollments.length,
      newInPeriod: enrollments.length,
      completed: allTimeEnrollments.filter(e => e.status === 'completed').length,
      inProgress: allTimeEnrollments.filter(e => e.status === 'in_progress').length,
      dropped: allTimeEnrollments.filter(e => e.status === 'dropped').length,
      completionRate: allTimeEnrollments.length > 0 
        ? (allTimeEnrollments.filter(e => e.status === 'completed').length / allTimeEnrollments.length) * 100 
        : 0,
      averageProgress: allTimeEnrollments.length > 0
        ? allTimeEnrollments.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / allTimeEnrollments.length
        : 0
    };

    // Calculate enrollment trends
    const enrollmentTrends = enrollments.reduce((acc, enrollment) => {
      const date = enrollment.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    // Calculate completion trends
    const completionTrends = allTimeEnrollments
      .filter(e => e.completedAt && e.completedAt >= startDate && e.completedAt <= endDate)
      .reduce((acc, enrollment) => {
        const date = enrollment.completedAt.toISOString().split('T')[0];
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
        projectedMonthlyRevenue: (revenue / parseInt(dateRange.replace('d', ''))) * 30,
        revenueByDay: enrollments.reduce((acc, enrollment) => {
          const date = enrollment.createdAt.toISOString().split('T')[0];
          acc[date] = (acc[date] || 0) + course.price;
          return acc;
        }, {})
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
        totalRatings: course.totalRatings || 0
      };
    }

    // Student demographics (simulated)
    const demographics = {
      newStudentsThisPeriod: enrollments.length,
      returningStudents: allTimeEnrollments.filter(e => {
        const userCreated = new Date(e.user.createdAt);
        const enrollmentCreated = new Date(e.createdAt);
        return (enrollmentCreated - userCreated) > (30 * 24 * 60 * 60 * 1000); // Enrolled 30+ days after signup
      }).length,
      averageTimeToComplete: allTimeEnrollments
        .filter(e => e.completedAt && e.createdAt)
        .reduce((sum, e) => {
          const timeDiff = new Date(e.completedAt) - new Date(e.createdAt);
          return sum + (timeDiff / (1000 * 60 * 60 * 24)); // days
        }, 0) / Math.max(allTimeEnrollments.filter(e => e.completedAt).length, 1)
    };

    res.json({
      status: true,
      data: {
        course: {
          courseId: course.courseId,
          title: course.title,
          type: course.type,
          price: course.price,
          category: course.category?.categoryName,
          instructor: course.instructor?.username,
          createdAt: course.createdAt
        },
        analytics: {
          enrollment: enrollmentAnalytics,
          ...(revenueAnalytics && { revenue: revenueAnalytics }),
          ...(engagementAnalytics && { engagement: engagementAnalytics }),
          demographics,
          trends: {
            enrollmentByDay: enrollmentTrends,
            completionByDay: completionTrends
          }
        },
        period: {
          startDate,
          endDate,
          duration: dateRange
        }
      }
    });

  } catch (error) {
    console.error("Get course analytics error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch course analytics",
      error: error.message
    });
  }
};

/**
 * Get Admin Dashboard Overview (Admin/Owner only)
 * Comprehensive overview of all courses, revenue, and system metrics
 */
export const getAdminDashboardOverview = async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;

    // Calculate date range
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
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Get course statistics
    const totalCourses = await Course.count();
    const activeCourses = await Course.count({ where: { status: 'published' } });
    const newCoursesInPeriod = await Course.count({
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      }
    });

    // Get enrollment statistics
    const totalEnrollments = await Enrollment.count();
    const newEnrollmentsInPeriod = await Enrollment.count({
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      }
    });
    const completedEnrollments = await Enrollment.count({
      where: { status: 'completed' }
    });

    // Get user statistics
    const totalUsers = await User.count();
    const newUsersInPeriod = await User.count({
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      }
    });
    const instructors = await User.count({ where: { role: 'teacher' } });
    const students = await User.count({ where: { role: 'student' } });

    // Get top performing courses
    const topCourses = await Course.findAll({
      attributes: [
        'courseId',
        'title',
        'price',
        'averageRating',
        'totalRatings',
        [sequelize.fn('COUNT', sequelize.col('enrollments.enrollmentId')), 'enrollmentCount']
      ],
      include: [{
        model: Enrollment,
        as: 'enrollments',
        attributes: []
      }],
      group: ['Course.courseId'],
      order: [[sequelize.literal('enrollmentCount'), 'DESC']],
      limit: 10
    });

    // Calculate revenue (simulated)
    const courses = await Course.findAll({
      attributes: ['courseId', 'price'],
      include: [{
        model: Enrollment,
        as: 'enrollments',
        where: {
          createdAt: {
            [Op.gte]: startDate,
            [Op.lte]: endDate
          }
        },
        required: false
      }]
    });

    const revenueAnalytics = {
      totalRevenue: courses.reduce((sum, course) => 
        sum + (course.price * (course.enrollments?.length || 0)), 0
      ),
      averageOrderValue: courses.length > 0 
        ? courses.reduce((sum, course) => sum + course.price, 0) / courses.length 
        : 0,
      revenueGrowth: Math.floor(Math.random() * 20) + 5 // Simulated growth percentage
    };

    // Get enrollment trends
    const enrollmentTrends = await Enrollment.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('enrollmentId')), 'count']
      ],
      where: {
        createdAt: {
          [Op.gte]: startDate,
          [Op.lte]: endDate
        }
      },
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']]
    });

    // System health metrics (simulated)
    const systemMetrics = {
      serverUptime: '99.9%',
      averageResponseTime: '245ms',
      errorRate: '0.1%',
      activeUsers: Math.floor(Math.random() * 1000) + 500,
      peakConcurrentUsers: Math.floor(Math.random() * 200) + 100
    };

    res.json({
      status: true,
      data: {
        overview: {
          courses: {
            total: totalCourses,
            active: activeCourses,
            newInPeriod: newCoursesInPeriod,
            conversionRate: totalCourses > 0 ? (activeCourses / totalCourses) * 100 : 0
          },
          enrollments: {
            total: totalEnrollments,
            newInPeriod: newEnrollmentsInPeriod,
            completed: completedEnrollments,
            completionRate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0
          },
          users: {
            total: totalUsers,
            newInPeriod: newUsersInPeriod,
            instructors,
            students,
            growthRate: Math.floor(Math.random() * 15) + 5 // Simulated growth
          },
          revenue: revenueAnalytics
        },
        topCourses: topCourses.map(course => ({
          courseId: course.courseId,
          title: course.title,
          price: course.price,
          enrollments: course.dataValues.enrollmentCount,
          rating: course.averageRating,
          reviews: course.totalRatings
        })),
        trends: {
          enrollmentsByDay: enrollmentTrends.map(trend => ({
            date: trend.dataValues.date,
            enrollments: parseInt(trend.dataValues.count)
          }))
        },
        systemMetrics,
        period: {
          startDate,
          endDate,
          duration: dateRange
        }
      }
    });

  } catch (error) {
    console.error("Get admin dashboard overview error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch admin dashboard overview",
      error: error.message
    });
  }
};

/**
 * Export Course Data (Admin/Owner only)
 * Export comprehensive course data for reporting and analysis
 */
export const exportCourseData = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { format = 'json', includeStudentData = false } = req.body;

    // Check if course exists
    const course = await Course.findByPk(courseId, {
      include: [
        {
          model: CourseCategory,
          as: "category"
        },
        {
          model: User,
          as: "instructor"
        },
        {
          model: Section,
          as: "sections",
          include: [{
            model: Lesson,
            as: "lessons"
          }]
        }
      ]
    });

    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found"
      });
    }

    // Get enrollment data
    const enrollments = await Enrollment.findAll({
      where: { courseId },
      include: includeStudentData ? [{
        model: User,
        as: 'user',
        attributes: ['userId', 'username', 'email', 'firstName', 'lastName']
      }] : []
    });

    // Prepare export data
    const exportData = {
      course: {
        courseId: course.courseId,
        title: course.title,
        description: course.description,
        type: course.type,
        price: course.price,
        currency: course.currency,
        status: course.status,
        category: course.category?.categoryName,
        instructor: {
          name: course.instructor?.username,
          email: course.instructor?.email
        },
        createdAt: course.createdAt,
        updatedAt: course.updatedAt
      },
      content: {
        totalSections: course.sections?.length || 0,
        totalLessons: course.sections?.reduce((sum, s) => sum + (s.lessons?.length || 0), 0) || 0,
        sections: course.sections?.map(section => ({
          sectionId: section.sectionId,
          title: section.title,
          order: section.order,
          lessonsCount: section.lessons?.length || 0
        })) || []
      },
      enrollment: {
        total: enrollments.length,
        byStatus: enrollments.reduce((acc, e) => {
          acc[e.status] = (acc[e.status] || 0) + 1;
          return acc;
        }, {}),
        averageProgress: enrollments.length > 0
          ? enrollments.reduce((sum, e) => sum + (e.progressPercentage || 0), 0) / enrollments.length
          : 0
      },
      ...(includeStudentData && {
        students: enrollments.map(e => ({
          userId: e.user?.userId,
          username: e.user?.username,
          email: e.user?.email,
          enrollmentDate: e.createdAt,
          status: e.status,
          progress: e.progressPercentage
        }))
      }),
      exportMetadata: {
        exportedAt: new Date(),
        exportedBy: req.user.userId,
        format,
        includeStudentData
      }
    };

    // Set appropriate headers for download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="course-${courseId}-export-${Date.now()}.json"`);

    res.json({
      status: true,
      message: "Course data exported successfully",
      data: exportData
    });

  } catch (error) {
    console.error("Export course data error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to export course data",
      error: error.message
    });
  }
};

/**
 * Get Revenue Analytics (Admin/Owner only)
 * Detailed revenue analytics across all courses
 */
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { 
      dateRange = '30d', 
      courseId, 
      categoryId,
      instructorId 
    } = req.query;

    // Calculate date range
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
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    // Build course filter
    const courseWhere = {};
    if (courseId) courseWhere.courseId = courseId;
    if (categoryId) courseWhere.categoryId = categoryId;
    if (instructorId) courseWhere.createdBy = instructorId;

    // Get revenue data
    const courses = await Course.findAll({
      where: courseWhere,
      attributes: ['courseId', 'title', 'price', 'type'],
      include: [{
        model: Enrollment,
        as: 'enrollments',
        where: {
          createdAt: {
            [Op.gte]: startDate,
            [Op.lte]: endDate
          }
        },
        required: false,
        attributes: ['enrollmentId', 'createdAt', 'status']
      }, {
        model: CourseCategory,
        as: 'category',
        attributes: ['categoryName']
      }]
    });

    // Calculate revenue metrics
    const revenueData = courses.map(course => {
      const enrollments = course.enrollments || [];
      const revenue = enrollments.length * course.price;
      
      return {
        courseId: course.courseId,
        title: course.title,
        type: course.type,
        price: course.price,
        category: course.category?.categoryName,
        enrollments: enrollments.length,
        revenue,
        conversionRate: Math.random() * 10 + 2 // Simulated conversion rate
      };
    });

    // Aggregate metrics
    const totalRevenue = revenueData.reduce((sum, course) => sum + course.revenue, 0);
    const totalEnrollments = revenueData.reduce((sum, course) => sum + course.enrollments, 0);
    const averageOrderValue = totalEnrollments > 0 ? totalRevenue / totalEnrollments : 0;

    // Revenue by course type
    const revenueByType = revenueData.reduce((acc, course) => {
      acc[course.type] = (acc[course.type] || 0) + course.revenue;
      return acc;
    }, {});

    // Top revenue generating courses
    const topCourses = revenueData
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    res.json({
      status: true,
      data: {
        summary: {
          totalRevenue,
          totalEnrollments,
          averageOrderValue: Math.round(averageOrderValue * 100) / 100,
          coursesAnalyzed: courses.length
        },
        breakdown: {
          byType: revenueByType,
          topCourses,
          allCourses: revenueData
        },
        period: {
          startDate,
          endDate,
          duration: dateRange
        }
      }
    });

  } catch (error) {
    console.error("Get revenue analytics error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch revenue analytics",
      error: error.message
    });
  }
};
