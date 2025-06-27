import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../model/user.js';
import Course from '../model/course.js';
import CourseCategory from '../model/courseCategory.js';
import CourseLevel from '../model/courseLevel.js';
import Project from '../model/project.js';
import Language from '../model/language.js';
import LiveSession from '../model/liveSession.js';
import Banner from '../model/banner.js';
import Goal from '../model/goal.js';
import Skill from '../model/skill.js';
import Exam from '../model/exam.js';
import Batch from '../model/batch.js';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';
import fs from 'fs';
import sequelize from '../config/db.js';

// Configure environment variables - use path relative to this file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
console.log('Environment loaded from:', path.join(__dirname, '.env'));

// Set up some constants - ensure we create exactly 5 of each
const NUM_LIVE_COURSES = 5;
const NUM_RECORDED_COURSES = 5;
const NUM_PROJECTS = 5;
const NUM_STUDENTS = 5;
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
    const [category] = await CourseCategory.findOrCreate({
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
      thumbnailUrl: `https://picsum.photos/seed/${i+1}/640/480`,
      levelId: level.levelId,
      categoryId: category.categoryId,
      createdBy: teacher.userId,
      isPublished: true,
      type: 'live',
      isPaid: true,
      price: faker.number.float({ min: 599, max: 9999, multipleOf: 0.01 }),
      isMonthlyPayment: faker.datatype.boolean(),
      durationDays: faker.number.int({ min: 30, max: 90 }),
      liveStartDate: startDate,
      liveEndDate: endDate,
      hasIntroVideo: true,
      introVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      hasCertificate: true,
      status: 'active',
      averageRating: faker.number.float({ min: 3.5, max: 5.0, multipleOf: 0.1 }),
      totalRatings: faker.number.int({ min: 5, max: 50 }),
    });

    // Create a batch for this course
    const batch = await Batch.create({
      batchId: uuidv4(),
      courseId: course.courseId,
      title: `Batch for ${course.title}`,
      startDate: startDate,
      endDate: endDate,
      status: 'ongoing',
      createdBy: teacher.userId,
      enrollmentCapacity: 30, // model default
      currentEnrollment: 0,   // model default
      hasChatEnabled: true,   // model default
    });

    liveCourses.push(course);

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
        batchId: batch.batchId, // Use the real batchId
        courseId: course.courseId,
        title: `Session ${j+1}: ${faker.company.buzzNoun()}`,
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        sessionDate,
        startTime,
        endTime,
        durationMinutes: 120,
        status: 'scheduled',
        platform: faker.helpers.arrayElement(['zoom', 'agora']),
        platformSessionId: faker.string.alphanumeric(10),
      });
    }
  }
  
  return liveCourses;
}

/**
 * Create recorded courses
 */
async function createRecordedCourses(teachers, levels, categories) {
  console.log('Creating recorded courses...');
  
  const recordedCourses = [];
  
  for (let i = 0; i < NUM_RECORDED_COURSES; i++) {
    // Select random teacher, level and category
    const teacher = teachers[Math.floor(Math.random() * teachers.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    // Create course
    const course = await Course.create({
      courseId: uuidv4(),
      title: `Recorded Course: ${faker.company.buzzPhrase()}`,
      description: faker.lorem.paragraphs(3),
      thumbnailUrl: `https://picsum.photos/seed/${i+100}/640/480`,
      levelId: level.levelId,
      categoryId: category.categoryId,
      createdBy: teacher.userId,
      isPublished: true,
      type: 'recorded',
      isPaid: faker.datatype.boolean(),
      price: faker.number.float({ min: 499, max: 4999, multipleOf: 0.01 }),      hasIntroVideo: true,
      introVideoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      hasCertificate: faker.datatype.boolean(),
      status: 'active',
      averageRating: faker.number.float({ min: 3.5, max: 5.0, multipleOf: 0.1 }),
      totalRatings: faker.number.int({ min: 10, max: 100 }),
    });
    
    recordedCourses.push(course);
  }
  
  return recordedCourses;
}

/**
 * Create projects of different types
 */
async function createProjects(teachers, categories, languages) {
  console.log('Creating projects...');
  
  const projects = [];
  
  const projectTypes = [
    'Web Application',
    'Mobile App', 
    'API Service',
    'Chrome Extension',
    'Game',
  ];
  
  for (let i = 0; i < NUM_PROJECTS; i++) {
    // Select random teacher, category and language
    const teacher = teachers[Math.floor(Math.random() * teachers.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const language = languages[Math.floor(Math.random() * languages.length)];
    
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
      coverImage: `https://picsum.photos/seed/${i+200}/800/600`,
      previewVideo: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      demoUrl: faker.internet.url(),
      screenshots: [
        `https://picsum.photos/seed/${i+201}/800/600`,
        `https://picsum.photos/seed/${i+202}/800/600`,
        `https://picsum.photos/seed/${i+203}/800/600`,
      ],
      techStack: [
        faker.helpers.arrayElement(['React', 'Angular', 'Vue', 'Svelte']),
        faker.helpers.arrayElement(['Node.js', 'Django', 'Flask', 'Spring Boot']),
        faker.helpers.arrayElement(['MongoDB', 'PostgreSQL', 'MySQL', 'SQLite']),
      ],
      features: [
        `Feature 1: ${faker.commerce.productDescription()}`,
        `Feature 2: ${faker.commerce.productDescription()}`,
        `Feature 3: ${faker.commerce.productDescription()}`,
      ],
      requirements: [
        `Requirement 1: ${faker.system.fileType()} ${faker.system.semver()}`,
        `Requirement 2: ${faker.system.fileType()} ${faker.system.semver()}`,
      ],
      whatYouGet: [
        'Source code files',
        'Documentation',
        'Installation guide',
        '24/7 support',
      ],
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
      documentationUrl: faker.internet.url(),
      supportEmail: faker.internet.email(),
    });
    
    projects.push(project);
  }
  
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
    const projects = await createProjects(teachers, categories, programmingLanguages);
    
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
    
    console.log('Database seeding completed successfully!');
    console.log(`Created ${liveCourses.length} live courses`);
    console.log(`Created ${recordedCourses.length} recorded courses`);
    console.log(`Created ${projects.length} projects`);
    console.log(`Created ${banners.length} banners`);
    console.log(`Created ${goals.length} goals`);
    console.log(`Created ${skills.length} skills`);
    console.log(`Created ${exams.length} exams`);
    
    // Default credentials
    console.log('\nDefault credentials:');
    console.log('Admin: admin@example.com /' + DEFAULT_PASSWORD);
    teachers.forEach((teacher, i) => {
      console.log(`Teacher ${i+1}: ${teacher.email} /` + DEFAULT_PASSWORD);
    });
    students.forEach((student, i) => {
      console.log(`Student ${i+1}: ${student.email} /` + DEFAULT_PASSWORD);
    });
    
  } catch (error) {
    console.error('Error seeding database:', error);
    console.error(error.stack);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the seeder
seedDatabase();
