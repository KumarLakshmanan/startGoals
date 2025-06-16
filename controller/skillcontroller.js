// controller/skillController.js
import Skill from "../model/skill.js";
import Goal from "../model/goal.js";
import CourseCategory from "../model/courseCategory.js";
import CourseLevel from "../model/courseLevel.js";
import { validateSkillInput } from "../utils/commonUtils.js";
import { Op } from "sequelize";
export const bulkUploadSkills = async (req, res) => {
  try {
    const skills = req.body;

    if (!Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Request body must be a non-empty array of skills",
      });
    }

    // Process skills
    const skillsToCreate = [];
    const validationErrors = [];

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];

      // Validate each skill
      const errors = validateSkillInput(skill);
      if (errors.length > 0) {
        validationErrors.push({ index: i, errors });
        continue;
      }

      // Look up level ID if level is provided
      let levelId = null;
      if (skill.level) {
        const level = await CourseLevel.findOne({
          where: {
            [Op.or]: [
              { name: skill.level },
              { name: { [Op.iLike]: skill.level } },
            ],
          },
        });
        if (!level) {
          validationErrors.push({
            index: i,
            errors: [`Level '${skill.level}' not found`],
          });
          continue;
        }
        levelId = level.levelId;
      }

      // Create skill object with new structure
      const skillData = {
        skillName: skill.skillName,
        categoryId: null,
        levelId: levelId,
        description: skill.description || null,
        goalId: skill.goalId || null, // Optional goalId
      };

      skillsToCreate.push(skillData);
    }

    // Return validation errors if any
    if (validationErrors.length > 0) {
      return res.status(400).json({
        status: false,
        message: "Validation failed for one or more skills.",
        validationErrors,
      });
    }

    const createdSkills = await Skill.bulkCreate(skillsToCreate, {
      ignoreDuplicates: true, // Ignore duplicates instead of failing
    });

    return res.status(201).json({
      status: true,
      message: "Skills uploaded successfully",
      data: createdSkills,
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to upload skills",
      error: error.message,
    });
  }
};

export const getAllSkills = async (req, res) => {
  try {
    const skills = await Skill.findAll({
      attributes: [
        "skillId",
        "skillName",
        "categoryId",
        "levelId",
        "description",
        "goalId",
      ],
      include: [
        {
          model: Goal,
          as: "goal",
          attributes: ["goalId", "goalName"],
          required: false, // LEFT JOIN since goalId is now optional
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "categoryName"],
          required: false, // LEFT JOIN since categoryId is optional
        },
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name"],
          required: false, // LEFT JOIN since levelId is optional
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    return res.status(200).json({
      status: true,
      message: "Skills fetched successfully",
      data: skills,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch skills",
      error: error.message,
    });
  }
};

export const getSkillsByGoal = async (req, res) => {
  try {
    const { goalId } = req.params;

    // ✅ Step 1: Validate if goal exists
    const goal = await Goal.findByPk(goalId);
    if (!goal) {
      return res.status(404).json({
        status: false,
        message: "Goal not found",
      });
    } // ✅ Step 2: Fetch all skills for that goal
    const skills = await Skill.findAll({
      where: { goalId },
      attributes: [
        "skillId",
        "skillName",
        "categoryId",
        "levelId",
        "description",
      ],
      include: [
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "categoryName"],
          required: false,
        },
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name"],
          required: false,
        },
      ],
      order: [["createdAt", "ASC"]],
    });

    return res.status(200).json({
      status: true,
      message: "Skills fetched successfully",
      data: skills,
    });
  } catch (error) {
    console.error("Error fetching skills by goal:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch skills by goal",
      error: error.message,
    });
  }
};

export const getSkillsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { levelId } = req.query; // Optional level filter

    const whereClause = { categoryId };
    if (levelId) {
      whereClause.levelId = levelId;
    }

    const skills = await Skill.findAll({
      where: whereClause,
      attributes: [
        "skillId",
        "skillName",
        "categoryId",
        "levelId",
        "description",
        "goalId",
      ],
      include: [
        {
          model: Goal,
          as: "goal",
          attributes: ["goalId", "goalName"],
          required: false,
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "categoryName"],
          required: false,
        },
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name"],
          required: false,
        },
      ],
      order: [
        ["levelId", "ASC"],
        ["skillName", "ASC"],
      ],
    });

    return res.status(200).json({
      status: true,
      message: "Skills fetched successfully",
      data: skills,
    });
  } catch (error) {
    console.error("Error fetching skills by category:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch skills by category",
      error: error.message,
    });
  }
};

export const getSkillsByLevel = async (req, res) => {
  try {
    const { levelId } = req.params;
    const { categoryId } = req.query; // Optional category filter

    const whereClause = { levelId };
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    const skills = await Skill.findAll({
      where: whereClause,
      attributes: [
        "skillId",
        "skillName",
        "categoryId",
        "levelId",
        "description",
        "goalId",
      ],
      include: [
        {
          model: Goal,
          as: "goal",
          attributes: ["goalId", "goalName"],
          required: false,
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "categoryName"],
          required: false,
        },
        {
          model: CourseLevel,
          as: "level",
          attributes: ["levelId", "name"],
          required: false,
        },
      ],
      order: [["skillName", "ASC"]],
    });

    return res.status(200).json({
      status: true,
      message: "Skills fetched successfully",
      data: skills,
    });
  } catch (error) {
    console.error("Error fetching skills by level:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch skills by level",
      error: error.message,
    });
  }
};

export const getSkillOptions = async (req, res) => {
  try {
    // Get all categories
    const categories = await CourseCategory.findAll({
      attributes: ["categoryId", "categoryName"],
      order: [["categoryName", "ASC"]],
    });

    // Get all levels
    const levels = await CourseLevel.findAll({
      attributes: ["levelId", "name"],
      order: [["order", "ASC"]],
    });

    // Get all goals
    const goals = await Goal.findAll({
      attributes: ["goalId", "goalName"],
      order: [["goalName", "ASC"]],
    });

    return res.status(200).json({
      status: true,
      message: "Skill options fetched successfully",
      data: {
        categories,
        levels,
        goals,
      },
    });
  } catch (error) {
    console.error("Error fetching skill options:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to fetch skill options",
      error: error.message,
    });
  }
};
