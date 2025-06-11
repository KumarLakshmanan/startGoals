// controllers/sectionController.js
import Section from "../model/section.js";
import Lesson from "../model/lesson.js";
import sequelize from "../config/db.js";
import Resource from "../model/resource.js";
import Course from "../model/course.js";

//create section
export const createSection = async (req, res) => {
  const { courseId, title, description, order, lessons } = req.body;

  // Basic validation
  if (!courseId || !title || !Array.isArray(lessons)) {
    return res.status(400).json({
      status: false,
      message:
        "Missing required fields: courseId, title, or lessons must be provided",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    // Check course existence
    const course = await Course.findByPk(courseId);
    if (!course) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    // Create Section
    const section = await Section.create(
      {
        courseId,
        title,
        description,
        order,
      },
      { transaction }
    );

    // Create Lessons with Resources
    for (const lesson of lessons) {
      const {
        title,
        type,
        content,
        videoUrl,
        duration,
        order,
        isPreview,
        resources,
      } = lesson;

      // Lesson validation
      if (!title || !type || !["video", "article", "quiz"].includes(type)) {
        await transaction.rollback();
        return res.status(400).json({
          status: false,
          message:
            "Each lesson must have a valid title and type (video, article, quiz)",
        });
      }

      const newLesson = await Lesson.create(
        {
          sectionId: section.sectionId,
          title,
          type,
          content,
          videoUrl,
          duration,
          order,
          isPreview,
        },
        { transaction }
      );

      // Create resources if provided
      if (resources?.length) {
        for (const resource of resources) {
          const { title, fileUrl, type } = resource;
          if (
            !title ||
            !fileUrl ||
            !["pdf", "doc", "zip", "ppt", "xls", "csv", "jpg", "png"].includes(
              type
            )
          ) {
            await transaction.rollback();
            return res.status(400).json({
              status: false,
              message:
                "Each resource must have a valid title, fileUrl, and allowed type",
            });
          }

          await Resource.create(
            {
              lessonId: newLesson.lessonId,
              title,
              fileUrl,
              type,
            },
            { transaction }
          );
        }
      }
    }

    await transaction.commit();

    return res.status(201).json({
      status: true,
      message: "Section, lessons, and resources created successfully",
      sectionId: section.sectionId,
    });
  } catch (error) {
    console.error("Error creating section with lessons/resources:", error);
    await transaction.rollback();
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

//update section by sectionId
export const updateSectionById = async (req, res) => {
  const { sectionId } = req.params;
  const { title, description, order } = req.body;

  // Validation
  if (!sectionId) {
    return res.status(400).json({
      status: false,
      message: "Section ID is required in the URL.",
    });
  }

  if (title !== undefined && typeof title !== "string") {
    return res.status(400).json({
      status: false,
      message: "Title must be a string.",
    });
  }

  if (description !== undefined && typeof description !== "string") {
    return res.status(400).json({
      status: false,
      message: "Description must be a string.",
    });
  }

  if (order !== undefined && (typeof order !== "number" || order < 0)) {
    return res.status(400).json({
      status: false,
      message: "Order must be a non-negative number.",
    });
  }

  const transaction = await sequelize.transaction();

  try {
    const section = await Section.findByPk(sectionId, { transaction });

    if (!section) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Section not found",
      });
    }

    section.title = title !== undefined ? title : section.title;
    section.description =
      description !== undefined ? description : section.description;
    section.order = order !== undefined ? order : section.order;

    await section.save({ transaction });
    await transaction.commit();

    return res.status(200).json({
      status: true,
      message: "Section updated successfully!",
      section,
    });
  } catch (error) {
    console.error("Error updating section:", error);
    await transaction.rollback();
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

//get all sections by its courseId
export const getSectionsByCourseId = async (req, res) => {
  const { courseId } = req.params;

  if (!courseId) {
    return res.status(400).json({
      status: false,
      message: "courseId parameter is required",
    });
  }

  try {
    // Ensure course exists
    const course = await Course.findByPk(courseId);
    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    const sections = await Section.findAll({
      where: { courseId },
      include: [
        {
          model: Lesson,
          as: "lessons",
          include: [
            {
              model: Resource,
              as: "resources",
              attributes: ["resourceId", "title", "fileUrl", "type", "order"],
            },
          ],
          attributes: {
            exclude: ["createdAt", "updatedAt", "deletedAt"],
          },
        },
      ],
      attributes: {
        exclude: ["createdAt", "updatedAt", "deletedAt"],
      },
    });

    // Manual sorting of sections, lessons, and resources
    sections.sort((a, b) => a.order - b.order);
    sections.forEach((section) => {
      section.lessons.sort((a, b) => a.order - b.order);
      section.lessons.forEach((lesson) => {
        if (lesson.resources) {
          lesson.resources.sort((a, b) => a.order - b.order);
        }
      });
    });

    return res.status(200).json({
      status: true,
      message: "Sections fetched successfully",
      sections,
    });
  } catch (error) {
    console.error("Error fetching sections:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

//get  section by its sectionId
export const getSectionById = async (req, res) => {
  const { sectionId } = req.params;

  try {
    const section = await Section.findOne({
      where: { sectionId },
      include: [
        {
          model: Lesson,
          as: "lessons",
          include: [
            {
              model: Resource,
              as: "resources",
              order: [["order", "ASC"]], // ordering resources within a lesson
            },
          ],
          order: [["order", "ASC"]], // ordering lessons within section
        },
      ],
    });

    if (!section) {
      return res.status(404).json({
        status: false,
        message: "Section not found",
      });
    }

    // Force nested sorting if Sequelize didn't fully sort nested arrays
    section.lessons.sort((a, b) => a.order - b.order);
    section.lessons.forEach((lesson) => {
      if (lesson.resources) {
        lesson.resources.sort((a, b) => a.order - b.order);
      }
    });

    return res.status(200).json({
      status: true,
      section,
    });
  } catch (error) {
    console.error("Error fetching section by ID:", error);
    return res.status(500).json({
      status: false,
      message: "Internal server error",
    });
  }
};

/**
 * ===================== ADMIN/OWNER SECTION MANAGEMENT =====================
 */

/**
 * Create Section with Lessons (Admin/Owner only)
 * Comprehensive section creation with video uploads and resources
 */
export const createSectionAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      courseId,
      title,
      description,
      order,
      lessons = [],
      isPublished = false,
    } = req.body;

    // Validate required fields
    if (!courseId || !title) {
      return res.status(400).json({
        status: false,
        message: "Missing required fields: courseId, title",
      });
    }

    // Check if course exists and user has permission
    const course = await Course.findByPk(courseId, { transaction });
    if (!course) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    // Get next order if not provided
    let sectionOrder = order;
    if (!sectionOrder) {
      const lastSection = await Section.findOne({
        where: { courseId },
        order: [["order", "DESC"]],
        transaction,
      });
      sectionOrder = lastSection ? lastSection.order + 1 : 1;
    }

    // Create section
    const section = await Section.create(
      {
        courseId,
        title,
        description,
        order: sectionOrder,
        isPublished,
        createdBy: req.user.userId,
      },
      { transaction }
    );

    const createdLessons = [];

    // Create lessons if provided
    for (let i = 0; i < lessons.length; i++) {
      const lessonData = lessons[i];
      const {
        title: lessonTitle,
        type = "video",
        content,
        videoUrl,
        videoDuration,
        order: lessonOrder,
        resources = [],
        isPreview = false,
        isFree = false,
      } = lessonData;

      if (!lessonTitle) {
        await transaction.rollback();
        return res.status(400).json({
          status: false,
          message: `Lesson ${i + 1} is missing title`,
        });
      }

      // Create lesson
      const lesson = await Lesson.create(
        {
          sectionId: section.sectionId,
          title: lessonTitle,
          type,
          content,
          videoUrl,
          videoDuration,
          order: lessonOrder || i + 1,
          isPreview,
          isFree,
          isPublished: isPublished,
          createdBy: req.user.userId,
        },
        { transaction }
      );

      // Create resources for lesson
      const createdResources = [];
      for (const resource of resources) {
        const {
          title: resourceTitle,
          type: resourceType = "file",
          url,
          size,
          description: resourceDescription,
        } = resource;

        if (resourceTitle && url) {
          const createdResource = await Resource.create(
            {
              lessonId: lesson.lessonId,
              title: resourceTitle,
              type: resourceType,
              url,
              size,
              description: resourceDescription,
            },
            { transaction }
          );
          createdResources.push(createdResource);
        }
      }

      createdLessons.push({
        ...lesson.toJSON(),
        resources: createdResources,
      });
    }

    await transaction.commit();

    res.status(201).json({
      status: true,
      message: "Section created successfully with lessons",
      data: {
        section: section.toJSON(),
        lessons: createdLessons,
        totalLessons: createdLessons.length,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Create section admin error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to create section",
      error: error.message,
    });
  }
};

/**
 * Update Section (Admin/Owner only)
 * Update section details and reorder lessons
 */
export const updateSectionAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { sectionId } = req.params;
    const {
      title,
      description,
      order,
      isPublished,
      lessonUpdates = [],
    } = req.body;

    // Find section
    const section = await Section.findByPk(sectionId, { transaction });
    if (!section) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Section not found",
      });
    }

    // Update section
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (order !== undefined) updateData.order = order;
    if (isPublished !== undefined) updateData.isPublished = isPublished;

    await section.update(updateData, { transaction });

    // Update lessons if provided
    const updatedLessons = [];
    for (const lessonUpdate of lessonUpdates) {
      const { lessonId, ...lessonData } = lessonUpdate;

      if (lessonId) {
        const lesson = await Lesson.findByPk(lessonId, { transaction });
        if (lesson && lesson.sectionId === section.sectionId) {
          await lesson.update(lessonData, { transaction });
          updatedLessons.push(lesson);
        }
      }
    }

    await transaction.commit();

    res.json({
      status: true,
      message: "Section updated successfully",
      data: {
        section: section.toJSON(),
        updatedLessons: updatedLessons.length,
        lessonDetails: updatedLessons.map((l) => l.toJSON()),
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Update section admin error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to update section",
      error: error.message,
    });
  }
};

