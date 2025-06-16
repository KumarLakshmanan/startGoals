import sequelize from '../config/db.js';

const updateSkillsTable = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting skills table migration...');
    
    // Check current table structure
    const tableInfo = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'skills'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    const columns = tableInfo.map(col => col.column_name);
    console.log('Current columns:', columns);
    
    // Add category column if it doesn't exist
    if (!columns.includes('category')) {
      console.log('Adding category column...');
      await sequelize.query(
        "ALTER TABLE skills ADD COLUMN category VARCHAR(100)",
        { transaction }
      );
    }
    
    // Add level column if it doesn't exist
    if (!columns.includes('level')) {
      console.log('Adding level column...');
      await sequelize.query(
        "ALTER TABLE skills ADD COLUMN level VARCHAR(50)",
        { transaction }
      );
    }
    
    // Add description column if it doesn't exist
    if (!columns.includes('description')) {
      console.log('Adding description column...');
      await sequelize.query(
        "ALTER TABLE skills ADD COLUMN description TEXT",
        { transaction }
      );
    }
    
    // Update goalId to be nullable
    console.log('Making goal_id nullable...');
    await sequelize.query(
      "ALTER TABLE skills ALTER COLUMN goal_id DROP NOT NULL",
      { transaction }
    );
    
    // Update foreign key constraint to SET NULL on delete
    console.log('Updating foreign key constraint...');
    await sequelize.query(
      "ALTER TABLE skills DROP CONSTRAINT IF EXISTS skills_goal_id_fkey",
      { transaction }
    );
    
    await sequelize.query(
      "ALTER TABLE skills ADD CONSTRAINT skills_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES goals(goal_id) ON DELETE SET NULL ON UPDATE CASCADE",
      { transaction }
    );
    
    await transaction.commit();
    console.log('Skills table migration completed successfully!');
    return { success: true, message: 'Migration completed successfully' };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error in skills table migration:', error);
    return { success: false, error: error.message };
  }
};

export { updateSkillsTable };

// Run the migration if this file is executed directly
if (process.argv[1].includes('updateSkillsTable.js')) {
  updateSkillsTable()
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
