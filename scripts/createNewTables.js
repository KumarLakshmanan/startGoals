import sequelize from '../config/db.js';

async function createNewTables() {
  try {
    console.log('Creating new language and instructor association tables...');
    
    // Create course_languages table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "course_languages" (
        "course_language_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "course_id" UUID NOT NULL REFERENCES "courses"("course_id") ON DELETE CASCADE,
        "language_id" UUID NOT NULL REFERENCES "languages"("language_id") ON DELETE CASCADE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        UNIQUE("course_id", "language_id")
      );
    `);
    console.log('✅ Created course_languages table');
    
    // Create project_languages table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "project_languages" (
        "project_language_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" UUID NOT NULL REFERENCES "projects"("project_id") ON DELETE CASCADE,
        "language_id" UUID NOT NULL REFERENCES "languages"("language_id") ON DELETE CASCADE,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        UNIQUE("project_id", "language_id")
      );
    `);
    console.log('✅ Created project_languages table');
    
    // Create course_instructors table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "course_instructors" (
        "course_instructor_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "course_id" UUID NOT NULL REFERENCES "courses"("course_id") ON DELETE CASCADE,
        "instructor_id" UUID NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
        "is_primary" BOOLEAN DEFAULT FALSE,
        "assigned_by" UUID NOT NULL REFERENCES "users"("user_id"),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        UNIQUE("course_id", "instructor_id")
      );
    `);
    console.log('✅ Created course_instructors table');
    
    // Create project_instructors table
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "project_instructors" (
        "project_instructor_id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "project_id" UUID NOT NULL REFERENCES "projects"("project_id") ON DELETE CASCADE,
        "instructor_id" UUID NOT NULL REFERENCES "users"("user_id") ON DELETE CASCADE,
        "is_primary" BOOLEAN DEFAULT FALSE,
        "assigned_by" UUID NOT NULL REFERENCES "users"("user_id"),
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        "deleted_at" TIMESTAMP WITH TIME ZONE,
        UNIQUE("project_id", "instructor_id")
      );
    `);
    console.log('✅ Created project_instructors table');
    
    console.log('\n🎉 All new tables created successfully!');
    
  } catch (error) {
    console.error('❌ Failed to create tables:', error);
  } finally {
    await sequelize.close();
  }
}

createNewTables();
