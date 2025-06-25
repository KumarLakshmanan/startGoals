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
import path from "path";
import fs from "fs";
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
      estimatedTime,
    } = req.body;

    const userId = req.user.id; // From auth middleware

    // Validate required fields
    if (!title || !description || !price || !categoryId) {
      await transaction.rollback();
      return sendValidationError(res, "Title, description, price and category are required", {
        missingFields: [
          !title ? 'title' : null,
          !description ? 'description' : null,
          !price ? 'price' : null,
          !categoryId ? 'categoryId' : null
        ].filter(Boolean)
      });
    }

    // Validate title length
    if (title.length < 3 || title.length > 100) {
      await transaction.rollback();
      return sendValidationError(res, "Title must be between 3 and 100 characters");
    }

    // Validate description length
    if (description.length < 10) {
      await transaction.rollback();
      return sendValidationError(res, "Description must be at least 10 characters");
    }

    // Validate price
    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue < 0) {
      await transaction.rollback();
      return sendValidationError(res, "Price must be a valid positive number");
    }

    // Validate sale price if provided
    if (salePrice !== undefined && salePrice !== null) {
      const salePriceValue = parseFloat(salePrice);
      if (isNaN(salePriceValue) || salePriceValue < 0) {
        await transaction.rollback();
        return sendValidationError(res, "Sale price must be a valid positive number");
      }

      if (salePriceValue >= priceValue) {
        await transaction.rollback();
        return sendValidationError(res, "Sale price must be less than regular price");
      }
    }

    // Validate categoryId UUID format
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(categoryId)) {
      await transaction.rollback();
      return sendValidationError(res, `Invalid categoryId format: ${categoryId}. Must be a valid UUID.`);
    }

    // Check if category exists
    const category = await CourseCategory.findByPk(categoryId);
    if (!category) {
      await transaction.rollback();
      return sendNotFound(res, "Category not found");
    }

    // Create project
    const project = await Project.create(
      {
        title,
        description,
        shortDescription,
        price: parseFloat(price),
        salePrice: salePrice ? parseFloat(salePrice) : null,
        categoryId,
        techStack: Array.isArray(techStack) ? techStack : [],
        programmingLanguages: Array.isArray(programmingLanguages)
          ? programmingLanguages
          : [],
        demoUrl,
        previewImages: Array.isArray(previewImages) ? previewImages : [],
        requirements: Array.isArray(requirements) ? requirements : [],
        features: Array.isArray(features) ? features : [],
        compatibility: Array.isArray(compatibility) ? compatibility : [],
        license: license || "Regular License",
        liveDemoUrl,
        documentationUrl,
        supportEmail,
        version: version || "1.0.0",
        lastUpdated: lastUpdated || new Date(),
        difficulty: difficulty || "intermediate",
        estimatedTime,
        createdBy: userId,
        status: "draft",
      },
      { transaction },
    ); // Add tags if provided
    if (tags && Array.isArray(tags) && tags.length > 0) {
      const tagObjects = await CourseTag.findAll({
        where: { id: { [Op.in]: tags } },
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
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["id", "title"],
        },
        {
          model: CourseTag,
          as: "projectTags",
          attributes: ["id", "title"],
          through: { attributes: [] },
        },
      ],
    });

    return sendSuccess(res, 200, "Project created successfully", completeProject);
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
      status = "published",
      difficulty,
      tags,
      programmingLanguages,
    } = req.query;

    // Build where conditions
    const whereConditions = {
      status: status === "all" ? { [Op.ne]: null } : status,
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
        { shortDescription: { [Op.iLike]: `%${search}%` } },
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
        [Op.overlap]: languages,
      };
    }

    // Include conditions
    const includeOptions = [
      {
        model: User,
        as: "creator",
        attributes: ["id", "firstName", "lastName", "profilePicture"],
      },
      {
        model: CourseCategory,
        as: "category",
        attributes: ["id", "title"],
      },
      {
        model: CourseTag,
        as: "projectTags",
        attributes: ["id", "title"],
        through: { attributes: [] },
      },
      {
        model: ProjectRating,
        as: "ratings",
        attributes: ["rating"],
        where: { status: "approved" },
        required: false,
      },
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

      delete projectData.ratings; // Remove individual ratings from response
      return projectData;
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return sendSuccess(res, 200, "Projects fetched successfully", {
      projects: formattedProjects,
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
    const userId = req.user?.id; // Optional - for checking if user purchased

    const project = await Project.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: [
            "id",
            "firstName",
            "lastName",
            "email",
            "profilePicture",
            "bio",
          ],
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["id", "title"],
        },
        {
          model: CourseTag,
          as: "projectTags",
          attributes: ["id", "title"],
          through: { attributes: [] },
        },
        {
          model: ProjectFile,
          as: "files",
          attributes: ["id", "fileName", "fileType", "fileSize", "isPreview"],
          where: { isPreview: true },
          required: false,
        },
        {
          model: ProjectRating,
          as: "ratings",
          attributes: ["id", "rating", "review", "createdAt"],
          where: { status: "approved" },
          required: false,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "firstName", "lastName", "profilePicture"],
            },
          ],
        },
      ],
    });

    if (!project) {
      return sendNotFound(res, "Project not found");
    }

    // Check if project is published or user is the creator
    if (project.status !== "published" && project.createdBy !== userId) {
      return sendError(res, 400, "Project not available");
    }

    const projectData = project.toJSON();

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
    projectData.hasPurchased = false;
    if (userId) {
      const purchase = await ProjectPurchase.findOne({
        where: {
          userId,
          projectId: id,
          paymentStatus: "completed",
        },
      });
      projectData.hasPurchased = !!purchase;
    }

    // Increment view count
    await project.increment("views");
    projectData.views = project.views + 1;

    return sendSuccess(res, 200, "Project fetched successfully", projectData);
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
    const userId = req.user.id;
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

    // Update tags if provided
    if (updateData.tags && Array.isArray(updateData.tags)) {
      const tagObjects = await CourseTag.findAll({
        where: { id: { [Op.in]: updateData.tags } },
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
          attributes: ["id", "firstName", "lastName", "email"],
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["id", "title"],
        },
        {
          model: CourseTag,
          as: "projectTags",
          attributes: ["id", "title"],
          through: { attributes: [] },
        },
      ],
    });

    return sendSuccess(res, 200, "Project updated successfully", updatedProject);
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
    const userId = req.user.id;

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

    return sendSuccess(res, 200, "Project deleted successfully");
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
    const userId = req.user.id;

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

    return sendSuccess(res, 201, "Purchase initiated successfully", {
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

    return sendSuccess(res, 200, "Purchase status updated successfully", purchase);
  } catch (error) {
    await transaction.rollback();
    console.error("Complete purchase error:", error);
    return sendServerError(res, error);
  }
};

