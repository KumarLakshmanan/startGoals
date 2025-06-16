import sequelize from '../config/db.js';

const updateUserLanguagesTable = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting user_languages table migration...');
    
    // Check if table exists
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_languages'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (tables.length === 0) {
      console.log('The user_languages table does not exist!');
      await transaction.rollback();
      return { success: false, message: 'Table does not exist' };
    }
    
    // Check current table structure
    const columns = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_languages'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    const columnNames = columns.map(col => col.column_name);
    console.log('Current columns:', columnNames);
    
    // Add proficiency_level column if it doesn't exist
    if (!columnNames.includes('proficiency_level')) {
      console.log('Adding proficiency_level column...');
      
      try {
        // Add the column directly with type and default
        await sequelize.query(
          "ALTER TABLE user_languages ADD COLUMN proficiency_level VARCHAR(20) DEFAULT 'intermediate'",
          { transaction }
        );
        
        // Add constraint to check valid values
        await sequelize.query(
          "ALTER TABLE user_languages ADD CONSTRAINT check_proficiency_level CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'native'))",
          { transaction }
        );
        
        console.log('proficiency_level column added successfully');
      } catch (err) {
        console.error('Error adding proficiency_level column:', err);
        throw err;
      }
    } else {
      console.log('proficiency_level column already exists');
    }
    
    // Add is_primary column if it doesn't exist
    if (!columnNames.includes('is_primary')) {
      console.log('Adding is_primary column...');
      
      try {
        await sequelize.query(
          "ALTER TABLE user_languages ADD COLUMN is_primary BOOLEAN DEFAULT false",
          { transaction }
        );
        
        console.log('is_primary column added successfully');
      } catch (err) {
        console.error('Error adding is_primary column:', err);
        throw err;
      }
    } else {
      console.log('is_primary column already exists');
    }
    
    await transaction.commit();
    console.log('User languages table migration completed successfully!');
    return { success: true, message: 'Migration completed successfully' };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating user_languages table:', error);
    return { success: false, error: error.message };
  }
};

// Run migration when script is executed directly
if (process.argv[1].includes('updateUserLanguagesTable.js')) {
  updateUserLanguagesTable()
    .then(result => {
      console.log('Migration result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Uncaught error in migration:', err);
      process.exit(1);
    });
}

export { updateUserLanguagesTable };
