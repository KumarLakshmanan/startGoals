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

// Enhanced autocomplete suggestions with intelligent ranking
export const getSearchSuggestions = async (req, res) => {
    try {
        const {
            query,
            limit = 10,
            type = 'all', // 'all', 'courses', 'projects', 'instructors'
            include_recent = false
        } = req.query;

        if (!query || query.length < 2) {
            return res.status(200).json({
                success: true,
                message: "Query too short",
                data: {
                    suggestions: [],
                    recent_searches: include_recent === 'true' ? await getRecentSearches(req.user?.userId) : []
                }
            });
        }

        const searchTerm = `%${query}%`;
        const suggestions = [];

        // Course suggestions with enhanced data
        if (type === 'all' || type === 'courses') {
            const courseResults = await Course.findAll({
                where: {
                    [Op.or]: [
                        { title: { [Op.iLike]: searchTerm } },
                        { description: { [Op.iLike]: searchTerm } }
                    ],
                    status: 'active',
                    isPublished: true
                }, include: [
                    {
                        model: User,
                        as: 'instructor',
                        attributes: ['userId', 'firstName', 'lastName', 'username']
                    },
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['categoryId', 'categoryName']
                    }
                ],
                attributes: ['courseId', 'title', 'type', 'price', 'thumbnailUrl'],
                limit: Math.floor(parseInt(limit) / 3),
                order: [
                    [sequelize.literal(`CASE WHEN title ILIKE '${query}%' THEN 1 ELSE 2 END`)],
                    ['title', 'ASC']
                ]
            });

            suggestions.push(...courseResults.map(course => ({
                type: 'course',
                id: course.courseId,
                title: course.title,
                subtitle: `${course.type} Course by ${course.instructor?.firstName} ${course.instructor?.lastName}`,
                icon: '📘',
                price: course.price,
                thumbnail: course.thumbnailUrl,
                category: course.category?.categoryName,
                url: `/courses/${course.courseId}`,
                relevance_score: calculateBasicRelevance(course.title, query)
            })));
        }

        // Project suggestions
        if (type === 'all' || type === 'projects') {
            const projectResults = await Project.findAll({
                where: {
                    [Op.or]: [
                        { title: { [Op.iLike]: searchTerm } },
                        { shortDescription: { [Op.iLike]: searchTerm } }
                    ],
                    status: 'active'
                }, include: [
                    {
                        model: User,
                        as: 'creator',
                        attributes: ['userId', 'firstName', 'lastName', 'username']
                    },
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['categoryId', 'categoryName']
                    }
                ],
                attributes: ['id', 'title', 'difficulty', 'price', 'previewImages'],
                limit: Math.floor(parseInt(limit) / 3),
                order: [
                    [sequelize.literal(`CASE WHEN title ILIKE '${query}%' THEN 1 ELSE 2 END`)],
                    ['title', 'ASC']
                ]
            });

            suggestions.push(...projectResults.map(project => ({
                type: 'project',
                id: project.id,
                title: project.title,
                subtitle: `${project.difficulty} Project by ${project.creator?.firstName} ${project.creator?.lastName}`,
                icon: '🚀',
                price: project.price,
                thumbnail: project.previewImages?.[0],
                category: project.category?.categoryName,
                url: `/projects/${project.id}`,
                relevance_score: calculateBasicRelevance(project.title, query)
            })));
        }

        // Instructor suggestions
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
                attributes: ['userId', 'firstName', 'lastName', 'username', 'profileImage', 'bio'],
                limit: Math.floor(parseInt(limit) / 3),
                order: [
                    [sequelize.literal(`CASE WHEN username ILIKE '${query}%' THEN 1 ELSE 2 END`)],
                    ['username', 'ASC']
                ]
            });

            suggestions.push(...instructorResults.map(instructor => ({
                type: 'instructor',
                id: instructor.userId,
                title: `${instructor.firstName} ${instructor.lastName}`,
                subtitle: `@${instructor.username} - Instructor`,
                icon: '👨‍🏫',
                image: instructor.profileImage,
                bio: instructor.bio,
                url: `/instructors/${instructor.userId}`,
                relevance_score: calculateBasicRelevance(`${instructor.firstName} ${instructor.lastName} ${instructor.username}`, query)
            })));
        }

        // Category suggestions
        if (type === 'all' || type === 'courses' || type === 'projects') {
            const categoryResults = await Category.findAll({
                where: {
                    categoryName: { [Op.iLike]: searchTerm }
                },
                attributes: ['categoryId', 'categoryName', 'description'],
                limit: 3,
                order: [['categoryName', 'ASC']]
            });

            suggestions.push(...categoryResults.map(category => ({
                type: 'category',
                id: category.categoryId,
                title: category.categoryName,
                subtitle: 'Category',
                icon: '🏷️',
                description: category.description,
                url: `/search?category=${category.categoryId}`,
                relevance_score: calculateBasicRelevance(category.categoryName, query)
            })));
        }

        // Sort by relevance score and limit results
        const sortedSuggestions = suggestions
            .sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0))
            .slice(0, parseInt(limit));

        return res.status(200).json({
            success: true,
            message: "Search suggestions fetched successfully",
            data: {
                suggestions: sortedSuggestions,
                recent_searches: include_recent === 'true' ? await getRecentSearches(req.user?.userId) : []
            }
        });
    } catch (error) {
        console.error("Search suggestions error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Advanced course search with filters
export const searchCourses = async (req, res) => {
    try {
        const {
            query = '',
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
            sortBy = 'relevance',
            sortOrder = 'DESC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build where conditions
        const whereClause = {
            status: 'active',
            isPublished: true
        };

        // Text search
        if (query) {
            whereClause[Op.or] = [
                { title: { [Op.iLike]: `%${query}%` } },
                { description: { [Op.iLike]: `%${query}%` } }
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
        if (accessType === 'free') {
            whereClause.isPaid = false;
        } else if (accessType === 'paid') {
            whereClause.isPaid = true;
        }

        // Level filter
        if (level) {
            const levelIds = Array.isArray(level) ? level : [level];
            whereClause.levelId = { [Op.in]: levelIds };
        }

        // Instructor filter
        if (instructor) {
            const instructorIds = Array.isArray(instructor) ? instructor : [instructor];
            whereClause.createdBy = { [Op.in]: instructorIds };
        }

        // Availability filter
        if (availability) {
            const now = new Date();
            switch (availability) {
                case 'ongoing':
                    whereClause.liveStartDate = { [Op.lte]: now };
                    whereClause.liveEndDate = { [Op.gte]: now };
                    break;
                case 'upcoming':
                    whereClause.liveStartDate = { [Op.gt]: now };
                    break;
                case 'archived':
                    whereClause.liveEndDate = { [Op.lt]: now };
                    break;
            }
        }

        // Include conditions
        const includeConditions = [
            {
                model: Category,
                as: 'category',
                attributes: ['categoryId', 'categoryName']
            },
            {
                model: CourseLevel,
                as: 'level',
                attributes: ['levelId', 'level']
            },
            {
                model: User,
                as: 'instructor',
                attributes: ['userId', 'username', 'profileImage']
            },
            {
                model: CourseTag,
                as: 'tags',
                attributes: ['tag'],
                ...(tags && {
                    where: {
                        tag: {
                            [Op.in]: Array.isArray(tags) ? tags : [tags]
                        }
                    }
                })
            },
            {
                model: Language,
                through: { attributes: [] },
                attributes: ['languageId', 'language'],
                ...(language && {
                    where: {
                        languageId: {
                            [Op.in]: Array.isArray(language) ? language : [language]
                        }
                    }
                })
            }
        ];

        // Sorting logic
        let orderClause;
        switch (sortBy) {
            case 'relevance':
                // For relevance, we'll use a combination of factors
                orderClause = query
                    ? [
                        [sequelize.literal(`CASE WHEN title ILIKE '%${query}%' THEN 1 ELSE 2 END`), 'ASC'],
                        ['createdAt', 'DESC']
                    ]
                    : [['createdAt', 'DESC']];
                break;
            case 'price':
                orderClause = [['price', sortOrder.toUpperCase()]];
                break;
            case 'title':
                orderClause = [['title', sortOrder.toUpperCase()]];
                break;
            case 'created':
                orderClause = [['createdAt', sortOrder.toUpperCase()]];
                break;
            default:
                orderClause = [['createdAt', 'DESC']];
        }

        const { count, rows: courses } = await Course.findAndCountAll({
            where: whereClause,
            include: includeConditions,
            limit: parseInt(limit),
            offset,
            order: orderClause,
            distinct: true
        });    // Format response data
        const formattedCourses = courses.map(course => ({
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
            tags: course.tags?.map(tag => tag.tag) || [],
            languages: course.Languages || [],
            rating: parseFloat(course.averageRating) || 0,
            reviewCount: course.totalRatings || 0,
            createdAt: course.createdAt
        }));

        const totalPages = Math.ceil(count / parseInt(limit));

        return res.status(200).json({
            success: true,
            message: "Courses fetched successfully",
            data: {
                courses: formattedCourses,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1
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
                        instructor
                    }
                }
            }
        });
    } catch (error) {
        console.error("Search courses error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Comprehensive search with all filtering options (Enhanced Search)
export const comprehensiveSearch = async (req, res) => {
    try {
        const {
            query = '',
            type = 'all', // 'all', 'courses', 'projects', 'instructors'
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
            sort = 'relevance',

            // Additional filters
            free_only,
            premium_only,
            certification,
            include_inactive,
            view_mode = 'grid'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);
        const isAdmin = req.user?.role === 'admin';
        const includeInactive = include_inactive === 'true' && isAdmin;

        // Normalize filter parameters
        const filters = {
            query: query.trim(),
            category: category ? (Array.isArray(category) ? category : [category]) : [],
            skill_level: skill_level ? (Array.isArray(skill_level) ? skill_level : [skill_level]) : [],
            course_type: course_type ? (Array.isArray(course_type) ? course_type : [course_type]) : [],
            language: language ? (Array.isArray(language) ? language : [language]) : [],
            instructor: instructor ? (Array.isArray(instructor) ? instructor : [instructor]) : [],
            tags: tags ? (typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : tags) : [],

            price_range: {
                min: price_min ? parseFloat(price_min) : null,
                max: price_max ? parseFloat(price_max) : null
            },
            duration_range: {
                min: duration_min ? parseInt(duration_min) : null,
                max: duration_max ? parseInt(duration_max) : null
            },
            rating_min: rating_min ? parseFloat(rating_min) : 0,

            free_only: free_only === 'true',
            premium_only: premium_only === 'true',
            certification: certification === 'true',
            sort
        };

        let results = {
            courses: [],
            projects: [],
            instructors: [],
            total: 0
        };

        // Search courses
        if (type === 'all' || type === 'courses') {
            const courseResults = await searchCoursesComprehensive(filters, offset, limit, isAdmin, includeInactive);
            results.courses = courseResults.courses;
            results.total += courseResults.total;
        }

        // Search projects
        if (type === 'all' || type === 'projects') {
            const projectResults = await searchProjectsComprehensive(filters, offset, limit, isAdmin, includeInactive);
            results.projects = projectResults.projects;
            results.total += projectResults.total;
        }

        // Search instructors
        if (type === 'all' || type === 'instructors') {
            const instructorResults = await searchInstructorsComprehensive(filters, offset, limit);
            results.instructors = instructorResults.instructors;
            results.total += instructorResults.total;
        }

        // Combine and sort results if searching all types
        let combinedResults = [];
        if (type === 'all') {
            combinedResults = combineAndSortResults(results.courses, results.projects, results.instructors, filters, offset, limit);
        } else {
            combinedResults = [
                ...results.courses.map(c => ({ ...c, itemType: 'course' })),
                ...results.projects.map(p => ({ ...p, itemType: 'project' })),
                ...results.instructors.map(i => ({ ...i, itemType: 'instructor' }))
            ];
        }

        // Save search analytics
        if (filters.query.length > 0) {
            await saveSearchAnalytics(filters.query, req.user?.userId, {
                search_type: type,
                filters: filters,
                results_count: results.total,
                user_agent: req.headers['user-agent']
            });
        }

        const totalPages = Math.ceil(results.total / parseInt(limit));

        return res.status(200).json({
            success: true,
            message: "Comprehensive search completed successfully",
            data: {
                results: combinedResults,
                breakdown: type === 'all' ? {
                    courses: results.courses.length,
                    projects: results.projects.length,
                    instructors: results.instructors.length
                } : null,
                pagination: {
                    current_page: parseInt(page),
                    total_pages: totalPages,
                    total_items: results.total,
                    per_page: parseInt(limit),
                    has_next_page: parseInt(page) < totalPages,
                    has_prev_page: parseInt(page) > 1
                },
                filters: {
                    applied: filters,
                    view_mode,
                    search_type: type
                },
                metadata: {
                    search_time: new Date().toISOString(),
                    user_id: req.user?.userId || 'anonymous'
                }
            }
        });

    } catch (error) {
        console.error("Comprehensive search error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Search instructors
export const searchInstructors = async (req, res) => {
    try {
        const {
            query = '',
            page = 1,
            limit = 12,
            subjects,
            skillLevel,
            language,
            rating,
            sortBy = 'username',
            sortOrder = 'ASC'
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build where conditions
        const whereClause = {
            role: 'teacher'
        };

        if (query) {
            whereClause[Op.or] = [
                { username: { [Op.iLike]: `%${query}%` } },
                { email: { [Op.iLike]: `%${query}%` } }
            ];
        }

        // Include conditions for filtering by courses taught
        const includeConditions = [
            {
                model: Course,
                as: 'courses',
                attributes: ['courseId', 'title', 'type'],
                where: {
                    status: 'active',
                    isPublished: true
                },
                required: false,
                include: [
                    {
                        model: Category,
                        as: 'category',
                        attributes: ['categoryId', 'categoryName'],
                        ...(subjects && {
                            where: {
                                categoryId: {
                                    [Op.in]: Array.isArray(subjects) ? subjects : [subjects]
                                }
                            }
                        })
                    },
                    {
                        model: CourseLevel,
                        as: 'level',
                        attributes: ['levelId', 'level'],
                        ...(skillLevel && {
                            where: {
                                levelId: {
                                    [Op.in]: Array.isArray(skillLevel) ? skillLevel : [skillLevel]
                                }
                            }
                        })
                    }
                ]
            }
        ];

        // Add language filter if specified
        if (language) {
            includeConditions.push({
                model: Language,
                through: { attributes: [] },
                attributes: ['languageId', 'language'],
                where: {
                    languageId: {
                        [Op.in]: Array.isArray(language) ? language : [language]
                    }
                }
            });
        }

        let orderClause;
        switch (sortBy) {
            case 'courses':
                orderClause = [
                    [sequelize.literal('(SELECT COUNT(*) FROM courses WHERE courses.created_by = "User".user_id)'), sortOrder.toUpperCase()]
                ];
                break;
            case 'newest':
                orderClause = [['createdAt', 'DESC']];
                break;
            default:
                orderClause = [['username', sortOrder.toUpperCase()]];
        }

        const { count, rows: instructors } = await User.findAndCountAll({
            where: whereClause,
            include: includeConditions,
            attributes: ['userId', 'username', 'email', 'profileImage', 'createdAt'],
            limit: parseInt(limit),
            offset,
            order: orderClause,
            distinct: true
        });    // Format response data
        const formattedInstructors = instructors.map(instructor => ({
            id: instructor.userId,
            username: instructor.username,
            email: instructor.email,
            profileImage: instructor.profileImage,
            courseCount: instructor.courses?.length || 0,
            subjects: [...new Set(instructor.courses?.map(course => course.category?.categoryName).filter(Boolean))] || [],
            rating: parseFloat(instructor.averageRating) || 0,
            reviewCount: instructor.totalRatings || 0,
            joinedAt: instructor.createdAt
        }));

        const totalPages = Math.ceil(count / parseInt(limit));

        return res.status(200).json({
            success: true,
            message: "Instructors fetched successfully",
            data: {
                instructors: formattedInstructors,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1
                },
                filters: {
                    query,
                    activeFilters: {
                        subjects,
                        skillLevel,
                        language,
                        rating
                    }
                }
            }
        });
    } catch (error) {
        console.error("Search instructors error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// =================== COMPREHENSIVE SEARCH HELPER FUNCTIONS ===================

// Search courses with comprehensive filtering
async function searchCoursesComprehensive(filters, offset, limit, isAdmin, includeInactive) {
    const whereClause = {
        isPublished: true
    };

    // Admin can see inactive content
    if (!isAdmin || !includeInactive) {
        whereClause.status = 'active';
    }

    // Text search
    if (filters.query) {
        whereClause[Op.or] = [
            { title: { [Op.iLike]: `%${filters.query}%` } },
            { description: { [Op.iLike]: `%${filters.query}%` } }
        ];
    }

    // Category filter
    if (filters.category && filters.category.length > 0) {
        whereClause.categoryId = { [Op.in]: filters.category };
    }

    // Course type filter
    if (filters.course_type && filters.course_type.length > 0) {
        whereClause.type = { [Op.in]: filters.course_type };
    }

    // Price filters
    if (filters.free_only) {
        whereClause[Op.or] = [
            { price: 0 },
            { price: null }
        ];
    } else if (filters.premium_only) {
        whereClause.price = { [Op.gt]: 0 };
    } else if (filters.price_range.min !== null || filters.price_range.max !== null) {
        const priceCondition = {};
        if (filters.price_range.min !== null) priceCondition[Op.gte] = filters.price_range.min;
        if (filters.price_range.max !== null) priceCondition[Op.lte] = filters.price_range.max;
        whereClause.price = priceCondition;
    }

    // Certification filter (remove since hasCertificate doesn't exist)
    // if (filters.certification) {
    //   whereClause.hasCertificate = true;
    // }
    const includes = [
        {
            model: User,
            as: 'instructor',
            attributes: ['userId', 'firstName', 'lastName', 'username', 'profileImage', 'bio']
        },
        {
            model: Category,
            as: 'category',
            attributes: ['categoryId', 'categoryName', 'description']
        },
        {
            model: CourseLevel,
            as: 'level',
            attributes: ['levelId', 'level', 'description']
        },
        {
            model: CourseTag,
            as: 'tags',
            attributes: ['tagId', 'tag']
        },
        {
            model: CourseRating,
            as: 'ratings',
            attributes: [],
            required: false
        },
        {
            model: Enrollment,
            as: 'enrollments',
            attributes: [],
            required: false
        }
    ];

    // Language filter
    if (filters.language && filters.language.length > 0) {
        includes.push({
            model: Language,
            through: { attributes: [] },
            attributes: ['languageId', 'language'],
            where: { languageId: { [Op.in]: filters.language } }
        });
    } else {
        includes.push({
            model: Language,
            through: { attributes: [] },
            attributes: ['languageId', 'language'],
            required: false
        });
    }

    // Skill level filter
    if (filters.skill_level && filters.skill_level.length > 0) {
        includes.find(inc => inc.as === 'level').where = {
            level: { [Op.in]: filters.skill_level }
        };
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
        includes.find(inc => inc.as === 'tags').where = {
            tag: { [Op.in]: filters.tags }
        };
    }

    // Instructor filter
    if (filters.instructor && filters.instructor.length > 0) {
        whereClause.instructorId = { [Op.in]: filters.instructor };
    }

    // Rating filter
    const havingClause = filters.rating_min > 0 ? {
        avgRating: { [Op.gte]: filters.rating_min }
    } : {};

    // Build order clause
    const orderClause = buildOrderClause(filters.sort, filters.query, 'course');

    const courses = await Course.findAndCountAll({
        where: whereClause,
        include: includes, attributes: [
            'courseId', 'title', 'description', 'price',
            'thumbnailUrl', 'type', 'status',
            'createdAt', 'updatedAt',
            [sequelize.fn('AVG', sequelize.col('ratings.rating')), 'avgRating'],
            [sequelize.fn('COUNT', sequelize.literal('DISTINCT "ratings"."ratingId"')), 'totalRatings'],
            [sequelize.fn('COUNT', sequelize.literal('DISTINCT "enrollments"."enrollmentId"')), 'enrollmentCount']
        ],
        group: [
            'Course.courseId', 'instructor.userId', 'category.categoryId',
            'level.levelId', 'tags.tagId', 'Languages.languageId'
        ],
        having: havingClause,
        order: orderClause,
        limit: parseInt(limit),
        offset: offset,
        distinct: true,
        subQuery: false
    });

    const formattedCourses = courses.rows.map(course => ({
        id: course.courseId,
        title: course.title,
        description: course.description,
        price: course.price,
        originalPrice: course.price,
        salePrice: null, thumbnail: course.thumbnailUrl,
        type: course.type,
        duration: 0, // Default since estimatedDuration doesn't exist
        totalLessons: 0, // Default since totalLessons doesn't exist
        rating: parseFloat(course.dataValues.avgRating || 0).toFixed(1), totalRatings: parseInt(course.dataValues.totalRatings || 0),
        enrollmentCount: parseInt(course.dataValues.enrollmentCount || 0),
        instructor: course.instructor,
        category: course.category,
        level: course.level,
        languages: course.Languages,
        tags: course.tags,
        url: `/courses/${course.courseId}`,
        itemType: 'course',
        createdAt: course.createdAt,
        updatedAt: course.updatedAt,
        relevanceScore: calculateRelevanceScore(course, filters.query, 'course')
    }));

    return {
        courses: formattedCourses,
        total: courses.count.length || 0
    };
}

// Search projects with comprehensive filtering
async function searchProjectsComprehensive(filters, offset, limit, isAdmin, includeInactive) {
    const whereClause = {};

    // Admin can see inactive content
    if (!isAdmin || !includeInactive) {
        whereClause.status = 'active';
    }

    // Text search
    if (filters.query) {
        whereClause[Op.or] = [
            { title: { [Op.iLike]: `%${filters.query}%` } },
            { description: { [Op.iLike]: `%${filters.query}%` } },
            { shortDescription: { [Op.iLike]: `%${filters.query}%` } }
        ];
    }

    // Category filter
    if (filters.category && filters.category.length > 0) {
        whereClause.categoryId = { [Op.in]: filters.category };
    }

    // Price filters
    if (filters.free_only) {
        whereClause[Op.or] = [
            { price: 0 },
            { price: null }
        ];
    } else if (filters.premium_only) {
        whereClause.price = { [Op.gt]: 0 };
    } else if (filters.price_range.min !== null || filters.price_range.max !== null) {
        const priceCondition = {};
        if (filters.price_range.min !== null) priceCondition[Op.gte] = filters.price_range.min;
        if (filters.price_range.max !== null) priceCondition[Op.lte] = filters.price_range.max;
        whereClause.price = priceCondition;
    }

    // Skill level filter (mapped to difficulty for projects)
    if (filters.skill_level && filters.skill_level.length > 0) {
        const difficultyMap = {
            'beginner': 'beginner',
            'intermediate': 'intermediate',
            'advanced': 'advanced',
            'expert': 'expert'
        };
        const mappedDifficulties = filters.skill_level.map(level => difficultyMap[level]).filter(Boolean);
        if (mappedDifficulties.length > 0) {
            whereClause.difficulty = { [Op.in]: mappedDifficulties };
        }
    }

    // Tags filter
    if (filters.tags && filters.tags.length > 0) {
        whereClause.tags = { [Op.overlap]: filters.tags };
    }

    // Rating filter
    const havingClause = filters.rating_min > 0 ? {
        avgRating: { [Op.gte]: filters.rating_min }
    } : {};

    //   Build includes 
    const includes = [
        {
            model: User,
            as: 'creator',
            attributes: ['userId', 'firstName', 'lastName', 'username', 'profileImage', 'bio']
        },
        {
            model: Category,
            as: 'category',
            attributes: ['categoryId', 'categoryName', 'description']
        },
        {
            model: ProjectRating,
            as: 'ratings',
            attributes: [],
            required: false
        },
        {
            model: ProjectPurchase,
            as: 'purchases',
            attributes: [],
            required: false
        }
    ];

    // Build order clause
    const orderClause = buildOrderClause(filters.sort, filters.query, 'project');

    const projects = await Project.findAndCountAll({
        where: whereClause,
        include: includes,
        attributes: ['id', 'title', 'description', 'shortDescription', 'price',
            'previewImages', 'difficulty', 'tags', 'technologies', 'demoUrl', 'githubUrl',
            'features', 'requirements', 'createdAt', 'updatedAt',
            [sequelize.fn('AVG', sequelize.col('ratings.rating')), 'avgRating'],
            [sequelize.fn('COUNT', sequelize.literal('DISTINCT "ratings"."ratingId"')), 'totalRatings'],
            [sequelize.fn('COUNT', sequelize.literal('DISTINCT "purchases"."purchaseId"')), 'salesCount']
        ],
        group: [
            'Project.id', 'creator.userId', 'category.categoryId'
        ],
        having: havingClause,
        order: orderClause,
        limit: parseInt(limit),
        offset: offset,
        distinct: true,
        subQuery: false
    });

    const formattedProjects = projects.rows.map(project => ({
        id: project.id,
        title: project.title,
        description: project.description,
        shortDescription: project.shortDescription, price: project.price,
        originalPrice: project.price,
        salePrice: null,
        thumbnail: project.previewImages?.[0] || null,
        previewImages: project.previewImages || [],
        difficulty: project.difficulty,
        tags: project.tags || [],
        technologies: project.technologies || [],
        demoUrl: project.demoUrl,
        githubUrl: project.githubUrl,
        features: project.features || [],
        requirements: project.requirements || [],
        rating: parseFloat(project.dataValues.avgRating || 0).toFixed(1),
        totalRatings: parseInt(project.dataValues.totalRatings || 0),
        salesCount: parseInt(project.dataValues.salesCount || 0),
        creator: project.creator,
        category: project.category,
        url: `/projects/${project.id}`,
        itemType: 'project',
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        relevanceScore: calculateRelevanceScore(project, filters.query, 'project')
    }));

    return {
        projects: formattedProjects,
        total: projects.count.length || 0
    };
}

// Search instructors with comprehensive filtering
async function searchInstructorsComprehensive(filters, offset, limit) {
    const whereClause = {
        role: 'teacher'
    };

    // Text search
    if (filters.query) {
        whereClause[Op.or] = [
            { firstName: { [Op.iLike]: `%${filters.query}%` } },
            { lastName: { [Op.iLike]: `%${filters.query}%` } },
            { username: { [Op.iLike]: `%${filters.query}%` } },
            { bio: { [Op.iLike]: `%${filters.query}%` } }
        ];
    }

    // Rating filter
    const havingClause = filters.rating_min > 0 ? {
        avgRating: { [Op.gte]: filters.rating_min }
    } : {};

    const instructors = await User.findAndCountAll({
        where: whereClause,
        include: [
            {
                model: Course,
                as: 'courses',
                attributes: [],
                required: false,
                where: { status: 'active', isPublished: true }
            },
            {
                model: Project,
                as: 'projects',
                attributes: [],
                required: false,
                where: { status: 'active' }
            }
        ],
        attributes: [
            'userId', 'firstName', 'lastName', 'username', 'email', 'profileImage',
            'bio', 'createdAt',
            [sequelize.fn('COUNT', sequelize.literal('DISTINCT "courses"."courseId"')), 'courseCount'],
            [sequelize.fn('COUNT', sequelize.literal('DISTINCT "projects"."id"')), 'projectCount']
        ],
        group: ['User.userId'],
        having: havingClause,
        order: [
            [sequelize.literal('courseCount'), 'DESC'],
            ['createdAt', 'DESC']
        ],
        limit: parseInt(limit),
        offset: offset
    });

    const formattedInstructors = instructors.rows.map(instructor => ({
        id: instructor.userId,
        firstName: instructor.firstName,
        lastName: instructor.lastName,
        fullName: `${instructor.firstName} ${instructor.lastName}`,
        username: instructor.username,
        email: instructor.email,
        profileImage: instructor.profileImage,
        bio: instructor.bio,
        courseCount: parseInt(instructor.dataValues.courseCount || 0),
        projectCount: parseInt(instructor.dataValues.projectCount || 0),
        rating: 0, // TODO: Implement instructor ratings
        totalRatings: 0,
        url: `/instructors/${instructor.userId}`,
        itemType: 'instructor',
        memberSince: instructor.createdAt,
        relevanceScore: calculateRelevanceScore(instructor, filters.query, 'instructor')
    }));

    return {
        instructors: formattedInstructors,
        total: instructors.count.length || 0
    };
}

// Build order clause based on sort parameter
function buildOrderClause(sort, query, itemType) {
    switch (sort) {
        case 'relevance':
            return query && query.length > 0 ? [
                [sequelize.literal(`CASE WHEN title ILIKE '${query}%' THEN 1 ELSE 2 END`)],
                ['createdAt', 'DESC']
            ] : [['createdAt', 'DESC']];
        case 'popular':
            return itemType === 'course' ?
                [[sequelize.literal('enrollmentCount'), 'DESC']] :
                itemType === 'project' ?
                    [[sequelize.literal('salesCount'), 'DESC']] :
                    [['createdAt', 'DESC']];
        case 'newest':
            return [['createdAt', 'DESC']];
        case 'price_low':
            return [['price', 'ASC']];
        case 'price_high':
            return [['price', 'DESC']];
        case 'rating':
            return [[sequelize.literal('avgRating'), 'DESC']];
        case 'title':
            return [['title', 'ASC']];
        default:
            return [['createdAt', 'DESC']];
    }
}

// Calculate relevance score for search results
function calculateRelevanceScore(item, query, itemType) {
    if (!query || query.length === 0) return 0;

    let score = 0;
    const queryLower = query.toLowerCase();

    // Title/name matching
    const title = itemType === 'instructor' ?
        `${item.firstName} ${item.lastName}`.toLowerCase() :
        (item.title || '').toLowerCase();

    if (title.includes(queryLower)) {
        score += title.startsWith(queryLower) ? 10 : 5;
    }

    // Description matching
    const description = (item.description || item.shortDescription || item.bio || '').toLowerCase();
    if (description.includes(queryLower)) {
        score += 3;
    }

    // Popularity boost
    if (itemType === 'course' && item.enrollmentCount > 100) score += 2;
    if (itemType === 'project' && item.salesCount > 50) score += 2;
    if (itemType === 'instructor' && item.courseCount > 5) score += 2;

    // Rating boost
    const rating = parseFloat(item.avgRating || item.rating || 0);
    if (rating > 4) score += 1;

    return score;
}

// Calculate basic relevance for simple suggestions
function calculateBasicRelevance(text, query) {
    if (!text || !query) return 0;

    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();

    if (textLower.startsWith(queryLower)) return 10;
    if (textLower.includes(queryLower)) return 5;
    return 0;
}

// Combine and sort results from different types
function combineAndSortResults(courses, projects, instructors, filters, offset, limit) {
    const combined = [
        ...courses.map(c => ({ ...c, itemType: 'course' })),
        ...projects.map(p => ({ ...p, itemType: 'project' })),
        ...instructors.map(i => ({ ...i, itemType: 'instructor' }))
    ];

    // Sort by relevance if query exists, otherwise by sort parameter
    if (filters.query && filters.query.length > 0) {
        combined.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
    } else {
        // Sort by creation date as default
        combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    // Apply pagination
    return combined.slice(offset, offset + limit);
}

// Save search analytics
async function saveSearchAnalytics(query, userId, metadata = {}) {
    try {
        await SearchAnalytics.create({
            userId: userId || null,
            searchQuery: query,
            searchType: metadata.search_type || 'comprehensive',
            filters: JSON.stringify(metadata.filters || {}),
            resultsCount: metadata.results_count || 0,
            ipAddress: metadata.ip_address || null,
            userAgent: metadata.user_agent || null,
            sessionId: metadata.session_id || null,
            metadata: JSON.stringify(metadata)
        });
    } catch (error) {
        console.error("Save search analytics error:", error);
    }
}

// Get recent searches for user
async function getRecentSearches(userId, limit = 5) {
    if (!userId) return [];

    try {
        const recentSearches = await SearchAnalytics.findAll({
            where: {
                userId,
                searchQuery: { [Op.ne]: null }
            },
            attributes: ['searchQuery', 'searchType', 'createdAt'],
            order: [['createdAt', 'DESC']],
            limit,
            distinct: true
        });

        return recentSearches.map(search => ({
            query: search.searchQuery,
            type: search.searchType,
            timestamp: search.createdAt
        }));
    } catch (error) {
        console.error("Get recent searches error:", error);
        return [];
    }
}

// Get comprehensive search filters for UI
export const getSearchFilters = async (req, res) => {
    try {
        const { type = 'all' } = req.query;

        const filters = {};    // Categories (for both courses and projects)
        if (type === 'all' || type === 'courses' || type === 'projects') {
            const categories = await Category.findAll({
                attributes: ['categoryId', 'categoryName', 'description'],
                order: [['categoryName', 'ASC']]
            });
            filters.categories = categories.map(cat => ({
                id: cat.categoryId,
                name: cat.categoryName,
                description: cat.description
            }));
        }

        // Course-specific filters
        if (type === 'all' || type === 'courses') {
            // Course levels
            const levels = await CourseLevel.findAll({
                attributes: ['levelId', 'level', 'description'],
                order: [['level', 'ASC']]
            });
            filters.levels = levels.map(level => ({
                id: level.levelId,
                name: level.level,
                description: level.description
            }));

            // Languages
            const languages = await Language.findAll({
                attributes: ['languageId', 'language'],
                order: [['language', 'ASC']]
            });
            filters.languages = languages.map(lang => ({
                id: lang.languageId,
                name: lang.language
            }));

            // Course types
            filters.courseTypes = [
                { id: 'live', name: 'Live Sessions' },
                { id: 'recorded', name: 'Recorded Content' }
            ];

            // Popular tags
            const tags = await CourseTag.findAll({
                attributes: ['tag', [sequelize.fn('COUNT', sequelize.col('tag')), 'usage_count']],
                group: ['tag'],
                order: [[sequelize.literal('usage_count'), 'DESC']],
                limit: 20
            });
            filters.tags = tags.map(tag => tag.tag);
        }

        // Project-specific filters
        if (type === 'all' || type === 'projects') {
            filters.difficulties = [
                { id: 'beginner', name: 'Beginner' },
                { id: 'intermediate', name: 'Intermediate' },
                { id: 'advanced', name: 'Advanced' },
                { id: 'expert', name: 'Expert' }
            ];
        }

        // Instructors (for courses)
        if (type === 'all' || type === 'courses') {
            const instructors = await User.findAll({
                where: { role: 'teacher' },
                attributes: ['userId', 'firstName', 'lastName', 'username', 'profileImage'],
                include: [{
                    model: Course,
                    as: 'courses',
                    attributes: [],
                    where: { status: 'active', isPublished: true },
                    required: true
                }],
                group: ['User.userId'],
                order: [['firstName', 'ASC']],
                limit: 50
            });
            filters.instructors = instructors.map(inst => ({
                id: inst.userId,
                name: `${inst.firstName} ${inst.lastName}`,
                username: inst.username,
                profileImage: inst.profileImage
            }));
        }

        // Common filter options
        filters.sortOptions = [
            { id: 'relevance', name: 'Relevance' },
            { id: 'popular', name: 'Most Popular' },
            { id: 'newest', name: 'Newest' },
            { id: 'price_low', name: 'Price: Low to High' },
            { id: 'price_high', name: 'Price: High to Low' },
            { id: 'rating', name: 'Highest Rated' },
            { id: 'title', name: 'Alphabetical' }
        ];

        filters.priceRanges = [
            { id: 'free', name: 'Free', min: 0, max: 0 },
            { id: 'under_50', name: 'Under $50', min: 0, max: 50 },
            { id: '50_100', name: '$50 - $100', min: 50, max: 100 },
            { id: '100_200', name: '$100 - $200', min: 100, max: 200 },
            { id: 'over_200', name: 'Over $200', min: 200, max: null }
        ];

        return res.status(200).json({
            success: true,
            message: "Search filters fetched successfully",
            data: filters
        });
    } catch (error) {
        console.error("Get search filters error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
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
            query
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Build where conditions
        const whereClause = {};

        if (startDate) {
            whereClause.createdAt = {
                [Op.gte]: new Date(startDate)
            };
        }

        if (endDate) {
            whereClause.createdAt = {
                ...whereClause.createdAt,
                [Op.lte]: new Date(endDate)
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
                [Op.iLike]: `%${query}%`
            };
        }

        const { count, rows: analytics } = await SearchAnalytics.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['userId', 'username', 'email'],
                    required: false
                }
            ],
            limit: parseInt(limit),
            offset,
            order: [['createdAt', 'DESC']]
        });

        // Get popular search terms
        const popularSearches = await SearchAnalytics.findAll({
            attributes: [
                'searchQuery',
                [sequelize.fn('COUNT', sequelize.col('searchQuery')), 'searchCount'],
                [sequelize.fn('AVG', sequelize.col('resultCount')), 'avgResults']
            ],
            where: {
                createdAt: {
                    [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                }
            },
            group: ['searchQuery'],
            order: [[sequelize.fn('COUNT', sequelize.col('searchQuery')), 'DESC']],
            limit: 10
        });

        // Get conversion rates
        const conversionStats = await SearchAnalytics.findAll({
            attributes: [
                'conversionType',
                [sequelize.fn('COUNT', sequelize.col('conversionType')), 'count']
            ],
            where: {
                conversionType: { [Op.ne]: 'none' },
                createdAt: {
                    [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                }
            },
            group: ['conversionType'],
            order: [[sequelize.fn('COUNT', sequelize.col('conversionType')), 'DESC']]
        });

        const totalPages = Math.ceil(count / parseInt(limit));

        return res.status(200).json({
            success: true,
            message: "Search analytics fetched successfully",
            data: {
                analytics,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: count,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1
                },
                insights: {
                    popularSearches: popularSearches.map(search => ({
                        query: search.searchQuery,
                        count: parseInt(search.dataValues.searchCount),
                        avgResults: parseFloat(search.dataValues.avgResults || 0)
                    })),
                    conversions: conversionStats.map(stat => ({
                        type: stat.conversionType,
                        count: parseInt(stat.dataValues.count)
                    }))
                }
            }
        });
    } catch (error) {
        console.error("Get search analytics error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};

// Search projects (placeholder implementation)
export const searchProjects = async (req, res) => {
    try {
        const {
            query = '',
            page = 1,
            limit = 12,
            category,
            difficulty,
            technology,
            duration,
            sortBy = 'relevance',
            sortOrder = 'DESC'
        } = req.query;

        // TODO: Implement actual project search when Project model is available
        // For now, return a placeholder response

        const placeholderProjects = [
            {
                id: 'proj-1',
                title: 'E-commerce Website with React',
                description: 'Build a full-stack e-commerce platform using React, Node.js, and MongoDB',
                difficulty: 'intermediate',
                duration: '4-6 weeks',
                technologies: ['React', 'Node.js', 'MongoDB', 'Express'],
                category: 'Web Development',
                thumbnail: 'https://via.placeholder.com/300x200',
                rating: 4.5,
                participants: 150,
                createdAt: new Date()
            },
            {
                id: 'proj-2',
                title: 'Mobile App with Flutter',
                description: 'Create a cross-platform mobile application using Flutter and Firebase',
                difficulty: 'beginner',
                duration: '3-4 weeks',
                technologies: ['Flutter', 'Firebase', 'Dart'],
                category: 'Mobile Development',
                thumbnail: 'https://via.placeholder.com/300x200',
                rating: 4.2,
                participants: 89,
                createdAt: new Date()
            }
        ];

        // Filter placeholder projects based on query
        let filteredProjects = placeholderProjects;

        if (query) {
            filteredProjects = placeholderProjects.filter(project =>
                project.title.toLowerCase().includes(query.toLowerCase()) ||
                project.description.toLowerCase().includes(query.toLowerCase())
            );
        }

        if (category) {
            filteredProjects = filteredProjects.filter(project =>
                project.category.toLowerCase().includes(category.toLowerCase())
            );
        }

        if (difficulty) {
            filteredProjects = filteredProjects.filter(project =>
                project.difficulty === difficulty
            );
        }

        const totalPages = Math.ceil(filteredProjects.length / parseInt(limit));

        return res.status(200).json({
            success: true,
            message: "Projects search completed (placeholder implementation)",
            data: {
                projects: filteredProjects,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalItems: filteredProjects.length,
                    itemsPerPage: parseInt(limit),
                    hasNextPage: parseInt(page) < totalPages,
                    hasPrevPage: parseInt(page) > 1
                },
                note: "This is a placeholder implementation. Actual project search will be available when Project model is implemented."
            }
        });
    } catch (error) {
        console.error("Search projects error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal server error"
        });
    }
};
