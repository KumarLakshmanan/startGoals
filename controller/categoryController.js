import Category from "../model/courseCategory.js";
import Skill from "../model/skill.js";
import sequelize from "../config/db.js";
import { Op } from "sequelize";
import Goal from "../model/goal.js";
import { sendSuccess, sendError, sendValidationError, sendNotFound, sendServerError, sendConflict } from "../utils/responseHelper.js";

// Create a new category with skills
export const createCategory = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      categoryName,
      categoryCode,
      description,
      parentCategoryId,
      skills,
    } = req.body;

    // Validate required fields
    if (!categoryName || !categoryCode) {
      await transaction.rollback();
      return sendValidationError(res, "Missing required fields", {
        categoryName: !categoryName ? "Category name is required" : undefined,
        categoryCode: !categoryCode ? "Category code is required" : undefined
      });
    }
    
    // Validate length constraints
    if (categoryName.length < 2 || categoryName.length > 100) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid category name length", {
        categoryName: "Category name must be between 2 and 100 characters"
      });
    }
    
    if (categoryCode.length < 2 || categoryCode.length > 20) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid category code length", {
        categoryCode: "Category code must be between 2 and 20 characters"
      });
    }
    
    // Validate parentCategoryId format if provided
    if (parentCategoryId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parentCategoryId)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid parent category ID format", {
        parentCategoryId: "Invalid parent category ID format. Must be a valid UUID"
      });
    }
    
    // Check if parent category exists
    if (parentCategoryId) {
      const parentCategory = await Category.findByPk(parentCategoryId, { transaction });
      if (!parentCategory) {
        await transaction.rollback();
        return sendNotFound(res, "Parent category not found", { parentCategoryId });
      }
    }

    const existing = await Category.findOne({
      where: {
        [Op.or]: [
          { categoryCode: categoryCode },
          { categoryName: categoryName },
        ],
      },
      transaction,
    });

    if (existing) {
      await transaction.rollback();
      return sendConflict(res, 
        existing.categoryName === categoryName ? "categoryName" : "categoryCode", 
        existing.categoryName === categoryName ? categoryName : categoryCode
      );
    }

    // Create the category
    const newCategory = await Category.create(
      {
        categoryName,
        categoryCode,
        description,
        parentCategoryId,
      },
      { transaction },
    );

    // Process skills if provided
    if (skills && Array.isArray(skills) && skills.length > 0) {
      // Get default goal for skills or create one if needed
      let defaultGoal = await Goal.findOne({
        where: {
          goalName: "Default",
        },
        transaction,
      });

      if (!defaultGoal) {
        defaultGoal = await Goal.create(
          {
            goalName: "Default",
            description: "Default goal for system-created skills",
            status: "active",
          },
          { transaction },
        );
      }

      // Check existing skills
      const existingSkills = await Skill.findAll({
        where: {
          skillName: {
            [Op.in]: skills,
          },
        },
        transaction,
      });

      const existingSkillNames = existingSkills.map((skill) => skill.skillName);
      // Find skills that need to be created
      const newSkills = skills.filter(
        (skill) => !existingSkillNames.includes(skill),
      );

      if (newSkills.length > 0) {
        // Don't create missing skills, show error message instead
        await transaction.rollback();
        return sendValidationError(res, "Some skills are not available in the system", {
          skills: "Some skills are not available in the system",
          unavailableSkills: newSkills
        });
      }
    }

    await transaction.commit();

    return sendSuccess(res, 201, "Category created successfully", newCategory);
  } catch (error) {
    await transaction.rollback();
    return sendServerError(res, error);
  }
};

// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    return sendSuccess(res, 200, "Categories fetched successfully", categories);
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Bulk upload categories
export const bulkCreateCategories = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { categories } = req.body; // Expecting an object with categories array

    if (!Array.isArray(categories) || categories.length === 0) {
      await transaction.rollback();
      return sendValidationError(res, "Please send a non-empty array of categories", {
        categories: "Please send a non-empty array of categories"
      });
    }

    // Get default goal for skills or create one if needed
    let defaultGoal = await Goal.findOne({
      where: {
        goalName: "Default",
      },
      transaction,
    });

    if (!defaultGoal) {
      defaultGoal = await Goal.create(
        {
          goalName: "Default",
          description: "Default goal for system-created skills",
          status: "active",
        },
        { transaction },
      );
    }

    // Collect all skills from all categories
    const allSkills = categories.reduce((acc, category) => {
      if (category.skills && Array.isArray(category.skills)) {
        return [...acc, ...category.skills];
      }
      return acc;
    }, []);

    // Check which skills already exist
    const existingSkills = await Skill.findAll({
      where: {
        skillName: {
          [Op.in]: allSkills,
        },
      },
      transaction,
    });

    const existingSkillNames = existingSkills.map((skill) => skill.skillName);
    // Find skills that need to be created
    const newSkills = allSkills.filter(
      (skill) => !existingSkillNames.includes(skill),
    );

    if (newSkills.length > 0) {
      // Don't create missing skills, show error message instead
      await transaction.rollback();
      return sendValidationError(res, "Some skills are not available in the system.", {
        unavailableSkills: newSkills
      });
    }

    // Prepare category data
    const categoriesToInsert = categories.map((cat) => ({
      categoryName: cat.name,
      categoryCode: cat.code,
      description: cat.description,
      parentCategoryId: cat.parentCategoryId || null,
    }));

    // Insert categories
    const insertedCategories = await Category.bulkCreate(categoriesToInsert, {
      ignoreDuplicates: true,
      transaction,
    });

    await transaction.commit();

    return sendSuccess(res, 200, "Categories and skills uploaded successfully.", {
      categories: insertedCategories,
      newSkillsCreated: newSkills.length,
      totalSkillsProcessed: allSkills.length,
    });
  } catch (error) {
    await transaction.rollback();
    return sendServerError(res, error);
  }
};

// Get category by ID
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);

    if (!category) {
      return sendNotFound(res, "Category not found.", { id });
    }

    return sendSuccess(res, 200, "Category fetched.", category);
  } catch (error) {
    return sendServerError(res, error);
  }
};

// Get category by code
export const getCategoryByCode = async (req, res) => {
  try {
    const { code } = req.params;

    const category = await Category.findOne({
      where: { categoryCode: code.toUpperCase() },
    });

    if (!category) {
      return sendNotFound(res, "Category not found.", { code });
    }

    return sendSuccess(res, 200, "Category fetched.", category);
  } catch (error) {
    return sendServerError(res, error);
  }
};

// DELETE: Soft delete category by ID
export const deleteCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      return sendNotFound(res, "Category not found.", { id });
    }

    await category.destroy(); // Soft deletes (sets deletedAt)

    return sendSuccess(res, 200, "Category deleted successfully (soft delete).");
  } catch (error) {
    return sendServerError(res, error);
  }
};

export const saveAllCategories = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const requestBody = req.body;
    let categories;
    
    // Handle both direct array and wrapper object formats
    if (Array.isArray(requestBody)) {
      categories = requestBody;
    } else if (requestBody.categories && Array.isArray(requestBody.categories)) {
      categories = requestBody.categories;
    } else {
      await transaction.rollback();
      return sendValidationError(res, "Request body must be an array of categories or an object with a 'categories' array property");
    }
    
    if (categories.length === 0) {
      await transaction.rollback();
      return sendValidationError(res, "Categories array cannot be empty");
    }
    
    // Ensure the categories table exists
    try {
      await Category.sync({ alter: false });
    } catch (error) {
      await transaction.rollback();
      return sendServerError(res, error);
    }
    
    // Process categories
    const categoriesToCreate = [];
    const validationErrors = [];
    
    for (let i = 0; i < categories.length; i++) {
      const category = categories[i];
      
      // Validate required fields
      if (!category.name || !category.code) {
        validationErrors.push({
          index: i,
          errors: ["Category name and code are required"]
        });
        continue;
      }
      
      // Check for existing categories with the same name or code
      const existing = await Category.findOne({
        where: {
          [Op.or]: [
            { categoryName: category.name },
            { categoryCode: category.code }
          ]
        },
        transaction
      });
      
      if (existing) {
        validationErrors.push({
          index: i,
          errors: [
            existing.categoryName === category.name
              ? "Category with this name already exists."
              : "Category with this code already exists."
          ]
        });
        continue;
      }
      
      // Create category object
      const categoryData = {
        categoryName: category.name,
        categoryCode: category.code,
        description: category.description || null,
        parentCategoryId: category.parentCategoryId || null,
        icon: category.icon || null,
        displayOrder: category.displayOrder || 0
      };
      
      categoriesToCreate.push(categoryData);
    }
    
    // Return validation errors if any
    if (validationErrors.length > 0) {
      await transaction.rollback();
      return sendValidationError(res, "Validation failed for one or more categories.", { validationErrors });
    }
    
    // Create categories in bulk
    const createdCategories = await Category.bulkCreate(categoriesToCreate, {
      transaction,
      ignoreDuplicates: false // we already checked for duplicates
    });
    
    await transaction.commit();
    
    return sendSuccess(res, 200, "Categories created successfully", createdCategories);
    
  } catch (error) {
    await transaction.rollback();
    return sendServerError(res, error);
  }
};
