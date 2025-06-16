import sequelize from '../config/db.js';

const finalizeMigration = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Finalizing course level migration...');
    
    // Check if the old 'level' field still exists
    const tableInfo = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'course_levels'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    const columns = tableInfo.map(col => col.column_name);
    
    if (columns.includes('level')) {
      console.log('Removing old level column...');
      
      // Drop the old level column
      await sequelize.query(
        "ALTER TABLE course_levels DROP COLUMN level",
        { transaction }
      );
      
      console.log('Old level column removed successfully.');
    } else {
      console.log('Old level column already removed.');
    }
    
    // Commit transaction
    await transaction.commit();
    console.log('Course level migration finalization completed successfully!');
    return { success: true, message: 'Migration finalization completed successfully' };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error in course level migration finalization:', error);
    return { success: false, error: error.message };
  }
};

finalizeMigration()
  .then(result => {
    if (result.success) {
      console.log('Finalization succeeded:', result.message);
    } else {
      console.error('Finalization failed:', result.error);
    }
    process.exit(result.success ? 0 : 1);
  })
  .catch(err => {
    console.error('Uncaught error in finalization:', err);
    process.exit(1);
  });
