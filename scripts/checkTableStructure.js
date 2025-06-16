import sequelize from '../config/db.js';

const checkTableStructure = async () => {
  try {
    const columns = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'course_levels' ORDER BY ordinal_position",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('Course Levels Table Structure:');
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking table structure:', error);
    process.exit(1);
  }
};

checkTableStructure();
