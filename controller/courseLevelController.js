import CourseLevel from "../model/courseLevel.js";
import { validateCourseLevelInput } from "../utils/commonUtils.js";
import sequelize from "../config/db.js";
import { Op } from "sequelize";
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendServerError, sendConflict } from "../utils/responseHelper.js";

// Controller for Bulk Upload of Course Levels
export const bulkUploadCourseLevels = async (req, res) => {
  const { courseLevels, overwriteExisting = false } = req.body;

  if (!Array.isArray(courseLevels) || courseLevels.length === 0) {
    return sendValidationError(res, "No levels provided or levels array is empty", {
      courseLevels: "Must be a non-empty array"
    });
  }

  // Start a transaction
  const transaction = await sequelize.transaction();

  try {
    // Validate each level object
    const validationErrors = [];
    courseLevels.forEach((level, index) => {
      const errors = validateCourseLevelInput(level);
      if (errors.length > 0) {
        validationErrors.push({ index, errors });
      }
    });

    if (validationErrors.length > 0) {
      await transaction.rollback();
      return sendValidationError(res, "Validation failed for one or more levels", {
        validationErrors
      });
    }

    // If overwriteExisting is true, delete all existing levels
    if (overwriteExisting) {
      await CourseLevel.destroy({
        where: {},
        truncate: true,
        transaction,
      });
    }

    // Prepare data for insertion
    const levelsToCreate = courseLevels.map((level) => ({
      name: level.name,
      description: level.description,
      order: level.order,
    })); // Bulk insert/update levels into the database
    const newLevels = await CourseLevel.bulkCreate(levelsToCreate, {
      updateOnDuplicate: overwriteExisting
        ? ["name", "description", "order"]
        : undefined,
      transaction,
    });

    await transaction.commit();

    return sendSuccess(res, 200, "Course levels uploaded successfully!", newLevels);
  } catch (error) {
    await transaction.rollback();
    console.error("Error during course levels upload:", error);
    return sendServerError(res, error);
  }
};

// Controller to Get All Course Levels
export const getAllCourseLevels = async (req, res) => {
  try {
    const {
      search = "",
      sortBy = "order",
      sortOrder = "asc",
    } = req.query;

    // Validate sortBy field
    const validSortFields = ["order", "name", "difficultyScore", "createdAt"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "order";

    // Validate sortOrder
    const order = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";

    // Build where clause for search
    const whereClause = {};
    if (search) {
      whereClause.name = {
        [Op.iLike]: `%${search}%`,
      };
    }

    // Get count and rows
    const { count, rows: courseLevels } = await CourseLevel.findAndCountAll({
      where: whereClause,
      order: [[sortField, order]],
    });

    return sendSuccess(res, 200, "Course levels retrieved successfully", courseLevels);
  } catch (error) {
    console.error("Error fetching course levels:", error);
    return sendServerError(res, error);
  }
};

// Controller to Get Course Level by ID
export const getCourseLevelById = async (req, res) => {
  const { levelId } = req.params;

  try {
    const courseLevel = await CourseLevel.findOne({
      where: { levelId: levelId },
    });
    if (!courseLevel) {
      return sendNotFound(res, `Course level with ID ${levelId} not found`);
    }

    return sendSuccess(res, 200, "Course level retrieved successfully", courseLevel);
  } catch (error) {
    console.error("Error fetching course level by ID:", error);
    return sendServerError(res, error);
  }
};


export const updateCourseLevel = async (req, res) => {
  const { levelId } = req.params;
  const { name, description, order } = req.body;

  try {
    // Validate input
    if (!name || !description || typeof order !== "number") {
      return sendValidationError(res, "Invalid input data", {
        name: "Name is required",
        description: "Description is required",
        order: "Order must be a number"
      });
    }

    // Find the course level
    const courseLevel = await CourseLevel.findOne({ where: { levelId } });
    if (!courseLevel) {
      return sendNotFound(res, `Course level with ID ${levelId} not found`);
    }

    // Update the course level
    courseLevel.name = name;
    courseLevel.description = description;
    courseLevel.order = order;
    await courseLevel.save();

    return sendSuccess(res, 200, "Course level updated successfully", courseLevel);
  } catch (error) {
    console.error("Error updating course level:", error);
    return sendServerError(res, error);
  }
};

export const deleteCourseLevel = async (req, res) => {
  const { levelId } = req.params;

  try {
    const courseLevel = await CourseLevel.findOne({ where: { levelId } });
    if (!courseLevel) {
      return sendNotFound(res, `Course level with ID ${levelId} not found`);
    }

    await courseLevel.destroy();
    return sendSuccess(res, 200, "Course level deleted successfully");
  } catch (error) {
    console.error("Error deleting course level:", error);
    return sendServerError(res, error);
  }
};

export const createCourseLevel = async (req, res) => {
  const { name, description, order } = req.body;
  console.log("Creating course level with data:", { name, description, order });

  try {
    // Validate input
    if (!name || !description) {
      return sendValidationError(res, "Invalid input data", [
        "Name is required",
        "Description is required"
      ]);
    }

    // Create new course level
    const newLevel = await CourseLevel.create({
      name,
      description,
      order: order || 0,
    });

    return sendSuccess(res, 200, "Course level created successfully", newLevel);
  } catch (error) {
    console.error("Error creating course level:", error);
    return sendServerError(res, error);
  }
};


// Controller to reorder course levels
export const reorderCourseLevels = async (req, res) => {
  const { levels } = req.body;

  if (!Array.isArray(levels) || levels.length === 0) {
    return sendValidationError(res, "No levels provided or levels array is empty", {
      levels: "Must be a non-empty array"
    });
  }

  const transaction = await sequelize.transaction();
  try {
    // Validate all levels have id and order
    for (const level of levels) {
      if (!level.id || typeof level.order !== "number") {
        await transaction.rollback();
        return sendValidationError(res, "Each level must have an id and order", {
          level
        });
      }
    }

    // Update each level's order
    for (const level of levels) {
      await CourseLevel.update(
        { order: level.order },
        { where: { levelId: level.id }, transaction }
      );
    }

    await transaction.commit();
    return sendSuccess(res, 200, "Course levels reordered successfully");
  } catch (error) {
    await transaction.rollback();
    console.error("Error reordering course levels:", error);
    return sendServerError(res, error);
  }
};