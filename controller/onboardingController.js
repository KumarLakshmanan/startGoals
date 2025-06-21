import User from "../model/user.js";
import Language from "../model/language.js";
import Goal from "../model/goal.js";
import Skill from "../model/skill.js";
import UserLanguages from "../model/userLanguages.js";
import UserGoals from "../model/userGoals.js";
import UserSkills from "../model/userSkills.js";
import { Op } from "sequelize";

// Select Languages
export const selectLanguages = async (req, res) => {
  try {
    const { userId } = req.user;
    const { languageIds, proficiencyLevels } = req.body;

    if (!languageIds || !Array.isArray(languageIds) || languageIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: "languageIds is required and must be a non-empty array",
      });
    }

    for (const languageId of languageIds) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(languageId)) {
        return res.status(400).json({
          status: false,
          message: `Invalid languageId format: ${languageId}. Must be a valid UUID.`,
        });
      }
    }

    if (proficiencyLevels) {
      if (!Array.isArray(proficiencyLevels) || proficiencyLevels.length !== languageIds.length) {
        return res.status(400).json({
          status: false,
          message: "proficiencyLevels must be an array with the same length as languageIds",
        });
      }
      const validLevels = ["beginner", "intermediate", "advanced", "native"];
      for (const level of proficiencyLevels) {
        if (!validLevels.includes(level)) {
          return res.status(400).json({
            status: false,
            message: `Invalid proficiency level: ${level}. Must be one of: ${validLevels.join(', ')}`,
          });
        }
      }
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const languages = await Language.findAll({
      where: { languageId: { [Op.in]: languageIds } },
    });

    if (languages.length !== languageIds.length) {
      const foundLanguageIds = languages.map(lang => lang.languageId);
      const missingLanguageIds = languageIds.filter(id => !foundLanguageIds.includes(id));
      return res.status(400).json({
        status: false,
        message: "Some language IDs are invalid",
        details: { missingLanguageIds }
      });
    }

    // Remove existing associations
    await UserLanguages.destroy({ where: { userId } });

    // Insert new associations
    const languageAssociations = languageIds.map((languageId, index) => ({
      userId,
      languageId,
      proficiencyLevel: proficiencyLevels && proficiencyLevels[index] ? proficiencyLevels[index] : 'intermediate'
    }));

    await UserLanguages.bulkCreate(languageAssociations);

    return res.status(200).json({
      status: true,
      message: "Languages selected successfully",
    });
  } catch (error) {
    console.error("Error selecting languages:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

// Select Goals
export const selectGoals = async (req, res) => {
  try {
    const { userId } = req.user;
    const { goalIds } = req.body;

    if (!goalIds || !Array.isArray(goalIds) || goalIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: "goalIds is required and must be a non-empty array",
      });
    }

    for (const goalId of goalIds) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(goalId)) {
        return res.status(400).json({
          status: false,
          message: `Invalid goalId format: ${goalId}. Must be a valid UUID.`,
        });
      }
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const goals = await Goal.findAll({
      where: { goalId: { [Op.in]: goalIds } },
    });

    if (goals.length !== goalIds.length) {
      const foundGoalIds = goals.map(goal => goal.goalId);
      const missingGoalIds = goalIds.filter(id => !foundGoalIds.includes(id));
      return res.status(400).json({
        status: false,
        message: "Some goal IDs are invalid",
        details: { missingGoalIds }
      });
    }

    // Remove existing associations
    await UserGoals.destroy({ where: { userId } });

    // Insert new associations
    const goalAssociations = goalIds.map(goalId => ({
      userId,
      goalId
    }));

    await UserGoals.bulkCreate(goalAssociations);

    // Fetch skills related to the selected goals
    try {
      const skills = await Skill.findAll({
        where: { goalId: { [Op.in]: goalIds } },
      });

      return res.status(200).json({
        status: true,
        message: "Goals selected successfully",
        skills: skills,
      });
    } catch (skillsError) {
      console.error("Error fetching related skills:", skillsError);
      return res.status(200).json({
        status: true,
        message: "Goals selected successfully, but could not fetch related skills",
        warning: "Error fetching related skills: " + skillsError.message
      });
    }
  } catch (error) {
    console.error("Error selecting goals:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

// Select Skills
export const selectSkills = async (req, res) => {
  try {
    const { userId } = req.user;
    const { skillIds, proficiencyLevels } = req.body;

    if (!skillIds || !Array.isArray(skillIds) || skillIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: "skillIds is required and must be a non-empty array",
      });
    }

    for (const skillId of skillIds) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(skillId)) {
        return res.status(400).json({
          status: false,
          message: `Invalid skillId format: ${skillId}. Must be a valid UUID.`,
        });
      }
    }

    if (proficiencyLevels) {
      if (!Array.isArray(proficiencyLevels) || proficiencyLevels.length !== skillIds.length) {
        return res.status(400).json({
          status: false,
          message: "proficiencyLevels must be an array with the same length as skillIds",
        });
      }
      const validLevels = ["beginner", "intermediate", "advanced", "expert"];
      for (const level of proficiencyLevels) {
        if (!validLevels.includes(level)) {
          return res.status(400).json({
            status: false,
            message: `Invalid proficiency level: ${level}. Must be one of: ${validLevels.join(', ')}`,
          });
        }
      }
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const skills = await Skill.findAll({
      where: { skillId: { [Op.in]: skillIds } },
    });

    if (skills.length !== skillIds.length) {
      const foundSkillIds = skills.map(skill => skill.skillId);
      const missingSkillIds = skillIds.filter(id => !foundSkillIds.includes(id));
      return res.status(400).json({
        status: false,
        message: "Some skill IDs are invalid or not related to the selected goals",
        details: { missingSkillIds }
      });
    }

    // Remove existing associations
    await UserSkills.destroy({ where: { userId } });

    // Insert new associations
    let skillAssociations;
    if (proficiencyLevels) {
      skillAssociations = skillIds.map((skillId, index) => ({
        userId,
        skillId,
        proficiencyLevel: proficiencyLevels[index]
      }));
    } else {
      skillAssociations = skillIds.map(skillId => ({
        userId,
        skillId,
        proficiencyLevel: "intermediate"
      }));
    }

    await UserSkills.bulkCreate(skillAssociations);

    user.isOnboarded = true;
    await user.save();

    return res.status(200).json({
      status: true,
      message: "Skills selected and onboarding completed successfully",
    });
  } catch (error) {
    console.error("Error selecting skills:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};
