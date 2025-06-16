/**
 * Comprehensive Field Validation Middleware for StartGoals API
 * Provides robust input validation across all endpoints
 */

import Joi from 'joi';

/**
 * Handle validation errors locally
 */
const handleValidationError = (res, err) => {
  return res.status(400).json({
    status: false,
    success: false,
    message: 'Validation failed',
    data: null,
    errors: err.details ? err.details.map(detail => ({
      field: detail.path ? detail.path.join('.') : 'unknown',
      message: detail.message,
      value: detail.context?.value
    })) : [{ message: err.message }]
  });
};

// Common validation patterns
const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  mobile: /^\+?[1-9]\d{1,14}$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
};

// Common Joi schemas
const commonSchemas = {
  id: Joi.number().integer().positive(),
  uuid: Joi.string().pattern(patterns.uuid),
  email: Joi.string().pattern(patterns.email).lowercase().trim(),
  mobile: Joi.string().pattern(patterns.mobile).trim(),
  identifier: Joi.alternatives().try(
    Joi.string().pattern(patterns.email),
    Joi.string().pattern(patterns.mobile)
  ),
  password: Joi.string().min(8).max(100),
  strongPassword: Joi.string().pattern(patterns.strongPassword)
    .message('Password must contain at least 8 characters, including uppercase, lowercase, number and special character'),
  url: Joi.string().pattern(patterns.url),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  },
  sortOrder: Joi.string().valid('ASC', 'DESC', 'asc', 'desc').default('DESC'),
  status: Joi.string().valid('active', 'inactive', 'draft', 'published', 'archived'),
  dateRange: {
    dateFrom: Joi.date().iso(),
    dateTo: Joi.date().iso().min(Joi.ref('dateFrom'))
  }
};

// User validation schemas
export const userValidation = {
  register: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: commonSchemas.email,
    mobile: commonSchemas.mobile,
    password: commonSchemas.strongPassword.required(),
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    role: Joi.string().valid('student', 'teacher', 'admin', 'owner').default('student')
  }).or('email', 'mobile'),

  login: Joi.object({
    identifier: commonSchemas.identifier.required(),
    password: Joi.string().required()
  }),

  updateProfile: Joi.object({
    firstName: Joi.string().min(2).max(50),
    lastName: Joi.string().min(2).max(50),
    dateOfBirth: Joi.date().max('now'),
    profileImage: commonSchemas.url,
    bio: Joi.string().max(500),
    skills: Joi.array().items(commonSchemas.id),
    languages: Joi.array().items(commonSchemas.id),
    goalId: commonSchemas.id
  })
};

// Course validation schemas
export const courseValidation = {
  create: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    price: Joi.number().min(0).max(10000).required(),
    salePrice: Joi.number().min(0).max(Joi.ref('price')),
    categoryId: commonSchemas.id.required(),
    levelId: commonSchemas.id.required(),
    duration: Joi.number().min(1).max(500),
    maxStudents: Joi.number().min(1).max(1000),
    type: Joi.string().valid('live', 'recorded').required(),
    language: Joi.string().min(2).max(10),
    thumbnailImage: commonSchemas.url,
    previewVideo: commonSchemas.url,
    requirements: Joi.array().items(Joi.string().max(200)),
    goals: Joi.array().items(Joi.string().max(200)),
    tags: Joi.array().items(commonSchemas.id),
    isPublished: Joi.boolean().default(false),
    isFeatured: Joi.boolean().default(false)
  }),

  update: Joi.object({
    title: Joi.string().min(5).max(200),
    description: Joi.string().min(10).max(2000),
    price: Joi.number().min(0).max(10000),
    salePrice: Joi.number().min(0),
    categoryId: commonSchemas.id,
    levelId: commonSchemas.id,
    duration: Joi.number().min(1).max(500),
    maxStudents: Joi.number().min(1).max(1000),
    language: Joi.string().min(2).max(10),
    thumbnailImage: commonSchemas.url,
    previewVideo: commonSchemas.url,
    requirements: Joi.array().items(Joi.string().max(200)),
    goals: Joi.array().items(Joi.string().max(200)),
    tags: Joi.array().items(commonSchemas.id),
    isPublished: Joi.boolean(),
    isFeatured: Joi.boolean(),
    status: commonSchemas.status
  }),

  filter: Joi.object({
    ...commonSchemas.pagination,
    sortBy: Joi.string().valid('title', 'price', 'createdAt', 'rating', 'enrollments'),
    sortOrder: commonSchemas.sortOrder,
    search: Joi.string().min(2).max(100),
    category: commonSchemas.id,
    level: commonSchemas.id,
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    minDuration: Joi.number().min(1),
    maxDuration: Joi.number().min(1),
    type: Joi.string().valid('live', 'recorded'),
    status: commonSchemas.status,
    instructor: commonSchemas.id,
    ...commonSchemas.dateRange
  })
};

