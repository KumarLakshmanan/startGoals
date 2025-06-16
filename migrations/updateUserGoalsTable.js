import sequelize from '../config/db.js';

const updateUserGoalsTable = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting user_goals table migration...');
    
    // Check if table exists
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_goals'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (tables.length === 0) {
      console.log('The user_goals table does not exist, creating it...');
      
      // Create the user_goals join table
      await sequelize.query(`
        CREATE TABLE user_goals (
          user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, goal_id)
        )
      `, { transaction });
      
      console.log('user_goals table created successfully');
    } else {
      console.log('user_goals table already exists');
    }
    
    await transaction.commit();
    console.log('User goals table migration completed successfully!');
    return { success: true, message: 'Migration completed successfully' };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating user_goals table:', error);
    return { success: false, error: error.message };
  }
};

// Run migration when script is executed directly
if (process.argv[1].includes('updateUserGoalsTable.js')) {
  updateUserGoalsTable()
    .then(result => {
      console.log('Migration result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Uncaught error in migration:', err);
      process.exit(1);
    });
}

export { updateUserGoalsTable };
