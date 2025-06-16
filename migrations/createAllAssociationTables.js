import sequelize from '../config/db.js';

const createUserLanguagesTable = async (transaction) => {
  try {
    console.log('Checking user_languages table...');
    
    // Check if table exists
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_languages'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (tables.length === 0) {
      console.log('Creating user_languages table...');
      
      // Create the user_languages join table
      await sequelize.query(`
        CREATE TABLE user_languages (
          user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
          language_id UUID NOT NULL REFERENCES languages(language_id) ON DELETE CASCADE,
          proficiency_level VARCHAR(20) DEFAULT 'intermediate' 
            CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'native')),
          is_primary BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, language_id)
        )
      `, { transaction });
      
      console.log('user_languages table created successfully');
    } else {
      console.log('user_languages table already exists');
      
      // Check columns and add if needed
      const columns = await sequelize.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_languages'",
        { type: sequelize.QueryTypes.SELECT, transaction }
      );
      
      const columnNames = columns.map(col => col.column_name);
      
      if (!columnNames.includes('proficiency_level')) {
        console.log('Adding proficiency_level column...');
        await sequelize.query(
          "ALTER TABLE user_languages ADD COLUMN proficiency_level VARCHAR(20) DEFAULT 'intermediate'",
          { transaction }
        );
        await sequelize.query(
          "ALTER TABLE user_languages ADD CONSTRAINT check_proficiency_level CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'native'))",
          { transaction }
        );
      }
      
      if (!columnNames.includes('is_primary')) {
        console.log('Adding is_primary column...');
        await sequelize.query(
          "ALTER TABLE user_languages ADD COLUMN is_primary BOOLEAN DEFAULT false",
          { transaction }
        );
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error handling user_languages table:', error);
    return { success: false, error: error.message };
  }
};

const createUserGoalsTable = async (transaction) => {
  try {
    console.log('Checking user_goals table...');
    
    // Check if table exists
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_goals'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (tables.length === 0) {
      console.log('Creating user_goals table...');
      
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
    
    return { success: true };
  } catch (error) {
    console.error('Error handling user_goals table:', error);
    return { success: false, error: error.message };
  }
};

const createUserSkillsTable = async (transaction) => {
  try {
    console.log('Checking user_skills table...');
    
    // Check if table exists
    const tables = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_skills'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (tables.length === 0) {
      console.log('Creating user_skills table...');
      
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
    
    return { success: true };
  } catch (error) {
    console.error('Error handling user_skills table:', error);
    return { success: false, error: error.message };
  }
};

const createAllAssociationTables = async () => {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting creation of all association tables...');
    
    // Create all three association tables
    const userLanguagesResult = await createUserLanguagesTable(transaction);
    if (!userLanguagesResult.success) throw new Error(userLanguagesResult.error);
    
    const userGoalsResult = await createUserGoalsTable(transaction);
    if (!userGoalsResult.success) throw new Error(userGoalsResult.error);
    
    const userSkillsResult = await createUserSkillsTable(transaction);
    if (!userSkillsResult.success) throw new Error(userSkillsResult.error);
    
    await transaction.commit();
    console.log('All association tables created or verified successfully!');
    return { success: true, message: 'All tables created or verified successfully' };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating association tables:', error);
    return { success: false, error: error.message };
  }
};

// Run migration when script is executed directly
if (process.argv[1].includes('createAllAssociationTables.js')) {
  createAllAssociationTables()
    .then(result => {
      console.log('Migration result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Uncaught error in migration:', err);
      process.exit(1);
    });
}

export { createAllAssociationTables };
