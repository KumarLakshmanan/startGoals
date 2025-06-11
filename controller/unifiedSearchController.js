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
import { Op } from "sequelize";
import sequelize from "../config/db.js";

// ===================== UNIFIED SEARCH WITH PROJECTS =====================

// Global search with autocomplete suggestions (Enhanced to include projects)
export const getUnifiedSearchSuggestions = async (req, res) => {
  try {
    const { query, limit = 10, type = 'all' } = req.query;

    if (!query || query.length < 2) {
      return res.status(200).json({
        success: true,
        message: "Query too short",
        data: { suggestions: [] }
      });
    }

    const searchTerm = `%${query}%`;
    const suggestions = [];

    // Courses
    if (type === 'all' || type === 'courses') {
      const courseResults = await Course.findAll({
        where: {
          title: { [Op.iLike]: searchTerm },
          status: 'active',
          isPublished: true
        },
        attributes: ['courseId', 'title', 'type', 'thumbnailImage'],
        limit: Math.floor(parseInt(limit) / 3),
        order: [['title', 'ASC']]
      });

      courseResults.forEach(course => {
        suggestions.push({
          id: course.courseId,
          title: course.title,
          type: 'course',
          subtype: course.type,
          thumbnail: course.thumbnailImage,
          url: `/courses/${course.courseId}`
        });
      });
    }

    // Projects
    if (type === 'all' || type === 'projects') {
      const projectResults = await Project.findAll({
        where: {
          [Op.or]: [
            { title: { [Op.iLike]: searchTerm } },
            { shortDescription: { [Op.iLike]: searchTerm } }
          ],
          status: 'published'
        },
        attributes: ['id', 'title', 'shortDescription', 'previewImages', 'price', 'salePrice'],
        limit: Math.floor(parseInt(limit) / 3),
        order: [['title', 'ASC']]
      });

      projectResults.forEach(project => {
        suggestions.push({
          id: project.id,
          title: project.title,
          description: project.shortDescription,
          type: 'project',
          thumbnail: project.previewImages?.[0] || null,
          price: project.salePrice || project.price,
          url: `/projects/${project.id}`
        });
      });
    }

    // Instructors
    if (type === 'all' || type === 'instructors') {
      const instructorResults = await User.findAll({
        where: {
          [Op.or]: [
            { username: { [Op.iLike]: searchTerm } },
            { firstName: { [Op.iLike]: searchTerm } },
            { lastName: { [Op.iLike]: searchTerm } }
          ],
          role: 'teacher'
        },
        attributes: ['userId', 'username', 'firstName', 'lastName', 'profileImage'],
        limit: Math.floor(parseInt(limit) / 3),
        order: [['firstName', 'ASC']]
      });

      instructorResults.forEach(instructor => {
        suggestions.push({
          id: instructor.userId,
          title: `${instructor.firstName} ${instructor.lastName}`,
          username: instructor.username,
          type: 'instructor',
          thumbnail: instructor.profileImage,
          url: `/instructors/${instructor.userId}`
        });
      });
    }

    // Sort suggestions by relevance and limit
    const sortedSuggestions = suggestions
      .sort((a, b) => {
        // Prioritize exact matches
        const aExact = a.title.toLowerCase().includes(query.toLowerCase());
        const bExact = b.title.toLowerCase().includes(query.toLowerCase());
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.title.localeCompare(b.title);
      })
      .slice(0, parseInt(limit));

    res.json({
      success: true,
      data: { suggestions: sortedSuggestions }
    });

  } catch (error) {
    console.error("Unified search suggestions error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch search suggestions",
      error: error.message
    });
  }
};

