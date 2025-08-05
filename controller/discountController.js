import DiscountCode from "../model/discountCode.js";
import DiscountUsage from "../model/discountUsage.js";
import Course from "../model/course.js";
import Project from "../model/project.js";
import User from "../model/user.js";
import { Op } from "sequelize";
import sequelize from "../config/db.js";
import {
  sendSuccess,
  sendError,
  sendValidationError,
  sendNotFound,
  sendServerError,
  sendConflict,
  sendResponse,
} from "../utils/responseHelper.js";
import Cart from "../model/cart.js";

// ===================== ADMIN DISCOUNT CODE MANAGEMENT =====================

// Create new discount code (Admin only)
export const createDiscountCode = async (req, res) => {
  const transaction =  await sequelize.transaction();

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
      isActive = true,
    } = req.body;

    const userId = req.user.userId;

    // Validate required fields
    if (
      !code ||
      !discountType ||
      !discountValue ||
      !applicableType ||
      !validFrom ||
      !validUntil
    ) {
      await transaction.rollback();
      return sendValidationError(res, "Missing required fields", {
        code: !code ? "Required field" : undefined,
        discountType: !discountType ? "Required field" : undefined,
        discountValue: !discountValue ? "Required field" : undefined,
        applicableType: !applicableType ? "Required field" : undefined,
        validFrom: !validFrom ? "Required field" : undefined,
        validUntil: !validUntil ? "Required field" : undefined,
      });
    }

    // Validate discount value
    if (discountValue <= 0) {
      await transaction.rollback();
      return sendValidationError(res, "Discount value must be greater than 0", {
        discountValue: "Must be greater than 0",
      });
    }

    if (discountType === "percentage" && discountValue > 100) {
      await transaction.rollback();
      return sendValidationError(res, "Percentage discount cannot exceed 100%", {
        discountValue: "Cannot exceed 100%",
      });
    }

    // Check if code already exists
    const existingCode = await DiscountCode.findOne({
      where: { code: code.toUpperCase() },
    });

    if (existingCode) {
      await transaction.rollback();
      return sendConflict(res, "code", code.toUpperCase());
    }

    // Validate dates
    const fromDate = new Date(validFrom);
    const untilDate = new Date(validUntil);

    if (fromDate >= untilDate) {
      await transaction.rollback();
      return sendValidationError(
        res,
        "Valid from date must be before valid until date",
        {
          validFrom: "Must be before validUntil",
          validUntil: "Must be after validFrom",
        }
      );
    }

    // Create discount code
    const discountCode = await DiscountCode.create(
      {
        code: code.toUpperCase(),
        description,
        discountType,
        discountValue: parseFloat(discountValue),
        applicableType,
        minPurchaseAmount: minPurchaseAmount
          ? parseFloat(minPurchaseAmount)
          : null,
        maxUses: maxUses ? parseInt(maxUses) : null,
        maxUsesPerUser: maxUsesPerUser ? parseInt(maxUsesPerUser) : null,
        validFrom: fromDate,
        validUntil: untilDate,
        isActive,
        createdBy: userId,
        currentUses: 0,
      },
      { transaction }
    );

    await transaction.commit();

    // Fetch complete discount code with associations
    const completeDiscountCode = await DiscountCode.findByPk(discountCode.discountId, { // FIXED: use correct PK
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["userId", "username", "email"], // FIXED: use correct PK and attributes
        },
        // TEMPORARILY DISABLED - discount categories association
        // {
        //   model: Category,
        //   as: "discountCategories", // FIXED: use correct alias
        //   attributes: ["id", "title"],
        //   through: { attributes: [] },
        // },
      ],
    });

    return sendResponse(
      res,
      201,
      true,
      "Discount code created successfully",
      completeDiscountCode
    );
  } catch (error) {
    await transaction.rollback();
    console.error("Create discount code error:", error);
    return sendServerError(res, error);
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
          attributes: ["userId", "username", "email"],
        },
        // TEMPORARILY DISABLED - discount categories association
        // {
        //   model: Category,
        //   as: "discountCategories", // FIXED: use correct alias
        //   attributes: ["id", "title"],
        //   through: { attributes: [] },
        // },
        {
          model: DiscountUsage,
          as: "usages",
          attributes: [
            "usageId", // FIXED: use correct primary key
            "userId",
            "discountAmount",
            "originalAmount",
            "finalAmount",
            "createdAt",
          ],
          include: [
            {
              model: User,
              as: "user",
              attributes: ["userId", "username", "email"], // FIXED: use correct PK
            },
            {
              model: Course,
              as: "course",
              attributes: ["courseId", "title"], // FIXED: use correct PK
              required: false,
            },
            {
              model: Project,
              as: "project",
              attributes: ["projectId", "title"], // FIXED: use correct PK
              required: false,
            },
          ],
          order: [["createdAt", "DESC"]],
          limit: 50,
        },
      ],
    });

    if (!discountCode) {
      return sendNotFound(res, "Discount code not found");
    }

    const dcData = discountCode.toJSON();
    const now = new Date();

    // Add computed status
    if (!dcData.isActive) {
      dcData.status = "inactive";
    } else if (dcData.validUntil < now) {
      dcData.status = "expired";
    } else if (dcData.validFrom > now) {
      dcData.status = "scheduled";
    } else {
      dcData.status = "active";
    }

    // Calculate usage statistics
    if (dcData.maxUses) {
      dcData.usagePercentage = (dcData.currentUses / dcData.maxUses) * 100;
    } else {
      dcData.usagePercentage = 0;
    }

    // Calculate total discount amount given
    const totalDiscountGiven = dcData.usages.reduce(
      (sum, usage) => sum + parseFloat(usage.discountAmount),
      0
    );
    dcData.totalDiscountGiven = totalDiscountGiven;

    return sendSuccess(res, "Discount code fetched successfully", dcData);
  } catch (error) {
    console.error("Get discount code by ID error:", error);
    return sendServerError(res, error);
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
      return sendNotFound(res, "Discount code not found");
    }

    // Validate dates if being updated
    if (updateData.validFrom || updateData.validUntil) {
      const fromDate = new Date(updateData.validFrom || discountCode.validFrom);
      const untilDate = new Date(
        updateData.validUntil || discountCode.validUntil
      );

      if (fromDate >= untilDate) {
        await transaction.rollback();
        return sendValidationError(
          res,
          "Valid from date must be before valid until date",
          {
            validFrom: "Must be before validUntil",
            validUntil: "Must be after validFrom",
          }
        );
      }
    }

    // Validate discount value if being updated
    if (updateData.discountValue !== undefined) {
      if (updateData.discountValue <= 0) {
        await transaction.rollback();
        return sendValidationError(
          res,
          "Discount value must be greater than 0",
          { discountValue: "Must be greater than 0" }
        );
      }

      if (
        updateData.discountType === "percentage" &&
        updateData.discountValue > 100
      ) {
        await transaction.rollback();
        return sendValidationError(
          res,
          "Percentage discount cannot exceed 100%",
          { discountValue: "Cannot exceed 100%" }
        );
      }
    }

    // Update discount code
    await discountCode.update(updateData, { transaction });

    await transaction.commit();

    // Fetch updated discount code with associations
    const updatedDiscountCode = await DiscountCode.findByPk(id, {
      include: [
        {
          model: User,
          as: "creator",
          attributes: ["userId", "username", "email"],
        },
        // TEMPORARILY DISABLED - discount categories association
        // {
        //   model: Category,
        //   as: "discountCategories", // FIXED: use correct alias
        //   attributes: ["id", "title"],
        //   through: { attributes: [] },
        // },
      ],
    });

    return sendSuccess(
      res,
      200,
      "Discount code updated successfully",
      updatedDiscountCode
    );
  } catch (error) {
    await transaction.rollback();
    console.error("Update discount code error:", error);
    return sendServerError(res, error);
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
      return sendNotFound(res, "Discount code not found");
    }

    // Check if discount code has been used
    const usageCount = await DiscountUsage.count({
      where: { discountId: id },
    });

    if (usageCount > 0) {
      await transaction.rollback();
      return sendError(
        res,
        400,
        "Cannot delete discount code that has been used. Consider deactivating it instead."
      );
    }

    await discountCode.destroy({ transaction });
    await transaction.commit();

    return sendSuccess(res, "Discount code deleted successfully");
  } catch (error) {
    await transaction.rollback();
    console.error("Delete discount code error:", error);
    return sendServerError(res, error);
  }
};