// Project validation schemas
export const projectValidation = {
  create: Joi.object({
    title: Joi.string().min(5).max(200).required(),
    description: Joi.string().min(10).max(2000).required(),
    shortDescription: Joi.string().max(500),
    price: Joi.number().min(0).max(10000).required(),
    salePrice: Joi.number().min(0).max(Joi.ref('price')),
    categoryId: commonSchemas.id.required(),
    techStack: Joi.array().items(Joi.string().max(50)),
    programmingLanguages: Joi.array().items(Joi.string().max(30)),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
    estimatedTime: Joi.string().max(50),
    demoUrl: commonSchemas.url,
    previewImages: Joi.array().items(commonSchemas.url),
    requirements: Joi.array().items(Joi.string().max(200)),
    features: Joi.array().items(Joi.string().max(200)),
    compatibility: Joi.array().items(Joi.string().max(100)),
    license: Joi.string().max(100),
    version: Joi.string().max(20),
    tags: Joi.array().items(commonSchemas.id)
  }),

  purchase: Joi.object({
    projectId: commonSchemas.id.required(),
    discountCode: Joi.string().max(50),
    paymentMethod: Joi.string().valid('credit_card', 'debit_card', 'paypal', 'stripe').required()
  })
};

// OTP validation schemas
export const otpValidation = {
  send: Joi.object({
    identifier: commonSchemas.identifier.required(),
    method: Joi.string().valid('email', 'sms')
  }),

  verify: Joi.object({
    identifier: commonSchemas.identifier.required(),
    otp: Joi.string().length(6).pattern(/^[0-9]+$/).required()
  }),
  resetPassword: Joi.object({
    identifier: commonSchemas.identifier.required(),
    newPassword: commonSchemas.strongPassword.required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  })
};

// Course rating validation schemas
export const courseRatingValidation = {
  rate: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required()
      .messages({
        'number.min': 'Rating must be at least 1',
        'number.max': 'Rating must be at most 5',
        'any.required': 'Rating is required'
      }),
    review: Joi.string().max(1000).optional().allow('')
      .messages({
        'string.max': 'Review must be under 1000 characters'
      }),
    pros: Joi.array().items(Joi.string().max(100)).max(5).optional(),
    cons: Joi.array().items(Joi.string().max(100)).max(5).optional(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
    timeToComplete: Joi.string().max(50).optional(),
    wouldRecommend: Joi.boolean().optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional()
  }),
  
  filter: Joi.object({
    ...commonSchemas.pagination,
    rating: Joi.number().integer().min(1).max(5).optional(),
    verified: Joi.string().valid('true', 'false').optional(),
    sortBy: Joi.string().valid('helpful', 'recent', 'rating_high', 'rating_low').default('helpful')
  })
};

