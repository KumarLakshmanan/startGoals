import Project from "../model/project.js";
import ProjectFile from "../model/projectFile.js";
import ProjectPurchase from "../model/projectPurchase.js";
import ProjectRating from "../model/projectRating.js";
import User from "../model/user.js";
import CourseCategory from "../model/courseCategory.js";
import CourseTag from "../model/courseTag.js";
import DiscountCode from "../model/discountCode.js";
import DiscountUsage from "../model/discountUsage.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";

// ===================== ADMIN PROJECT MANAGEMENT =====================

// Create new project (Admin only)
export const createProject = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const {
      title,
      description,
      shortDescription,
      price,
      salePrice,
      categoryId,
      tags,
      techStack,
      programmingLanguages,
      demoUrl,
      previewImages,
      requirements,
      features,
      compatibility,
      license,
      liveDemoUrl,
      documentationUrl,
      supportEmail,
      version,
      lastUpdated,
      difficulty,
      estimatedTime
    } = req.body;

    const userId = req.user.id; // From auth middleware

    // Validate required fields
    if (!title || !description || !price || !categoryId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Title, description, price and category are required"
      });
    }

    // Check if category exists
    const category = await CourseCategory.findByPk(categoryId);
    if (!category) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Category not found"
      });
    }

    // Create project
    const project = await Project.create({
      title,
      description,
      shortDescription,
      price: parseFloat(price),
      salePrice: salePrice ? parseFloat(salePrice) : null,
      categoryId,
      techStack: Array.isArray(techStack) ? techStack : [],
      programmingLanguages: Array.isArray(programmingLanguages) ? programmingLanguages : [],
      demoUrl,
      previewImages: Array.isArray(previewImages) ? previewImages : [],
      requirements: Array.isArray(requirements) ? requirements : [],
      features: Array.isArray(features) ? features : [],
      compatibility: Array.isArray(compatibility) ? compatibility : [],
      license: license || 'Regular License',
      liveDemoUrl,
      documentationUrl,
      supportEmail,
      version: version || '1.0.0',
      lastUpdated: lastUpdated || new Date(),
      difficulty: difficulty || 'intermediate',
      estimatedTime,
      createdBy: userId,
      status: 'draft'
    }, { transaction });    // Add tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagObjects = await CourseTag.findAll({
        where: { id: { [Op.in]: tags } }
      });
      await project.setProjectTags(tagObjects, { transaction });
    }

    await transaction.commit();

    // Fetch complete project with associations
    const completeProject = await Project.findByPk(project.id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"]
        },        {
          model: CourseCategory,
          as: "category",
          attributes: ["id", "title"]
        },
        {
          model: CourseTag,
          as: "projectTags",
          attributes: ["id", "title"],
          through: { attributes: [] }
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: "Project created successfully",
      data: completeProject
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Create project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create project",
      error: error.message
    });
  }
};

// Get all projects with filtering and pagination (Public)
export const getAllProjects = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status = 'published',
      difficulty,
      tags,
      programmingLanguages
    } = req.query;

    // Build where conditions
    const whereConditions = {
      status: status === 'all' ? { [Op.ne]: null } : status
    };

    if (category) {
      whereConditions.categoryId = category;
    }

    if (minPrice || maxPrice) {
      whereConditions.price = {};
      if (minPrice) whereConditions.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereConditions.price[Op.lte] = parseFloat(maxPrice);
    }

    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { shortDescription: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (difficulty) {
      whereConditions.difficulty = difficulty;
    }

    if (programmingLanguages) {
      const languages = Array.isArray(programmingLanguages) 
        ? programmingLanguages 
        : [programmingLanguages];
      whereConditions.programmingLanguages = {
        [Op.overlap]: languages
      };
    }

    // Include conditions
    const includeOptions = [
      {
        model: User,
        as: "creator",
        attributes: ["id", "firstName", "lastName", "profilePicture"]
      },      {
        model: CourseCategory,
        as: "category",
        attributes: ["id", "title"]
      },
      {
        model: CourseTag,
        as: "projectTags",
        attributes: ["id", "title"],
        through: { attributes: [] }
      },
      {
        model: ProjectRating,
        as: "ratings",
        attributes: ["rating"],
        where: { status: 'approved' },
        required: false
      }
    ];

    // Add tag filtering
    if (tags) {
      const tagIds = Array.isArray(tags) ? tags : [tags];
      includeOptions[2].where = { id: { [Op.in]: tagIds } };
      includeOptions[2].required = true;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: projects } = await Project.findAndCountAll({
      where: whereConditions,
      include: includeOptions,
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      distinct: true
    });

    // Calculate average ratings and format response
    const formattedProjects = projects.map(project => {
      const projectData = project.toJSON();
      const ratings = projectData.ratings || [];
      
      if (ratings.length > 0) {
        const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        projectData.averageRating = Math.round(avgRating * 10) / 10;
        projectData.totalRatings = ratings.length;
      } else {
        projectData.averageRating = 0;
        projectData.totalRatings = 0;
      }
      
      delete projectData.ratings; // Remove individual ratings from response
      return projectData;
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: formattedProjects,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Get all projects error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
      error: error.message
    });
  }
};

