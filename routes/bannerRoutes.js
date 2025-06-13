import express from "express";
import {
  getAllBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  bulkCreateBanners,
  getActiveBanners,
} from "../controller/bannerController.js";
import { authenticateToken, isAdmin } from "../middleware/authMiddleware.js";
import { 
    commonSchemas,
    validateSchema, 
    asyncErrorHandler 
} from "../middleware/fieldValidation.js";
import Joi from 'joi';

// Banner validation schemas
const bannerValidation = {
  create: Joi.object({
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().max(500).optional(),
    image: Joi.string().uri().required(),
    linkUrl: Joi.string().uri().optional(),
    isActive: Joi.boolean().default(true),
    displayOrder: Joi.number().integer().min(0).default(0),
    validFrom: Joi.date().optional(),
    validUntil: Joi.date().min(Joi.ref('validFrom')).optional()
  }),
  
  update: Joi.object({
    title: Joi.string().min(3).max(200).optional(),
    description: Joi.string().max(500).optional(),
    image: Joi.string().uri().optional(),
    linkUrl: Joi.string().uri().optional(),
    isActive: Joi.boolean().optional(),
    displayOrder: Joi.number().integer().min(0).optional(),
    validFrom: Joi.date().optional(),
    validUntil: Joi.date().optional()
  }),
  
  filter: Joi.object({
    ...commonSchemas.pagination,
    sortBy: Joi.string().valid('title', 'createdAt', 'displayOrder').default('displayOrder'),
    sortOrder: Joi.string().valid('ASC', 'DESC').default('ASC'),
    isActive: Joi.boolean().optional()
  })
};

const router = express.Router();

// Public routes
router.get("/active", asyncErrorHandler(getActiveBanners)); // Get active banners for public use

// Admin routes (require authentication and admin role)
router.get("/", 
    isAdmin, 
    validateSchema(bannerValidation.filter, 'query'),
    asyncErrorHandler(getAllBanners)
); // Get all banners with pagination

router.get("/:id", 
    isAdmin, 
    validateSchema(Joi.object({ id: commonSchemas.id.required() }), 'params'),
    asyncErrorHandler(getBannerById)
); // Get banner by ID

router.post("/", 
    isAdmin, 
    validateSchema(bannerValidation.create),
    asyncErrorHandler(createBanner)
); // Create new banner

router.put("/:id", 
    isAdmin, 
    validateSchema(Joi.object({ id: commonSchemas.id.required() }), 'params'),
    validateSchema(bannerValidation.update),
    asyncErrorHandler(updateBanner)
); // Update banner by ID

router.delete("/:id", 
    isAdmin, 
    validateSchema(Joi.object({ id: commonSchemas.id.required() }), 'params'),
    asyncErrorHandler(deleteBanner)
); // Delete banner by ID

router.post("/bulk", 
    isAdmin, 
    validateSchema(Joi.object({ banners: Joi.array().items(bannerValidation.create).required() })),
    asyncErrorHandler(bulkCreateBanners)
); // Bulk create banners

export default router;
