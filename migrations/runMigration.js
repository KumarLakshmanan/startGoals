// filepath: d:\nodejs\startGoals\migrations\runMigration.js
import { migrateCourseLevels } from "./updateCourseLevels.js";

const runMigrations = async () => {
  console.log("Starting migrations...");
  
  try {
    // Run course level migration
    const courseLevelResult = await migrateCourseLevels();
    if (!courseLevelResult.success) {
      console.error("Course level migration failed:", courseLevelResult.error);
    } else {
      console.log("Course level migration completed successfully");
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
