import sequelize from "../config/db.js";
import { DataTypes } from "sequelize";

/**
 * Migration to update projects table with new fields and relationships
 * Required for the new admin project management UI
 */
export const updateProjectsTable = async () => {
  console.log("Starting migration: Update Projects Table");
  
  try {
    // Add new levelId field
    await sequelize.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS level_id UUID,
      ADD CONSTRAINT fk_project_level FOREIGN KEY (level_id) REFERENCES course_levels(level_id) ON DELETE SET NULL;
    `);
    
    // Change existing columns from JSON to TEXT for rich text
    await sequelize.query(`
      ALTER TABLE projects 
      ALTER COLUMN features TYPE TEXT,
      ALTER COLUMN requirements TYPE TEXT,
      ALTER COLUMN "what_you_get" TYPE TEXT;
    `);
    
    // Add readmeFileUrl column
    await sequelize.query(`
      ALTER TABLE projects 
      ADD COLUMN IF NOT EXISTS readme_file_url TEXT;
    `);
    
    // Create project_goals table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS project_goals (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        goal_id UUID NOT NULL REFERENCES goals(goal_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        created_by UUID REFERENCES users(user_id),
        updated_by UUID REFERENCES users(user_id),
        UNIQUE(project_id, goal_id)
      );
    `);
    
    // Create project_tech_stacks table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS project_tech_stacks (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        skill_id UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        created_by UUID REFERENCES users(user_id),
        updated_by UUID REFERENCES users(user_id),
        UNIQUE(project_id, skill_id)
      );
    `);
    
    // Create project_programming_languages table if it doesn't exist
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS project_programming_languages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
        skill_id UUID NOT NULL REFERENCES skills(skill_id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        created_by UUID REFERENCES users(user_id),
        updated_by UUID REFERENCES users(user_id),
        UNIQUE(project_id, skill_id)
      );
    `);
    
    console.log("Successfully completed migration: Update Projects Table");
    return true;
  } catch (error) {
    console.error("Error in migration: Update Projects Table", error);
    throw error;
  }
};

export default updateProjectsTable;
