import Course from "../model/course.js";
import Project from "../model/project.js";
import User from "../model/user.js";
import Category from "../model/courseCategory.js";
import CourseLevel from "../model/courseLevel.js";
import CourseTag from "../model/courseTag.js";
import CourseGoal from "../model/courseGoal.js";
import CourseRequirement from "../model/courseRequirement.js";
import Language from "../model/language.js";
import SearchAnalytics from "../model/searchAnalytics.js";
import CourseRating from "../model/courseRating.js";
import ProjectRating from "../model/projectRating.js";
import Enrollment from "../model/enrollment.js";
import ProjectPurchase from "../model/projectPurchase.js";
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

// Enhanced autocomplete suggestions with intelligent ranking
export const getSearchSuggestions = async (req, res) => {
  try {
    const {
      query,
      limit = 10,
      type = "all", // 'all', 'courses', 'projects', 'instructors'
      include_recent = false,
    } = req.query;

    // Validate query parameter
    if (!query || query.length < 2) {
      return sendSuccess(res, 200, "Query too short", {
        suggestions: [],
        recent_searches:
          include_recent === "true"
            ? await getRecentSearches(req.user?.userId)
            : [],
      });
    }

    // Validate limit parameter
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return sendValidationError(res, "Limit must be a number between 1 and 50");
    }

    // Validate type parameter
    const validTypes = ["all", "courses", "projects", "instructors"];
    if (!validTypes.includes(type)) {
      return sendValidationError(
        res,
        `Invalid type parameter. Must be one of: ${validTypes.join(", ")}`
      );
    }

    const searchTerm = `%${query}%`;
    const suggestions = [];

    // Course suggestions with enhanced data
    if (type === "all" || type === "courses") {
      const courseResults = await Course.findAll({
        where: {
          [Op.or]: [
            { title: { [Op.iLike]: searchTerm } },
            { description: { [Op.iLike]: searchTerm } },
          ],
          status: "active",
          isPublished: true,
        },
        include: [
          {
            model: User,
            as: "instructor",
            attributes: ["userId", "firstName", "lastName", "username"],
          },
          {
            model: Category,
            as: "category",
            attributes: ["categoryId", "categoryName"],
          },
        ],
        attributes: ["courseId", "title", "type", "price", "thumbnailUrl"],
        limit: Math.floor(parseInt(limit) / 3),
        order: [
          [
            sequelize.literal(
              `CASE WHEN title ILIKE '${query}%' THEN 1 ELSE 2 END`
            ),
          ],
          ["title", "ASC"],
        ],
      });

      suggestions.push(
        ...courseResults.map((course) => ({
          type: "course",
          id: course.courseId,
          title: course.title,
          subtitle: `${course.type} Course by ${course.instructor?.firstName} ${course.instructor?.lastName}`,
          icon: "📘",
          price: course.price,
          thumbnail: course.thumbnailUrl,
          category: course.category?.categoryName,
          url: `/courses/${course.courseId}`,
          relevance_score: calculateBasicRelevance(course.title, query),
        }))
      );
    }

    // Project suggestions
    if (type === "all" || type === "projects") {
      const projectResults = await Project.findAll({
        where: {
          [Op.or]: [
            { title: { [Op.iLike]: searchTerm } },
            { shortDescription: { [Op.iLike]: searchTerm } },
          ],
          status: "active",
        },
        include: [
          {
            model: User,
            as: "creator",
            attributes: ["userId", "firstName", "lastName", "username"],
          },
          {
            model: Category,
            as: "category",
            attributes: ["categoryId", "categoryName"],
          },
        ],
        attributes: ["id", "title", "difficulty", "price", "previewImages"],
        limit: Math.floor(parseInt(limit) / 3),
        order: [
          [
            sequelize.literal(
              `CASE WHEN title ILIKE '${query}%' THEN 1 ELSE 2 END`
            ),
          ],
          ["title", "ASC"],
        ],
      });

      suggestions.push(
        ...projectResults.map((project) => ({
          type: "project",
          id: project.id,
          title: project.title,
          subtitle: `${project.difficulty} Project by ${project.creator?.firstName} ${project.creator?.lastName}`,
          icon: "🚀",
          price: project.price,
          thumbnail: project.previewImages?.[0],
          category: project.category?.categoryName,
          url: `/projects/${project.id}`,
          relevance_score: calculateBasicRelevance(project.title, query),
        }))
      );
    }

    // Instructor suggestions
    if (type === "all" || type === "instructors") {
      const instructorResults = await User.findAll({
        where: {
          [Op.or]: [
            { username: { [Op.iLike]: searchTerm } },
            { firstName: { [Op.iLike]: searchTerm } },
            { lastName: { [Op.iLike]: searchTerm } },
          ],
          role: "teacher",
        },
        attributes: [
          "userId",
          "firstName",
          "lastName",
          "username",
          "profileImage",
          "bio",
        ],
        limit: Math.floor(parseInt(limit) / 3),
        order: [
          [
            sequelize.literal(
              `CASE WHEN username ILIKE '${query}%' THEN 1 ELSE 2 END`
            ),
          ],
          ["username", "ASC"],
        ],
      });

      suggestions.push(
        ...instructorResults.map((instructor) => ({
          type: "instructor",
          id: instructor.userId,
          title: `${instructor.firstName} ${instructor.lastName}`,
          subtitle: `@${instructor.username} - Instructor`,
          icon: "👨‍🏫",
          image: instructor.profileImage,
          bio: instructor.bio,
          url: `/instructors/${instructor.userId}`,
          relevance_score: calculateBasicRelevance(
            `${instructor.firstName} ${instructor.lastName} ${instructor.username}`,
            query
          ),
        }))
      );
    }

    // Category suggestions
    if (type === "all" || type === "courses" || type === "projects") {
      const categoryResults = await Category.findAll({
        where: {
          categoryName: { [Op.iLike]: searchTerm },
        },
        attributes: ["categoryId", "categoryName", "description"],
        limit: 3,
        order: [["categoryName", "ASC"]],
      });

      suggestions.push(
        ...categoryResults.map((category) => ({
          type: "category",
          id: category.categoryId,
          title: category.categoryName,
          subtitle: "Category",
          icon: "🏷️",
          description: category.description,
          url: `/search?category=${category.categoryId}`,
          relevance_score: calculateBasicRelevance(
            category.categoryName,
            query
          ),
        }))
      );
    }

    // Sort by relevance score and limit results
    const sortedSuggestions = suggestions
      .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
      .slice(0, parseInt(limit));

    return sendSuccess(res, 200, "Search suggestions fetched successfully", {
      suggestions: sortedSuggestions,
      recent_searches:
        include_recent === "true"
          ? await getRecentSearches(req.user?.userId)
          : [],
    });
  } catch (error) {
    console.error("Search suggestions error:", error);
    return sendServerError(res, error);
  }
};