// Instructor rating validation schemas  
export const instructorRatingValidation = {
  rate: Joi.object({
    rating: Joi.number().integer().min(1).max(5).required()
      .messages({
        'number.min': 'Rating must be at least 1',
        'number.max': 'Rating must be at most 5',
        'any.required': 'Rating is required'
      }),
    review: Joi.string().max(1000).optional().allow('')
      .messages({
        'string.max': 'Review must be under 1000 characters'
      }),
    courseId: Joi.number().integer().positive().optional(),
    criteria: Joi.object({
      teaching: Joi.number().integer().min(1).max(5).optional(),
      communication: Joi.number().integer().min(1).max(5).optional(),
      knowledge: Joi.number().integer().min(1).max(5).optional(),
      responsiveness: Joi.number().integer().min(1).max(5).optional()
    }).optional()
  }),
  
  filter: Joi.object({
    ...commonSchemas.pagination,
    rating: Joi.number().integer().min(1).max(5).optional(),
    courseId: Joi.number().integer().positive().optional(),
    sortBy: Joi.string().valid('recent', 'rating_high', 'rating_low').default('recent')
  })
};

// Project rating validation schemas
export const projectRatingValidation = {
  add: Joi.object({
    projectId: Joi.number().integer().positive().required()
      .messages({
        'any.required': 'Project ID is required',
        'number.positive': 'Valid project ID is required'
      }),
    rating: Joi.number().integer().min(1).max(5).required()
      .messages({
        'number.min': 'Rating must be between 1 and 5',
        'number.max': 'Rating must be between 1 and 5',
        'any.required': 'Rating is required'
      }),
    review: Joi.string().max(1000).optional().allow('')
      .messages({
        'string.max': 'Review must be under 1000 characters'
      }),
    tags: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    pros: Joi.array().items(Joi.string().max(100)).max(5).optional(),
    cons: Joi.array().items(Joi.string().max(100)).max(5).optional(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
    timeToComplete: Joi.string().max(50).optional()
  }),
  
  update: Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    review: Joi.string().max(1000).optional().allow('')
  }),
  
  filter: Joi.object({
    ...commonSchemas.pagination,
    rating: Joi.number().integer().min(1).max(5).optional(),
    status: Joi.string().valid('pending', 'approved', 'rejected', 'all').default('approved'),
    sortBy: Joi.string().valid('createdAt', 'rating', 'status').default('createdAt'),    sortOrder: commonSchemas.sortOrder
  })
};

// Section management validation schemas
export const sectionValidation = {
  create: Joi.object({
    courseId: commonSchemas.id.required(),
    title: Joi.string().min(3).max(200).required(),
    description: Joi.string().max(1000).optional(),
    order: Joi.number().integer().min(1).default(1),
    isPublished: Joi.boolean().default(false),
    estimatedDuration: Joi.number().integer().min(1).optional(), // in minutes
    objectives: Joi.array().items(Joi.string().max(200)).max(10).optional(),
    prerequisites: Joi.array().items(Joi.string().max(200)).max(10).optional(),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced').optional(),
    tags: Joi.array().items(Joi.string().max(50)).max(20).optional(),
    lessons: Joi.array().items(
      Joi.object({
        title: Joi.string().min(3).max(200).required(),
        type: Joi.string().valid('video', 'text', 'exercise', 'quiz', 'assignment').required(),
        content: Joi.string().max(5000).optional(),
        videoUrl: commonSchemas.url.when('type', { is: 'video', then: Joi.required() }),
        videoDuration: Joi.number().integer().min(1).optional(), // in seconds
        order: Joi.number().integer().min(1).required(),
        isPublished: Joi.boolean().default(false),
        isPreview: Joi.boolean().default(false),
        isFree: Joi.boolean().default(false),
        objectives: Joi.array().items(Joi.string().max(200)).max(5).optional(),
        exerciseData: Joi.object({
          instructions: Joi.string().max(2000).optional(),
          starterCode: Joi.string().max(10000).optional(),
          solution: Joi.string().max(10000).optional(),
          testCases: Joi.array().items(Joi.string().max(500)).max(20).optional()
        }).when('type', { is: 'exercise', then: Joi.optional() }),
        resources: Joi.array().items(
          Joi.object({
            title: Joi.string().min(3).max(100).required(),
            type: Joi.string().valid('file', 'link', 'pdf', 'video', 'audio').required(),
            fileUrl: commonSchemas.url.required(),
            description: Joi.string().max(500).optional(),
            order: Joi.number().integer().min(1).required(),
            isDownloadable: Joi.boolean().default(true),
            fileSize: Joi.number().integer().min(0).optional(), // in bytes
            duration: Joi.number().integer().min(0).optional() // in seconds for media
          })
        ).optional()
      })
    ).optional()
  }),

  reorder: Joi.object({
    sectionOrder: Joi.array().items(
      Joi.object({
        sectionId: commonSchemas.id.required(),
        order: Joi.number().integer().min(1).required(),
        lessonOrder: Joi.array().items(
          Joi.object({
            lessonId: commonSchemas.id.required(),
            order: Joi.number().integer().min(1).required()
          })
        ).optional()
      })
    ).required(),
    preserveProgress: Joi.boolean().default(true),
    updateTimestamp: Joi.boolean().default(true)
  })
};

