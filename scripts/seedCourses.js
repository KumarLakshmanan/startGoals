// Fast Course Seeder - Creates multiple courses efficiently
import { v4 as uuidv4 } from 'uuid';
import Course from '../model/course.js';
import CourseCategory from '../model/courseCategory.js';
import CourseLevel from '../model/courseLevel.js';
import Language from '../model/language.js';
import User from '../model/user.js';
import { faker } from '@faker-js/faker';

export async function seedCourses(basicData) {
  console.log('🎓 Seeding courses...');

  // Use provided data or fetch from database
  const categories = basicData?.categories || await CourseCategory.findAll();
  const levels = basicData?.levels || await CourseLevel.findAll();
  const languages = basicData?.languages || await Language.findAll();
  const teachers = basicData?.teachers || await User.findAll({ where: { role: 'teacher' } });

  if (categories.length === 0 || levels.length === 0 || teachers.length === 0) {
    throw new Error('Missing required data: categories, levels, or teachers. Run basic data seeder first.');
  }

  const liveCourseTitles = [
    'Complete React Development Bootcamp',
    'Advanced Node.js Backend Development',
    'Full Stack MERN Development',
    'Python Data Science Masterclass',
    'DevOps and Cloud Computing',
    'Machine Learning with TensorFlow',
    'Mobile App Development with React Native',
    'Angular Frontend Development',
    'Vue.js Modern Web Development',
    'Django REST API Development',
    'AWS Cloud Architecture',
    'Kubernetes and Docker Mastery',
    'GraphQL API Development',
    'Next.js Production Applications',
    'Microservices with Spring Boot'
  ];

  const recordedCourseTitles = [
    'JavaScript Fundamentals Complete Course',
    'CSS Grid and Flexbox Mastery',
    'HTML5 and Modern Web Standards',
    'Database Design with MySQL',
    'MongoDB NoSQL Database',
    'Redis Caching Strategies',
    'Git Version Control Mastery',
    'Linux Server Administration',
    'Web Security Best Practices',
    'API Testing with Postman',
    'Performance Optimization Techniques',
    'Responsive Web Design Principles',
    'Progressive Web Apps Development',
    'Microservices Architecture Patterns',
    'Python Programming Fundamentals'
  ];

  const courses = [];

  // Create 12+ Live Courses
  for (let i = 0; i < 15; i++) {
    const category = faker.helpers.arrayElement(categories);
    const level = faker.helpers.arrayElement(levels);
    const language = faker.helpers.arrayElement(languages);
    const teacher = faker.helpers.arrayElement(teachers);

    const course = await Course.create({
      courseId: uuidv4(),
      title: liveCourseTitles[i] || `Live Course ${i + 1}`,
      shortDescription: faker.lorem.sentences(2),
      description: generateCourseDescription(),
      type: 'live',
      categoryId: category.categoryId,
      levelId: level.levelId,
      createdBy: teacher.userId,
      isPaid: true,
      price: faker.number.float({ min: 99, max: 999, fractionDigits: 2 }),
      salePrice: faker.number.float({ min: 49, max: 499, fractionDigits: 2 }),
      durationDays: faker.number.int({ min: 7, max: 30 }),
      maxEnrollments: faker.number.int({ min: 20, max: 100 }),
      isPublished: true,
      thumbnailUrl: `https://example.com/course-${i + 1}.jpg`,
      previewVideoUrl: `https://youtube.com/watch?v=${faker.string.alphanumeric(11)}`,
      liveStartDate: faker.date.future({ years: 1 }),
      liveEndDate: faker.date.future({ years: 1 })
    });

    courses.push(course);
  }

  // Create 12+ Recorded Courses
  for (let i = 0; i < 15; i++) {
    const category = faker.helpers.arrayElement(categories);
    const level = faker.helpers.arrayElement(levels);
    const language = faker.helpers.arrayElement(languages);
    const teacher = faker.helpers.arrayElement(teachers);

    const course = await Course.create({
      courseId: uuidv4(),
      title: recordedCourseTitles[i] || `Recorded Course ${i + 1}`,
      shortDescription: faker.lorem.sentences(2),
      description: generateCourseDescription(),
      type: 'recorded',
      categoryId: category.categoryId,
      levelId: level.levelId,
      createdBy: teacher.userId,
      isPaid: true,
      price: faker.number.float({ min: 49, max: 499, fractionDigits: 2 }),
      salePrice: faker.number.float({ min: 29, max: 299, fractionDigits: 2 }),
      durationMinutes: faker.number.int({ min: 120, max: 600 }),
      isPublished: true,
      thumbnailUrl: `https://example.com/recorded-${i + 1}.jpg`,
      previewVideoUrl: `https://youtube.com/watch?v=${faker.string.alphanumeric(11)}`
    });

    courses.push(course);
  }

  console.log(`✅ Created ${courses.length} courses (${courses.filter(c => c.type === 'live').length} live, ${courses.filter(c => c.type === 'recorded').length} recorded)`);
  
  return {
    liveCourses: courses.filter(c => c.type === 'live'),
    recordedCourses: courses.filter(c => c.type === 'recorded'),
    allCourses: courses
  };
}

function generateCourseDescription() {
  return `<div class="course-description">
    <h3>Course Overview</h3>
    <p>${faker.lorem.paragraphs(2, '<br>')}</p>
    
    <h4>What You'll Learn</h4>
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

function generateCourseFeatures() {
  return `<div class="features-content">
    <h3>Key Features</h3>
    <div class="feature-grid">
      <div class="feature-item">
        <h4>🎯 Interactive Learning</h4>
        <p>${faker.lorem.sentence()}</p>
      </div>
      <div class="feature-item">
        <h4>📱 Mobile Friendly</h4>
        <p>${faker.lorem.sentence()}</p>
      </div>
      <div class="feature-item">
        <h4>🏆 Certification</h4>
        <p>${faker.lorem.sentence()}</p>
      </div>
    </div>
  </div>`;
}

function generateCoursePrerequisites() {
  return `<div class="prerequisites-content">
    <h3>Prerequisites</h3>
    <ul>
      <li>${faker.lorem.sentence()}</li>
      <li>${faker.lorem.sentence()}</li>
      <li>Basic computer knowledge</li>
    </ul>
  </div>`;
}

function generateWhatYouGet() {
  return `<div class="what-you-get">
    <h3>What's Included</h3>
    <ul>
      <li>📚 Complete course materials</li>
      <li>🎥 HD video lectures</li>
      <li>📝 Downloadable resources</li>
      <li>🏆 Certificate of completion</li>
      <li>💬 24/7 support</li>
    </ul>
  </div>`;
}
