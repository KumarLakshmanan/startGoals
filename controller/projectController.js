import Project from "../model/project.js";
import ProjectFile from "../model/projectFile.js";
import ProjectPurchase from "../model/projectPurchase.js";
import ProjectRating from "../model/projectRating.js";
import ProjectSettings from "../model/projectSettings.js";
import User from "../model/user.js";
import Category from "../model/category.js";

import CourseLevel from "../model/courseLevel.js";
import Goal from "../model/goal.js";
import Skill from "../model/skill.js";
import Language from "../model/language.js";
import DiscountCode from "../model/discountCode.js";
import DiscountUsage from "../model/discountUsage.js";
import ProjectGoal from "../model/projectGoal.js";
import ProjectTechStack from "../model/projectTechStack.js";
import ProjectLanguage from "../model/projectLanguage.js";
import ProjectInstructor from "../model/projectInstructor.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendServerError,
  sendConflict,
} from "../utils/responseHelper.js";

// ===================== COMPREHENSIVE PROJECT MANAGEMENT =====================

// Create new project (Admin only)
export const createProject = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      title,
      description,
      shortDescription,
      price,
      categoryId,
      levelId,
      languageId,
      techStack = [],
      goals = [],
      requirements,
      features,
      whatYouGet,
      demoUrl,
      previewVideo,
      coverImage,
      screenshots = [],
      supportEmail,
      supportIncluded = false,
      supportDuration,
      version = "1.0",
      licenseType = "personal",
      discountEnabled = true,
      featured = false,
      status = "draft",
    } = req.body;

    const userId = req.user.userId; // From auth middleware

    // Validate required fields - making only these fields required
    if (!title || !description || !categoryId || !levelId) {
      await transaction.rollback();
      return sendValidationError(res, "Missing required fields", {
        title: !title ? "Title is required" : undefined,
        description: !description ? "Description is required" : undefined,
        categoryId: !categoryId ? "Category is required" : undefined,
        levelId: !levelId ? "Level is required" : undefined,
      });
    }

    // Validate title length
    if (title.length < 3 || title.length > 200) {
      await transaction.rollback();
      return sendValidationError(res, "Title must be between 3 and 200 characters", {
        title: "Title must be between 3 and 200 characters"
      });
    }

    // Validate description length
    if (description.length < 10) {
      await transaction.rollback();
      return sendValidationError(res, "Description must be at least 10 characters", {
        description: "Description must be at least 10 characters"
      });
    }

    // Validate shortDescription if provided
    if (shortDescription && shortDescription.length > 500) {
      await transaction.rollback();
      return sendValidationError(res, "Short description cannot exceed 500 characters", {
        shortDescription: "Short description cannot exceed 500 characters"
      });
    }

    // Validate price
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue < 0) {
      await transaction.rollback();
      return sendValidationError(res, "Price must be a valid non-negative number", {
        price: "Price must be a valid non-negative number"
      });
    }

    // Validate supportDuration if supportIncluded is true
    if (supportIncluded && (!supportDuration || supportDuration < 0)) {
      await transaction.rollback();
      return sendValidationError(res, "Valid support duration is required when support is included", {
        supportDuration: "Valid support duration is required when support is included"
      });
    }    // Validate UUID format for IDs
    const validateUUID = (id, field) => {
      if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        throw new Error(`Invalid ${field} format: ${id}. Must be a valid UUID.`);
      }
    };

    try {
      validateUUID(categoryId, "categoryId");
      validateUUID(levelId, "levelId");
      if (languageId) validateUUID(languageId, "languageId");
    } catch (error) {
      await transaction.rollback();
      return sendValidationError(res, error.message, {
        [error.message.split(" ")[1].toLowerCase()]: error.message
      });
    }

    // Check if category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      await transaction.rollback();
      return sendNotFound(res, "Category not found", {
        categoryId: "Category not found"
      });
    }

    // Check if level exists
    const level = await CourseLevel.findByPk(levelId);
    if (!level) {
      await transaction.rollback();
      return sendNotFound(res, "Level not found", {
        levelId: "Level not found"
      });
    }

    // Check if language exists if provided
    if (languageId) {
      const language = await Language.findByPk(languageId);
      if (!language) {
        await transaction.rollback();
        return sendNotFound(res, "Language not found", {
          languageId: "Language not found"
        });
      }
    }

    const project = await Project.create(
      {
        title,
        description,
        shortDescription: shortDescription || null,
        price: price ? parseFloat(price) : 0,
        categoryId,
        levelId,
        languageId: languageId || null,
        coverImage: coverImage || null,
        previewVideo: previewVideo || null,
        demoUrl: demoUrl || null,
        screenshots: Array.isArray(screenshots) ? screenshots : [],
        requirements: requirements || null,
        features: features || null,
        whatYouGet: whatYouGet || null,
        supportEmail: supportEmail || null,
        supportIncluded: supportIncluded || false,
        supportDuration: supportIncluded ? (supportDuration || 30) : null,
        licenseType: licenseType || 'personal',
        version: version || '1.0',
        discountEnabled: discountEnabled ?? true,
        featured: featured || false,
        status: status || 'draft',
        createdBy: userId,
      },
      { transaction }
    );
    // Add tech stack if provided
    if (techStack && techStack.length > 0) {
      const techStackPromises = techStack.map(async (skillId) => {
        try {
          validateUUID(skillId, "skillId");
          const skill = await Skill.findByPk(skillId);
          if (skill) {
            await ProjectTechStack.create({
              projectId: project.projectId,
              skillId
            }, { transaction });
          }
        } catch (error) {
          console.warn(`Error adding tech stack skill ${skillId}: ${error.message}`);
        }
      });
      await Promise.all(techStackPromises);
    }

    // Add goals if provided
    if (goals && goals.length > 0) {
      const goalPromises = goals.map(async (goalId) => {
        try {
          validateUUID(goalId, "goalId");
          const goal = await Goal.findByPk(goalId);
          if (goal) {
            await ProjectGoal.create({
              projectId: project.projectId,
              goalId
            }, { transaction });
          }
        } catch (error) {
          console.warn(`Error adding goal ${goalId}: ${error.message}`);
        }
      });
      await Promise.all(goalPromises);
    }
    await transaction.commit();

    // Fetch complete project with associations
    const completeProject = await Project.findByPk(project.id, {
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: ProjectTechStack,
          as: "techStack",
          attributes: ["skillId"],
          include: [
            {
              model: Skill,
              as: "skill",
              attributes: ["skillId", "skillName"],
            },
          ],
        },
      ],
    });

    return sendSuccess(res, "Project created successfully", completeProject);
  } catch (error) {
    await transaction.rollback();
    console.error("Create project error:", error);
    return sendServerError(res, error);
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
      sortBy = "createdAt",
      sortOrder = "DESC",
      status,
      difficulty,
    } = req.query;

    const userId = req.user?.userId; // Get user ID from auth token if available

    // Build where conditions
    const whereConditions = {};
    if (typeof status !== "undefined") {
      whereConditions.status = status === "all" ? { [Op.ne]: null } : status;
    }

    if (category) {
      whereConditions.categoryId = category;
    }

    if (minPrice || maxPrice) {
      whereConditions.price = {};
      if (minPrice) whereConditions.price[Op.gte] = parseFloat(minPrice);
      if (maxPrice) whereConditions.price[Op.lte] = parseFloat(maxPrice);
    }

    if (search) {
      const likeOperator = Op.iLike || Op.like;
      whereConditions[Op.or] = [
        { title: { [likeOperator]: `%${search}%` } },
        { description: { [likeOperator]: `%${search}%` } },
        { shortDescription: { [likeOperator]: `%${search}%` } },
      ];
    }

    if (difficulty) {
      whereConditions.difficulty = difficulty;
    }

    // Include conditions
    const includeOptions = [
      {
        model: Category,
        as: "category",
        attributes: ["categoryId", "categoryName"],
      },
      {
        model: ProjectRating,
        as: "ratings",
        attributes: ["rating"],
        where: { moderationStatus: "approved" },
        required: false,
      },
      {
        model: ProjectTechStack,
        as: "techStack",
        attributes: ["skillId"],
        include: [
          {
            model: Skill,
            as: "skill",
            attributes: ["skillId", "skillName"],
          },
        ],
        required: false,
      },
      {
        model: ProjectGoal,
        as: "goals",
      },
      {
        model: ProjectLanguage,
        as: "projectLanguages",
        include: [
          {
            model: Language,
            as: "language",
            attributes: ["languageId", "language", "languageCode"],
          },
        ],
      },
      {
        model: ProjectInstructor,
        as: "projectInstructors",
        include: [
          {
            model: User,
            as: "instructor",
            attributes: ["userId", "username", "email", "profileImage"],
          },
        ],
      },
    ];

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: projects } = await Project.findAndCountAll({
      where: whereConditions,
      include: includeOptions,
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
      distinct: true,
    });

    // Calculate average ratings and format response
    const formattedProjects = projects.map((project) => {
      const projectData = project.toJSON();
      const ratings = projectData.ratings || [];

      if (ratings.length > 0) {
        const avgRating =
          ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
        projectData.averageRating = Math.round(avgRating * 10) / 10;
        projectData.totalRatings = ratings.length;
      } else {
        projectData.averageRating = 0;
        projectData.totalRatings = 0;
      }

      // Format instructors array
      projectData.instructors = projectData.projectInstructors?.map(pi => ({
        ...pi.instructor,
        isPrimary: pi.isPrimary,
        assignedAt: pi.createdAt
      })) || [];
      delete projectData.projectInstructors;
      
      // Format languages array
      projectData.languages = projectData.projectLanguages?.map(pl => pl.language) || [];
      delete projectData.projectLanguages;

      delete projectData.ratings; // Remove individual ratings from response
      return projectData;
    });

    // Get purchase status for each project if user is authenticated
    let userPurchases = [];
    if (userId) {
      const userProjectPurchases = await ProjectPurchase.findAll({
        where: {
          userId,
          paymentStatus: 'completed', // Use correct field name
          projectId: { [Op.in]: formattedProjects.map(project => project.projectId) }
        }
      });

      userPurchases = userProjectPurchases.map(purchase => purchase.projectId);
    }

    // Add purchase status to each project
    const projectsWithPurchaseStatus = formattedProjects.map(project => ({
      ...project,
      purchaseStatus: userId ? userPurchases.includes(project.projectId) : false
    }));

    const totalPages = Math.ceil(count / parseInt(limit));

    return sendSuccess(res, "Projects fetched successfully", {
      projects: projectsWithPurchaseStatus,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get all projects error:", error);
    return sendServerError(res, error);
  }
};

