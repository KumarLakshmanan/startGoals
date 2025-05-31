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
    createdBy,
    isPaid,
    price,
    type,
    wasLive,
    liveStartDate,
    liveEndDate,
    thumbnailUrl,
  } = req.body;

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
  const { instructorId } = req.params;
  const { page = 1, limit = 10, status = "active" } = req.query;

  try {
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: courses } = await Course.findAndCountAll({
      where: {
        createdBy: instructorId,
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
