// Enhanced Basic data seeder - Users, Categories, Levels, Languages
import { v4 as uuidv4 } from 'uuid';
import { Op } from 'sequelize';
import User from '../model/user.js';
import Category from '../model/category.js';
import CourseLevel from '../model/courseLevel.js';
import Language from '../model/language.js';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcrypt';

const DEFAULT_PASSWORD = 'SecurePassword@123';

export async function seedBasicData() {
  console.log('🔧 Seeding enhanced basic data...');

  // Extended Course Categories - more than 10 different categories
  const courseCategories = [
    { categoryName: 'Web Development', categoryCode: 'WEB_DEV', description: 'Frontend and backend web technologies' },
    { categoryName: 'Mobile Development', categoryCode: 'MOB_DEV', description: 'iOS, Android, and cross-platform mobile apps' },
    { categoryName: 'Data Science', categoryCode: 'DATA_SCI', description: 'Machine learning, analytics, and data visualization' },
    { categoryName: 'UI/UX Design', categoryCode: 'UI_UX', description: 'User interface and experience design' },
    { categoryName: 'DevOps', categoryCode: 'DEVOPS', description: 'CI/CD, cloud infrastructure, and automation' },
    { categoryName: 'Game Development', categoryCode: 'GAME_DEV', description: 'Unity, Unreal Engine, and game programming' },
    { categoryName: 'Artificial Intelligence', categoryCode: 'AI_ML', description: 'AI, machine learning, and deep learning' },
    { categoryName: 'Cybersecurity', categoryCode: 'CYBERSEC', description: 'Information security and ethical hacking' },
    { categoryName: 'Cloud Computing', categoryCode: 'CLOUD', description: 'AWS, Azure, GCP, and cloud architecture' },
    { categoryName: 'Blockchain', categoryCode: 'BLOCKCHAIN', description: 'Cryptocurrency, smart contracts, and DeFi' },
    { categoryName: 'Digital Marketing', categoryCode: 'MARKETING', description: 'SEO, social media, and content marketing' },
    { categoryName: 'Business Analytics', categoryCode: 'BIZ_ANALYTICS', description: 'Business intelligence and data analysis' },
    { categoryName: 'Software Testing', categoryCode: 'TESTING', description: 'QA, automation testing, and quality assurance' },
    { categoryName: 'Database Management', categoryCode: 'DATABASE', description: 'SQL, NoSQL, and database administration' }
  ];

  // Course Levels
  const courseLevels = [
    { name: 'Beginner', order: 1, description: 'For absolute beginners with no prior experience' },
    { name: 'Intermediate', order: 2, description: 'For those with some basic knowledge' },
    { name: 'Advanced', order: 3, description: 'For experienced learners looking to master skills' },
    { name: 'Expert', order: 4, description: 'For professionals seeking specialized expertise' }
  ];

  // Extended Languages - more variety
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
    { language: 'Portuguese', languageCode: 'pt', languageType: 'both', nativeName: 'Português' },
    { language: 'Korean', languageCode: 'ko', languageType: 'both', nativeName: '한국어' }
  ];

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  // Create admin user with timestamp for uniqueness
  console.log('Creating admin user...');
  const timestamp = Date.now().toString().slice(-6); // last 6 digits of timestamp
  const adminUsername = `admin${timestamp}`;
  
  let admin;
  try {
    admin = await User.create({
      userId: uuidv4(),
      username: adminUsername,
      email: `admin${timestamp}@startgoals.com`,
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
      isOnboarded: true,
      firstLogin: false,
      profileImage: 'https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/1.jpg'
    });
    console.log('✅ Admin user created successfully:', admin.username);
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    throw error;
  }

  // Create teacher users - more teachers with varied specializations
  console.log('Creating teacher users...');
  const teachers = [];
  const teacherData = [
    { name: 'Alice Johnson', email: 'alice@teachers.com', specialty: 'Web Development' },
    { name: 'Bob Smith', email: 'bob@teachers.com', specialty: 'Data Science' },
    { name: 'Charlie Brown', email: 'charlie@teachers.com', specialty: 'Mobile Development' },
    { name: 'Diana Prince', email: 'diana@teachers.com', specialty: 'UI/UX Design' },
    { name: 'Eve Wilson', email: 'eve@teachers.com', specialty: 'DevOps' },
    { name: 'Frank Miller', email: 'frank@teachers.com', specialty: 'AI/ML' },
    { name: 'Grace Chen', email: 'grace@teachers.com', specialty: 'Cybersecurity' },
    { name: 'Henry Davis', email: 'henry@teachers.com', specialty: 'Cloud Computing' },
    { name: 'Iris Rodriguez', email: 'iris@teachers.com', specialty: 'Game Development' },
    { name: 'Jack Taylor', email: 'jack@teachers.com', specialty: 'Blockchain' },
    { name: 'Kate Anderson', email: 'kate@teachers.com', specialty: 'Digital Marketing' },
    { name: 'Leo Garcia', email: 'leo@teachers.com', specialty: 'Software Testing' }
  ];

  for (let i = 0; i < teacherData.length; i++) {
    const teacherInfo = teacherData[i];
    const username = teacherInfo.name.toLowerCase().replace(/\s+/g, '') + timestamp;
    const email = `${teacherInfo.name.toLowerCase().replace(/\s+/g, '')}${timestamp}@teachers.com`;
    
    const teacher = await User.create({
      userId: uuidv4(),
      username: username,
      email: email,
      password: hashedPassword,
      role: 'teacher',
      isVerified: true,
      isOnboarded: true,
      firstLogin: false,
      profileImage: `https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/${faker.number.int({ min: 1, max: 1000 })}.jpg`,
      bio: `Experienced ${teacherInfo.specialty} instructor with 5+ years of industry experience.`
    });
    teachers.push(teacher);
  }

  // Create student users - more students for testing
  console.log('Creating student users...');
  const students = [];
  for (let i = 1; i <= 15; i++) {
    const student = await User.create({
      userId: uuidv4(),
      username: `student${i}${timestamp}`,
      email: `student${i}${timestamp}@students.com`,
      password: hashedPassword,
      role: 'student',
      isVerified: true,
      isOnboarded: true,
      firstLogin: false,
      profileImage: `https://cloudflare-ipfs.com/ipfs/Qmd3W5DuhgHirLHGVixi6V76LhCkZUz6pnFt5AJBiyvHye/avatar/${faker.number.int({ min: 1, max: 1000 })}.jpg`
    });
    students.push(student);
  }

  // Create Categories
  console.log('Creating course categories...');
  const categories = [];
  for (const categoryData of courseCategories) {
    const [category] = await Category.findOrCreate({
      where: { categoryCode: categoryData.categoryCode },
      defaults: {
        categoryId: uuidv4(),
        ...categoryData
      }
    });
    categories.push(category);
  }

  // Create Levels
  console.log('Creating course levels...');
  const levels = [];
  for (const levelData of courseLevels) {
    const [level] = await CourseLevel.findOrCreate({
      where: { name: levelData.name },
      defaults: {
        levelId: uuidv4(),
        ...levelData
      }
    });
    levels.push(level);
  }

  // Create Languages
  console.log('Creating languages...');
  const programmingLanguages = [];
  for (const langData of languages) {
    const [language] = await Language.findOrCreate({
      where: { languageCode: langData.languageCode },
      defaults: {
        languageId: uuidv4(),
        ...langData
      }
    });
    programmingLanguages.push(language);
  }

  console.log('✅ Basic data seeded successfully');
  
  return {
    admin: admin,
    teachers,
    students,
    categories,
    levels,
    languages: programmingLanguages
  };
}
