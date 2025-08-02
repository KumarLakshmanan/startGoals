import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../model/user.js';
import Course from '../model/course.js';
import Category from '../model/category.js';
import CourseLevel from '../model/courseLevel.js';
import Project from '../model/project.js';
import ProjectFile from '../model/projectFile.js';
import Language from '../model/language.js';
import LiveSession from '../model/liveSession.js';
import Banner from '../model/banner.js';
import Goal from '../model/goal.js';
import Skill from '../model/skill.js';
import Exam from '../model/exam.js';
import Batch from '../model/batch.js';
import Section from '../model/section.js';
import Lesson from '../model/lesson.js';
import Resource from '../model/resource.js';
import CourseRating from '../model/courseRating.js';
import ProjectRating from '../model/projectRating.js';
import Enrollment from '../model/enrollment.js';
import ProjectPurchase from '../model/projectPurchase.js';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import fs from 'fs';
import sequelize from '../config/db.js';

// Configure environment variables - use path relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
console.log('Environment loaded from:', path.join(__dirname, '.env'));

// Set up some constants - ensure we create exactly 10 of each
const NUM_LIVE_COURSES = 10;
const NUM_RECORDED_COURSES = 10;
const NUM_PROJECTS = 10;
const NUM_STUDENTS = 10;
const DEFAULT_PASSWORD = 'SecurePassword@123';

/**
 * Initialize basic categories and levels if they don't exist
 */
async function initBasicData() {
  console.log('Initializing basic data...');

  // Course Levels
  const courseLevels = [
    { name: 'Beginner', order: 1, description: 'For absolute beginners' },
    { name: 'Intermediate', order: 2, description: 'For those with some experience' },
    { name: 'Advanced', order: 3, description: 'For experienced learners' },
  ];

  // Course Categories
  const courseCategories = [
    {
      categoryName: 'Web Development',
      categoryCode: 'WEB_DEV',
      description: 'Learn web development technologies'
    },
    {
      categoryName: 'Mobile Development',
      categoryCode: 'MOB_DEV',
      description: 'Learn mobile app development'
    },
    {
      categoryName: 'Data Science',
      categoryCode: 'DATA_SCI',
      description: 'Learn data science and analytics'
    },
    {
      categoryName: 'UI/UX Design',
      categoryCode: 'UI_UX',
      description: 'Learn user interface and experience design'
    },
    {
      categoryName: 'DevOps',
      categoryCode: 'DEVOPS',
      description: 'Learn DevOps practices and tools'
    },
  ];
  // Spoken Languages
  const languages = [
    { language: 'English', languageCode: 'en', languageType: 'both', nativeName: 'English' },
    { language: 'Tamil', languageCode: 'ta', languageType: 'both', nativeName: 'தமிழ்' },
    { language: 'Hindi', languageCode: 'hi', languageType: 'both', nativeName: 'हिन्दी' },
    { language: 'Chinese', languageCode: 'zh', languageType: 'both', nativeName: '中文' },
    { language: 'Spanish', languageCode: 'es', languageType: 'both', nativeName: 'Español' },
    { language: 'French', languageCode: 'fr', languageType: 'both', nativeName: 'Français' },
    { language: 'German', languageCode: 'de', languageType: 'both', nativeName: 'Deutsch' },
    { language: 'Japanese', languageCode: 'ja', languageType: 'both', nativeName: '日本語' },
    { language: 'Arabic', languageCode: 'ar', languageType: 'both', nativeName: 'العربية' },
    { language: 'Russian', languageCode: 'ru', languageType: 'both', nativeName: 'Русский' },
  ];

  // Create admin and teacher users
  const adminHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const adminUser = await User.findOrCreate({
    where: { email: 'admin@example.com' },
    defaults: {
      userId: uuidv4(),
      username: 'admin',
      email: 'admin@example.com',
      password: adminHash,
      role: 'admin',
      isVerified: true,
      isOnboarded: true,
      firstLogin: false,
      androidRegId: faker.string.alphanumeric(32), // Sample Android registration ID
      iosRegId: faker.string.uuid(), // Sample iOS registration ID
    }
  });

  // Create teacher users
  const teacherHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const teachers = [];
  for (let i = 1; i <= 5; i++) {
    const [teacher] = await User.findOrCreate({
      where: { email: `teacher${i}@example.com` },
      defaults: {
        userId: uuidv4(),
        username: `teacher${i}`,
        email: `teacher${i}@example.com`,
        password: teacherHash,
        role: 'teacher',
        isVerified: true,
        isOnboarded: true,
        firstLogin: false,
        androidRegId: faker.datatype.boolean() ? faker.string.alphanumeric(32) : null, // Random Android registration ID
        iosRegId: faker.datatype.boolean() ? faker.string.uuid() : null, // Random iOS registration ID
        profileImage: faker.image.avatarLegacy(),
        averageRating: faker.number.float({ min: 3.5, max: 5.0, multipleOf: 0.1 }),
        totalRatings: faker.number.int({ min: 10, max: 100 }),
      }
    });
    teachers.push(teacher);
  }
  // Create student users
  const studentHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  const students = [];
  for (let i = 1; i <= NUM_STUDENTS; i++) {
    const [student] = await User.findOrCreate({
      where: { email: `student${i}@example.com` },
      defaults: {
        userId: uuidv4(),
        username: `student${i}`,
        email: `student${i}@example.com`,
        password: studentHash,
        role: 'student',
        isVerified: true,
        isOnboarded: true,
        firstLogin: false,
        androidRegId: faker.datatype.boolean() ? faker.string.alphanumeric(32) : null, // Random Android registration ID
        iosRegId: faker.datatype.boolean() ? faker.string.uuid() : null, // Random iOS registration ID
        profileImage: faker.image.avatarLegacy(),
        // Removed bio, country, city as they don't exist in the User model
      }
    });
    students.push(student);
  }

  // Create course levels
  const levels = [];
  for (const levelData of courseLevels) {
    const [level] = await CourseLevel.findOrCreate({
      where: { name: levelData.name },
      defaults: {
        levelId: uuidv4(),
        ...levelData,
      }
    });
    levels.push(level);
  }

  // Create course categories
  const categories = [];
  for (const categoryData of courseCategories) {
    const [category] = await Category.findOrCreate({
      where: { categoryName: categoryData.categoryName },
      defaults: {
        categoryId: uuidv4(),
        ...categoryData,
      }
    });
    categories.push(category);
  }
  // Create programming languages
  const programmingLanguages = [];
  for (const langData of languages) {
    const [lang] = await Language.findOrCreate({
      where: { language: langData.language },
      defaults: {
        languageId: uuidv4(),
        ...langData,
      }
    });
    programmingLanguages.push(lang);
  }

  return {
    admin: adminUser[0],
    teachers,
    students,
    levels,
    categories,
    programmingLanguages,
  };
}

