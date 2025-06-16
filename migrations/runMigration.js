import { migrateCourseLevels } from "./updateCourseLevels.js";
import { updateUserLanguagesTable } from "./updateUserLanguagesTable.js";
import { updateUserGoalsTable } from "./updateUserGoalsTable.js";
import { updateUserSkillsTable } from "./updateUserSkillsTable.js";
import { createAllAssociationTables } from "./createAllAssociationTables.js";
import { createRequiredTables } from "../utils/createRequiredTables.js";

const runMigrations = async () => {
  console.log("Starting migrations...");
  
  try {
    // First, create all required tables to ensure they exist
    console.log("Creating or verifying all required tables...");
    const requiredTablesResult = await createRequiredTables();
    if (!requiredTablesResult.success) {
      console.error("Required tables creation failed:", requiredTablesResult.error);
    } else {
      console.log("Required tables created or verified successfully");
    }
    // Run course level migration
    const courseLevelResult = await migrateCourseLevels();
    if (!courseLevelResult.success) {
      console.error("Course level migration failed:", courseLevelResult.error);
    } else {
      console.log("Course level migration completed successfully");
    }
    
    // Run user languages table migration to fix the missing proficiency_level column
    const userLanguagesResult = await updateUserLanguagesTable();
    if (!userLanguagesResult.success) {
      console.error("User languages table migration failed:", userLanguagesResult.error);
    } else {
      console.log("User languages table migration completed successfully");
    }
    
    // Run user goals table migration
    const userGoalsResult = await updateUserGoalsTable();
    if (!userGoalsResult.success) {
      console.error("User goals table migration failed:", userGoalsResult.error);
    } else {
      console.log("User goals table migration completed successfully");
    }
    
    // Run user skills table migration
    const userSkillsResult = await updateUserSkillsTable();
    if (!userSkillsResult.success) {
      console.error("User skills table migration failed:", userSkillsResult.error);
    } else {
      console.log("User skills table migration completed successfully");
    }
    
    // Add more migrations here as needed
    
    console.log("All migrations completed");
  } catch (error) {
    console.error("Migration process failed:", error);
  }
};

// Run all migrations when this file is executed directly
if (process.argv[1].includes("runMigration.js")) {
  runMigrations()
    .then(() => {
      console.log("Migration process finished");
      process.exit(0);
    })
    .catch(err => {
      console.error("Uncaught error in migration process:", err);
      process.exit(1);
    });
}
