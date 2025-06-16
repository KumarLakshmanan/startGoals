import fetch from 'node-fetch';

const testSkillAPI = async () => {
  const baseURL = 'http://localhost:3000'; // Adjust if your server runs on a different port
  
  const testSkills = [
    {
      "skillName": "R Programming",
      "category": "Data Science",
      "level": "intermediate",
      "description": "R programming language for statistical computing and graphics"
    },
    {
      "skillName": "Python",
      "category": "Programming",
      "level": "beginner",
      "description": "Python programming language for general-purpose programming"
    },
    {
      "skillName": "Machine Learning",
      "category": "Data Science",
      "level": "advanced",
      "description": "Advanced machine learning techniques and algorithms"
    }
  ];

  try {
    console.log('Testing Skills API...');
    
    // Test bulk upload
    const response = await fetch(`${baseURL}/api/skills/saveAllSkills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed for admin access
        // 'Authorization': 'Bearer your-token'
      },
      body: JSON.stringify(testSkills)
    });

    const result = await response.json();
    console.log('Upload Response:', result);

    if (response.ok) {
      // Test get all skills
      const getAllResponse = await fetch(`${baseURL}/api/skills/getAllSkills`);
      const allSkills = await getAllResponse.json();
      console.log('All Skills:', allSkills);

      // Test get skills by category
      const categoryResponse = await fetch(`${baseURL}/api/skills/getSkillsByCategory/Data Science`);
      const categorySkills = await categoryResponse.json();
      console.log('Data Science Skills:', categorySkills);
    }

  } catch (error) {
    console.error('Error testing API:', error.message);
    console.log('Make sure your server is running on the expected port.');
  }
};

testSkillAPI();