/**
 * Create live courses with sessions
 */
async function createLiveCourses(teachers, levels, categories) {
  console.log('Creating live courses...');

  const liveCourses = [];

  for (let i = 0; i < NUM_LIVE_COURSES; i++) {
    try {
      // Select random teacher, level and category
      const teacher = teachers[Math.floor(Math.random() * teachers.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];

      // Calculate dates
      const startDate = faker.date.future({ years: 0.5 });
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + faker.number.int({ min: 30, max: 90 }));

      // Create course
      const course = await Course.create({
        courseId: uuidv4(),
        title: `Live Course: ${faker.company.buzzPhrase()}`,
        description: faker.lorem.paragraphs(3),
        shortDescription: faker.lorem.sentence(),
        thumbnailUrl: `https://picsum.photos/seed/${i + 1}/640/480`,
        coverImage: `https://picsum.photos/seed/${i + 50}/1200/600`,
        levelId: level.levelId,
        categoryId: category.categoryId,
        createdBy: teacher.userId,
        isPublished: true,
        type: 'live',
        isPaid: true,
        price: faker.number.float({ min: 599, max: 9999, multipleOf: 0.01 }),
        discountEnabled: faker.datatype.boolean(),
        isMonthlyPayment: faker.datatype.boolean(),
        durationDays: faker.number.int({ min: 30, max: 90 }),
        liveStartDate: startDate,
        liveEndDate: endDate,
        hasIntroVideo: true,
        introVideoUrl: `https://www.youtube.com/watch?v=${faker.string.alphanumeric(11)}`,
        demoUrl: faker.datatype.boolean() ? `https://demo.example.com/course-${i}` : null,
        screenshots: [
          `https://picsum.photos/seed/${i + 101}/800/600`,
          `https://picsum.photos/seed/${i + 102}/800/600`,
        ],
        techStack: [
          faker.helpers.arrayElement(['React', 'Angular', 'Vue', 'Svelte']),
          faker.helpers.arrayElement(['Node.js', 'Django', 'Flask', 'Spring Boot']),
        ],
        programmingLanguages: [
          faker.helpers.arrayElement(['JavaScript', 'Python', 'Java', 'C#']),
          faker.helpers.arrayElement(['TypeScript', 'Go', 'Rust', 'Kotlin']),
        ],
        features: faker.lorem.paragraphs(1),
        prerequisites: faker.lorem.paragraphs(1),
        whatYouGet: [
          'Live sessions with experts',
          'Course materials',
          'Project templates',
          'Support from instructors',
        ].join('\n• '),  // Convert array to string with bullet points
        hasCertificate: true,
        certificateTemplateUrl: `https://storage.example.com/certificates/template_${i + 1}.pdf`,
        supportIncluded: faker.datatype.boolean(),
        supportDuration: faker.number.int({ min: 30, max: 180 }),
        supportEmail: `support-${i}@example.com`,
        version: "1.0",
        status: 'active',
        featured: i < 3, // First 3 courses are featured
        publishedAt: faker.date.recent(),
        lastUpdated: faker.date.recent(),
        averageRating: faker.number.float({ min: 3.5, max: 5.0, multipleOf: 0.1 }),
        totalRatings: faker.number.int({ min: 5, max: 50 }),
        totalEnrollments: faker.number.int({ min: 10, max: 200 }),
        totalRevenue: faker.number.float({ min: 5000, max: 50000, multipleOf: 0.01 }),
      });

      liveCourses.push(course);

      // Create a batch for this course
      const batch = await Batch.create({
        batchId: uuidv4(),
        courseId: course.courseId,
        title: `Batch for ${course.title}`,
        startDate: startDate,
        endDate: endDate,
        status: 'ongoing',
        createdBy: teacher.userId,
        enrollmentCapacity: faker.number.int({ min: 20, max: 50 }),
        currentEnrollment: faker.number.int({ min: 0, max: 15 }),
        hasChatEnabled: true,
      });

      // Create 5-10 live sessions for each course
      const numSessions = faker.number.int({ min: 5, max: 10 });

      for (let j = 0; j < numSessions; j++) {
        const sessionDate = new Date(startDate);
        sessionDate.setDate(sessionDate.getDate() + (j * 2)); // Every 2 days

        // Use fixed times for start and end (Postgres TIME expects 'HH:MM:SS')
        const startTime = '18:00:00'; // 6 PM
        const endTime = '20:00:00';   // 8 PM

        await LiveSession.create({
          sessionId: uuidv4(),
          batchId: batch.batchId,
          courseId: course.courseId,
          title: `Session ${j + 1}: ${faker.company.buzzNoun()}`,
          meetingLink: `https://meet.example.com/${faker.string.alphanumeric(10)}`,
          sessionDate,
          startTime,
          endTime,
          durationMinutes: 120,
          status: 'scheduled',
          platform: faker.helpers.arrayElement(['zoom', 'agora']),
          platformSessionId: faker.string.alphanumeric(10),
          recordingUrl: j < 2 ? `https://storage.example.com/recordings/session_${j + 1}_${faker.string.alphanumeric(8)}.mp4` : null,
        });
      }
    } catch (error) {
      console.error(`Error creating live course ${i + 1}:`, error.message);
      // Continue with the next course
    }
  }

  console.log(`Successfully created ${liveCourses.length} live courses`);
  return liveCourses;
}

