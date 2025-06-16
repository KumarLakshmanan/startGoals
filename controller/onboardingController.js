// controller/onboardingController.js
import User from "../model/user.js";
import Language from "../model/language.js";
import Goal from "../model/goal.js";
import Skill from "../model/skill.js";

import { Op } from "sequelize";

export const selectLanguages = async (req, res) => {
  try {
    const { userId } = req.user;
    const { languageIds, proficiencyLevels } = req.body; // Array of language IDs and optional proficiency levels

    // Step 1: Find user by ID
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // Step 2: Validate languageIds exist
    const languages = await Language.findAll({
      where: {
        languageId: { [Op.in]: languageIds },
      },
    });

    if (languages.length !== languageIds.length) {
      return res.status(400).json({
        status: false,
        message: "Some language IDs are invalid",
      });
    }

    // Step 3: Remove any existing language associations
    await user.setLanguages([]);

    // Step 4: Associate the selected languages with the user with explicit proficiency levels
    const languageAssociations = languages.map((language, index) => {
      // If proficiencyLevels is provided and has a value for this language, use it
      // Otherwise default to 'intermediate'
      const proficiencyLevel = 
        proficiencyLevels && proficiencyLevels[index] 
          ? proficiencyLevels[index] 
          : 'intermediate';
      
      return {
        languageId: language.languageId,
        proficiencyLevel: proficiencyLevel
      };
    });

    await user.addLanguages(languages, { 
      through: languageAssociations 
    });

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

//selecting goals
export const selectGoals = async (req, res) => {
  try {
    const { userId } = req.user;
    const { goalIds } = req.body; // Array of goal IDs from the request body

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // Validate goalIds exist
    const goals = await Goal.findAll({
      where: {
        goalId: { [Op.in]: goalIds },
      },
    });

    if (goals.length !== goalIds.length) {
      return res.status(400).json({
        status: false,
        message: "Some goal IDs are invalid",
      });
    }

    // Associate the selected goals with the user
    await user.addGoals(goals);

    // Fetch skills related to the selected goals
    const skills = await Skill.findAll({
      where: { goalId: { [Op.in]: goalIds } },
    });

    return res.status(200).json({
      status: true,
      message: "Goals selected successfully",
      skills: skills,
    });
  } catch (error) {
    console.error("Error selecting goals:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};

//selected skills
export const selectSkills = async (req, res) => {
  try {
    const { userId } = req.user;

    const { skillIds } = req.body;

    // Validate skillIds array
    if (!skillIds || !Array.isArray(skillIds) || skillIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: "skillIds is required and must be a non-empty array",
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const skills = await Skill.findAll({
      where: {
        skillId: { [Op.in]: skillIds },
      },
    });

    if (skills.length !== skillIds.length) {
      return res.status(400).json({
        status: false,
        message:
          "Some skill IDs are invalid or not related to the selected goals",
      });
    }

    await user.addSkills(skills);

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
