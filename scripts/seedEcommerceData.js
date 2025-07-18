// seedEcommerceData.js
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import { faker } from '@faker-js/faker';
import sequelize from '../config/db.js';

// Import models
import User from '../model/user.js';
import Course from '../model/course.js';
import Section from '../model/section.js';
import Lesson from '../model/lesson.js';
import CourseCategory from '../model/courseCategory.js';
import CourseLevel from '../model/courseLevel.js';
import DiscountCode from '../model/discountCode.js';
import DiscountUsage from '../model/discountUsage.js';
import Cart from '../model/cart.js';
import Wishlist from '../model/wishlist.js';
import Order from '../model/order.js';
import Enrollment from '../model/enrollment.js';
import Language from '../model/language.js';

// Configure environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Constants
const DEFAULT_PASSWORD = 'SecurePassword@123';

/**
 * Initialize basic categories and levels if they don't exist
 */
async function getBasicData() {
  console.log('Getting basic data...');

  const admin = await User.findOne({
    where: { email: 'admin@example.com' }
  });

  if (!admin) {
    throw new Error('Admin user not found. Run the main seed script first.');
  }

  const teachers = await User.findAll({
    where: { role: 'teacher' },
    limit: 5
  });

  if (teachers.length === 0) {
    throw new Error('No teacher users found. Run the main seed script first.');
  }

  const students = await User.findAll({
    where: { role: 'student' },
    limit: 10
  });

  if (students.length === 0) {
    throw new Error('No student users found. Run the main seed script first.');
  }

  const levels = await CourseLevel.findAll();
  if (levels.length === 0) {
    throw new Error('No course levels found. Run the main seed script first.');
  }

  const categories = await CourseCategory.findAll();
  if (categories.length === 0) {
    throw new Error('No course categories found. Run the main seed script first.');
  }

  const languages = await Language.findAll();
  if (languages.length === 0) {
    throw new Error('No languages found. Run the main seed script first.');
  }

  return {
    admin,
    teachers,
    students,
    levels,
    categories,
    languages
  };
}

/**
 * Create live courses with sections and lessons
 */