// Advanced course search with filters
export const searchCourses = async (req, res) => {
  try {
    const {
      query = "",
      page = 1,
      limit = 12,
      category,
      tags,
      courseType,
      priceMin,
      priceMax,
      duration,
      level,
      language,
      rating,
      accessType,
      availability,
      instructor,
      sortBy = "relevance",
      sortOrder = "DESC",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    const whereClause = {
      status: "active",
      isPublished: true,
    };

    // Text search
    if (query) {
      whereClause[Op.or] = [
        { title: { [Op.iLike]: `%${query}%` } },
        { description: { [Op.iLike]: `%${query}%` } },
      ];
    }

    // Category filter
    if (category) {
      const categoryIds = Array.isArray(category) ? category : [category];
      whereClause.categoryId = { [Op.in]: categoryIds };
    }

    // Course type filter
    if (courseType) {
      const types = Array.isArray(courseType) ? courseType : [courseType];
      whereClause.type = { [Op.in]: types };
    }

    // Price range filter
    if (priceMin || priceMax) {
      whereClause.price = {};
      if (priceMin) whereClause.price[Op.gte] = parseFloat(priceMin);
      if (priceMax) whereClause.price[Op.lte] = parseFloat(priceMax);
    }

    // Access type filter (free/paid)
    if (accessType === "free") {
      whereClause.isPaid = false;
    } else if (accessType === "paid") {
      whereClause.isPaid = true;
    }

    // Level filter
    if (level) {
      const levelIds = Array.isArray(level) ? level : [level];
      whereClause.levelId = { [Op.in]: levelIds };
    }

    // Instructor filter
    if (instructor) {
      const instructorIds = Array.isArray(instructor)
        ? instructor
        : [instructor];
      whereClause.createdBy = { [Op.in]: instructorIds };
    }

    // Availability filter
    if (availability) {
      const now = new Date();
      switch (availability) {
        case "ongoing":
          whereClause.liveStartDate = { [Op.lte]: now };
          whereClause.liveEndDate = { [Op.gte]: now };
          break;
        case "upcoming":
          whereClause.liveStartDate = { [Op.gt]: now };
          break;
        case "archived":
          whereClause.liveEndDate = { [Op.lt]: now };
          break;
      }
    }

    // Include conditions
    const includeConditions = [
      {
        model: Category,
        as: "category",
        attributes: ["categoryId", "categoryName"],
      },
      {
        model: CourseLevel,
        as: "level",
        attributes: ["levelId", "name"],
      },
      {
        model: User,
        as: "instructor",
        attributes: ["userId", "username", "profileImage"],
      },
      {
        model: CourseTag,
        as: "tags",
        attributes: ["tag"],
        ...(tags && {
          where: {
            tag: {
              [Op.in]: Array.isArray(tags) ? tags : [tags],
            },
          },
        }),
      },
      {
        model: Language,
        through: { attributes: [] },
        attributes: ["languageId", "language"],
        ...(language && {
          where: {
            languageId: {
              [Op.in]: Array.isArray(language) ? language : [language],
            },
          },
        }),
      },
    ];

    // Sorting logic
    let orderClause;
    switch (sortBy) {
      case "relevance":
        // For relevance, we'll use a combination of factors
        orderClause = query
          ? [
              [
                sequelize.literal(
                  `CASE WHEN title ILIKE '%${query}%' THEN 1 ELSE 2 END`
                ),
                "ASC",
              ],
              ["createdAt", "DESC"],
            ]
          : [["createdAt", "DESC"]];
        break;
      case "price":
        orderClause = [["price", sortOrder.toUpperCase()]];
        break;
      case "title":
        orderClause = [["title", sortOrder.toUpperCase()]];
        break;
      case "created":
        orderClause = [["createdAt", sortOrder.toUpperCase()]];
        break;
      default:
        orderClause = [["createdAt", "DESC"]];
    }

    const { count, rows: courses } = await Course.findAndCountAll({
      where: whereClause,
      include: includeConditions,
      limit: parseInt(limit),
      offset,
      order: orderClause,
      distinct: true,
    });
    // Format response data
    const formattedCourses = courses.map((course) => ({
      id: course.courseId,
      title: course.title,
      description: course.description,
      type: course.type,
      price: course.price,
      isPaid: course.isPaid,
      thumbnailUrl: course.thumbnailUrl,
      liveStartDate: course.liveStartDate,
      liveEndDate: course.liveEndDate,
      category: course.category,
      level: course.level,
      instructor: course.instructor,
      tags: course.tags?.map((tag) => tag.tag) || [],
      languages: course.Languages || [],
      rating: parseFloat(course.averageRating) || 0,
      reviewCount: course.totalRatings || 0,
      createdAt: course.createdAt,
    }));

    const totalPages = Math.ceil(count / parseInt(limit));

    return sendSuccess(res, 200, "Courses fetched successfully", {
      courses: formattedCourses,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
      filters: {
        query,
        activeFilters: {
          category,
          tags,
          courseType,
          priceRange: { min: priceMin, max: priceMax },
          level,
          language,
          accessType,
          availability,
          instructor,
        },
      },
    });
  } catch (error) {
    console.error("Search courses error:", error);
    return sendServerError(res, error);
  }
};

// Comprehensive search with all filtering options (Enhanced Search)
export const comprehensiveSearch = async (req, res) => {
  try {
    const {
      query = "",
      type = "all", // 'all', 'courses', 'projects', 'instructors'
      page = 1,
      limit = 20,

      // Filter parameters
      category,
      skill_level,
      price_min,
      price_max,
      course_type,
      language,
      duration_min,
      duration_max,
      tags,
      instructor,
      rating_min,

      // Sort parameters
      sort = "relevance",

      // Additional filters
      free_only,
      premium_only,
      certification,
      include_inactive,
      view_mode = "grid",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const isAdmin = req.user?.role === "admin";
    const includeInactive = include_inactive === "true" && isAdmin;

    // Normalize filter parameters
    const filters = {
      query: query.trim(),
      category: category
        ? Array.isArray(category)
          ? category
          : [category]
        : [],
      skill_level: skill_level
        ? Array.isArray(skill_level)
          ? skill_level
          : [skill_level]
        : [],
      course_type: course_type
        ? Array.isArray(course_type)
          ? course_type
          : [course_type]
        : [],
      language: language
        ? Array.isArray(language)
          ? language
          : [language]
        : [],
      instructor: instructor
        ? Array.isArray(instructor)
          ? instructor
          : [instructor]
        : [],
      tags: tags
        ? typeof tags === "string"
          ? tags.split(",").map((t) => t.trim())
          : tags
        : [],

      price_range: {
        min: price_min ? parseFloat(price_min) : null,
        max: price_max ? parseFloat(price_max) : null,
      },
      duration_range: {
        min: duration_min ? parseInt(duration_min) : null,
        max: duration_max ? parseInt(duration_max) : null,
      },
      rating_min: rating_min ? parseFloat(rating_min) : 0,

      free_only: free_only === "true",
      premium_only: premium_only === "true",
      certification: certification === "true",
      sort,
    };

    let results = {
      courses: [],
      projects: [],
      instructors: [],
      total: 0,
    };

    // Search courses
    if (type === "all" || type === "courses") {
      const courseResults = await searchCoursesComprehensive(
        filters,
        offset,
        limit,
        isAdmin,
        includeInactive
      );
      results.courses = courseResults.courses;
      results.total += courseResults.total;
    }

    // Search projects
    if (type === "all" || type === "projects") {
      const projectResults = await searchProjectsComprehensive(
        filters,
        offset,
        limit,
        isAdmin,
        includeInactive
      );
      results.projects = projectResults.projects;
      results.total += projectResults.total;
    }

    // Search instructors
    if (type === "all" || type === "instructors") {
      const instructorResults = await searchInstructorsComprehensive(
        filters,
        offset,
        limit
      );
      results.instructors = instructorResults.instructors;
      results.total += instructorResults.total;
    }

    // Combine and sort results if searching all types
    let combinedResults = [];
    if (type === "all") {
      combinedResults = combineAndSortResults(
        results.courses,
        results.projects,
        results.instructors,
        filters,
        offset,
        limit
      );
    } else {
      combinedResults = [
        ...results.courses.map((c) => ({ ...c, itemType: "course" })),
        ...results.projects.map((p) => ({ ...p, itemType: "project" })),
        ...results.instructors.map((i) => ({ ...i, itemType: "instructor" })),
      ];
    }

    // Save search analytics
    if (filters.query.length > 0) {
      await saveSearchAnalytics(filters.query, req.user?.userId, {
        search_type: type,
        filters: filters,
        results_count: results.total,
        user_agent: req.headers["user-agent"],
      });
    }

    const totalPages = Math.ceil(results.total / parseInt(limit));

    return sendSuccess(res, 200, "Comprehensive search completed successfully", {
      results: combinedResults,
      breakdown:
        type === "all"
          ? {
              courses: results.courses.length,
              projects: results.projects.length,
              instructors: results.instructors.length,
            }
          : null,
      pagination: {
        current_page: parseInt(page),
        total_pages: totalPages,
        total_items: results.total,
        per_page: parseInt(limit),
        has_next_page: parseInt(page) < totalPages,
        has_prev_page: parseInt(page) > 1,
      },
      filters: {
        applied: filters,
        view_mode,
        search_type: type,
      },
      metadata: {
        search_time: new Date().toISOString(),
        user_id: req.user?.userId || "anonymous",
      },
    });
  } catch (error) {
    console.error("Comprehensive search error:", error);
    return sendServerError(res, error);
  }
};

// Search instructors
export const searchInstructors = async (req, res) => {
  try {
    const {
      query = "",
      page = 1,
      limit = 12,
      subjects,
      skillLevel,
      language,
      rating,
      sortBy = "username",
      sortOrder = "ASC",
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    const whereClause = {
      role: "teacher",
    };

    if (query) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } },
      ];
    }

    // Include conditions for filtering by courses taught
    const includeConditions = [
      {
        model: Course,
        as: "courses",
        attributes: ["courseId", "title", "type"],
        where: {
          status: "active",
          isPublished: true,
        },
        required: false,
        include: [
          {
            model: Category,
            as: "category",
            attributes: ["categoryId", "categoryName"],
            ...(subjects && {
              where: {
                categoryId: {
                  [Op.in]: Array.isArray(subjects) ? subjects : [subjects],
                },
              },
            }),
          },
          {
            model: CourseLevel,
            as: "level",
            attributes: ["levelId", "name"],
            ...(skillLevel && {
              where: {
                levelId: {
                  [Op.in]: Array.isArray(skillLevel)
                    ? skillLevel
                    : [skillLevel],
                },
              },
            }),
          },
        ],
      },
    ];

    // Add language filter if specified
    if (language) {
      includeConditions.push({
        model: Language,
        through: { attributes: [] },
        attributes: ["languageId", "language"],
        where: {
          languageId: {
            [Op.in]: Array.isArray(language) ? language : [language],
          },
        },
      });
    }

    let orderClause;
    switch (sortBy) {
      case "courses":
        orderClause = [
          [
            sequelize.literal(
              '(SELECT COUNT(*) FROM courses WHERE courses.created_by = "User".user_id)'
            ),
            sortOrder.toUpperCase(),
          ],
        ];
        break;
      case "newest":
        orderClause = [["createdAt", "DESC"]];
        break;
      default:
        orderClause = [["username", sortOrder.toUpperCase()]];
    }

    const { count, rows: instructors } = await User.findAndCountAll({
      where: whereClause,
      include: includeConditions,
      attributes: ["userId", "username", "email", "profileImage", "createdAt"],
      limit: parseInt(limit),
      offset,
      order: orderClause,
      distinct: true,
    });
    // Format response data
    const formattedInstructors = instructors.map((instructor) => ({
      id: instructor.userId,
      username: instructor.username,
      email: instructor.email,
      profileImage: instructor.profileImage,
      courseCount: instructor.courses?.length || 0,
      subjects:
        [
          ...new Set(
            instructor.courses
              ?.map((course) => course.category?.categoryName)
              .filter(Boolean)
          ),
        ] || [],
      rating: parseFloat(instructor.averageRating) || 0,
      reviewCount: instructor.totalRatings || 0,
      joinedAt: instructor.createdAt,
    }));

    const totalPages = Math.ceil(count / parseInt(limit));

    return sendSuccess(res, 200, "Instructors fetched successfully", {
      instructors: formattedInstructors,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
      filters: {
        query,
        activeFilters: {
          subjects,
          skillLevel,
          language,
          rating,
        },
      },
    });
  } catch (error) {
    console.error("Search instructors error:", error);
    return sendServerError(res, error);
  }
};