/**
 * Delete Section (Admin/Owner only)
 * Delete section and all associated lessons and resources
 */
export const deleteSectionAdmin = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { sectionId } = req.params;

    // Find section with lessons and resources
    const section = await Section.findByPk(sectionId, {
      include: [
        {
          model: Lesson,
          as: "lessons",
          include: [
            {
              model: Resource,
              as: "resources",
            },
          ],
        },
      ],
      transaction,
    });

    if (!section) {
      await transaction.rollback();
      return res.status(404).json({
        status: false,
        message: "Section not found",
      });
    }

    // Count items to be deleted
    const lessonCount = section.lessons.length;
    const resourceCount = section.lessons.reduce(
      (sum, lesson) => sum + lesson.resources.length,
      0
    );

    // Delete section (cascading will handle lessons and resources)
    await section.destroy({ transaction });

    await transaction.commit();

    res.json({
      status: true,
      message: "Section deleted successfully",
      data: {
        deletedSection: {
          sectionId: section.sectionId,
          title: section.title,
        },
        deletedLessons: lessonCount,
        deletedResources: resourceCount,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Delete section admin error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to delete section",
      error: error.message,
    });
  }
};

/**
 * Reorder Sections (Admin/Owner only)
 * Bulk reorder sections within a course
 */
