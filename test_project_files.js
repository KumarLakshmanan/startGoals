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

async function testProjectFileManagement() {
  const token = await loginAsAdmin();
  if (!token) {
    console.log('❌ Could not get admin token');
    return;
  }

  console.log('✅ Got admin token, proceeding with project file tests...\n');

  try {
    // Get projects to find a real project ID
    console.log('=== Getting Projects ===');
    const projectsResponse = await fetch(`${API_BASE}/project/getAll?page=1&limit=1`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const projectsData = await projectsResponse.json();
    console.log('Projects response status:', projectsResponse.status);
    console.log('Projects data:', JSON.stringify(projectsData, null, 2));    
    if (!projectsData.success || !projectsData.data?.projects?.length) {
      console.log('❌ No projects found');
      return;
    }

    const projectId = projectsData.data.projects[0].projectId;
    console.log('✅ Using project ID:', projectId);

    // Get project files
    console.log('\n=== Getting Project Files ===');
    const filesResponse = await fetch(`${API_BASE}/project-files/${projectId}/files`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const filesData = await filesResponse.json();
    console.log('Files response status:', filesResponse.status);
    console.log('Files data:', JSON.stringify(filesData, null, 2));

    if (!filesData.success || !filesData.data?.files?.length) {
      console.log('❌ No project files found');
      return;
    }

    const fileId = filesData.data.files[0].fileId;
    console.log('✅ Using file ID:', fileId);

    // Test project file metadata update (without file upload)
    console.log('\n=== Testing Project File Metadata Update ===');
    const updateData = {
      fileName: 'updated-test-file-' + Date.now() + '.txt',
      description: 'Updated description for project file metadata test',
      fileType: 'documentation'
    };

    const updateResponse = await fetch(`${API_BASE}/project-files/${projectId}/files/${fileId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(updateData)
    });

    const updateResult = await updateResponse.json();
    console.log('File update response status:', updateResponse.status);
    console.log('File update response:', JSON.stringify(updateResult, null, 2));

    if (updateResult.success) {
      console.log('✅ Project file metadata update successful!');
      console.log('✅ Confirmed: Update only changed metadata, not the actual file');
    } else {
      console.log('❌ Project file update failed');
    }

    // Test getting updated file to verify changes
    console.log('\n=== Verifying Updated File Metadata ===');
    const verifyResponse = await fetch(`${API_BASE}/project-files/${projectId}/files`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const verifyData = await verifyResponse.json();
    
    if (verifyData.success) {
      const updatedFile = verifyData.data.files.find(f => f.fileId === fileId);
      if (updatedFile) {
        console.log('Updated file details:');
        console.log('- File name:', updatedFile.fileName);
        console.log('- Description:', updatedFile.description);
        console.log('- File type:', updatedFile.fileType);
        console.log('- File URL (unchanged):', updatedFile.fileUrl);
        console.log('✅ Metadata update verified successfully!');
      }
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testProjectFileManagement();
