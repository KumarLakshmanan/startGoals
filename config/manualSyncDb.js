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
  const modelMap = {};
  const dependencyGraph = {};
  const result = [];
  const visited = {};
  const visiting = {};

  // Build dependency graph
  for (const modelConfig of modelsArray) {
    const modelName = modelConfig.name;
    modelMap[modelName] = modelConfig;
    dependencyGraph[modelName] = [];

    const model = sequelize.models[modelName];
    if (!model) continue;

    // Look for foreign key references
    const attributes = model.rawAttributes;
    for (const fieldName in attributes) {
      const field = attributes[fieldName];
      if (field.references && field.references.model) {
        // Convert table name to model name if needed
        let referencedModelName = field.references.model;

        // If it's a table name, find corresponding model
        if (
          typeof referencedModelName === "string" &&
          !sequelize.models[referencedModelName]
        ) {
          for (const mName in sequelize.models) {
            if (sequelize.models[mName].tableName === referencedModelName) {
              referencedModelName = mName;
              break;
            }
          }
        }

        // Add dependency if the referenced model is in our models array
        if (modelMap[referencedModelName]) {
          dependencyGraph[modelName].push(referencedModelName);
        }
      }
    }
  }

  // Topological sort (DFS)
  function visit(modelName) {
    if (visited[modelName]) return;
    if (visiting[modelName]) {
      // Circular dependency detected, but we'll continue
      return;
    }

    visiting[modelName] = true;

    for (const dependency of dependencyGraph[modelName]) {
      visit(dependency);
    }

    visiting[modelName] = false;
    visited[modelName] = true;
    result.push(modelMap[modelName]);
  }

  // Visit all nodes
  for (const modelName in dependencyGraph) {
    if (!visited[modelName]) {
      visit(modelName);
    }
  }

  return result;
};

// Synchronize specific models and fields
export const syncModels = async (modelsToSync, options = {}) => {
  const logs = [];
  logs.push(
    `Starting database synchronization with options: force=${options.force}, alter=${options.alter}`,
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

    // Now create or alter tables based on selected models and fields
    let successCount = 0;
    const totalModels = modelsToSync.length;

    // Use dependency-sorted models for creation
    for (const modelConfig of sortedModelsForCreation) {
      const modelName = modelConfig.name;
      const model = sequelize.models[modelName];

      if (!model) {
        logs.push(`Model ${modelName} not found in Sequelize models`);
        continue;
      }

      const selectedFields = modelConfig.fields;
      logs.push(
        `Syncing model: ${modelName} with fields: ${selectedFields.join(", ")}`,
      );

      // Filter the model's attributes to only include selected fields
      const filteredAttributes = {};
      const attributes = model.rawAttributes;

      for (const fieldName of selectedFields) {
        if (attributes[fieldName]) {
          filteredAttributes[fieldName] = attributes[fieldName];
        }
      }

      // Create a temporary model with only the selected fields
      const tempModelName = `Temp${modelName}`;
      const tempModel = sequelize.define(tempModelName, filteredAttributes, {
        tableName: model.tableName,
        timestamps: model._timestampAttributes.createdAt !== false,
        createdAt: model._timestampAttributes.createdAt,
        updatedAt: model._timestampAttributes.updatedAt,
        deletedAt: model._timestampAttributes.deletedAt,
        paranoid: model.options.paranoid,
        underscored: model.options.underscored,
      });

      // Create a separate transaction for each model sync
      const syncTransaction = await sequelize.transaction();

      try {
        // Sync the temporary model with deferred constraints to avoid foreign key issues
        await tempModel.sync({
          force: false, // We've already dropped tables if force=true
          alter: options.alter,
          transaction: syncTransaction,
        });

        await syncTransaction.commit();
        logs.push(`Successfully synced model: ${modelName}`);
        successCount++;
      } catch (error) {
        await syncTransaction.rollback();
        logs.push(`Error syncing model ${modelName}: ${error.message}`);
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
};

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