// Get single project by ID (Public)
export const getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    const project = await Project.findByPk(id, {
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: ProjectFile,
          as: "files",
          attributes: ["fileId", "fileName", "fileType", "fileSize", "fileUrl"],
          required: false,
        },
        {
          model: ProjectRating,
          as: "ratings",
          attributes: ["ratingId", "rating", "review", "createdAt"],
          required: false,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["userId", "username", "profileImage"],
            },
          ],
        },
        {
          model: ProjectTechStack,
          as: "techStack",
          attributes: ["skillId"],
          include: [
            {
              model: Skill,
              as: "skill",
              attributes: ["skillId", "skillName"],
            },
          ],
        },
        {
          model: ProjectGoal,
          as: "goals",
          attributes: ["goalId"],
          include: [
            {
              model: Goal,
              as: "goal",
              attributes: ["goalId", "goalName", "description"],
            },
          ],
        },
        {
          model: ProjectLanguage,
          as: "projectLanguages",
          include: [
            {
              model: Language,
              as: "language",
              attributes: ["languageId", "language", "languageCode"],
            },
          ],
        },
        {
          model: ProjectInstructor,
          as: "projectInstructors",
          include: [
            {
              model: User,
              as: "instructor",
              attributes: ["userId", "username", "email", "profileImage"],
            },
          ],
        },
      ],
    });

    if (!project) {
      return sendNotFound(res, "Project is not found");
    }

    const projectData = project.toJSON();

    // Format instructors array
    projectData.instructors = projectData.projectInstructors?.map(pi => ({
      ...pi.instructor,
      isPrimary: pi.isPrimary,
      assignedAt: pi.createdAt
    })) || [];
    delete projectData.projectInstructors;
    
    // Format languages array
    projectData.languages = projectData.projectLanguages?.map(pl => pl.language) || [];
    delete projectData.projectLanguages;

    // Calculate average rating
    if (projectData.ratings && projectData.ratings.length > 0) {
      const avgRating =
        projectData.ratings.reduce((sum, r) => sum + r.rating, 0) /
        projectData.ratings.length;
      projectData.averageRating = Math.round(avgRating * 10) / 10;
      projectData.totalRatings = projectData.ratings.length;
    } else {
      projectData.averageRating = 0;
      projectData.totalRatings = 0;
    }

    // Check if user has purchased this project
    if (userId) {
      const purchase = await ProjectPurchase.findOne({
        where: {
          userId,
          projectId: id,
          paymentStatus: "completed", // Use correct field name
        },
      });
      projectData.purchaseStatus = !!purchase;
    } else {
      projectData.purchaseStatus = false;
    }
    if (req.user.role == "student") {
      // Add recommended projects by same category
      const recommendedProjects = await Project.findAll({
        where: {
          categoryId: project.categoryId,
          projectId: { [Op.ne]: id }, // Exclude current project
          status: 'published'
        },
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["categoryId", "categoryName"],
          },
        ],
        limit: 5,
        order: [['createdAt', 'DESC']]
      });

      projectData.recommendedProjects = recommendedProjects;
    }

    return sendSuccess(res, "Project fetched successfully", projectData);
  } catch (error) {
    console.error("Get project by ID error:", error);
    return sendServerError(res, error);
  }
};


