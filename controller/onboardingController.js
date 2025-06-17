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

    // Validate languageIds is an array
    if (!languageIds || !Array.isArray(languageIds) || languageIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: "languageIds is required and must be a non-empty array",
      });
    }

    // Validate all languageIds are valid UUIDs
    for (const languageId of languageIds) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(languageId)) {
        return res.status(400).json({
          status: false,
          message: `Invalid languageId format: ${languageId}. Must be a valid UUID.`,
        });
      }
    }

    // Validate proficiencyLevels if provided
    if (proficiencyLevels) {
      if (!Array.isArray(proficiencyLevels) || proficiencyLevels.length !== languageIds.length) {
        return res.status(400).json({
          status: false,
          message: "proficiencyLevels must be an array with the same length as languageIds",
        });
      }

      // Check each proficiency level is valid
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

    // Step 1: Find user by ID
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // Step 2: Validate languageIds exist in the database
    const languages = await Language.findAll({
      where: {
        languageId: { [Op.in]: languageIds },
      },
    });

    if (languages.length !== languageIds.length) {
      // Find which language IDs don't exist
      const foundLanguageIds = languages.map(lang => lang.languageId);
      const missingLanguageIds = languageIds.filter(id => !foundLanguageIds.includes(id));
      
      return res.status(400).json({
        status: false,
        message: "Some language IDs are invalid",
        details: {
          missingLanguageIds: missingLanguageIds
        }
      });
    }

    // Step 3: Remove any existing language associations
    await user.setLanguages([]);

    // Step 4: Associate the selected languages with the user with explicit proficiency levels
    try {
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
    } catch (associationError) {
      console.error("Error associating languages with user:", associationError);
      return res.status(500).json({
        status: false,
        message: "Error associating languages with user",
        error: associationError.message,
      });
    }

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

    // Validate goalIds is an array
    if (!goalIds || !Array.isArray(goalIds) || goalIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: "goalIds is required and must be a non-empty array",
      });
    }

    // Validate all goalIds are valid UUIDs
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

    // Validate goalIds exist
    const goals = await Goal.findAll({
      where: {
        goalId: { [Op.in]: goalIds },
      },
    });

    if (goals.length !== goalIds.length) {
      // Find which goal IDs don't exist
      const foundGoalIds = goals.map(goal => goal.goalId);
      const missingGoalIds = goalIds.filter(id => !foundGoalIds.includes(id));
      
      return res.status(400).json({
        status: false,
        message: "Some goal IDs are invalid",
        details: {
          missingGoalIds: missingGoalIds
        }
      });
    }

    // Associate the selected goals with the user
    try {
      await user.addGoals(goals);
    } catch (associationError) {
      console.error("Error associating goals with user:", associationError);
      return res.status(500).json({
        status: false,
        message: "Error associating goals with user",
        error: associationError.message,
      });
    }

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
      // We already added the goals, so just return success with a warning
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

//selected skills
export const selectSkills = async (req, res) => {
  try {
    const { userId } = req.user;
    const { skillIds, proficiencyLevels } = req.body;

    // Validate skillIds array
    if (!skillIds || !Array.isArray(skillIds) || skillIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: "skillIds is required and must be a non-empty array",
      });
    }

    // Validate all skillIds are valid UUIDs
    for (const skillId of skillIds) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(skillId)) {
        return res.status(400).json({
          status: false,
          message: `Invalid skillId format: ${skillId}. Must be a valid UUID.`,
        });
      }
    }

    // Validate proficiencyLevels if provided
    if (proficiencyLevels) {
      if (!Array.isArray(proficiencyLevels) || proficiencyLevels.length !== skillIds.length) {
        return res.status(400).json({
          status: false,
          message: "proficiencyLevels must be an array with the same length as skillIds",
        });
      }

      // Check each proficiency level is valid
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
      where: {
        skillId: { [Op.in]: skillIds },
      },
    });

    if (skills.length !== skillIds.length) {
      // Find which skill IDs don't exist
      const foundSkillIds = skills.map(skill => skill.skillId);
      const missingSkillIds = skillIds.filter(id => !foundSkillIds.includes(id));
      
      return res.status(400).json({
        status: false,
        message: "Some skill IDs are invalid or not related to the selected goals",
        details: {
          missingSkillIds: missingSkillIds
        }
      });
    }

    try {
      // If proficiency levels are provided, use them
      if (proficiencyLevels) {
        const skillAssociations = skills.map((skill, index) => {
          return {
            skillId: skill.skillId,
            proficiencyLevel: proficiencyLevels[index]
          };
        });

        await user.addSkills(skills, { 
          through: skillAssociations 
        });
      } else {
        // Use default proficiency level
        await user.addSkills(skills);
      }

      user.isOnboarded = true;
      await user.save();

      return res.status(200).json({
        status: true,
        message: "Skills selected and onboarding completed successfully",
      });
    } catch (associationError) {
      console.error("Error associating skills with user:", associationError);
      return res.status(500).json({
        status: false,
        message: "Error associating skills with user",
        error: associationError.message,
      });
    }
  } catch (error) {
    console.error("Error selecting skills:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};
