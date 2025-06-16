import sequelize from '../config/db.js';

const updateLanguagesTable = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting languages table migration...');
    
    // Check current table structure
    const tableInfo = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'languages'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    const columns = tableInfo.map(col => col.column_name);
    console.log('Current columns:', columns);
    
    // Add nativeName column if it doesn't exist
    if (!columns.includes('native_name')) {
      console.log('Adding native_name column...');
      await sequelize.query(
        "ALTER TABLE languages ADD COLUMN native_name VARCHAR(255)",
        { transaction }
      );
    } else {
      console.log('native_name column already exists');
    }
    
    await transaction.commit();
    console.log('Languages table migration completed successfully!');
    return { success: true, message: 'Migration completed successfully' };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error in languages table migration:', error);
    return { success: false, error: error.message };
  }
};

export { updateLanguagesTable };

// Run the migration if this file is executed directly
if (process.argv[1].includes('updateLanguagesTable.js')) {
  updateLanguagesTable()
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