// ===================== DISCOUNT CODE VALIDATION =====================

// Validate discount code for all cart items of the user
export const validateDiscountCode = async (req, res) => {
  try {
    const { code } = req.body;

    // Validate userId
    if (!req.user || !req.user.userId) {
      return sendError(res, 401, "User not authenticated");
    }
    const userId = req.user.userId;

    if (!code) {
      return sendValidationError(res, "Discount code is required", { code: "Required" });
    }

    // Find discount code
    const discountCode = await DiscountCode.findOne({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        validFrom: { [Op.lte]: new Date() },
        validUntil: { [Op.gte]: new Date() },
      },
    });

    if (!discountCode) {
      return sendNotFound(res, "Invalid or expired discount code");
    }

    // Check usage limits
    if (
      discountCode.maxUses &&
      discountCode.currentUses >= discountCode.maxUses
    ) {
      return sendError(res, 400, "Discount code usage limit exceeded");
    }

    if (discountCode.maxUsesPerUser) {
      const userUsages = await DiscountUsage.count({
        where: { userId, discountId: discountCode.discountId }, // FIXED: use correct PK
      });
      if (userUsages >= discountCode.maxUsesPerUser) {
        return sendError(res, 400, "You have reached the usage limit for this discount code");
      }
    }

    // Get user's cart items
    const cartItems = await Cart.findAll({
      where: { userId },
      include: [
        {
          model: Course,
          as: "course",
          required: false,
          attributes: ["courseId", "title", "price", "categoryId"],
        },
        {
          model: Project,
          as: "project",
          required: false,
          attributes: ["projectId", "title", "price", "categoryId"],
        },
      ],
    });

    if (!cartItems.length) {
      return sendError(res, 400, "No items in cart to apply discount");
    }

    // Calculate total original amount
    let totalOriginalAmount = cartItems.reduce((sum, item) => sum + parseFloat(item.price), 0);
    totalOriginalAmount = Number(totalOriginalAmount.toFixed(2));
    console.log("Total original amount: ", totalOriginalAmount);
    // Apply discount to total amount
    let totalDiscountAmount = 0;
    if (discountCode.discountType === "percentage") {
      totalDiscountAmount = (totalOriginalAmount * discountCode.discountValue) / 100;

      // Apply maximum discount limit if set
      if (discountCode.maxDiscountAmount && totalDiscountAmount > discountCode.maxDiscountAmount) {
        totalDiscountAmount = discountCode.maxDiscountAmount;
      }
    } else {
      totalDiscountAmount = discountCode.discountValue;
    }
    totalDiscountAmount = Math.min(totalDiscountAmount, totalOriginalAmount);

    let totalFinalAmount = totalOriginalAmount - totalDiscountAmount;

    // Prepare cart items (no per-item discount)
    const discountedCart = cartItems.map(item => {
      let itemType = item.itemType;
      let itemData = item.course || item.project;
      let price = item.price;
      let categoryId = itemData?.categoryId;

      return {
        id: item.id,
        itemType,
        itemId: item.itemId,
        title: itemData?.title,
        price,
        discountApplied: false,
        discountAmount: 0,
        finalAmount: price,
        categoryId,
      };
    });

    return sendSuccess(res, "Discount code applied to cart total", {
      discountCode: {
        id: discountCode.discountId, // FIXED: use correct PK
        code: discountCode.code,
        description: discountCode.description,
        discountType: discountCode.discountType,
        discountValue: discountCode.discountValue,
      },
      cart: discountedCart,
      summary: {
        itemCount: discountedCart.length,
        totalOriginalAmount,
        totalDiscountAmount,
        totalFinalAmount,
        savings: totalDiscountAmount,
      },
    });
  } catch (error) {
    console.error("Validate discount code error:", error);
    return sendServerError(res, error);
  }
};