// Batch validation schemas
export const batchValidation = {
  create: Joi.object({
    courseId: commonSchemas.id.required(),
    batchName: Joi.string().min(3).max(100).required(),
    description: Joi.string().max(500),
    startDate: Joi.date().min('now').required(),
    endDate: Joi.date().min(Joi.ref('startDate')).required(),
    maxStudents: Joi.number().min(1).max(1000).required(),
    schedule: Joi.object({
      days: Joi.array().items(Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
      startTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      endTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
      timezone: Joi.string().max(50)
    }),
    autoEnrollmentCriteria: Joi.object({
      enabled: Joi.boolean().default(false),
      skills: Joi.array().items(commonSchemas.id),
      experience: Joi.string().valid('beginner', 'intermediate', 'advanced'),
      location: Joi.string().max(100)
    })
  })
};

// Search validation schemas
export const searchValidation = {
  suggestions: Joi.object({
    query: Joi.string().min(2).max(100).required(),
    limit: Joi.number().min(1).max(20).default(10),
    type: Joi.string().valid('all', 'courses', 'projects', 'instructors').default('all')
  }),

  unified: Joi.object({
    query: Joi.string().min(2).max(100),
    type: Joi.string().valid('all', 'courses', 'projects').default('all'),
    ...commonSchemas.pagination,
    sortBy: Joi.string().valid('relevance', 'price_low', 'price_high', 'newest', 'rating', 'popular'),
    category: commonSchemas.id,
    level: commonSchemas.id,
    price_min: Joi.number().min(0),
    price_max: Joi.number().min(0),
    difficulty: Joi.string().valid('beginner', 'intermediate', 'advanced'),
    instructor: commonSchemas.id,
    tags: Joi.alternatives().try(
      commonSchemas.id,
      Joi.array().items(commonSchemas.id)
    ),
    programmingLanguages: Joi.alternatives().try(
      Joi.string().max(30),
      Joi.array().items(Joi.string().max(30))
    )
  })
};

// Discount validation schemas
export const discountValidation = {
  create: Joi.object({
    code: Joi.string().uppercase().min(3).max(20).required(),
    description: Joi.string().max(200),
    discountType: Joi.string().valid('percentage', 'fixed').required(),
    discountValue: Joi.number().min(0).required(),
    applicableType: Joi.string().valid('course', 'project', 'all').required(),
    applicableItems: Joi.array().items(commonSchemas.id),
    minOrderValue: Joi.number().min(0),
    maxUses: Joi.number().min(1),
    maxUsesPerUser: Joi.number().min(1),
    validFrom: Joi.date().required(),
    validUntil: Joi.date().min(Joi.ref('validFrom')).required(),
    isActive: Joi.boolean().default(true),
    geoRestrictions: Joi.array().items(Joi.string().length(2))
  })
};

// Generic validation middleware factory
export const validateSchema = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : 
                  source === 'params' ? req.params : req.body;
    
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });
    
    if (error) {
      return handleValidationError(res, error);
    }
    
    // Replace the source data with validated and sanitized data
    if (source === 'query') req.query = value;
    else if (source === 'params') req.params = value;
    else req.body = value;
    
    next();
  };
};

