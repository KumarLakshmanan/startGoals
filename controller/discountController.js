import DiscountCode from "../model/discountCode.js";
import DiscountUsage from "../model/discountUsage.js";
import Course from "../model/course.js";
import Project from "../model/project.js";
import CourseCategory from "../model/courseCategory.js";
import User from "../model/user.js";
import Enrollment from "../model/enrollment.js";
import ProjectPurchase from "../model/projectPurchase.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";

// ===================== ADMIN DISCOUNT CODE MANAGEMENT =====================

// Create new discount code (Admin only)
export const createDiscountCode = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      applicableType,
      minPurchaseAmount,
      maxUses,
      maxUsesPerUser,
      validFrom,
      validUntil,
      applicableCategories,
      isActive = true
    } = req.body;

    const userId = req.user.id;

    // Validate required fields
    if (!code || !discountType || !discountValue || !applicableType || !validFrom || !validUntil) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Code, discount type, value, applicable type, and validity dates are required"
      });
    }

    // Validate discount value
    if (discountValue <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Discount value must be greater than 0"
      });
    }

    if (discountType === 'percentage' && discountValue > 100) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Percentage discount cannot exceed 100%"
      });
    }

    // Check if code already exists
    const existingCode = await DiscountCode.findOne({
      where: { code: code.toUpperCase() }
    });

    if (existingCode) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Discount code already exists"
      });
    }

    // Validate dates
    const fromDate = new Date(validFrom);
    const untilDate = new Date(validUntil);

    if (fromDate >= untilDate) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Valid from date must be before valid until date"
      });
    }

    // Create discount code
    const discountCode = await DiscountCode.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue: parseFloat(discountValue),
      applicableType,
      minPurchaseAmount: minPurchaseAmount ? parseFloat(minPurchaseAmount) : null,
      maxUses: maxUses ? parseInt(maxUses) : null,
      maxUsesPerUser: maxUsesPerUser ? parseInt(maxUsesPerUser) : null,
      validFrom: fromDate,
      validUntil: untilDate,
      isActive,
      createdBy: userId,
      currentUses: 0
    }, { transaction });

    // Add applicable categories if provided
    if (applicableCategories && Array.isArray(applicableCategories) && applicableCategories.length > 0) {
      const categories = await CourseCategory.findAll({
        where: { id: { [Op.in]: applicableCategories } }
      });
      await discountCode.setApplicableCategories(categories, { transaction });
    }

    await transaction.commit();

    // Fetch complete discount code with associations
    const completeDiscountCode = await DiscountCode.findByPk(discountCode.id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"]
        },
        {
          model: CourseCategory,
          as: "applicableCategories",
          attributes: ["id", "title"],
          through: { attributes: [] }
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: "Discount code created successfully",
      data: completeDiscountCode
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Create discount code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create discount code",
      error: error.message
    });
  }
};

// Get all discount codes with filtering (Admin only)
export const getAllDiscountCodes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      applicableType,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    // Build where conditions
    const whereConditions = {};

    if (status === 'active') {
      whereConditions.isActive = true;
      whereConditions.validUntil = { [Op.gte]: new Date() };
    } else if (status === 'inactive') {
      whereConditions[Op.or] = [
        { isActive: false },
        { validUntil: { [Op.lt]: new Date() } }
      ];
    } else if (status === 'expired') {
      whereConditions.validUntil = { [Op.lt]: new Date() };
    }

    if (applicableType) {
      whereConditions.applicableType = applicableType;
    }

    if (search) {
      whereConditions[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: discountCodes } = await DiscountCode.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName"]
        },
        {
          model: CourseCategory,
          as: "applicableCategories",
          attributes: ["id", "title"],
          through: { attributes: [] }
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, sortOrder.toUpperCase()]]
    });

    // Add computed status to each discount code
    const formattedDiscountCodes = discountCodes.map(dc => {
      const dcData = dc.toJSON();
      const now = new Date();
      
      if (!dcData.isActive) {
        dcData.status = 'inactive';
      } else if (dcData.validUntil < now) {
        dcData.status = 'expired';
      } else if (dcData.validFrom > now) {
        dcData.status = 'scheduled';
      } else {
        dcData.status = 'active';
      }

      // Calculate usage percentage
      if (dcData.maxUses) {
        dcData.usagePercentage = (dcData.currentUses / dcData.maxUses) * 100;
      } else {
        dcData.usagePercentage = 0;
      }

      return dcData;
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: formattedDiscountCodes,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Get all discount codes error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch discount codes",
      error: error.message
    });
  }
};

