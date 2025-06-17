import Category from "../model/courseCategory.js";
import Skill from "../model/skill.js";
import sequelize from "../config/db.js";
import { Op } from "sequelize";
import Goal from "../model/goal.js";

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
      return res.status(400).json({
        message: "categoryName and categoryCode are required.",
        status: false,
      });
    }
    
    // Validate length constraints
    if (categoryName.length < 2 || categoryName.length > 100) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Category name must be between 2 and 100 characters.",
        status: false,
      });
    }
    
    if (categoryCode.length < 2 || categoryCode.length > 20) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Category code must be between 2 and 20 characters.",
        status: false,
      });
    }
    
    // Validate parentCategoryId format if provided
    if (parentCategoryId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(parentCategoryId)) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Invalid parent category ID format. Must be a valid UUID.",
        status: false,
      });
    }
    
    // Check if parent category exists
    if (parentCategoryId) {
      const parentCategory = await Category.findByPk(parentCategoryId, { transaction });
      if (!parentCategory) {
        await transaction.rollback();
        return res.status(404).json({
          message: "Parent category not found.",
          status: false,
        });
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
      return res.status(409).json({
        message:
          existing.categoryName === categoryName
            ? "Category with this name already exists."
            : "Category with this code already exists.",
        status: false,
      });
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
        return res.status(400).json({
          message: "Some skills are not available in the system.",
          status: false,
          unavailableSkills: newSkills,
        });
      }
    }

    await transaction.commit();

    return res.status(201).json({
      message: "Category created successfully.",
      status: true,
      data: newCategory,
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      message: "Internal server error.",
      status: false,
      error: error.message,
    });
  }
};

// Get all categories
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.findAll();
    return res.status(200).json({
      message: "Categories fetched successfully.",
      status: true,
      data: categories,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch categories.",
      status: false,
      error: error.message,
    });
  }
};

// Bulk upload categories
export const bulkCreateCategories = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { categories } = req.body; // Expecting an object with categories array

    if (!Array.isArray(categories) || categories.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Please send a non-empty array of categories.",
        status: false,
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
      return res.status(400).json({
        message: "Some skills are not available in the system.",
        status: false,
        unavailableSkills: newSkills,
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

    return res.status(201).json({
      message: "Categories and skills uploaded successfully.",
      status: true,
      data: {
        categories: insertedCategories,
        newSkillsCreated: newSkills.length,
        totalSkillsProcessed: allSkills.length,
      },
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({
      message: "Bulk insert failed.",
      status: false,
      error: error.message,
    });
  }
};

// Get category by ID
export const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found.",
        status: false,
      });
    }

    return res.status(200).json({
      message: "Category fetched.",
      status: true,
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch category.",
      status: false,
      error: error.message,
    });
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
      return res.status(404).json({
        message: "Category not found.",
        status: false,
      });
    }

    return res.status(200).json({
      message: "Category fetched.",
      status: true,
      data: category,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch category.",
      status: false,
      error: error.message,
    });
  }
};

// DELETE: Soft delete category by ID
export const deleteCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id);

    if (!category) {
      return res.status(404).json({
        message: "Category not found.",
        status: false,
      });
    }

    await category.destroy(); // Soft deletes (sets deletedAt)

    return res.status(200).json({
      message: "Category deleted successfully (soft delete).",
      status: true,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to delete category.",
      status: false,
      error: error.message,
    });
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
      return res.status(400).json({
        status: false,
        message: "Request body must be an array of categories or an object with a 'categories' array property"
      });
    }
    
    if (categories.length === 0) {
      return res.status(400).json({
        status: false,
        message: "Categories array cannot be empty"
      });
    }
    
    // Ensure the categories table exists
    try {
      await Category.sync({ alter: false });
    } catch (error) {
      console.error("Error with categories table:", error);
      await transaction.rollback();
      return res.status(500).json({
        status: false,
        message: "Database error: Categories table might not exist",
        error: error.message
      });
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
      return res.status(400).json({
        status: false,
        message: "Validation failed for one or more categories.",
        validationErrors
      });
    }
    
    // Create categories in bulk
    const createdCategories = await Category.bulkCreate(categoriesToCreate, {
      transaction,
      ignoreDuplicates: false // we already checked for duplicates
    });
    
    await transaction.commit();
    
    return res.status(201).json({
      status: true,
      message: "Categories created successfully",
      data: createdCategories
    });
    
  } catch (error) {
    await transaction.rollback();
    console.error("Bulk category upload error:", error);
    return res.status(500).json({
      status: false,
      message: "Failed to upload categories",
      error: error.message
    });
  }
};