// Enhanced search with projects included
export const searchCoursesAndProjects = async (req, res) => {
  try {
    const {
      query,
      type = 'all', // 'courses', 'projects', 'all'
      category,
      level,
      price_min,
      price_max,
      duration_min,
      duration_max,
      language,
      instructor,
      tags,
      difficulty,
      programmingLanguages,
      sort = 'relevance',
      page = 1,
      limit = 12
    } = req.query;

    const userId = req.user?.id;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let results = { courses: [], projects: [], total: 0 };

    // Search Courses
    if (type === 'all' || type === 'courses') {
      const courseWhere = {
        status: 'active',
        isPublished: true
      };

      if (query) {
        courseWhere[Op.or] = [
          { title: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
          { '$instructor.firstName$': { [Op.iLike]: `%${query}%` } },
          { '$instructor.lastName$': { [Op.iLike]: `%${query}%` } }
        ];
      }

      if (category) courseWhere.categoryId = category;
      if (level) courseWhere.levelId = level;
      if (instructor) courseWhere.createdBy = instructor;

      if (price_min || price_max) {
        courseWhere.price = {};
        if (price_min) courseWhere.price[Op.gte] = parseFloat(price_min);
        if (price_max) courseWhere.price[Op.lte] = parseFloat(price_max);
      }

      if (duration_min || duration_max) {
        courseWhere.duration = {};
        if (duration_min) courseWhere.duration[Op.gte] = parseInt(duration_min);
        if (duration_max) courseWhere.duration[Op.lte] = parseInt(duration_max);
      }

      const courseInclude = [
        {
          model: User,
          as: "instructor",
          attributes: ["userId", "firstName", "lastName", "profileImage"]
        },
        {
          model: Category,
          as: "category",
          attributes: ["id", "title"]
        },
        {
          model: CourseLevel,
          as: "level",
          attributes: ["id", "title"]
        }
      ];

      if (language) {
        courseInclude.push({
          model: Language,
          as: "languages",
          where: { id: language },
          through: { attributes: [] }
        });
      }

      if (tags) {
        const tagIds = Array.isArray(tags) ? tags : [tags];
        courseInclude.push({
          model: CourseTag,
          as: "tags",
          where: { id: { [Op.in]: tagIds } },
          through: { attributes: [] }
        });
      }

      let courseOrder = [];
      switch (sort) {
        case 'price_low':
          courseOrder = [['price', 'ASC']];
          break;
        case 'price_high':
          courseOrder = [['price', 'DESC']];
          break;
        case 'newest':
          courseOrder = [['createdAt', 'DESC']];
          break;
        case 'rating':
          courseOrder = [['averageRating', 'DESC']];
          break;
        case 'popular':
          courseOrder = [['totalEnrollments', 'DESC']];
          break;
        default:
          courseOrder = [['createdAt', 'DESC']];
      }

      const courseResults = await Course.findAll({
        where: courseWhere,
        include: courseInclude,
        order: courseOrder,
        limit: type === 'courses' ? parseInt(limit) : Math.floor(parseInt(limit) / 2),
        offset: type === 'courses' ? offset : 0,
        distinct: true
      });

      results.courses = courseResults.map(course => ({
        ...course.toJSON(),
        itemType: 'course'
      }));
    }

    // Search Projects
    if (type === 'all' || type === 'projects') {
      const projectWhere = {
        status: 'published'
      };

      if (query) {
        projectWhere[Op.or] = [
          { title: { [Op.iLike]: `%${query}%` } },
          { description: { [Op.iLike]: `%${query}%` } },
          { shortDescription: { [Op.iLike]: `%${query}%` } },
          { '$creator.firstName$': { [Op.iLike]: `%${query}%` } },
          { '$creator.lastName$': { [Op.iLike]: `%${query}%` } }
        ];
      }

      if (category) projectWhere.categoryId = category;
      if (difficulty) projectWhere.difficulty = difficulty;

      if (price_min || price_max) {
        projectWhere.price = {};
        if (price_min) projectWhere.price[Op.gte] = parseFloat(price_min);
        if (price_max) projectWhere.price[Op.lte] = parseFloat(price_max);
      }

      if (programmingLanguages) {
        const languages = Array.isArray(programmingLanguages) ? programmingLanguages : [programmingLanguages];
        projectWhere.programmingLanguages = {
          [Op.overlap]: languages
        };
      }

      const projectInclude = [
        {
          model: User,
          as: "creator",
          attributes: ["id", "firstName", "lastName", "profileImage"]
        },
        {
          model: Category,
          as: "category",
          attributes: ["id", "title"]
        }
      ];

      if (tags) {
        const tagIds = Array.isArray(tags) ? tags : [tags];
        projectInclude.push({
          model: CourseTag,
          as: "tags",
          where: { id: { [Op.in]: tagIds } },
          through: { attributes: [] }
        });
      }

      let projectOrder = [];
      switch (sort) {
        case 'price_low':
          projectOrder = [['price', 'ASC']];
          break;
        case 'price_high':
          projectOrder = [['price', 'DESC']];
          break;
        case 'newest':
          projectOrder = [['createdAt', 'DESC']];
          break;
        case 'rating':
          projectOrder = [['averageRating', 'DESC']];
          break;
        case 'popular':
          projectOrder = [['totalSales', 'DESC']];
          break;
        default:
          projectOrder = [['createdAt', 'DESC']];
      }

      const projectResults = await Project.findAll({
        where: projectWhere,
        include: projectInclude,
        order: projectOrder,
        limit: type === 'projects' ? parseInt(limit) : Math.floor(parseInt(limit) / 2),
        offset: type === 'projects' ? offset : 0,
        distinct: true
      });

      results.projects = projectResults.map(project => ({
        ...project.toJSON(),
        itemType: 'project'
      }));
    }

    // Record search analytics
    if (query && userId) {
      await SearchAnalytics.create({
        userId,
        searchQuery: query,
        searchType: type,
        filters: JSON.stringify({
          category,
          level,
          price_min,
          price_max,
          duration_min,
          duration_max,
          language,
          instructor,
          tags,
          difficulty,
          programmingLanguages
        }),
        resultsCount: results.courses.length + results.projects.length,
        timestamp: new Date()
      });
    }

    // Combine and sort results if searching all
    let finalResults = [];
    if (type === 'all') {
      finalResults = [...results.courses, ...results.projects];
      
      // Sort combined results
      if (sort === 'relevance' && query) {
        finalResults.sort((a, b) => {
          const aScore = calculateRelevanceScore(a, query);
          const bScore = calculateRelevanceScore(b, query);
          return bScore - aScore;
        });
      }
      
      // Apply pagination to combined results
      finalResults = finalResults.slice(offset, offset + parseInt(limit));
    } else {
      finalResults = type === 'courses' ? results.courses : results.projects;
    }

    const totalResults = results.courses.length + results.projects.length;
    const totalPages = Math.ceil(totalResults / parseInt(limit));

    res.json({
      success: true,
      data: {
        results: finalResults,
        courses: results.courses,
        projects: results.projects,
        total: totalResults,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: totalResults,
          itemsPerPage: parseInt(limit)
        },
        searchQuery: query,
        searchType: type,
        appliedFilters: {
          category,
          level,
          price_min,
          price_max,
          duration_min,
          duration_max,
          language,
          instructor,
          tags,
          difficulty,
          programmingLanguages,
          sort
        }
      }
    });

  } catch (error) {
    console.error("Search courses and projects error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message
    });
  }
};