// Get single discount code by ID (Admin only)
export const getDiscountCodeById = async (req, res) => {
  try {
    const { id } = req.params;

    const discountCode = await DiscountCode.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"]
        },
        {
          model: CourseCategory,
          as: "applicableCategories",
          attributes: ["id", "title"],
          through: { attributes: [] }
        },
        {
          model: DiscountUsage,
          as: "usages",
          attributes: ["id", "userId", "discountAmount", "originalAmount", "finalAmount", "createdAt"],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "firstName", "lastName", "email"]
            },
            {
              model: Course,
              as: "course",
              attributes: ["id", "title"],
              required: false
            },
            {
              model: Project,
              as: "project",
              attributes: ["id", "title"],
              required: false
            }
          ],
          order: [['createdAt', 'DESC']],
          limit: 50
        }
      ]
    });

    if (!discountCode) {
      return res.status(404).json({
        success: false,
        message: "Discount code not found"
      });
    }

    const dcData = discountCode.toJSON();
    const now = new Date();
    
    // Add computed status
    if (!dcData.isActive) {
      dcData.status = 'inactive';
    } else if (dcData.validUntil < now) {
      dcData.status = 'expired';
    } else if (dcData.validFrom > now) {
      dcData.status = 'scheduled';
    } else {
      dcData.status = 'active';
    }

    // Calculate usage statistics
    if (dcData.maxUses) {
      dcData.usagePercentage = (dcData.currentUses / dcData.maxUses) * 100;
    } else {
      dcData.usagePercentage = 0;
    }

    // Calculate total discount amount given
    const totalDiscountGiven = dcData.usages.reduce((sum, usage) => sum + parseFloat(usage.discountAmount), 0);
    dcData.totalDiscountGiven = totalDiscountGiven;

    res.json({
      success: true,
      data: dcData
    });

  } catch (error) {
    console.error("Get discount code by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch discount code",
      error: error.message
    });
  }
};

// Update discount code (Admin only)
export const updateDiscountCode = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const updateData = req.body;

    const discountCode = await DiscountCode.findByPk(id);
    if (!discountCode) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Discount code not found"
      });
    }

    // Validate dates if being updated
    if (updateData.validFrom || updateData.validUntil) {
      const fromDate = new Date(updateData.validFrom || discountCode.validFrom);
      const untilDate = new Date(updateData.validUntil || discountCode.validUntil);

      if (fromDate >= untilDate) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Valid from date must be before valid until date"
        });
      }
    }

    // Validate discount value if being updated
    if (updateData.discountValue !== undefined) {
      if (updateData.discountValue <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Discount value must be greater than 0"
        });
      }

      if (updateData.discountType === 'percentage' && updateData.discountValue > 100) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Percentage discount cannot exceed 100%"
        });
      }
    }

    // Update discount code
    await discountCode.update(updateData, { transaction });

    // Update applicable categories if provided
    if (updateData.applicableCategories !== undefined) {
      if (Array.isArray(updateData.applicableCategories) && updateData.applicableCategories.length > 0) {
        const categories = await CourseCategory.findAll({
          where: { id: { [Op.in]: updateData.applicableCategories } }
        });
        await discountCode.setApplicableCategories(categories, { transaction });
      } else {
        await discountCode.setApplicableCategories([], { transaction });
      }
    }

    await transaction.commit();

    // Fetch updated discount code with associations
    const updatedDiscountCode = await DiscountCode.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"]
        },
        {
          model: CourseCategory,
          as: "applicableCategories",
          attributes: ["id", "title"],
          through: { attributes: [] }
        }
      ]
    });

    res.json({
      success: true,
      message: "Discount code updated successfully",
      data: updatedDiscountCode
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Update discount code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update discount code",
      error: error.message
    });
  }
};

