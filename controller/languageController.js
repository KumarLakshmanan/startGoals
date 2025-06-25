import { Op } from "sequelize";
import Language from "../model/language.js";
import { validateLanguageInput } from "../utils/commonUtils.js";
import sequelize from "../config/db.js";
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendServerError, sendConflict } from "../utils/responseHelper.js";

// ❌ DELETE: Soft delete
export const deleteCourseLanguage = async (req, res) => {
  try {
    const { id } = req.params;
    const language = await CourseLanguage.findByPk(id);
    if (!language) {
      return sendNotFound(res, "Language not found");
    }

    await language.destroy(); // Soft delete via `paranoid: true`
    return sendSuccess(res, 200, "Language deleted (soft)");
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const uploadLanguagesBulk = async (req, res) => {
  try {
    const { languages, options = {} } = req.body;

    // Default options
    const {
      skipDuplicates = true,
      updateExisting = false,
      validateAll = true,
    } = options;

    if (!Array.isArray(languages) || languages.length === 0) {
      return sendError(res, 400, "Languages data should be a non-empty array");
    } // Validate all languages if validateAll is true
    if (validateAll) {
      const validationErrors = [];
      languages.forEach((lang, index) => {
        const errors = validateLanguageInput(lang);
        if (errors.length > 0) {
          validationErrors.push({ index, language: lang.language, errors });
        }
      });

      if (validationErrors.length > 0) {
        return sendValidationError(res, validationErrors);
      }
    }

    // Check for existing languages
    const existing = await Language.findAll({
      where: {
        [Op.or]: [
          { languageCode: languages.map((lang) => lang.languageCode) },
          { language: languages.map((lang) => lang.language) },
        ],
      },
    });

    const existingCodes = existing.map((e) => e.languageCode);
    const existingNames = existing.map((e) => e.language);

    let languagesToProcess = [];
    let skippedLanguages = [];
    let updatedLanguages = [];

    for (const lang of languages) {
      const isDuplicate =
        existingCodes.includes(lang.languageCode) ||
        existingNames.includes(lang.language);

      if (isDuplicate) {
        if (updateExisting) {
          // Update existing language
          const existingLang = existing.find(
            (e) =>
              e.languageCode === lang.languageCode ||
              e.language === lang.language,
          );

          await existingLang.update({
            language: lang.language,
            languageCode: lang.languageCode,
            nativeName: lang.nativeName || null,
            languageType: lang.languageType || "both",
          });

          updatedLanguages.push(existingLang);
        } else if (skipDuplicates) {
          skippedLanguages.push(lang);
        } else {
          return sendConflict(res, `Duplicate language found: ${lang.language} (${lang.languageCode})`);
        }
      } else {
        languagesToProcess.push({
          language: lang.language,
          languageCode: lang.languageCode,
          nativeName: lang.nativeName || null,
          languageType: lang.languageType || "both",
        });
      }
    }

    // Bulk create new languages
    let createdLanguages = [];
    if (languagesToProcess.length > 0) {
      createdLanguages = await Language.bulkCreate(languagesToProcess, {
        validate: true,
      });
    }

    const response = {
      message: "Language operation completed successfully",
      status: true,
      summary: {
        total: languages.length,
        created: createdLanguages.length,
        updated: updatedLanguages.length,
        skipped: skippedLanguages.length,
      },
    };

    if (createdLanguages.length > 0) {
      response.created = createdLanguages;
    }

    if (updatedLanguages.length > 0) {
      response.updated = updatedLanguages;
    }

    if (skippedLanguages.length > 0) {
      response.skipped = skippedLanguages;
    }

    return sendSuccess(res, 200, response);
  } catch (error) {
    console.error("Bulk upload error:", error);
    return sendServerError(res, error);
  }
};

export const getAllLanguages = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, includeStats = false } = req.query;

    // Build where conditions
    const whereConditions = {};
    if (search) {
      whereConditions[Op.or] = [
        { language: { [Op.iLike]: `%${search}%` } },
        { languageCode: { [Op.iLike]: `%${search}%` } },
        { nativeName: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Calculate pagination
    const offset = (parseInt(page) - 1) * parseInt(limit); // Build query options
    const queryOptions = {
      where: whereConditions,
      attributes: [
        "languageId",
        "language",
        "languageCode",
        "nativeName",
        "languageType",
      ],
      limit: parseInt(limit),
      offset: offset,
    };

    const { count, rows: languages } =
      await Language.findAndCountAll(queryOptions);

    const response = {
      message: "Languages fetched successfully",
      data: languages,
      status: true,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    };

    if (includeStats === "true") {
      const stats = await Language.count({
        group: ["languageType"],
        attributes: ["languageType"],
      });
      response.stats = stats;
    }

    return sendSuccess(res, 200, response);
  } catch (error) {
    console.error("Error fetching languages:", error);
    return sendServerError(res, error);
  }
};

export const getLanguagesByType = async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ["user_preference", "course_language", "both"];

    if (!validTypes.includes(type)) {
      return sendError(res, 400, "Invalid language type. Must be one of: user_preference, course_language, both");
    }

    const languages = await Language.findAll({
      where: {
        languageType: {
          [Op.in]: type === "both" ? validTypes : [type, "both"],
        },
      },
      attributes: [
        "languageId",
        "language",
        "languageCode",
        "nativeName",
        "languageType",
      ],
      order: [["language", "ASC"]],
    });

    return sendSuccess(res, 200, {
      message: "Languages fetched successfully",
      data: languages,
      status: true,
    });
  } catch (error) {
    console.error("Error fetching languages by type:", error);
    return sendServerError(res, error);
  }
};

