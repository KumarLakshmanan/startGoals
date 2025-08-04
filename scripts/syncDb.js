import sequelize from '../config/db.js';
import '../model/associations.js'; // Import all models and associations

async function syncDatabase() {
  try {
    console.log('Starting database synchronization...');
    
    // Sync all models - create tables if they don't exist
    await sequelize.sync({ alter: true });
    
    console.log('✅ Database synchronized successfully!');
    
    // List all created tables
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    
    const [tables] = await sequelize.query(query);
    console.log('\n📋 Tables in database:');
    tables.forEach((table, index) => {
      console.log(`${index + 1}. ${table.table_name}`);
    });
    
  } catch (error) {
    console.error('❌ Database synchronization failed:', error);
  } finally {
    await sequelize.close();
  }
}

syncDatabase();
