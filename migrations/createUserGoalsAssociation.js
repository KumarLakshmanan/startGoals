import sequelize from '../config/db.js';

const createUserGoalsAssociation = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting user-goals association migration...');
    
    // Check if user_goals table already exists
    const tables = await sequelize.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_goals'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (tables.length === 0) {
      console.log('Creating user_goals junction table...');
      await sequelize.query(`
        CREATE TABLE user_goals (
          user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          PRIMARY KEY (user_id, goal_id)
        )
      `, { transaction });
    } else {
      console.log('user_goals table already exists');
    }
    
    // Check if goal_id column exists in users table and remove it
    const userColumns = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'goal_id'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (userColumns.length > 0) {
      console.log('Removing goal_id column from users table...');
      await sequelize.query(
        "ALTER TABLE users DROP COLUMN goal_id",
        { transaction }
      );
    } else {
      console.log('goal_id column not found in users table');
    }
    
    await transaction.commit();
    console.log('User-goals association migration completed successfully!');
    return { success: true, message: 'Migration completed successfully' };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error in user-goals association migration:', error);
    return { success: false, error: error.message };
  }
};

export { createUserGoalsAssociation };

// Run the migration if this file is executed directly
if (process.argv[1].includes('createUserGoalsAssociation.js')) {
  createUserGoalsAssociation()
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
