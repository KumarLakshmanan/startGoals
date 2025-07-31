// seedExtraData.js - Seeds goals, skills, banners, and exams
import { v4 as uuidv4 } from 'uuid';
import Goal from '../model/goal.js';
import Skill from '../model/skill.js';
import Banner from '../model/banner.js';
import Exam from '../model/exam.js';
import { faker } from '@faker-js/faker';

export async function seedExtraData(basicData) {
  console.log('🎯 Seeding extra data (goals, skills, banners, exams)...');

  const levels = basicData?.levels || [];
  
  try {
    // Seed Goals
    const goalData = [
      { goalName: 'Become a Full Stack Developer', description: 'Master frontend and backend development' },
      { goalName: 'Learn Data Science', description: 'Analyze data and build machine learning models' },
      { goalName: 'Master Cloud Computing', description: 'Deploy and manage applications in the cloud' },
      { goalName: 'Build Mobile Apps', description: 'Create native and cross-platform mobile applications' },
      { goalName: 'Become a DevOps Engineer', description: 'Automate deployment and infrastructure management' },
      { goalName: 'Learn UI/UX Design', description: 'Design beautiful and user-friendly interfaces' },
      { goalName: 'Master Database Design', description: 'Design and optimize database systems' },
      { goalName: 'Learn Cybersecurity', description: 'Protect systems and data from threats' },
      { goalName: 'Build AI Applications', description: 'Create intelligent applications using AI/ML' },
      { goalName: 'Become a Tech Lead', description: 'Lead technical teams and make architectural decisions' }
    ];

    const goals = [];
    for (const goal of goalData) {
      const [goalRecord] = await Goal.findOrCreate({
        where: { goalName: goal.goalName },
        defaults: {
          goalId: uuidv4(),
          goalName: goal.goalName,
          description: goal.description,
          levelId: levels.length > 0 ? faker.helpers.arrayElement(levels).levelId : null
        }
      });
      goals.push(goalRecord);
    }

    // Seed Skills
    const skillData = [
      'JavaScript', 'Python', 'React', 'Node.js', 'Angular', 'Vue.js', 'HTML5', 'CSS3',
      'TypeScript', 'PHP', 'Java', 'C#', 'Go', 'Rust', 'Swift', 'Kotlin',
      'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'GraphQL', 'REST APIs',
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'Jenkins',
      'Git', 'Linux', 'Nginx', 'Apache', 'Microservices', 'Machine Learning',
      'Data Analysis', 'UI Design', 'UX Research', 'Figma', 'Adobe XD', 'Photoshop'
    ];

    const skills = [];
    for (const skillName of skillData) {
      const [skillRecord] = await Skill.findOrCreate({
        where: { skillName },
        defaults: {
          skillId: uuidv4(),
          skillName,
          description: `Professional ${skillName} development skill`,
          levelId: levels.length > 0 ? faker.helpers.arrayElement(levels).levelId : null
        }
      });
      skills.push(skillRecord);
    }

    // Seed Banners
    const bannerData = [
      {
        title: 'New Year Special - 50% Off All Courses!',
        description: 'Start your learning journey with our biggest discount of the year.',
        imageUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=1200&h=400&fit=crop',
        order: 1
      },
      {
        title: 'Learn AI & Machine Learning',
        description: 'Master the future of technology with our comprehensive AI courses.',
        imageUrl: 'https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200&h=400&fit=crop',
        order: 2
      },
      {
        title: 'Full Stack Development Bootcamp',
        description: 'Become a complete web developer in 16 weeks.',
        imageUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&h=400&fit=crop',
        order: 3
      },
      {
        title: 'Mobile App Development',
        description: 'Build iOS and Android apps from scratch.',
        imageUrl: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=1200&h=400&fit=crop',
        order: 4
      },
      {
        title: 'Cloud Computing Mastery',
        description: 'Learn AWS, Azure, and Google Cloud platforms.',
        imageUrl: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&h=400&fit=crop',
        order: 5
      }
    ];

    const banners = [];
    for (const banner of bannerData) {
      const [bannerRecord] = await Banner.findOrCreate({
        where: { title: banner.title },
        defaults: {
          title: banner.title,
          description: banner.description,
          imageUrl: banner.imageUrl,
          image: banner.imageUrl,
          isActive: true,
          order: banner.order
        }
      });
      banners.push(bannerRecord);
    }

    // Seed Exams
    const examData = [
      { examName: 'JavaScript Fundamentals Exam', description: 'Test your JavaScript knowledge' },
      { examName: 'React Development Certification', description: 'Advanced React skills assessment' },
      { examName: 'Node.js Backend Assessment', description: 'Server-side JavaScript evaluation' },
      { examName: 'Python Programming Test', description: 'Comprehensive Python skills test' },
      { examName: 'Database Design Exam', description: 'SQL and NoSQL database knowledge test' },
      { examName: 'Web Security Assessment', description: 'Cybersecurity for web applications' },
      { examName: 'Cloud Architecture Exam', description: 'Cloud platform design and deployment' },
      { examName: 'Mobile Development Test', description: 'iOS and Android development skills' },
      { examName: 'UI/UX Design Assessment', description: 'Design principles and user experience' },
      { examName: 'DevOps Certification Exam', description: 'CI/CD and infrastructure automation' }
    ];

    const exams = [];
    for (const exam of examData) {
      const [examRecord] = await Exam.findOrCreate({
        where: { examName: exam.examName },
        defaults: {
          examId: uuidv4(),
          examName: exam.examName,
          description: exam.description,
          levelId: levels.length > 0 ? faker.helpers.arrayElement(levels).levelId : null
        }
      });
      exams.push(examRecord);
    }

    console.log(`✅ Extra data seeded successfully:`);
    console.log(`   - Goals: ${goals.length}`);
    console.log(`   - Skills: ${skills.length}`);
    console.log(`   - Banners: ${banners.length}`);
    console.log(`   - Exams: ${exams.length}`);

    return {
      goals,
      skills,
      banners,
      exams
    };

  } catch (error) {
    console.error('❌ Error seeding extra data:', error);
    throw error;
  }
}
