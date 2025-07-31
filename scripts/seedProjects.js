// Fast Project Seeder - Creates multiple projects efficiently
import { v4 as uuidv4 } from 'uuid';
import Project from '../model/project.js';
import CourseCategory from '../model/courseCategory.js';
import CourseLevel from '../model/courseLevel.js';
import Language from '../model/language.js';
import User from '../model/user.js';
import { faker } from '@faker-js/faker';

export async function seedProjects(basicData) {
  console.log('💼 Seeding projects...');

  // Use provided data or fetch from database
  const categories = basicData?.categories || await CourseCategory.findAll();
  const levels = basicData?.levels || await CourseLevel.findAll();
  const languages = basicData?.languages || await Language.findAll();
  const teachers = basicData?.teachers || await User.findAll({ where: { role: 'teacher' } });

  if (categories.length === 0 || levels.length === 0 || teachers.length === 0) {
    throw new Error('Missing required data: categories, levels, or teachers. Run basic data seeder first.');
  }

  const projectTitles = [
    'E-commerce Platform with React & Node.js',
    'Social Media Dashboard - MERN Stack',
    'Real-time Chat Application',
    'Task Management System',
    'Weather App with API Integration',
    'Restaurant Booking System',
    'Online Learning Platform',
    'Personal Finance Tracker',
    'Blog Content Management System',
    'Inventory Management System',
    'Event Management Platform',
    'Travel Booking Website',
    'Healthcare Management System',
    'Digital Marketing Dashboard',
    'Real Estate Listing Platform',
    'Cryptocurrency Trading Bot',
    'Video Streaming Platform',
    'Job Portal Website',
    'Online Banking System',
    'Music Player Application'
  ];

  const projectTypes = [
    'Web Application',
    'Mobile App',
    'Desktop Application',
    'API Service',
    'Chrome Extension',
    'WordPress Plugin',
    'Game',
    'Machine Learning Model',
    'UI/UX Design Kit',
    'eCommerce Solution',
    'SaaS Platform',
    'Microservice',
    'PWA',
    'Dashboard',
    'CRM System'
  ];

  const projects = [];

  // Create 15+ projects
  for (let i = 0; i < 20; i++) {
    const category = faker.helpers.arrayElement(categories);
    const level = faker.helpers.arrayElement(levels);
    const language = faker.helpers.arrayElement(languages);
    const teacher = faker.helpers.arrayElement(teachers);
    const projectType = faker.helpers.arrayElement(projectTypes);

    const project = await Project.create({
      projectId: uuidv4(),
      title: projectTitles[i] || `${projectType}: ${faker.company.buzzVerb()} ${faker.company.buzzAdjective()} ${faker.company.buzzNoun()}`,
      shortDescription: faker.lorem.sentences(2),
      description: generateProjectDescription(),
      categoryId: category.categoryId,
      levelId: level.levelId,
      createdBy: teacher.userId,
      isPublished: true,
      price: faker.number.float({ min: 29, max: 299, fractionDigits: 2 }),
      salePrice: faker.number.float({ min: 19, max: 199, fractionDigits: 2 }),
      thumbnailUrl: `https://example.com/project-${i + 1}.jpg`,
      previewVideoUrl: `https://youtube.com/watch?v=${faker.string.alphanumeric(11)}`
    });

    projects.push(project);
  }

  console.log(`✅ Created ${projects.length} projects`);
  return projects;
}

function generateProjectDescription() {
  return `<div class="project-description">
    <h3>Project Overview</h3>
    <p>${faker.lorem.paragraphs(2, '<br>')}</p>
    
    <h4>Key Highlights</h4>
    <ul>
      <li>${faker.lorem.sentence()}</li>
      <li>${faker.lorem.sentence()}</li>
      <li>${faker.lorem.sentence()}</li>
      <li>${faker.lorem.sentence()}</li>
    </ul>
    
    <blockquote>
      <p><strong>Note:</strong> ${faker.lorem.sentence()}</p>
    </blockquote>
  </div>`;
}

function generateProjectFeatures() {
  return `<div class="features-content">
    <h3>Project Features</h3>
    <div class="feature-grid">
      <div class="feature-item">
        <h4>🚀 Modern Architecture</h4>
        <p>${faker.lorem.sentence()}</p>
      </div>
      <div class="feature-item">
        <h4>📱 Responsive Design</h4>
        <p>${faker.lorem.sentence()}</p>
      </div>
      <div class="feature-item">
        <h4>🔒 Secure Implementation</h4>
        <p>${faker.lorem.sentence()}</p>
      </div>
      <div class="feature-item">
        <h4>⚡ High Performance</h4>
        <p>${faker.lorem.sentence()}</p>
      </div>
    </div>
  </div>`;
}

function generateProjectRequirements() {
  return `<div class="requirements-content">
    <h3>System Requirements</h3>
    <ul>
      <li>${faker.helpers.arrayElement(['Node.js 16+', 'Python 3.8+', 'Java 11+', 'PHP 8.0+'])}</li>
      <li>${faker.helpers.arrayElement(['MySQL 8.0+', 'PostgreSQL 12+', 'MongoDB 4.4+'])}</li>
      <li>Git version control</li>
      <li>Code editor (VS Code recommended)</li>
      <li>Web browser for testing</li>
    </ul>
    
    <h3>Prerequisites</h3>
    <ul>
      <li>Basic programming knowledge</li>
      <li>Understanding of ${faker.helpers.arrayElement(['HTML/CSS', 'JavaScript', 'Python basics', 'Java fundamentals'])}</li>
      <li>Familiarity with command line</li>
    </ul>
  </div>`;
}

function generateProjectWhatYouGet() {
  return `<div class="what-you-get">
    <h3>What's Included</h3>
    <ul>
      <li>📁 Complete source code</li>
      <li>📚 Comprehensive documentation</li>
      <li>🎥 Setup video tutorial</li>
      <li>🛠️ Installation guide</li>
      <li>💬 30-day support</li>
      <li>🔄 Free updates</li>
    </ul>
  </div>`;
}