// ===================== DISCOUNT USAGE ANALYTICS =====================

// Get discount usage statistics (Admin only)
export const getDiscountUsageStatistics = async (req, res) => {
  try {
    const { period = "30d", discountCodeId } = req.query;

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

    const whereConditions = {
      createdAt: dateFilter,
    };

    if (discountCodeId) {
      whereConditions.discountId = discountCodeId;
    }

    // Total usages and discount amount
    const totalUsages = await DiscountUsage.count({ where: whereConditions });

    const totalDiscountResult = await DiscountUsage.findAll({
      attributes: [
        [sequelize.fn("SUM", sequelize.col("discount_amount")), "totalDiscount"], // FIXED: use snake_case column name
      ],
      where: whereConditions,
      raw: true,
    });

    const totalDiscountGiven = parseFloat(
      totalDiscountResult[0]?.totalDiscount || 0
    );

    // Usage by discount code
    const usageByCode = await DiscountUsage.findAll({
      attributes: [
        [
          sequelize.fn("COUNT", sequelize.col("DiscountUsage.usage_id")), // FIXED: use correct PK
          "usageCount",
        ],
        [sequelize.fn("SUM", sequelize.col("discount_amount")), "totalDiscount"], // FIXED: use snake_case
      ],
      include: [
        {
          model: DiscountCode,
          as: "discountCode",
          attributes: ["discount_id", "code", "description"], // FIXED: use correct PK
        },
      ],
      where: whereConditions,
      group: [
        "discountCode.discountId", // FIXED: use correct PK
        "discountCode.code",
        "discountCode.description",
      ],
      order: [
        [sequelize.fn("COUNT", sequelize.col("DiscountUsage.usage_id")), "DESC"], // FIXED: use correct PK with snake_case
      ],
      limit: 10,
    });

    // Usage by type (course vs project)
    const usageByType = await DiscountUsage.findAll({
      attributes: [
        [
          sequelize.literal(`CASE 
          WHEN "courseId" IS NOT NULL THEN 'course' 
          WHEN "projectId" IS NOT NULL THEN 'project' 
          ELSE 'other' 
        END`),
          "type",
        ],
        [sequelize.fn("COUNT", sequelize.col("discount_id")), "count"],
        [sequelize.fn("SUM", sequelize.col("discount_amount")), "totalDiscount"],
      ],
      where: whereConditions,
      group: [
        sequelize.literal(`CASE 
        WHEN "courseId" IS NOT NULL THEN 'course' 
        WHEN "projectId" IS NOT NULL THEN 'project' 
        ELSE 'other' 
      END`),
      ],
      raw: true,
    });

    // Daily usage trend
    const dailyUsage = await DiscountUsage.findAll({
      attributes: [
        [sequelize.fn("DATE", sequelize.col("createdAt")), "date"],
        [sequelize.fn("COUNT", sequelize.col("discount_id")), "count"],
        [sequelize.fn("SUM", sequelize.col("discount_amount")), "totalDiscount"],
      ],
      where: whereConditions,
      group: [sequelize.fn("DATE", sequelize.col("createdAt"))],
      order: [[sequelize.fn("DATE", sequelize.col("createdAt")), "ASC"]],
      raw: true,
    });

    return sendSuccess(res, "Discount usage statistics fetched", {
      overview: {
        totalUsages,
        totalDiscountGiven,
        period,
      },
      usageByCode,
      usageByType,
      dailyTrend: dailyUsage,
    });
  } catch (error) {
    console.error("Get discount usage statistics error:", error);
    return sendServerError(res, error);
  }
};

