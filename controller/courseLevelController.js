import CourseLevel from "../model/courseLevel.js";
import { validateCourseLevelInput } from "../utils/commonUtils.js";
import sequelize from "../config/db.js";
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
      sortBy = "order",
      sortOrder = "asc",
      includeStats = false,
    } = req.query;

    // Validate sortBy field
    const validSortFields = ["order", "name", "difficultyScore", "createdAt"];
    const sortField = validSortFields.includes(sortBy) ? sortBy : "order";

    // Validate sortOrder
    const order = sortOrder.toLowerCase() === "desc" ? "DESC" : "ASC";

    const courseLevels = await CourseLevel.findAll({
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
