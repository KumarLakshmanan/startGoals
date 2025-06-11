// controller/onboardingController.js
import User from "../model/user.js";
import Language from "../model/language.js";
import Goal from "../model/goal.js";
import Skill from "../model/skill.js";

import { Op } from "sequelize";
export const selectLanguages = async (req, res) => {
  try {
    const { userId } = req.user;
    const { languageIds } = req.body; // Array of language IDs from the request body

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

    // Step 3: Associate the selected languages with the user
    await user.setLanguages(languages);

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
export const selectGoal = async (req, res) => {
  try {
    const { userId } = req.user;
    const { goalId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const goal = await Goal.findByPk(goalId);
    if (!goal) {
      return res.status(400).json({
        status: false,
        message: "Invalid goal ID",
      });
    }

    user.goalId = goalId;
    await user.save();

    // Step 4: Fetch skills related to the selected goal
    const skills = await Skill.findAll({
      where: { goalId },
    });

    return res.status(200).json({
      status: true,
      message: "Goal selected successfully",
      skills: skills,
    });
  } catch (error) {
    console.error("Error selecting goal:", error);
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

    const { skillIds, goalId } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (user.goalId !== goalId) {
      return res.status(400).json({
        status: false,
        message: "Selected goal does not match the user's saved goal",
      });
    }

    const skills = await Skill.findAll({
      where: {
        skillId: { [Op.in]: skillIds },
        goalId,
      },
    });

    if (skills.length !== skillIds.length) {
      return res.status(400).json({
        status: false,
        message:
          "Some skill IDs are invalid or not related to the selected goal",
      });
    }

    await user.setSkills(skills);

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
