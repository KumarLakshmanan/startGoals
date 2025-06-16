import sequelize from '../config/db.js';

const updateUserSkillsTable = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting user_skills table migration...');
    
    // Check if table exists
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_skills'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (tables.length === 0) {
      console.log('The user_skills table does not exist, creating it...');
      
      // Create the user_skills join table
      await sequelize.query(`
        CREATE TABLE user_skills (
          user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          skill_id UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
          proficiency_level VARCHAR(20) DEFAULT 'intermediate' 
            CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, skill_id)
        )
      `, { transaction });
      
      console.log('user_skills table created successfully');
    } else {
      console.log('user_skills table already exists');
      
      // Check if proficiency_level column exists
      const columns = await sequelize.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_skills'",
        { type: sequelize.QueryTypes.SELECT, transaction }
      );
      
      const columnNames = columns.map(col => col.column_name);
      console.log('Current columns:', columnNames);
      
      // Add proficiency_level column if it doesn't exist
      if (!columnNames.includes('proficiency_level')) {
        console.log('Adding proficiency_level column to user_skills...');
        
        await sequelize.query(
          "ALTER TABLE user_skills ADD COLUMN proficiency_level VARCHAR(20) DEFAULT 'intermediate'",
          { transaction }
        );
        
        await sequelize.query(
          "ALTER TABLE user_skills ADD CONSTRAINT check_skill_proficiency_level CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert'))",
          { transaction }
        );
        
        console.log('proficiency_level column added successfully');
      }
    }
    
    await transaction.commit();
    console.log('User skills table migration completed successfully!');
    return { success: true, message: 'Migration completed successfully' };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating user_skills table:', error);
    return { success: false, error: error.message };
  }
};

// Run migration when script is executed directly
if (process.argv[1].includes('updateUserSkillsTable.js')) {
  updateUserSkillsTable()
    .then(result => {
      console.log('Migration result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Uncaught error in migration:', err);
      process.exit(1);
    });
}

export { updateUserSkillsTable };