// Delete discount code (Admin only)
export const deleteDiscountCode = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;

    const discountCode = await DiscountCode.findByPk(id);
    if (!discountCode) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Discount code not found"
      });
    }

    // Check if discount code has been used
    const usageCount = await DiscountUsage.count({
      where: { discountCodeId: id }
    });

    if (usageCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot delete discount code that has been used. Consider deactivating it instead."
      });
    }

    await discountCode.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: "Discount code deleted successfully"
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Delete discount code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete discount code",
      error: error.message
    });
  }
};

// ===================== DISCOUNT CODE VALIDATION =====================

// Validate discount code for course/project purchase
export const validateDiscountCode = async (req, res) => {
  try {
    const { code, courseId, projectId, amount } = req.body;
    const userId = req.user.id;

    if (!code || !amount) {
      return res.status(400).json({
        success: false,
        message: "Discount code and amount are required"
      });
    }

    if (!courseId && !projectId) {
      return res.status(400).json({
        success: false,
        message: "Either course ID or project ID is required"
      });
    }

    // Find discount code
    const discountCode = await DiscountCode.findOne({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        validFrom: { [Op.lte]: new Date() },
        validUntil: { [Op.gte]: new Date() }
      },
      include: [
        {
          model: CourseCategory,
          as: "applicableCategories",
          attributes: ["id"],
          through: { attributes: [] }
        }
      ]
    });

    if (!discountCode) {
      return res.status(404).json({
        success: false,
        message: "Invalid or expired discount code"
      });
    }

    // Check usage limits
    if (discountCode.maxUses && discountCode.currentUses >= discountCode.maxUses) {
      return res.status(400).json({
        success: false,
        message: "Discount code usage limit exceeded"
      });
    }

    if (discountCode.maxUsesPerUser) {
      const userUsages = await DiscountUsage.count({
        where: { userId, discountCodeId: discountCode.id }
      });
      
      if (userUsages >= discountCode.maxUsesPerUser) {
        return res.status(400).json({
          success: false,
          message: "You have reached the usage limit for this discount code"
        });
      }
    }

    // Check minimum purchase amount
    if (discountCode.minPurchaseAmount && amount < discountCode.minPurchaseAmount) {
      return res.status(400).json({
        success: false,
        message: `Minimum purchase amount of $${discountCode.minPurchaseAmount} required`
      });
    }

    // Check applicable type and category
    let itemCategoryId = null;
    
    if (courseId) {
      if (discountCode.applicableType !== 'course' && discountCode.applicableType !== 'both') {
        return res.status(400).json({
          success: false,
          message: "This discount code is not applicable to courses"
        });
      }

      const course = await Course.findByPk(courseId, {
        attributes: ['categoryId']
      });

      if (!course) {
        return res.status(404).json({
          success: false,
          message: "Course not found"
        });
      }

      itemCategoryId = course.categoryId;
    }

    if (projectId) {
      if (discountCode.applicableType !== 'project' && discountCode.applicableType !== 'both') {
        return res.status(400).json({
          success: false,
          message: "This discount code is not applicable to projects"
        });
      }

      const project = await Project.findByPk(projectId, {
        attributes: ['categoryId']
      });

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found"
        });
      }

      itemCategoryId = project.categoryId;
    }

    // Check category restrictions
    if (discountCode.applicableCategories && discountCode.applicableCategories.length > 0) {
      const applicableCategoryIds = discountCode.applicableCategories.map(cat => cat.id);
      if (!applicableCategoryIds.includes(itemCategoryId)) {
        return res.status(400).json({
          success: false,
          message: "This discount code is not applicable to this category"
        });
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discountCode.discountType === 'percentage') {
      discountAmount = (amount * discountCode.discountValue) / 100;
    } else {
      discountAmount = discountCode.discountValue;
    }

    discountAmount = Math.min(discountAmount, amount); // Don't exceed original price
    const finalAmount = amount - discountAmount;

    res.json({
      success: true,
      message: "Discount code is valid",
      data: {
        discountCode: {
          id: discountCode.id,
          code: discountCode.code,
          description: discountCode.description,
          discountType: discountCode.discountType,
          discountValue: discountCode.discountValue
        },
        originalAmount: amount,
        discountAmount: discountAmount,
        finalAmount: finalAmount,
        savings: discountAmount
      }
    });

  } catch (error) {
    console.error("Validate discount code error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to validate discount code",
      error: error.message
    });
  }
};