// Update project (Admin/Creator only)
export const updateProject = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const updateData = req.body;

    const project = await Project.findByPk(id);
    if (!project) {
      await transaction.rollback();
      return sendNotFound(res, "Project not found");
    }

    // Check if user is creator or admin
    if (project.createdBy !== userId && req.user.role !== "admin") {
      await transaction.rollback();
      return sendError(res, 403, "Not authorized to update this project");
    }

    // Update project
    await project.update(updateData, { transaction });

    await transaction.commit();

    // Fetch updated project with associations
    const updatedProject = await Project.findByPk(id, {
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
        {
          model: ProjectTechStack,
          as: "techStack",
          attributes: ["skillId"],
          include: [
            {
              model: Skill,
              as: "skill",
              attributes: ["skillId", "skillName"],
            },
          ],
        },
      ],
    });

    return sendSuccess(res, "Project updated successfully", updatedProject);
  } catch (error) {
    await transaction.rollback();
    console.error("Update project error:", error);
    return sendServerError(res, error);
  }
};

// Delete project (Admin/Creator only)
export const deleteProject = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const project = await Project.findByPk(id);
    if (!project) {
      await transaction.rollback();
      return sendNotFound(res, "Project not found");
    }

    // Check if user is creator or admin
    if (project.createdBy !== userId && req.user.role !== "admin") {
      await transaction.rollback();
      return sendError(res, 403, "Not authorized to delete this project");
    }

    // Check if project has purchases (prevent deletion)
    const purchaseCount = await ProjectPurchase.count({
      where: { projectId: id },
    });

    if (purchaseCount > 0) {
      await transaction.rollback();
      return sendConflict(res, "project", "Cannot delete project with existing purchases. Consider setting status to 'inactive' instead.");
    }

    await project.destroy({ transaction });
    await transaction.commit();

    return sendSuccess(res, "Project deleted successfully");
  } catch (error) {
    await transaction.rollback();
    console.error("Delete project error:", error);
    return sendServerError(res, error);
  }
};
// ===================== PROJECT PURCHASE MANAGEMENT =====================