// Get single project by ID (Public)
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // Optional - for checking if user purchased

    const project = await Project.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email", "profilePicture", "bio"]
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["id", "title"]
        },        {
          model: CourseTag,
          as: "projectTags",
          attributes: ["id", "title"],
          through: { attributes: [] }
        },
        {
          model: ProjectFile,
          as: "files",
          attributes: ["id", "fileName", "fileType", "fileSize", "isPreview"],
          where: { isPreview: true },
          required: false
        },
        {
          model: ProjectRating,
          as: "ratings",
          attributes: ["id", "rating", "review", "createdAt"],
          where: { status: 'approved' },
          required: false,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "firstName", "lastName", "profilePicture"]
            }
          ]
        }
      ]
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Check if project is published or user is the creator
    if (project.status !== 'published' && project.createdBy !== userId) {
      return res.status(403).json({
        success: false,
        message: "Project not available"
      });
    }

    const projectData = project.toJSON();
    
    // Calculate average rating
    if (projectData.ratings && projectData.ratings.length > 0) {
      const avgRating = projectData.ratings.reduce((sum, r) => sum + r.rating, 0) / projectData.ratings.length;
      projectData.averageRating = Math.round(avgRating * 10) / 10;
      projectData.totalRatings = projectData.ratings.length;
    } else {
      projectData.averageRating = 0;
      projectData.totalRatings = 0;
    }

    // Check if user has purchased this project
    projectData.hasPurchased = false;
    if (userId) {
      const purchase = await ProjectPurchase.findOne({
        where: {
          userId,
          projectId: id,
          paymentStatus: 'completed'
        }
      });
      projectData.hasPurchased = !!purchase;
    }

    // Increment view count
    await project.increment('views');
    projectData.views = project.views + 1;

    res.json({
      success: true,
      data: projectData
    });

  } catch (error) {
    console.error("Get project by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch project",
      error: error.message
    });
  }
};

// Update project (Admin/Creator only)
export const updateProject = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const updateData = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Check if user is creator or admin
    if (project.createdBy !== userId && req.user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this project"
      });
    }

    // Update project
    await project.update(updateData, { transaction });

    // Update tags if provided
    if (updateData.tags && Array.isArray(updateData.tags)) {      const tagObjects = await CourseTag.findAll({
        where: { id: { [Op.in]: updateData.tags } }
      });
      await project.setProjectTags(tagObjects, { transaction });
    }

    await transaction.commit();

    // Fetch updated project with associations
    const updatedProject = await Project.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "email"]
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["id", "title"]        },
        {
          model: CourseTag,
          as: "projectTags",
          attributes: ["id", "title"],
          through: { attributes: [] }
        }
      ]
    });

    res.json({
      success: true,
      message: "Project updated successfully",
      data: updatedProject
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Update project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update project",
      error: error.message
    });
  }
};