// ===================== DISCOUNT USAGE ANALYTICS =====================

// Get discount usage statistics (Admin only)
export const getDiscountUsageStatistics = async (req, res) => {
  try {
    const { period = '30d', discountCodeId } = req.query;
    
    let dateFilter = {};
    const now = new Date();
    
    switch (period) {
      case '7d':
        dateFilter = { [Op.gte]: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        dateFilter = { [Op.gte]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case '90d':
        dateFilter = { [Op.gte]: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
        break;
      case '1y':
        dateFilter = { [Op.gte]: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
        break;
    }

    const whereConditions = {
      createdAt: dateFilter
    };

    if (discountCodeId) {
      whereConditions.discountCodeId = discountCodeId;
    }

    // Total usages and discount amount
    const totalUsages = await DiscountUsage.count({ where: whereConditions });
    
    const totalDiscountResult = await DiscountUsage.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('discountAmount')), 'totalDiscount']
      ],
      where: whereConditions,
      raw: true
    });

    const totalDiscountGiven = parseFloat(totalDiscountResult[0]?.totalDiscount || 0);

    // Usage by discount code
    const usageByCode = await DiscountUsage.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('DiscountUsage.id')), 'usageCount'],
        [sequelize.fn('SUM', sequelize.col('discountAmount')), 'totalDiscount']
      ],
      include: [
        {
          model: DiscountCode,
          as: "discountCode",
          attributes: ["id", "code", "description"]
        }
      ],
      where: whereConditions,
      group: ['discountCode.id', 'discountCode.code', 'discountCode.description'],
      order: [[sequelize.fn('COUNT', sequelize.col('DiscountUsage.id')), 'DESC']],
      limit: 10
    });

    // Usage by type (course vs project)
    const usageByType = await DiscountUsage.findAll({
      attributes: [
        [sequelize.literal(`CASE 
          WHEN "courseId" IS NOT NULL THEN 'course' 
          WHEN "projectId" IS NOT NULL THEN 'project' 
          ELSE 'other' 
        END`), 'type'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('discountAmount')), 'totalDiscount']
      ],
      where: whereConditions,
      group: [sequelize.literal(`CASE 
        WHEN "courseId" IS NOT NULL THEN 'course' 
        WHEN "projectId" IS NOT NULL THEN 'project' 
        ELSE 'other' 
      END`)],
      raw: true
    });

    // Daily usage trend
    const dailyUsage = await DiscountUsage.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('discountAmount')), 'totalDiscount']
      ],
      where: whereConditions,
      group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
      order: [[sequelize.fn('DATE', sequelize.col('createdAt')), 'ASC']],
      raw: true
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalUsages,
          totalDiscountGiven,
          period
        },
        usageByCode,
        usageByType,
        dailyTrend: dailyUsage
      }
    });

  } catch (error) {
    console.error("Get discount usage statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch discount usage statistics",
      error: error.message
    });
  }
};

// Get user's discount usage history
export const getUserDiscountHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: discountUsages } = await DiscountUsage.findAndCountAll({
      where: { userId },
      include: [
        {
          model: DiscountCode,
          as: "discountCode",
          attributes: ["id", "code", "description", "discountType", "discountValue"]
        },
        {
          model: Course,
          as: "course",
          attributes: ["id", "title", "thumbnailImage"],
          required: false
        },
        {
          model: Project,
          as: "project",
          attributes: ["id", "title", "previewImages"],
          required: false
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: discountUsages,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Get user discount history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch discount history",
      error: error.message
    });
  }
};

export default {
  createDiscountCode,
  getAllDiscountCodes,
  getDiscountCodeById,
  updateDiscountCode,
  deleteDiscountCode,
  validateDiscountCode,
  getDiscountUsageStatistics,
  getUserDiscountHistory
};
