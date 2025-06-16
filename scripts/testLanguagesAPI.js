import fetch from 'node-fetch';

const testLanguageAPI = async () => {
  const baseURL = 'http://localhost:3000'; // Adjust if your server runs on a different port
  
  const testData = {
    "languages": [
      {
        "language": "French",
        "languageCode": "fr",
        "nativeName": "Français"
      },
      {
        "language": "German",
        "languageCode": "de",
        "nativeName": "Deutsch"
      },
      {
        "language": "Italian",
        "languageCode": "it",
        "nativeName": "Italiano"
      }
    ],
    "options": {
      "skipDuplicates": true,
      "updateExisting": false,
      "validateAll": true
    }
  };

  try {
    console.log('Testing Languages API...');
    console.log('Test data:', JSON.stringify(testData, null, 2));
    
    // Test bulk upload
    const response = await fetch(`${baseURL}/api/languages/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth headers if needed for admin access
        // 'Authorization': 'Bearer your-token'
      },
      body: JSON.stringify(testData)
    });

    const result = await response.json();
    console.log('Upload Response:', JSON.stringify(result, null, 2));

    if (response.ok) {
      // Test get all languages
      const getAllResponse = await fetch(`${baseURL}/api/languages`);
      const allLanguages = await getAllResponse.json();
      console.log('All Languages:', JSON.stringify(allLanguages, null, 2));
    }

  } catch (error) {
    console.error('Error testing API:', error.message);
    console.log('Make sure your server is running on the expected port.');
  }
};

testLanguageAPI();