// Initiate project purchase
export const initiateProjectPurchase = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { projectId, discountCode } = req.body;
    const userId = req.user.userId;

    // Validate project
    const project = await Project.findByPk(projectId);
    if (!project) {
      await transaction.rollback();
      return sendNotFound(res, "Project not found");
    }

    if (project.status !== "published") {
      await transaction.rollback();
      return sendError(res, 400, "Project is not available for purchase");
    }

    // Check if user already purchased
    const existingPurchase = await ProjectPurchase.findOne({
      where: {
        userId,
        projectId,
        paymentStatus: "completed",
      },
    });

    if (existingPurchase) {
      await transaction.rollback();
      return sendError(res, 400, "You have already purchased this project");
    }

    let finalPrice = project.salePrice || project.price;
    let discountAmount = 0;
    let discountId = null;

    // Apply discount code if provided
    if (discountCode) {
      const discount = await DiscountCode.findOne({
        where: {
          code: discountCode.toUpperCase(),
          isActive: true,
          validFrom: { [Op.lte]: new Date() },
          validUntil: { [Op.gte]: new Date() },
        },
      });

      if (!discount) {
        await transaction.rollback();
        return sendError(res, 400, "Invalid or expired discount code");
      }

      // Check usage limits
      if (discount.maxUses && discount.currentUses >= discount.maxUses) {
        await transaction.rollback();
        return sendError(res, 400, "Discount code usage limit exceeded");
      }

      if (discount.maxUsesPerUser) {
        const userUsages = await DiscountUsage.count({
          where: { userId, discountId: discount.id },
        });

        if (userUsages >= discount.maxUsesPerUser) {
          await transaction.rollback();
          return sendError(res, 400, "You have reached the usage limit for this discount code");
        }
      }

      // Check minimum purchase amount
      if (
        discount.minPurchaseAmount &&
        finalPrice < discount.minPurchaseAmount
      ) {
        await transaction.rollback();
        return sendError(res, 400, `Minimum purchase amount of $${discount.minPurchaseAmount} required for this discount`);
      }

      // Apply discount
      if (discount.discountType === "percentage") {
        discountAmount = (finalPrice * discount.discountValue) / 100;
      } else {
        discountAmount = discount.discountValue;
      }

      discountAmount = Math.min(discountAmount, finalPrice); // Don't exceed original price
      finalPrice = finalPrice - discountAmount;
      discountId = discount.id;
    }

    // Create purchase record
    const purchase = await ProjectPurchase.create(
      {
        userId,
        projectId,
        originalPrice: project.salePrice || project.price,
        discountAmount,
        finalPrice,
        discountId,
        paymentStatus: "pending",
        orderNumber: `PO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      },
      { transaction },
    );

    await transaction.commit();

    return sendSuccess(res, "Purchase initiated successfully", {
      purchaseId: purchase.id,
      orderNumber: purchase.orderNumber,
      originalPrice: purchase.originalPrice,
      discountAmount: purchase.discountAmount,
      finalPrice: purchase.finalPrice,
      project: {
        id: project.id,
        title: project.title,
        previewImages: project.previewImages,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error("Initiate purchase error:", error);
    return sendServerError(res, error);
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
        { model: DiscountCode, as: "discountCode" },
      ],
    });

    if (!purchase) {
      await transaction.rollback();
      return sendNotFound(res, "Purchase not found");
    }

    // Update purchase status
    await purchase.update(
      {
        paymentId,
        paymentStatus,
        completedAt: paymentStatus === "completed" ? new Date() : null,
      },
      { transaction },
    );

    // If payment completed successfully
    if (paymentStatus === "completed") {
      // Update project sales count
      await purchase.project.increment("totalSales", { transaction });

      // Record discount usage if discount was applied
      if (purchase.discountId) {
        await DiscountUsage.create(
          {
            userId: purchase.userId,
            discountId: purchase.discountId,
            projectId: purchase.projectId,
            discountAmount: purchase.discountAmount,
            originalAmount: purchase.originalPrice,
            finalAmount: purchase.finalPrice,
          },
          { transaction },
        );

        // Update discount code usage count
        await purchase.discountCode.increment("currentUses", { transaction });
      }
    }

    await transaction.commit();

    return sendSuccess(res, "Purchase status updated successfully", purchase);
  } catch (error) {
    await transaction.rollback();
    console.error("Complete purchase error:", error);
    return sendServerError(res, error);
  }
};

// Get user's purchased projects
export const getUserPurchases = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, status = "completed" } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: purchases } = await ProjectPurchase.findAndCountAll({
      where: {
        userId,
        paymentStatus: status,
      },
      include: [
        {
          model: Project,
          as: "project",
          attributes: [
            "id",
            "title",
            "shortDescription",
            "previewImages",
            "version",
            "lastUpdated",
          ],
        },
        {
          model: DiscountCode,
          as: "discountCode",
          attributes: ["discountId", "code", "discountType", "discountValue"],
        },
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [["completedAt", "DESC"]],
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return sendSuccess(res, "Purchases fetched successfully", {
      purchases,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get user purchases error:", error);
    return sendServerError(res, error);
  }
};

// ===================== PROJECT STATISTICS =====================

// Get project statistics (Admin only)
export const getProjectStatistics = async (req, res) => {
  try {
    const { period = "30d" } = req.query;

    let dateFilter = {};
    const now = new Date();

    switch (period) {
      case "7d":
        dateFilter = {
          [Op.gte]: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        };
        break;
      case "30d":
        dateFilter = {
          [Op.gte]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        };
        break;
      case "90d":
        dateFilter = {
          [Op.gte]: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        };
        break;
      case "1y":
        dateFilter = {
          [Op.gte]: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        };
        break;
    }

    // Total projects
    const totalProjects = await Project.count();

    // Published projects
    const publishedProjects = await Project.count({
      where: { status: "published" },
    });

    // Total sales
    const totalSales = await ProjectPurchase.count({
      where: { paymentStatus: "completed" },
    });

    // Revenue
    const revenueResult = await ProjectPurchase.findAll({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("finalPrice")), "totalRevenue"],
      ],
      where: { paymentStatus: "completed" },
      raw: true,
    });

    const totalRevenue = parseFloat(revenueResult[0]?.totalRevenue || 0);

    // Period-specific stats
    const periodSales = await ProjectPurchase.count({
      where: {
        paymentStatus: "completed",
        completedAt: dateFilter,
      },
    });

    const periodRevenueResult = await ProjectPurchase.findAll({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("finalPrice")), "periodRevenue"],
      ],
      where: {
        paymentStatus: "completed",
        completedAt: dateFilter,
      },
      raw: true,
    });

    const periodRevenue = parseFloat(
      periodRevenueResult[0]?.periodRevenue || 0,
    );

    // Top selling projects
    const topProjects = await Project.findAll({
      attributes: [
        "id",
        "title",
        "totalSales",
        "price",
        "salePrice",
        [sequelize.literal('(price * "totalSales")'), "revenue"],
      ],
      where: { status: "published" },
      order: [["totalSales", "DESC"]],
      limit: 10,
    });

    // Category-wise distribution
    const categoryStats = await Project.findAll({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("Project.id")), "projectCount"],
        [sequelize.fn("SUM", sequelize.col("totalSales")), "totalSales"],
      ],
      include: [
        {
          model: Category,
          as: "category",
          attributes: ["categoryId", "categoryName"],
        },
      ],
      group: ["category.id", "category.title"],
      order: [[sequelize.fn("COUNT", sequelize.col("Project.id")), "DESC"]],
    });

    return sendSuccess(res, "Project statistics fetched successfully", {
      overview: {
        totalProjects,
        publishedProjects,
        totalSales,
        totalRevenue,
        periodSales,
        periodRevenue,
      },
      topProjects,
      categoryDistribution: categoryStats,
      period,
    });
  } catch (error) {
    console.error("Get project statistics error:", error);
    return sendServerError(res, error);
  }
};

// Get all buyers of a specific project
export const getProjectBuyers = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, sortBy = "purchaseDate", sortOrder = "DESC" } = req.query;

    // Check if project exists
    const project = await Project.findByPk(id);
    if (!project) {
      return sendNotFound(res, "Project not found");
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: purchases } = await ProjectPurchase.findAndCountAll({
      where: {
        projectId: id,
        paymentStatus: "completed"
      },
      include: [
        {
          model: User,
          as: "buyer",
          attributes: ["userId", "username", "email", "profileImage"],
        },
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    return sendSuccess(res, "Project buyers retrieved successfully", {
      purchases,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get project buyers error:", error);
    return sendServerError(res, error);
  }
};

// Get download statistics for a specific project
export const getProjectDownloads = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if project exists
    const project = await Project.findByPk(id);
    if (!project) {
      return sendNotFound(res, "Project not found");
    }

    // Get all purchases for this project
    const purchases = await ProjectPurchase.findAll({
      where: {
        projectId: id,
        paymentStatus: "completed"
      },
      attributes: [
        "purchaseId",
        "downloadCount",
        "firstDownloadAt",
        "lastDownloadAt",
      ],
      include: [
        {
          model: User,
          as: "buyer",
          attributes: ["userId", "username", "email"],
        },
      ],
    });

    // Calculate total downloads
    const totalDownloads = purchases.reduce(
      (sum, purchase) => sum + (purchase.downloadCount || 0),
      0
    );

    // Get download trends by day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const downloadsByDay = await ProjectPurchase.findAll({
      where: {
        projectId: id,
        lastDownloadAt: { [Op.gte]: thirtyDaysAgo },
      },
      attributes: [
        [sequelize.fn("DATE", sequelize.col("last_download_at")), "date"],
        [sequelize.fn("COUNT", sequelize.col("purchase_id")), "count"],
      ],
      group: [sequelize.fn("DATE", sequelize.col("last_download_at"))],
      order: [[sequelize.fn("DATE", sequelize.col("last_download_at")), "ASC"]],
      raw: true,
    });

    return sendSuccess(res, "Project download statistics retrieved successfully", {
      totalDownloads,
      purchaseDownloads: purchases,
      downloadTrends: downloadsByDay,
    });
  } catch (error) {
    console.error("Get project downloads error:", error);
    return sendServerError(res, error);
  }
};

// Update project status (publish/hide/archive)
export const updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ["draft", "published", "archived", "hidden", "rejected"];
    if (!validStatuses.includes(status)) {
      return sendValidationError(res, "Invalid status. Must be one of: " + validStatuses.join(", "));
    }

    const project = await Project.findByPk(id);
    if (!project) {
      return sendNotFound(res, "Project not found");
    }

    // Update published date if status is changing to published
    const updateData = { status };
    if (status === "published" && project.status !== "published") {
      updateData.publishedAt = new Date();
    }

    await project.update(updateData);

    return sendSuccess(res, `Project status updated to ${status}`, project);
  } catch (error) {
    console.error("Update project status error:", error);
    return sendServerError(res, error);
  }
};

// Bulk update project statuses
export const bulkUpdateProjectStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { projectIds, status } = req.body;

    // Validate input
    if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
      await transaction.rollback();
      return sendValidationError(res, "Project IDs array is required");
    }

    // Validate status
    const validStatuses = ["draft", "published", "archived", "hidden", "rejected"];
    if (!validStatuses.includes(status)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid status. Must be one of: " + validStatuses.join(", "));
    }

    // Update published date if status is changing to published
    const updateData = { status };
    if (status === "published") {
      updateData.publishedAt = new Date();
    }

    // Update all projects
    await Project.update(updateData, {
      where: { projectId: { [Op.in]: projectIds } },
      transaction,
    });

    await transaction.commit();

    return sendSuccess(res, `${projectIds.length} projects updated to ${status}`);
  } catch (error) {
    await transaction.rollback();
    console.error("Bulk update project status error:", error);
    return sendServerError(res, error);
  }
};

// Get project reviews for admin moderation
export const getProjectReviews = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = "all",
      projectId,
      minRating,
      maxRating,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    // Build where conditions
    const whereConditions = {};

    if (status && status !== "all") {
      whereConditions.moderationStatus = status;
    }

    if (projectId) {
      whereConditions.projectId = projectId;
    }

    if (minRating || maxRating) {
      whereConditions.rating = {};
      if (minRating) whereConditions.rating[Op.gte] = parseFloat(minRating);
      if (maxRating) whereConditions.rating[Op.lte] = parseFloat(maxRating);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: reviews } = await ProjectRating.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "username", "email", "profileImage"],
        },
        {
          model: Project,
          as: "project",
          attributes: ["projectId", "title", "coverImage"],
        },
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [[sortBy, sortOrder.toUpperCase()]],
    });

    return sendSuccess(res, "Project reviews retrieved successfully", {
      reviews,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("Get project reviews error:", error);
    return sendServerError(res, error);
  }
};

// Update review moderation status
export const updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const adminId = req.user.userId;

    // Validate status
    const validStatuses = ["pending", "approved", "rejected", "hidden"];
    if (!validStatuses.includes(status)) {
      return sendValidationError(res, "Invalid status. Must be one of: " + validStatuses.join(", "));
    }

    const review = await ProjectRating.findByPk(id);
    if (!review) {
      return sendNotFound(res, "Review not found");
    }

    await review.update({
      moderationStatus: status,
      moderatedBy: adminId,
      moderatedAt: new Date(),
    });

    // If review is approved, update project rating count and average
    if (status === "approved") {
      const project = await Project.findByPk(review.projectId);
      if (project) {
        // Get all approved ratings for this project
        const approvedRatings = await ProjectRating.findAll({
          where: {
            projectId: review.projectId,
            moderationStatus: "approved",
          },
          attributes: ["rating"],
        });

        const totalRatings = approvedRatings.length;
        let averageRating = 0;

        if (totalRatings > 0) {
          averageRating =
            approvedRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
          averageRating = Math.round(averageRating * 100) / 100; // Round to 2 decimal places
        }

        await project.update({
          totalRatings,
          averageRating,
        });
      }
    }

    return sendSuccess(res, `Review status updated to ${status}`, review);
  } catch (error) {
    console.error("Update review status error:", error);
    return sendServerError(res, error);
  }
};

// Bulk update review statuses
export const bulkUpdateReviewStatus = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { reviewIds, status } = req.body;
    const adminId = req.user.userId;

    // Validate input
    if (!reviewIds || !Array.isArray(reviewIds) || reviewIds.length === 0) {
      await transaction.rollback();
      return sendValidationError(res, "Review IDs array is required");
    }

    // Validate status
    const validStatuses = ["pending", "approved", "rejected", "hidden"];
    if (!validStatuses.includes(status)) {
      await transaction.rollback();
      return sendValidationError(res, "Invalid status. Must be one of: " + validStatuses.join(", "));
    }

    // Update all reviews
    await ProjectRating.update(
      {
        moderationStatus: status,
        moderatedBy: adminId,
        moderatedAt: new Date(),
      },
      {
        where: { ratingId: { [Op.in]: reviewIds } },
        transaction,
      }
    );

    // If reviews are approved, update project ratings
    if (status === "approved") {
      // Get all affected projects
      const reviews = await ProjectRating.findAll({
        where: { ratingId: { [Op.in]: reviewIds } },
        attributes: ["projectId"],
        group: ["projectId"],
        transaction,
      });

      const projectIds = reviews.map((review) => review.projectId);

      // Update each project's ratings
      for (const projectId of projectIds) {
        const approvedRatings = await ProjectRating.findAll({
          where: {
            projectId,
            moderationStatus: "approved",
          },
          attributes: ["rating"],
          transaction,
        });

        const totalRatings = approvedRatings.length;
        let averageRating = 0;

        if (totalRatings > 0) {
          averageRating =
            approvedRatings.reduce((sum, r) => sum + r.rating, 0) / totalRatings;
          averageRating = Math.round(averageRating * 100) / 100; // Round to 2 decimal places
        }

        await Project.update(
          {
            totalRatings,
            averageRating,
          },
          {
            where: { projectId },
            transaction,
          }
        );
      }
    }

    await transaction.commit();

    return sendSuccess(res, `${reviewIds.length} reviews updated to ${status}`);
  } catch (error) {
    await transaction.rollback();
    console.error("Bulk update review status error:", error);
    return sendServerError(res, error);
  }
};

// Get project settings
export const getProjectSettings = async (req, res) => {
  try {
    // Get first settings entry (there should only be one)
    let settings = await ProjectSettings.findOne();

    // If settings don't exist, create default
    if (!settings) {
      settings = await ProjectSettings.create({});
    }

    return sendSuccess(res, "Project settings retrieved successfully", settings);
  } catch (error) {
    console.error("Get project settings error:", error);
    return sendServerError(res, error);
  }
};

// Update project settings
export const updateProjectSettings = async (req, res) => {
  try {
    const {
      globalDownloadLimit,
      enableRatings,
      enableReviewModeration,
      defaultLicenseType,
      autoEmailPurchaseConfirmation,
      priceBrackets,
      projectEmailTemplate,
    } = req.body;

    // Get first settings entry (there should only be one)
    let settings = await ProjectSettings.findOne();

    // If settings don't exist, create default
    if (!settings) {
      settings = await ProjectSettings.create({});
    }

    // Update settings with new values
    await settings.update({
      globalDownloadLimit: globalDownloadLimit !== undefined ? globalDownloadLimit : settings.globalDownloadLimit,
      enableRatings: enableRatings !== undefined ? enableRatings : settings.enableRatings,
      enableReviewModeration: enableReviewModeration !== undefined ? enableReviewModeration : settings.enableReviewModeration,
      defaultLicenseType: defaultLicenseType || settings.defaultLicenseType,
      autoEmailPurchaseConfirmation: autoEmailPurchaseConfirmation !== undefined ? autoEmailPurchaseConfirmation : settings.autoEmailPurchaseConfirmation,
      priceBrackets: priceBrackets || settings.priceBrackets,
      projectEmailTemplate: projectEmailTemplate !== undefined ? projectEmailTemplate : settings.projectEmailTemplate,
    });

    return sendSuccess(res, "Project settings updated successfully", settings);
  } catch (error) {
    console.error("Update project settings error:", error);
    return sendServerError(res, error);
  }
};

// Bulk delete projects
export const bulkDeleteProjects = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      await transaction.rollback();
      return sendValidationError(res, "Valid project IDs are required", {
        ids: "Please provide valid project IDs for deletion"
      });
    }

    // Validate all IDs are in UUID format
    for (const id of ids) {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        await transaction.rollback();
        return sendValidationError(res, `Invalid project ID format: ${id}`, {
          ids: "All IDs must be valid UUIDs"
        });
      }
    }

    // Check if any of the projects have associated purchases
    const projectsWithPurchases = await ProjectPurchase.findAll({
      where: {
        projectId: {
          [Op.in]: ids
        }
      },
      attributes: ['projectId'],
      group: ['projectId'],
      transaction
    });

    if (projectsWithPurchases.length > 0) {
      const purchasedIds = projectsWithPurchases.map(p => p.projectId);
      await transaction.rollback();
      return sendConflict(res, "Cannot delete projects with existing purchases", {
        conflictingIds: purchasedIds,
        message: "Some projects have already been purchased and cannot be deleted"
      });
    }

    // Delete project associations
    await Promise.all([
      ProjectGoal.destroy({
        where: { projectId: { [Op.in]: ids } },
        transaction
      }),
      ProjectTechStack.destroy({
        where: { projectId: { [Op.in]: ids } },
        transaction
      }),
      ProjectFile.destroy({
        where: { projectId: { [Op.in]: ids } },
        transaction
      }),
      ProjectRating.destroy({
        where: { projectId: { [Op.in]: ids } },
        transaction
      }),
      ProjectSettings.destroy({
        where: { projectId: { [Op.in]: ids } },
        transaction
      })
    ]);

    // Delete the projects
    const deleteCount = await Project.destroy({
      where: {
        projectId: {
          [Op.in]: ids
        }
      },
      transaction
    });

    await transaction.commit();

    return sendSuccess(res, {
      message: `Successfully deleted ${deleteCount} projects`,
      deletedCount: deleteCount,
      deletedIds: ids
    });

  } catch (error) {
    await transaction.rollback();
    console.error("Error in bulkDeleteProjects:", error);
    return sendServerError(res, "Failed to delete projects", error);
  }
};
// ===================== PROJECT LANGUAGE MANAGEMENT =====================

// Get languages for a project
export const getProjectLanguages = async (req, res) => {
  try {
    const { projectId } = req.params;

    const projectLanguages = await ProjectLanguage.findAll({
      where: { projectId },
      include: [
        {
          model: Language,
          as: "language",
          attributes: ["languageId", "language", "languageCode"]
        }
      ]
    });

    return sendSuccess(res, "Project languages retrieved successfully", projectLanguages);
  } catch (error) {
    console.error("Error getting project languages:", error);
    return sendServerError(res, error);
  }
};

// Add languages to a project
export const addProjectLanguages = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { languageIds } = req.body;

    if (!Array.isArray(languageIds) || languageIds.length === 0) {
      return sendValidationError(res, "Language IDs array is required");
    }

    // Check if project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return sendNotFound(res, "Project not found");
    }

    // Check if languages exist
    const languages = await Language.findAll({
      where: { languageId: languageIds }
    });
    
    if (languages.length !== languageIds.length) {
      return sendValidationError(res, "One or more languages not found");
    }

    // Create project language associations
    const projectLanguages = await Promise.all(
      languageIds.map(languageId =>
        ProjectLanguage.findOrCreate({
          where: { projectId, languageId },
          defaults: { projectId, languageId }
        })
      )
    );

    const newlyAdded = projectLanguages.filter(([, created]) => created);
    
    return sendSuccess(res, `Added ${newlyAdded.length} new language(s) to project`, {
      added: newlyAdded.length,
      total: projectLanguages.length
    });
  } catch (error) {
    console.error("Error adding project languages:", error);
    return sendServerError(res, error);
  }
};

// Remove language from project
export const removeProjectLanguage = async (req, res) => {
  try {
    const { projectId, languageId } = req.params;

    const deleted = await ProjectLanguage.destroy({
      where: { projectId, languageId }
    });

    if (deleted === 0) {
      return sendNotFound(res, "Project language association not found");
    }

    return sendSuccess(res, "Language removed from project successfully");
  } catch (error) {
    console.error("Error removing project language:", error);
    return sendServerError(res, error);
  }
};

// ===================== PROJECT INSTRUCTOR MANAGEMENT =====================

// Get instructors for a project
export const getProjectInstructors = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return sendNotFound(res, "Project not found");
    }

    const offset = (page - 1) * limit;

    const { count, rows: instructors } = await ProjectInstructor.findAndCountAll({
      where: { projectId },
      include: [
        {
          model: User,
          as: 'instructor',
          attributes: ['userId', 'username', 'email', 'profileImage'],
        },
        {
          model: User,
          as: 'assigner',
          attributes: ['userId', 'username', 'email'],
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['isPrimary', 'DESC'], ['createdAt', 'ASC']],
    });

    return sendSuccess(res, "Project instructors retrieved successfully", {
      instructors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching project instructors:", error);
    return sendServerError(res, "Failed to fetch project instructors");
  }
};

// Add instructors to a project
export const addProjectInstructors = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { projectId } = req.params;
    const { instructorIds, isPrimary = false } = req.body;
    const userId = req.user.userId;

    // Validate project exists
    const project = await Project.findByPk(projectId, { transaction });
    if (!project) {
      await transaction.rollback();
      return sendNotFound(res, "Project not found");
    }

    // Validate instructor IDs
    if (!Array.isArray(instructorIds) || instructorIds.length === 0) {
      await transaction.rollback();
      return sendValidationError(res, "At least one instructor ID is required");
    }

    // Validate instructors exist and are teachers/admins
    const instructors = await User.findAll({
      where: {
        userId: { [Op.in]: instructorIds },
        role: { [Op.in]: ['teacher', 'admin'] },
      },
      transaction,
    });

    if (instructors.length !== instructorIds.length) {
      await transaction.rollback();
      return sendValidationError(res, "One or more invalid instructor IDs");
    }

    // Check for existing assignments (including soft deleted ones)
    const existingAssignments = await ProjectInstructor.findAll({
      where: {
        projectId,
        instructorId: { [Op.in]: instructorIds },
      },
      paranoid: false, // Include soft deleted records
      transaction,
    });

    // Filter out soft deleted assignments - they can be restored
    const activeAssignments = existingAssignments.filter(assignment => !assignment.deletedAt);
    
    if (activeAssignments.length > 0) {
      await transaction.rollback();
      return sendConflict(res, "One or more instructors are already assigned to this project");
    }

    // Restore any soft deleted assignments
    const softDeletedAssignments = existingAssignments.filter(assignment => assignment.deletedAt);
    if (softDeletedAssignments.length > 0) {
      await ProjectInstructor.restore({
        where: {
          projectId,
          instructorId: { [Op.in]: softDeletedAssignments.map(a => a.instructorId) }
        },
        transaction
      });
      
      // Update the restored assignments
      await ProjectInstructor.update(
        { 
          isPrimary: isPrimary && instructorIds.length === 1, // Only if adding single instructor as primary
          assignedBy: userId 
        },
        {
          where: {
            projectId,
            instructorId: { [Op.in]: softDeletedAssignments.map(a => a.instructorId) }
          },
          transaction
        }
      );
    }

    // If setting as primary, remove primary flag from existing instructors
    if (isPrimary) {
      await ProjectInstructor.update(
        { isPrimary: false },
        {
          where: { projectId },
          transaction,
        }
      );
    }

    // Create instructor assignments for new instructors only
    const restoredInstructorIds = softDeletedAssignments.map(a => a.instructorId);
    const newInstructorIds = instructorIds.filter(id => !restoredInstructorIds.includes(id));
    
    let createdAssignments = [];
    if (newInstructorIds.length > 0) {
      const assignments = newInstructorIds.map((instructorId, index) => ({
        projectId,
        instructorId,
        isPrimary: isPrimary && index === 0 && newInstructorIds.length === instructorIds.length, // Only first instructor gets primary flag if no restored ones
        assignedBy: userId,
      }));

      createdAssignments = await ProjectInstructor.bulkCreate(assignments, {
        transaction,
        returning: true,
      });
    }

    await transaction.commit();

    // Fetch the full data with includes for all instructors
    const allAssignmentIds = [
      ...createdAssignments.map(a => a.projectInstructorId),
      ...softDeletedAssignments.map(a => a.projectInstructorId)
    ];
    
    const fullAssignments = await ProjectInstructor.findAll({
      where: {
        projectInstructorId: { [Op.in]: allAssignmentIds }
      },
      include: [
        {
          model: User,
          as: 'instructor',
          attributes: ['userId', 'username', 'email', 'profileImage'],
        },
      ],
    });

    return sendSuccess(res, "Instructors added successfully", {
      assignments: fullAssignments,
      restored: softDeletedAssignments.length,
      created: createdAssignments.length,
    });
  } catch (error) {
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    console.error("Error adding project instructors:", error);
    return sendServerError(res, "Failed to add project instructors");
  }
};

// Remove instructor from project
export const removeProjectInstructor = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { projectId, instructorId } = req.params;

    // Validate project exists
    const project = await Project.findByPk(projectId, { transaction });
    if (!project) {
      await transaction.rollback();
      return sendNotFound(res, "Project not found");
    }

    // Find and remove the assignment
    const assignment = await ProjectInstructor.findOne({
      where: { projectId, instructorId },
      transaction,
    });

    if (!assignment) {
      await transaction.rollback();
      return sendNotFound(res, "Instructor assignment not found");
    }

    await assignment.destroy({ transaction });
    await transaction.commit();

    return sendSuccess(res, "Instructor removed successfully");
  } catch (error) {
    await transaction.rollback();
    console.error("Error removing project instructor:", error);
    return sendServerError(res, "Failed to remove project instructor");
  }
};

// Get all available instructors (teachers and admins)
export const getAllInstructors = async (req, res) => {
  try {
    const { page = 1, limit = 50, } = req.query;
    const offset = (page - 1) * limit;

    console.log("Getting all instructors...");

    const { count, rows: instructors } = await User.findAndCountAll({
      where: {
        role: { [Op.in]: ['teacher', 'admin'] },
      },
      attributes: ['userId', 'username', 'email', 'profileImage', 'role'],
      limit: parseInt(limit),
      offset,
      order: [['username', 'ASC'],],
    });

    console.log(`Found ${count} instructors`);

    return sendSuccess(res, "Instructors retrieved successfully", {
      instructors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / limit),
        totalItems: count,
        itemsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Error fetching instructors:", error);
    return sendServerError(res, "Failed to fetch instructors");
  }
};
