// controller/skillController.js
import Skill from "../model/skill.js";
import Goal from "../model/goal.js";

export const bulkUploadSkills = async (req, res) => {
  try {
    const skills = req.body;

    if (!Array.isArray(skills) || skills.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Request body must be a non-empty array of skills",
      });
    }

    // Validate each skill
    for (const skill of skills) {
      if (
        !skill.skillName ||
        typeof skill.skillName !== "string" ||
        !skill.goalId
      ) {
        return res.status(400).json({
          status: false,
          message:
            "Each skill must have a valid 'skillName' and associated 'goalId'",
        });
      }

      // Optional: check if the goal exists for each skill
      const goal = await Goal.findByPk(skill.goalId);
      if (!goal) {
        return res.status(400).json({
          status: false,
          message: `Invalid goalId for skill: ${skill.skillName}`,
        });
      }
    }

    const createdSkills = await Skill.bulkCreate(skills, {
      ignoreDuplicates: true, // optional
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
      attributes: ["skillId", "skillName"],
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
    }

    // ✅ Step 2: Fetch all skills for that goal
    const skills = await Skill.findAll({
      where: { goalId },
      attributes: ["skillId", "skillName"],
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
