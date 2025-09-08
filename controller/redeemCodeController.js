import RedeemCode from "../model/redeemCode.js";
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

// Create new redeem code (Admin only)
export const createRedeemCode = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { code, value, maxRedeem, expiry, status = 'active' } = req.body;

    const userId = req.user.userId;

    // Validate required fields
    if (!code || !value || !expiry) {
      await transaction.rollback();
      return sendValidationError(res, "Missing required fields", {
        code: !code ? "Required field" : undefined,
        value: !value ? "Required field" : undefined,
        expiry: !expiry ? "Required field" : undefined,
      });
    }

    // Validate value
    if (value <= 0) {
      await transaction.rollback();
      return sendValidationError(res, "Value must be greater than 0", {
        value: "Must be greater than 0",
      });
    }

    // Check if code already exists
    const existingCode = await RedeemCode.findOne({
      where: { code: code.toUpperCase() },
    });

    if (existingCode) {
      await transaction.rollback();
      return sendConflict(res, "code", code.toUpperCase());
    }

    // Validate expiry date
    const expiryDate = new Date(expiry);
    if (expiryDate <= new Date()) {
      await transaction.rollback();
      return sendValidationError(res, "Expiry date must be in the future", {
        expiry: "Must be in the future",
      });
    }

    // Create redeem code
    const redeemCode = await RedeemCode.create(
      {
        code: code.toUpperCase(),
        value: parseFloat(value),
        maxRedeem: maxRedeem ? parseInt(maxRedeem) : null,
        expiry: expiryDate,
        status,
        createdBy: userId,
        currentRedeems: 0,
      },
      { transaction }
    );

    await transaction.commit();

    return sendSuccess(res, "Redeem code created successfully", redeemCode);
  } catch (error) {
    await transaction.rollback();
    console.error("Create redeem code error:", error);
    return sendServerError(res, error);
  }
};

// Get single redeem code by ID (Admin only)
export const getRedeemCodeById = async (req, res) => {
  try {
    const { id } = req.params;

    const redeemCode = await RedeemCode.findByPk(id);

    if (!redeemCode) {
      return sendNotFound(res, "Redeem code not found");
    }

    const rcData = redeemCode.toJSON();
    const now = new Date();

    // Add computed status
    if (rcData.status === 'inactive') {
      rcData.computedStatus = "inactive";
    } else if (new Date(rcData.expiry) < now) {
      rcData.computedStatus = "expired";
    } else {
      rcData.computedStatus = "active";
    }

    // Calculate usage percentage
    if (rcData.maxRedeem) {
      rcData.usagePercentage = (rcData.currentRedeems / rcData.maxRedeem) * 100;
    } else {
      rcData.usagePercentage = 0;
    }

    return sendSuccess(res, "Redeem code fetched successfully", rcData);
  } catch (error) {
    console.error("Get redeem code by ID error:", error);
    return sendServerError(res, error);
  }
};

// Update redeem code (Admin only)
export const updateRedeemCode = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const updateData = req.body;

    const redeemCode = await RedeemCode.findByPk(id);
    if (!redeemCode) {
      await transaction.rollback();
      return sendNotFound(res, "Redeem code not found");
    }

    // Validate expiry date if being updated
    if (updateData.expiry) {
      const expiryDate = new Date(updateData.expiry);
      if (expiryDate <= new Date()) {
        await transaction.rollback();
        return sendValidationError(res, "Expiry date must be in the future", {
          expiry: "Must be in the future",
        });
      }
    }

    // Validate value if being updated
    if (updateData.value !== undefined) {
      if (updateData.value <= 0) {
        await transaction.rollback();
        return sendValidationError(res, "Value must be greater than 0", {
          value: "Must be greater than 0",
        });
      }
    }

    // Update redeem code
    await redeemCode.update(updateData, { transaction });

    await transaction.commit();

    const updatedRedeemCode = await RedeemCode.findByPk(id);

    return sendSuccess(res, "Redeem code updated successfully", updatedRedeemCode);
  } catch (error) {
    await transaction.rollback();
    console.error("Update redeem code error:", error);
    return sendServerError(res, error);
  }
};

// Delete redeem code (Admin only)
export const deleteRedeemCode = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const redeemCode = await RedeemCode.findByPk(id);
    if (!redeemCode) {
      await transaction.rollback();
      return sendNotFound(res, "Redeem code not found");
    }

    // Check if redeem code has been used
    if (redeemCode.currentRedeems > 0) {
      await transaction.rollback();
      return sendError(
        res,
        400,
        "Cannot delete redeem code that has been used. Consider deactivating it instead."
      );
    }

    await redeemCode.destroy({ transaction });
    await transaction.commit();

    return sendSuccess(res, "Redeem code deleted successfully");
  } catch (error) {
    await transaction.rollback();
    console.error("Delete redeem code error:", error);
    return sendServerError(res, error);
  }
};

// Get all redeem codes (Admin only)
export const getAllRedeemCodes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      sortBy = "createdAt",
      sortOrder = "DESC",
    } = req.query;

    // Build where conditions
    const whereConditions = {};

    // Status filtering
    if (status) {
      if (status === "expired") {
        whereConditions.expiry = { [Op.lt]: new Date() };
      } else {
        whereConditions.status = status;
      }
    }

    // Search functionality
    if (search) {
      whereConditions[Op.or] = [
        { code: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows: redeemCodes } = await RedeemCode.findAndCountAll({
      where: whereConditions,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset,
    });

    // Calculate additional analytics for each redeem code
    const enrichedRedeemCodes = redeemCodes.map((redeemCode) => {
      const rcData = redeemCode.toJSON();
      const now = new Date();

      // Add computed status
      if (rcData.status === 'inactive') {
        rcData.computedStatus = "inactive";
      } else if (new Date(rcData.expiry) < now) {
        rcData.computedStatus = "expired";
      } else {
        rcData.computedStatus = "active";
      }

      // Calculate usage percentage
      if (rcData.maxRedeem) {
        rcData.usagePercentage = (rcData.currentRedeems / rcData.maxRedeem) * 100;
      } else {
        rcData.usagePercentage = 0;
      }

      return rcData;
    });

    return sendSuccess(res, "Redeem codes retrieved successfully", {
      redeemCodes: enrichedRedeemCodes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalRecords: count,
        recordsPerPage: parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get all redeem codes error:", error);
    return sendServerError(res, error);
  }
};

// Validate redeem code for redemption
export const validateRedeemCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return sendValidationError(res, "Redeem code is required", { code: "Required" });
    }

    // Find redeem code
    const redeemCode = await RedeemCode.findOne({
      where: {
        code: code.toUpperCase(),
        status: 'active',
        expiry: { [Op.gte]: new Date() },
      },
    });

    if (!redeemCode) {
      return sendNotFound(res, "Invalid or expired redeem code");
    }

    // Check usage limits
    if (redeemCode.maxRedeem && redeemCode.currentRedeems >= redeemCode.maxRedeem) {
      return sendError(res, 400, "Redeem code usage limit exceeded");
    }

    return sendSuccess(res, "Redeem code is valid", {
      redeemCode: {
        id: redeemCode.redeemCodeId,
        code: redeemCode.code,
        value: redeemCode.value,
        expiry: redeemCode.expiry,
      },
    });
  } catch (error) {
    console.error("Validate redeem code error:", error);
    return sendServerError(res, error);
  }
};