export const getLanguageStats = async (req, res) => {
  try {
    const stats = await Language.findAll({
      attributes: [
        "languageType",
        [sequelize.fn("COUNT", sequelize.col("languageId")), "count"],
      ],
      group: ["languageType"],
    });

    const totalCount = await Language.count();

    return sendSuccess(res, 200, {
      message: "Language statistics fetched successfully",
      data: {
        total: totalCount,
        byType: stats.reduce((acc, stat) => {
          acc[stat.languageType] = parseInt(stat.dataValues.count);
          return acc;
        }, {}),
      },
      status: true,
    });
  } catch (error) {
    console.error("Error fetching language statistics:", error);
    return sendServerError(res, error);
  }
};

export const saveAllLanguages = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const requestBody = req.body;
    let languages;
    
    // Handle both direct array and wrapper object formats
    if (Array.isArray(requestBody)) {
      languages = requestBody;
    } else if (requestBody.languages && Array.isArray(requestBody.languages)) {
      languages = requestBody.languages;
    } else {
      return sendError(res, 400, "Request body must be an array of languages or an object with a 'languages' array property");
    }
    
    if (languages.length === 0) {
      await transaction.rollback();
      return sendError(res, 400, "Languages array cannot be empty");
    }
    
    // Ensure the languages table exists
    try {
      await Language.sync({ alter: false });
    } catch (error) {
      console.error("Error with languages table:", error);
      await transaction.rollback();
      return sendServerError(res, error);
    }
    
    // Process languages
    const languagesToCreate = [];
    const validationErrors = [];
    
    for (let i = 0; i < languages.length; i++) {
      const lang = languages[i];
      
      // Validate required fields
      if (!lang.language || !lang.languageCode) {
        validationErrors.push({
          index: i,
          errors: ["Language name and code are required"]
        });
        continue;
      }
      
      // Check for existing languages with the same name or code
      const existing = await Language.findOne({
        where: {
          [Op.or]: [
            { language: lang.language },
            { languageCode: lang.languageCode }
          ]
        },
        transaction
      });
      
      if (existing) {
        validationErrors.push({
          index: i,
          errors: [
            existing.language === lang.language
              ? "Language with this name already exists."
              : "Language with this code already exists."
          ]
        });
        continue;
      }
      
      // Create language object
      const languageData = {
        language: lang.language,
        languageCode: lang.languageCode,
        nativeName: lang.nativeName || lang.language,
        languageType: lang.languageType || "both"
      };
      
      languagesToCreate.push(languageData);
    }
    
    // Return validation errors if any
    if (validationErrors.length > 0) {
      await transaction.rollback();
      return sendValidationError(res, validationErrors);
    }
    
    // Create languages in bulk
    const createdLanguages = await Language.bulkCreate(languagesToCreate, {
      transaction,
      ignoreDuplicates: false // we already checked for duplicates
    });
    
    await transaction.commit();
    
    return sendSuccess(res, 200, {
      status: true,
      message: "Languages created successfully",
      data: createdLanguages
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error("Bulk language upload error:", error);
    return sendServerError(res, error);
  }
};
