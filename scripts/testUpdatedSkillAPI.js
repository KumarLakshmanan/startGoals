import fetch from 'node-fetch';

const testUpdatedSkillAPI = async () => {
  const baseURL = 'http://localhost:3000'; // Adjust if your server runs on a different port
  
  try {
    console.log('Testing Updated Skills API...');
    
    // Test 1: Get skill options (categories, levels, goals)
    console.log('\n1. Testing GET /api/skills/options');
    const optionsResponse = await fetch(`${baseURL}/api/skills/options`);
    const options = await optionsResponse.json();
    console.log('Skill Options:', JSON.stringify(options, null, 2));

    if (options.status && options.data.categories.length > 0 && options.data.levels.length > 0) {
      // Test 2: Upload skills with category and level names
      const testSkills = [
        {
          "skillName": "Advanced Python Programming",
          "category": options.data.categories[0].categoryName, // Use first available category
          "level": options.data.levels[0].name, // Use first available level
          "description": "Advanced concepts in Python programming including decorators, generators, and async programming"
        },
        {
          "skillName": "Data Structures and Algorithms",
          "category": options.data.categories[0].categoryName,
          "level": options.data.levels.length > 1 ? options.data.levels[1].name : options.data.levels[0].name,
          "description": "Fundamental data structures and algorithmic problem solving"
        }
      ];

      console.log('\n2. Testing POST /api/skills/saveAllSkills');
      console.log('Test Skills:', JSON.stringify(testSkills, null, 2));
      
      const uploadResponse = await fetch(`${baseURL}/api/skills/saveAllSkills`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers if needed for admin access
          // 'Authorization': 'Bearer your-admin-token'
        },
        body: JSON.stringify(testSkills)
      });

      const uploadResult = await uploadResponse.json();
      console.log('Upload Response:', JSON.stringify(uploadResult, null, 2));

      // Test 3: Get all skills with new structure
      console.log('\n3. Testing GET /api/skills/getAllSkills');
      const allSkillsResponse = await fetch(`${baseURL}/api/skills/getAllSkills`);
      const allSkills = await allSkillsResponse.json();
      console.log('All Skills (showing first 2):');
      if (allSkills.data && allSkills.data.length > 0) {
        console.log(JSON.stringify(allSkills.data.slice(0, 2), null, 2));
      }

      // Test 4: Get skills by category ID
      if (options.data.categories.length > 0) {
        const categoryId = options.data.categories[0].categoryId;
        console.log(`\n4. Testing GET /api/skills/getSkillsByCategory/${categoryId}`);
        const categorySkillsResponse = await fetch(`${baseURL}/api/skills/getSkillsByCategory/${categoryId}`);
        const categorySkills = await categorySkillsResponse.json();
        console.log('Skills by Category:', JSON.stringify(categorySkills, null, 2));
      }
    } else {
      console.log('No categories or levels found. Please ensure you have categories and levels in your database.');
    }

  } catch (error) {
    console.error('Error testing API:', error.message);
    console.log('Make sure your server is running and you have the required database entries.');
  }
};

testUpdatedSkillAPI();
