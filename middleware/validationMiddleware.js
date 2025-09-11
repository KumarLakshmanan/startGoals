import {
  userValidation,
  courseValidation,
  projectValidation,
  otpValidation,
  courseRatingValidation,
  instructorRatingValidation,
  projectRatingValidation,
  sectionValidation,
  searchValidation,
  discountValidation,
  categoryValidation,
  languageValidation,
  courseLevelValidation,
  fileValidation,
  coursePurchaseValidation,
  projectFileValidation,
  validateSchema
} from './fieldValidation.js';

/**
 * Validation middleware factory for different endpoints
 * Automatically applies appropriate validation based on route and method
 */
export const createValidationMiddleware = (entity, operation, source = 'body') => {
  const validationMap = {
    user: {
      register: userValidation.register,
      login: userValidation.login,
      updateProfile: userValidation.updateProfile,
    },
    course: {
      create: courseValidation.create,
      update: courseValidation.update,
      filter: courseValidation.filter,
    },
    project: {
      create: projectValidation.create,
      update: projectValidation.update,
      filter: projectValidation.filter,
      purchase: projectValidation.purchase,
      completePurchase: projectValidation.completePurchase,
      purchaseHistory: projectValidation.purchaseHistory,
      statistics: projectValidation.statistics,
      getById: projectValidation.getById,
    },
    otp: {
      send: otpValidation.send,
      verify: otpValidation.verify,
      resetPassword: otpValidation.resetPassword,
    },
    rating: {
      course: {
        rate: courseRatingValidation.rate,
        filter: courseRatingValidation.filter,
      },
      instructor: {
        rate: instructorRatingValidation.rate,
        filter: instructorRatingValidation.filter,
      },
      project: {
        add: projectRatingValidation.add,
        update: projectRatingValidation.update,
        filter: projectRatingValidation.filter,
      },
    },
    section: {
      create: sectionValidation.create,
      reorder: sectionValidation.reorder,
    },
    search: {
      suggestions: searchValidation.suggestions,
      comprehensive: searchValidation.comprehensive,
      history: searchValidation.history,
    },
    discount: {
      validate: discountValidation.validate,
      create: discountValidation.create,
      update: discountValidation.update,
      filter: discountValidation.filter,
      analytics: discountValidation.analytics,
    },
    category: {
      create: categoryValidation.create,
      update: categoryValidation.update,
      query: categoryValidation.query,
      bulkUpdate: categoryValidation.bulkUpdate,
    },
    language: {
      create: languageValidation.create,
      update: languageValidation.update,
      query: languageValidation.query,
    },
    courseLevel: {
      create: courseLevelValidation.create,
      update: courseLevelValidation.update,
      query: courseLevelValidation.query,
    },
    file: {
      upload: fileValidation.upload,
      query: fileValidation.query,
    },
    purchase: {
      createOrder: coursePurchaseValidation.createOrder,
      verifyPayment: coursePurchaseValidation.verifyPayment,
      purchaseHistory: coursePurchaseValidation.purchaseHistory,
      paymentFailure: coursePurchaseValidation.paymentFailure,
    },
    projectFile: {
      upload: projectFileValidation.upload,
      getFiles: projectFileValidation.getFiles,
      update: projectFileValidation.update,
      downloadStats: projectFileValidation.downloadStats,
    },
  };

  // Navigate to the correct validation schema
  let schema = validationMap[entity];
  if (typeof schema === 'object' && operation) {
    // Handle nested operations like 'course.rate'
    const operationParts = operation.split('.');
    for (const part of operationParts) {
      if (schema && typeof schema === 'object' && schema[part]) {
        schema = schema[part];
      } else {
        schema = undefined;
        break;
      }
    }
  }

  if (!schema) {
    throw new Error(`Validation schema not found for ${entity}.${operation}`);
  }

  return validateSchema(schema, source);
};

/**
 * Pre-configured validation middlewares for common routes
 */