// Async error handler wrapper
export const asyncErrorHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// File validation for uploads
// Category Management validation schemas
export const categoryValidation = {
  create: Joi.object({
    categoryName: Joi.string().min(2).max(100).required(),
    description: Joi.string().max(500).optional(),
    parentId: commonSchemas.id.optional(),
    slug: Joi.string().min(2).max(150).pattern(/^[a-z0-9-]+$/).optional(),
    metaTitle: Joi.string().max(60).optional(),
    metaDescription: Joi.string().max(160).optional(),
    metaKeywords: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    isActive: Joi.boolean().default(true),
    order: Joi.number().integer().min(0).optional(),
    imageUrl: commonSchemas.url.optional(),
    iconClass: Joi.string().max(50).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional()
  }),
  
  update: Joi.object({
    categoryName: Joi.string().min(2).max(100).optional(),
    description: Joi.string().max(500).optional(),
    parentId: commonSchemas.id.optional().allow(null),
    slug: Joi.string().min(2).max(150).pattern(/^[a-z0-9-]+$/).optional(),
    metaTitle: Joi.string().max(60).optional(),
    metaDescription: Joi.string().max(160).optional(),
    metaKeywords: Joi.array().items(Joi.string().max(50)).max(10).optional(),
    isActive: Joi.boolean().optional(),
    order: Joi.number().integer().min(0).optional(),
    imageUrl: commonSchemas.url.optional(),
    iconClass: Joi.string().max(50).optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional()
  }),
  
  query: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().max(100).optional(),
    parentId: commonSchemas.id.optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().valid('categoryName', 'order', 'createdAt').default('order'),
    sortOrder: commonSchemas.sortOrder,
    includeChildren: Joi.boolean().default(false),
    depth: Joi.number().integer().min(1).max(5).default(1)
  }),
  
  bulkUpdate: Joi.object({
    categories: Joi.array().items(
      Joi.object({
        categoryId: commonSchemas.id.required(),
        order: Joi.number().integer().min(0).required()
      })
    ).min(1).max(50).required()
  })
};

// Language Management validation schemas
export const languageValidation = {
  create: Joi.object({
    language: Joi.string().min(2).max(50).required(),
    languageCode: Joi.string().length(2).pattern(/^[a-z]{2}$/).required(),
    nativeName: Joi.string().min(2).max(50).optional(),
    isActive: Joi.boolean().default(true),
    order: Joi.number().integer().min(0).optional(),
    flag: commonSchemas.url.optional()
  }),
  
  update: Joi.object({
    language: Joi.string().min(2).max(50).optional(),
    languageCode: Joi.string().length(2).pattern(/^[a-z]{2}$/).optional(),
    nativeName: Joi.string().min(2).max(50).optional(),
    isActive: Joi.boolean().optional(),
    order: Joi.number().integer().min(0).optional(),
    flag: commonSchemas.url.optional()
  }),
  
  query: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().max(100).optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().valid('language', 'languageCode', 'order', 'createdAt').default('order'),
    sortOrder: commonSchemas.sortOrder
  })
};

// Course Level validation schemas
export const courseLevelValidation = {
  create: Joi.object({
    level: Joi.string().min(2).max(50).required(),
    description: Joi.string().max(200).optional(),
    order: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().default(true),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    iconClass: Joi.string().max(50).optional()
  }),
  
  update: Joi.object({
    level: Joi.string().min(2).max(50).optional(),
    description: Joi.string().max(200).optional(),
    order: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
    color: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
    iconClass: Joi.string().max(50).optional()
  }),
  
  query: Joi.object({
    ...commonSchemas.pagination,
    search: Joi.string().max(100).optional(),
    isActive: Joi.boolean().optional(),
    sortBy: Joi.string().valid('level', 'order', 'createdAt').default('order'),
    sortOrder: commonSchemas.sortOrder
  })
};

