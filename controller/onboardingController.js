import User from "../model/user.js";
import Language from "../model/language.js";
import Goal from "../model/goal.js";
import Skill from "../model/skill.js";
import Exam from "../model/exam.js";
import UserLanguages from "../model/userLanguages.js";
import UserGoals from "../model/userGoals.js";
import UserSkills from "../model/userSkills.js";
import UserExams from "../model/userExams.js";
import sequelize from "../config/db.js";
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

    // Use a transaction to ensure atomicity
    const transaction = await sequelize.transaction();

    try {
      // Remove duplicate languageIds to avoid unique constraint violation
      const uniqueLanguageIds = [...new Set(languageIds)];

      const languageAssociations = uniqueLanguageIds.map((languageId, index) => {
        const originalIndex = languageIds.indexOf(languageId);
        return {
          userId,
          languageId,
          proficiencyLevel: proficiencyLevels && proficiencyLevels[originalIndex]
            ? proficiencyLevels[originalIndex]
            : 'intermediate'
        };
      });

      // Delete existing associations within transaction
      await UserLanguages.destroy({
        where: { userId: userId },
        transaction
      });

      // Insert new associations within transaction
      await UserLanguages.bulkCreate(languageAssociations, {
        transaction,
        ignoreDuplicates: true // This will ignore any duplicate key violations
      });

      await transaction.commit();

    } catch (error) {
      await transaction.rollback();
      throw error;
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

    // Remove duplicate goalIds to avoid unique constraint violation
    const uniqueGoalIds = [...new Set(goalIds)];

    const goals = await Goal.findAll({
      where: { goalId: { [Op.in]: uniqueGoalIds } },
    });

    if (goals.length !== uniqueGoalIds.length) {
      const foundGoalIds = goals.map(goal => goal.goalId);
      const missingGoalIds = uniqueGoalIds.filter(id => !foundGoalIds.includes(id));
      return res.status(400).json({
        status: false,
        message: "Some goal IDs are invalid",
        details: { missingGoalIds }
      });
    }

    // Use a transaction to ensure atomicity
    const transaction = await sequelize.transaction();
    try {
      // Remove existing associations within transaction
      await UserGoals.destroy({ where: { userId }, transaction });

      // Insert new associations within transaction
      const goalAssociations = uniqueGoalIds.map(goalId => ({
        userId,
        goalId
      }));

      await UserGoals.bulkCreate(goalAssociations, {
        transaction,
        ignoreDuplicates: true
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    return res.status(200).json({
      status: true,
      message: "Goals selected successfully",
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

    // Remove duplicate skillIds to avoid unique constraint violation
    const uniqueSkillIds = [...new Set(skillIds)];

    const skills = await Skill.findAll({
      where: { skillId: { [Op.in]: uniqueSkillIds } },
    });

    if (skills.length !== uniqueSkillIds.length) {
      const foundSkillIds = skills.map(skill => skill.skillId);
      const missingSkillIds = uniqueSkillIds.filter(id => !foundSkillIds.includes(id));
      return res.status(400).json({
        status: false,
        message: "Some skill IDs are invalid or not related to the selected goals",
        details: { missingSkillIds }
      });
    }

    // Use a transaction to ensure atomicity
    const transaction = await sequelize.transaction();
    try {
      // Remove existing associations within transaction
      await UserSkills.destroy({ where: { userId }, transaction });

      // Insert new associations within transaction
      let skillAssociations;
      if (proficiencyLevels) {
        skillAssociations = uniqueSkillIds.map((skillId, index) => {
          // Find the original index to get the correct proficiency level
          const originalIndex = skillIds.indexOf(skillId);
          return {
            userId,
            skillId,
            proficiencyLevel: proficiencyLevels[originalIndex]
          };
        });
      } else {
        skillAssociations = uniqueSkillIds.map(skillId => ({
          userId,
          skillId,
          proficiencyLevel: "intermediate"
        }));
      }

      await UserSkills.bulkCreate(skillAssociations, {
        transaction,
        ignoreDuplicates: true
      });

      user.isOnboarded = true;
      await user.save({ transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    return res.status(200).json({
      status: true,
      message: "Skills selected successfully",
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

// Select Exams
export const selectExams = async (req, res) => {
  try {
    const { userId } = req.user;
    const { examIds } = req.body;

    if (!examIds || !Array.isArray(examIds) || examIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: "examIds is required and must be a non-empty array",
      });
    }

    for (const examId of examIds) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(examId)) {
        return res.status(400).json({
          status: false,
          message: `Invalid examId format: ${examId}. Must be a valid UUID.`,
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

    // Remove duplicate examIds to avoid unique constraint violation
    const uniqueExamIds = [...new Set(examIds)];

    const exams = await Exam.findAll({
      where: { examId: { [Op.in]: uniqueExamIds } },
    });

    if (exams.length !== uniqueExamIds.length) {
      const foundExamIds = exams.map(exam => exam.examId);
      const missingExamIds = uniqueExamIds.filter(id => !foundExamIds.includes(id));
      return res.status(400).json({
        status: false,
        message: "Some exam IDs are invalid",
        details: { missingExamIds }
      });
    }

    // Use a transaction to ensure atomicity
    const transaction = await sequelize.transaction();
    try {
      // Remove existing associations within transaction
      await UserExams.destroy({ where: { userId }, transaction });

      // Insert new associations within transaction
      const examAssociations = uniqueExamIds.map(examId => ({
        userId,
        examId
      }));

      await UserExams.bulkCreate(examAssociations, {
        transaction,
        ignoreDuplicates: true
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    return res.status(200).json({
      status: true,
      message: "Exams selected successfully",
    });
  } catch (error) {
    console.error("Error selecting exams:", error);
    return res.status(500).json({
      status: false,
      message: "An error occurred",
      error: error.message,
    });
  }
};