// ===================== COMPREHENSIVE ADMIN DISCOUNT MANAGEMENT =====================

/**
 * Get all discount codes with advanced filtering and analytics (Admin)
 */
export const getAllDiscountCodesAdmin = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      discountType,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
      dateRange,
    } = req.query;

    // Build where conditions
    const whereConditions = {};

    // Status filtering
    if (status === "active") {
      whereConditions.isActive = true;
      whereConditions.validFrom = { [Op.lte]: new Date() };
      whereConditions.validUntil = { [Op.gte]: new Date() };
    } else if (status === "inactive") {
      whereConditions.isActive = false;
    } else if (status === "expired") {
      whereConditions.validUntil = { [Op.lt]: new Date() };
    } else if (status === "scheduled") {
      whereConditions.validFrom = { [Op.gt]: new Date() };
    } else if (status === "usage_exhausted") {
      whereConditions[Op.and] = [
        sequelize.where(
          sequelize.col("currentUses"),
          Op.gte,
          sequelize.col("maxUses")
        ),
        { maxUses: { [Op.ne]: null } },
      ];
    }

    // Discount type filtering
    if (discountType) {
      whereConditions.discountType = discountType;
    }

    // Search functionality
    if (search) {
      whereConditions[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
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

    const { count, rows: discountCodes } = await DiscountCode.findAndCountAll({
      where: whereConditions,
      // Temporarily remove User association to isolate issue
      // include: [
      //   {
      //     model: User,
      //     as: "creator",
      //     attributes: ["userId", "username", "email"],
      //     required: false,
      //   },
      // ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset,
      distinct: true,
    });
    // Calculate additional analytics for each discount code
    const enrichedDiscountCodes = await Promise.all(
      discountCodes.map(async (discount) => {
        const discountData = discount.toJSON();
        const now = new Date();
        let status = "active";

        if (!discountData.isActive) {
          status = "inactive";
        } else if (new Date(discountData.validUntil) < now) {
          status = "expired";
        } else if (new Date(discountData.validFrom) > now) {
          status = "scheduled";
        } else if (
          discountData.maxUses &&
          discountData.currentUses >= discountData.maxUses
        ) {
          status = "usage_exhausted";
        }

        // Calculate usage stats
        const totalDiscountGivenResult = await DiscountUsage.findOne({
          attributes: [
            [sequelize.fn("SUM", sequelize.col("discount_amount")), "totalDiscount"],
            [sequelize.fn("COUNT", sequelize.col("discount_id")), "totalUsages"],
          ],
          where: { discountId: discountData.discountId },
          raw: true,
        });

        const totalDiscountGiven = parseFloat(totalDiscountGivenResult?.totalDiscount || 0);
        const totalUsages = parseInt(totalDiscountGivenResult?.totalUsages || 0);

        let usagePercentage = 0;
        if (discountData.maxUses) {
          usagePercentage = (discountData.currentUses / discountData.maxUses) * 100;
        }

        return {
          ...discountData,
          status,
          usagePercentage,
          totalDiscountGiven,
          effectiveness: {
            usageRate: discountData.maxUses
              ? ((discountData.currentUses / discountData.maxUses) * 100).toFixed(2)
              : null,
            avgDiscountPerUse: totalUsages > 0 ? (totalDiscountGiven / totalUsages).toFixed(2) : 0,
            daysActive: Math.ceil((now - new Date(discountData.createdAt)) / (1000 * 60 * 60 * 24)),
          },
          totalUsages,
        };
      })
    );

    // Calculate overall statistics
    const overallStats = {
      totalCodes: count,
      activeCodesCount: enrichedDiscountCodes.filter((d) => d.status === "active").length,
      expiredCodesCount: enrichedDiscountCodes.filter((d) => d.status === "expired").length,
      scheduledCodesCount: enrichedDiscountCodes.filter((d) => d.status === "scheduled").length,
      usageExhaustedCodesCount: enrichedDiscountCodes.filter((d) => d.status === "usage_exhausted").length,
      totalDiscountGiven: enrichedDiscountCodes.reduce((sum, d) => sum + d.totalDiscountGiven, 0),
      totalUsages: enrichedDiscountCodes.reduce((sum, d) => sum + d.totalUsages, 0),
    };

    return sendSuccess(res, "Discount codes retrieved successfully", {
      discountCodes: enrichedDiscountCodes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalRecords: count,
        recordsPerPage: parseInt(limit),
      },
      overallStatistics: overallStats,
    });
  } catch (error) {
    console.error("Get all discount codes admin error:", error);
    return sendServerError(res, error);
  }
};