// Get comprehensive search filters for UI
export const getSearchFilters = async (req, res) => {
  try {
    const { type = "all" } = req.query;

    const filters = {};
    // Categories (for both courses and projects)
    if (type === "all" || type === "courses" || type === "projects") {
      const categories = await Category.findAll({
        attributes: ["categoryId", "categoryName", "description"],
        order: [["categoryName", "ASC"]],
      });
      filters.categories = categories.map((cat) => ({
        id: cat.categoryId,
        name: cat.categoryName,
        description: cat.description,
      }));
    }

    // Course-specific filters
    if (type === "all" || type === "courses") {
      // Course levels
      const levels = await CourseLevel.findAll({
        attributes: ["levelId", "name", "description"],
        order: [["level", "ASC"]],
      });
      filters.levels = levels.map((level) => ({
        id: level.levelId,
        name: level.level,
        description: level.description,
      }));

      // Languages
      const languages = await Language.findAll({
        attributes: ["languageId", "language"],
        order: [["language", "ASC"]],
      });
      filters.languages = languages.map((lang) => ({
        id: lang.languageId,
        name: lang.language,
      }));

      // Course types
      filters.courseTypes = [
        { id: "live", name: "Live Sessions" },
        { id: "recorded", name: "Recorded Content" },
      ];

      // Popular tags
      const tags = await CourseTag.findAll({
        attributes: [
          "tag",
          [sequelize.fn("COUNT", sequelize.col("tag")), "usage_count"],
        ],
        group: ["tag"],
        order: [[sequelize.literal("usage_count"), "DESC"]],
        limit: 20,
      });
      filters.tags = tags.map((tag) => tag.tag);
    }

    // Project-specific filters
    if (type === "all" || type === "projects") {
      filters.difficulties = [
        { id: "beginner", name: "Beginner" },
        { id: "intermediate", name: "Intermediate" },
        { id: "advanced", name: "Advanced" },
        { id: "expert", name: "Expert" },
      ];
    }

    // Instructors (for courses)
    if (type === "all" || type === "courses") {
      const instructors = await User.findAll({
        where: { role: "teacher" },
        attributes: [
          "userId",
          "firstName",
          "lastName",
          "username",
          "profileImage",
        ],
        include: [
          {
            model: Course,
            as: "courses",
            attributes: [],
            where: { status: "active", isPublished: true },
            required: true,
          },
        ],
        group: ["User.userId"],
        order: [["firstName", "ASC"]],
        limit: 50,
      });
      filters.instructors = instructors.map((inst) => ({
        id: inst.userId,
        name: `${inst.firstName} ${inst.lastName}`,
        username: inst.username,
        profileImage: inst.profileImage,
      }));
    }

    // Common filter options
    filters.sortOptions = [
      { id: "relevance", name: "Relevance" },
      { id: "popular", name: "Most Popular" },
      { id: "newest", name: "Newest" },
      { id: "price_low", name: "Price: Low to High" },
      { id: "price_high", name: "Price: High to Low" },
      { id: "rating", name: "Highest Rated" },
      { id: "title", name: "Alphabetical" },
    ];

    filters.priceRanges = [
      { id: "free", name: "Free", min: 0, max: 0 },
      { id: "under_50", name: "Under $50", min: 0, max: 50 },
      { id: "50_100", name: "$50 - $100", min: 50, max: 100 },
      { id: "100_200", name: "$100 - $200", min: 100, max: 200 },
      { id: "over_200", name: "Over $200", min: 200, max: null },
    ];

    return sendSuccess(res, 200, "Search filters fetched successfully", filters);
  } catch (error) {
    console.error("Get search filters error:", error);
    return sendServerError(res, error);
  }
};

