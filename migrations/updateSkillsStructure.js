import sequelize from '../config/db.js';

const updateSkillsTableStructure = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting skills table structure migration...');
    
    // Check current table structure
    const tableInfo = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'skills'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    const columns = tableInfo.map(col => col.column_name);
    console.log('Current columns:', columns);
    
    // Add category_id column if it doesn't exist
    if (!columns.includes('category_id')) {
      console.log('Adding category_id column...');
      await sequelize.query(
        "ALTER TABLE skills ADD COLUMN category_id UUID",
        { transaction }
      );
      
      // Add foreign key constraint
      await sequelize.query(
        "ALTER TABLE skills ADD CONSTRAINT skills_category_id_fkey FOREIGN KEY (category_id) REFERENCES course_categories(category_id) ON DELETE SET NULL ON UPDATE CASCADE",
        { transaction }
      );
    }
    
    // Add level_id column if it doesn't exist
    if (!columns.includes('level_id')) {
      console.log('Adding level_id column...');
      await sequelize.query(
        "ALTER TABLE skills ADD COLUMN level_id UUID",
        { transaction }
      );
      
      // Add foreign key constraint
      await sequelize.query(
        "ALTER TABLE skills ADD CONSTRAINT skills_level_id_fkey FOREIGN KEY (level_id) REFERENCES course_levels(level_id) ON DELETE SET NULL ON UPDATE CASCADE",
        { transaction }
      );
    }
    
    // Remove old category and level string columns if they exist
    if (columns.includes('category')) {
      console.log('Removing old category column...');
      await sequelize.query(
        "ALTER TABLE skills DROP COLUMN category",
        { transaction }
      );
    }
    
    if (columns.includes('level')) {
      console.log('Removing old level column...');
      await sequelize.query(
        "ALTER TABLE skills DROP COLUMN level",
        { transaction }
      );
    }
    
    await transaction.commit();
    console.log('Skills table structure migration completed successfully!');
    return { success: true, message: 'Migration completed successfully' };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error in skills table structure migration:', error);
    return { success: false, error: error.message };
  }
};

export { updateSkillsTableStructure };

// Run the migration if this file is executed directly
if (process.argv[1].includes('updateSkillsStructure.js')) {
  updateSkillsTableStructure()
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
