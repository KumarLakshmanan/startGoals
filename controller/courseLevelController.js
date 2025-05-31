import CourseLevel from "../model/courseLevel.js";
import { validateCourseLevelInput } from "../utils/commonUtils.js";

// Controller for Bulk Upload of Course Levels
export const bulkUploadCourseLevels = async (req, res) => {
  const levels = req.body;

  if (!Array.isArray(levels) || levels.length === 0) {
    return res.status(400).json({
      status: false,
      message: "No levels provided or levels array is empty.",
    });
  }

  // Validate each level object
  const validationErrors = [];
  levels.forEach((level, index) => {
    const errors = validateCourseLevelInput(level);
    if (errors.length > 0) {
      validationErrors.push({ index, errors });
    }
  });

  if (validationErrors.length > 0) {
    return res.status(400).json({
      status: false,
      message: "Validation failed for one or more levels.",
      validationErrors,
    });
  }

  try {
    // Bulk insert levels into the database
    const newLevels = await CourseLevel.bulkCreate(levels);

    return res.status(201).json({
      status: true,
      message: "Bulk upload successful!",
      data: newLevels,
    });
  } catch (error) {
    console.error("Error during bulk upload:", error);
    return res.status(500).json({
      status: false,
      message: "Error during bulk upload.",
    });
  }
};

// Controller to Get All Course Levels
export const getAllCourseLevels = async (req, res) => {
  try {
    const courseLevels = await CourseLevel.findAll();

    if (!courseLevels || courseLevels.length === 0) {
      return res.status(404).json({
        status: false,
        message: "No course levels found.",
      });
    }

    return res.status(200).json({
      status: true,
      data: courseLevels,
    });
  } catch (error) {
    console.error("Error fetching course levels:", error);
    return res.status(500).json({
      status: false,
      message: "Error fetching course levels.",
    });
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
      return res.status(404).json({
        status: false,
        message: `Course level with ID ${levelId} not found.`,
      });
    }

    return res.status(200).json({
      status: true,
      data: courseLevel,
    });
  } catch (error) {
    console.error("Error fetching course level by ID:", error);
    return res.status(500).json({
      status: false,
      message: "Error fetching course level.",
    });
  }
};
