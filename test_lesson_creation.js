import fetch from 'node-fetch';

const API_BASE = 'http://localhost:8080/api';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test'; // This would be a real admin token

// Test data
const testLessonData = {
  courseId: 1,
  sectionId: 1,
  title: 'Test Lesson',
  type: 'video',
  content: '<p>This is a test lesson with <strong>HTML content</strong>.</p>',
  duration: 30,
  order: 1,
  isPreview: false
};

async function testLessonCreation() {
  try {
    console.log('Testing lesson creation...');
    
    const response = await fetch(`${API_BASE}/lesson/admin/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify(testLessonData)
    });

    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response body:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Lesson creation successful!');
      return result.data?.lessonId;
    } else {
      console.log('❌ Lesson creation failed');
      return null;
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
    return null;
  }
}

async function testProjectFileManagement() {
  try {
    console.log('\nTesting project file management...');
    
    // Test project file update (metadata only)
    const updateData = {
      fileName: 'updated-test-file.txt',
      description: 'Updated description for test file',
      fileType: 'documentation'
    };

    const response = await fetch(`${API_BASE}/project/1/files/1`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_TOKEN}`
      },
      body: JSON.stringify(updateData)
    });

    const result = await response.json();
    
    console.log('Project file update response status:', response.status);
    console.log('Project file update response:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Project file metadata update successful!');
    } else {
      console.log('❌ Project file update failed');
    }
  } catch (error) {
    console.error('❌ Project file test error:', error.message);
  }
}

// Run tests
async function runTests() {
  console.log('🚀 Starting API tests...\n');
  
  await testLessonCreation();
  await testProjectFileManagement();
  
  console.log('\n🏁 Tests completed!');
}

runTests();