export const reorderSections = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { courseId } = req.params;
    const { sectionOrders } = req.body; // Array of { sectionId, order }

    if (!Array.isArray(sectionOrders)) {
      return res.status(400).json({
        status: false,
        message: "sectionOrders must be an array",
      });
    }

    // Verify all sections belong to the course
    const sectionIds = sectionOrders.map((s) => s.sectionId);
    const sections = await Section.findAll({
      where: {
        sectionId: sectionIds,
        courseId,
      },
      transaction,
    });

    if (sections.length !== sectionIds.length) {
      await transaction.rollback();
      return res.status(400).json({
        status: false,
        message: "Some sections do not belong to this course",
      });
    }

    // Update section orders
    const updates = [];
    for (const { sectionId, order } of sectionOrders) {
      const section = sections.find((s) => s.sectionId === sectionId);
      if (section) {
        await section.update({ order }, { transaction });
        updates.push({ sectionId, newOrder: order, title: section.title });
      }
    }

    await transaction.commit();

    res.json({
      status: true,
      message: "Sections reordered successfully",
      data: {
        courseId,
        reorderedSections: updates,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Reorder sections error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to reorder sections",
      error: error.message,
    });
  }
};

/**
 * Get Course Content Management Data (Admin/Owner only)
 * Comprehensive course content overview for management
 */