/**
 * Create recorded courses
 */
async function createRecordedCourses(teachers, levels, categories) {
  console.log('Creating recorded courses...');

  const recordedCourses = [];

  for (let i = 0; i < NUM_RECORDED_COURSES; i++) {
    try {
      // Select random teacher, level and category
      const teacher = teachers[Math.floor(Math.random() * teachers.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];

      // Create course
      const course = await Course.create({
        courseId: uuidv4(),
        title: `Recorded Course: ${faker.company.buzzPhrase()}`,
        description: faker.lorem.paragraphs(3),
        shortDescription: faker.lorem.sentence(),
        thumbnailUrl: `https://picsum.photos/seed/${i + 100}/640/480`,
        coverImage: `https://picsum.photos/seed/${i + 150}/1200/600`,
        levelId: level.levelId,
        categoryId: category.categoryId,
        createdBy: teacher.userId,
        isPublished: true,
        type: 'recorded',
        isPaid: faker.datatype.boolean(),
        price: faker.number.float({ min: 499, max: 4999, multipleOf: 0.01 }),
        discountEnabled: faker.datatype.boolean(),
        hasIntroVideo: true,
        introVideoUrl: `https://www.youtube.com/watch?v=${faker.string.alphanumeric(11)}`,
        demoUrl: faker.datatype.boolean() ? `https://demo.example.com/course-${i + 100}` : null,
        screenshots: [
          `https://picsum.photos/seed/${i + 201}/800/600`,
          `https://picsum.photos/seed/${i + 202}/800/600`,
        ],
        techStack: [
          faker.helpers.arrayElement(['React', 'Angular', 'Vue', 'Svelte']),
          faker.helpers.arrayElement(['Node.js', 'Django', 'Flask', 'Spring Boot']),
        ],
        programmingLanguages: [
          faker.helpers.arrayElement(['JavaScript', 'Python', 'Java', 'C#']),
          faker.helpers.arrayElement(['TypeScript', 'Go', 'Rust', 'Kotlin']),
        ],
        features: faker.lorem.paragraphs(1),
        prerequisites: faker.lorem.paragraphs(1),
        whatYouGet: [
          'Full lifetime access',
          'Downloadable resources',
          'Projects and exercises',
          'Certificate of completion',
        ].join('\n• '),  // Convert array to string with bullet points
        hasCertificate: faker.datatype.boolean(),
        certificateTemplateUrl: faker.datatype.boolean() ? `https://storage.example.com/certificates/template_${i + 100}.pdf` : null,
        supportIncluded: faker.datatype.boolean(),
        supportDuration: faker.number.int({ min: 30, max: 180 }),
        supportEmail: `support-${i + 100}@example.com`,
        version: "1.0",
        status: 'active',
        featured: i < 3, // First 3 courses are featured
        publishedAt: faker.date.recent(),
        lastUpdated: faker.date.recent(),
        averageRating: faker.number.float({ min: 3.5, max: 5.0, multipleOf: 0.1 }),
        totalRatings: faker.number.int({ min: 10, max: 100 }),
        // Additional fields for recorded courses
        durationMinutes: faker.number.int({ min: 120, max: 720 }),
        totalLessons: 0, // Will be updated after adding lessons
        totalSections: 0, // Will be updated after adding sections
        totalEnrollments: faker.number.int({ min: 20, max: 500 }),
        totalRevenue: faker.number.float({ min: 10000, max: 100000, multipleOf: 0.01 }),
      });

      recordedCourses.push(course);

      let totalSections = 0;
      let totalLessons = 0;
      let totalDuration = 0;

      // Optionally create some sections and lessons
      const numSections = faker.number.int({ min: 3, max: 8 });
      totalSections = numSections;

      for (let j = 0; j < numSections; j++) {
        try {
          // Create section
          const section = await Section.create({
            sectionId: uuidv4(),
            courseId: course.courseId,
            title: `Section ${j + 1}: ${faker.company.buzzNoun()}`,
            description: faker.lorem.paragraph(),
            order: j,
          });

          // Create 3-7 lessons per section
          const numLessons = faker.number.int({ min: 3, max: 7 });
          totalLessons += numLessons;

          for (let k = 0; k < numLessons; k++) {
            try {
              const lessonDuration = faker.number.int({ min: 5, max: 45 });
              totalDuration += lessonDuration;

              await Lesson.create({
                lessonId: uuidv4(),
                sectionId: section.sectionId,
                courseId: course.courseId,
                title: `Lesson ${k + 1}: ${faker.company.buzzVerb()}`,
                description: faker.lorem.sentence(),
                durationMinutes: lessonDuration,
                videoUrl: `https://storage.example.com/videos/course_${i}_section_${j}_lesson_${k}.mp4`,
                order: k,
                isFree: k === 0, // First lesson is free
                type: faker.helpers.arrayElement(['video', 'article', 'quiz']), // Required type field
                content: faker.lorem.paragraphs(2),
              });
            } catch (error) {
              console.error(`Error creating lesson ${k + 1} for section ${j + 1} of course ${i + 1}:`, error.message);
              // Continue with the next lesson
              totalLessons--; // Adjust count for failed lesson
            }
          }
        } catch (error) {
          console.error(`Error creating section ${j + 1} for course ${i + 1}:`, error.message);
          // Continue with the next section
          totalSections--; // Adjust count for failed section
        }
      }

      // Update course with actual statistics
      await course.update({
        totalSections,
        totalLessons,
        durationMinutes: totalDuration,
        lastUpdated: new Date()
      });
    } catch (error) {
      console.error(`Error creating recorded course ${i + 1}:`, error.message);
      // Continue with the next course
    }
  }
  
  console.log(`Successfully created ${recordedCourses.length} recorded courses`);
  return recordedCourses;
}

/**
 * Create projects of different types
 */
async function createProjects(teachers, categories, languages, levels) {
  console.log('Creating projects...');

  const projects = [];

  const projectTypes = [
    'Web Application',
    'Mobile App',
    'API Service',
    'Chrome Extension',
    'Game',
    'WordPress Plugin',
    'Desktop Application',
    'Machine Learning Model',
    'UI/UX Design Kit',
    'eCommerce Solution',
  ];

  for (let i = 0; i < NUM_PROJECTS; i++) {
    try {
      // Select random teacher, category, language and level
      const teacher = teachers[Math.floor(Math.random() * teachers.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];
      const language = languages[Math.floor(Math.random() * languages.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];

      // Determine skill level
      const skillLevel = faker.helpers.arrayElement(['beginner', 'intermediate', 'advanced']);

      // Create project
      const projectType = projectTypes[i % projectTypes.length];
      const project = await Project.create({
        projectId: uuidv4(),
        title: `${projectType}: ${faker.company.buzzPhrase()}`,
        description: faker.lorem.paragraphs(3),
        shortDescription: faker.lorem.paragraph(),
        categoryId: category.categoryId,
        levelId: level.levelId, // Use the level selected above
        skillLevel,
        tags: [
          faker.helpers.arrayElement(['React', 'Angular', 'Vue', 'Next.js', 'Express']),
          faker.helpers.arrayElement(['MongoDB', 'PostgreSQL', 'MySQL', 'Firebase']),
          faker.helpers.arrayElement(['REST API', 'GraphQL', 'WebSockets', 'Redux']),
        ],
        languageId: language.languageId,
        linkedTeacherId: teacher.userId,
        price: faker.number.float({ min: 99, max: 2999, multipleOf: 0.01 }),
        discountEnabled: faker.datatype.boolean(),
        coverImage: `https://picsum.photos/seed/${i + 200}/800/600`,
        previewVideo: `https://www.youtube.com/watch?v=${faker.string.alphanumeric(11)}`,
        demoUrl: faker.internet.url(),
        screenshots: [
          `https://picsum.photos/seed/${i + 201}/800/600`,
          `https://picsum.photos/seed/${i + 202}/800/600`,
          `https://picsum.photos/seed/${i + 203}/800/600`,
        ],
        techStack: [
          faker.helpers.arrayElement(['React', 'Angular', 'Vue', 'Svelte']),
          faker.helpers.arrayElement(['Node.js', 'Django', 'Flask', 'Spring Boot']),
          faker.helpers.arrayElement(['MongoDB', 'PostgreSQL', 'MySQL', 'SQLite']),
        ],
        // Convert arrays to strings for text fields
        features: faker.lorem.paragraphs(3),
        requirements: faker.lorem.paragraphs(2),
        whatYouGet: faker.lorem.paragraphs(2),
        licenseType: faker.helpers.arrayElement(['personal', 'commercial', 'one_time', 'unlimited']),
        downloadLimit: faker.helpers.arrayElement([null, 1, 3, 5, 10]),
        supportIncluded: faker.datatype.boolean(),
        supportDuration: faker.helpers.arrayElement([null, 30, 60, 90, 180, 365]),
        filesSize: `${faker.number.int({ min: 1, max: 500 })} MB`,
        version: faker.system.semver(),
        status: faker.helpers.arrayElement(['draft', 'published']),
        publishedAt: faker.date.recent(),
        createdBy: teacher.userId,
        featured: faker.datatype.boolean(),
        documentationUrl: `https://docs.example.com/project-${i}`,
        supportEmail: faker.internet.email(),
        repositoryUrl: faker.datatype.boolean() ? `https://github.com/example/project-${i}` : null,
        downloadUrl: `https://storage.example.com/projects/project-${i}.zip`,
      });      projects.push(project);

      // Create some project files for download
      const numFiles = faker.number.int({ min: 2, max: 5 });
      const fileTypes = ["source_code", "documentation", "assets", "demo", "other"];

      for (let j = 0; j < numFiles; j++) {
        try {
          await ProjectFile.create({
            fileId: uuidv4(),
            projectId: project.projectId,
            fileName: `${faker.system.fileName()}.${faker.system.fileExt()}`,
            fileUrl: `https://storage.example.com/projects/${project.projectId}/file_${j}.${faker.system.fileExt()}`,
            fileSize: faker.number.int({ min: 100, max: 10000 }),
            fileType: fileTypes[j % fileTypes.length], // Use allowed enum values
            mimeType: faker.system.mimeType(), // Store the MIME type in the correct field
            isMain: j === 0, // First file is the main one
            downloadOrder: j,
            description: faker.lorem.sentence(),
            uploadedBy: teacher.userId,
          });
        } catch (error) {
          console.error(`Error creating project file ${j + 1} for project ${i + 1}:`, error.message);
          // Continue with next file
        }
      }
    } catch (error) {
      console.error(`Error creating project ${i + 1}:`, error.message);
      // Continue with the next project
    }
  }

  console.log(`Successfully created ${projects.length} projects`);
  return projects;
}

/**
 * Create banners for the homepage
 */
async function createBanners() {
  console.log('Creating banners...');

  const banners = [
    {
      title: 'Learn New Skills',
      description: 'Master in-demand skills with our comprehensive courses',
      imageUrl: 'https://picsum.photos/seed/banner1/1200/400',
      isActive: true,
      order: 1
    },
    {
      title: 'Live Training Sessions',
      description: 'Join interactive live sessions with industry experts',
      imageUrl: 'https://picsum.photos/seed/banner2/1200/400',
      isActive: true,
      order: 2
    },
    {
      title: 'Download Ready-Made Projects',
      description: 'Access professionally built projects to kickstart your development',
      imageUrl: 'https://picsum.photos/seed/banner3/1200/400',
      isActive: true,
      order: 3
    },
    {
      title: 'Special Offers',
      description: 'Limited time discounts on all premium courses',
      imageUrl: 'https://picsum.photos/seed/banner4/1200/400',
      isActive: false,
      order: 4
    },
    {
      title: 'Certification Programs',
      description: 'Get certified and boost your career prospects',
      imageUrl: 'https://picsum.photos/seed/banner5/1200/400',
      isActive: true,
      order: 5
    }
  ];

  const createdBanners = [];
  for (const bannerData of banners) {
    const [banner] = await Banner.findOrCreate({
      where: { title: bannerData.title },
      defaults: bannerData
    });
    createdBanners.push(banner);
  }

  return createdBanners;
}

/**
 * Create goals for skill tracking
 */
async function createGoals(levels) {
  console.log('Creating goals...');

  const goalNames = [
    'Become a Full Stack Developer',
    'Master Data Science',
    'Learn Mobile App Development',
    'Become a DevOps Engineer',
    'Master Cloud Computing',
    'Learn Game Development',
    'Master Machine Learning',
    'Become a UI/UX Designer',
    'Master Blockchain Development',
    'Learn Cybersecurity'
  ];

  const createdGoals = [];
  for (const goalName of goalNames) {
    // Assign a random level
    const level = levels[Math.floor(Math.random() * levels.length)];

    const [goal] = await Goal.findOrCreate({
      where: { goalName },
      defaults: {
        goalId: uuidv4(),
        goalName,
        description: faker.lorem.paragraph(),
        levelId: level.levelId
      }
    });
    createdGoals.push(goal);
  }

  return createdGoals;
}

/**
 * Create skills for learning paths
 */
async function createSkills(levels) {
  console.log('Creating skills...');

  const skillsData = [
    { name: 'JavaScript', level: 'Beginner' },
    { name: 'React', level: 'Intermediate' },
    { name: 'Node.js', level: 'Intermediate' },
    { name: 'Python', level: 'Beginner' },
    { name: 'Django', level: 'Intermediate' },
    { name: 'Flask', level: 'Intermediate' },
    { name: 'Java', level: 'Beginner' },
    { name: 'Spring Boot', level: 'Advanced' },
    { name: 'SQL', level: 'Beginner' },
    { name: 'MongoDB', level: 'Intermediate' },
    { name: 'AWS', level: 'Advanced' },
    { name: 'Docker', level: 'Intermediate' },
    { name: 'Kubernetes', level: 'Advanced' },
    { name: 'Git', level: 'Beginner' },
    { name: 'UI Design', level: 'Intermediate' },
    { name: 'UX Research', level: 'Advanced' },
    { name: 'GraphQL', level: 'Advanced' },
    { name: 'Redux', level: 'Intermediate' },
    { name: 'CSS', level: 'Beginner' },
    { name: 'HTML', level: 'Beginner' }
  ];

  const createdSkills = [];
  for (const skillData of skillsData) {
    // Find the matching level
    const level = levels.find(l => l.name === skillData.level);

    const [skill] = await Skill.findOrCreate({
      where: { skillName: skillData.name },
      defaults: {
        skillId: uuidv4(),
        skillName: skillData.name,
        description: `Mastery of ${skillData.name} programming/technology`,
        levelId: level.levelId
      }
    });
    createdSkills.push(skill);
  }

  return createdSkills;
}

/**
 * Create exams for skill assessment
 * (TNPSC, TNSURB, etc.)
 */
async function createExams(levels) {
  console.log('Creating exams...');

  const examsData = [
    { name: 'TNPSC Group 1', level: 'Advanced' },
    { name: 'TNPSC Group 2', level: 'Intermediate' },
    { name: 'TNPSC Group 4', level: 'Beginner' },
    { name: 'TNSURB SI Exam', level: 'Advanced' },
    { name: 'TNSURB Constable Exam', level: 'Beginner' },
    { name: 'TNUSRB Fireman Exam', level: 'Intermediate' },
    { name: 'TNPSC VAO Exam', level: 'Beginner' },
    { name: 'TNPSC Assistant Exam', level: 'Intermediate' },
    { name: 'TNPSC Engineering Services', level: 'Advanced' },
    { name: 'TNPSC Group 3', level: 'Intermediate' }
  ];

  const createdExams = [];
  for (const examData of examsData) {
    // Find the matching level
    const level = levels.find(l => l.name === examData.level);

    const [exam] = await Exam.findOrCreate({
      where: { examName: examData.name },
      defaults: {
        examId: uuidv4(),
        examName: examData.name,
        description: `Assessment for ${examData.name}`,
        levelId: level.levelId
      }
    });
    createdExams.push(exam);
  }

  return createdExams;
}

/**
 * Create ratings for courses and projects (after purchases and enrollments exist)
 */
async function createRatings(enrollments, purchases) {
  console.log('Creating ratings for courses and projects...');

  const courseRatings = [];
  const projectRatings = [];

  // Create course ratings from enrollments
  for (const enrollment of enrollments) {
    try {
      // Only create rating for some enrollments (not all)
      if (faker.datatype.boolean()) {
        const rating = await CourseRating.create({
          ratingId: uuidv4(),
          courseId: enrollment.courseId,
          userId: enrollment.userId,
          enrollmentId: enrollment.enrollmentId,
          rating: faker.number.int({ min: 3, max: 5 }),
          review: faker.datatype.boolean() ? faker.lorem.sentence() : null,
          createdAt: faker.date.recent({ days: 30 }),
        });
        courseRatings.push(rating);
      }
    } catch (error) {
      console.error(`Error creating course rating:`, error.message);
    }
  }

  // Create project ratings from purchases
  for (const purchase of purchases) {
    try {
      // Only create rating for some purchases (not all)
      if (faker.datatype.boolean()) {
        const rating = await ProjectRating.create({
          ratingId: uuidv4(),
          projectId: purchase.projectId,
          userId: purchase.userId,
          purchaseId: purchase.purchaseId,
          rating: faker.number.int({ min: 3, max: 5 }),
          review: faker.datatype.boolean() ? faker.lorem.sentence() : null,
          createdAt: faker.date.recent({ days: 30 }),
        });
        projectRatings.push(rating);
      }
    } catch (error) {
      console.error(`Error creating project rating:`, error.message);
    }
  }

  console.log(`Created ${courseRatings.length} course ratings`);
  console.log(`Created ${projectRatings.length} project ratings`);
  return { courseRatings, projectRatings };
}

/**
 * Create enrollments and purchases first, then ratings
 */
async function createEnrollmentsAndPurchases(students, courses, projects) {
  console.log('Creating enrollments and purchases...');

  const enrollments = [];
  const purchases = [];

  // Create course enrollments
  for (const course of courses) {
    const numEnrollments = faker.number.int({ min: 5, max: 20 });
    
    for (let i = 0; i < numEnrollments; i++) {
      try {
        const student = students[Math.floor(Math.random() * students.length)];
        
        // Check if this student is already enrolled
        const existingEnrollment = await Enrollment.findOne({
          where: { 
            courseId: course.courseId,
            userId: student.userId 
          }
        });

        if (!existingEnrollment) {
          const enrollment = await Enrollment.create({
            enrollmentId: uuidv4(),
            courseId: course.courseId,
            userId: student.userId,
            enrollmentDate: faker.date.recent({ days: 30 }),
            completionStatus: faker.helpers.arrayElement(['not_started', 'in_progress', 'completed']),
            paymentStatus: course.isPaid ? 'completed' : 'pending',
            amountPaid: course.isPaid ? course.price : 0,
            progressPercentage: faker.number.int({ min: 0, max: 100 }),
          });
          enrollments.push(enrollment);
        }
      } catch (error) {
        console.error(`Error creating enrollment:`, error.message);
      }
    }
  }

  // Create project purchases
  for (const project of projects) {
    const numPurchases = faker.number.int({ min: 3, max: 15 });
    
    for (let i = 0; i < numPurchases; i++) {
      try {
        const student = students[Math.floor(Math.random() * students.length)];
        
        // Check if this student already purchased this project
        const existingPurchase = await ProjectPurchase.findOne({
          where: { 
            projectId: project.projectId,
            userId: student.userId 
          }
        });

        if (!existingPurchase) {
          const purchase = await ProjectPurchase.create({
            purchaseId: uuidv4(),
            projectId: project.projectId,
            userId: student.userId,
            orderId: `ORDER-${faker.string.alphanumeric(10).toUpperCase()}`,
            originalPrice: project.price,
            finalPrice: project.price,
            purchaseDate: faker.date.recent({ days: 60 }),
            paymentStatus: 'completed',
            paymentMethod: faker.helpers.arrayElement(['card', 'upi', 'netbanking', 'wallet']),
            paymentId: faker.string.alphanumeric(20),
            downloadCount: faker.number.int({ min: 0, max: project.downloadLimit || 5 }),
            supportExpiryDate: project.supportDuration ? 
              new Date(Date.now() + (project.supportDuration * 24 * 60 * 60 * 1000)) : null,
          });
          purchases.push(purchase);
        }
      } catch (error) {
        console.error(`Error creating project purchase:`, error.message);
      }
    }
  }

  console.log(`Created ${enrollments.length} course enrollments`);
  console.log(`Created ${purchases.length} project purchases`);
  return { enrollments, purchases };
}

/**
 * Main function to seed the database
 */
async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Initialize basic data
    console.log('Step 1: Initializing basic data...');
    const { admin, teachers, students, levels, categories, programmingLanguages } = await initBasicData();

    // Create live courses
    console.log('Step 2: Creating live courses...');
    const liveCourses = await createLiveCourses(teachers, levels, categories);

    // Create recorded courses
    console.log('Step 3: Creating recorded courses...');
    const recordedCourses = await createRecordedCourses(teachers, levels, categories);

    // Create projects
    console.log('Step 4: Creating projects...');
    const projects = await createProjects(teachers, categories, programmingLanguages, levels);

    // Create banners
    console.log('Step 5: Creating banners...');
    const banners = await createBanners();

    // Create goals
    console.log('Step 6: Creating goals...');
    const goals = await createGoals(levels);

    // Create skills
    console.log('Step 7: Creating skills...');
    const skills = await createSkills(levels);

    // Create exams
    console.log('Step 8: Creating exams...');
    const exams = await createExams(levels);

    // Create enrollments and purchases
    console.log('Step 9: Creating enrollments and purchases...');
    const { enrollments, purchases } = await createEnrollmentsAndPurchases(students, [...liveCourses, ...recordedCourses], projects);

    // Create ratings (after purchases and enrollments exist)
    console.log('Step 10: Creating ratings...');
    const { courseRatings, projectRatings } = await createRatings(enrollments, purchases);

    console.log('Database seeding completed successfully!');
    console.log(`Created ${liveCourses.length} live courses`);
    console.log(`Created ${recordedCourses.length} recorded courses`);
    console.log(`Created ${projects.length} projects`);
    console.log(`Created ${banners.length} banners`);
    console.log(`Created ${goals.length} goals`);
    console.log(`Created ${skills.length} skills`);
    console.log(`Created ${exams.length} exams`);
    console.log(`Created ${courseRatings.length} course ratings`);
    console.log(`Created ${projectRatings.length} project ratings`);
    console.log(`Created ${enrollments.length} course enrollments`);
    console.log(`Created ${purchases.length} project purchases`);

    // Default credentials
    console.log('\nDefault credentials:');
    console.log('Admin: admin@example.com /' + DEFAULT_PASSWORD);
    teachers.forEach((teacher, i) => {
      console.log(`Teacher ${i + 1}: ${teacher.email} /` + DEFAULT_PASSWORD);
    });
    students.forEach((student, i) => {
      console.log(`Student ${i + 1}: ${student.email} /` + DEFAULT_PASSWORD);
    });

  } catch (error) {
    console.error('Error seeding database:', error);
    console.error(error.stack);
    process.exit(1); // Exit with error code
  } finally {
    // Close the database connection
    console.log('Closing database connection...');
    try {
      await sequelize.close();
      console.log('Database connection closed successfully.');
    } catch (err) {
      console.error('Error closing database connection:', err);
    }
  }
}

// Run the seeder
seedDatabase();
