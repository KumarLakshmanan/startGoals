// controller/skillController.js
import Skill from "../model/skill.js";
import CourseLevel from "../model/courseLevel.js";
import { Op } from "sequelize";
import {
  sendSuccess,
  sendValidationError,
  sendNotFound,
  sendServerError,
  sendConflict
} from "../utils/responseHelper.js";


export const getAllSkills = async (req, res) => {
  try {
    const {
      search = "",
      sortBy = "createdAt",
      sortOrder = "ASC",
    } = req.query;

    // Build where condition for search
    const whereClause = {};
    if (search) {
      whereClause.skillName = {
        [Op.iLike]: `%${search}%`,
      };
    }

    const {  rows: skills } = await Skill.findAndCountAll({
      where: whereClause,
      attributes: [
        "skillId",
        "skillName",
        "levelId",
        "description",
      ],
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name"],
          required: false, // LEFT JOIN since levelId is optional
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    return sendSuccess(res,  "Skills fetched successfully", skills);
  } catch (error) {
    console.error("Fetch error:", error);
    return sendServerError(res, "Failed to fetch skills", error.message);
  }
};

export const getSkillsByLevel = async (req, res) => {
  try {
    const { levelId } = req.params;

    // Validate UUID format for levelId
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(levelId)) {
      return sendValidationError(res, `Invalid levelId format: ${levelId}. Must be a valid UUID.`);
    }

    // Validate level exists
    const level = await CourseLevel.findByPk(levelId);
    if (!level) {
      return sendNotFound(res, "Level not found");
    }

    const whereClause = { levelId };

    const skills = await Skill.findAll({
      where: whereClause,
      attributes: [
        "skillId",
        "skillName",
        "levelId",
        "description",
      ],
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name"],
          required: false,
        },
      ],
      order: [["skillName", "ASC"]],
    });

    return sendSuccess(res, "Skills fetched successfully", {
      data: skills
    });
  } catch (error) {
    console.error("Error fetching skills by level:", error);
    return sendServerError(res, "Failed to fetch skills by level", error.message);
  }
};

export const getSkillOptions = async (req, res) => {
  try {
    // Get all levels
    const levels = await CourseLevel.findAll({
      attributes: ["levelId", "name"],
      order: [["order", "ASC"]],
    });

    return sendSuccess(res, "Skill options fetched successfully", {
      data: {
        levels,
      }
    });
  } catch (error) {
    console.error("Error fetching skill options:", error);
    return sendServerError(res, "Failed to fetch skill options", error.message);
  }
};

// Get skill by ID
export const getSkill = async (req, res) => {
  try {
    const { skillId } = req.params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(skillId)) {
      return sendValidationError(res, `Invalid skillId format: ${skillId}. Must be a valid UUID.`);
    }

    const skill = await Skill.findByPk(skillId, {
      attributes: [
        "skillId",
        "skillName",
        "description",
        "levelId"
      ],
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name"],
          required: false,
        }
      ]
    });

    if (!skill) {
      return sendNotFound(res, "Skill not found");
    }

    return sendSuccess(res,  "Skill fetched successfully", skill);
  } catch (error) {
    console.error("Error fetching skill by ID:", error);
    return sendServerError(res, error);
  }
};

// Create a new skill
export const createSkill = async (req, res) => {
  try {
    const {
      skillName,
      description,
      levelId
    } = req.body;

    // Validate required fields
    if (!skillName) {
      return sendValidationError(res, "Missing required fields", {
        skillName: "Skill name is required"
      });
    }

    if (levelId) {
      const level = await CourseLevel.findByPk(levelId);
      if (!level) {
        return sendNotFound(res, `Level with ID '${levelId}' not found`);
      }
    }

    // Check for existing skill with same name
    const existingSkill = await Skill.findOne({
      where: {
        skillName
      }
    });

    if (existingSkill) {
      return sendConflict(res, "A skill with this name already exists");
    }

    // Create the skill
    const newSkill = await Skill.create({
      skillName,
      description,
      levelId
    });

    // Fetch the created skill with associations
    const createdSkill = await Skill.findByPk(newSkill.skillId, {
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name"],
          required: false,
        }
      ]
    });

    return sendSuccess(res,  "Skill created successfully", createdSkill);
  } catch (error) {
    console.error("Error creating skill:", error);
    return sendServerError(res, error);
  }
};

// Update an existing skill
export const updateSkill = async (req, res) => {
  try {
    const { skillId } = req.params;
    const {
      skillName,
      description,
      levelId
    } = req.body;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(skillId)) {
      return sendValidationError(res, `Invalid skillId format: ${skillId}. Must be a valid UUID.`);
    }

    // Find the skill
    const skill = await Skill.findByPk(skillId);
    if (!skill) {
      return sendNotFound(res, "Skill not found");
    }

    if (levelId) {
      const level = await CourseLevel.findByPk(levelId);
      if (!level) {
        return sendNotFound(res, `Level with ID '${levelId}' not found`);
      }
    }

    // Check for conflicting skill name
    if (skillName && skillName !== skill.skillName) {
      const existingSkill = await Skill.findOne({
        where: {
          skillName,
          skillId: { [Op.ne]: skillId }
        }
      });

      if (existingSkill) {
        return sendConflict(res, "A skill with this name already exists");
      }
    }

    // Update the skill
    await skill.update({
      skillName: skillName || skill.skillName,
      description: description !== undefined ? description : skill.description,
      levelId: levelId !== undefined ? levelId : skill.levelId
    });

    // Fetch the updated skill with associations
    const updatedSkill = await Skill.findByPk(skillId, {
      include: [
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name"],
          required: false,
        }
      ]
    });

    return sendSuccess(res,  "Skill updated successfully", updatedSkill);
  } catch (error) {
    console.error("Error updating skill:", error);
    return sendServerError(res, error);
  }
};

// Delete a skill
export const deleteSkill = async (req, res) => {
  try {
    const { skillId } = req.params;

    // Validate UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(skillId)) {
      return sendValidationError(res, `Invalid skillId format: ${skillId}. Must be a valid UUID.`);
    }

    // Find the skill
    const skill = await Skill.findByPk(skillId);
    if (!skill) {
      return sendNotFound(res, "Skill not found");
    }

    // Delete the skill
    await skill.destroy();

    return sendSuccess(res,  "Skill deleted successfully");
  } catch (error) {
    console.error("Error deleting skill:", error);
    return sendServerError(res, error);
  }
};
