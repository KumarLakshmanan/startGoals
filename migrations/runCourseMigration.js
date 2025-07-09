import enhanceCourseModel from './enhanceCourseModel.js';
import sequelize from '../config/db.js';

/**
 * Run the course model enhancement migration
 */
async function runCourseMigration() {
  try {
    console.log("Starting course model migration...");
    
    // Run the enhancement migration
    const result = await enhanceCourseModel();
    
    if (result) {
      console.log("Course model migration completed successfully!");
    } else {
      console.error("Course model migration failed!");
    }
  } catch (error) {
    console.error("Error running course model migration:", error);
  } finally {
    // Close the database connection
    await sequelize.close();
  }
}

// Run the migration
runCourseMigration();
