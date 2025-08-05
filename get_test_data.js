import fetch from 'node-fetch';

const API_BASE = 'http://localhost:8080/api';

async function getTestData() {
  try {
    console.log('Getting test data...\n');
    const loginResponse = await fetch(`${API_BASE}/user/userLogin`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            identifier: 'admin@example.com',
            password: 'SecurePassword@123'
        })
    });

    const loginData = await loginResponse.json();
    console.log('Login response status:', loginResponse.status);
    console.log('Login data:', JSON.stringify(loginData, null, 2));
    const TEST_TOKEN = loginData.data?.token;
    // Get courses
    console.log('=== Getting Courses ===');
    const coursesResponse = await fetch(`${API_BASE}/course/getAllCourses?page=1&limit=5`, {
        headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`
        }
    });
    const coursesData = await coursesResponse.json();
    console.log('Courses response status:', coursesResponse.status);
    console.log('Courses data:', JSON.stringify(coursesData, null, 2));
    
    // If we have courses, get sections for the first course
    if (coursesData.success && coursesData.data?.courses?.length > 0) {
      const firstCourse = coursesData.data.courses[0];
      console.log(`\n=== Getting Sections for Course ${firstCourse.courseId} ===`);

      const sectionsResponse = await fetch(`${API_BASE}/section/course/${firstCourse.courseId}`, {
          headers: {
              'Authorization': `Bearer ${TEST_TOKEN}`
          }
      });
      const sectionsData = await sectionsResponse.json();
      console.log('Sections response status:', sectionsResponse.status);
      console.log('Sections data:', JSON.stringify(sectionsData, null, 2));
    }
    
    // Get projects
    console.log('\n=== Getting Projects ===');
    const projectsResponse = await fetch(`${API_BASE}/project/allProjects?page=1&limit=5`, {
        headers: {
            'Authorization': `Bearer ${TEST_TOKEN}`
        }
    });
    const projectsData = await projectsResponse.json();
    console.log('Projects response status:', projectsResponse.status);
    console.log('Projects data:', JSON.stringify(projectsData, null, 2));
    
  } catch (error) {
    console.error('❌ Error getting test data:', error.message);
  }
}

getTestData();
