import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

/**
 * Migration to add Android and iOS registration IDs to the users table
 */
async function addDeviceRegistrationIds() {
  try {
    console.log("Starting migration: Adding device registration IDs to users table");
    
    // Check if androidRegId column exists
    const [androidRegIdExists] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'users' AND column_name = 'android_reg_id'`
    );
    
    // Check if iosRegId column exists
    const [iosRegIdExists] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns 
       WHERE table_name = 'users' AND column_name = 'ios_reg_id'`
    );
    
    // Add androidRegId column if it doesn't exist
    if (androidRegIdExists.length === 0) {
      console.log("Adding android_reg_id column to users table");
      await sequelize.query(
        `ALTER TABLE users 
         ADD COLUMN android_reg_id VARCHAR(255) NULL,
         ADD COLUMN android_reg_id_updated_at TIMESTAMP NULL`
      );
    } else {
      console.log("android_reg_id column already exists");
    }
    
    // Add iosRegId column if it doesn't exist
    if (iosRegIdExists.length === 0) {
      console.log("Adding ios_reg_id column to users table");
      await sequelize.query(
        `ALTER TABLE users 
         ADD COLUMN ios_reg_id VARCHAR(255) NULL,
         ADD COLUMN ios_reg_id_updated_at TIMESTAMP NULL`
      );
    } else {
      console.log("ios_reg_id column already exists");
    }
    
    console.log("Migration completed successfully: Device registration IDs added to users table");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run the migration
addDeviceRegistrationIds()
  .then(() => {
    console.log("Migration complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
