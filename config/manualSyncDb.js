import { sequelize } from "../model/assosiation.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all models from Sequelize
export const getModels = async () => {
  const models = [];

  for (const modelName in sequelize.models) {
    const model = sequelize.models[modelName];
    const attributes = model.rawAttributes;

    const fields = [];
    for (const fieldName in attributes) {
      const field = attributes[fieldName];
      fields.push({
        name: fieldName,
        type: field.type.toString(),
        allowNull: field.allowNull !== false, // Default to true if not specified
        primaryKey: field.primaryKey === true,
        unique: field.unique === true,
        defaultValue:
          field.defaultValue !== undefined ? field.defaultValue : null,
        references: field.references
          ? {
            model: field.references.model,
            key: field.references.key,
          }
          : null,
      });
    }

    models.push({
      name: modelName,
      tableName: model.tableName,
      fields: fields,
    });
  }

  return models;
};

// Sort models based on dependencies (references)
const sortModelsByDependencies = (modelsArray) => {
  // Define the proper order based on association.js file
  // This order follows the exact sequence defined in the models object in association.js
  const modelCreationOrder = [
    // Base models with no dependencies first
    'user',           // Base user model - MUST be first (lowercase!)
    'language',       // Base language model (lowercase!)
    'courseCategory', // Base category model
    'courseLevel',    // Course level model
    'Banner',         // Banner model
    'goal',           // Goal model (lowercase!)
    'Settings',       // Settings model
    'otp',           // OTP model (lowercase!)
    
    // Models that depend on base models
    'Course',         // Depends on User, CourseCategory, CourseLevel
    'skill',          // Depends on Goal, CourseCategory, CourseLevel (lowercase!)
    'Project',        // Depends on User, CourseCategory
    'DiscountCode',   // Depends on User
    'SearchAnalytics', // Depends on User
    
    // Course-related models
    'courseTag',      // Depends on Course (lowercase!)
    'courseGoal',     // Depends on Course (lowercase!)
    'courseRequirement', // Depends on Course (lowercase!)
    'section',        // Depends on Course (lowercase!)
    'batch',          // Depends on Course, User (lowercase!)
    
    // Association/junction tables
    'userGoal',       // Depends on User, Goal (lowercase!)
    'userSkill',      // Depends on User, Skill (lowercase!)
    'userLanguage',   // Depends on User, Language (lowercase!)
    'courseLanguage', // Depends on Course, Language (lowercase!)
    
    // Models that depend on sections/batches
    'lesson',         // Depends on Section (lowercase!)
    'resource',       // Depends on Lesson (lowercase!)
    'batch_students', // Depends on Batch, User (exact name!)
    'enrollment',     // Depends on User, Course, Batch (lowercase!)
    'liveSession',    // Depends on Batch, Course
    
    // Session-related models
    'liveSessionParticipant', // Depends on LiveSession, User
    'raisedHand',     // Depends on LiveSession, LiveSessionParticipant (lowercase!)
    'recordedSession', // Depends on LiveSession (lowercase!)
    'RecordedSessionResource', // Depends on RecordedSession (exact name!)
    
    // Rating models
    'CourseRating',   // Depends on Course, User
    'InstructorRating', // Depends on User, Course
    
    // Project-related models  
    'ProjectFile',    // Depends on Project, User
    'ProjectPurchase', // Depends on Project, User, DiscountCode
    'ProjectRating',  // Depends on Project, User, ProjectPurchase
    
    // Discount-related models
    'DiscountUsage',  // Depends on DiscountCode, User, Course, Project, Enrollment
    
    // Many-to-many association tables
    'project_tags',   // Depends on Project, CourseTag (exact name!)
    'discount_categories', // Depends on DiscountCode, CourseCategory (exact name!)
  ];

  const modelMap = {};
  const result = [];

  // Create a map of available models
  for (const modelConfig of modelsArray) {
    modelMap[modelConfig.name] = modelConfig;
  }

  // Sort models according to the predefined order
  for (const modelName of modelCreationOrder) {
    if (modelMap[modelName]) {
      result.push(modelMap[modelName]);
      delete modelMap[modelName]; // Remove from map to avoid duplicates
    }
  }

  // Add any remaining models that weren't in our predefined order
  for (const modelName in modelMap) {
    result.push(modelMap[modelName]);
  }

  return result;
};