// Calculate relevance score for search results
const calculateRelevanceScore = (item, query) => {
  let score = 0;
  const queryLower = query.toLowerCase();
  const title = item.title.toLowerCase();
  const description = (item.description || item.shortDescription || '').toLowerCase();

  // Title exact match
  if (title.includes(queryLower)) {
    score += 10;
  }

  // Title starts with query
  if (title.startsWith(queryLower)) {
    score += 5;
  }

  // Description contains query
  if (description.includes(queryLower)) {
    score += 3;
  }

  // Boost popular items
  if (item.itemType === 'course' && item.totalEnrollments > 100) {
    score += 2;
  }

  if (item.itemType === 'project' && item.totalSales > 50) {
    score += 2;
  }

  // Boost highly rated items
  if (item.averageRating > 4) {
    score += 1;
  }

  return score;
};

// Get search filters for unified search
export const getUnifiedSearchFilters = async (req, res) => {
  try {
    const { type = 'all' } = req.query;

    // Categories (same for both courses and projects)
    const categories = await Category.findAll({
      attributes: ['id', 'title'],
      order: [['title', 'ASC']]
    });

    // Languages
    const languages = await Language.findAll({
      attributes: ['id', 'title'],
      order: [['title', 'ASC']]
    });

    // Tags
    const tags = await CourseTag.findAll({
      attributes: ['id', 'title'],
      order: [['title', 'ASC']]
    });

    // Instructors/Creators
    const instructors = await User.findAll({
      where: { role: 'teacher' },
      attributes: ['userId', 'firstName', 'lastName', 'profileImage'],
      order: [['firstName', 'ASC']]
    });

    let filters = {
      categories,
      languages,
      tags,
      instructors
    };

    // Course-specific filters
    if (type === 'all' || type === 'courses') {
      const levels = await CourseLevel.findAll({
        attributes: ['id', 'title'],
        order: [['title', 'ASC']]
      });
      filters.levels = levels;
    }

    // Project-specific filters
    if (type === 'all' || type === 'projects') {
      filters.difficulties = [
        { value: 'beginner', label: 'Beginner' },
        { value: 'intermediate', label: 'Intermediate' },
        { value: 'advanced', label: 'Advanced' }
      ];

      // Get programming languages from projects
      const programmingLanguages = await Project.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.fn('unnest', sequelize.col('programmingLanguages'))), 'language']],
        where: { status: 'published' },
        raw: true
      });

      filters.programmingLanguages = programmingLanguages
        .map(item => item.language)
        .filter(lang => lang)
        .sort();
    }

    res.json({
      success: true,
      data: filters
    });

  } catch (error) {
    console.error("Get unified search filters error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch search filters",
      error: error.message
    });
  }
};

export default {
  getUnifiedSearchSuggestions,
  searchCoursesAndProjects,
  getUnifiedSearchFilters
};
