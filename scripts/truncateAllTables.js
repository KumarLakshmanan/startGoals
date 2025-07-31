// Comprehensive clear script - truncates all tables for fresh seeding
import sequelize from '../config/db.js';

async function truncateAllTables() {
  try {
    console.log('🧹 Truncating all tables for fresh seeding...');
    
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Get all table names from PostgreSQL
    const [results] = await sequelize.query(`
      SELECT tablename as table_name
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'Sequelize%'
    `);
    
    console.log(`📋 Found ${results.length} tables to truncate`);
    
    // Truncate each table with CASCADE to handle foreign keys
    for (const row of results) {
      const tableName = row.table_name;
      try {
        await sequelize.query(`TRUNCATE TABLE "${tableName}" CASCADE`, { raw: true });
        console.log(`✅ Truncated table: ${tableName}`);
      } catch (error) {
        console.log(`⚠️  Could not truncate ${tableName}:`, error.message);
      }
    }
    
    console.log('✅ All tables truncated successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error truncating tables:', error.message);
    process.exit(1);
  }
}

truncateAllTables();
