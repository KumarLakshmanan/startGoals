import sequelize from '../config/db.js';

const checkGoalTables = async () => {
  try {
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE '%goal%' ORDER BY table_name",
      { type: sequelize.QueryTypes.SELECT }
    );
      console.log('Goal-related tables:');
    tables.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    // Also check all tables to see what's available
    const allTables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('\nAll tables:');
    allTables.forEach(table => {
      console.log(`- ${table.table_name}`);
    });
    
    // Check if user_goals table exists
    const userGoalsExists = allTables.some(table => table.table_name === 'user_goals');
    console.log(`\nuser_goals table exists: ${userGoalsExists}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking tables:', error);
    process.exit(1);
  }
};

checkGoalTables();