// File Upload validation schemas
export const fileValidation = {
  upload: Joi.object({
    type: Joi.string().valid('image', 'video', 'document', 'audio', 'archive').required(),
    category: Joi.string().valid('course', 'project', 'lesson', 'resource', 'profile', 'banner').required(),
    description: Joi.string().max(200).optional(),
    isPublic: Joi.boolean().default(false),
    tags: Joi.array().items(Joi.string().max(30)).max(10).optional()
  }),
  
  query: Joi.object({
    ...commonSchemas.pagination,
    type: Joi.string().valid('image', 'video', 'document', 'audio', 'archive').optional(),
    category: Joi.string().valid('course', 'project', 'lesson', 'resource', 'profile', 'banner').optional(),
    search: Joi.string().max(100).optional(),
    isPublic: Joi.boolean().optional(),
    sortBy: Joi.string().valid('filename', 'size', 'createdAt').default('createdAt'),
    sortOrder: commonSchemas.sortOrder
  })
};

export const validateFileUpload = (options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/zip'],
    maxSize = 10 * 1024 * 1024, // 10MB
    maxFiles = 5
  } = options;
  
  return (req, res, next) => {
    if (!req.files || req.files.length === 0) {
      return next();
    }
    
    if (req.files.length > maxFiles) {
      return handleValidationError(res, {
        details: [{ field: 'files', message: `Maximum ${maxFiles} files allowed` }]
      });
    }
    
    for (const file of req.files) {
      if (!allowedTypes.includes(file.mimetype)) {
        return handleValidationError(res, {
          details: [{ 
            field: 'files', 
            message: `File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}` 
          }]
        });
      }
      
      if (file.size > maxSize) {
        return handleValidationError(res, {
          details: [{ 
            field: 'files', 
            message: `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes` 
          }]
        });
      }
    }
    
    next();
  };
};

// Course Purchase validation schemas
export const coursePurchaseValidation = {
  createOrder: Joi.object({
    courseId: commonSchemas.id.required()
      .messages({
        'any.required': 'Course ID is required',
        'number.positive': 'Valid course ID is required'
      })
  }),

  verifyPayment: Joi.object({
    razorpay_order_id: Joi.string().required()
      .messages({
        'any.required': 'Razorpay order ID is required'
      }),
    razorpay_payment_id: Joi.string().required()
      .messages({
        'any.required': 'Razorpay payment ID is required'
      }),
    razorpay_signature: Joi.string().required()
      .messages({
        'any.required': 'Razorpay signature is required'
      }),
    courseId: commonSchemas.id.required()
      .messages({
        'any.required': 'Course ID is required',
        'number.positive': 'Valid course ID is required'
      })
  }),

  purchaseHistory: Joi.object({
    ...commonSchemas.pagination,
    status: Joi.string().valid('not_started', 'in_progress', 'completed').optional(),
    type: Joi.string().valid('live', 'recorded').optional(),
    sortBy: Joi.string().valid('enrollmentDate', 'courseTitle', 'completionStatus').default('enrollmentDate'),
    sortOrder: commonSchemas.sortOrder
  }),

  paymentFailure: Joi.object({
    razorpay_order_id: Joi.string().required(),
    razorpay_payment_id: Joi.string().optional(),
    error: Joi.object({
      code: Joi.string().optional(),
      description: Joi.string().optional(),
      source: Joi.string().optional(),
      step: Joi.string().optional(),
      reason: Joi.string().optional()
    }).optional()
  })
};

export default {
  patterns,
  commonSchemas,
  userValidation,
  courseValidation,
  projectValidation,
  otpValidation,
  batchValidation,
  searchValidation,
  discountValidation,
  categoryValidation,
  languageValidation,
  courseLevelValidation,
  fileValidation,
  coursePurchaseValidation,
  validateSchema,
  validateFileUpload
};