// Get user's purchased projects
export const getUserPurchases = async (req, res) => {
  try {
    const userId = req.user.id;
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
          include: [
            {
              model: User,
              as: "creator",
              attributes: ["id", "firstName", "lastName"],
            },
          ],
        },
        {
          model: DiscountCode,
          as: "discountCode",
          attributes: ["id", "code", "discountType", "discountValue"],
        },
      ],
      limit: parseInt(limit),
      offset: offset,
      order: [["completedAt", "DESC"]],
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return sendSuccess(res, 200, "Purchases fetched successfully", {
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
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["firstName", "lastName"],
        },
      ],
    });

    // Category-wise distribution
    const categoryStats = await Project.findAll({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("Project.id")), "projectCount"],
        [sequelize.fn("SUM", sequelize.col("totalSales")), "totalSales"],
      ],
      include: [
        {
          model: CourseCategory,
          as: "category",
          attributes: ["id", "title"],
        },
      ],
      group: ["category.id", "category.title"],
      order: [[sequelize.fn("COUNT", sequelize.col("Project.id")), "DESC"]],
    });

    return sendSuccess(res, 200, "Project statistics fetched successfully", {
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

// ===================== COMPREHENSIVE ADMIN PROJECT MANAGEMENT =====================

/**
 * Get all projects with advanced filtering and analytics (Admin)
 * This provides comprehensive project management with detailed analytics
 */
export const getAllProjectsAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      category,
      priceRange,
      difficulty,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
      dateRange,
      creator,
    } = req.query;

    // Build where conditions
    const whereConditions = {};

    // Status filtering
    if (status && status !== "all") {
      whereConditions.status = status;
    }

    // Category filtering
    if (category) {
      whereConditions.categoryId = category;
    }

    // Price range filtering
    if (priceRange) {
      const [minPrice, maxPrice] = priceRange.split("-").map(Number);
      whereConditions.price = {};
      if (minPrice) whereConditions.price[Op.gte] = minPrice;
      if (maxPrice) whereConditions.price[Op.lte] = maxPrice;
    }

    // Difficulty filtering
    if (difficulty) {
      whereConditions.difficulty = difficulty;
    }

    // Creator filtering
    if (creator) {
      whereConditions.createdBy = creator;
    }

    // Search functionality
    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
        { shortDescription: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Date range filtering
    if (dateRange) {
      const { startDate, endDate } = JSON.parse(dateRange);
      if (startDate && endDate) {
        whereConditions.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)],
        };
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: projects } = await Project.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["userId", "firstName", "lastName", "email"],
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "title"],
        },
        {
          model: CourseTag,
          as: "projectTags",
          attributes: ["id", "title"],
          through: { attributes: [] },
        },
        {
          model: ProjectFile,
          as: "files",
          attributes: [
            [sequelize.fn("COUNT", sequelize.col("files.id")), "fileCount"],
            [sequelize.fn("SUM", sequelize.col("files.fileSize")), "totalSize"],
          ],
          required: false,
        },
        {
          model: ProjectPurchase,
          as: "purchases",
          attributes: [
            [
              sequelize.fn("COUNT", sequelize.col("purchases.purchaseId")),
              "purchaseCount",
            ],
            [
              sequelize.fn("SUM", sequelize.col("purchases.finalPrice")),
              "totalRevenue",
            ],
          ],
          where: { paymentStatus: "completed" },
          required: false,
        },
        {
          model: ProjectRating,
          as: "ratings",
          attributes: [
            [sequelize.fn("AVG", sequelize.col("ratings.rating")), "avgRating"],
            [
              sequelize.fn("COUNT", sequelize.col("ratings.ratingId")),
              "ratingCount",
            ],
          ],
          where: { status: "approved" },
          required: false,
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      distinct: true,
      group: [
        "Project.id",
        "creator.userId",
        "category.categoryId",
        "projectTags.id",
        "projectTags->ProjectTag.projectId",
        "projectTags->ProjectTag.tagId",
      ],
    });

    // Calculate overall statistics
    const overallStats = {
      totalProjects: count,
      draftProjects: projects.filter((p) => p.status === "draft").length,
      publishedProjects: projects.filter((p) => p.status === "published")
        .length,
      archivedProjects: projects.filter((p) => p.status === "archived").length,
      totalRevenue: projects.reduce(
        (sum, p) => sum + parseFloat(p.purchases?.[0]?.totalRevenue || 0),
        0,
      ),
      totalSales: projects.reduce(
        (sum, p) => sum + parseInt(p.purchases?.[0]?.purchaseCount || 0),
        0,
      ),
      avgRating:
        projects.length > 0
          ? (
            projects.reduce(
              (sum, p) => sum + parseFloat(p.ratings?.[0]?.avgRating || 0),
              0,
            ) / projects.length
          ).toFixed(1)
          : 0,
    };

    return sendSuccess(res, 200, "Projects retrieved successfully", {
      projects,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalRecords: count,
        recordsPerPage: parseInt(limit),
      },
      overallStatistics: overallStats,
    });
  } catch (error) {
    console.error("Get all projects admin error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get detailed project information with comprehensive analytics (Admin)
 */
export const getProjectDetailsAdmin = async (req, res) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findByPk(projectId, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: [
            "userId",
            "firstName",
            "lastName",
            "email",
            "profilePicture",
          ],
        },
        {
          model: CourseCategory,
          as: "category",
          attributes: ["categoryId", "title"],
        },
        {
          model: CourseTag,
          as: "projectTags",
          attributes: ["id", "title"],
          through: { attributes: [] },
        },
        {
          model: ProjectFile,
          as: "files",
          attributes: [
            "id",
            "fileName",
            "fileType",
            "fileSize",
            "isPreview",
            "downloadCount",
            "createdAt",
          ],
        },
      ],
    });

    if (!project) {
      return sendNotFound(res, "Project not found");
    }

    // Get purchase history with user details
    const purchaseHistory = await ProjectPurchase.findAll({
      where: { projectId, paymentStatus: "completed" },
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "firstName", "lastName", "email"],
        },
      ],
      order: [["purchasedAt", "DESC"]],
      limit: 50,
    });

    // Get rating statistics
    const ratingStats = await ProjectRating.findAll({
      where: { projectId, status: "approved" },
      attributes: [
        "rating",
        [sequelize.fn("COUNT", sequelize.col("rating")), "count"],
      ],
      group: ["rating"],
      order: [["rating", "DESC"]],
    });

    // Calculate file analytics
    const fileAnalytics = {
      totalFiles: project.files.length,
      totalSize: project.files.reduce((sum, file) => sum + file.fileSize, 0),
      fileTypeDistribution: project.files.reduce((acc, file) => {
        const ext = file.fileName.split(".").pop().toLowerCase();
        acc[ext] = (acc[ext] || 0) + 1;
        return acc;
      }, {}),
      mostDownloadedFiles: project.files
        .sort((a, b) => b.downloadCount - a.downloadCount)
        .slice(0, 5),
    };

    const detailedData = {
      ...project.toJSON(),
      purchaseHistory,
      ratingStats,
      fileAnalytics,
      salesStatistics: {
        totalSales: purchaseHistory.length,
        totalRevenue: purchaseHistory.reduce(
          (sum, purchase) => sum + purchase.finalPrice,
          0,
        ),
        averageOrderValue:
          purchaseHistory.length > 0
            ? (
              purchaseHistory.reduce(
                (sum, purchase) => sum + purchase.finalPrice,
                0,
              ) / purchaseHistory.length
            ).toFixed(2)
            : 0,
      },
    };

    return sendSuccess(res, 200, "Project details retrieved successfully", detailedData);
  } catch (error) {
    console.error("Get project details admin error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get project buyer history with detailed analytics (Admin)
 */
export const getProjectBuyers = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      page = 1,
      limit = 20,
      search,
      dateFrom,
      dateTo,
      sortBy = "purchasedAt",
      sortOrder = "DESC",
    } = req.query;

    // Build where conditions
    const whereConditions = { projectId, paymentStatus: "completed" };

    if (dateFrom && dateTo) {
      whereConditions.purchasedAt = {
        [Op.between]: [new Date(dateFrom), new Date(dateTo)],
      };
    }

    // User search conditions
    const userSearchConditions = {};
    if (search) {
      userSearchConditions[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: buyers } = await ProjectPurchase.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: User,
          as: "user",
          where: userSearchConditions,
          attributes: [
            "userId",
            "firstName",
            "lastName",
            "email",
            "profilePicture",
            "createdAt",
          ],
        },
        {
          model: DiscountCode,
          as: "discountCode",
          attributes: ["code", "discountType", "discountValue"],
          required: false,
        },
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset,
    });

    // Calculate buyer statistics
    const buyerStats = {
      totalBuyers: count,
      totalRevenue: buyers.reduce((sum, buyer) => sum + buyer.finalPrice, 0),
      averageOrderValue:
        count > 0
          ? (
            buyers.reduce((sum, buyer) => sum + buyer.finalPrice, 0) / count
          ).toFixed(2)
          : 0,
      discountUsage: buyers.filter((buyer) => buyer.discountAmount > 0).length,
      returningCustomers: 0, // Would need additional query to calculate
    };

    return sendSuccess(res, 200, "Project buyers retrieved successfully", {
      buyers,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalRecords: count,
        recordsPerPage: parseInt(limit),
      },
      statistics: buyerStats,
    });
  } catch (error) {
    console.error("Get project buyers error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get project download tracking and statistics (Admin)
 */
export const getProjectDownloads = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 20, fileId, dateFrom, dateTo } = req.query;

    // Get project files with download statistics
    const whereConditions = { projectId };
    if (fileId) {
      whereConditions.id = fileId;
    }

    const files = await ProjectFile.findAll({
      where: whereConditions,
      attributes: [
        "id",
        "fileName",
        "fileType",
        "fileSize",
        "downloadCount",
        "createdAt",
        "updatedAt",
      ],
    });

    // Mock download tracking data (in real implementation, you'd have a downloads table)
    const downloadTracking = files.map((file) => ({
      fileId: file.id,
      fileName: file.fileName,
      fileType: file.fileType,
      fileSize: file.fileSize,
      totalDownloads: file.downloadCount,
      recentDownloads: Math.floor(file.downloadCount * 0.3), // Mock recent downloads
      uniqueDownloaders: Math.floor(file.downloadCount * 0.8), // Mock unique users
      averageDownloadsPerDay: (file.downloadCount / 30).toFixed(1), // Mock daily average
      popularityScore: (
        (file.downloadCount /
          files.reduce((sum, f) => sum + f.downloadCount, 0)) *
        100
      ).toFixed(1),
    }));

    // Calculate overall download statistics
    const downloadStats = {
      totalFiles: files.length,
      totalDownloads: files.reduce((sum, file) => sum + file.downloadCount, 0),
      totalFileSize: files.reduce((sum, file) => sum + file.fileSize, 0),
      averageDownloadsPerFile:
        files.length > 0
          ? (
            files.reduce((sum, file) => sum + file.downloadCount, 0) /
            files.length
          ).toFixed(1)
          : 0,
      mostPopularFile: files.reduce(
        (max, file) => (file.downloadCount > max.downloadCount ? file : max),
        files[0] || {},
      ),
      fileTypeDistribution: files.reduce((acc, file) => {
        const ext = file.fileName.split(".").pop().toLowerCase();
        acc[ext] = (acc[ext] || 0) + file.downloadCount;
        return acc;
      }, {}),
    };

    return sendSuccess(res, 200, "Download tracking retrieved successfully", {
      downloadTracking,
      statistics: downloadStats,
    });
  } catch (error) {
    console.error("Get project downloads error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Apply discount codes to projects (Admin)
 */
export const applyDiscountToProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      discountCode,
      discountType,
      discountValue,
      validUntil,
      maxUses,
      description,
    } = req.body;

    // Validate project exists
    const project = await Project.findByPk(projectId);
    if (!project) {
      return sendNotFound(res, "Project not found");
    }

    // Create or update discount code
    const [discount, created] = await DiscountCode.findOrCreate({
      where: { code: discountCode },
      defaults: {
        code: discountCode,
        description: description || `Discount for ${project.title}`,
        discountType,
        discountValue,
        applicableType: "project",
        applicableCategories: [projectId],
        validFrom: new Date(),
        validUntil: new Date(validUntil),
        maxUses: maxUses || null,
        maxUsesPerUser: 1,
        isActive: true,
        createdBy: req.user.userId,
      },
    });

    if (!created && discount.applicableCategories.includes(projectId)) {
      return sendError(res, 400, "Discount code already applied to this project");
    }

    // If discount exists but not applied to this project, add it
    if (!created) {
      const updatedCategories = [...discount.applicableCategories, projectId];
      await discount.update({ applicableCategories: updatedCategories });
    }

    return sendSuccess(res, 200, created
      ? "Discount code created and applied successfully"
      : "Discount code applied to project successfully", {
      discountCode: discount,
      project: {
        id: project.id,
        title: project.title,
        originalPrice: project.price,
        discountedPrice:
          discountType === "percentage"
            ? (project.price * (1 - discountValue / 100)).toFixed(2)
            : (project.price - discountValue).toFixed(2),
      },
    });
  } catch (error) {
    console.error("Apply discount to project error:", error);
    return sendServerError(res, error);
  }
};

// ===================== HELPER FUNCTIONS =====================

/**
 * Helper function to get project analytics
 */
const getProjectAnalytics = async (projectId) => {
  // Mock analytics - in real implementation, aggregate from various tables
  return {
    totalViews: Math.floor(Math.random() * 1000) + 100,
    totalPurchases: Math.floor(Math.random() * 50) + 10,
    totalDownloads: Math.floor(Math.random() * 200) + 50,
    totalRevenue: Math.floor(Math.random() * 5000) + 500,
    conversionRate: (Math.random() * 10 + 1).toFixed(2),
    ratingTrend: "increasing",
  };
};

/**
 * Helper function to get recent activity
 */
const getProjectRecentActivity = async (projectId) => {
  // Mock recent activity
  return [
    {
      type: "purchase",
      count: 3,
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      type: "download",
      count: 15,
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      type: "view",
      count: 45,
      date: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
  ];
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
  getProjectStatistics,
  getAllProjectsAdmin,
  getProjectDetailsAdmin,
  getProjectBuyers,
  getProjectDownloads,
  applyDiscountToProject,
};