// Get search analytics (Admin only)
export const getSearchAnalytics = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      startDate,
      endDate,
      searchType,
      userId,
      query,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build where conditions
    const whereClause = {};

    if (startDate) {
      whereClause.createdAt = {
        [Op.gte]: new Date(startDate),
      };
    }

    if (endDate) {
      whereClause.createdAt = {
        ...whereClause.createdAt,
        [Op.lte]: new Date(endDate),
      };
    }

    if (searchType) {
      whereClause.searchType = searchType;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    if (query) {
      whereClause.searchQuery = {
        [Op.iLike]: `%${query}%`,
      };
    }

    const { count, rows: analytics } = await SearchAnalytics.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["userId", "username", "email"],
          required: false,
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [["createdAt", "DESC"]],
    });

    // Get popular search terms
    const popularSearches = await SearchAnalytics.findAll({
      attributes: [
        "searchQuery",
        [sequelize.fn("COUNT", sequelize.col("searchQuery")), "searchCount"],
        [sequelize.fn("AVG", sequelize.col("resultCount")), "avgResults"],
      ],
      where: {
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      group: ["searchQuery"],
      order: [[sequelize.fn("COUNT", sequelize.col("searchQuery")), "DESC"]],
      limit: 10,
    });

    // Get conversion rates
    const conversionStats = await SearchAnalytics.findAll({
      attributes: [
        "conversionType",
        [sequelize.fn("COUNT", sequelize.col("conversionType")), "count"],
      ],
      where: {
        conversionType: { [Op.ne]: "none" },
        createdAt: {
          [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      group: ["conversionType"],
      order: [[sequelize.fn("COUNT", sequelize.col("conversionType")), "DESC"]],
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    return sendSuccess(res, 200, "Search analytics fetched successfully", {
      analytics,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit),
        hasNextPage: parseInt(page) < totalPages,
        hasPrevPage: parseInt(page) > 1,
      },
      insights: {
        popularSearches: popularSearches.map((search) => ({
          query: search.searchQuery,
          count: parseInt(search.dataValues.searchCount),
          avgResults: parseFloat(search.dataValues.avgResults || 0),
        })),
        conversions: conversionStats.map((stat) => ({
          type: stat.conversionType,
          count: parseInt(stat.dataValues.count),
        })),
      },
    });
  } catch (error) {
    console.error("Get search analytics error:", error);
    return sendServerError(res, error);
  }
};

// Search projects (placeholder implementation)
export const searchProjects = async (req, res) => {
  try {
    const {
      query = "",
      page = 1,
      limit = 12,
      category,
      difficulty,
      technology,
      duration,
      sortBy = "relevance",
      sortOrder = "DESC",
    } = req.query;

    // TODO: Implement actual project search when Project model is available
    // For now, return a placeholder response

    const placeholderProjects = [
      {
        id: "proj-1",
        title: "E-commerce Website with React",
        description:
          "Build a full-stack e-commerce platform using React, Node.js, and MongoDB",
        difficulty: "intermediate",
        duration: "4-6 weeks",
        technologies: ["React", "Node.js", "MongoDB", "Express"],
        category: "Web Development",
        thumbnail: "https://via.placeholder.com/300x200",
        rating: 4.5,
        participants: 150,
        createdAt: new Date(),
      },
      {
        id: "proj-2",
        title: "Mobile App with Flutter",
        description:
          "Create a cross-platform mobile application using Flutter and Firebase",
        difficulty: "beginner",
        duration: "3-4 weeks",
        technologies: ["Flutter", "Firebase", "Dart"],
        category: "Mobile Development",
        thumbnail: "https://via.placeholder.com/300x200",
        rating: 4.2,
        participants: 89,
        createdAt: new Date(),
      },
    ];

    // Filter placeholder projects based on query
    let filteredProjects = placeholderProjects;

    if (query) {
      filteredProjects = placeholderProjects.filter(
        (project) =>
          project.title.toLowerCase().includes(query.toLowerCase()) ||
          project.description.toLowerCase().includes(query.toLowerCase())
      );
    }

    if (category) {
      filteredProjects = filteredProjects.filter((project) =>
        project.category.toLowerCase().includes(category.toLowerCase())
      );
    }

    if (difficulty) {
      filteredProjects = filteredProjects.filter(
        (project) => project.difficulty === difficulty
      );
    }

    const totalPages = Math.ceil(filteredProjects.length / parseInt(limit));

    return sendSuccess(
      res,
      200,
      "Projects search completed (placeholder implementation)",
      {
        projects: filteredProjects,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: filteredProjects.length,
          itemsPerPage: parseInt(limit),
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1,
        },
        note: "This is a placeholder implementation. Actual project search will be available when Project model is implemented.",
      }
    );
  } catch (error) {
    console.error("Search projects error:", error);
    return sendServerError(res, error);
  }
};
