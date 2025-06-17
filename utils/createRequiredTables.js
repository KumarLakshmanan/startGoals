// Utility to create association tables and missing tables in the database
import sequelize from '../config/db.js';

export const createRequiredTables = async () => {
  const transaction = await sequelize.transaction();
  const logs = [];
  
  try {
    logs.push('Starting creation of required tables...');
    
    // 0. Check and create course_levels table
    logs.push('Checking course_levels table...');
    const courseLevelsTableExists = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_levels'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (courseLevelsTableExists.length === 0) {
      logs.push('Creating course_levels table...');
      await sequelize.query(`
        CREATE TABLE course_levels (
          level_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          level_name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP WITH TIME ZONE
        )
      `, { transaction });
      
      // Insert default levels
      await sequelize.query(`
        INSERT INTO course_levels (level_name, description)
        VALUES 
          ('Beginner', 'For those just starting out'),
          ('Intermediate', 'For those with some experience'),
          ('Advanced', 'For experienced learners')
      `, { transaction });
      
      logs.push('course_levels table created successfully with default levels');
    } else {
      logs.push('course_levels table already exists');
    }
    
    // 0.5 Check and create course_categories table
    logs.push('Checking course_categories table...');
    const courseCategoriesTableExists = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'course_categories'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (courseCategoriesTableExists.length === 0) {
      logs.push('Creating course_categories table...');
      await sequelize.query(`
        CREATE TABLE course_categories (
          category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          category_name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP WITH TIME ZONE
        )
      `, { transaction });
      logs.push('course_categories table created successfully');    } else {
      logs.push('course_categories table already exists');
    }
    
    // 0.75 Check and create languages table
    logs.push('Checking languages table...');
    const languagesTableExists = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'languages'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (languagesTableExists.length === 0) {
      logs.push('Creating languages table...');
      await sequelize.query(`
        CREATE TABLE languages (
          language_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          language VARCHAR(255) NOT NULL UNIQUE,
          language_code VARCHAR(10) NOT NULL UNIQUE,
          native_name VARCHAR(100),
          language_type VARCHAR(20) DEFAULT 'both' CHECK (language_type IN ('user_preference', 'course_language', 'both')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP WITH TIME ZONE
        )
      `, { transaction });
      
      // Insert some common languages
      await sequelize.query(`
        INSERT INTO languages (language, language_code, native_name, language_type)
        VALUES 
          ('English', 'en', 'English', 'both'),
          ('Spanish', 'es', 'Español', 'both'),
          ('French', 'fr', 'Français', 'both'),
          ('German', 'de', 'Deutsch', 'both'),
          ('Chinese', 'zh', '中文', 'both'),
          ('Japanese', 'ja', '日本語', 'both'),
          ('Hindi', 'hi', 'हिन्दी', 'both')
      `, { transaction });
      
      logs.push('languages table created successfully with default languages');
    } else {
      logs.push('languages table already exists');
    }    // 1. Check and create goals table
    logs.push('Checking goals table...');
    const goalsTableExists = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'goals'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (goalsTableExists.length === 0) {
      logs.push('Creating goals table...');
      await sequelize.query(`
        CREATE TABLE goals (
          goal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          goal_name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          level_id UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP WITH TIME ZONE
        )
      `, { transaction });
      logs.push('goals table created successfully');
    } else {
      logs.push('goals table already exists');
    }
    
    // 1.5 Check and create skills table
    logs.push('Checking skills table...');
    const skillsTableExists = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'skills'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (skillsTableExists.length === 0) {
      logs.push('Creating skills table...');
      await sequelize.query(`
        CREATE TABLE skills (
          skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          skill_name VARCHAR(255) NOT NULL,
          description TEXT,
          goal_id UUID,
          category_id UUID,
          level_id UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          deleted_at TIMESTAMP WITH TIME ZONE
        )
      `, { transaction });
      logs.push('skills table created successfully');
    } else {
      logs.push('skills table already exists');
    }
      // 2. Check and create user_languages table
    logs.push('Checking user_languages table...');
    const userLanguagesTableExists = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_languages'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (userLanguagesTableExists.length === 0) {
      logs.push('Creating user_languages table...');
      await sequelize.query(`
        CREATE TABLE user_languages (
          user_id UUID NOT NULL,
          language_id UUID NOT NULL,
          proficiency_level VARCHAR(20) DEFAULT 'intermediate' 
            CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'native')),
          is_primary BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, language_id)
        )
      `, { transaction });
      logs.push('user_languages table created successfully');
    } else {
      logs.push('user_languages table already exists');
      
      // Check columns and add if needed
      const columns = await sequelize.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_languages'",
        { type: sequelize.QueryTypes.SELECT, transaction }
      );
      
      const columnNames = columns.map(col => col.column_name);
      
      if (!columnNames.includes('proficiency_level')) {
        logs.push('Adding proficiency_level column to user_languages...');
        await sequelize.query(
          "ALTER TABLE user_languages ADD COLUMN proficiency_level VARCHAR(20) DEFAULT 'intermediate'",
          { transaction }
        );
        await sequelize.query(
          "ALTER TABLE user_languages ADD CONSTRAINT check_proficiency_level CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'native'))",
          { transaction }
        );
        logs.push('proficiency_level column added to user_languages');
      }
      
      if (!columnNames.includes('is_primary')) {
        logs.push('Adding is_primary column to user_languages...');
        await sequelize.query(
          "ALTER TABLE user_languages ADD COLUMN is_primary BOOLEAN DEFAULT false",
          { transaction }
        );
        logs.push('is_primary column added to user_languages');
      }
    }
      // 3. Check and create user_goals table
    logs.push('Checking user_goals table...');
    const userGoalsTableExists = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_goals'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (userGoalsTableExists.length === 0) {
      logs.push('Creating user_goals table...');
      await sequelize.query(`
        CREATE TABLE user_goals (
          user_id UUID NOT NULL,
          goal_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, goal_id)
        )
      `, { transaction });
      logs.push('user_goals table created successfully');
    } else {
      logs.push('user_goals table already exists');
    }
    
    // 4. Check and create user_skills table
    logs.push('Checking user_skills table...');
    const userSkillsTableExists = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_skills'",
      { type: sequelize.QueryTypes.SELECT, transaction }
    );
    
    if (userSkillsTableExists.length === 0) {
      logs.push('Creating user_skills table...');
      await sequelize.query(`
        CREATE TABLE user_skills (
          user_id UUID NOT NULL,
          skill_id UUID NOT NULL,
          proficiency_level VARCHAR(20) DEFAULT 'intermediate' 
            CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, skill_id)
        )
      `, { transaction });
      logs.push('user_skills table created successfully');
    } else {
      logs.push('user_skills table already exists');
      
      // Check if proficiency_level column exists
      const columns = await sequelize.query(
        "SELECT column_name FROM information_schema.columns WHERE table_name = 'user_skills'",
        { type: sequelize.QueryTypes.SELECT, transaction }
      );
      
      const columnNames = columns.map(col => col.column_name);
      
      if (!columnNames.includes('proficiency_level')) {
        logs.push('Adding proficiency_level column to user_skills...');
        await sequelize.query(
          "ALTER TABLE user_skills ADD COLUMN proficiency_level VARCHAR(20) DEFAULT 'intermediate'",
          { transaction }
        );
        await sequelize.query(
          "ALTER TABLE user_skills ADD CONSTRAINT check_skill_proficiency_level CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert'))",
          { transaction }
        );
        logs.push('proficiency_level column added to user_skills');
      }
    }
    
    await transaction.commit();
    logs.push('All required tables created or verified successfully!');
    return { success: true, message: 'All required tables created or verified successfully', logs };
    
  } catch (error) {
    await transaction.rollback();
    logs.push(`Error creating required tables: ${error.message}`);
    console.error('Error creating required tables:', error);
    return { success: false, error: error.message, logs };
  }
};

// Export a route handler to create tables
export const createTablesHandler = async (req, res) => {
  try {
    const result = await createRequiredTables();
    return res.json(result);
  } catch (error) {
    console.error('Error in createTablesHandler:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create required tables',
      error: error.message
    });
  }
};
