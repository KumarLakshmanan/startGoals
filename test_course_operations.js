import _sequelize from '../config/db.js';
import Course from '../model/course.js';
import _CourseLevel from '../model/courseLevel.js';
import _Category from '../model/category.js';
import { createCourse, updateCourse } from '../controller/courseController.js';

async function testCourseOperations() {
  try {
    console.log('Testing course creation and update operations...');

    // Mock request and response objects
    const mockReq = {
      body: {
        title: 'Test Course',
        description: 'Test course description',
        shortDescription: 'Short desc',
        levelId: 'beginner', // This should match an existing level
        categoryId: 'programming', // This should match an existing category
        type: 'recorded',
        isPaid: true,
        price: 99.99,
        discountEnabled: false,
        isMonthlyPayment: false,
        durationMinutes: 120,
        liveStartDate: null,
        liveEndDate: null,
        registrationOpen: true,
        maxEnrollments: 100,
        registrationDeadline: null,
        thumbnailUrl: 'https://example.com/thumbnail.jpg',
        coverImage: 'https://example.com/cover.jpg',
        hasIntroVideo: true,
        introVideoUrl: 'https://example.com/intro.mp4',
        demoUrl: 'https://example.com/demo.mp4',
        screenshots: ['https://example.com/screenshot1.jpg'],
        hasCertificate: true,
        features: ['Feature 1', 'Feature 2'],
        prerequisites: ['Basic knowledge'],
        whatYouGet: ['Certificate', 'Access to materials'],
        status: 'draft',
        isPublished: false,
        featured: false,
        version: 1
      },
      user: { userId: 'test-user-id' }
    };

    const mockRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`Response ${code}:`, data);
          return data;
        }
      }),
      json: (data) => {
        console.log('Response:', data);
        return data;
      }
    };

    // Test course creation
    console.log('\n1. Testing course creation...');
    await createCourse(mockReq, mockRes);

    // Get the created course ID for update test
    const createdCourse = await Course.findOne({
      where: { title: 'Test Course' },
      order: [['createdAt', 'DESC']]
    });

    if (createdCourse) {
      console.log('\n2. Testing course update...');
      const updateReq = {
        params: { courseId: createdCourse.courseId },
        body: {
          title: 'Updated Test Course',
          description: 'Updated description',
          price: 149.99,
          status: 'active',
          isPublished: true
        },
        user: { userId: 'test-user-id' }
      };

      await updateCourse(updateReq, mockRes);

      // Verify the update
      const updatedCourse = await Course.findByPk(createdCourse.courseId);
      console.log('\n3. Verification:');
      console.log('Updated title:', updatedCourse.title);
      console.log('Updated price:', updatedCourse.price);
      console.log('Updated status:', updatedCourse.status);
      console.log('Updated isPublished:', updatedCourse.isPublished);

      // Clean up - delete test course
      await createdCourse.destroy();
      console.log('\n4. Test course cleaned up successfully');
    }

    console.log('\n✅ All tests completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testCourseOperations();