// Delete project (Admin/Creator only)
export const deleteProject = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const project = await Project.findByPk(id);
    if (!project) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    // Check if user is creator or admin
    if (project.createdBy !== userId && req.user.role !== 'admin') {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this project"
      });
    }

    // Check if project has purchases (prevent deletion)
    const purchaseCount = await ProjectPurchase.count({
      where: { projectId: id }
    });

    if (purchaseCount > 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Cannot delete project with existing purchases. Consider setting status to 'inactive' instead."
      });
    }

    await project.destroy({ transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: "Project deleted successfully"
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Delete project error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete project",
      error: error.message
    });
  }
};

// ===================== PROJECT PURCHASE MANAGEMENT =====================

// Initiate project purchase
export const initiateProjectPurchase = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { projectId, discountCode } = req.body;
    const userId = req.user.id;

    // Validate project
    const project = await Project.findByPk(projectId);
    if (!project) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Project not found"
      });
    }

    if (project.status !== 'published') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "Project is not available for purchase"
      });
    }

    // Check if user already purchased
    const existingPurchase = await ProjectPurchase.findOne({
      where: {
        userId,
        projectId,
        paymentStatus: 'completed'
      }
    });

    if (existingPurchase) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: "You have already purchased this project"
      });
    }

    let finalPrice = project.salePrice || project.price;
    let discountAmount = 0;
    let discountCodeId = null;

    // Apply discount code if provided
    if (discountCode) {
      const discount = await DiscountCode.findOne({
        where: {
          code: discountCode.toUpperCase(),
          isActive: true,
          validFrom: { [Op.lte]: new Date() },
          validUntil: { [Op.gte]: new Date() }
        }
      });

      if (!discount) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Invalid or expired discount code"
        });
      }

      // Check usage limits
      if (discount.maxUses && discount.currentUses >= discount.maxUses) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: "Discount code usage limit exceeded"
        });
      }

      if (discount.maxUsesPerUser) {
        const userUsages = await DiscountUsage.count({
          where: { userId, discountCodeId: discount.id }
        });
        
        if (userUsages >= discount.maxUsesPerUser) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            message: "You have reached the usage limit for this discount code"
          });
        }
      }

      // Check minimum purchase amount
      if (discount.minPurchaseAmount && finalPrice < discount.minPurchaseAmount) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: `Minimum purchase amount of $${discount.minPurchaseAmount} required for this discount`
        });
      }

      // Apply discount
      if (discount.discountType === 'percentage') {
        discountAmount = (finalPrice * discount.discountValue) / 100;
      } else {
        discountAmount = discount.discountValue;
      }

      discountAmount = Math.min(discountAmount, finalPrice); // Don't exceed original price
      finalPrice = finalPrice - discountAmount;
      discountCodeId = discount.id;
    }

    // Create purchase record
    const purchase = await ProjectPurchase.create({
      userId,
      projectId,
      originalPrice: project.salePrice || project.price,
      discountAmount,
      finalPrice,
      discountCodeId,
      paymentStatus: 'pending',
      orderNumber: `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }, { transaction });

    await transaction.commit();

    res.status(201).json({
      success: true,
      message: "Purchase initiated successfully",
      data: {
        purchaseId: purchase.id,
        orderNumber: purchase.orderNumber,
        originalPrice: purchase.originalPrice,
        discountAmount: purchase.discountAmount,
        finalPrice: purchase.finalPrice,
        project: {
          id: project.id,
          title: project.title,
          previewImages: project.previewImages
        }
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Initiate purchase error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate purchase",
      error: error.message
    });
  }
};

// Complete project purchase (called by payment gateway webhook)
export const completeProjectPurchase = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { purchaseId, paymentId, paymentStatus } = req.body;

    const purchase = await ProjectPurchase.findByPk(purchaseId, {
      include: [
        { model: Project, as: "project" },
        { model: User, as: "user" },
        { model: DiscountCode, as: "discountCode" }
      ]
    });

    if (!purchase) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: "Purchase not found"
      });
    }

    // Update purchase status
    await purchase.update({
      paymentId,
      paymentStatus,
      completedAt: paymentStatus === 'completed' ? new Date() : null
    }, { transaction });

    // If payment completed successfully
    if (paymentStatus === 'completed') {
      // Update project sales count
      await purchase.project.increment('totalSales', { transaction });

      // Record discount usage if discount was applied
      if (purchase.discountCodeId) {
        await DiscountUsage.create({
          userId: purchase.userId,
          discountCodeId: purchase.discountCodeId,
          projectId: purchase.projectId,
          discountAmount: purchase.discountAmount,
          originalAmount: purchase.originalPrice,
          finalAmount: purchase.finalPrice
        }, { transaction });

        // Update discount code usage count
        await purchase.discountCode.increment('currentUses', { transaction });
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: "Purchase status updated successfully",
      data: purchase
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Complete purchase error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update purchase status",
      error: error.message
    });
  }
};

// Get user's purchased projects
export const getUserPurchases = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, status = 'completed' } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: purchases } = await ProjectPurchase.findAndCountAll({
      where: {
        userId,
        paymentStatus: status
      },
      include: [
        {
          model: Project,
          as: "project",
          attributes: ["id", "title", "shortDescription", "previewImages", "version", "lastUpdated"],
          include: [
            {
              model: User,
              as: "creator",
              attributes: ["id", "firstName", "lastName"]
            }
          ]
        },
        {
          model: DiscountCode,
          as: "discountCode",
          attributes: ["id", "code", "discountType", "discountValue"]
        }
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [['completedAt', 'DESC']]
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.json({
      success: true,
      data: purchases,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error("Get user purchases error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchases",
      error: error.message
    });
  }
};

// ===================== PROJECT STATISTICS =====================

// Get project statistics (Admin only)
export const getProjectStatistics = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
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

    // Total projects
    const totalProjects = await Project.count();
    
    // Published projects
    const publishedProjects = await Project.count({
      where: { status: 'published' }
    });

    // Total sales
    const totalSales = await ProjectPurchase.count({
      where: { paymentStatus: 'completed' }
    });

    // Revenue
    const revenueResult = await ProjectPurchase.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('finalPrice')), 'totalRevenue']
      ],
      where: { paymentStatus: 'completed' },
      raw: true
    });

    const totalRevenue = parseFloat(revenueResult[0]?.totalRevenue || 0);

    // Period-specific stats
    const periodSales = await ProjectPurchase.count({
      where: {
        paymentStatus: 'completed',
        completedAt: dateFilter
      }
    });

    const periodRevenueResult = await ProjectPurchase.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('finalPrice')), 'periodRevenue']
      ],
      where: {
        paymentStatus: 'completed',
        completedAt: dateFilter
      },
      raw: true
    });

    const periodRevenue = parseFloat(periodRevenueResult[0]?.periodRevenue || 0);

    // Top selling projects
    const topProjects = await Project.findAll({
      attributes: [
        'id', 'title', 'totalSales', 'price', 'salePrice',
        [sequelize.literal('(price * "totalSales")'), 'revenue']
      ],
      where: { status: 'published' },
      order: [['totalSales', 'DESC']],
      limit: 10,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["firstName", "lastName"]
        }
      ]
    });

    // Category-wise distribution
    const categoryStats = await Project.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('Project.id')), 'projectCount'],
        [sequelize.fn('SUM', sequelize.col('totalSales')), 'totalSales']
      ],
      include: [
        {
          model: CourseCategory,
          as: "category",
          attributes: ["id", "title"]
        }
      ],
      group: ['category.id', 'category.title'],
      order: [[sequelize.fn('COUNT', sequelize.col('Project.id')), 'DESC']]
    });

    res.json({
      success: true,
      data: {
        overview: {
          totalProjects,
          publishedProjects,
          totalSales,
          totalRevenue,
          periodSales,
          periodRevenue
        },
        topProjects,
        categoryDistribution: categoryStats,
        period
      }
    });

  } catch (error) {
    console.error("Get project statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch project statistics",
      error: error.message
    });
  }
};

export default {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  initiateProjectPurchase,
  completeProjectPurchase,
  getUserPurchases,
  getProjectStatistics
};
