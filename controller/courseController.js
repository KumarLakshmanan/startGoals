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
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendServerError, sendConflict } from "../utils/responseHelper.js";

export const getCourseById = async (req, res) => {
  const { courseId } = req.params;

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
      return sendNotFound(res, "Course not found");
    }

    return sendSuccess(res, 200, "Course fetched successfully", course);
  } catch (error) {
    console.error("Error fetching course:", error);
    return sendServerError(res, error);
  }
};

export const createCourse = async (req, res) => {
  console.log(
    "createCourse called with body:",
    JSON.stringify(req.body, null, 2),
  );

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
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[4][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

  if (levelId && !uuidRegex.test(levelId)) {
    return sendValidationError(res, "Invalid levelId format", {
      levelId: "Must be a valid UUID"
    });
  }

  if (categoryId && !uuidRegex.test(categoryId)) {
    return sendValidationError(res, "Invalid categoryId format", {
      categoryId: "Must be a valid UUID"
    });
  }

  if (createdBy && !uuidRegex.test(createdBy)) {
    return sendValidationError(res, "Invalid createdBy format", {
      createdBy: "Must be a valid UUID"
    });
  }

  // Validate course input
  const validationErrors = validateCourseInput(req.body);
  if (validationErrors.length > 0) {
    return sendValidationError(res, "Course validation failed", validationErrors);
  }
  const transaction = await sequelize.transaction();

  try {
    if (
      (type === "live" || type === "hybrid") &&
      (!liveStartDate || !liveEndDate)
    ) {
      await transaction.rollback();
      return sendValidationError(res, "Missing required date fields for live/hybrid course", {
        liveStartDate: !liveStartDate ? "Required for live/hybrid courses" : undefined,
        liveEndDate: !liveEndDate ? "Required for live/hybrid courses" : undefined
      });
    } // Step 1: Validate foreign key references exist
    const [levelExists, categoryExists, userExists] = await Promise.all([
      CourseLevel.findByPk(levelId, { transaction }),
      CourseCategory.findByPk(categoryId, { transaction }),
      User.findByPk(createdBy, { transaction }),
    ]);

    if (!levelExists) {
      await transaction.rollback();
      return sendNotFound(res, "Course level does not exist", {
        levelId: "Invalid level ID"
      });
    }

    if (!categoryExists) {
      await transaction.rollback();
      return sendNotFound(res, "Course category does not exist", {
        categoryId: "Invalid category ID"
      });
    }

    if (!userExists) {
      await transaction.rollback();
      return sendNotFound(res, "User does not exist", {
        createdBy: "Invalid user ID"
      });
    }

    // Step 2: Create course
    console.log("Creating course with data:", {
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
      { transaction },
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
      return sendValidationError(res, "Some language IDs are invalid", {
        languageIds: "One or more language IDs do not exist"
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
    } // Step 8: Commit
    await transaction.commit();

    return sendSuccess(res, 201, "Course created successfully!", newCourse);
  } catch (error) {
    await transaction.rollback();
    console.error("Error creating course:", error);
    return sendServerError(res, error);
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
    return sendValidationError(res, "Course ID is required", {
      courseId: "Required to update course"
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
    return sendValidationError(res, "Course validation failed", validationErrors);
  }

  const transaction = await sequelize.transaction();

  try {
    // Find course
    const existingCourse = await Course.findByPk(courseId, { transaction });

    if (!existingCourse) {
      await transaction.rollback();
      return sendNotFound(res, "Course not found");
    }

    // Validate live/hybrid course dates
    if (
      (type === "live" || type === "hybrid") &&
      (!liveStartDate || !liveEndDate)
    ) {
      return sendValidationError(res, "Missing required date fields for live/hybrid course", {
        liveStartDate: !liveStartDate ? "Required for live/hybrid courses" : undefined,
        liveEndDate: !liveEndDate ? "Required for live/hybrid courses" : undefined
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
      { transaction },
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
        return sendValidationError(res, "Some language IDs are invalid", {
          languageIds: "One or more language IDs do not exist"
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
          }),
        );
        await CourseRequirement.bulkCreate(requirementRecords, { transaction });
      }
    }

    await transaction.commit();

    return sendSuccess(res, 200, "Course updated successfully!", existingCourse);
  } catch (error) {
    await transaction.rollback();
    console.error("Error updating course:", error);
    return sendServerError(res, error);
  }
};

export const getAllCourses = async (req, res) => {
  try {
    // ... (existing logic)
    return sendSuccess(res, 200, "Courses fetched successfully", {
      courses,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching courses:", error);
    return sendServerError(res, error);
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
      // Hard delete - remove from database completely
      await CourseTag.destroy({ where: { courseId }, transaction });
      await CourseGoal.destroy({ where: { courseId }, transaction });
      await CourseRequirement.destroy({ where: { courseId }, transaction });

      // Remove language associations
      await course.setLanguages([], { transaction });

      // Delete course
      await course.destroy({ transaction });

      await transaction.commit();

      return sendSuccess(res, 200, "Course permanently deleted successfully.");
    } else {
      // Soft delete - just change status
      await course.update({ status: "deleted" }, { transaction });

      await transaction.commit();

      return sendSuccess(res, 200, "Course deleted successfully.");
    }
  } catch (error) {
    await transaction.rollback();
    console.error("Error deleting course:", error);
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

    return sendSuccess(res, 200, "Search completed successfully.", {
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
  const instructorId = req.user?.userId;
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

    return sendSuccess(res, 200, "Instructor courses fetched successfully.", {
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

    return sendSuccess(res, 200, "Category courses fetched successfully.", {
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

    return sendSuccess(res, 200, `Course status updated to ${status} successfully.`, {
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

    return sendSuccess(res, 200, "Course statistics fetched successfully.", {
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
      tags = [],
      languageId,
      price,
      requirements = [],
      skillLevel,
      whatYoullLearn = [],
      prerequisites = [],
      thumbnailUrl,
      introVideoUrl,
      teacherIds = [],
      visibility = "public",
      batchSettings = {
        minStudentsToCreateBatch: 10,
        maxStudentsPerBatch: 50,
        autoCreateBatch: true,
      },
    } = req.body;

    const createdBy = req.user.userId;

    if (!title || !description || !languageId || !skillLevel || !price) {
      return sendValidationError(res, "Missing required fields: title, description, languageId, skillLevel, price", {
        title: !title ? "Required" : undefined,
        description: !description ? "Required" : undefined,
        languageId: !languageId ? "Required" : undefined,
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
        isPublished: false,
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

    if (requirements.length > 0) {
      const requirementPromises = requirements.map((req, index) =>
        CourseRequirement.create(
          {
            courseId: course.courseId,
            requirementText: req,
            order: index + 1,
          },
          { transaction },
        ),
      );
      await Promise.all(requirementPromises);
    }

    if (tags.length > 0) {
      const tagPromises = tags.map((tag, index) =>
        CourseTag.create(
          {
            courseId: course.courseId,
            tagName: tag,
            order: index + 1,
          },
          { transaction },
        ),
      );
      await Promise.all(tagPromises);
    }

    await transaction.commit();

    return sendSuccess(res, 200, "Live course created successfully", {
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
      tags = [],
      languageId,
      price,
      requirements = [],
      skillLevel,
      whatYoullLearn = [],
      prerequisites = [],
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
        isPublished: false,
        visibility,
        enableReviews,
        enableChat,
        introVideoUrl,
      },
      { transaction },
    );

    // Add course goals, requirements, and tags (same as live course)
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

    if (requirements.length > 0) {
      const requirementPromises = requirements.map((req, index) =>
        CourseRequirement.create(
          {
            courseId: course.courseId,
            requirementText: req,
            order: index + 1,
          },
          { transaction },
        ),
      );
      await Promise.all(requirementPromises);
    }

    if (tags.length > 0) {
      const tagPromises = tags.map((tag, index) =>
        CourseTag.create(
          {
            courseId: course.courseId,
            tagName: tag,
            order: index + 1,
          },
          { transaction },
        ),
      );
      await Promise.all(tagPromises);
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

    return sendSuccess(res, 200, "Recorded course created successfully", {
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

export const updateCourseAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { courseId } = req.params;
    const updateData = req.body;

    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    const allowedUpdates = [
      "title",
      "description",
      "thumbnailUrl",
      "introVideoUrl",
      "price",
      "levelId",
      "categoryId",
      "visibility",
      "enableReviews",
      "enableChat",
      "isPublished",
      "status",
    ];

    const courseUpdates = {};
    allowedUpdates.forEach((field) => {
      if (updateData[field] !== undefined) {
        courseUpdates[field] = updateData[field];
      }
    });

    await course.update(courseUpdates, { transaction });

    if (updateData.whatYoullLearn) {
      await CourseGoal.destroy({ where: { courseId }, transaction });

      const goalPromises = updateData.whatYoullLearn.map((goal, index) =>
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

    if (updateData.requirements) {
      await CourseRequirement.destroy({ where: { courseId }, transaction });

      const requirementPromises = updateData.requirements.map((req, index) =>
        CourseRequirement.create(
          {
            courseId: course.courseId,
            requirementText: req,
            order: index + 1,
          },
          { transaction },
        ),
      );
      await Promise.all(requirementPromises);
    }

    if (updateData.tags) {
      await CourseTag.destroy({ where: { courseId }, transaction });

      const tagPromises = updateData.tags.map((tag, index) =>
        CourseTag.create(
          {
            courseId: course.courseId,
            tagName: tag,
            order: index + 1,
          },
          { transaction },
        ),
      );
      await Promise.all(tagPromises);
    }

    await transaction.commit();

    return sendSuccess(res, 200, "Course updated successfully", {
      courseId: course.courseId,
      title: course.title,
      status: course.status,
      isPublished: course.isPublished,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update course error:", error);
    return sendServerError(res, error);
  }
};

export const deleteCourseAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { courseId } = req.params;
    const { permanent = false } = req.query;

    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    if (permanent === "true") {
      await CourseGoal.destroy({ where: { courseId }, transaction });
      await CourseRequirement.destroy({ where: { courseId }, transaction });
      await CourseTag.destroy({ where: { courseId }, transaction });
      await course.destroy({ force: true, transaction });
    } else {
      await course.update({ status: "deleted" }, { transaction });
      await course.destroy({ transaction });
    }

    await transaction.commit();

    return sendSuccess(res, 200, `Course ${permanent === "true" ? "permanently deleted" : "deleted"} successfully`);
  } catch (error) {
    await transaction.rollback();
    console.error("Delete course error:", error);
    return sendServerError(res, error);
  }
};

export const getCourseManagementData = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findByPk(courseId, {
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["level"],
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryName"],
        },
        {
          model: User,
          as: "instructor",
          attributes: ["username", "email", "profileImage"],
        },
        {
          model: CourseGoal,
          as: "goals",
          attributes: ["goalText", "order"],
          order: [["order", "ASC"]],
        },
        {
          model: CourseRequirement,
          as: "requirements",
          attributes: ["requirementText", "order"],
          order: [["order", "ASC"]],
        },
        {
          model: CourseTag,
          as: "tags",
          attributes: ["tagName", "order"],
          order: [["order", "ASC"]],
        },
        {
          model: Section,
          as: "sections",
          attributes: ["title", "description", "order"],
          include: [
            {
              model: Lesson,
              as: "lessons",
              attributes: [
                "title",
                "description",
                "videoUrl",
                "duration",
                "order",
                "isPreview",
              ],
            },
          ],
          order: [["order", "ASC"]],
        },
      ],
    });

    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    const enrollmentStats = await Enrollment.findAndCountAll({
      where: { courseId },
    });

    return sendSuccess(res, 200, "Course management data fetched successfully", {
      course,
      statistics: {
        totalEnrollments: enrollmentStats.count,
        averageRating: course.averageRating,
        totalRatings: course.totalRatings,
      },
    });
  } catch (error) {
    console.error("Get course management data error:", error);
    return sendServerError(res, error);
  }
};

export const updateCourseSettings = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      visibility,
      enableReviews,
      enableChat,
      enableCertificates,
      discountSettings,
      priceChanges,
    } = req.body;

    const course = await Course.findByPk(courseId);
    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    const updateData = {};

    if (visibility !== undefined) updateData.visibility = visibility;
    if (enableReviews !== undefined) updateData.enableReviews = enableReviews;
    if (enableChat !== undefined) updateData.enableChat = enableChat;
    if (enableCertificates !== undefined)
      updateData.enableCertificates = enableCertificates;

    if (priceChanges && priceChanges.newPrice !== undefined) {
      updateData.price = priceChanges.newPrice;
    }

    await course.update(updateData);

    return sendSuccess(res, 200, "Course settings updated successfully", {
      courseId: course.courseId,
      settings: updateData,
    });
  } catch (error) {
    console.error("Update course settings error:", error);
    return sendServerError(res, error);
  }
};

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
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereConditions = {};

    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
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
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: User,
          as: "instructor",
          attributes: ["userId", "username", "email"],
        },
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "level"],
        },
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: offset,
      distinct: true,
    });

    return sendSuccess(res, 200, "Courses fetched successfully", {
      courses: courses.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(courses.count / parseInt(limit)),
        totalItems: courses.count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get all courses admin error:", error);
    return sendServerError(res, error);
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
      dateRange = "30d",
      includeRevenue = true,
      includeEngagement = true,
      includeCompletion = true,
    } = req.query;

    // Check if course exists
    const course = await Course.findByPk(courseId, {
      include: [
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: User,
          as: "instructor",
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

    return sendSuccess(res, 200, "Course analytics fetched successfully", {
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

    return sendSuccess(res, 200, "Admin dashboard overview fetched successfully", {
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
      },
    });
  } catch (error) {
    console.error("Get admin dashboard overview error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Export Course Data (Admin/Owner only)
 * Export comprehensive course data for reporting and analysis
 */
export const exportCourseData = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { format = "json", includeStudentData = false } = req.body;

    // Check if course exists
    const course = await Course.findByPk(courseId, {
      include: [
        {
          model: CourseCategory,
          as: "category",
        },
        {
          model: User,
          as: "instructor",
        },
        {
          model: Section,
          as: "sections",
          include: [
            {
              model: Lesson,
              as: "lessons",
            },
          ],
        },
      ],
    });

    if (!course) {
      return sendNotFound(res, "Course not found");
    }

    // Get enrollment data
    const enrollments = await Enrollment.findAll({
      where: { courseId },
      include: includeStudentData
        ? [
            {
              model: User,
              as: "user",
              attributes: [
                "userId",
                "username",
                "email",
                "firstName",
                "lastName",
              ],
            },
          ]
        : [],
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
          email: course.instructor?.email,
        },
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
      },
      content: {
        totalSections: course.sections?.length || 0,
        totalLessons:
          course.sections?.reduce(
            (sum, s) => sum + (s.lessons?.length || 0),
            0,
          ) || 0,
        sections:
          course.sections?.map((section) => ({
            sectionId: section.sectionId,
            title: section.title,
            order: section.order,
            lessonsCount: section.lessons?.length || 0,
          })) || [],
      },
      enrollment: {
        total: enrollments.length,
        byStatus: enrollments.reduce((acc, e) => {
          acc[e.status] = (acc[e.status] || 0) + 1;
          return acc;
        }, {}),
        averageProgress:
          enrollments.length > 0
            ? enrollments.reduce(
                (sum, e) => sum + (e.progressPercentage || 0),
                0,
              ) / enrollments.length
            : 0,
      },
      ...(includeStudentData && {
        students: enrollments.map((e) => ({
          userId: e.user?.userId,
          username: e.user?.username,
          email: e.user?.email,
          enrollmentDate: e.createdAt,
          status: e.status,
          progress: e.progressPercentage,
        })),
      }),
      exportMetadata: {
        exportedAt: new Date(),
        exportedBy: req.user.userId,
        format,
        includeStudentData,
      },
    };

    // Set appropriate headers for download
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="course-${courseId}-export-${Date.now()}.json"`,
    );

    return sendSuccess(res, 200, "Course data exported successfully", exportData);
  } catch (error) {
    console.error("Export course data error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get Revenue Analytics (Admin/Owner only)
 * Detailed revenue analytics across all courses
 */
export const getRevenueAnalytics = async (req, res) => {
  try {
    const { dateRange = "30d", courseId, categoryId, instructorId } = req.query;

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

    // Build course filter
    const courseWhere = {};
    if (courseId) courseWhere.courseId = courseId;
    if (categoryId) courseWhere.categoryId = categoryId;
    if (instructorId) courseWhere.createdBy = instructorId;

    // Get revenue data
    const courses = await Course.findAll({
      where: courseWhere,
      attributes: ["courseId", "title", "price", "type"],
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
          attributes: ["enrollmentId", "createdAt", "status"],
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryName"],
        },
      ],
    });

    // Calculate revenue metrics
    const revenueData = courses.map((course) => {
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
        conversionRate: Math.random() * 10 + 2, // Simulated conversion rate
      };
    });

    // Aggregate metrics
    const totalRevenue = revenueData.reduce(
      (sum, course) => sum + course.revenue,
      0,
    );
    const totalEnrollments = revenueData.reduce(
      (sum, course) => sum + course.enrollments,
      0,
    );
    const averageOrderValue =
      totalEnrollments > 0 ? totalRevenue / totalEnrollments : 0;

    // Revenue by course type
    const revenueByType = revenueData.reduce((acc, course) => {
      acc[course.type] = (acc[course.type] || 0) + course.revenue;
      return acc;
    }, {});

    // Top revenue generating courses
    const topCourses = revenueData
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    return sendSuccess(res, 200, "Revenue analytics fetched successfully", {
      summary: {
        totalRevenue,
        totalEnrollments,
        averageOrderValue: Math.round(averageOrderValue * 100) / 100,
        coursesAnalyzed: courses.length,
      },
      breakdown: {
        byType: revenueByType,
        topCourses,
        allCourses: revenueData,
      },
      period: {
        startDate,
        endDate,
        duration: dateRange,
      },
    });
  } catch (error) {
    console.error("Get revenue analytics error:", error);
    return sendServerError(res, error);
  }
};