export const getCourseContentManagement = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { includeUnpublished = true } = req.query;

    // Build where clause for sections
    const sectionWhere = { courseId };
    if (includeUnpublished === "false") {
      sectionWhere.isPublished = true;
    }

    // Get course with complete content structure
    const course = await Course.findByPk(courseId, {
      include: [
        {
          model: Section,
          as: "sections",
          where: sectionWhere,
          required: false,
          include: [
            {
              model: Lesson,
              as: "lessons",
              include: [
                {
                  model: Resource,
                  as: "resources",
                },
              ],
            },
          ],
        },
      ],
      order: [
        [{ model: Section, as: "sections" }, "order", "ASC"],
        [
          { model: Section, as: "sections" },
          { model: Lesson, as: "lessons" },
          "order",
          "ASC",
        ],
      ],
    });

    if (!course) {
      return res.status(404).json({
        status: false,
        message: "Course not found",
      });
    }

    // Calculate content statistics
    const stats = {
      totalSections: course.sections.length,
      publishedSections: course.sections.filter((s) => s.isPublished).length,
      totalLessons: course.sections.reduce(
        (sum, s) => sum + s.lessons.length,
        0
      ),
      publishedLessons: course.sections.reduce(
        (sum, s) => sum + s.lessons.filter((l) => l.isPublished).length,
        0
      ),
      totalResources: course.sections.reduce(
        (sum, s) =>
          sum +
          s.lessons.reduce((lessonSum, l) => lessonSum + l.resources.length, 0),
        0
      ),
      totalVideoDuration: course.sections.reduce(
        (sum, s) =>
          sum +
          s.lessons.reduce((lessonSum, l) => lessonSum + (l.videoDuration || 0), 0),
        0
      ),
      previewLessons: course.sections.reduce(
        (sum, s) => sum + s.lessons.filter((l) => l.isPreview).length,
        0
      ),
      freeLessons: course.sections.reduce(
        (sum, s) => sum + s.lessons.filter((l) => l.isFree).length,
        0
      ),
    };

    // Format content structure
    const contentStructure = course.sections.map((section) => ({
      sectionId: section.sectionId,
      title: section.title,
      description: section.description,
      order: section.order,
      isPublished: section.isPublished,
      lessons: section.lessons.map((lesson) => ({
        lessonId: lesson.lessonId,
        title: lesson.title,
        type: lesson.type,
        order: lesson.order,
        videoDuration: lesson.videoDuration,
        isPublished: lesson.isPublished,
        isPreview: lesson.isPreview,
        isFree: lesson.isFree,
        resourceCount: lesson.resources.length,
        resources: lesson.resources.map((resource) => ({
          resourceId: resource.resourceId,
          title: resource.title,
          type: resource.type,
          size: resource.size,
        })),
      })),
    }));

    res.json({
      status: true,
      data: {
        course: {
          courseId: course.courseId,
          title: course.title,
          type: course.type,
          status: course.status,
        },
        statistics: stats,
        content: contentStructure,
      },
    });
  } catch (error) {
    console.error("Get course content management error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to fetch course content management data",
      error: error.message,
    });
  }
};

/**
 * Bulk Publish/Unpublish Content (Admin/Owner only)
 * Publish or unpublish multiple sections and lessons at once
 */
export const bulkPublishContent = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { courseId } = req.params;
    const { action, sectionIds = [], lessonIds = [] } = req.body;

    if (!["publish", "unpublish"].includes(action)) {
      return res.status(400).json({
        status: false,
        message: "Invalid action. Use 'publish' or 'unpublish'",
      });
    }

    const results = {
      sectionsUpdated: 0,
      lessonsUpdated: 0,
      errors: [],
    };

    const isPublished = action === "publish";

    // Update sections
    if (sectionIds.length > 0) {
      try {
        const [sectionsUpdated] = await Section.update(
          { isPublished },
          {
            where: {
              sectionId: sectionIds,
              courseId,
            },
            transaction,
          }
        );
        results.sectionsUpdated = sectionsUpdated;
      } catch (error) {
        results.errors.push(`Sections update error: ${error.message}`);
      }
    }

    // Update lessons (only if they belong to course sections)
    if (lessonIds.length > 0) {
      try {
        const [lessonsUpdated] = await Lesson.update(
          { isPublished },
          {
            where: {
              lessonId: lessonIds,
              "$section.courseId$": courseId,
            },
            include: [
              {
                model: Section,
                as: "section",
                attributes: [],
              },
            ],
            transaction,
          }
        );
        results.lessonsUpdated = lessonsUpdated;
      } catch (error) {
        results.errors.push(`Lessons update error: ${error.message}`);
      }
    }

    await transaction.commit();

    res.json({
      status: true,
      message: `Content ${action}ed successfully`,
      data: results,
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Bulk publish content error:", error);
    res.status(500).json({
      status: false,
      message: "Failed to bulk publish content",
      error: error.message,
    });
  }
};
