// controller/goalController.js
import Goal from "../model/goal.js";
import CourseLevel from "../model/courseLevel.js";
import { validateGoalInput } from "../utils/commonUtils.js";
import { Op } from "sequelize";

export const bulkUploadGoals = async (req, res) => {
  try {
    const requestBody = req.body;
    let goals;

    // Handle both direct array and wrapper object formats
    if (Array.isArray(requestBody)) {
      goals = requestBody;
    } else if (requestBody.goals && Array.isArray(requestBody.goals)) {
      goals = requestBody.goals;
    } else {
      return res.status(400).json({
        status: false,
        message:
          "Request body must be an array of goals or an object with a 'goals' array property",
      });
    }

    if (goals.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Goals array cannot be empty",
      });
    }

    // Process goals with level lookup
    const goalsToCreate = [];
    const validationErrors = [];
    for (let i = 0; i < goals.length; i++) {
      const goal = goals[i];

      // Validate goal using utility function
      const goalValidationErrors = validateGoalInput(goal);
      if (goalValidationErrors.length > 0) {
        validationErrors.push({
          index: i,
          errors: goalValidationErrors,
        });
        continue;
      }

      // Extract goal name (support both title and goalName)
      const goalName = goal.title || goal.goalName;

      // Look up level ID if level is provided
      let levelId = null;
      if (goal.level) {
        const level = await CourseLevel.findOne({
          where: {
            [Op.or]: [
              { name: goal.level },
              { name: { [Op.iLike]: goal.level } },
            ],
          },
        });
        if (!level) {
          validationErrors.push({
            index: i,
            errors: [`Level '${goal.level}' not found`],
          });
          continue;
        }
        levelId = level.levelId;
      }

      // Create goal object
      const goalData = {
        goalName: goalName,
        description: goal.description || null,
        levelId: levelId,
      };

      goalsToCreate.push(goalData);
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: false,
        message: "Validation failed for one or more goals.",
        validationErrors,
      });
    }

    const createdGoals = await Goal.bulkCreate(goalsToCreate, {
      ignoreDuplicates: true, // Optional: skip duplicate goalName
    });

    return res.status(201).json({
      status: true,
      message: "Goals uploaded successfully",
      data: createdGoals,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to upload goals",
      error: error.message,
    });
  }
};

export const getAllGoals = async (req, res) => {
  try {
    const goals = await Goal.findAll({
      attributes: ["goalId", "goalName", "description", "levelId"],
      include: {
        model: CourseLevel,
        as: "level",
        attributes: ["levelId", "name", "order"],
        required: false, // LEFT JOIN since levelId is optional
      },
      order: [["createdAt", "ASC"]],
    });

    return res.status(200).json({
      status: true,
      message: "Goals fetched successfully",
      data: goals,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch goals",
      error: error.message,
    });
  }
};

export const getGoalsByLevel = async (req, res) => {
  try {
    const { levelId } = req.params;

    // Validate if level exists
    const level = await CourseLevel.findByPk(levelId);
    if (!level) {
      return res.status(404).json({
        status: false,
        message: "Level not found",
      });
    }

    const goals = await Goal.findAll({
      where: { levelId },
      attributes: ["goalId", "goalName", "description", "levelId"],
      include: {
        model: CourseLevel,
        as: "level",
        attributes: ["levelId", "name", "order"],
        required: false,
      },
      order: [["goalName", "ASC"]],
    });

    return res.status(200).json({
      status: true,
      message: "Goals fetched successfully",
      data: goals,
    });
  } catch (error) {
    console.error("Error fetching goals by level:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch goals by level",
      error: error.message,
    });
  }
};

export const getGoalOptions = async (req, res) => {
  try {
    // Get all levels for dropdown
    const levels = await CourseLevel.findAll({
      attributes: ["levelId", "name", "order"],
      order: [["order", "ASC"]],
    });

    return res.status(200).json({
      status: true,
      message: "Goal options fetched successfully",
      data: {
        levels,
      },
    });
  } catch (error) {
    console.error("Error fetching goal options:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch goal options",
      error: error.message,
    });
  }
};
