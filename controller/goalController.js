// controller/goalController.js
import Goal from "../model/goal.js";
import CourseLevel from "../model/courseLevel.js";
import Skill from "../model/skill.js";
import { validateGoalInput } from "../utils/commonUtils.js";
import { Op } from "sequelize";
import {
  sendSuccess,
  sendValidationError,
  sendNotFound,
  sendServerError,
  sendConflict
} from "../utils/responseHelper.js";

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
      return sendValidationError(res, "Invalid request format", {
        body: "Request body must be an array of goals or an object with a 'goals' array property"
      });
    }

    if (goals.length === 0) {
      return sendValidationError(res, "Empty goals array", {
        goals: "Goals array cannot be empty"
      });
    }

    // Ensure the goals table exists
    try {
      await Goal.sync({ alter: false });
    } catch (error) {
      console.error("Error with goals table:", error);
      // Continue with the operation even if there's an error checking the table
      // The subsequent operations will fail if the table doesn't exist
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
      } else if (goal.levelId) {
        // If levelId is provided directly, validate it exists
        // First check for valid UUID format
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(goal.levelId)) {
          validationErrors.push({
            index: i,
            errors: [`Invalid levelId format: ${goal.levelId}. Must be a valid UUID.`],
          });
          continue;
        }
        
        const level = await CourseLevel.findByPk(goal.levelId);
        if (!level) {
          validationErrors.push({
            index: i,
            errors: [`Level with ID '${goal.levelId}' not found`],
          });
          continue;
        }
        levelId = goal.levelId;
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
      return sendValidationError(res, "Validation failed for one or more goals.", {
        validationErrors
      });
    }

    const createdGoals = await Goal.bulkCreate(goalsToCreate, {
      ignoreDuplicates: true, // Optional: skip duplicate goalName
    });

    return sendSuccess(res, "Goals uploaded successfully", {
      data: createdGoals
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return sendServerError(res, "Failed to upload goals", {
      error: error.message
    });
  }
};

export const getAllGoals = async (req, res) => {
  try {
    const {
      search = "",
      sortBy = "createdAt",
      sortOrder = "ASC",
    } = req.query;

    // Build where condition for search
    const whereClause = {};
    if (search) {
      whereClause.goalName = {
        [Op.iLike]: `%${search}%`,
      };
    }

    const { rows: goals } = await Goal.findAndCountAll({
      attributes: ["goalId", "goalName", "description", "levelId"],
      include: {
        model: CourseLevel,
        as: "level",
        attributes: ["levelId", "name", "order"],
        required: false, // LEFT JOIN since levelId is optional
      },
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    return sendSuccess(res,  "Goals fetched successfully", goals);
  } catch (error) {
    console.error("Fetch error:", error);
    return sendServerError(res, "Failed to fetch goals", {
      error: error.message
    });
  }
};

export const getGoalsByLevel = async (req, res) => {
  try {
    const { levelId } = req.params;

    // Validate UUID format for levelId
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(levelId)) {
      return sendValidationError(res, `Invalid levelId format: ${levelId}. Must be a valid UUID.`);
    }

    // Validate if level exists
    const level = await CourseLevel.findByPk(levelId);
    if (!level) {
      return sendNotFound(res, "Level not found");
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

    return sendSuccess(res, "Goals fetched successfully", {
      data: goals
    });
  } catch (error) {
    console.error("Error fetching goals by level:", error);
    return sendServerError(res, "Failed to fetch goals by level", {
      error: error.message
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

    return sendSuccess(res, "Goal options fetched successfully", {
      data: {
        levels
      }
    });
  } catch (error) {
    console.error("Error fetching goal options:", error);
    return sendServerError(res, "Failed to fetch goal options", {
      error: error.message
    });
  }
};

// Get goal by ID
export const getGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(goalId)) {
      return sendValidationError(res, `Invalid goalId format: ${goalId}. Must be a valid UUID.`);
    }
    
    const goal = await Goal.findByPk(goalId, {
      attributes: ["goalId", "goalName", "description", "levelId"],
      include: {
        model: CourseLevel,
        as: "level",
        attributes: ["levelId", "name", "order"],
        required: false, // LEFT JOIN since levelId is optional
      }
    });
    
    if (!goal) {
      return sendNotFound(res, "Goal not found");
    }
    
    return sendSuccess(res,  "Goal fetched successfully", goal);
  } catch (error) {
    console.error("Error fetching goal by ID:", error);
    return sendServerError(res, error);
  }
};

// Create a new goal
export const createGoal = async (req, res) => {
  try {
    const { goalName, description, levelId } = req.body;
    
    // Validate required fields
    if (!goalName) {
      return sendValidationError(res, "Missing required fields", {
        goalName: "Goal name is required"
      });
    }
    
    // Validate level ID if provided
    if (levelId) {
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(levelId)) {
        return sendValidationError(res, "Invalid level ID format", {
          levelId: "Level ID must be a valid UUID"
        });
      }
      
      const level = await CourseLevel.findByPk(levelId);
      if (!level) {
        return sendNotFound(res, `Level with ID '${levelId}' not found`);
      }
    }
    
    // Check for existing goal with same name
    const existingGoal = await Goal.findOne({
      where: {
        goalName
      }
    });
    
    if (existingGoal) {
      return sendConflict(res, "A goal with this name already exists");
    }
    
    // Create the goal
    const newGoal = await Goal.create({
      goalName,
      description,
      levelId
    });
    
    // Fetch the created goal with level association
    const createdGoal = await Goal.findByPk(newGoal.goalId, {
      include: {
        model: CourseLevel,
        as: "level",
        attributes: ["levelId", "name", "order"],
        required: false
      }
    });
    
    return sendSuccess(res,  "Goal created successfully", createdGoal);
  } catch (error) {
    console.error("Error creating goal:", error);
    return sendServerError(res, error);
  }
};

