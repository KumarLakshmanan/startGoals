import sequelize from '../config/db.js';

const checkCourseLevels = async () => {
  try {
    const levels = await sequelize.query(
      "SELECT level_id, level, name, \"order\", description FROM course_levels ORDER BY \"order\"",
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('Existing Course Levels:');
    if (levels.length === 0) {
      console.log('No course levels found.');
    } else {
      levels.forEach(level => {
        console.log(`- ID: ${level.level_id}, Level: ${level.level}, Name: ${level.name}, Order: ${level.order}`);
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error checking course levels:', error);
    process.exit(1);
  }
};

checkCourseLevels();