export const validationMiddleware = {
  // User routes
  user: {
    register: createValidationMiddleware('user', 'register'),
    login: createValidationMiddleware('user', 'login'),
    updateProfile: createValidationMiddleware('user', 'updateProfile'),
  },

  // Course routes
  course: {
    create: createValidationMiddleware('course', 'create'),
    update: createValidationMiddleware('course', 'update'),
    filter: createValidationMiddleware('course', 'filter', 'query'),
  },

  // Project routes
  project: {
    create: createValidationMiddleware('project', 'create'),
    update: createValidationMiddleware('project', 'update'),
    filter: createValidationMiddleware('project', 'filter', 'query'),
    purchase: createValidationMiddleware('project', 'purchase'),
    completePurchase: createValidationMiddleware('project', 'completePurchase'),
    purchaseHistory: createValidationMiddleware('project', 'purchaseHistory', 'query'),
    statistics: createValidationMiddleware('project', 'statistics', 'query'),
    getById: createValidationMiddleware('project', 'getById', 'params'),
  },

  // OTP routes
  otp: {
    send: createValidationMiddleware('otp', 'send'),
    verify: createValidationMiddleware('otp', 'verify'),
    resetPassword: createValidationMiddleware('otp', 'resetPassword'),
  },

  // Rating routes
  rating: {
    course: {
      rate: createValidationMiddleware('rating', 'course.rate'),
      filter: createValidationMiddleware('rating', 'course.filter', 'query'),
    },
    instructor: {
      rate: createValidationMiddleware('rating', 'instructor.rate'),
      filter: createValidationMiddleware('rating', 'instructor.filter', 'query'),
    },
    project: {
      add: createValidationMiddleware('rating', 'project.add'),
      update: createValidationMiddleware('rating', 'project.update'),
      filter: createValidationMiddleware('rating', 'project.filter', 'query'),
    },
  },

  // Section routes
  section: {
    create: createValidationMiddleware('section', 'create'),
    reorder: createValidationMiddleware('section', 'reorder'),
  },

  // Search routes
  search: {
    suggestions: createValidationMiddleware('search', 'suggestions', 'query'),
    comprehensive: createValidationMiddleware('search', 'comprehensive', 'query'),
    history: createValidationMiddleware('search', 'history', 'query'),
  },

  // Discount routes
  discount: {
    validate: createValidationMiddleware('discount', 'validate'),
    create: createValidationMiddleware('discount', 'create'),
    update: createValidationMiddleware('discount', 'update'),
    filter: createValidationMiddleware('discount', 'filter', 'query'),
    analytics: createValidationMiddleware('discount', 'analytics', 'query'),
  },

  // Category routes
  category: {
    create: createValidationMiddleware('category', 'create'),
    update: createValidationMiddleware('category', 'update'),
    query: createValidationMiddleware('category', 'query', 'query'),
    bulkUpdate: createValidationMiddleware('category', 'bulkUpdate'),
  },

  // Language routes
  language: {
    create: createValidationMiddleware('language', 'create'),
    update: createValidationMiddleware('language', 'update'),
    query: createValidationMiddleware('language', 'query', 'query'),
  },

  // Course level routes
  courseLevel: {
    create: createValidationMiddleware('courseLevel', 'create'),
    update: createValidationMiddleware('courseLevel', 'update'),
    query: createValidationMiddleware('courseLevel', 'query', 'query'),
  },

  // File routes
  file: {
    upload: createValidationMiddleware('file', 'upload'),
    query: createValidationMiddleware('file', 'query', 'query'),
  },

  // Purchase routes
  purchase: {
    createOrder: createValidationMiddleware('purchase', 'createOrder'),
    verifyPayment: createValidationMiddleware('purchase', 'verifyPayment'),
    purchaseHistory: createValidationMiddleware('purchase', 'purchaseHistory', 'query'),
    paymentFailure: createValidationMiddleware('purchase', 'paymentFailure'),
  },

  // Project file routes
  projectFile: {
    upload: createValidationMiddleware('projectFile', 'upload'),
    getFiles: createValidationMiddleware('projectFile', 'getFiles', 'params'),
    update: createValidationMiddleware('projectFile', 'update'),
    downloadStats: createValidationMiddleware('projectFile', 'downloadStats', 'query'),
  },
};

/**
 * Helper function to apply validation to multiple fields from different sources
 */
export const validateMultiple = (validations) => {
  return validations.map(({ entity, operation, source = 'body' }) =>
    createValidationMiddleware(entity, operation, source)
  );
};

/**
 * Middleware to validate route parameters
 */
export const validateParams = (schema) => {
  return validateSchema(schema, 'params');
};

/**
 * Middleware to validate query parameters
 */
export const validateQuery = (schema) => {
  return validateSchema(schema, 'query');
};

/**
 * Middleware to validate request body
 */
export const validateBody = (schema) => {
  return validateSchema(schema, 'body');
};

export default validationMiddleware;