// Synchronize specific models and fields
export const syncModels = async (modelsToSync, options = {
  force: false,
  alter: false,
  safeMode: false,
}) => {
  const logs = [];
  logs.push(
    `Starting database synchronization with options: force=${options.force}, alter=${options.alter}, safeMode=${options.safeMode}`,
  );

  try {
    if (!Array.isArray(modelsToSync) || modelsToSync.length === 0) {
      throw new Error("No models specified for synchronization");
    }

    // Log all models being synced
    logs.push(
      `Models selected for sync: ${modelsToSync.map((m) => m.name).join(", ")}`,
    );

    // Sort models by dependencies for creation
    const sortedModelsForCreation = sortModelsByDependencies(modelsToSync);
    
    // Log the order in which models will be synced
    logs.push(
      `Models will be synced in this order: ${sortedModelsForCreation.map((m) => m.name).join(", ")}`,
    );

    // For dropping tables, we need the reverse order
    const sortedModelsForDropping = [...sortedModelsForCreation].reverse();

    if (options.force) {
      logs.push("Force sync requested. Dropping all selected tables...");

      // Use raw queries to drop tables in reverse dependency order
      for (const modelConfig of sortedModelsForDropping) {
        const modelName = modelConfig.name;
        const model = sequelize.models[modelName];

        if (model) {
          const tableName = model.tableName;
          logs.push(`Dropping table: ${tableName}`);

          // Create a separate transaction for each table drop
          const dropTransaction = await sequelize.transaction();

          try {
            await sequelize.query(
              `DROP TABLE IF EXISTS "${tableName}" CASCADE`,
              { transaction: dropTransaction },
            );
            await dropTransaction.commit();
            logs.push(`Successfully dropped table: ${tableName}`);
          } catch (error) {
            await dropTransaction.rollback();
            logs.push(`Error dropping table ${tableName}: ${error.message}`);
            // Continue with next table rather than aborting everything
          }
        }
      }
    }

    // Now sync the models - simplified approach
    let successCount = 0;
    const totalModels = modelsToSync.length;

    // For simplicity and to avoid foreign key constraint issues,
    // let's just sync the models directly without field filtering
    
    // Use dependency-sorted models for creation
    for (const modelConfig of sortedModelsForCreation) {
      const modelName = modelConfig.name;
      const model = sequelize.models[modelName];

      if (!model) {
        logs.push(`Model ${modelName} not found in Sequelize models`);
        continue;
      }

      logs.push(`Syncing model: ${modelName}`);

      try {
        // Determine sync mode based on options
        let syncConfig = {
          force: false, // Never force in individual model sync since we handle drops separately
          alter: false, // Default to false for safety
        };

        if (options.safeMode) {
          // Safe mode: only create missing tables, don't alter existing ones
          syncConfig.force = false;
          syncConfig.alter = false;
          logs.push(`Syncing ${modelName} in safe mode (create only if not exists)`);
        } else if (options.alter && !options.force) {
          // Alter mode: modify existing table structures
          syncConfig.alter = true;
          logs.push(`Syncing ${modelName} with alter enabled (will modify existing structure)`);
        } else {
          // Default mode: basic sync
          logs.push(`Syncing ${modelName} in default mode`);
        }

        // Sync the whole model - this is the safest approach
        await model.sync(syncConfig);

        logs.push(`Successfully synced model: ${modelName}`);
        successCount++;
      } catch (error) {
        logs.push(`Error syncing model ${modelName}: ${error.message}`);
        // For debugging, let's see more detail about the error
        if (error.sql) {
          logs.push(`SQL that failed: ${error.sql}`);
        }
        if (error.parent) {
          logs.push(`Parent error: ${error.parent.message}`);
        }
        // Continue with next model rather than aborting everything
      }
    }

    logs.push(
      `Database synchronization completed. ${successCount} of ${totalModels} models synced successfully.`,
    );

    return {
      success: successCount > 0,
      message:
        successCount > 0
          ? `Database synchronized successfully (${successCount}/${totalModels} models)`
          : "Database synchronization failed for all models",
      logs,
    };
  } catch (error) {
    logs.push(`Error in syncModels: ${error.message}`);
    return {
      success: false,
      message: "Database synchronization failed",
      error: error.message,
      logs,
    };
  }
}

// Serve the HTML page
export const serveSyncDbPage = (req, res) => {
  const filePath = path.join(__dirname, "..", "web", "sync-db.html");

  fs.readFile(filePath, "utf8", (err, data) => {
    if (err) {
      console.error("Error reading sync-db.html:", err);
      return res
        .status(500)
        .send("Error loading the database synchronization page");
    }

    res.send(data);
  });
};