// Update an existing goal
export const updateGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    const { goalName, description, levelId } = req.body;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(goalId)) {
      return sendValidationError(res, `Invalid goalId format: ${goalId}. Must be a valid UUID.`);
    }
    
    // Find the goal
    const goal = await Goal.findByPk(goalId);
    if (!goal) {
      return sendNotFound(res, "Goal not found");
    }
    
    // Validate level ID if provided
    if (levelId) {
      // Validate UUID format
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(levelId)) {
        return sendValidationError(res, "Invalid level ID format", {
          levelId: "Level ID must be a valid UUID"
        });
      }
      
      const level = await CourseLevel.findByPk(levelId);
      if (!level) {
        return sendNotFound(res, `Level with ID '${levelId}' not found`);
      }
    }
    
    // Check for conflicting goal name
    if (goalName && goalName !== goal.goalName) {
      const existingGoal = await Goal.findOne({
        where: {
          goalName,
          goalId: { [Op.ne]: goalId }
        }
      });
      
      if (existingGoal) {
        return sendConflict(res, "A goal with this name already exists");
      }
    }
    
    // Update the goal
    await goal.update({
      goalName: goalName || goal.goalName,
      description: description !== undefined ? description : goal.description,
      levelId: levelId !== undefined ? levelId : goal.levelId
    });
    
    // Fetch the updated goal with level association
    const updatedGoal = await Goal.findByPk(goalId, {
      include: {
        model: CourseLevel,
        as: "level",
        attributes: ["levelId", "name", "order"],
        required: false
      }
    });
    
    return sendSuccess(res,  "Goal updated successfully", updatedGoal);
  } catch (error) {
    console.error("Error updating goal:", error);
    return sendServerError(res, error);
  }
};

// Delete a goal
export const deleteGoal = async (req, res) => {
  try {
    const { goalId } = req.params;
    
    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(goalId)) {
      return sendValidationError(res, `Invalid goalId format: ${goalId}. Must be a valid UUID.`);
    }
    
    // Find the goal
    const goal = await Goal.findByPk(goalId);
    if (!goal) {
      return sendNotFound(res, "Goal not found");
    }
    
    // Check if goal has associated skills
    const skillCount = await Skill.count({
      where: {
        goalId
      }
    });
    
    if (skillCount > 0) {
      return sendConflict(
        res, 
        `Cannot delete goal: ${skillCount} skills are associated with this goal. Remove the skills first.`
      );
    }
    
    // Delete the goal
    await goal.destroy();
    
    return sendSuccess(res,  "Goal deleted successfully");
  } catch (error) {
    console.error("Error deleting goal:", error);
    return sendServerError(res, error);
  }
};