/**
 * Get discount code usage analytics (Admin)
 */
export const getDiscountAnalytics = async (req, res) => {
  try {
    const { discountId } = req.params;
    const { period = "30d" } = req.query;

    // Validate discount code exists
    const discountCode = await DiscountCode.findByPk(discountId);
    if (!discountCode) {
      return sendNotFound(res, "Discount code not found");
    }

    // Calculate date range based on period
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
      default:
        dateFilter = {
          [Op.gte]: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        };
    }

    // Get usage statistics over time
    const usageOverTime = await DiscountUsage.findAll({
      where: {
        discountCodeId: discountId,
        createdAt: dateFilter,
      },
      attributes: [
        [sequelize.fn("DATE", sequelize.col("createdAt")), "date"],
        [sequelize.fn("COUNT", sequelize.col("*")), "usageCount"],
        [sequelize.fn("SUM", sequelize.col("discount_amount")), "totalDiscount"],
      ],
      group: [sequelize.fn("DATE", sequelize.col("createdAt"))],
      order: [[sequelize.fn("DATE", sequelize.col("createdAt")), "ASC"]],
    });

    // Get user demographics
    const userDemographics = await DiscountUsage.findAll({
      where: { discountId: discountId },
      include: [
        {
          model: User,
          attributes: ["createdAt", "role"],
        },
      ],
      attributes: [
        [
          sequelize.fn(
            "COUNT",
            sequelize.fn("DISTINCT", sequelize.col("userId"))
          ),
          "uniqueUsers",
        ],
      ],
    });

    // Get product usage breakdown
    const productUsage = await DiscountUsage.findAll({
      where: { discountId: discountId },
      attributes: [
        [sequelize.col("courseId"), "courseId"],
        [sequelize.col("projectId"), "projectId"],
        [sequelize.fn("COUNT", sequelize.col("*")), "usageCount"],
        [sequelize.fn("SUM", sequelize.col("discount_amount")), "totalDiscount"],
      ],
      include: [
        {
          model: Course,
          attributes: ["title"],
          required: false,
        },
        {
          model: Project,
          attributes: ["title"],
          required: false,
        },
      ],
      group: ["courseId", "projectId", "Course.id", "Project.id"],
    });

    const analytics = {
      discountCode: discountCode.toJSON(),
      usageOverTime,
      userDemographics,
      productUsage,
      summary: {
        totalUsages: usageOverTime.reduce(
          (sum, item) => sum + parseInt(item.dataValues.usageCount),
          0
        ),
        totalDiscountGiven: usageOverTime.reduce(
          (sum, item) => sum + parseFloat(item.dataValues.totalDiscount || 0),
          0
        ),
        avgDiscountPerUse: 0, // Will be calculated
        conversionRate: 0, // Mock - would need additional data
      },
    };

    // Calculate average discount per use
    if (analytics.summary.totalUsages > 0) {
      analytics.summary.avgDiscountPerUse = (
        analytics.summary.totalDiscountGiven / analytics.summary.totalUsages
      ).toFixed(2);
    }

    return sendSuccess(
      res,
      200,
      "Discount analytics retrieved successfully",
      analytics
    );
  } catch (error) {
    console.error("Get discount analytics error:", error);
    return sendServerError(res, error);
  }
};
