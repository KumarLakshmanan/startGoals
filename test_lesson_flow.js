import fetch from 'node-fetch';

const API_BASE = 'http://localhost:8080/api';

async function loginAsAdmin() {
  try {
    const response = await fetch(`${API_BASE}/user/userLogin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'admin@example.com',
        password: 'SecurePassword@123',
      })
    });

    const result = await response.json();
    console.log('Login response status:', response.status);
    console.log('Login data:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      return result.data.token;
    } else {
      console.log('Login failed');
      return null;
    }
  } catch (error) {
    console.error('Login error:', error.message);
    return null;
  }
}

async function testLessonFlow() {
  const token = await loginAsAdmin();
  if (!token) {
    console.log('❌ Could not get admin token');
    return;
  }

  console.log('✅ Got admin token, proceeding with tests...\n');

  try {
    // Get courses to find a real course ID
    console.log('=== Getting Courses ===');
    const coursesResponse = await fetch(`${API_BASE}/course/getAllCourses?page=1&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const coursesData = await coursesResponse.json();
    console.log('Courses response status:', coursesResponse.status);
    
    if (!coursesData.success || !coursesData.data?.courses?.length) {
      console.log('❌ No courses found');
      return;
    }

    const courseId = coursesData.data.courses[0].courseId;
    console.log('✅ Using course ID:', courseId);

    // Get sections for this course
    console.log('\n=== Getting Sections ===');
    const sectionsResponse = await fetch(`${API_BASE}/section/getSectionsByCourseId/${courseId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const sectionsData = await sectionsResponse.json();
    console.log('Sections response status:', sectionsResponse.status);
    console.log('Sections data:', JSON.stringify(sectionsData, null, 2));

    if (!sectionsData.success || !sectionsData.data?.sections?.length) {
      console.log('❌ No sections found, creating one...');
      
      // Create a section first
      const newSectionResponse = await fetch(`${API_BASE}/section/admin/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          courseId: courseId,
          title: 'Test Section for Lesson Creation',
          description: 'This is a test section for lesson creation',
          order: 1
        })
      });

      const newSectionData = await newSectionResponse.json();
      console.log('New section response status:', newSectionResponse.status);
      console.log('New section data:', JSON.stringify(newSectionData, null, 2));

      if (!newSectionData.success) {
        console.log('❌ Could not create section');
        return;
      }

      var sectionId = newSectionData.data.sectionId;
    } else {
      var sectionId = sectionsData.data.sections[0].sectionId;
    }

    console.log('✅ Using section ID:', sectionId);

    // Now test lesson creation
    console.log('\n=== Testing Lesson Creation ===');
    const lessonData = {
      courseId: courseId,
      sectionId: sectionId,
      title: 'Test Lesson with Rich Content',
      type: 'video',
      content: '<p>This is a <strong>rich text</strong> lesson with <em>HTML content</em>.</p><ul><li>Point 1</li><li>Point 2</li></ul>',
      duration: 30,
      order: 1,
      isPreview: false
    };

    const lessonResponse = await fetch(`${API_BASE}/lesson/admin/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(lessonData)
    });

    const lessonResult = await lessonResponse.json();
    console.log('Lesson creation response status:', lessonResponse.status);
    console.log('Lesson creation response:', JSON.stringify(lessonResult, null, 2));

    if (lessonResult.success) {
      console.log('✅ Lesson creation successful!');
      
      const lessonId = lessonResult.data.lessonId;
      
      // Test lesson update
      console.log('\n=== Testing Lesson Update ===');
      const updateData = {
        title: 'Updated Test Lesson Title',
        content: '<p>This is <strong>updated content</strong> with more <em>rich formatting</em>.</p><h2>New Section</h2><p>More content here.</p>'
      };

      const updateResponse = await fetch(`${API_BASE}/lesson/admin/${lessonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      const updateResult = await updateResponse.json();
      console.log('Lesson update response status:', updateResponse.status);
      console.log('Lesson update response:', JSON.stringify(updateResult, null, 2));

      if (updateResult.success) {
        console.log('✅ Lesson update successful!');
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testLessonFlow();