async function createLiveCourses(teachers, levels, categories, languages) {
  console.log('Creating live courses...');

  const liveCourses = [];

  // Create 5 live courses
  for (let i = 0; i < 5; i++) {
    const teacher = teachers[Math.floor(Math.random() * teachers.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const language = languages[Math.floor(Math.random() * languages.length)];
    const isPaid = Math.random() > 0.2; // 80% of courses are paid
    const price = isPaid ? Math.floor(Math.random() * 5000) + 999 : 0; // Random price between 999 and 5999
    const isMonthlyPayment = isPaid && Math.random() > 0.7; // 30% of paid courses have monthly payment
    const currentDate = new Date();
    const liveStartDate = new Date(currentDate);
    liveStartDate.setDate(liveStartDate.getDate() + Math.floor(Math.random() * 30) + 5); // Start in 5-35 days
    const liveEndDate = new Date(liveStartDate);
    liveEndDate.setMonth(liveEndDate.getMonth() + 3); // 3 months duration

    const courseData = {
      courseId: uuidv4(),
      title: `${faker.word.adjective()} ${faker.word.noun()} Live Course ${i + 1}`,
      description: faker.lorem.paragraphs(3),
      shortDescription: faker.lorem.sentence(),
      levelId: level.levelId,
      categoryId: category.categoryId,
      createdBy: teacher.userId,
      isPublished: true,
      type: 'live',
      isPaid,
      price,
      salePrice: isPaid ? Math.floor(price * 0.85) : 0, // 15% discount
      discountEnabled: isPaid,
      isMonthlyPayment,
      durationDays: 90, // 3 months
      liveStartDate,
      liveEndDate,
      thumbnailUrl: `https://picsum.photos/seed/live${i}/640/360`,
      coverImage: `https://picsum.photos/seed/livecov${i}/1280/720`,
      hasIntroVideo: Math.random() > 0.5,
      introVideoUrl: Math.random() > 0.5 ? 'https://example.com/intro-video.mp4' : null,
      hasCertificate: true,
      techStack: JSON.stringify(['React', 'Node.js', 'MongoDB', 'Express']),
      programmingLanguages: JSON.stringify(['JavaScript', 'TypeScript']),
      features: faker.lorem.paragraphs(2),
      prerequisites: faker.lorem.paragraphs(1),
      whatYouGet: faker.lorem.paragraphs(2),
      status: 'active',
      publishedAt: new Date(),
      version: '1.0',
      supportIncluded: true,
      supportDuration: 90,
      supportEmail: faker.internet.email(),
      featured: Math.random() > 0.7,
    };

    const course = await Course.create(courseData);
    liveCourses.push(course);

    // Create sections and lessons
    const numSections = Math.floor(Math.random() * 4) + 3; // 3-6 sections
    for (let j = 0; j < numSections; j++) {
      const section = await Section.create({
        sectionId: uuidv4(),
        courseId: course.courseId,
        title: `Section ${j + 1}: ${faker.word.noun()} ${faker.word.adjective()}`,
        description: faker.lorem.sentence(),
        order: j + 1,
        isPublished: true,
        createdBy: teacher.userId
      });

      // Create lessons
      const numLessons = Math.floor(Math.random() * 5) + 2; // 2-6 lessons
      for (let k = 0; k < numLessons; k++) {
        const isPreview = j === 0 && k === 0; // First lesson of first section is preview
        await Lesson.create({
          lessonId: uuidv4(),
          sectionId: section.sectionId,
          title: `Lesson ${k + 1}: ${faker.word.verb()} ${faker.word.noun()}`,
          type: k % 3 === 0 ? 'video' : (k % 3 === 1 ? 'article' : 'quiz'),
          content: faker.lorem.paragraphs(2),
          videoUrl: k % 3 === 0 ? `https://example.com/video${k}.mp4` : null,
          videoDuration: k % 3 === 0 ? Math.floor(Math.random() * 60) + 10 : null, // 10-70 minutes
          order: k + 1,
          isPreview,
          isFree: isPreview || j === 0,
          isPublished: true,
          createdBy: teacher.userId
        });
      }
    }

    console.log(`Created live course: ${course.title}`);
  }

  console.log(`Successfully created ${liveCourses.length} live courses`);
  return liveCourses;
}

/**
 * Create recorded courses with sections and lessons
 */
async function createRecordedCourses(teachers, levels, categories, languages) {
  console.log('Creating recorded courses...');

  const recordedCourses = [];

  // Create 5 recorded courses
  for (let i = 0; i < 5; i++) {
    const teacher = teachers[Math.floor(Math.random() * teachers.length)];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    const language = languages[Math.floor(Math.random() * languages.length)];
    const isPaid = Math.random() > 0.3; // 70% of courses are paid
    const price = isPaid ? Math.floor(Math.random() * 4000) + 499 : 0; // Random price between 499 and 4499
    const totalMinutes = Math.floor(Math.random() * 2000) + 500; // 500-2500 minutes total duration

    const courseData = {
      courseId: uuidv4(),
      title: `${faker.word.adjective()} ${faker.word.noun()} Recorded Course ${i + 1}`,
      description: faker.lorem.paragraphs(3),
      shortDescription: faker.lorem.sentence(),
      levelId: level.levelId,
      categoryId: category.categoryId,
      createdBy: teacher.userId,
      isPublished: true,
      type: 'recorded',
      isPaid,
      price,
      salePrice: isPaid ? Math.floor(price * 0.8) : 0, // 20% discount
      discountEnabled: isPaid,
      isMonthlyPayment: false, // Recorded courses are not monthly
      durationMinutes: totalMinutes,
      thumbnailUrl: `https://picsum.photos/seed/rec${i}/640/360`,
      coverImage: `https://picsum.photos/seed/reccov${i}/1280/720`,
      hasIntroVideo: Math.random() > 0.3,
      introVideoUrl: Math.random() > 0.3 ? 'https://example.com/intro-video.mp4' : null,
      hasCertificate: true,
      techStack: JSON.stringify(['React', 'Node.js', 'MongoDB', 'Express']),
      programmingLanguages: JSON.stringify(['JavaScript', 'TypeScript']),
      features: faker.lorem.paragraphs(2),
      prerequisites: faker.lorem.paragraphs(1),
      whatYouGet: faker.lorem.paragraphs(2),
      status: 'active',
      publishedAt: new Date(),
      version: '1.0',
      supportIncluded: Math.random() > 0.5,
      supportDuration: Math.random() > 0.5 ? 30 : 60,
      supportEmail: faker.internet.email(),
      featured: Math.random() > 0.7,
    };

    const course = await Course.create(courseData);
    recordedCourses.push(course);

    // Create sections and lessons
    const numSections = Math.floor(Math.random() * 5) + 4; // 4-8 sections
    for (let j = 0; j < numSections; j++) {
      const section = await Section.create({
        sectionId: uuidv4(),
        courseId: course.courseId,
        title: `Section ${j + 1}: ${faker.word.noun()} ${faker.word.adjective()}`,
        description: faker.lorem.sentence(),
        order: j + 1,
        isPublished: true,
        createdBy: teacher.userId
      });

      // Create lessons
      const numLessons = Math.floor(Math.random() * 6) + 3; // 3-8 lessons
      for (let k = 0; k < numLessons; k++) {
        const isPreview = (j === 0 && k === 0) || (j === 0 && k === 1); // First two lessons of first section are preview
        const minutesDuration = Math.floor(Math.random() * 20) + 5; // 5-25 minutes per video
        
        await Lesson.create({
          lessonId: uuidv4(),
          sectionId: section.sectionId,
          title: `Lesson ${k + 1}: ${faker.word.verb()} ${faker.word.noun()}`,
          type: k % 4 === 0 ? 'article' : (k % 4 === 3 ? 'quiz' : 'video'),
          content: faker.lorem.paragraphs(2),
          videoUrl: k % 4 !== 0 && k % 4 !== 3 ? `https://example.com/rec-video${k}.mp4` : null,
          videoDuration: k % 4 !== 0 && k % 4 !== 3 ? minutesDuration : null,
          order: k + 1,
          isPreview,
          isFree: isPreview,
          isPublished: true,
          createdBy: teacher.userId
        });
      }
    }

    console.log(`Created recorded course: ${course.title}`);
  }

  console.log(`Successfully created ${recordedCourses.length} recorded courses`);
  return recordedCourses;
}

/**
 * Create discount codes
 */
async function createDiscountCodes(admin, categories) {
  console.log('Creating discount codes...');

  const discountCodes = [];
  const timestamp = Date.now().toString(36).toUpperCase();
  const discountTypes = [
    {
      name: `NEWUSER_${timestamp}_1`,
      description: 'Welcome discount for new users',
      type: 'percentage',
      value: 15,
      maxAmount: 1000,
      minPurchase: 0,
      applicableType: ['course', 'project'],
      categories: null,
      validity: 180, // 6 months validity
      limit: 1,
      campaign: 'New User Onboarding'
    },
    {
      name: `SUMMER2025_${timestamp}_2`,
      description: 'Summer Sale 2025',
      type: 'percentage',
      value: 25,
      maxAmount: 2000,
      minPurchase: 1000,
      applicableType: ['course'],
      categories: [categories[0].categoryId, categories[1].categoryId],
      validity: 30, // 1 month validity
      limit: 2,
      campaign: 'Summer Sale 2025'
    },
    {
      name: `FLAT500_${timestamp}_3`,
      description: 'Flat ₹500 off on all courses',
      type: 'fixed',
      value: 500,
      maxAmount: null,
      minPurchase: 2000,
      applicableType: ['course'],
      categories: null,
      validity: 45, // 1.5 months validity
      limit: 3,
      campaign: 'Festival Offer'
    },
    {
      name: `WEBDEV40_${timestamp}_4`,
      description: '40% off on Web Development courses',
      type: 'percentage',
      value: 40,
      maxAmount: 3000,
      minPurchase: 0,
      applicableType: ['course'],
      categories: [categories.find(c => c.categoryName === 'Web Development')?.categoryId],
      validity: 60, // 2 months validity
      limit: null, // Unlimited uses
      campaign: 'Web Development Push'
    },
    {
      name: `SPECIALOFFER_${timestamp}_5`,
      description: 'Special offer for returning customers',
      type: 'percentage',
      value: 20,
      maxAmount: 1500,
      minPurchase: 0,
      applicableType: ['course', 'project'],
      categories: null,
      validity: 15, // 15 days validity
      limit: 1,
      campaign: 'Customer Retention'
    }
  ];

  const now = new Date();
  
  for (const discount of discountTypes) {
    const validFrom = new Date(now);
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + discount.validity);

    const discountCode = await DiscountCode.create({
      discountId: uuidv4(),
      code: discount.name,
      description: discount.description,
      discountType: discount.type,
      discountValue: discount.value,
      maxDiscountAmount: discount.maxAmount,
      minimumPurchaseAmount: discount.minPurchase,
      validFrom,
      validUntil,
      usageLimit: discount.limit,
      usageLimitPerUser: 1,
      currentUsage: 0,
      applicableTypes: JSON.stringify(discount.applicableType),
      applicableCategories: discount.categories ? JSON.stringify(discount.categories) : null,
      isActive: true,
      createdBy: admin.userId,
      campaignName: discount.campaign
    });

    discountCodes.push(discountCode);
    console.log(`Created discount code: ${discountCode.code}`);
  }

  console.log(`Successfully created ${discountCodes.length} discount codes`);
  return discountCodes;
}

/**
 * Create cart, wishlist and orders for users
 */
async function createUserEcommerce(students, courses, discountCodes) {
  console.log('Creating user ecommerce data...');

  // Select one student for detailed e-commerce setup
  const mainStudent = students[0];
  console.log(`Setting up e-commerce data for student: ${mainStudent.username} (${mainStudent.email})`);

  // Create wishlist items
  const wishlistCourses = [courses[0], courses[2], courses[5], courses[7]];
  
  for (const course of wishlistCourses) {
    await Wishlist.create({
      wishlistId: uuidv4(),
      userId: mainStudent.userId,
      itemType: 'course',
      itemId: course.courseId
    });
    console.log(`Added ${course.title} to wishlist`);
  }

  // Create cart items
  const cartCourses = [courses[1], courses[4]];
  const discount = discountCodes[0]; // Apply first discount code to cart
  
  for (let i = 0; i < cartCourses.length; i++) {
    const course = cartCourses[i];
    const discountAmount = i === 0 ? 
      (discount.discountType === 'percentage' ? 
        Math.min(course.price * (discount.discountValue / 100), discount.maxDiscountAmount || Infinity) : 
        Math.min(discount.discountValue, course.price)) : 
      0;
    
    await Cart.create({
      cartId: uuidv4(),
      userId: mainStudent.userId,
      itemType: 'course',
      itemId: course.courseId,
      price: course.price,
      discountCode: i === 0 ? discount.code : null,
      discountAmount
    });
    console.log(`Added ${course.title} to cart${i === 0 ? ' with discount' : ''}`);
  }

  // Create completed orders/purchases
  const purchasedCourses = [courses[3], courses[6], courses[8]];
  
  for (let i = 0; i < purchasedCourses.length; i++) {
    const course = purchasedCourses[i];
    const orderDate = new Date();
    orderDate.setDate(orderDate.getDate() - (i * 15) - 5); // Orders at different dates
    
    const discountToApply = i === 1 ? discountCodes[2] : null; // Apply discount to second purchase
    const discountAmount = discountToApply ? 
      (discountToApply.discountType === 'percentage' ? 
        Math.min(course.price * (discountToApply.discountValue / 100), discountToApply.maxDiscountAmount || Infinity) : 
        Math.min(discountToApply.discountValue, course.price)) : 
      0;
    
    const finalPrice = course.price - discountAmount;
    
    // Create order
    const razorpayOrderId = `order_${faker.string.alphanumeric(14)}`;
    const razorpayPaymentId = `pay_${faker.string.alphanumeric(14)}`;
    const razorpaySignature = faker.string.alphanumeric(64);
    
    const order = await Order.create({
      orderId: uuidv4(),
      userId: mainStudent.userId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      totalAmount: finalPrice,
      currency: 'INR',
      status: 'paid',
      paymentMethod: 'razorpay',
      orderItems: JSON.stringify([{
        itemType: 'course',
        itemId: course.courseId,
        price: course.price,
        discount: discountAmount,
        finalPrice
      }]),
      discountCode: discountToApply?.code,
      discountAmount,
      receipt: `rcpt_${faker.string.alphanumeric(8)}`,
      paymentDate: orderDate,
      createdAt: orderDate
    });
    
    // Create enrollment
    await Enrollment.create({
      enrollmentId: uuidv4(),
      userId: mainStudent.userId,
      courseId: course.courseId,
      enrollmentDate: orderDate,
      amountPaid: finalPrice,
      paymentStatus: 'completed',
      completionStatus: i === 0 ? 'in_progress' : 'not_started',
      progressPercentage: i === 0 ? 35 : 0,
      isActive: true,
      enrollmentType: course.type,
      paymentMethod: 'razorpay',
      orderId: order.orderId
    });
    
    console.log(`Created order and enrollment for ${course.title}`);
    
    // If discount was applied, update usage
    if (discountToApply) {
      await DiscountCode.update(
        { currentUsage: sequelize.literal('current_usage + 1') },
        { where: { discountId: discountToApply.discountId } }
      );
      
      await DiscountUsage.create({
        usageId: uuidv4(),
        userId: mainStudent.userId,
        discountId: discountToApply.discountId,
        orderId: order.orderId,
        itemType: 'course',
        itemId: course.courseId,
        originalAmount: course.price,
        discountAmount: discountAmount,
        finalAmount: finalPrice,
        usedDate: orderDate
      });
      
      console.log(`Recorded discount usage for ${discountToApply.code}`);
    }
  }

  // Create some wishlist and cart items for other students
  for (let i = 1; i < 5; i++) {
    const student = students[i];
    
    // Add 1-3 courses to wishlist
    const numWishlist = Math.floor(Math.random() * 3) + 1;
    for (let j = 0; j < numWishlist; j++) {
      const courseIndex = (i + j) % courses.length;
      await Wishlist.create({
        wishlistId: uuidv4(),
        userId: student.userId,
        itemType: 'course',
        itemId: courses[courseIndex].courseId
      });
    }
    
    // Add 0-2 courses to cart
    const numCart = Math.floor(Math.random() * 2);
    for (let j = 0; j < numCart; j++) {
      const courseIndex = (i + j + 3) % courses.length;
      await Cart.create({
        cartId: uuidv4(),
        userId: student.userId,
        itemType: 'course',
        itemId: courses[courseIndex].courseId,
        price: courses[courseIndex].price,
        discountCode: null,
        discountAmount: 0
      });
    }
    
    console.log(`Created wishlist and cart for student ${i}`);
  }

  console.log('Successfully created user e-commerce data');
}

/**
 * Main function to seed the database
 */
async function seedEcommerceData() {
  try {
    console.log('Starting e-commerce data seeding...');
    
    // Get basic data
    const { admin, teachers, students, levels, categories, languages } = await getBasicData();
    
    // Create courses
    const liveCourses = await createLiveCourses(teachers, levels, categories, languages);
    const recordedCourses = await createRecordedCourses(teachers, levels, categories, languages);
    const allCourses = [...liveCourses, ...recordedCourses];
    
    // Create discount codes
    const discountCodes = await createDiscountCodes(admin, categories);
    
    // Create user e-commerce data
    await createUserEcommerce(students, allCourses, discountCodes);
    
    console.log('E-commerce data seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding e-commerce data:', error);
    process.exit(1);
  }
}

// Run the seeder
seedEcommerceData();
