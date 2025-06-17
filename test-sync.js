import { syncModels, getModels } from './config/manualSyncDb.js';

async function testSync() {
  try {
    console.log('Testing manual sync...');
    
    // Get all models
    const models = await getModels();
    console.log(`Found ${models.length} models`);
      // Test with more models including dependent ones
    const testModels = models.filter(model => 
      ['user', 'language', 'courseCategory', 'courseLevel', 'Banner', 'Settings', 'goal', 'Course', 'skill'].includes(model.name)
    );
    
    console.log('Testing sync with models:', testModels.map(m => m.name));
    
    const result = await syncModels(testModels, {
      force: false,
      alter: false,
      safeMode: true
    });
    
    console.log('Sync result:', result);
  } catch (error) {
    console.error('Error:', error);
  }
}

testSync();
