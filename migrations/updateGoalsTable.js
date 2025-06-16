import sequelize from '../config/db.js';

const updateGoalsTable = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting goals table migration...');
    
    // Check current table structure
    const tableInfo = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'goals'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    const columns = tableInfo.map(col => col.column_name);
    console.log('Current columns:', columns);
    
    // Add level_id column if it doesn't exist
    if (!columns.includes('level_id')) {
      console.log('Adding level_id column...');
      await sequelize.query(
        "ALTER TABLE goals ADD COLUMN level_id UUID",
        { transaction }
      );
      
      // Add foreign key constraint
      await sequelize.query(
        "ALTER TABLE goals ADD CONSTRAINT goals_level_id_fkey FOREIGN KEY (level_id) REFERENCES course_levels(level_id) ON DELETE SET NULL ON UPDATE CASCADE",
        { transaction }
      );
    } else {
      console.log('level_id column already exists');
    }
    
    await transaction.commit();
    console.log('Goals table migration completed successfully!');
    return { success: true, message: 'Migration completed successfully' };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error in goals table migration:', error);
    return { success: false, error: error.message };
  }
};

export { updateGoalsTable };

// Run the migration if this file is executed directly
if (process.argv[1].includes('updateGoalsTable.js')) {
  updateGoalsTable()
    .then(result => {
      if (result.success) {
        console.log('Migration succeeded:', result.message);
      } else {
        console.error('Migration failed:', result.error);
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Uncaught error in migration:', err);
      process.exit(1);
    });
}
